from rest_framework import serializers

from .models import CartItem


class CartItemInputSerializer(serializers.Serializer):
    variant_id = serializers.IntegerField(min_value=1)
    quantity = serializers.IntegerField(min_value=1, max_value=99)


class QuantitySerializer(serializers.Serializer):
    quantity = serializers.IntegerField(min_value=1, max_value=99)


class CartItemSerializer(serializers.ModelSerializer):
    variant_id = serializers.IntegerField(read_only=True)
    product_id = serializers.IntegerField(source="variant.product_id", read_only=True)
    product_slug = serializers.CharField(source="variant.product.slug", read_only=True)
    sku = serializers.CharField(source="variant.sku", read_only=True)
    product_name = serializers.CharField(source="variant.product.name", read_only=True)
    unit_price = serializers.DecimalField(source="variant.price", max_digits=14, decimal_places=0, read_only=True)
    line_total = serializers.SerializerMethodField()
    option_summary = serializers.SerializerMethodField()
    cover_image = serializers.SerializerMethodField()
    category = serializers.SerializerMethodField()

    class Meta:
        model = CartItem
        fields = [
            "id",
            "variant_id",
            "product_id",
            "product_slug",
            "sku",
            "product_name",
            "option_summary",
            "cover_image",
            "category",
            "quantity",
            "unit_price",
            "line_total",
        ]

    def get_line_total(self, item):
        return item.variant.price * item.quantity

    def get_option_summary(self, item):
        parts = [item.variant.color, item.variant.switch_type, item.variant.layout]
        return " / ".join([p for p in parts if p])

    def get_cover_image(self, item):
        product = getattr(item.variant, "product", None)
        if not product:
            return None
        images = list(product.images.all())
        image = next((img for img in images if img.is_cover), None) or (images[0] if images else None)
        if image:
            return {"object_key": image.object_key, "alt_text": image.alt_text}
        if product.category and product.category.image_key:
            return {"object_key": product.category.image_key, "alt_text": product.name}
        return None

    def get_category(self, item):
        product = getattr(item.variant, "product", None)
        category = getattr(product, "category", None)
        if not category:
            return None
        return {
            "id": category.id,
            "code": category.code,
            "name": category.name,
            "slug": category.slug,
            "image_key": category.image_key,
        }
