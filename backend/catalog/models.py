from django.core.exceptions import ValidationError
from django.core.validators import MinValueValidator, RegexValidator
from django.db import models
from django.db.models import F, Q
from django.db.models.functions import Trim, Upper

from common.constraints import json_object_constraint, validate_json_object
from common.models import TimestampedModel


class Category(models.Model):
    parent = models.ForeignKey('self', null=True, blank=True, on_delete=models.PROTECT, related_name='children')
    name = models.CharField(max_length=120)
    code = models.CharField(max_length=40, unique=True)
    slug = models.SlugField(max_length=160, unique=True)
    image_key = models.CharField(max_length=500, null=True, blank=True)
    is_active = models.BooleanField(default=True)
    sort_order = models.IntegerField(default=0)

    class Meta:
        db_table = 'categories'
        ordering = ['sort_order', 'id']
        constraints = [models.CheckConstraint(condition=Q(parent__isnull=True) | ~Q(parent=F('id')), name='categories_not_self_parent')]

    def __str__(self):
        return self.name


class Brand(models.Model):
    name = models.CharField(max_length=120)
    slug = models.SlugField(max_length=160, unique=True)
    logo_key = models.CharField(max_length=500, null=True, blank=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = 'brands'

    def __str__(self):
        return self.name


class Product(TimestampedModel):
    class Status(models.TextChoices):
        DRAFT = 'draft', 'Draft'
        ACTIVE = 'active', 'Active'
        ARCHIVED = 'archived', 'Archived'

    category = models.ForeignKey(Category, on_delete=models.PROTECT, related_name='products')
    brand = models.ForeignKey(Brand, on_delete=models.PROTECT, related_name='products')
    name = models.CharField(max_length=200)
    slug = models.SlugField(max_length=220, unique=True)
    short_name = models.CharField(max_length=120)
    badge = models.CharField(max_length=40, blank=True, default='')
    accent_color = models.CharField(max_length=7, null=True, blank=True, validators=[RegexValidator(r'^#[0-9a-fA-F]{6}$')])
    summary = models.CharField(max_length=500, blank=True, default='')
    description = models.TextField(blank=True, default='')
    specifications = models.JSONField(default=dict, blank=True, validators=[validate_json_object])
    status = models.CharField(max_length=12, choices=Status.choices, default=Status.DRAFT)
    warranty_months = models.PositiveIntegerField(default=0)

    class Meta:
        db_table = 'products'
        indexes = [
            models.Index(fields=['category', 'status', 'id'], name='products_category_status_idx'),
            models.Index(fields=['brand', 'status', 'id'], name='products_brand_status_idx'),
            models.Index(fields=['-created_at', '-id'], condition=Q(status='active'), name='products_active_new_idx'),
        ]
        constraints = [
            models.CheckConstraint(condition=Q(status__in=['draft', 'active', 'archived']), name='products_status_valid'),
            models.CheckConstraint(condition=Q(accent_color__isnull=True) | Q(accent_color__regex=r'^#[0-9a-fA-F]{6}$'), name='products_color_valid'),
            json_object_constraint('specifications', 'products_specs_object'),
        ]

    def __str__(self):
        return self.name


class ProductFeature(models.Model):
    product = models.ForeignKey(Product, on_delete=models.PROTECT, related_name='features')
    content = models.CharField(max_length=300)
    sort_order = models.IntegerField(default=0)

    class Meta:
        db_table = 'product_features'
        ordering = ['sort_order', 'id']
        indexes = [models.Index(fields=['product', 'sort_order', 'id'], name='product_features_sort_idx')]


class ProductVariant(TimestampedModel):
    product = models.ForeignKey(Product, on_delete=models.PROTECT, related_name='variants')
    sku = models.CharField(max_length=64, unique=True)
    option_key = models.CharField(max_length=220)
    color = models.CharField(max_length=60, blank=True, default='')
    switch_type = models.CharField(max_length=60, blank=True, default='')
    connection = models.CharField(max_length=100, blank=True, default='')
    layout = models.CharField(max_length=60, blank=True, default='')
    price = models.DecimalField(max_digits=14, decimal_places=0, validators=[MinValueValidator(0)])
    compare_at_price = models.DecimalField(max_digits=14, decimal_places=0, null=True, blank=True)
    currency = models.CharField(max_length=3, default='VND')
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = 'product_variants'
        indexes = [
            models.Index(fields=['product', 'price'], condition=Q(is_active=True), name='variants_product_price_idx'),
            models.Index(fields=['price', 'id'], condition=Q(is_active=True), name='variants_active_price_idx'),
        ]
        constraints = [
            models.UniqueConstraint(fields=['product', 'option_key'], name='variants_product_option_uq'),
            models.UniqueConstraint(fields=['id', 'product'], name='variants_id_product_uq'),
            models.CheckConstraint(condition=Q(price__gte=0), name='variants_price_nonnegative'),
            models.CheckConstraint(condition=Q(compare_at_price__isnull=True) | Q(compare_at_price__gte=F('price')), name='variants_compare_price_valid'),
            models.CheckConstraint(condition=Q(currency='VND'), name='variants_currency_vnd'),
            models.CheckConstraint(condition=Q(sku=Upper(Trim('sku'))) & ~Q(sku=''), name='variants_sku_normalized'),
            models.CheckConstraint(condition=~Q(option_key=''), name='variants_option_not_empty'),
        ]

    def __str__(self):
        return self.sku


class ProductImage(models.Model):
    product = models.ForeignKey(Product, on_delete=models.PROTECT, related_name='images')
    variant = models.ForeignKey(ProductVariant, on_delete=models.PROTECT, related_name='images', null=True, blank=True)
    object_key = models.CharField(max_length=500)
    alt_text = models.CharField(max_length=250, blank=True, default='')
    width = models.PositiveIntegerField(validators=[MinValueValidator(1)])
    height = models.PositiveIntegerField(validators=[MinValueValidator(1)])
    sort_order = models.IntegerField(default=0)
    is_cover = models.BooleanField(default=False)

    class Meta:
        db_table = 'product_images'
        ordering = ['sort_order', 'id']
        indexes = [models.Index(fields=['product', 'sort_order', 'id'], name='product_images_sort_idx')]
        constraints = [
            models.UniqueConstraint(fields=['product'], condition=Q(is_cover=True), name='product_images_cover_uq'),
            models.CheckConstraint(condition=Q(width__gt=0) & Q(height__gt=0), name='product_images_size_positive'),
        ]

    def clean(self):
        super().clean()
        if self.variant_id and self.product_id and self.variant.product_id != self.product_id:
            raise ValidationError({'variant': 'The variant must belong to this product.'})


class HomeBanner(models.Model):
    title = models.CharField(max_length=160)
    subtitle = models.CharField(max_length=300, blank=True, default='')
    desktop_image_key = models.CharField(max_length=500)
    mobile_image_key = models.CharField(max_length=500, null=True, blank=True)
    link_path = models.CharField(max_length=300, validators=[RegexValidator(r'^/(?!/)')])
    starts_at = models.DateTimeField(null=True, blank=True)
    ends_at = models.DateTimeField(null=True, blank=True)
    is_active = models.BooleanField(default=True)
    sort_order = models.IntegerField(default=0)

    class Meta:
        db_table = 'home_banners'
        ordering = ['sort_order', 'id']
        constraints = [
            models.CheckConstraint(condition=Q(link_path__startswith='/') & ~Q(link_path__startswith='//'), name='banners_internal_link'),
            models.CheckConstraint(condition=Q(starts_at__isnull=True) | Q(ends_at__isnull=True) | Q(ends_at__gt=F('starts_at')), name='banners_date_range'),
        ]

    def __str__(self):
        return self.title


class Collection(models.Model):
    name = models.CharField(max_length=120)
    slug = models.SlugField(max_length=160, unique=True)
    is_active = models.BooleanField(default=True)
    sort_order = models.IntegerField(default=0)
    products = models.ManyToManyField(Product, through='CollectionProduct', related_name='collections')

    class Meta:
        db_table = 'collections'

    def __str__(self):
        return self.name


class CollectionProduct(models.Model):
    collection = models.ForeignKey(Collection, on_delete=models.CASCADE, related_name='entries')
    product = models.ForeignKey(Product, on_delete=models.PROTECT, related_name='collection_entries')
    sort_order = models.IntegerField(default=0)

    class Meta:
        db_table = 'collection_products'
        ordering = ['sort_order', 'id']
        indexes = [models.Index(fields=['collection', 'sort_order', 'id'], name='collection_products_sort_idx')]
        constraints = [models.UniqueConstraint(fields=['collection', 'product'], name='collection_product_uq')]
