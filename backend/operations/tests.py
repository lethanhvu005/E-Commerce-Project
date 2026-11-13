from django.db import IntegrityError, transaction
from django.contrib.auth.models import Permission
from django.test import TestCase
from rest_framework import status
from rest_framework.test import APITestCase
from rest_framework_simplejwt.tokens import RefreshToken

from accounts.models import User
from .models import AuditLog, OutboxEvent


class OperationsModelTests(TestCase):
    def test_audit_json_and_event_defaults(self):
        with self.assertRaises(IntegrityError), transaction.atomic():
            AuditLog.objects.create(action='test', entity_type='Product', entity_id='1', changes=[])
        event = OutboxEvent.objects.create(topic='order.created', aggregate_id='1', payload={'order': 1})
        self.assertEqual(event.status, 'pending')
        self.assertEqual(event.attempts, 0)
        self.assertIsNotNone(event.event_key)


class AdminDashboardApiTests(APITestCase):
    def authenticate(self, user):
        token = RefreshToken.for_user(user)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {token.access_token}")

    def test_customer_cannot_access_dashboard(self):
        user = User.objects.create_user("customer@example.test", "Customer!Password123")
        self.authenticate(user)
        response = self.client.get("/api/admin/dashboard/")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_staff_needs_all_dashboard_permissions(self):
        staff = User.objects.create_user("staff@example.test", "Staff!Password123", is_staff=True)
        self.authenticate(staff)
        self.assertEqual(self.client.get("/api/admin/dashboard/").status_code, status.HTTP_403_FORBIDDEN)

        permissions = Permission.objects.filter(
            codename__in=["view_order", "view_product", "view_inventorybalance", "view_user"]
        )
        staff.user_permissions.set(permissions)
        response = self.client.get("/api/admin/dashboard/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("revenue_definition", response.data)
        self.assertIn("recent_orders", response.data)
