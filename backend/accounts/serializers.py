
from django.core.exceptions import ValidationError as DjangoValidationError
from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers

from .models import Address

User = get_user_model()

import re

VN_PHONE_RE = re.compile(r"^0[35789]\d{8}$")
EMAIL_STRICT_RE = re.compile(r"^[a-z0-9]+([._%+-][a-z0-9]+)*@([a-z0-9-]+\.)+[a-z]{2,}$")
GMAIL_TYPO_DOMAINS = {
    "gmai.com", "gmial.com", "gmal.com", "gmail.co", "gmail.vn",
    "gmail.con", "gmail.cm", "gamil.com", "gnail.com",
}


def normalize_vn_phone(value):
    cleaned = re.sub(r"[\s.\-()]+", "", str(value or "").strip())
    if cleaned.startswith("+84"):
        cleaned = "0" + cleaned[3:]
    elif cleaned.startswith("84") and len(cleaned) == 11:
        cleaned = "0" + cleaned[2:]
    return cleaned


def validate_vn_phone_value(value, allow_blank=False):
    if value is None or not str(value).strip():
        if allow_blank:
            return ""
        raise serializers.ValidationError("Vui lòng nhập số điện thoại.")
    phone = normalize_vn_phone(value)
    if not VN_PHONE_RE.match(phone):
        raise serializers.ValidationError(
            "Số điện thoại không đúng định dạng. Cần đúng 10 chữ số di động Việt Nam, "
            "bắt đầu bằng 03, 05, 07, 08 hoặc 09 (VD: 0947243014)."
        )
    return phone


def validate_email_format_value(value):
    email = str(value or "").strip().lower()
    if not EMAIL_STRICT_RE.match(email):
        raise serializers.ValidationError("Địa chỉ email không đúng định dạng (VD: tenban@gmail.com).")
    domain = email.split("@", 1)[1]
    if domain in GMAIL_TYPO_DOMAINS:
        raise serializers.ValidationError(
            f'Tên miền "@{domain}" không hợp lệ. Ý bạn có phải là "@gmail.com"?'
        )
    return email



class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(
        write_only=True,
        trim_whitespace=False,
    )

    class Meta:
        model = User
        fields = ["id", "email", "password", "first_name", "last_name"]
        read_only_fields = ["id"]

    def to_internal_value(self, data):
        # Không cho client tự gửi các trường dùng để cấp quyền.
        protected_fields = {"role", "is_staff", "is_superuser", "groups", "user_permissions"}
        attempted_fields = protected_fields.intersection(data)
        if attempted_fields:
            raise serializers.ValidationError(
                {
                    field: "Không được tự gán quyền khi đăng ký."
                    for field in attempted_fields
                }
            )
        return super().to_internal_value(data)

    def validate_email(self, value):
        email = value.strip().lower()
        if User.objects.filter(email=email).exists():
            raise serializers.ValidationError("Email đã tồn tại.")
        return email

    def validate(self, attrs):
        # Cho password validators kiểm tra cả mức độ giống email và tên.
        candidate_user = User(
            email=attrs.get("email", ""),
            first_name=attrs.get("first_name", ""),
            last_name=attrs.get("last_name", ""),
        )
        try:
            validate_password(attrs["password"], user=candidate_user)
        except DjangoValidationError as error:
            raise serializers.ValidationError({"password": error.messages})
        return attrs

    def create(self, validated_data):
        return User.objects.create_user(
            **validated_data,
        )


