from rest_framework import serializers

from .models import Voucher


class VoucherSerializer(serializers.ModelSerializer):
    class Meta:
        model = Voucher
        fields = ["code", "kind", "value", "max_discount", "min_subtotal", "starts_at", "ends_at"]


class VoucherCodeSerializer(serializers.Serializer):
    code = serializers.CharField(max_length=40)

    def validate_code(self, value):
        return value.strip().upper()
