import uuid
from concurrent.futures import ThreadPoolExecutor
from datetime import timedelta
from decimal import Decimal

from django.core.management import call_command
from django.db import close_old_connections
from django.db import IntegrityError, transaction
from django.test import TestCase, TransactionTestCase
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase
from rest_framework_simplejwt.tokens import RefreshToken
from accounts.models import Address, User
from carts.models import Cart, CartItem
from common.test_factories import catalog, order
from inventory.models import InventoryBalance, InventoryReservation
from promotions.models import Voucher, VoucherRedemption
from .models import Order, OrderItem, OrderStatus
from .models import ShippingMethod
from .services import create_order


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

    def test_percent_voucher_fractional_discount_rounds_down_cleanly(self):
        self.variant.price = Decimal("1999999")
        self.variant.save(update_fields=["price"])
        cart = Cart.objects.get(user=self.user, status=Cart.Status.ACTIVE)
        cart.items.update(quantity=1)
        voucher = Voucher.objects.create(
            code="ODD15",
            kind=Voucher.Kind.PERCENT,
            value=Decimal("15"),
            starts_at=timezone.now() - timedelta(hours=1),
            ends_at=timezone.now() + timedelta(days=1),
        )
        cart.voucher = voucher
        cart.save(update_fields=["voucher"])

        preview_res = self.client.post("/api/checkout/preview/", self.payload(), format="json")
        self.assertEqual(preview_res.status_code, status.HTTP_200_OK)
        self.assertEqual(preview_res.data["discount_total"], Decimal("299999"))
        self.assertEqual(preview_res.data["grand_total"], Decimal("1700020"))

        create_res = self.client.post("/api/orders/", self.payload(), format="json")
        self.assertEqual(create_res.status_code, status.HTTP_201_CREATED)
        self.assertEqual(create_res.data["discount_total"], "299999")
        self.assertEqual(create_res.data["grand_total"], "1700020")

    def test_deactivated_product_or_variant_in_cart_is_rejected_at_checkout(self):
        self.variant.is_active = False
        self.variant.save(update_fields=["is_active"])
        res = self.client.post("/api/orders/", self.payload(), format="json")
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("cart", res.data)

    def test_cancel_order_releases_voucher_redemption_for_reuse(self):
        voucher = Voucher.objects.create(
            code="ONCEONLY",
            kind=Voucher.Kind.FIXED,
            value=Decimal("50"),
            usage_limit=1,
            per_user_limit=1,
            starts_at=timezone.now() - timedelta(hours=1),
            ends_at=timezone.now() + timedelta(days=1),
        )
        cart = Cart.objects.get(user=self.user, status=Cart.Status.ACTIVE)
        cart.voucher = voucher
        cart.save(update_fields=["voucher"])

        created = self.client.post("/api/orders/", self.payload(), format="json")
        self.assertEqual(created.status_code, status.HTTP_201_CREATED)
        self.assertEqual(
            VoucherRedemption.objects.get(order__public_id=created.data["public_id"]).status,
            VoucherRedemption.Status.RESERVED,
        )

        cancelled = self.client.post(
            f"/api/orders/{created.data['public_id']}/cancel/",
            {"reason": "Đặt lại"},
            format="json",
        )
        self.assertEqual(cancelled.status_code, status.HTTP_200_OK)
        self.assertEqual(
            VoucherRedemption.objects.get(order__public_id=created.data["public_id"]).status,
            VoucherRedemption.Status.RELEASED,
        )

        new_cart = Cart.objects.create(user=self.user, voucher=voucher)
        CartItem.objects.create(cart=new_cart, variant=self.variant, quantity=1)
        recreated = self.client.post("/api/orders/", self.payload(), format="json")
        self.assertEqual(recreated.status_code, status.HTTP_201_CREATED)

    def test_release_expired_reservations_command_expires_order_and_restores_stock(self):
        voucher = Voucher.objects.create(
            code="EXP10",
            kind=Voucher.Kind.FIXED,
            value=Decimal("10"),
            usage_limit=1,
            starts_at=timezone.now() - timedelta(hours=1),
            ends_at=timezone.now() + timedelta(days=1),
        )
        cart = Cart.objects.get(user=self.user, status=Cart.Status.ACTIVE)
        cart.voucher = voucher
        cart.save(update_fields=["voucher"])

        created = self.client.post("/api/orders/", self.payload(), format="json")
        self.assertEqual(created.status_code, status.HTTP_201_CREATED)
        order_obj = Order.objects.get(public_id=created.data["public_id"])
        past = timezone.now() - timedelta(minutes=31)
        InventoryReservation.objects.filter(order=order_obj).update(
            created_at=past - timedelta(minutes=30),
            expires_at=past,
        )

        call_command("release_expired_reservations")

        order_obj.refresh_from_db()
        self.assertEqual(order_obj.status, OrderStatus.EXPIRED)
        reservation = InventoryReservation.objects.get(order=order_obj)
        self.assertEqual(reservation.status, InventoryReservation.Status.EXPIRED)
        self.assertIsNotNone(reservation.closed_at)
        balance = InventoryBalance.objects.get(variant=self.variant)
        self.assertEqual(balance.reserved, 0)
        self.assertEqual(order_obj.voucher_redemption.status, VoucherRedemption.Status.RELEASED)

    def test_confirmed_or_packing_orders_are_never_released_by_expiry_job(self):
        created = self.client.post("/api/orders/", self.payload(), format="json")
        self.assertEqual(created.status_code, status.HTTP_201_CREATED)
        order_obj = Order.objects.get(public_id=created.data["public_id"])
        Order.objects.filter(pk=order_obj.pk).update(status=OrderStatus.CONFIRMED)
        past = timezone.now() - timedelta(minutes=45)
        InventoryReservation.objects.filter(order=order_obj).update(
            created_at=past - timedelta(minutes=30),
            expires_at=past,
        )

        call_command("release_expired_reservations")

        order_obj.refresh_from_db()
        self.assertEqual(order_obj.status, OrderStatus.CONFIRMED)
        reservation = InventoryReservation.objects.get(order=order_obj)
        self.assertEqual(reservation.status, InventoryReservation.Status.ACTIVE)
        balance = InventoryBalance.objects.get(variant=self.variant)
        self.assertEqual(balance.reserved, 2)



