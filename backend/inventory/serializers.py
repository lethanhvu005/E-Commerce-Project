from rest_framework import serializers

from .models import InventoryBalance, InventoryMovement


class InventoryBalanceSerializer(serializers.ModelSerializer):
    sku = serializers.CharField(source="variant.sku", read_only=True)
    available = serializers.IntegerField(read_only=True)

    class Meta:
        model = InventoryBalance
        fields = ["variant_id", "sku", "on_hand", "reserved", "available", "low_stock_threshold", "updated_at"]


class InventoryAdjustmentSerializer(serializers.Serializer):
    variant_id = serializers.IntegerField(min_value=1)
    quantity_delta = serializers.IntegerField()
    reason = serializers.CharField(max_length=300)
    event_key = serializers.UUIDField()

    def validate_quantity_delta(self, value):
        if value == 0:
            raise serializers.ValidationError("Số lượng điều chỉnh phải khác 0.")
        return value


class InventoryMovementSerializer(serializers.ModelSerializer):
    sku = serializers.CharField(source="variant.sku", read_only=True)

    class Meta:
        model = InventoryMovement
        fields = ["event_key", "variant_id", "sku", "kind", "quantity_delta", "reason", "created_at"]
