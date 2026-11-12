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
