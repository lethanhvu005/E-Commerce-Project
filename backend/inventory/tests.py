from datetime import timedelta
from django.db import IntegrityError, transaction
from concurrent.futures import ThreadPoolExecutor

from django.db import close_old_connections
from django.test import TestCase, TransactionTestCase
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient, APITestCase
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

    def test_reused_event_key_with_different_payload_is_conflict(self):
        import uuid
        admin = User.objects.create_superuser("admin-conflict@example.test", "Admin!Password123")
        token = RefreshToken.for_user(admin)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {token.access_token}")
        _, variant = catalog()
        event_key = uuid.uuid4()
        original = {"variant_id": variant.id, "quantity_delta": 5, "reason": "stock receipt", "event_key": str(event_key)}
        changed = {**original, "quantity_delta": 7}

        self.assertEqual(self.client.post("/api/admin/inventory/", original, format="json").status_code, status.HTTP_201_CREATED)
        response = self.client.post("/api/admin/inventory/", changed, format="json")

        self.assertEqual(response.status_code, status.HTTP_409_CONFLICT)
        self.assertEqual(InventoryBalance.objects.get(variant=variant).on_hand, 5)
        self.assertEqual(InventoryMovement.objects.filter(event_key=event_key).count(), 1)


class ConcurrentInventoryAdjustmentTests(TransactionTestCase):
    reset_sequences = True

    def test_same_event_key_concurrently_changes_stock_once(self):
        import uuid
        admin = User.objects.create_superuser("admin-concurrent@example.test", "Admin!Password123")
        token = str(RefreshToken.for_user(admin).access_token)
        _, variant = catalog()
        event_key = uuid.uuid4()
        payload = {"variant_id": variant.id, "quantity_delta": 5, "reason": "concurrent receipt", "event_key": str(event_key)}

        def submit(_):
            close_old_connections()
            try:
                client = APIClient()
                client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")
                return client.post("/api/admin/inventory/", payload, format="json").status_code
            finally:
                close_old_connections()

        with ThreadPoolExecutor(max_workers=2) as pool:
            statuses = sorted(pool.map(submit, range(2)))

        self.assertEqual(statuses, [status.HTTP_200_OK, status.HTTP_201_CREATED])
        self.assertEqual(InventoryBalance.objects.get(variant=variant).on_hand, 5)
        self.assertEqual(InventoryMovement.objects.filter(event_key=event_key).count(), 1)

    def test_two_staff_adjust_same_variant_without_lost_update(self):
        import uuid
        first_admin = User.objects.create_superuser("stock-a@example.test", "Admin!Password123")
        second_admin = User.objects.create_superuser("stock-b@example.test", "Admin!Password123")
        tokens = [
            str(RefreshToken.for_user(first_admin).access_token),
            str(RefreshToken.for_user(second_admin).access_token),
        ]
        _, variant = catalog()

        def submit(index):
            close_old_connections()
            try:
                client = APIClient()
                client.credentials(HTTP_AUTHORIZATION=f"Bearer {tokens[index]}")
                return client.post(
                    "/api/admin/inventory/",
                    {"variant_id": variant.id, "quantity_delta": 5, "reason": f"receipt {index}", "event_key": str(uuid.uuid4())},
                    format="json",
                ).status_code
            finally:
                close_old_connections()

        with ThreadPoolExecutor(max_workers=2) as pool:
            statuses = sorted(pool.map(submit, range(2)))

        self.assertEqual(statuses, [status.HTTP_201_CREATED, status.HTTP_201_CREATED])
        self.assertEqual(InventoryBalance.objects.get(variant=variant).on_hand, 10)
        self.assertEqual(InventoryMovement.objects.filter(variant=variant).count(), 2)
