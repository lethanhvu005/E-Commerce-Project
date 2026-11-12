from django.conf import settings
from django.core.exceptions import ValidationError
from django.core.validators import MinValueValidator
from django.db import models
from django.db.models import F, Q
from django.db.models.functions import Trim, Upper

from common.models import TimestampedModel


class Voucher(models.Model):
    class Kind(models.TextChoices):
        PERCENT = 'percent', 'Percentage'
        FIXED = 'fixed', 'Fixed amount'
        FREE_SHIP = 'free_ship', 'Free shipping'

    code = models.CharField(max_length=40, unique=True)
    kind = models.CharField(max_length=12, choices=Kind.choices)
    value = models.DecimalField(max_digits=14, decimal_places=0)
    max_discount = models.DecimalField(max_digits=14, decimal_places=0, null=True, blank=True, validators=[MinValueValidator(0)])
    min_subtotal = models.DecimalField(max_digits=14, decimal_places=0, default=0, validators=[MinValueValidator(0)])
    usage_limit = models.PositiveIntegerField(null=True, blank=True, validators=[MinValueValidator(1)])
    per_user_limit = models.PositiveIntegerField(default=1, validators=[MinValueValidator(1)])
    starts_at = models.DateTimeField()
    ends_at = models.DateTimeField()
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = 'vouchers'
        constraints = [
            models.CheckConstraint(condition=Q(code=Upper(Trim('code'))) & ~Q(code=''), name='vouchers_code_normalized'),
            models.CheckConstraint(condition=Q(ends_at__gt=F('starts_at')), name='vouchers_date_range'),
            models.CheckConstraint(condition=Q(kind='percent', value__gte=1, value__lte=100) | Q(kind='fixed', value__gt=0) | Q(kind='free_ship', value=0), name='vouchers_kind_value_valid'),
            models.CheckConstraint(condition=Q(max_discount__isnull=True) | Q(max_discount__gte=0), name='vouchers_max_discount_valid'),
            models.CheckConstraint(condition=Q(min_subtotal__gte=0), name='vouchers_min_subtotal_valid'),
            models.CheckConstraint(condition=Q(usage_limit__isnull=True) | Q(usage_limit__gt=0), name='vouchers_usage_limit_valid'),
            models.CheckConstraint(condition=Q(per_user_limit__gt=0), name='vouchers_per_user_limit_valid'),
        ]

    def __str__(self):
        return self.code


class VoucherRedemption(TimestampedModel):
    class Status(models.TextChoices):
        RESERVED = 'reserved', 'Reserved'
        USED = 'used', 'Used'
        RELEASED = 'released', 'Released'

    voucher = models.ForeignKey(Voucher, on_delete=models.PROTECT, related_name='redemptions')
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name='voucher_redemptions')
    order = models.OneToOneField('orders.Order', on_delete=models.PROTECT, related_name='voucher_redemption')
    status = models.CharField(max_length=12, choices=Status.choices, default=Status.RESERVED)
    discount_amount = models.DecimalField(max_digits=14, decimal_places=0, validators=[MinValueValidator(0)])

    class Meta:
        db_table = 'voucher_redemptions'
        indexes = [models.Index(fields=['voucher', 'user', 'status'], name='voucher_redemptions_count_idx')]
        constraints = [
            models.CheckConstraint(condition=Q(status__in=['reserved', 'used', 'released']), name='redemptions_status_valid'),
            models.CheckConstraint(condition=Q(discount_amount__gte=0), name='redemptions_discount_valid'),
        ]

    def clean(self):
        super().clean()
        if self.order_id and self.user_id and self.order.user_id != self.user_id:
            raise ValidationError({'user': 'The user must own this order.'})
