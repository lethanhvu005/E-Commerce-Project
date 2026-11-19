import json
import logging
import secrets
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode, urlparse
from urllib.request import Request, urlopen

from django.conf import settings
from django.contrib.auth import authenticate
from django.contrib.auth.password_validation import validate_password
from django.core.cache import cache
from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import IntegrityError, transaction
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import api_view, authentication_classes, permission_classes, throttle_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.serializers import TokenRefreshSerializer
from rest_framework_simplejwt.tokens import RefreshToken

from operations.models import AuditLog

from .mailer import deliver_email, email_transport_configured, https_mail_provider_configured
from .models import Address, User
from .serializers import (
    AddressSerializer,
    EmailChangeRequestSerializer,
    EmailChangeVerifySerializer,
    EmailOtpRequestSerializer,
    EmailOtpVerifySerializer,
    FacebookLoginSerializer,
    GoogleLoginSerializer,
    LoginSerializer,
    PasswordResetConfirmSerializer,
    PasswordResetRequestSerializer,
    RefreshSerializer,
    RegisterSerializer,
    SupportContactSerializer,
    UserSerializer,
)
from .throttles import LoginRateThrottle, OtpRateThrottle, PasswordResetRateThrottle, RegisterRateThrottle, SupportContactRateThrottle

logger = logging.getLogger(__name__)
EMAIL_OTP_TTL_SECONDS = 600
EMAIL_OTP_MAX_ATTEMPTS = 5


def _dispatch_otp_email(*, subject: str, message: str, recipient_email: str, log_context: str) -> tuple[bool, bool]:
    configured = email_transport_configured()
    try:
        deliver_email(
            subject=subject,
            message=message,
            recipient_email=recipient_email,
        )
        return True, configured
    except Exception as exc:
        if not https_mail_provider_configured():
            logger.warning(
                "Failed to send OTP email (%s): %s. "
                "Note: Render Free blocks outbound SMTP ports 25/465/587; set BREVO_API_KEY, RESEND_API_KEY, or EMAIL_WEBHOOK_URL for HTTPS mail delivery.",
                log_context,
                exc,
            )
        else:
            logger.exception("Failed to send OTP email (%s)", log_context)
        return False, configured


