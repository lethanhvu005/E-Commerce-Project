from django.conf import settings
from django.core.exceptions import ValidationError
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models
from django.db.models import Q
from django.utils import timezone

from common.constraints import trimmed_length_constraint
from common.models import TimestampedModel


class ModerationStatus(models.TextChoices):
    PENDING = 'pending', 'Pending'
    PUBLISHED = 'published', 'Published'
    REJECTED = 'rejected', 'Rejected'


class Review(TimestampedModel):
    product = models.ForeignKey('catalog.Product', on_delete=models.PROTECT, related_name='reviews')
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name='reviews')
    order_item = models.OneToOneField('orders.OrderItem', on_delete=models.PROTECT, related_name='review', null=True, blank=True)
    stars = models.SmallIntegerField(validators=[MinValueValidator(1), MaxValueValidator(5)])
    body = models.CharField(max_length=2000)
    status = models.CharField(max_length=12, choices=ModerationStatus.choices, default=ModerationStatus.PENDING)

    class Meta:
        db_table = 'reviews'
        indexes = [models.Index(fields=['product', '-created_at', '-id'], condition=Q(status='published'), name='reviews_public_product_idx')]
        constraints = [
            models.UniqueConstraint(fields=['user', 'product'], name='reviews_user_product_uq'),
            models.CheckConstraint(condition=Q(stars__gte=1, stars__lte=5), name='reviews_stars_range'),
            models.CheckConstraint(condition=Q(status__in=ModerationStatus.values), name='reviews_status_valid'),
            trimmed_length_constraint('body', 10, 'reviews_body_length'),
        ]

    @property
    def is_verified_buyer(self):
        if not self.order_item_id:
            return False
        item = self.order_item
        return (
            item.order.user_id == self.user_id
            and item.variant.product_id == self.product_id
            and item.order.status == 'delivered'
        )

    def clean(self):
        super().clean()
        if self.order_item_id and not self.is_verified_buyer:
            raise ValidationError({'order_item': 'Choose an item from your delivered order for this product.'})


class ReviewReply(models.Model):
    review = models.ForeignKey(Review, on_delete=models.PROTECT, related_name="replies")
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="review_replies")
    body = models.CharField(max_length=1000)
    status = models.CharField(max_length=12, choices=ModerationStatus.choices, default=ModerationStatus.PENDING)
    created_at = models.DateTimeField(default=timezone.now, editable=False)

    class Meta:
        db_table = "review_replies"
        indexes = [models.Index(fields=["review", "created_at", "id"], name="review_replies_thread_idx")]
        constraints = [
            models.CheckConstraint(condition=Q(status__in=ModerationStatus.values), name="review_replies_status_valid"),
            trimmed_length_constraint("body", 2, "review_replies_body_length"),
        ]


class ProductQuestion(models.Model):
    product = models.ForeignKey('catalog.Product', on_delete=models.PROTECT, related_name='questions')
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name='product_questions')
    body = models.CharField(max_length=2000)
    status = models.CharField(max_length=12, choices=ModerationStatus.choices, default=ModerationStatus.PENDING)
    created_at = models.DateTimeField(default=timezone.now, editable=False)

    class Meta:
        db_table = 'product_questions'
        indexes = [models.Index(fields=['product', '-created_at'], name='questions_product_idx')]
        constraints = [
            models.CheckConstraint(condition=Q(status__in=ModerationStatus.values), name='questions_status_valid'),
            trimmed_length_constraint('body', 5, 'questions_body_length'),
        ]


class ProductAnswer(models.Model):
    question = models.ForeignKey(ProductQuestion, on_delete=models.PROTECT, related_name='answers')
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name='product_answers')
    body = models.CharField(max_length=2000)
    status = models.CharField(max_length=12, choices=ModerationStatus.choices, default=ModerationStatus.PENDING)
    created_at = models.DateTimeField(default=timezone.now, editable=False)

    class Meta:
        db_table = 'product_answers'
        indexes = [models.Index(fields=['question', 'created_at'], name='answers_question_idx')]
        constraints = [
            models.CheckConstraint(condition=Q(status__in=ModerationStatus.values), name='answers_status_valid'),
            trimmed_length_constraint('body', 5, 'answers_body_length'),
        ]
