from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import serializers

from .models import ProductAnswer, ProductQuestion, Review


def _validate_trimmed_body(value, min_length, label):
    trimmed = (value or "").strip()
    if len(trimmed) < min_length:
        raise serializers.ValidationError(f"{label} phải có ít nhất {min_length} ký tự.")
    return trimmed


class ReviewSerializer(serializers.ModelSerializer):
    author = serializers.CharField(source="user.get_full_name", read_only=True)
    is_verified_buyer = serializers.BooleanField(read_only=True)

    class Meta:
        model = Review
        fields = ["id", "stars", "body", "order_item", "author", "is_verified_buyer", "status", "created_at", "updated_at"]
        read_only_fields = ["id", "author", "is_verified_buyer", "status", "created_at", "updated_at"]

    def validate_stars(self, value):
        if value < 1 or value > 5:
            raise serializers.ValidationError("Số sao đánh giá phải nằm trong khoảng từ 1 đến 5.")
        return value

    def validate_body(self, value):
        return _validate_trimmed_body(value, 10, "Nội dung đánh giá")

    def validate(self, attrs):
        instance = Review(
            product=self.context["product"], user=self.context["request"].user,
            order_item=attrs.get("order_item"), stars=attrs.get("stars", 1), body=attrs.get("body", ""),
        )
        try:
            instance.full_clean(exclude=["status"])
        except DjangoValidationError as error:
            raise serializers.ValidationError(error.message_dict)
        return attrs


class ReviewUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Review
        fields = ["stars", "body"]

    def validate_stars(self, value):
        if value < 1 or value > 5:
            raise serializers.ValidationError("Số sao đánh giá phải nằm trong khoảng từ 1 đến 5.")
        return value

    def validate_body(self, value):
        return _validate_trimmed_body(value, 10, "Nội dung đánh giá")


class AnswerSerializer(serializers.ModelSerializer):
    author = serializers.CharField(source="user.get_full_name", read_only=True)
    is_staff_answer = serializers.BooleanField(source="user.is_staff", read_only=True)

    class Meta:
        model = ProductAnswer
        fields = ["id", "body", "author", "is_staff_answer", "status", "created_at"]
        read_only_fields = ["id", "author", "is_staff_answer", "status", "created_at"]

    def validate_body(self, value):
        return _validate_trimmed_body(value, 5, "Nội dung câu trả lời")


class QuestionSerializer(serializers.ModelSerializer):
    author = serializers.CharField(source="user.get_full_name", read_only=True)
    answers = serializers.SerializerMethodField()

    class Meta:
        model = ProductQuestion
        fields = ["id", "body", "author", "status", "created_at", "answers"]
        read_only_fields = ["id", "author", "status", "created_at", "answers"]

    def get_answers(self, obj):
        published_answers = [
            ans for ans in obj.answers.all() if ans.status == "published"
        ]
        return AnswerSerializer(published_answers, many=True).data

    def validate_body(self, value):
        return _validate_trimmed_body(value, 5, "Nội dung câu hỏi")
