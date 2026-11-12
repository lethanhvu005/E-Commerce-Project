from rest_framework import serializers

from .models import Payment


class PaymentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Payment
        fields = ["public_id", "provider", "status", "amount", "currency", "paid_at", "created_at"]