class UserSerializer(serializers.ModelSerializer):
    permissions = serializers.SerializerMethodField()
    can_edit_email = serializers.SerializerMethodField()
    email = serializers.EmailField(required=False, allow_null=True, allow_blank=True)

    class Meta:
        model = User
        fields = [
            "id",
            "email",
            "first_name",
            "last_name",
            "phone",
            "email_verified_at",
            "date_joined",
            "is_staff",
            "permissions",
            "can_edit_email",
        ]
        read_only_fields = [
            "id",
            "email_verified_at",
            "date_joined",
            "is_staff",
            "permissions",
            "can_edit_email",
        ]

    def get_permissions(self, user):
        return sorted(user.get_all_permissions()) if user.is_staff else []

    def get_can_edit_email(self, user):
        return bool(user.facebook_sub)

    def validate_phone(self, value):
        return validate_vn_phone_value(value, allow_blank=True)

    def validate_email(self, value):
        if value is None or not value.strip():
            return None
        email = validate_email_format_value(value)
        queryset = User.objects.filter(email__iexact=email)
        if self.instance:
            queryset = queryset.exclude(pk=self.instance.pk)
        if queryset.exists():
            raise serializers.ValidationError("Email đã được tài khoản khác sử dụng.")
        return email

    def to_internal_value(self, data):
        allowed_fields = {"first_name", "last_name", "phone"}
        if self.instance and self.instance.facebook_sub:
            allowed_fields.add("email")
        rejected_fields = set(data) - allowed_fields
        if rejected_fields:
            raise serializers.ValidationError(
                {field: "Không được sửa trường này tại API hồ sơ." for field in rejected_fields}
            )
        return super().to_internal_value(data)

    def update(self, instance, validated_data):
        if "email" in validated_data and validated_data["email"] != instance.email:
            instance.email_verified_at = None
        return super().update(instance, validated_data)


class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, trim_whitespace=False)

    def validate_email(self, value):
        return value.strip().lower()


class RefreshSerializer(serializers.Serializer):
    refresh = serializers.CharField(trim_whitespace=False)


class GoogleLoginSerializer(serializers.Serializer):
    credential = serializers.CharField(required=False, allow_blank=True, trim_whitespace=True)
    access_token = serializers.CharField(required=False, allow_blank=True, trim_whitespace=True)
    password = serializers.CharField(required=False, allow_blank=True, write_only=True, trim_whitespace=False)
    otp = serializers.CharField(required=False, allow_blank=True, trim_whitespace=True)
    send_link_otp = serializers.BooleanField(required=False, default=False)

    def validate(self, attrs):
        if not attrs.get("credential") and not attrs.get("access_token"):
            raise serializers.ValidationError("Vui lòng cung cấp Google credential hoặc access_token.")
        return attrs


class FacebookLoginSerializer(serializers.Serializer):
    access_token = serializers.CharField(trim_whitespace=False)


class EmailOtpRequestSerializer(serializers.Serializer):
    email = serializers.EmailField()

    def validate_email(self, value):
        return validate_email_format_value(value)


class EmailOtpVerifySerializer(serializers.Serializer):
    email = serializers.EmailField()
    otp = serializers.CharField(min_length=6, max_length=6, trim_whitespace=True)

    def validate_email(self, value):
        return value.strip().lower()

    def validate_otp(self, value):
        code = value.strip()
        if not code.isdigit() or len(code) != 6:
            raise serializers.ValidationError("Mã xác thực phải gồm đúng 6 chữ số.")
        return code


class SupportContactSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=80, trim_whitespace=True)
    email = serializers.EmailField()
    phone = serializers.CharField(max_length=20, required=False, allow_blank=True, trim_whitespace=True)
    subject = serializers.CharField(max_length=120, trim_whitespace=True)
    message = serializers.CharField(min_length=10, max_length=1000, trim_whitespace=True)

    def validate_email(self, value):
        return validate_email_format_value(value)

    def validate_phone(self, value):
        return validate_vn_phone_value(value, allow_blank=True)


class AddressSerializer(serializers.ModelSerializer):
    recipient = serializers.CharField(source="recipient_name", max_length=150)
    address = serializers.CharField(source="address_line", max_length=300)

    def validate_phone(self, value):
        return validate_vn_phone_value(value)

    class Meta:
        model = Address
        fields = [
            "id", "recipient", "phone", "address", "ward", "province",
            "country_code", "is_default", "created_at", "updated_at",
        ]
        read_only_fields = ["id", "country_code", "created_at", "updated_at"]
