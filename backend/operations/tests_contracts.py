"""PostgreSQL Concurrency, Business Invariants & RBAC Contracts Suite (#29)."""
from datetime import timedelta
from decimal import Decimal
import threading
import uuid

from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group, Permission
from django.test import TransactionTestCase
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient

from accounts.models import Address
from carts.models import Cart, CartItem
from carts.services import get_cart
from catalog.models import Brand, Category, Product, ProductVariant
from common.test_factories import catalog as create_catalog, voucher as create_voucher
from community.models import ModerationStatus, ProductQuestion, Review
from inventory.models import InventoryBalance, InventoryReservation
from orders.models import Order, OrderStatus, ShippingMethod
from orders.services import create_order, release_expired_reservations
from promotions.models import Voucher, VoucherRedemption


class ConcurrencyAndContractsTests(TransactionTestCase):
    """Concurrency verification under TransactionTestCase for real locking semantics."""

    def setUp(self):
        super().setUp()
        self.User = get_user_model()
        self.product, self.variant = create_catalog()
        self.product.status = Product.Status.ACTIVE
        self.product.save(update_fields=["status"])
        self.balance, _ = InventoryBalance.objects.get_or_create(
            variant=self.variant,
            defaults={"on_hand": 1, "reserved": 0, "low_stock_threshold": 2},
        )
        self.balance.on_hand = 1
        self.balance.reserved = 0
        self.balance.save()

        self.shipping_method, _ = ShippingMethod.objects.get_or_create(
            code="standard",
            defaults={"name": "Tiêu chuẩn", "base_fee": Decimal("30000"), "min_days": 1, "max_days": 3, "is_active": True},
        )

        self.user_a = self.User.objects.create_user(email="user_a@nexa.vn", password="Password123!")
        self.user_b = self.User.objects.create_user(email="user_b@nexa.vn", password="Password123!")

        self.address_a = Address.objects.create(
            user=self.user_a,
            recipient_name="User A",
            phone="0901111111",
            address_line="123 Phố A",
            ward="Phường Bến Nghé",
            province="Hà Nội",
        )
        self.address_b = Address.objects.create(
            user=self.user_b,
            recipient_name="User B",
            phone="0902222222",
            address_line="456 Phố B",
            ward="Phường Hàng Trống",
            province="Hà Nội",
        )

    def test_overselling_prevention_under_concurrency(self):
        """When available stock is 1, two concurrent orders for the same SKU must result in exactly 1 success."""
        cart_a = get_cart(self.user_a)
        CartItem.objects.create(cart=cart_a, variant=self.variant, quantity=1)

        cart_b = get_cart(self.user_b)
        CartItem.objects.create(cart=cart_b, variant=self.variant, quantity=1)

        results = []
        errors = []

        def place_order(user, address):
            try:
                order, created = create_order(
                    user=user,
                    data={
                        "checkout_key": str(uuid.uuid4()),
                        "address_id": address.id,
                        "shipping_method_id": self.shipping_method.id,
                        "payment_provider": "cod",
                    },
                )
                if created:
                    results.append(order)
            except Exception as exc:
                errors.append(exc)

        t1 = threading.Thread(target=place_order, args=(self.user_a, self.address_a))
        t2 = threading.Thread(target=place_order, args=(self.user_b, self.address_b))

        t1.start()
        t2.start()
        t1.join()
        t2.join()

        self.assertEqual(len(results), 1, "Chỉ duy nhất 1 đơn hàng được tạo thành công.")
        self.assertEqual(len(errors), 1, "Giao dịch đồng thời thứ hai phải bị từ chối do hết tồn kho.")

        self.balance.refresh_from_db()
        self.assertEqual(self.balance.on_hand, 1)
        self.assertEqual(self.balance.reserved, 1)
        self.assertEqual(self.balance.available, 0)

    def test_double_checkout_on_same_cart_prevention(self):
        """Concurrent checkout on the exact same active cart creates only one order."""
        self.balance.on_hand = 10
        self.balance.save()

        cart = get_cart(self.user_a)
        CartItem.objects.create(cart=cart, variant=self.variant, quantity=1)

        results = []
        errors = []

        def try_checkout(key):
            try:
                order, created = create_order(
                    user=self.user_a,
                    data={
                        "checkout_key": key,
                        "address_id": self.address_a.id,
                        "shipping_method_id": self.shipping_method.id,
                        "payment_provider": "cod",
                    },
                )
                if created:
                    results.append(order)
            except Exception as e:
                errors.append(e)

        t1 = threading.Thread(target=try_checkout, args=(str(uuid.uuid4()),))
        t2 = threading.Thread(target=try_checkout, args=(str(uuid.uuid4()),))
        t1.start()
        t2.start()
        t1.join()
        t2.join()

        self.assertEqual(len(results), 1)
        self.assertEqual(len(errors), 1)

    def test_voucher_usage_limit_enforced_concurrently(self):
        """Voucher with usage_limit=1 can only be applied and redeemed by one order."""
        self.balance.on_hand = 10
        self.balance.save()

        voucher = Voucher.objects.create(
            code="LIMITED1",
            kind=Voucher.Kind.PERCENT,
            value=Decimal("10"),
            starts_at=timezone.now() - timedelta(days=1),
            ends_at=timezone.now() + timedelta(days=7),
            usage_limit=1,
        )

        cart_a = get_cart(self.user_a)
        CartItem.objects.create(cart=cart_a, variant=self.variant, quantity=1)
        cart_a.voucher = voucher
        cart_a.save()

        cart_b = get_cart(self.user_b)
        CartItem.objects.create(cart=cart_b, variant=self.variant, quantity=1)
        cart_b.voucher = voucher
        cart_b.save()

        results = []
        errors = []

        def checkout_with_voucher(user, address):
            try:
                order, created = create_order(
                    user=user,
                    data={
                        "checkout_key": str(uuid.uuid4()),
                        "address_id": address.id,
                        "shipping_method_id": self.shipping_method.id,
                        "payment_provider": "cod",
                    },
                )
                if created:
                    results.append(order)
            except Exception as exc:
                errors.append(exc)

        t1 = threading.Thread(target=checkout_with_voucher, args=(self.user_a, self.address_a))
        t2 = threading.Thread(target=checkout_with_voucher, args=(self.user_b, self.address_b))
        t1.start()
        t2.start()
        t1.join()
        t2.join()

        self.assertEqual(len(results), 1)
        self.assertEqual(len(errors), 1)

        redemptions_count = VoucherRedemption.objects.filter(
            voucher=voucher,
            status__in=[VoucherRedemption.Status.RESERVED, VoucherRedemption.Status.USED],
        ).count()
        self.assertEqual(redemptions_count, 1)

    def test_reservation_expiry_releases_inventory(self):
        """Releasing expired reservations safely restores available stock."""
        self.balance.on_hand = 5
        self.balance.reserved = 0
        self.balance.save()

        cart = get_cart(self.user_a)
        CartItem.objects.create(cart=cart, variant=self.variant, quantity=2)
        order_expired, _ = create_order(
            user=self.user_a,
            data={
                "checkout_key": str(uuid.uuid4()),
                "address_id": self.address_a.id,
                "shipping_method_id": self.shipping_method.id,
                "payment_provider": "cod",
            },
        )
        self.balance.refresh_from_db()
        self.assertEqual(self.balance.reserved, 2)
        self.assertEqual(self.balance.available, 3)

        future_time = timezone.now() + timedelta(hours=1)
        released = release_expired_reservations(now=future_time)
        self.assertEqual(released, 1)

        self.balance.refresh_from_db()
        self.assertEqual(self.balance.reserved, 0)
        self.assertEqual(self.balance.available, 5)

        order_expired.refresh_from_db()
        self.assertEqual(order_expired.status, OrderStatus.EXPIRED)


