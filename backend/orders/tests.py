from django.db import IntegrityError, transaction
from django.test import TestCase
from rest_framework import status
from rest_framework.test import APITestCase
from rest_framework_simplejwt.tokens import RefreshToken
from accounts.models import Address, User
from carts.models import Cart, CartItem
from common.test_factories import catalog, order
from inventory.models import InventoryBalance
from .models import Order, OrderItem
from .models import ShippingMethod


class OrderModelTests(TestCase):
    def test_total_and_snapshot(self):
        purchase = order()
        purchase.full_clean()
        with self.assertRaises(IntegrityError), transaction.atomic():
            Order.objects.filter(pk=purchase.pk).update(grand_total=99)
        purchase.user.email = 'changed@example.test'
        purchase.user.save()
        purchase.refresh_from_db()
        self.assertEqual(purchase.contact_email_snapshot, 'buyer@example.test')

    def test_line_total(self):
        purchase = order()
        _, variant = catalog()
        with self.assertRaises(IntegrityError), transaction.atomic():
            OrderItem.objects.create(order=purchase, variant=variant, product_name_snapshot='KB', sku_snapshot=variant.sku, quantity=2, unit_price=100, line_total=100)


class OrderApiTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user("checkout@example.test", "Buyer!Password123")
        token = RefreshToken.for_user(self.user)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {token.access_token}")
        self.address = Address.objects.create(
            user=self.user, recipient_name="Buyer", phone="0900000000",
            address_line="1 Main Street", ward="Ward 1", province="Da Nang",
        )
        self.shipping = ShippingMethod.objects.create(
            code="standard", name="Standard", base_fee=20, min_days=2, max_days=4,
        )
        self.product, self.variant = catalog()
        self.product.status = "active"
        self.product.save(update_fields=["status"])
        InventoryBalance.objects.create(variant=self.variant, on_hand=5)
        cart = Cart.objects.create(user=self.user)
        CartItem.objects.create(cart=cart, variant=self.variant, quantity=2)

    def payload(self, checkout_key=None):
        import uuid
        return {
            "address_id": self.address.id,
            "shipping_method_id": self.shipping.id,
            "checkout_key": str(checkout_key or uuid.uuid4()),
            "note": "Giao giờ hành chính",
            "grand_total": 1,
        }

    def test_preview_and_create_order_use_server_totals(self):
        payload = self.payload()
        preview = self.client.post("/api/checkout/preview/", payload, format="json")
        self.assertEqual(preview.status_code, status.HTTP_200_OK)
        self.assertEqual(preview.data["grand_total"], 220)

        created = self.client.post("/api/orders/", payload, format="json")
        self.assertEqual(created.status_code, status.HTTP_201_CREATED)
        self.assertEqual(created.data["grand_total"], "220")
        order = Order.objects.get(public_id=created.data["public_id"])
        self.assertEqual(order.payments.get().amount, 220)
        self.assertEqual(order.reservations.get().quantity, 2)

        replay = self.client.post("/api/orders/", payload, format="json")
        self.assertEqual(replay.status_code, status.HTTP_200_OK)
        self.assertEqual(Order.objects.count(), 1)

    def test_cancel_releases_inventory_reservation(self):
        created = self.client.post("/api/orders/", self.payload(), format="json")
        response = self.client.post(
            f"/api/orders/{created.data['public_id']}/cancel/",
            {"reason": "Đổi ý"}, format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["status"], "cancelled")
        balance = InventoryBalance.objects.get(variant=self.variant)
        self.assertEqual(balance.reserved, 0)
