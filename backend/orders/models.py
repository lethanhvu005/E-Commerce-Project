import uuid

from django.conf import settings
from django.core.validators import MaxValueValidator, MinValueValidator, RegexValidator
from django.db import models
from django.db.models import F, Q
from django.utils import timezone

from common.constraints import json_object_constraint, validate_json_object
from common.models import TimestampedModel


class OrderStatus(models.TextChoices):
    PENDING = 'pending', 'Pending'
    CONFIRMED = 'confirmed', 'Confirmed'
    PACKING = 'packing', 'Packing'
    SHIPPED = 'shipped', 'Shipped'
    DELIVERED = 'delivered', 'Delivered'
    CANCELLED = 'cancelled', 'Cancelled'
    EXPIRED = 'expired', 'Expired'


class ShippingMethod(models.Model):
    class Code(models.TextChoices):
        STANDARD = 'standard', 'Standard'
        EXPRESS = 'express', 'Express'

    code = models.CharField(max_length=16, unique=True, choices=Code.choices)
    name = models.CharField(max_length=120)
    base_fee = models.DecimalField(max_digits=14, decimal_places=0, validators=[MinValueValidator(0)])
    free_threshold = models.DecimalField(max_digits=14, decimal_places=0, null=True, blank=True, validators=[MinValueValidator(0)])
    min_days = models.PositiveIntegerField()
    max_days = models.PositiveIntegerField()
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = 'shipping_methods'
        constraints = [
            models.CheckConstraint(condition=Q(code__in=['standard', 'express']), name='shipping_code_valid'),
            models.CheckConstraint(condition=Q(base_fee__gte=0), name='shipping_fee_nonnegative'),
            models.CheckConstraint(condition=Q(free_threshold__isnull=True) | Q(free_threshold__gte=0), name='shipping_threshold_valid'),
            models.CheckConstraint(condition=Q(max_days__gte=F('min_days')), name='shipping_days_range'),
        ]

    def __str__(self):
        return self.name


class Order(TimestampedModel):
    public_id = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)
    order_number = models.CharField(max_length=32, unique=True)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name='orders')
    # Supplied by checkout; retries must reuse the same key.
    checkout_key = models.UUIDField()
    request_hash = models.CharField(max_length=64, validators=[RegexValidator(r'^[0-9a-f]{64}$')])
    source_cart = models.OneToOneField('carts.Cart', on_delete=models.PROTECT, related_name='order')
    status = models.CharField(max_length=20, choices=OrderStatus.choices, default=OrderStatus.PENDING)
    currency = models.CharField(max_length=3, default='VND')
    subtotal = models.DecimalField(max_digits=14, decimal_places=0, validators=[MinValueValidator(0)])
    discount_total = models.DecimalField(max_digits=14, decimal_places=0, default=0, validators=[MinValueValidator(0)])
    shipping_fee = models.DecimalField(max_digits=14, decimal_places=0, default=0, validators=[MinValueValidator(0)])
    shipping_discount = models.DecimalField(max_digits=14, decimal_places=0, default=0, validators=[MinValueValidator(0)])
    grand_total = models.DecimalField(max_digits=14, decimal_places=0, validators=[MinValueValidator(0)])
    voucher = models.ForeignKey('promotions.Voucher', on_delete=models.PROTECT, related_name='orders', null=True, blank=True)
    voucher_code_snapshot = models.CharField(max_length=40, null=True, blank=True)
    shipping_method = models.ForeignKey(ShippingMethod, on_delete=models.PROTECT, related_name='orders')
    shipping_method_snapshot = models.CharField(max_length=120)
    contact_email_snapshot = models.EmailField(max_length=254)
    customer_note = models.CharField(max_length=500, blank=True, default='')

    class Meta:
        db_table = 'orders'
        indexes = [
            models.Index(fields=['user', '-created_at', '-id'], name='orders_user_created_idx'),
            models.Index(fields=['status', '-created_at', '-id'], name='orders_status_created_idx'),
        ]
        constraints = [
            models.UniqueConstraint(fields=['user', 'checkout_key'], name='orders_user_checkout_uq'),
            models.UniqueConstraint(fields=['id', 'user'], name='orders_id_user_uq'),
            models.CheckConstraint(condition=Q(status__in=OrderStatus.values), name='orders_status_valid'),
            models.CheckConstraint(condition=Q(currency='VND'), name='orders_currency_vnd'),
            models.CheckConstraint(condition=Q(request_hash__regex=r'^[0-9a-f]{64}$'), name='orders_request_hash_valid'),
            models.CheckConstraint(condition=Q(subtotal__gte=0, discount_total__gte=0, shipping_fee__gte=0, shipping_discount__gte=0, grand_total__gte=0), name='orders_amounts_nonnegative'),
            models.CheckConstraint(condition=Q(discount_total__lte=F('subtotal')), name='orders_discount_limit'),
            models.CheckConstraint(condition=Q(shipping_discount__lte=F('shipping_fee')), name='orders_shipping_discount_limit'),
            models.CheckConstraint(condition=Q(grand_total=F('subtotal') - F('discount_total') + F('shipping_fee') - F('shipping_discount')), name='orders_total_correct'),
        ]

    def __str__(self):
        return self.order_number