class RbacRolePermissionMatrixTests(TransactionTestCase):
    """Verifies that Anonymous, Customer, Staff (CSR, Ops) and Superuser respect the exact RBAC Matrix."""

    def setUp(self):
        super().setUp()
        self.User = get_user_model()
        self.client = APIClient()

        self.superuser = self.User.objects.create_superuser(
            email="superuser@nexa.vn", password="Password123!"
        )
        self.customer = self.User.objects.create_user(
            email="cust@nexa.vn", password="Password123!"
        )
        self.staff_csr = self.User.objects.create_user(
            email="csr@nexa.vn", password="Password123!", is_staff=True
        )
        self.staff_warehouse = self.User.objects.create_user(
            email="wh@nexa.vn", password="Password123!", is_staff=True
        )

        group_csr, _ = Group.objects.get_or_create(name="Chăm sóc khách hàng")
        group_wh, _ = Group.objects.get_or_create(name="Nhân viên vận hành & kho")

        csr_perms = Permission.objects.filter(
            codename__in=[
                "view_order",
                "view_review",
                "change_review",
                "view_productquestion",
                "change_productquestion",
                "view_productanswer",
                "change_productanswer",
                "add_productanswer",
            ]
        )
        group_csr.permissions.set(csr_perms)
        self.staff_csr.groups.add(group_csr)

        wh_perms = Permission.objects.filter(
            codename__in=[
                "view_product",
                "view_productvariant",
                "view_order",
                "change_order",
                "view_inventorybalance",
                "change_inventorybalance",
                "view_inventorymovement",
                "view_inventoryreservation",
            ]
        )
        group_wh.permissions.set(wh_perms)
        self.staff_warehouse.groups.add(group_wh)

    def test_anonymous_access_boundaries(self):
        """Anonymous users can read catalog but are denied from cart and admin operations."""
        self.client.force_authenticate(user=None)
        res = self.client.get("/api/products/")
        self.assertEqual(res.status_code, status.HTTP_200_OK)

        res = self.client.get("/api/cart/")
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)

        res = self.client.get("/api/admin/dashboard/")
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_customer_cannot_access_admin_endpoints(self):
        """Standard authenticated customers are denied from any /api/admin/ endpoint."""
        self.client.force_authenticate(user=self.customer)
        for path in [
            "/api/admin/dashboard/",
            "/api/admin/analytics/",
            "/api/admin/orders/",
            "/api/admin/inventory/",
            "/api/admin/customers/",
            "/api/admin/promotions/",
            "/api/admin/reviews/",
        ]:
            res = self.client.get(path)
            self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN, f"Failed at {path}")

    def test_csr_role_allowed_and_denied_matrix(self):
        """CSR staff can view reviews/orders and moderate reviews, but cannot change orders or adjust inventory."""
        self.client.force_authenticate(user=self.staff_csr)

        res = self.client.get("/api/admin/orders/")
        self.assertEqual(res.status_code, status.HTTP_200_OK)

        res = self.client.get("/api/admin/reviews/")
        self.assertEqual(res.status_code, status.HTTP_200_OK)

        res = self.client.get("/api/admin/inventory/")
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

        res = self.client.get("/api/admin/promotions/")
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_warehouse_role_allowed_and_denied_matrix(self):
        """Warehouse staff can manage inventory balances and view orders, but cannot moderate reviews or edit vouchers."""
        self.client.force_authenticate(user=self.staff_warehouse)

        res = self.client.get("/api/admin/inventory/")
        self.assertEqual(res.status_code, status.HTTP_200_OK)

        res = self.client.get("/api/admin/orders/")
        self.assertEqual(res.status_code, status.HTTP_200_OK)

        res = self.client.get("/api/admin/reviews/")
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

        res = self.client.get("/api/admin/promotions/")
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_superuser_has_unrestricted_access(self):
        """Superusers can access all admin endpoints."""
        self.client.force_authenticate(user=self.superuser)

        for path in [
            "/api/admin/dashboard/",
            "/api/admin/analytics/",
            "/api/admin/orders/",
            "/api/admin/inventory/",
            "/api/admin/customers/",
            "/api/admin/promotions/",
            "/api/admin/reviews/",
            "/api/admin/questions/",
            "/api/admin/audit-logs/",
            "/api/admin/outbox-events/",
        ]:
            res = self.client.get(path)
            self.assertEqual(res.status_code, status.HTTP_200_OK, f"Superuser denied at {path}")
