from django.contrib import admin
from django.db import IntegrityError, transaction
from django.test import RequestFactory
from django.contrib.auth.models import Permission
from django.test import TestCase
from rest_framework import status
from rest_framework.test import APITestCase
from rest_framework_simplejwt.tokens import RefreshToken

from accounts.models import User
from inventory.models import InventoryBalance, InventoryMovement, InventoryReservation
from orders.models import Order, OrderAddress, OrderItem, OrderStatusHistory
from payments.models import Payment
from promotions.models import VoucherRedemption
from .models import AuditLog, OutboxEvent


class OperationsModelTests(TestCase):
    def test_audit_json_and_event_defaults(self):
        with self.assertRaises(IntegrityError), transaction.atomic():
            AuditLog.objects.create(action='test', entity_type='Product', entity_id='1', changes=[])
        event = OutboxEvent.objects.create(topic='order.created', aggregate_id='1', payload={'order': 1})
        self.assertEqual(event.status, 'pending')
        self.assertEqual(event.attempts, 0)
        self.assertIsNotNone(event.event_key)


class SensitiveModelAdminTests(TestCase):
    def test_sensitive_operational_records_are_read_only_even_for_superuser(self):
        request = RequestFactory().get("/admin/")
        request.user = User.objects.create_superuser("admin-lock@example.test", "Admin!Password123")
        protected_models = [
            InventoryBalance, InventoryMovement, InventoryReservation,
            Order, OrderAddress, OrderItem, OrderStatusHistory,
            Payment, AuditLog, OutboxEvent, VoucherRedemption,
        ]

        for model in protected_models:
            model_admin = admin.site._registry[model]
            self.assertFalse(model_admin.has_add_permission(request), model.__name__)
            self.assertFalse(model_admin.has_change_permission(request), model.__name__)
            self.assertFalse(model_admin.has_delete_permission(request), model.__name__)


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

    def test_admin_endpoints_enforce_model_permissions_and_paginate(self):
        staff = User.objects.create_user("limited-staff@example.test", "Staff!Password123", is_staff=True)
        self.authenticate(staff)
        endpoints = [
            "/api/admin/orders/",
            "/api/admin/customers/",
            "/api/admin/promotions/",
            "/api/admin/reviews/",
            "/api/admin/questions/",
            "/api/admin/outbox-events/",
            "/api/admin/analytics/",
        ]
        for ep in endpoints:
            self.assertEqual(self.client.get(ep).status_code, status.HTTP_403_FORBIDDEN, ep)

        perms = Permission.objects.filter(
            codename__in=[
                "view_order",
                "view_user",
                "view_voucher",
                "view_review",
                "view_productquestion",
                "view_outboxevent",
                "view_payment",
            ]
        )
        staff.user_permissions.set(perms)
        for ep in endpoints:
            res = self.client.get(ep)
            self.assertEqual(res.status_code, status.HTTP_200_OK, ep)
            if ep != "/api/admin/analytics/":
                self.assertIn("count", res.data, ep)
                self.assertIn("results", res.data, ep)

    def test_admin_order_cod_lifecycle_and_inventory_summary(self):
        from catalog.models import Category, Product, ProductVariant
        from orders.models import OrderStatus, ShippingMethod
        from orders.services import create_order
        from accounts.models import Address
        from carts.models import Cart, CartItem

        admin_user = User.objects.create_superuser("ops-admin@example.test", "Admin!Password123")
        customer = User.objects.create_user("buyer@example.test", "Customer!Password123")
        address = Address.objects.create(
            user=customer,
            recipient_name="Buyer",
            phone="0901234567",
            address_line="123 Le Loi",
            ward="Ben Nghe",
            province="TP.HCM",
            is_default=True,
        )
        shipping = ShippingMethod.objects.create(
            code="standard",
            name="Giao tiêu chuẩn",
            base_fee=30000,
            min_days=2,
            max_days=4,
            is_active=True,
        )
        from common.test_factories import catalog
        product, variant = catalog()
        product.status = "active"
        product.save(update_fields=["status"])
        balance = InventoryBalance.objects.create(variant=variant, on_hand=10, reserved=0, low_stock_threshold=5)

        import uuid
        cart = Cart.objects.create(user=customer)
        CartItem.objects.create(cart=cart, variant=variant, quantity=2)
        order, _ = create_order(
            customer,
            {
                "address_id": address.id,
                "shipping_method_id": shipping.id,
                "checkout_key": uuid.uuid4(),
            },
        )
        balance.refresh_from_db()
        self.assertEqual(balance.on_hand, 10)
        self.assertEqual(balance.reserved, 2)

        self.authenticate(admin_user)

        # Verify /api/admin/inventory/ includes whole-table summary KPIs
        inv_res = self.client.get("/api/admin/inventory/")
        self.assertEqual(inv_res.status_code, status.HTTP_200_OK)
        self.assertIn("summary", inv_res.data)
        self.assertEqual(inv_res.data["summary"]["total_on_hand"], 10)
        self.assertEqual(inv_res.data["summary"]["total_reserved"], 2)
        self.assertEqual(inv_res.data["summary"]["total_available"], 8)

        # Transition pending -> confirmed (extends reservation hold)
        res_confirm = self.client.post(
            f"/api/admin/orders/{order.public_id}/status/",
            {"status": "confirmed", "note": "Admin xác nhận đơn"},
            format="json",
        )
        self.assertEqual(res_confirm.status_code, status.HTTP_200_OK)

        # Transition confirmed -> packing -> shipped -> delivered (consumes reservation, deducts on_hand; does NOT auto-settle payment)
        for next_st in ["packing", "shipped", "delivered"]:
            res_st = self.client.post(
                f"/api/admin/orders/{order.public_id}/status/",
                {"status": next_st},
                format="json",
            )
            self.assertEqual(res_st.status_code, status.HTTP_200_OK)

        balance.refresh_from_db()
        self.assertEqual(balance.on_hand, 8)
        self.assertEqual(balance.reserved, 0)
        reservation = InventoryReservation.objects.get(order=order, variant=variant)
        self.assertEqual(reservation.status, InventoryReservation.Status.CONSUMED)
        self.assertTrue(InventoryMovement.objects.filter(variant=variant, kind=InventoryMovement.Kind.SALE).exists())

        order.refresh_from_db()
        self.assertEqual(order.status, OrderStatus.DELIVERED)
        payment = Payment.objects.get(order=order)
        self.assertEqual(payment.status, Payment.Status.PENDING)

        # Explicit COD settlement via /confirm-payment/ (idempotent on second call)
        confirm_res = self.client.post(f"/api/admin/orders/{order.public_id}/confirm-payment/", {}, format="json")
        self.assertEqual(confirm_res.status_code, status.HTTP_200_OK)
        self.assertEqual(confirm_res.data["payment_status"], Payment.Status.SUCCEEDED)
        confirm_replay = self.client.post(f"/api/admin/orders/{order.public_id}/confirm-payment/", {}, format="json")
        self.assertEqual(confirm_replay.status_code, status.HTTP_200_OK)
        self.assertEqual(AuditLog.objects.filter(entity_id=order.order_number, action="payment.confirmed").count(), 1)

        payment.refresh_from_db()
        self.assertEqual(payment.status, Payment.Status.SUCCEEDED)
        self.assertIsNotNone(payment.paid_at)
        self.assertTrue(AuditLog.objects.filter(entity_id=order.order_number, action="order.status_transition").exists())

    def test_audit_p0_finance_order_inventory_moderation_customer_invariants(self):
        import uuid
        from accounts.models import Address
        from carts.models import Cart, CartItem
        from common.test_factories import catalog
        from community.models import ModerationStatus, ProductQuestion, Review
        from orders.models import OrderStatus, ShippingMethod
        from orders.services import create_order

        admin_user = User.objects.create_superuser("p0-admin@example.test", "Admin!Password123")
        customer = User.objects.create_user("p0-buyer@example.test", "Customer!Password123")
        address = Address.objects.create(
            user=customer,
            recipient_name="Buyer",
            phone="0901234567",
            address_line="123 Le Loi",
            ward="Ben Nghe",
            province="TP.HCM",
            is_default=True,
        )
        shipping, _ = ShippingMethod.objects.get_or_create(
            code="standard",
            defaults={"name": "Giao chuẩn", "base_fee": 0, "min_days": 1, "max_days": 2, "is_active": True},
        )
        product, variant = catalog()
        product.status = "active"
        product.save(update_fields=["status"])
        InventoryBalance.objects.create(variant=variant, on_hand=20, reserved=0, low_stock_threshold=5)

        cart = Cart.objects.create(user=customer)
        CartItem.objects.create(cart=cart, variant=variant, quantity=1)
        vnpay_order, _ = create_order(
            customer,
            {
                "address_id": address.id,
                "shipping_method_id": shipping.id,
                "checkout_key": uuid.uuid4(),
                "payment_provider": Payment.Provider.VNPAY,
            },
        )
        self.authenticate(admin_user)

        # PAY-02 / ADM-07 / ADM-51: confirm_cod_payment flag rejected on status endpoint
        bad_flag = self.client.post(
            f"/api/admin/orders/{vnpay_order.public_id}/status/",
            {"status": "confirmed", "confirm_cod_payment": "false"},
            format="json",
        )
        self.assertEqual(bad_flag.status_code, status.HTTP_400_BAD_REQUEST)

        # ORD-01 / ADM-43 / ADM-44: pending VNPay order cannot be confirmed before gateway settlement
        prepay_block = self.client.post(
            f"/api/admin/orders/{vnpay_order.public_id}/status/",
            {"status": "confirmed"},
            format="json",
        )
        self.assertEqual(prepay_block.status_code, status.HTTP_400_BAD_REQUEST)

        # PAY-03 / ADM-06: manual confirm-payment blocked for VNPay provider
        manual_vnpay = self.client.post(
            f"/api/admin/orders/{vnpay_order.public_id}/confirm-payment/",
            {},
            format="json",
        )
        self.assertEqual(manual_vnpay.status_code, status.HTTP_400_BAD_REQUEST)

        # PAY-04 / ADM-42: once VNPay payment is SUCCEEDED, direct cancel is blocked
        from django.utils import timezone

        vnpay_payment = vnpay_order.payments.first()
        vnpay_payment.status = Payment.Status.SUCCEEDED
        vnpay_payment.paid_at = timezone.now()
        vnpay_payment.save(update_fields=["status", "paid_at"])
        ok_confirm = self.client.post(
            f"/api/admin/orders/{vnpay_order.public_id}/status/",
            {"status": "confirmed"},
            format="json",
        )
        self.assertEqual(ok_confirm.status_code, status.HTTP_200_OK)
        cancel_paid = self.client.post(
            f"/api/admin/orders/{vnpay_order.public_id}/status/",
            {"status": "cancelled", "reason": "Test cancel paid"},
            format="json",
        )
        self.assertEqual(cancel_paid.status_code, status.HTTP_400_BAD_REQUEST)
        vnpay_order.refresh_from_db()
        self.assertEqual(vnpay_order.status, OrderStatus.CONFIRMED)

        # INV-01 / ADM-13: backend ORM search filters inventory by q
        inv_match = self.client.get(f"/api/admin/inventory/?q={variant.sku}")
        self.assertEqual(inv_match.status_code, status.HTTP_200_OK)
        self.assertEqual(inv_match.data["count"], 1)
        inv_miss = self.client.get("/api/admin/inventory/?q=NONEXISTENT_SKU_99999")
        self.assertEqual(inv_miss.status_code, status.HTTP_200_OK)
        self.assertEqual(inv_miss.data["count"], 0)
        self.assertEqual(inv_miss.data["filtered_summary"]["total_skus"], 0)

        # MOD-02 / ADM-47: unverified legacy review cannot be published
        legacy_rev = Review.objects.create(product=product, user=customer, stars=5, body="Đánh giá legacy không có đơn hàng.")
        pub_legacy = self.client.post(
            f"/api/admin/moderation/reviews/{legacy_rev.id}/",
            {"status": "published"},
            format="json",
        )
        self.assertEqual(pub_legacy.status_code, status.HTTP_400_BAD_REQUEST)

        # MOD-03 / ADM-52: cannot post published staff answer on rejected/pending question
        pending_q = ProductQuestion.objects.create(product=product, user=customer, body="Câu hỏi chưa duyệt?", status=ModerationStatus.REJECTED)
        ans_rejected = self.client.post(
            f"/api/admin/questions/{pending_q.id}/reply/",
            {"body": "Phản hồi cho câu hỏi đã bị từ chối."},
            format="json",
        )
        self.assertEqual(ans_rejected.status_code, status.HTTP_400_BAD_REQUEST)

        # CUS-01 / ADM-55: locking an already-locked customer is a no-op with changed=False and no duplicate audit
        lock1 = self.client.post(
            f"/api/admin/customers/{customer.id}/status/",
            {"is_active": False, "reason": "Vi phạm"},
            format="json",
        )
        self.assertEqual(lock1.status_code, status.HTTP_200_OK)
        self.assertTrue(lock1.data["changed"])
        lock2 = self.client.post(
            f"/api/admin/customers/{customer.id}/status/",
            {"is_active": False, "reason": "Lặp lại"},
            format="json",
        )
        self.assertEqual(lock2.status_code, status.HTTP_200_OK)
        self.assertFalse(lock2.data["changed"])
        self.assertEqual(AuditLog.objects.filter(action="customer.locked", entity_id=str(customer.id)).count(), 1)


