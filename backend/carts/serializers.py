from rest_framework import serializers

from .models import CartItem


class CartItemInputSerializer(serializers.Serializer):
    variant_id = serializers.IntegerField(min_value=1)
    quantity = serializers.IntegerField(min_value=1, max_value=99)


class QuantitySerializer(serializers.Serializer):
    quantity = serializers.IntegerField(min_value=1, max_value=99)


class CartItemSerializer(serializers.ModelSerializer):
    variant_id = serializers.IntegerField(read_only=True)
    sku = serializers.CharField(source="variant.sku", read_only=True)
    product_name = serializers.CharField(source="variant.product.name", read_only=True)
    unit_price = serializers.DecimalField(source="variant.price", max_digits=14, decimal_places=0, read_only=True)
    line_total = serializers.SerializerMethodField()

    class Meta:
        model = CartItem
        fields = ["id", "variant_id", "sku", "product_name", "quantity", "unit_price", "line_total"]

    def get_line_total(self, item):
        return item.variant.price * item.quantity
