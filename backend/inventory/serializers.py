from rest_framework import serializers

from .models import InventoryBalance, InventoryMovement


class InventoryBalanceSerializer(serializers.ModelSerializer):
    sku = serializers.CharField(source="variant.sku", read_only=True)
    product_name = serializers.CharField(source="variant.product.name", read_only=True)
    category_name = serializers.CharField(source="variant.product.category.name", read_only=True)
    image_key = serializers.SerializerMethodField()
    available = serializers.IntegerField(read_only=True)

    class Meta:
        model = InventoryBalance
        fields = [
            "variant_id",
            "sku",
            "product_name",
            "category_name",
            "image_key",
            "on_hand",
            "reserved",
            "available",
            "low_stock_threshold",
            "updated_at",
        ]

    def get_image_key(self, obj):
        images = list(obj.variant.product.images.all())
        cover = next((img for img in images if img.is_cover), images[0] if images else None)
        return cover.object_key if cover else obj.variant.product.category.image_key


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
