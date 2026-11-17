from rest_framework import serializers

from .models import Order, OrderAddress, OrderItem, OrderStatusHistory, ShippingMethod


class ShippingMethodSerializer(serializers.ModelSerializer):
    class Meta:
        model = ShippingMethod
        fields = ["id", "code", "name", "base_fee", "free_threshold", "min_days", "max_days"]


class CheckoutInputSerializer(serializers.Serializer):
    address_id = serializers.IntegerField(min_value=1)
    shipping_method_id = serializers.IntegerField(min_value=1, required=False)
    ship_method = serializers.CharField(required=False)
    checkout_key = serializers.UUIDField(required=False)
    payment_method = serializers.ChoiceField(choices=["cod", "vnpay"], required=False, default="cod")
    note = serializers.CharField(max_length=500, required=False, allow_blank=True, default="")

    def validate(self, attrs):
        if not attrs.get("shipping_method_id") and not attrs.get("ship_method"):
            raise serializers.ValidationError({"shipping_method_id": "Chọn phương thức giao hàng."})
        return attrs


class OrderAddressSerializer(serializers.ModelSerializer):
    class Meta:
        model = OrderAddress
        exclude = ["order"]


class OrderItemSerializer(serializers.ModelSerializer):
    product_slug = serializers.CharField(source="variant.product.slug", read_only=True, default="")
    cover_image = serializers.SerializerMethodField()

    class Meta:
        model = OrderItem
        fields = [
            "id",
            "product_slug",
            "cover_image",
            "product_name_snapshot",
            "sku_snapshot",
            "options_snapshot",
            "quantity",
            "unit_price",
            "line_total",
        ]

    def get_cover_image(self, item):
        variant = getattr(item, "variant", None)
        product = getattr(variant, "product", None) if variant else None
        if not product:
            return None
        images = list(product.images.all())
        image = next((img for img in images if img.is_cover), None) or (images[0] if images else None)
        if image:
            return {"object_key": image.object_key, "alt_text": image.alt_text}
        if product.category and product.category.image_key:
            return {"object_key": product.category.image_key, "alt_text": product.name}
        return None


class OrderSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(many=True, read_only=True)
    delivery_address = OrderAddressSerializer(read_only=True)
    payment_provider = serializers.SerializerMethodField()
    payment_status = serializers.SerializerMethodField()

    class Meta:
        model = Order
        fields = [
            "public_id", "order_number", "status", "currency", "subtotal", "discount_total",
            "shipping_fee", "shipping_discount", "grand_total", "voucher_code_snapshot",
            "shipping_method_snapshot", "contact_email_snapshot", "customer_note",
            "payment_provider", "payment_status",
            "created_at", "updated_at", "items", "delivery_address",
        ]

    def _latest_payment(self, order):
        payments = list(order.payments.all())
        if not payments:
            return None
        payments.sort(key=lambda p: (p.created_at, p.id or 0), reverse=True)
        return payments[0]

    def get_payment_provider(self, order):
        latest = self._latest_payment(order)
        return latest.provider if latest else None

    def get_payment_status(self, order):
        latest = self._latest_payment(order)
        return latest.status if latest else None


class OrderHistorySerializer(serializers.ModelSerializer):
    class Meta:
        model = OrderStatusHistory
        fields = ["from_status", "to_status", "reason", "created_at"]


class CancelSerializer(serializers.Serializer):
    reason = serializers.CharField(max_length=300)