class OrderAddress(models.Model):
    """Delivery snapshot; editing the user's address does not change an order."""
    order = models.OneToOneField(Order, on_delete=models.PROTECT, related_name='delivery_address')
    recipient_name = models.CharField(max_length=150)
    phone = models.CharField(max_length=20)
    address_line = models.CharField(max_length=300)
    ward = models.CharField(max_length=150)
    province = models.CharField(max_length=150)
    country_code = models.CharField(max_length=2, default='VN')

    class Meta:
        db_table = 'order_addresses'
        constraints = [models.CheckConstraint(condition=Q(country_code='VN'), name='order_addresses_country_vn')]


class OrderItem(models.Model):
    order = models.ForeignKey(Order, on_delete=models.PROTECT, related_name='items')
    variant = models.ForeignKey('catalog.ProductVariant', on_delete=models.PROTECT, related_name='order_items')
    product_name_snapshot = models.CharField(max_length=200)
    sku_snapshot = models.CharField(max_length=64)
    options_snapshot = models.JSONField(default=dict, blank=True, validators=[validate_json_object])
    quantity = models.PositiveIntegerField(validators=[MinValueValidator(1), MaxValueValidator(99)])
    unit_price = models.DecimalField(max_digits=14, decimal_places=0, validators=[MinValueValidator(0)])
    line_total = models.DecimalField(max_digits=16, decimal_places=0)

    class Meta:
        db_table = 'order_items'
        constraints = [
            models.UniqueConstraint(fields=['order', 'variant'], name='order_items_order_variant_uq'),
            models.UniqueConstraint(fields=['id', 'order'], name='order_items_id_order_uq'),
            models.CheckConstraint(condition=Q(quantity__gte=1, quantity__lte=99), name='order_items_quantity_range'),
            models.CheckConstraint(condition=Q(unit_price__gte=0), name='order_items_price_nonnegative'),
            models.CheckConstraint(condition=Q(line_total=F('quantity') * F('unit_price')), name='order_items_total_correct'),
            json_object_constraint('options_snapshot', 'order_items_options_object'),
        ]


class OrderStatusHistory(models.Model):
    order = models.ForeignKey(Order, on_delete=models.PROTECT, related_name='status_history')
    from_status = models.CharField(max_length=20, choices=OrderStatus.choices, null=True, blank=True)
    to_status = models.CharField(max_length=20, choices=OrderStatus.choices)
    actor = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name='order_status_changes', null=True, blank=True)
    reason = models.CharField(max_length=300, blank=True, default='')
    created_at = models.DateTimeField(default=timezone.now, editable=False)

    class Meta:
        db_table = 'order_status_history'
        indexes = [models.Index(fields=['order', 'created_at', 'id'], name='order_history_order_time_idx')]
        constraints = [
            models.CheckConstraint(condition=Q(from_status__isnull=True) | Q(from_status__in=OrderStatus.values), name='order_history_from_valid'),
            models.CheckConstraint(condition=Q(to_status__in=OrderStatus.values), name='order_history_to_valid'),
        ]
