from datetime import timedelta
from django.db import IntegrityError, transaction
from django.test import TestCase
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase
from rest_framework_simplejwt.tokens import RefreshToken
from accounts.models import User
from common.test_factories import catalog
from inventory.models import InventoryBalance
from .models import Cart, CartItem


class CartModelTests(TestCase):
    def test_owner_and_guest_expiry(self):
        with self.assertRaises(IntegrityError), transaction.atomic():
            Cart.objects.create()
        with self.assertRaises(IntegrityError), transaction.atomic():
            Cart.objects.create(guest_token_hash='a' * 64)
        guest = Cart.objects.create(guest_token_hash='a' * 64, expires_at=timezone.now() + timedelta(days=1))
        guest.full_clean()
        self.assertIsNotNone(guest.public_id)

    def test_one_active_cart_and_quantity(self):
        user = User.objects.create_user('buyer@example.test')
        cart = Cart.objects.create(user=user)
        with self.assertRaises(IntegrityError), transaction.atomic():
            Cart.objects.create(user=user)
        _, variant = catalog()
        with self.assertRaises(IntegrityError), transaction.atomic():
            CartItem.objects.create(cart=cart, variant=variant, quantity=100)


class CartApiTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user("buyer@example.test", "Buyer!Password123")
        token = RefreshToken.for_user(self.user)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {token.access_token}")
        self.product, self.variant = catalog()
        self.product.status = "active"
        self.product.save(update_fields=["status"])
        InventoryBalance.objects.create(variant=self.variant, on_hand=5)

    def test_add_update_and_delete_cart_item(self):
        added = self.client.post(
            "/api/cart/items/", {"variant_id": self.variant.id, "quantity": 2, "price": 1}, format="json"
        )
        self.assertEqual(added.status_code, status.HTTP_200_OK)
        self.assertEqual(added.data["subtotal"], 200)
        item_id = added.data["items"][0]["id"]

        updated = self.client.patch(f"/api/cart/items/{item_id}/", {"quantity": 3}, format="json")
        self.assertEqual(updated.data["total"], 300)

        deleted = self.client.delete(f"/api/cart/items/{item_id}/")
        self.assertEqual(deleted.status_code, status.HTTP_200_OK)
        self.assertEqual(deleted.data["items"], [])

    def test_cart_requires_authentication_and_enforces_stock(self):
        self.client.credentials()
        self.assertEqual(self.client.get("/api/cart/").status_code, status.HTTP_401_UNAUTHORIZED)
        token = RefreshToken.for_user(self.user)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {token.access_token}")
        response = self.client.post(
            "/api/cart/items/", {"variant_id": self.variant.id, "quantity": 6}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
