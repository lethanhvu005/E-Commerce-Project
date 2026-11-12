import uuid

from django.conf import settings
from django.core.validators import MinValueValidator
from django.db import models
from django.db.models import F, Q
from django.utils import timezone


class InventoryBalance(models.Model):
    variant = models.OneToOneField('catalog.ProductVariant', on_delete=models.PROTECT, related_name='inventory')
    on_hand = models.PositiveIntegerField(default=0)
    reserved = models.PositiveIntegerField(default=0)
    low_stock_threshold = models.PositiveIntegerField(default=5)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'inventory_balances'
        constraints = [models.CheckConstraint(condition=Q(reserved__lte=F('on_hand')), name='inventory_reserved_limit')]

    @property
    def available(self):
        return self.on_hand - self.reserved


class InventoryReservation(models.Model):
    class Status(models.TextChoices):
        ACTIVE = 'active', 'Active'
        CONSUMED = 'consumed', 'Consumed'
        RELEASED = 'released', 'Released'
        EXPIRED = 'expired', 'Expired'

    order = models.ForeignKey('orders.Order', on_delete=models.PROTECT, related_name='reservations')
    variant = models.ForeignKey('catalog.ProductVariant', on_delete=models.PROTECT, related_name='reservations')
    quantity = models.PositiveIntegerField(validators=[MinValueValidator(1)])
    status = models.CharField(max_length=12, choices=Status.choices, default=Status.ACTIVE)
    expires_at = models.DateTimeField()
    closed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(default=timezone.now, editable=False)

    class Meta:
        db_table = 'inventory_reservations'
        indexes = [models.Index(fields=['expires_at'], condition=Q(status='active'), name='reservations_due_idx')]
        constraints = [
            models.UniqueConstraint(fields=['order', 'variant'], name='reservations_order_variant_uq'),
            models.CheckConstraint(condition=Q(quantity__gt=0), name='reservations_quantity_positive'),
            models.CheckConstraint(condition=Q(status__in=['active', 'consumed', 'released', 'expired']), name='reservations_status_valid'),
            models.CheckConstraint(condition=Q(expires_at__gt=F('created_at')), name='reservations_expiry_valid'),
            models.CheckConstraint(condition=Q(status='active', closed_at__isnull=True) | (~Q(status='active') & Q(closed_at__isnull=False)), name='reservations_closed_valid'),
        ]


class InventoryMovement(models.Model):
    class Kind(models.TextChoices):
        RECEIPT = 'receipt', 'Receipt'
        ADJUSTMENT = 'adjustment', 'Adjustment'
        SALE = 'sale', 'Sale'
        RETURN = 'return', 'Return'

    variant = models.ForeignKey('catalog.ProductVariant', on_delete=models.PROTECT, related_name='stock_movements')
    order = models.ForeignKey('orders.Order', on_delete=models.PROTECT, related_name='stock_movements', null=True, blank=True)
    actor = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name='stock_movements', null=True, blank=True)
    event_key = models.UUIDField(default=uuid.uuid4, unique=True)
    kind = models.CharField(max_length=12, choices=Kind.choices)
    quantity_delta = models.IntegerField()
    reason = models.CharField(max_length=300)
    created_at = models.DateTimeField(default=timezone.now, editable=False)

    class Meta:
        db_table = 'inventory_movements'
        indexes = [models.Index(fields=['variant', '-created_at', '-id'], name='movements_variant_time_idx')]
        constraints = [
            models.CheckConstraint(condition=~Q(quantity_delta=0), name='movements_delta_nonzero'),
            models.CheckConstraint(condition=Q(kind__in=['receipt', 'return'], quantity_delta__gt=0) | Q(kind='sale', quantity_delta__lt=0) | Q(kind='adjustment'), name='movements_kind_delta_valid'),
            models.CheckConstraint(condition=~Q(kind='sale') | Q(order__isnull=False), name='movements_sale_requires_order'),
            models.UniqueConstraint(fields=['order', 'variant'], condition=Q(kind='sale'), name='inventory_sale_once_uq'),
        ]
