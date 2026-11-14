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

        # Transition confirmed -> packing -> shipped -> delivered (consumes reservation, deducts on_hand, marks COD payment succeeded)
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
        self.assertEqual(payment.status, Payment.Status.SUCCEEDED)
        self.assertIsNotNone(payment.paid_at)
        self.assertTrue(AuditLog.objects.filter(entity_id=order.order_number, action="order.status_transition").exists())


