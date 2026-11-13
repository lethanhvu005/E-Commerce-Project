
from django.core.exceptions import ValidationError as DjangoValidationError
from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers

from .models import Address

User = get_user_model()


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
        ]
        read_only_fields = [
            "id",
            "email",
            "email_verified_at",
            "date_joined",
            "is_staff",
            "permissions",
        ]

    def get_permissions(self, user):
        return sorted(user.get_all_permissions()) if user.is_staff else []

    def to_internal_value(self, data):
        allowed_fields = {"first_name", "last_name", "phone"}
        rejected_fields = set(data) - allowed_fields
        if rejected_fields:
            raise serializers.ValidationError(
                {field: "Không được sửa trường này tại API hồ sơ." for field in rejected_fields}
            )
        return super().to_internal_value(data)


class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, trim_whitespace=False)

    def validate_email(self, value):
        return value.strip().lower()


class RefreshSerializer(serializers.Serializer):
    refresh = serializers.CharField(trim_whitespace=False)


class AddressSerializer(serializers.ModelSerializer):
    recipient = serializers.CharField(source="recipient_name", max_length=150)
    address = serializers.CharField(source="address_line", max_length=300)

    class Meta:
        model = Address
        fields = [
            "id", "recipient", "phone", "address", "ward", "province",
            "country_code", "is_default", "created_at", "updated_at",
        ]
        read_only_fields = ["id", "country_code", "created_at", "updated_at"]
