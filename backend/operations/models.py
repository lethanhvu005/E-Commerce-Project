import uuid

from django.conf import settings
from django.db import models
from django.db.models import Q
from django.utils import timezone

from common.constraints import json_object_constraint, validate_json_object


class AuditLog(models.Model):
    actor = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name='audit_logs', null=True, blank=True)
    action = models.CharField(max_length=80)
    entity_type = models.CharField(max_length=80)
    entity_id = models.CharField(max_length=80)
    request_id = models.UUIDField(default=uuid.uuid4)
    changes = models.JSONField(default=dict, blank=True, validators=[validate_json_object])
    created_at = models.DateTimeField(default=timezone.now, editable=False)

    class Meta:
        db_table = 'audit_logs'
        indexes = [
            models.Index(fields=['entity_type', 'entity_id', '-created_at'], name='audit_entity_time_idx'),
            models.Index(fields=['actor', '-created_at'], name='audit_actor_time_idx'),
        ]
        constraints = [json_object_constraint('changes', 'audit_changes_object')]


class OutboxEvent(models.Model):
    class Status(models.TextChoices):
        PENDING = 'pending', 'Pending'
        PROCESSING = 'processing', 'Processing'
        SENT = 'sent', 'Sent'
        FAILED = 'failed', 'Failed'

    event_key = models.UUIDField(default=uuid.uuid4, unique=True)
    topic = models.CharField(max_length=100)
    aggregate_id = models.CharField(max_length=100)
    payload = models.JSONField()
    status = models.CharField(max_length=12, choices=Status.choices, default=Status.PENDING)
    attempts = models.PositiveIntegerField(default=0)
    available_at = models.DateTimeField(default=timezone.now)
    locked_at = models.DateTimeField(null=True, blank=True)
    processed_at = models.DateTimeField(null=True, blank=True)
    last_error_code = models.CharField(max_length=100, null=True, blank=True)
    created_at = models.DateTimeField(default=timezone.now, editable=False)

    class Meta:
        db_table = 'outbox_events'
        indexes = [
            models.Index(fields=['available_at', 'id'], condition=Q(status='pending'), name='outbox_pending_idx'),
            models.Index(fields=['locked_at'], condition=Q(status='processing'), name='outbox_processing_idx'),
        ]
        constraints = [models.CheckConstraint(condition=Q(status__in=['pending', 'processing', 'sent', 'failed']), name='outbox_status_valid')]
