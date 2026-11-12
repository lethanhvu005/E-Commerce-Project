import uuid

from django.conf import settings
from django.core.validators import MaxValueValidator, MinValueValidator, RegexValidator
from django.db import models
from django.db.models import Q

from common.models import TimestampedModel


class Cart(TimestampedModel):
    class Status(models.TextChoices):
        ACTIVE = 'active', 'Active'
        CONVERTED = 'converted', 'Converted'
        MERGED = 'merged', 'Merged'
        EXPIRED = 'expired', 'Expired'

    public_id = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name='carts', null=True, blank=True)
    guest_token_hash = models.CharField(max_length=64, null=True, blank=True, validators=[RegexValidator(r'^[0-9a-f]{64}$')])
    status = models.CharField(max_length=12, choices=Status.choices, default=Status.ACTIVE)
    expires_at = models.DateTimeField(null=True, blank=True)
    voucher = models.ForeignKey('promotions.Voucher', on_delete=models.SET_NULL, related_name='carts', null=True, blank=True)

    class Meta:
        db_table = 'carts'
        indexes = [models.Index(fields=['expires_at'], condition=Q(status='active'), name='carts_expiration_idx')]
        constraints = [
            models.CheckConstraint(condition=(Q(user__isnull=False) & Q(guest_token_hash__isnull=True)) | (Q(user__isnull=True) & Q(guest_token_hash__isnull=False)), name='carts_exactly_one_owner'),
            models.CheckConstraint(condition=Q(guest_token_hash__isnull=True) | Q(guest_token_hash__regex=r'^[0-9a-f]{64}$'), name='carts_guest_hash_valid'),
            models.CheckConstraint(condition=Q(user__isnull=False) | Q(expires_at__isnull=False), name='carts_guest_expiry_required'),
            models.CheckConstraint(condition=Q(status__in=['active', 'converted', 'merged', 'expired']), name='carts_status_valid'),
            models.UniqueConstraint(fields=['user'], condition=Q(user__isnull=False, status='active'), name='carts_active_user_uq'),
            models.UniqueConstraint(fields=['guest_token_hash'], condition=Q(guest_token_hash__isnull=False), name='carts_guest_token_uq'),
        ]

    def __str__(self):
        return str(self.public_id)


class CartItem(TimestampedModel):
    cart = models.ForeignKey(Cart, on_delete=models.CASCADE, related_name='items')
    variant = models.ForeignKey('catalog.ProductVariant', on_delete=models.PROTECT, related_name='cart_items')
    quantity = models.PositiveIntegerField(validators=[MinValueValidator(1), MaxValueValidator(99)])

    class Meta:
        db_table = 'cart_items'
        constraints = [
            models.UniqueConstraint(fields=['cart', 'variant'], name='cart_items_cart_variant_uq'),
            models.CheckConstraint(condition=Q(quantity__gte=1, quantity__lte=99), name='cart_items_quantity_range'),
        ]