class ConcurrentCheckoutTests(TransactionTestCase):
    reset_sequences = True

    def setUp(self):
        self.shipping = ShippingMethod.objects.create(
            code="standard", name="Standard", base_fee=0, min_days=2, max_days=4,
        )
        self.product, self.variant = catalog()
        self.product.status = "active"
        self.product.save(update_fields=["status"])

    def make_buyer(self, index):
        user = User.objects.create_user(f"buyer-{index}@example.test", "Buyer!Password123")
        address = Address.objects.create(
            user=user, recipient_name=f"Buyer {index}", phone="0900000000",
            address_line=f"{index} Main Street", ward="Ward 1", province="Da Nang",
        )
        cart = Cart.objects.create(user=user)
        CartItem.objects.create(cart=cart, variant=self.variant, quantity=1)
        return user, address

    def checkout(self, user_id, address_id, checkout_key):
        close_old_connections()
        try:
            user = User.objects.get(pk=user_id)
            order, created = create_order(
                user,
                {
                    "address_id": address_id,
                    "shipping_method_id": self.shipping.id,
                    "checkout_key": checkout_key,
                    "note": "",
                },
            )
            return "created" if created else "replayed", str(order.public_id)
        except Exception as error:
            return "rejected", error.__class__.__name__
        finally:
            close_old_connections()

    def test_same_checkout_key_is_idempotent_under_concurrency(self):
        InventoryBalance.objects.create(variant=self.variant, on_hand=5)
        user, address = self.make_buyer(1)
        checkout_key = uuid.uuid4()

        with ThreadPoolExecutor(max_workers=2) as pool:
            results = list(pool.map(
                lambda _: self.checkout(user.id, address.id, checkout_key),
                range(2),
            ))

        self.assertEqual(Order.objects.count(), 1)
        self.assertEqual(sorted(result[0] for result in results), ["created", "replayed"])
        self.assertEqual(results[0][1], results[1][1])
        self.assertEqual(InventoryBalance.objects.get(variant=self.variant).reserved, 1)

    def test_twenty_buyers_cannot_oversell_five_units(self):
        InventoryBalance.objects.create(variant=self.variant, on_hand=5)
        buyers = [self.make_buyer(index) for index in range(1, 21)]
        jobs = [
            (user.id, address.id, uuid.uuid4())
            for user, address in buyers
        ]

        with ThreadPoolExecutor(max_workers=20) as pool:
            results = list(pool.map(lambda job: self.checkout(*job), jobs))

        self.assertEqual(sum(result[0] == "created" for result in results), 5)
        self.assertEqual(Order.objects.count(), 5)
        balance = InventoryBalance.objects.get(variant=self.variant)
        self.assertEqual(balance.on_hand, 5)
        self.assertEqual(balance.reserved, 5)
