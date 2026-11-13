from django.core.exceptions import ValidationError
from django.db import IntegrityError, transaction
from django.test import TestCase
from django.utils import timezone
from datetime import timedelta
from rest_framework import status
from rest_framework.test import APITestCase
from rest_framework_simplejwt.tokens import RefreshToken
from accounts.models import User
from common.test_factories import order, voucher
from .models import Voucher, VoucherRedemption
from carts.models import Cart, CartItem
from inventory.models import InventoryBalance
from common.test_factories import catalog


class PromotionModelTests(TestCase):
    def test_percent_limits(self):
        discount = voucher()
        discount.full_clean()
        with self.assertRaises(IntegrityError), transaction.atomic():
            Voucher.objects.filter(pk=discount.pk).update(value=101)

    def test_redemption_owner_in_model_and_database(self):
        purchase = order()
        another = User.objects.create_user('other@example.test')
        redemption = VoucherRedemption(voucher=voucher(), user=another, order=purchase, discount_amount=10)
        with self.assertRaises(ValidationError):
            redemption.full_clean()
        with self.assertRaises(IntegrityError), transaction.atomic():
            redemption.save()


class VoucherApiTests(APITestCase):
    def test_apply_voucher_recalculates_server_total(self):
        user = User.objects.create_user("promo@example.test", "Buyer!Password123")
        token = RefreshToken.for_user(user)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {token.access_token}")
        product, variant = catalog()
        product.status = "active"
        product.save(update_fields=["status"])
        InventoryBalance.objects.create(variant=variant, on_hand=5)
        cart = Cart.objects.create(user=user)
        CartItem.objects.create(cart=cart, variant=variant, quantity=2)
        Voucher.objects.create(
            code="SAVE10", kind="percent", value=10,
            starts_at=timezone.now() - timedelta(hours=1),
            ends_at=timezone.now() + timedelta(days=1),
        )

        response = self.client.post("/api/cart/voucher/", {"code": "save10"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["discount_total"], 20)
        self.assertEqual(response.data["total"], 180)

    def test_voucher_usage_limit_and_per_user_limit_enforced(self):
        user = User.objects.create_user("limit-user@example.test", "Buyer!Password123")
        other = User.objects.create_user("other-user@example.test", "Buyer!Password123")
        token = RefreshToken.for_user(user)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {token.access_token}")

        product, variant = catalog()
        product.status = "active"
        product.save(update_fields=["status"])
        InventoryBalance.objects.create(variant=variant, on_hand=10)

        limited_voucher = Voucher.objects.create(
            code="LIMIT1",
            kind="fixed",
            value=10,
            usage_limit=1,
            per_user_limit=1,
            starts_at=timezone.now() - timedelta(hours=1),
            ends_at=timezone.now() + timedelta(days=1),
        )
        existing_order = order()
        VoucherRedemption.objects.create(
            voucher=limited_voucher,
            user=existing_order.user,
            order=existing_order,
            discount_amount=10,
        )

        user_order = order(user=user)
        user_order.source_cart.status = Cart.Status.CONVERTED
        user_order.source_cart.save(update_fields=["status"])
        cart = Cart.objects.create(user=user)
        CartItem.objects.create(cart=cart, variant=variant, quantity=2)

        res = self.client.post("/api/cart/voucher/", {"code": "LIMIT1"}, format="json")
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("code", res.data)

        limited_voucher.usage_limit = 5
        limited_voucher.save(update_fields=["usage_limit"])
        VoucherRedemption.objects.create(
            voucher=limited_voucher,
            user=user,
            order=user_order,
            discount_amount=10,
        )
        res_per_user = self.client.post("/api/cart/voucher/", {"code": "LIMIT1"}, format="json")
        self.assertEqual(res_per_user.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("code", res_per_user.data)

        other_token = RefreshToken.for_user(other)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {other_token.access_token}")
        other_cart = Cart.objects.create(user=other)
        CartItem.objects.create(cart=other_cart, variant=variant, quantity=2)
        res_other = self.client.post("/api/cart/voucher/", {"code": "LIMIT1"}, format="json")
        self.assertEqual(res_other.status_code, status.HTTP_200_OK)

        limited_voucher.is_active = False
        limited_voucher.save(update_fields=["is_active"])
        cart_res = self.client.get("/api/cart/")
        self.assertEqual(cart_res.status_code, status.HTTP_200_OK)
        self.assertIsNone(cart_res.data["voucher_code"])
        self.assertIn("voucher_error", cart_res.data)
