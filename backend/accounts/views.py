import json
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen

from django.conf import settings
from django.contrib.auth import authenticate
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

from .models import Address, User
from .serializers import (
    AddressSerializer,
    FacebookLoginSerializer,
    GoogleLoginSerializer,
    LoginSerializer,
    RefreshSerializer,
    RegisterSerializer,
    UserSerializer,
)
from .throttles import LoginRateThrottle, RegisterRateThrottle


VALID_GOOGLE_ISSUERS = {"accounts.google.com", "https://accounts.google.com"}


def _fetch_google_json(url, headers=None):
    req = Request(url, headers=headers or {})
    with urlopen(req, timeout=8) as resp:
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
                if user.is_staff or user.is_superuser:
                    return Response(
                        {"detail": "Tài khoản quản trị/nhân viên không được phép đăng nhập qua Google OAuth."},
                        status=status.HTTP_403_FORBIDDEN,
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
            else:
                # 2. Check if an account with this email already exists
                existing_by_email = User.objects.select_for_update().filter(email=email).first()
                if existing_by_email is not None:
                    if existing_by_email.is_staff or existing_by_email.is_superuser:
                        return Response(
                            {
                                "detail": "Tài khoản quản trị/nhân viên không được phép tự động liên kết hoặc đăng nhập qua Google OAuth."
                            },
                            status=status.HTTP_403_FORBIDDEN,
                        )
                    if existing_by_email.google_sub and existing_by_email.google_sub != google_sub:
                        return Response(
                            {"detail": "Email này đã được liên kết với một định danh Google khác."},
                            status=status.HTTP_409_CONFLICT,
                        )
                    if existing_by_email.has_usable_password():
                        return Response(
                            {
                                "detail": "Email này đã được đăng ký bằng mật khẩu. Vui lòng đăng nhập bằng mật khẩu để bảo mật tài khoản."
                            },
                            status=status.HTTP_409_CONFLICT,
                        )
                    if not existing_by_email.is_active:
                        return Response(
                            {"detail": "Tài khoản đã bị vô hiệu hóa."},
                            status=status.HTTP_401_UNAUTHORIZED,
                        )
                    # Existing passwordless OAuth account without google_sub bound yet
                    existing_by_email.google_sub = google_sub
                    update_fields = ["google_sub"]
                    if existing_by_email.email_verified_at is None:
                        existing_by_email.email_verified_at = now
                        update_fields.append("email_verified_at")
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
        user = User.objects.filter(google_sub=google_sub, is_active=True, is_staff=False, is_superuser=False).first()
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
    facebook_email = str(payload.get("email") or "").strip().lower()
    email = facebook_email or f"facebook-{facebook_sub}@users.nexa.invalid"

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
                existing = User.objects.select_for_update().filter(email=email).first()
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
                        first_name=first_name or email.split("@")[0],
                        last_name=last_name,
                        email_verified_at=now if facebook_email else None,
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
