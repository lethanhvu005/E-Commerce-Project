from rest_framework import serializers

from catalog.serializers import ProductListSerializer
from .models import Wishlist


class WishlistInputSerializer(serializers.Serializer):
    product_id = serializers.IntegerField(min_value=1)


class WishlistSerializer(serializers.ModelSerializer):
    product = ProductListSerializer(read_only=True)

    class Meta:
        model = Wishlist
        fields = ["product", "created_at"]
