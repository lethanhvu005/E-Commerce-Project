from datetime import timedelta
from django.db import IntegrityError, transaction
from django.test import TestCase
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase
from rest_framework_simplejwt.tokens import RefreshToken
from accounts.models import User
from common.test_factories import catalog, order
from .models import InventoryBalance, InventoryMovement, InventoryReservation


class InventoryModelTests(TestCase):
    def test_available_and_over_reservation(self):
        _, variant = catalog()
        stock = InventoryBalance.objects.create(variant=variant, on_hand=10, reserved=3)
        self.assertEqual(stock.available, 7)
        with self.assertRaises(IntegrityError), transaction.atomic():
            InventoryBalance.objects.filter(pk=stock.pk).update(reserved=11)

    def test_reservation_and_sale_rules(self):
        _, variant = catalog()
        purchase = order()
        with self.assertRaises(IntegrityError), transaction.atomic():
            InventoryReservation.objects.create(order=purchase, variant=variant, quantity=1, status='released', expires_at=timezone.now() + timedelta(hours=1))
        with self.assertRaises(IntegrityError), transaction.atomic():
            InventoryMovement.objects.create(variant=variant, kind='sale', quantity_delta=-1, reason='Missing order')


class InventoryAdminApiTests(APITestCase):
    def test_staff_adjustment_is_idempotent_and_audited(self):
        import uuid
        admin = User.objects.create_superuser("admin@example.test", "Admin!Password123")
        token = RefreshToken.for_user(admin)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {token.access_token}")
        _, variant = catalog()
        event_key = uuid.uuid4()
        payload = {"variant_id": variant.id, "quantity_delta": 5, "reason": "Nhập kho", "event_key": str(event_key)}
        first = self.client.post("/api/admin/inventory/", payload, format="json")
        second = self.client.post("/api/admin/inventory/", payload, format="json")
        self.assertEqual(first.status_code, status.HTTP_201_CREATED)
        self.assertEqual(second.status_code, status.HTTP_200_OK)
        self.assertEqual(InventoryBalance.objects.get(variant=variant).on_hand, 5)
        self.assertEqual(InventoryMovement.objects.filter(event_key=event_key).count(), 1)
        self.assertEqual(self.client.get("/api/admin/audit-logs/").status_code, status.HTTP_200_OK)
