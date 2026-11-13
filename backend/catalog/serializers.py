from rest_framework import serializers

from .models import Brand, Category, Collection, HomeBanner, Product, ProductFeature, ProductImage, ProductVariant


class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ["id", "name", "code", "slug", "image_key", "sort_order"]


class BrandSerializer(serializers.ModelSerializer):
    class Meta:
        model = Brand
        fields = ["id", "name", "slug", "logo_key"]


class ProductImageSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProductImage
        fields = ["id", "object_key", "alt_text", "width", "height", "sort_order", "is_cover", "variant_id"]


class ProductFeatureSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProductFeature
        fields = ["id", "content", "sort_order"]


class ProductVariantSerializer(serializers.ModelSerializer):
    available = serializers.SerializerMethodField()

    class Meta:
        model = ProductVariant
        fields = [
            "id", "sku", "option_key", "color", "switch_type", "connection",
            "layout", "price", "compare_at_price", "currency", "available",
        ]

    def get_available(self, variant):
        try:
            return variant.inventory.available
        except ProductVariant.inventory.RelatedObjectDoesNotExist:
            return 0


class ProductListSerializer(serializers.ModelSerializer):
    category = CategorySerializer(read_only=True)
    brand = BrandSerializer(read_only=True)
    cover_image = serializers.SerializerMethodField()
    min_price = serializers.DecimalField(max_digits=14, decimal_places=0, read_only=True)

    class Meta:
        model = Product
        fields = ["id", "name", "slug", "short_name", "badge", "summary", "category", "brand", "cover_image", "min_price", "created_at"]

    def get_cover_image(self, product):
        image = next((item for item in product.images.all() if item.is_cover), None)
        return ProductImageSerializer(image).data if image else None


class ProductDetailSerializer(ProductListSerializer):
    images = ProductImageSerializer(many=True, read_only=True)
    features = ProductFeatureSerializer(many=True, read_only=True)
    variants = ProductVariantSerializer(many=True, read_only=True)

    class Meta(ProductListSerializer.Meta):
        fields = ProductListSerializer.Meta.fields + ["description", "specifications", "warranty_months", "images", "features", "variants"]


class CollectionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Collection
        fields = ["id", "name", "slug", "sort_order"]


class HomeBannerSerializer(serializers.ModelSerializer):
    class Meta:
        model = HomeBanner
        fields = ["id", "title", "subtitle", "desktop_image_key", "mobile_image_key", "link_path", "sort_order"]


class AdminProductVariantSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProductVariant
        fields = [
            "id", "product_id", "sku", "option_key", "color", "switch_type",
            "connection", "layout", "price", "compare_at_price", "currency", "is_active",
        ]
        read_only_fields = ["id", "product_id", "currency"]

    def validate_sku(self, value):
        return value.strip().upper()

    def validate_option_key(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError("Option key must not be empty.")
        return value


class AdminProductImageSerializer(serializers.ModelSerializer):
    variant_id = serializers.PrimaryKeyRelatedField(
        source="variant", queryset=ProductVariant.objects.all(), allow_null=True, required=False,
    )

    class Meta:
        model = ProductImage
        fields = ["id", "product_id", "variant_id", "object_key", "alt_text", "width", "height", "sort_order", "is_cover"]
        read_only_fields = ["id", "product_id"]


class AdminProductSerializer(serializers.ModelSerializer):
    category_id = serializers.PrimaryKeyRelatedField(source="category", queryset=Category.objects.all())
    brand_id = serializers.PrimaryKeyRelatedField(source="brand", queryset=Brand.objects.all())
    variants = AdminProductVariantSerializer(many=True, read_only=True)
    images = AdminProductImageSerializer(many=True, read_only=True)
    features = ProductFeatureSerializer(many=True, read_only=True)

    class Meta:
        model = Product
        fields = [
            "id", "category_id", "brand_id", "name", "slug", "short_name", "badge",
            "accent_color", "summary", "description", "specifications", "status",
            "warranty_months", "created_at", "updated_at", "variants", "images", "features",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]
