from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import serializers

from .models import ProductAnswer, ProductQuestion, Review


class ReviewSerializer(serializers.ModelSerializer):
    author = serializers.CharField(source="user.get_full_name", read_only=True)
    is_verified_buyer = serializers.BooleanField(read_only=True)

    class Meta:
        model = Review
        fields = ["id", "stars", "body", "order_item", "author", "is_verified_buyer", "status", "created_at", "updated_at"]
        read_only_fields = ["id", "author", "is_verified_buyer", "status", "created_at", "updated_at"]

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


class QuestionSerializer(serializers.ModelSerializer):
    author = serializers.CharField(source="user.get_full_name", read_only=True)

    class Meta:
        model = ProductQuestion
        fields = ["id", "body", "author", "status", "created_at"]
        read_only_fields = ["id", "author", "status", "created_at"]


class AnswerSerializer(serializers.ModelSerializer):
    author = serializers.CharField(source="user.get_full_name", read_only=True)

    class Meta:
        model = ProductAnswer
        fields = ["id", "body", "author", "status", "created_at"]
        read_only_fields = ["id", "author", "status", "created_at"]
