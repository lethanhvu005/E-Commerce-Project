from rest_framework import serializers

from .models import Payment


class PaymentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Payment
        fields = ["public_id", "provider", "status", "amount", "currency", "paid_at", "created_at"]


class VnpayCreateSerializer(serializers.Serializer):
    order_id = serializers.UUIDField()
    bank_code = serializers.CharField(max_length=20, required=False, allow_blank=True, default="")
    locale = serializers.ChoiceField(choices=["vn", "en"], required=False, default="vn")


class VnpayVerifyReturnSerializer(serializers.Serializer):
    params = serializers.DictField(child=serializers.CharField(allow_blank=True))