def _verify_cached_otp(*, cache_key: str, otp: str, expected_match: dict | None = None):
    otp_record = cache.get(cache_key)
    if not otp_record or any(otp_record.get(k) != v for k, v in (expected_match or {}).items()):
        return None, Response(
            {"detail": "Mã xác thực đã hết hạn hoặc chưa được yêu cầu. Vui lòng gửi lại mã."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    attempts = int(otp_record.get("attempts", 0))
    if attempts >= EMAIL_OTP_MAX_ATTEMPTS:
        cache.delete(cache_key)
        return None, Response(
            {"detail": "Bạn đã nhập sai quá số lần cho phép. Vui lòng yêu cầu mã xác thực mới."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if not secrets.compare_digest(str(otp_record.get("code", "")), str(otp)):
        otp_record["attempts"] = attempts + 1
        if otp_record["attempts"] >= EMAIL_OTP_MAX_ATTEMPTS:
            cache.delete(cache_key)
            return None, Response(
                {"detail": "Bạn đã nhập sai quá số lần cho phép. Vui lòng yêu cầu mã xác thực mới."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        cache.set(cache_key, otp_record, timeout=EMAIL_OTP_TTL_SECONDS)
        return None, Response(
            {"otp": ["Mã xác thực không chính xác."]},
            status=status.HTTP_400_BAD_REQUEST,
        )

    return otp_record, None


VALID_GOOGLE_ISSUERS = {"accounts.google.com", "https://accounts.google.com"}


def _fetch_google_json(url, headers=None):
    parsed = urlparse(str(url))
    if parsed.scheme != "https" or not parsed.netloc:
        raise ValueError("Chỉ cho phép kết nối HTTPS tới máy chủ xác thực OAuth.")
    req = Request(url, headers=headers or {})  # nosec B310
    with urlopen(req, timeout=8) as resp:  # nosec B310
        return json.loads(resp.read().decode("utf-8"))


def verify_google_oauth_payload(*, credential="", access_token="", expected_client_id=""):
    if credential:
        query = urlencode({"id_token": credential})
        token_info = _fetch_google_json(f"https://oauth2.googleapis.com/tokeninfo?{query}")
        aud = token_info.get("aud") or ""
        if expected_client_id and aud != expected_client_id:
            raise ValueError("Google ID token không khớp Client ID của hệ thống.")
        iss = (token_info.get("iss") or "").strip()
        if iss and iss not in VALID_GOOGLE_ISSUERS:
            raise ValueError("Google ID token có nhà phát hành (iss) không hợp lệ.")
        return token_info

    if access_token:
        query = urlencode({"access_token": access_token})
        token_info = _fetch_google_json(f"https://oauth2.googleapis.com/tokeninfo?{query}")
        aud = token_info.get("aud") or token_info.get("azp") or ""
        if expected_client_id and aud != expected_client_id:
            raise ValueError("Google access token không khớp Client ID của hệ thống.")
        user_info = _fetch_google_json(
            "https://www.googleapis.com/oauth2/v3/userinfo",
            headers={"Authorization": f"Bearer {access_token}"},
        )
        if not user_info.get("sub") and token_info.get("sub"):
            user_info["sub"] = token_info["sub"]
        return user_info

    raise ValueError("Thiếu thông tin xác thực Google.")


def _fetch_facebook_json(path, params):
    graph_version = (getattr(settings, "FACEBOOK_GRAPH_API_VERSION", "v27.0") or "v27.0").strip()
    query = urlencode(params)
    return _fetch_google_json(f"https://graph.facebook.com/{graph_version}/{path}?{query}")


def verify_facebook_access_token(*, access_token, app_id, app_secret):
    debug_payload = _fetch_facebook_json(
        "debug_token",
        {
            "input_token": access_token,
            "access_token": f"{app_id}|{app_secret}",
        },
    )
    token_data = debug_payload.get("data") or {}
    if not token_data.get("is_valid"):
        raise ValueError("Facebook access token không hợp lệ hoặc đã hết hạn.")
    if str(token_data.get("app_id") or "") != str(app_id):
        raise ValueError("Facebook access token không thuộc ứng dụng này.")

    facebook_user_id = str(token_data.get("user_id") or "").strip()
    if not facebook_user_id:
        raise ValueError("Facebook access token thiếu định danh người dùng.")

    profile = _fetch_facebook_json(
        "me",
        {
            "fields": "id,email,first_name,last_name,name",
            "access_token": access_token,
        },
    )
    if str(profile.get("id") or "") != facebook_user_id:
        raise ValueError("Facebook profile không khớp với access token.")
    return profile


@api_view(["POST"])
@authentication_classes([])
@permission_classes([AllowAny])
@throttle_classes([RegisterRateThrottle])
def register(request):
    serializer = RegisterSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    try:
        with transaction.atomic():
            user = serializer.save()
    except IntegrityError:
        return Response({"email": ["Email đã tồn tại."]}, status=status.HTTP_400_BAD_REQUEST)
    return Response(UserSerializer(user).data, status=status.HTTP_201_CREATED)


@api_view(["POST"])
@authentication_classes([])
@permission_classes([AllowAny])
@throttle_classes([LoginRateThrottle])
def login(request):
    serializer = LoginSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    user = authenticate(
        request=request,
        email=serializer.validated_data["email"],
        password=serializer.validated_data["password"],
    )
    if user is None or not user.is_active:
        return Response({"detail": "Email hoặc mật khẩu không đúng."}, status=status.HTTP_401_UNAUTHORIZED)
    if user.is_staff or user.is_superuser:
        return Response(
            {"detail": "Tài khoản quản trị phải đăng nhập tại cổng Admin."},
            status=status.HTTP_403_FORBIDDEN,
        )

    if user.requires_email_login_otp:
        otp = (serializer.validated_data.get("otp") or "").strip()
        resend_otp = bool(serializer.validated_data.get("resend_otp"))
        cache_key = f"login_new_email_otp:{user.pk}"

        if not otp or resend_otp:
            code = f"{secrets.randbelow(1000000):06d}"
            cache.set(
                cache_key,
                {"email": user.email, "code": code, "attempts": 0},
                timeout=EMAIL_OTP_TTL_SECONDS,
            )
            mail_sent, smtp_configured = _dispatch_otp_email(
                subject=f"[NEXA] Mã xác nhận email mới khi đăng nhập: {code}",
                message=(
                    f"Xin chào {user.get_full_name() or user.email},\n\n"
                    f"Bạn vừa đăng nhập lần đầu sau khi thay đổi email sang {user.email}.\n"
                    f"Mã xác nhận (OTP) của bạn là:\n\n"
                    f"{code}\n\n"
                    f"Mã có hiệu lực trong vòng 10 phút. Vui lòng không chia sẻ mã này cho bất kỳ ai."
                ),
                recipient_email=user.email,
                log_context=f"new_email_login user_id={user.pk}",
            )
            if not settings.DEBUG and not mail_sent:
                cache.delete(cache_key)
                return Response(
                    {"detail": "Không thể gửi mã xác nhận qua email lúc này. Vui lòng thử lại sau."},
                    status=status.HTTP_503_SERVICE_UNAVAILABLE,
                )
            payload = {
                "requires_email_verification": True,
                "email": user.email,
                "expires_in": EMAIL_OTP_TTL_SECONDS,
                "smtp_configured": smtp_configured,
                "detail": (
                    f"Đây là lần đăng nhập đầu tiên sau khi đổi email. "
                    f"Đã gửi mã xác nhận gồm 6 chữ số đến {user.email}."
                ),
            }
            if settings.DEBUG and (not smtp_configured or not mail_sent):
                payload["dev_otp"] = code
            return Response(payload, status=status.HTTP_200_OK)

        if not otp.isdigit() or len(otp) != 6:
            return Response(
                {"otp": ["Mã xác thực phải gồm đúng 6 chữ số."]},
                status=status.HTTP_400_BAD_REQUEST,
            )

        _, err_response = _verify_cached_otp(
            cache_key=cache_key,
            otp=otp,
            expected_match={"email": user.email},
        )
        if err_response is not None:
            return err_response

        with transaction.atomic():
            locked_user = User.objects.select_for_update().get(pk=user.pk)
            locked_user.email_verified_at = timezone.now()
            locked_user.requires_email_login_otp = False
            locked_user.save(update_fields=["email_verified_at", "requires_email_login_otp"])
            AuditLog.objects.create(
                actor=locked_user,
                action="account.new_email_login_verified",
                entity_type="User",
                entity_id=str(locked_user.pk),
                changes={"email": locked_user.email},
            )
        cache.delete(cache_key)
        user = locked_user

    refresh = RefreshToken.for_user(user)
    return Response({"access": str(refresh.access_token), "refresh": str(refresh)})


@api_view(["POST"])
@authentication_classes([])
@permission_classes([AllowAny])
@throttle_classes([LoginRateThrottle])
def admin_login(request):
    serializer = LoginSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    user = authenticate(
        request=request,
        email=serializer.validated_data["email"],
        password=serializer.validated_data["password"],
    )
    if user is None or not user.is_active:
        return Response(
            {"detail": "Email hoặc mật khẩu Admin không đúng."},
            status=status.HTTP_401_UNAUTHORIZED,
        )
    if not user.is_staff:
        return Response(
            {"detail": "Tài khoản này không có quyền truy cập cổng Admin."},
            status=status.HTTP_403_FORBIDDEN,
        )
    refresh = RefreshToken.for_user(user)
    return Response({"access": str(refresh.access_token), "refresh": str(refresh)})


@api_view(["POST"])
@authentication_classes([])
@permission_classes([AllowAny])
@throttle_classes([LoginRateThrottle])
def google_login(request):
    expected_client_id = (getattr(settings, "GOOGLE_CLIENT_ID", "") or "").strip()
    if not expected_client_id:
        return Response(
            {"detail": "Máy chủ chưa cấu hình GOOGLE_CLIENT_ID cho đăng nhập Google."},
            status=status.HTTP_503_SERVICE_UNAVAILABLE,
        )

    serializer = GoogleLoginSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)

    try:
        payload = verify_google_oauth_payload(
            credential=serializer.validated_data.get("credential", ""),
            access_token=serializer.validated_data.get("access_token", ""),
            expected_client_id=expected_client_id,
        )
    except ValueError as exc:
        return Response({"detail": str(exc)}, status=status.HTTP_401_UNAUTHORIZED)
    except (HTTPError, URLError, TimeoutError, json.JSONDecodeError):
        return Response(
            {"detail": "Token Google không hợp lệ hoặc đã hết hạn."},
            status=status.HTTP_401_UNAUTHORIZED,
        )

    iss = (payload.get("iss") or "").strip()
    if iss and iss not in VALID_GOOGLE_ISSUERS:
        return Response(
            {"detail": "Nhà phát hành (iss) của Google token không hợp lệ."},
            status=status.HTTP_401_UNAUTHORIZED,
        )

    google_sub = (payload.get("sub") or "").strip()
    if not google_sub:
        return Response(
            {"detail": "Google token thiếu định danh người dùng (sub)."},
            status=status.HTTP_401_UNAUTHORIZED,
        )

    email = (payload.get("email") or "").strip().lower()
    email_verified = str(payload.get("email_verified", "")).lower() in ("true", "1")
    if not email or not email_verified:
        return Response(
            {"detail": "Tài khoản Google chưa xác minh địa chỉ email."},
            status=status.HTTP_401_UNAUTHORIZED,
        )

    first_name = (payload.get("given_name") or "").strip()
    last_name = (payload.get("family_name") or "").strip()
    if not first_name and payload.get("name"):
        parts = str(payload.get("name")).strip().split()
        first_name = parts[-1] if parts else ""
        last_name = " ".join(parts[:-1]) if len(parts) > 1 else ""

    password = serializer.validated_data.get("password") or ""
    otp = (serializer.validated_data.get("otp") or "").strip()
    send_link_otp = bool(serializer.validated_data.get("send_link_otp"))

    now = timezone.now()
    try:
        with transaction.atomic():
            # 1. Look up by durable Google `sub` first
            user = User.objects.select_for_update().filter(google_sub=google_sub).first()
            if user is not None:
                if not user.is_active:
                    return Response(
                        {"detail": "Tài khoản đã bị vô hiệu hóa."},
                        status=status.HTTP_401_UNAUTHORIZED,
                    )
                update_fields = []
                if user.email_verified_at is None:
                    user.email_verified_at = now
                    update_fields.append("email_verified_at")
                if first_name and not user.first_name:
                    user.first_name = first_name
                    update_fields.append("first_name")
                if last_name and not user.last_name:
                    user.last_name = last_name
                    update_fields.append("last_name")
                if update_fields:
                    user.save(update_fields=update_fields)
                if user.is_staff or user.is_superuser:
                    AuditLog.objects.create(
                        actor=user,
                        action="account.staff_google_oauth_login",
                        entity_type="User",
                        entity_id=str(user.pk),
                        changes={"email": user.email, "method": "google_oauth"},
                    )
            else:
                # 2. Check if an account with this email already exists
                existing_by_email = User.objects.select_for_update().filter(email=email).first()
                if existing_by_email is not None:
                    if not existing_by_email.is_active:
                        return Response(
                            {"detail": "Tài khoản đã bị vô hiệu hóa."},
                            status=status.HTTP_401_UNAUTHORIZED,
                        )
                    if existing_by_email.google_sub and existing_by_email.google_sub != google_sub:
                        return Response(
                            {"detail": "Email này đã được liên kết với một định danh Google khác."},
                            status=status.HTTP_409_CONFLICT,
                        )

                    needs_step_up = (
                        existing_by_email.is_staff
                        or existing_by_email.is_superuser
                        or existing_by_email.has_usable_password()
                    )
                    if needs_step_up:
                        cache_key = f"google_link_otp:{existing_by_email.pk}"
                        if send_link_otp:
                            code = f"{secrets.randbelow(1000000):06d}"
                            cache.set(
                                cache_key,
                                {"google_sub": google_sub, "code": code, "attempts": 0},
                                timeout=EMAIL_OTP_TTL_SECONDS,
                            )
                            mail_sent, smtp_configured = _dispatch_otp_email(
                                subject=f"[NEXA] Mã xác minh liên kết Google OAuth: {code}",
                                message=(
                                    f"Xin chào {existing_by_email.get_full_name() or email},\n\n"
                                    f"Mã xác minh (OTP) để liên kết đăng nhập Google với tài khoản NEXA ({email}) của bạn là:\n\n"
                                    f"{code}\n\n"
                                    f"Mã có hiệu lực trong 10 phút. Nếu không phải bạn thực hiện, vui lòng bỏ qua email này."
                                ),
                                recipient_email=email,
                                log_context=f"google-link user_id={existing_by_email.pk}",
                            )
                            if not smtp_configured or not mail_sent:
                                cache.delete(cache_key)
                                return Response(
                                    {
                                        "otp_sent": False,
                                        "detail": "Không thể gửi email OTP. Vui lòng kiểm tra cấu hình Gmail trên máy chủ và thử lại.",
                                    },
                                    status=status.HTTP_503_SERVICE_UNAVAILABLE,
                                )
                            return Response(
                                {
                                    "otp_sent": True,
                                    "email": email,
                                    "detail": f"Đã gửi mã OTP 6 chữ số đến {email} để xác minh liên kết Google.",
                                },
                                status=status.HTTP_200_OK,
                            )

                        if not password and not otp:
                            if existing_by_email.is_staff or existing_by_email.is_superuser:
                                return Response(
                                    {
                                        "detail": "Tài khoản quản trị/nhân viên cần xác minh lại mật khẩu hoặc mã OTP trước khi liên kết Google OAuth.",
                                        "requires_reverification": True,
                                        "email": email,
                                        "is_staff_account": True,
                                    },
                                    status=status.HTTP_403_FORBIDDEN,
                                )
                            return Response(
                                {
                                    "detail": "Email này đã được đăng ký bằng mật khẩu. Vui lòng xác minh mật khẩu hoặc mã OTP để liên kết Google.",
                                    "requires_reverification": True,
                                    "email": email,
                                    "is_staff_account": False,
                                },
                                status=status.HTTP_409_CONFLICT,
                            )

                        verification_method = ""
                        if password:
                            if not existing_by_email.check_password(password):
                                return Response(
                                    {
                                        "detail": "Mật khẩu xác minh không chính xác.",
                                        "requires_reverification": True,
                                        "email": email,
                                    },
                                    status=status.HTTP_401_UNAUTHORIZED,
                                )
                            verification_method = "password"
                        else:
                            otp_record = cache.get(cache_key)
                            if not otp_record or otp_record.get("google_sub") != google_sub:
                                return Response(
                                    {
                                        "detail": "Mã OTP xác minh đã hết hạn hoặc chưa được yêu cầu. Vui lòng bấm gửi mã OTP.",
                                        "requires_reverification": True,
                                        "email": email,
                                    },
                                    status=status.HTTP_400_BAD_REQUEST,
                                )
                            attempts = int(otp_record.get("attempts", 0))
                            if attempts >= EMAIL_OTP_MAX_ATTEMPTS:
                                cache.delete(cache_key)
                                return Response(
                                    {
                                        "detail": "Bạn đã nhập sai quá số lần cho phép. Vui lòng gửi lại mã OTP mới.",
                                        "requires_reverification": True,
                                        "email": email,
                                    },
                                    status=status.HTTP_400_BAD_REQUEST,
                                )
                            if not secrets.compare_digest(str(otp_record.get("code", "")), otp):
                                otp_record["attempts"] = attempts + 1
                                cache.set(cache_key, otp_record, timeout=EMAIL_OTP_TTL_SECONDS)
                                return Response(
                                    {
                                        "detail": "Mã OTP xác minh không chính xác.",
                                        "requires_reverification": True,
                                        "email": email,
                                    },
                                    status=status.HTTP_400_BAD_REQUEST,
                                )
                            cache.delete(cache_key)
                            verification_method = "email_otp"

                        existing_by_email.google_sub = google_sub
                        update_fields = ["google_sub"]
                        if existing_by_email.email_verified_at is None:
                            existing_by_email.email_verified_at = now
                            update_fields.append("email_verified_at")
                        if existing_by_email.requires_email_login_otp:
                            existing_by_email.requires_email_login_otp = False
                            update_fields.append("requires_email_login_otp")
                        existing_by_email.save(update_fields=update_fields)
                        AuditLog.objects.create(
                            actor=existing_by_email,
                            action="account.google_oauth_linked",
                            entity_type="User",
                            entity_id=str(existing_by_email.pk),
                            changes={
                                "email": email,
                                "is_staff": existing_by_email.is_staff,
                                "is_superuser": existing_by_email.is_superuser,
                                "method": verification_method,
                            },
                        )
                        user = existing_by_email
                    else:
                        # Existing passwordless non-staff OAuth account without google_sub bound yet
                        existing_by_email.google_sub = google_sub
                        update_fields = ["google_sub"]
                        if existing_by_email.email_verified_at is None:
                            existing_by_email.email_verified_at = now
                            update_fields.append("email_verified_at")
                        if existing_by_email.requires_email_login_otp:
                            existing_by_email.requires_email_login_otp = False
                            update_fields.append("requires_email_login_otp")
                        existing_by_email.save(update_fields=update_fields)
                        user = existing_by_email
                else:
                    user = User.objects.create_user(
                        email=email,
                        password=None,
                        google_sub=google_sub,
                        first_name=first_name or email.split("@")[0],
                        last_name=last_name,
                        email_verified_at=now,
                    )
    except IntegrityError:
        user = User.objects.filter(google_sub=google_sub, is_active=True).first()
        if user is None:
            return Response(
                {"detail": "Không thể hoàn tất đăng nhập Google do xung đột dữ liệu tài khoản. Vui lòng thử lại."},
                status=status.HTTP_409_CONFLICT,
            )

    refresh = RefreshToken.for_user(user)
    return Response(
        {
            "access": str(refresh.access_token),
            "refresh": str(refresh),
            "user": UserSerializer(user).data,
            "requires_email_verification": not bool(user.email),
        }
    )


@api_view(["GET"])
@authentication_classes([])
@permission_classes([AllowAny])
def facebook_config(request):
    app_id = (getattr(settings, "FACEBOOK_APP_ID", "") or "").strip()
    return Response({"app_id": app_id, "enabled": bool(app_id)})


@api_view(["POST"])
@authentication_classes([])
@permission_classes([AllowAny])
@throttle_classes([LoginRateThrottle])
def facebook_login(request):
    app_id = (getattr(settings, "FACEBOOK_APP_ID", "") or "").strip()
    app_secret = (getattr(settings, "FACEBOOK_APP_SECRET", "") or "").strip()
    if not app_id or not app_secret:
        return Response(
            {"detail": "Máy chủ chưa cấu hình Facebook Login."},
            status=status.HTTP_503_SERVICE_UNAVAILABLE,
        )

    serializer = FacebookLoginSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    try:
        payload = verify_facebook_access_token(
            access_token=serializer.validated_data["access_token"],
            app_id=app_id,
            app_secret=app_secret,
        )
    except ValueError as exc:
        return Response({"detail": str(exc)}, status=status.HTTP_401_UNAUTHORIZED)
    except (HTTPError, URLError, TimeoutError, json.JSONDecodeError):
        return Response(
            {"detail": "Không thể xác minh tài khoản Facebook lúc này."},
            status=status.HTTP_401_UNAUTHORIZED,
        )

    facebook_sub = str(payload.get("id") or "").strip()
    email = str(payload.get("email") or "").strip().lower() or None

    first_name = str(payload.get("first_name") or "").strip()
    last_name = str(payload.get("last_name") or "").strip()
    now = timezone.now()
    try:
        with transaction.atomic():
            user = User.objects.select_for_update().filter(facebook_sub=facebook_sub).first()
            if user is not None:
                if not user.is_active:
                    return Response({"detail": "Tài khoản đã bị vô hiệu hóa."}, status=status.HTTP_401_UNAUTHORIZED)
                if user.is_staff or user.is_superuser:
                    return Response(
                        {"detail": "Tài khoản quản trị/nhân viên không được đăng nhập qua Facebook."},
                        status=status.HTTP_403_FORBIDDEN,
                    )
            else:
                existing = User.objects.select_for_update().filter(email=email).first() if email else None
                if existing is not None:
                    if existing.is_staff or existing.is_superuser:
                        return Response(
                            {"detail": "Không được tự động liên kết Facebook với tài khoản quản trị/nhân viên."},
                            status=status.HTTP_403_FORBIDDEN,
                        )
                    if existing.facebook_sub and existing.facebook_sub != facebook_sub:
                        return Response(
                            {"detail": "Email này đã liên kết với một tài khoản Facebook khác."},
                            status=status.HTTP_409_CONFLICT,
                        )
                    if existing.google_sub or existing.has_usable_password():
                        return Response(
                            {"detail": "Email này đã có phương thức đăng nhập khác. Hãy dùng phương thức đã đăng ký."},
                            status=status.HTTP_409_CONFLICT,
                        )
                    existing.facebook_sub = facebook_sub
                    existing.email_verified_at = existing.email_verified_at or now
                    existing.save(update_fields=["facebook_sub", "email_verified_at"])
                    user = existing
                else:
                    user = User.objects.create_user(
                        email=email,
                        password=None,
                        facebook_sub=facebook_sub,
                        first_name=first_name or "Facebook",
                        last_name=last_name,
                        email_verified_at=now if email else None,
                    )
    except IntegrityError:
        user = User.objects.filter(
            facebook_sub=facebook_sub,
            is_active=True,
            is_staff=False,
            is_superuser=False,
        ).first()
        if user is None:
            return Response(
                {"detail": "Không thể hoàn tất đăng nhập Facebook do xung đột tài khoản."},
                status=status.HTTP_409_CONFLICT,
            )

    refresh = RefreshToken.for_user(user)
    return Response(
        {
            "access": str(refresh.access_token),
            "refresh": str(refresh),
            "user": UserSerializer(user).data,
            "requires_email_verification": not bool(user.email),
        }
    )


@api_view(["POST"])
@authentication_classes([])
@permission_classes([AllowAny])
def refresh_token(request):
    input_serializer = RefreshSerializer(data=request.data)
    input_serializer.is_valid(raise_exception=True)
    try:
        raw_token = RefreshToken(input_serializer.validated_data["refresh"])
        user_id = raw_token.get("user_id")
        if not User.objects.filter(pk=user_id, is_active=True).exists():
            return Response(
                {"refresh": ["Tài khoản đã bị vô hiệu hóa hoặc không còn hoạt động."]},
                status=status.HTTP_401_UNAUTHORIZED,
            )
        serializer = TokenRefreshSerializer(data=input_serializer.validated_data)
        serializer.is_valid(raise_exception=True)
    except TokenError:
        return Response(
            {"refresh": ["Refresh token không hợp lệ, đã hết hạn hoặc đã bị thu hồi."]},
            status=status.HTTP_401_UNAUTHORIZED,
        )
    return Response(serializer.validated_data)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def logout(request):
    serializer = RefreshSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    try:
        token = RefreshToken(serializer.validated_data["refresh"])
        if str(token.get("user_id")) != str(request.user.pk):
            return Response(
                {"refresh": ["Refresh token không thuộc tài khoản hiện tại."]},
                status=status.HTTP_403_FORBIDDEN,
            )
        token.blacklist()
    except TokenError:
        return Response(
            {"refresh": ["Refresh token không hợp lệ hoặc đã bị thu hồi."]},
            status=status.HTTP_400_BAD_REQUEST,
        )
    return Response(status=status.HTTP_204_NO_CONTENT)


@api_view(["GET", "PATCH"])
@permission_classes([IsAuthenticated])
def me(request):
    if request.method == "GET":
        return Response(UserSerializer(request.user).data)
    serializer = UserSerializer(request.user, data=request.data, partial=True)
    serializer.is_valid(raise_exception=True)
    serializer.save()
    return Response(serializer.data)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
@throttle_classes([OtpRateThrottle])
def request_email_otp(request):
    serializer = EmailOtpRequestSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    email = serializer.validated_data["email"]

    if User.objects.filter(email__iexact=email).exclude(pk=request.user.pk).exists():
        return Response(
            {"email": ["Email này đã được tài khoản khác sử dụng."]},
            status=status.HTTP_400_BAD_REQUEST,
        )

    code = f"{secrets.randbelow(1000000):06d}"
    cache_key = f"email_otp:{request.user.pk}"
    cache.set(
        cache_key,
        {"email": email, "code": code, "attempts": 0},
        timeout=EMAIL_OTP_TTL_SECONDS,
    )

    mail_sent, smtp_configured = _dispatch_otp_email(
        subject=f"[NEXA] Mã xác thực địa chỉ email của bạn: {code}",
        message=(
            f"Xin chào {request.user.get_full_name() or 'bạn'},\n\n"
            f"Mã xác thực (OTP) để liên kết địa chỉ email {email} với tài khoản NEXA của bạn là:\n\n"
            f"{code}\n\n"
            f"Mã có hiệu lực trong vòng 10 phút. Vui lòng không chia sẻ mã này cho bất kỳ ai."
        ),
        recipient_email=email,
        log_context=f"email_otp user_id={request.user.pk}",
    )
    if not settings.DEBUG and not mail_sent:
        cache.delete(cache_key)
        return Response(
            {"detail": "Không thể gửi mã xác thực qua email lúc này. Vui lòng thử lại sau."},
            status=status.HTTP_503_SERVICE_UNAVAILABLE,
        )

    payload = {
        "detail": f"Đã gửi mã xác thực gồm 6 chữ số đến {email}.",
        "email": email,
        "expires_in": EMAIL_OTP_TTL_SECONDS,
        "smtp_configured": smtp_configured,
    }
    if settings.DEBUG and (not smtp_configured or not mail_sent):
        payload["dev_otp"] = code
    return Response(payload, status=status.HTTP_200_OK)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def verify_email_otp(request):
    serializer = EmailOtpVerifySerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    email = serializer.validated_data["email"]
    otp = serializer.validated_data["otp"]

    cache_key = f"email_otp:{request.user.pk}"
    otp_record = cache.get(cache_key)
    if not otp_record or otp_record.get("email") != email:
        return Response(
            {"detail": "Mã xác thực đã hết hạn hoặc chưa được yêu cầu cho email này. Vui lòng gửi lại mã."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    attempts = int(otp_record.get("attempts", 0))
    if attempts >= EMAIL_OTP_MAX_ATTEMPTS:
        cache.delete(cache_key)
        return Response(
            {"detail": "Bạn đã nhập sai quá số lần cho phép. Vui lòng yêu cầu mã xác thực mới."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if not secrets.compare_digest(str(otp_record.get("code", "")), otp):
        otp_record["attempts"] = attempts + 1
        if otp_record["attempts"] >= EMAIL_OTP_MAX_ATTEMPTS:
            cache.delete(cache_key)
            return Response(
                {"detail": "Bạn đã nhập sai quá số lần cho phép. Vui lòng yêu cầu mã xác thực mới."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        cache.set(cache_key, otp_record, timeout=EMAIL_OTP_TTL_SECONDS)
        return Response(
            {"otp": ["Mã xác thực không chính xác."]},
            status=status.HTTP_400_BAD_REQUEST,
        )

    try:
        with transaction.atomic():
            user = User.objects.select_for_update().get(pk=request.user.pk)
            if User.objects.filter(email__iexact=email).exclude(pk=user.pk).exists():
                return Response(
                    {"email": ["Email này đã được tài khoản khác sử dụng."]},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            user.email = email
            user.email_verified_at = timezone.now()
            user.save(update_fields=["email", "email_verified_at"])
    except IntegrityError:
        return Response(
            {"email": ["Email này đã được tài khoản khác sử dụng."]},
            status=status.HTTP_400_BAD_REQUEST,
        )

    cache.delete(cache_key)
    return Response(
        {
            "detail": "Đã xác thực và thêm Gmail thành công!",
            "user": UserSerializer(user).data,
        },
        status=status.HTTP_200_OK,
    )


@api_view(["POST"])
@permission_classes([IsAuthenticated])
@throttle_classes([OtpRateThrottle])
def request_email_change_otp(request):
    current_email = (request.user.email or "").strip().lower()
    if not current_email:
        return Response(
            {"detail": "Tài khoản chưa có email hiện tại. Vui lòng thêm email bằng luồng xác thực email mới."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    serializer = EmailChangeRequestSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    new_email = serializer.validated_data["new_email"]

    if new_email == current_email:
        return Response(
            {"new_email": ["Email mới phải khác với email hiện tại."]},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if User.objects.filter(email__iexact=new_email).exclude(pk=request.user.pk).exists():
        return Response(
            {"new_email": ["Email này đã được tài khoản khác sử dụng."]},
            status=status.HTTP_400_BAD_REQUEST,
        )

    code = f"{secrets.randbelow(1000000):06d}"
    cache_key = f"email_change_otp:{request.user.pk}"
    cache.set(
        cache_key,
        {"old_email": current_email, "new_email": new_email, "code": code, "attempts": 0},
        timeout=EMAIL_OTP_TTL_SECONDS,
    )

    mail_sent, smtp_configured = _dispatch_otp_email(
        subject=f"[NEXA] Mã xác nhận đổi địa chỉ email: {code}",
        message=(
            f"Xin chào {request.user.get_full_name() or current_email},\n\n"
            f"Bạn vừa yêu cầu đổi địa chỉ email tài khoản NEXA từ {current_email} sang {new_email}.\n"
            f"Mã xác nhận (OTP) của bạn là:\n\n"
            f"{code}\n\n"
            f"Mã có hiệu lực trong vòng 10 phút.\n"
            f"Lưu ý: Sau khi đổi email thành công, lần đăng nhập tiếp theo hệ thống sẽ gửi mã xác nhận tới {new_email}."
        ),
        recipient_email=current_email,
        log_context=f"email_change user_id={request.user.pk}",
    )
    if not settings.DEBUG and not mail_sent:
        cache.delete(cache_key)
        return Response(
            {"detail": "Không thể gửi mã xác nhận đến email cũ lúc này. Vui lòng thử lại sau."},
            status=status.HTTP_503_SERVICE_UNAVAILABLE,
        )

    payload = {
        "detail": f"Đã gửi mã xác nhận gồm 6 chữ số đến Gmail cũ ({current_email}) để xác nhận đổi sang {new_email}.",
        "old_email": current_email,
        "new_email": new_email,
        "expires_in": EMAIL_OTP_TTL_SECONDS,
        "smtp_configured": smtp_configured,
    }
    if settings.DEBUG and (not smtp_configured or not mail_sent):
        payload["dev_otp"] = code
    return Response(payload, status=status.HTTP_200_OK)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def verify_email_change_otp(request):
    current_email = (request.user.email or "").strip().lower()
    if not current_email:
        return Response(
            {"detail": "Tài khoản chưa có email hiện tại để đổi."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    serializer = EmailChangeVerifySerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    new_email = serializer.validated_data["new_email"]
    otp = serializer.validated_data["otp"]

    cache_key = f"email_change_otp:{request.user.pk}"
    _, err_response = _verify_cached_otp(
        cache_key=cache_key,
        otp=otp,
        expected_match={"old_email": current_email, "new_email": new_email},
    )
    if err_response is not None:
        return err_response

    try:
        with transaction.atomic():
            user = User.objects.select_for_update().get(pk=request.user.pk)
            if User.objects.filter(email__iexact=new_email).exclude(pk=user.pk).exists():
                return Response(
                    {"new_email": ["Email này đã được tài khoản khác sử dụng."]},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            old_email = user.email
            user.email = new_email
            user.email_verified_at = None
            user.requires_email_login_otp = True
            update_fields = ["email", "email_verified_at", "requires_email_login_otp"]
            if user.google_sub:
                user.google_sub = None
                update_fields.append("google_sub")
            user.save(update_fields=update_fields)
            AuditLog.objects.create(
                actor=user,
                action="account.email_changed",
                entity_type="User",
                entity_id=str(user.pk),
                changes={"old_email": old_email, "new_email": new_email},
            )
    except IntegrityError:
        return Response(
            {"new_email": ["Email này đã được tài khoản khác sử dụng."]},
            status=status.HTTP_400_BAD_REQUEST,
        )

    cache.delete(cache_key)
    return Response(
        {
            "detail": (
                f"Đã đổi email sang {new_email} thành công! "
                f"Lần đăng nhập tiếp theo hệ thống sẽ gửi mã xác nhận tới {new_email}."
            ),
            "user": UserSerializer(user).data,
        },
        status=status.HTTP_200_OK,
    )


@api_view(["POST"])
@authentication_classes([])
@permission_classes([AllowAny])
@throttle_classes([PasswordResetRateThrottle])
def request_password_reset(request):
    serializer = PasswordResetRequestSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    email = serializer.validated_data["email"]

    generic_detail = (
        f"Nếu địa chỉ {email} đã đăng ký trong hệ thống, "
        f"mã xác nhận 6 chữ số để đặt lại mật khẩu đã được gửi tới hộp thư của bạn."
    )
    payload = {
        "detail": generic_detail,
        "email": email,
        "expires_in": EMAIL_OTP_TTL_SECONDS,
    }

    user = User.objects.filter(
        email__iexact=email,
        is_active=True,
        is_staff=False,
        is_superuser=False,
    ).first()
    if user is None:
        return Response(payload, status=status.HTTP_200_OK)

    code = f"{secrets.randbelow(1000000):06d}"
    cache_key = f"password_reset_otp:{user.pk}"
    cache.set(
        cache_key,
        {"email": user.email, "code": code, "attempts": 0},
        timeout=EMAIL_OTP_TTL_SECONDS,
    )
    mail_sent, smtp_configured = _dispatch_otp_email(
        subject=f"[NEXA] Mã xác nhận đặt lại mật khẩu: {code}",
        message=(
            f"Xin chào {user.get_full_name() or user.email},\n\n"
            f"Mã xác nhận (OTP) để đặt lại mật khẩu tài khoản NEXA ({user.email}) của bạn là:\n\n"
            f"{code}\n\n"
            f"Mã có hiệu lực trong vòng 10 phút. Nếu không phải bạn yêu cầu, vui lòng bỏ qua email này."
        ),
        recipient_email=user.email,
        log_context=f"password_reset user_id={user.pk}",
    )
    if not settings.DEBUG and not mail_sent:
        cache.delete(cache_key)
        return Response(
            {"detail": "Không thể gửi mã đặt lại mật khẩu qua email lúc này. Vui lòng thử lại sau."},
            status=status.HTTP_503_SERVICE_UNAVAILABLE,
        )

    payload["smtp_configured"] = smtp_configured
    if settings.DEBUG and (not smtp_configured or not mail_sent):
        payload["dev_otp"] = code
    return Response(payload, status=status.HTTP_200_OK)


@api_view(["POST"])
@authentication_classes([])
@permission_classes([AllowAny])
@throttle_classes([PasswordResetRateThrottle])
def confirm_password_reset(request):
    serializer = PasswordResetConfirmSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    email = serializer.validated_data["email"]
    otp = serializer.validated_data["otp"]
    new_password = serializer.validated_data["new_password"]

    user = User.objects.filter(
        email__iexact=email,
        is_active=True,
        is_staff=False,
        is_superuser=False,
    ).first()
    if user is None:
        return Response(
            {"detail": "Mã xác thực đã hết hạn hoặc chưa được yêu cầu. Vui lòng gửi lại mã."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    cache_key = f"password_reset_otp:{user.pk}"
    _, err_response = _verify_cached_otp(
        cache_key=cache_key,
        otp=otp,
        expected_match={"email": user.email},
    )
    if err_response is not None:
        return err_response

    try:
        validate_password(new_password, user=user)
    except DjangoValidationError as exc:
        return Response({"new_password": exc.messages}, status=status.HTTP_400_BAD_REQUEST)

    with transaction.atomic():
        locked_user = User.objects.select_for_update().get(pk=user.pk)
        locked_user.set_password(new_password)
        locked_user.save(update_fields=["password"])
        AuditLog.objects.create(
            actor=locked_user,
            action="account.password_reset",
            entity_type="User",
            entity_id=str(locked_user.pk),
            changes={"email": locked_user.email},
        )

    cache.delete(cache_key)
    return Response(
        {"detail": "Đặt lại mật khẩu thành công! Bạn có thể đăng nhập bằng mật khẩu mới."},
        status=status.HTTP_200_OK,
    )


def _save_address(serializer, user):
    with transaction.atomic():
        if serializer.validated_data.get("is_default"):
            Address.objects.filter(user=user, is_default=True).update(is_default=False)
        return serializer.save(user=user)


@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def address_list(request):
    if request.method == "GET":
        addresses = Address.objects.filter(user=request.user).order_by("-is_default", "id")
        return Response({"results": AddressSerializer(addresses, many=True).data})
    serializer = AddressSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    address = _save_address(serializer, request.user)
    return Response(AddressSerializer(address).data, status=status.HTTP_201_CREATED)


@api_view(["GET", "PATCH", "DELETE"])
@permission_classes([IsAuthenticated])
def address_detail(request, address_id):
    address = get_object_or_404(Address, id=address_id, user=request.user)
    if request.method == "GET":
        return Response(AddressSerializer(address).data)
    if request.method == "DELETE":
        address.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
    serializer = AddressSerializer(address, data=request.data, partial=True)
    serializer.is_valid(raise_exception=True)
    address = _save_address(serializer, request.user)
    return Response(AddressSerializer(address).data)


@api_view(["POST"])
@authentication_classes([])
@permission_classes([AllowAny])
@throttle_classes([SupportContactRateThrottle])
def support_contact(request):
    serializer = SupportContactSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    data = serializer.validated_data

    support_email = getattr(settings, "EMAIL_HOST_USER", "").strip() or "lethanhvu005@gmail.com"
    try:
        deliver_email(
            subject=f"[NEXA Hỗ trợ] [{data['subject']}] từ {data['name']}",
            message=(
                f"Họ và tên: {data['name']}\n"
                f"Email khách hàng: {data['email']}\n"
                f"Số điện thoại: {data.get('phone') or 'Không cung cấp'}\n"
                f"Chủ đề: {data['subject']}\n\n"
                f"Nội dung cần hỗ trợ:\n{data['message']}\n"
            ),
            recipient_email=support_email,
            reply_to=data["email"],
            from_email=getattr(settings, "DEFAULT_FROM_EMAIL", support_email),
        )
    except Exception:
        logger.warning("Failed to dispatch support contact email from %s", data["email"])
        return Response(
            {"detail": "Không thể gửi email trực tiếp lúc này. Vui lòng kiểm tra cấu hình gửi thư (HTTPS API hoặc SMTP) và thử lại sau."},
            status=status.HTTP_503_SERVICE_UNAVAILABLE,
        )

    return Response(
        {
            "detail": f"Đã gửi email trực tiếp thành công tới {support_email}! Chúng tôi sẽ phản hồi bạn sớm nhất.",
            "support_email": support_email,
        },
        status=status.HTTP_201_CREATED,
    )
