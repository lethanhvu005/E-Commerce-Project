import uuid

from django.core.validators import MinValueValidator
from django.db import models
from django.db.models import Q
from django.utils import timezone


class Payment(models.Model):
    class Provider(models.TextChoices):
        COD = 'cod', 'Cash on delivery'
        VNPAY = 'vnpay', 'VNPay'
        MOMO = 'momo', 'MoMo'

    class Status(models.TextChoices):
        PENDING = 'pending', 'Pending'
        SUCCEEDED = 'succeeded', 'Succeeded'
        FAILED = 'failed', 'Failed'
        CANCELLED = 'cancelled', 'Cancelled'
        REFUNDED = 'refunded', 'Refunded'

    public_id = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)
    order = models.ForeignKey('orders.Order', on_delete=models.PROTECT, related_name='payments')
    provider = models.CharField(max_length=12, choices=Provider.choices)
    status = models.CharField(max_length=12, choices=Status.choices, default=Status.PENDING)
    amount = models.DecimalField(max_digits=14, decimal_places=0, validators=[MinValueValidator(0)])
    currency = models.CharField(max_length=3, default='VND')
    provider_reference = models.CharField(max_length=150, null=True, blank=True)
    idempotency_key = models.UUIDField(default=uuid.uuid4, unique=True)
    paid_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(default=timezone.now, editable=False)

    class Meta:
        db_table = 'payments'
        indexes = [models.Index(fields=['order', '-created_at'], name='payments_order_time_idx')]
        constraints = [
            models.CheckConstraint(condition=Q(provider__in=['cod', 'vnpay', 'momo']), name='payments_provider_valid'),
            models.CheckConstraint(condition=Q(status__in=['pending', 'succeeded', 'failed', 'cancelled', 'refunded']), name='payments_status_valid'),
            models.CheckConstraint(condition=Q(amount__gte=0), name='payments_amount_nonnegative'),
            models.CheckConstraint(condition=Q(currency='VND'), name='payments_currency_vnd'),
            models.CheckConstraint(condition=~Q(status__in=['succeeded', 'refunded']) | Q(paid_at__isnull=False), name='payments_paid_at_required'),
            models.UniqueConstraint(fields=['provider', 'provider_reference'], condition=Q(provider_reference__isnull=False), name='payments_provider_ref_uq'),
            models.UniqueConstraint(fields=['order'], condition=Q(status__in=['succeeded', 'refunded']), name='payments_one_success_uq'),
            models.UniqueConstraint(fields=['order'], condition=Q(status='pending'), name='payments_one_pending_uq'),
        ]

    def __str__(self):
        return str(self.public_id)
