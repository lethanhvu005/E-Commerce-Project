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
    compare_at_price = serializers.SerializerMethodField()
    default_variant_id = serializers.SerializerMethodField()
    available_stock = serializers.SerializerMethodField()
    rating_avg = serializers.SerializerMethodField()
    review_count = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = [
            "id", "name", "slug", "short_name", "badge", "accent_color", "summary",
            "category", "brand", "cover_image", "min_price", "compare_at_price",
            "default_variant_id", "available_stock", "rating_avg", "review_count", "created_at",
        ]

    def get_cover_image(self, product):
        image = next((item for item in product.images.all() if item.is_cover), None)
        return ProductImageSerializer(image).data if image else None

    def _active_variants(self, product):
        return [v for v in product.variants.all() if v.is_active]

    def get_compare_at_price(self, product):
        variants = self._active_variants(product)
        with_compare = [v.compare_at_price for v in variants if v.compare_at_price]
        return str(min(with_compare)) if with_compare else None

    def get_default_variant_id(self, product):
        variants = sorted(self._active_variants(product), key=lambda v: (v.price, v.id))
        for v in variants:
            try:
                if v.inventory.available > 0:
                    return v.id
            except ProductVariant.inventory.RelatedObjectDoesNotExist:
                continue
        return variants[0].id if variants else None

    def get_available_stock(self, product):
        total = 0
        for v in self._active_variants(product):
            try:
                total += max(0, v.inventory.available)
            except ProductVariant.inventory.RelatedObjectDoesNotExist:
                continue
        return total

    def get_rating_avg(self, product):
        published = [r.stars for r in product.reviews.all() if r.status == "published"]
        if not published:
            return None
        return round(sum(published) / len(published), 1)

    def get_review_count(self, product):
        return sum(1 for r in product.reviews.all() if r.status == "published")


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
