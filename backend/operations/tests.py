from django.db import IntegrityError, transaction
from django.test import TestCase
from .models import AuditLog, OutboxEvent


class OperationsModelTests(TestCase):
    def test_audit_json_and_event_defaults(self):
        with self.assertRaises(IntegrityError), transaction.atomic():
            AuditLog.objects.create(action='test', entity_type='Product', entity_id='1', changes=[])
        event = OutboxEvent.objects.create(topic='order.created', aggregate_id='1', payload={'order': 1})
        self.assertEqual(event.status, 'pending')
        self.assertEqual(event.attempts, 0)
        self.assertIsNotNone(event.event_key)
