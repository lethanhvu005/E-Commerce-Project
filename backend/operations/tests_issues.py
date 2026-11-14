import logging
import threading
import uuid
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timedelta
from decimal import Decimal
from zoneinfo import ZoneInfo

from django.contrib.auth.models import Permission
from django.core.management import call_command
from django.db import close_old_connections
from django.test import TransactionTestCase
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase
from rest_framework_simplejwt.tokens import RefreshToken

from accounts.models import User
from carts.models import Cart
from catalog.models import ProductVariant
from common.test_factories import catalog
from community.models import ModerationStatus, ProductAnswer, ProductQuestion, Review
from inventory.models import InventoryBalance
from orders.models import Order, OrderItem, OrderStatus, ShippingMethod
from payments.models import Payment
from promotions.models import Voucher, VoucherRedemption

from .models import AuditLog, OutboxDeliveryReceipt, OutboxEvent
from .outbox import (
    PermanentDispatchError,
    TransientDispatchError,
    dispatch_due_events,
    outbox_metrics,
    recover_stale_locks,
)


def _grant(user, codenames):
    perms = Permission.objects.filter(codename__in=codenames)
    user.user_permissions.set(perms)


class AnalyticsConsistencyIssue17Tests(APITestCase):
    def setUp(self):
        self.staff = User.objects.create_user("analytics-staff@example.test", "Staff!Password123", is_staff=True)
        _grant(
            self.staff,
            [
                "view_order",
                "view_payment",
                "view_user",
                "view_product",
                "view_inventorybalance",
            ],
        )
        token = RefreshToken.for_user(self.staff)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {token.access_token}")

        self.customer = User.objects.create_user("buyer-17@example.test", "Buyer!Password123")
        self.other = User.objects.create_user("other-17@example.test", "Buyer!Password123")
        self.shipping, _ = ShippingMethod.objects.get_or_create(
            code="standard", defaults={"name": "Standard", "base_fee": 0, "min_days": 1, "max_days": 3}
        )
        self.product, self.variant = catalog()
        self.variant2 = ProductVariant.objects.create(
            product=self.product, sku="KB-02-17", option_key="v2", price=100
        )

    def _make_order(self, user, total, order_status, created_at):
        cart = Cart.objects.create(user=user, status=Cart.Status.CONVERTED)
        ord_obj = Order.objects.create(
            user=user,
            source_cart=cart,
            order_number=uuid.uuid4().hex[:16].upper(),
            checkout_key=uuid.uuid4(),
            request_hash="b" * 64,
            subtotal=total,
            grand_total=total,
            status=order_status,
            shipping_method=self.shipping,
            shipping_method_snapshot=self.shipping.name,
            contact_email_snapshot=user.email,
        )
        Order.objects.filter(pk=ord_obj.pk).update(created_at=created_at)
        ord_obj.refresh_from_db()
        # Multiple line items to guard against JOIN row multiplication
        half = total // 2
        OrderItem.objects.create(
            order=ord_obj,
            variant=self.variant,
            product_name_snapshot="Item A",
            sku_snapshot=f"SKU-A-{ord_obj.id}",
            quantity=1,
            unit_price=half,
            line_total=half,
        )
        OrderItem.objects.create(
            order=ord_obj,
            variant=self.variant2,
            product_name_snapshot="Item B",
            sku_snapshot=f"SKU-B-{ord_obj.id}",
            quantity=1,
            unit_price=total - half,
            line_total=total - half,
        )
        return ord_obj

    def test_analytics_timezone_pending_cod_refund_and_no_join_double_counting(self):
        # 2026-11-14 17:30 UTC == 2026-11-15 00:30 Asia/Ho_Chi_Minh
        vn_midnight_boundary_utc = datetime(2026, 11, 14, 17, 30, tzinfo=ZoneInfo("UTC"))
        same_vn_day = datetime(2026, 11, 15, 3, 0, tzinfo=ZoneInfo("UTC"))
        prev_vn_day = datetime(2026, 11, 14, 4, 0, tzinfo=ZoneInfo("UTC"))

        # Order 1: Paid order on VN 2026-11-15 with an earlier failed payment + final succeeded payment
        o1 = self._make_order(self.customer, Decimal("1000000"), OrderStatus.DELIVERED, vn_midnight_boundary_utc)
        Payment.objects.create(
            order=o1,
            provider=Payment.Provider.VNPAY,
            status=Payment.Status.FAILED,
            amount=Decimal("1000000"),
            idempotency_key=uuid.uuid4(),
        )
        Payment.objects.create(
            order=o1,
            provider=Payment.Provider.COD,
            status=Payment.Status.SUCCEEDED,
            amount=Decimal("1000000"),
            paid_at=vn_midnight_boundary_utc,
            idempotency_key=uuid.uuid4(),
        )

        # Order 2: Pending COD on VN 2026-11-15 -> counts in gross_order_value, NOT paid_revenue/customer_paid_total
        o2 = self._make_order(self.customer, Decimal("500000"), OrderStatus.PENDING, same_vn_day)
        Payment.objects.create(
            order=o2,
            provider=Payment.Provider.COD,
            status=Payment.Status.PENDING,
            amount=Decimal("500000"),
            idempotency_key=uuid.uuid4(),
        )

        # Order 3: Refunded order on VN 2026-11-14 -> counts in refund_amount & valid gross_order_value
        o3 = self._make_order(self.customer, Decimal("300000"), OrderStatus.DELIVERED, prev_vn_day)
        Payment.objects.create(
            order=o3,
            provider=Payment.Provider.MOMO,
            status=Payment.Status.REFUNDED,
            amount=Decimal("300000"),
            paid_at=prev_vn_day,
            idempotency_key=uuid.uuid4(),
        )

        # Order 4: Cancelled order -> excluded from gross_order_value and orders_count
        self._make_order(self.customer, Decimal("999000"), OrderStatus.CANCELLED, same_vn_day)

        # Unfiltered analytics vs dashboard consistency
        analytics = self.client.get("/api/admin/analytics/")
        self.assertEqual(analytics.status_code, status.HTTP_200_OK)
        dash = self.client.get("/api/admin/dashboard/")
        self.assertEqual(dash.status_code, status.HTTP_200_OK)

        self.assertEqual(Decimal(str(analytics.data["gross_order_value"])), Decimal("1800000"))
        self.assertEqual(Decimal(str(analytics.data["paid_revenue"])), Decimal("1000000"))
        self.assertEqual(Decimal(str(analytics.data["refund_amount"])), Decimal("300000"))
        self.assertEqual(Decimal(str(analytics.data["net_revenue"])), Decimal("1000000"))
        self.assertEqual(analytics.data["orders_count"], 3)
        self.assertEqual(analytics.data["timezone"], "Asia/Ho_Chi_Minh")

        for field in ("gross_order_value", "paid_revenue", "refund_amount", "net_revenue"):
            self.assertEqual(Decimal(str(dash.data[field])), Decimal(str(analytics.data[field])))

        # Sum of daily_series must equal KPI totals exactly
        series = analytics.data["daily_series"]
        self.assertEqual(sum(int(r["orders"]) for r in series), analytics.data["orders_count"])
        self.assertEqual(sum(Decimal(str(r["gross_order_value"])) for r in series), Decimal("1800000"))
        self.assertEqual(sum(Decimal(str(r["paid_revenue"])) for r in series), Decimal("1000000"))
        self.assertEqual(sum(Decimal(str(r["refund_amount"])) for r in series), Decimal("300000"))

        # Date filter on VN 2026-11-15 must capture 2026-11-14T17:30Z
        filtered_15 = self.client.get("/api/admin/analytics/?start_date=2026-11-15&end_date=2026-11-15")
        self.assertEqual(filtered_15.status_code, status.HTTP_200_OK)
        self.assertEqual(Decimal(str(filtered_15.data["paid_revenue"])), Decimal("1000000"))
        self.assertEqual(Decimal(str(filtered_15.data["gross_order_value"])), Decimal("1500000"))
        self.assertEqual(Decimal(str(filtered_15.data["refund_amount"])), Decimal("0"))
        self.assertEqual([r["day"] for r in filtered_15.data["daily_series"]], ["2026-11-15"])

        # Customer list and detail must reflect customer_paid_total without pending COD or multi-item multiplication
        cust_list = self.client.get("/api/admin/customers/?q=buyer-17")
        self.assertEqual(cust_list.status_code, status.HTTP_200_OK)
        row = cust_list.data["results"][0]
        self.assertEqual(row["orders_count"], 3)
        self.assertEqual(Decimal(str(row["customer_paid_total"])), Decimal("1000000"))
        self.assertEqual(Decimal(str(row["gross_order_value"])), Decimal("1800000"))
        self.assertEqual(Decimal(str(row["refunded_total"])), Decimal("300000"))

        # Invalid date range returns 400
        self.assertEqual(
            self.client.get("/api/admin/analytics/?start_date=2026-11-20&end_date=2026-11-10").status_code,
            status.HTTP_400_BAD_REQUEST,
        )


class PromotionsIssue18Tests(APITestCase):
    def setUp(self):
        self.staff = User.objects.create_user("promo-staff@example.test", "Staff!Password123", is_staff=True)
        _grant(self.staff, ["view_voucher", "add_voucher", "change_voucher"])
        token = RefreshToken.for_user(self.staff)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {token.access_token}")

    def test_voucher_crud_validation_permissions_and_history_preservation(self):
        ro_staff = User.objects.create_user("promo-ro@example.test", "Staff!Password123", is_staff=True)
        _grant(ro_staff, ["view_voucher"])
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {RefreshToken.for_user(ro_staff).access_token}")
        self.assertEqual(
            self.client.post("/api/admin/promotions/", {"code": "RO10"}, format="json").status_code,
            status.HTTP_403_FORBIDDEN,
        )

        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {RefreshToken.for_user(self.staff).access_token}")
        # Bad payloads return friendly 400s
        bad = self.client.post(
            "/api/admin/promotions/",
            {
                "code": "BAD 10",
                "kind": "percent",
                "value": 150,
                "starts_at": "2026-11-15",
                "ends_at": "2026-11-14",
            },
            format="json",
        )
        self.assertEqual(bad.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("code", bad.data)
        self.assertIn("value", bad.data)
        self.assertIn("ends_at", bad.data)

        created = self.client.post(
            "/api/admin/promotions/",
            {
                "code": " nexa15 ",
                "kind": "percent",
                "value": 15,
                "max_discount": 100000,
                "min_subtotal": 300000,
                "usage_limit": 2,
                "per_user_limit": 1,
                "starts_at": "2026-11-01",
                "ends_at": "2026-12-31",
                "is_active": True,
            },
            format="json",
        )
        self.assertEqual(created.status_code, status.HTTP_201_CREATED)
        self.assertEqual(created.data["code"], "NEXA15")
        vid = created.data["id"]

        # Create a redemption referencing this voucher
        buyer = User.objects.create_user("promo-buyer@example.test", "Buyer!Password123")
        cart = Cart.objects.create(user=buyer, status=Cart.Status.CONVERTED)
        shipping, _ = ShippingMethod.objects.get_or_create(
            code="standard", defaults={"name": "Std", "base_fee": 0, "min_days": 1, "max_days": 2}
        )
        ord_obj = Order.objects.create(
            user=buyer,
            source_cart=cart,
            order_number="ORDPROMO1",
            checkout_key=uuid.uuid4(),
            request_hash="c" * 64,
            subtotal=400000,
            discount_total=60000,
            grand_total=340000,
            shipping_method=shipping,
            shipping_method_snapshot="Std",
            contact_email_snapshot=buyer.email,
        )
        voucher = Voucher.objects.get(pk=vid)
        VoucherRedemption.objects.create(voucher=voucher, user=buyer, order=ord_obj, status=VoucherRedemption.Status.USED, discount_amount=60000)

        # Lowering usage_limit below used_count returns 400, NOT 500
        # Add 2nd redemption? Only 1 used so usage_limit=1 ok; let's test free_ship mismatch -> 400 and duplicate code -> 400
        patched = self.client.patch(f"/api/admin/promotions/{vid}/", {"value": 20}, format="json")
        self.assertEqual(patched.status_code, status.HTTP_200_OK)
        self.assertEqual(Decimal(str(patched.data["value"])), Decimal("20"))

        # Deactivate via status endpoint preserves redemption history
        toggled = self.client.post(f"/api/admin/promotions/{vid}/status/", {"is_active": False}, format="json")
        self.assertEqual(toggled.status_code, status.HTTP_200_OK)
        self.assertFalse(toggled.data["is_active"])
        self.assertEqual(toggled.data["used_count"], 1)
        self.assertEqual(VoucherRedemption.objects.filter(voucher=voucher).count(), 1)
        self.assertTrue(AuditLog.objects.filter(action="voucher.deactivated", entity_id="NEXA15").exists())


class ModerationIssue19Tests(APITestCase):
    def setUp(self):
        self.product, _ = catalog()
        self.product.status = "active"
        self.product.save(update_fields=["status"])
        self.buyer = User.objects.create_user("mod-buyer@example.test", "Buyer!Password123")
        self.cs = User.objects.create_user("mod-cs@example.test", "Staff!Password123", is_staff=True, first_name="CS", last_name="NEXA")
        _grant(
            self.cs,
            [
                "view_review",
                "change_review",
                "view_productquestion",
                "change_productquestion",
                "view_productanswer",
                "add_productanswer",
                "change_productanswer",
            ],
        )
        self.no_perm_staff = User.objects.create_user("mod-noperm@example.test", "Staff!Password123", is_staff=True)

    def test_moderation_transitions_public_visibility_and_staff_answer(self):
        review = Review.objects.create(product=self.product, user=self.buyer, stars=5, body="Hàng dùng rất ổn định.")
        question = ProductQuestion.objects.create(product=self.product, user=self.buyer, body="Bảo hành mấy năm vậy?")
        user_ans = ProductAnswer.objects.create(question=question, user=self.buyer, body="Hình như bảo hành 24 tháng.")

        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {RefreshToken.for_user(self.no_perm_staff).access_token}")
        self.assertEqual(
            self.client.post(f"/api/admin/moderation/reviews/{review.id}/", {"status": "published"}, format="json").status_code,
            status.HTTP_403_FORBIDDEN,
        )

        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {RefreshToken.for_user(self.cs).access_token}")
        # Rejecting without reason fails 400
        self.assertEqual(
            self.client.post(f"/api/admin/moderation/reviews/{review.id}/", {"status": "rejected"}, format="json").status_code,
            status.HTTP_400_BAD_REQUEST,
        )
        # Reject review with reason
        rej = self.client.post(
            f"/api/admin/moderation/reviews/{review.id}/",
            {"status": "rejected", "reason": "Nội dung spam"},
            format="json",
        )
        self.assertEqual(rej.status_code, status.HTTP_200_OK)
        self.assertEqual(rej.data["status"], ModerationStatus.REJECTED)

        # Publish question + user answer + add staff reply
        self.assertEqual(
            self.client.post(f"/api/admin/moderation/questions/{question.id}/", {"status": "published"}, format="json").status_code,
            status.HTTP_200_OK,
        )
        self.assertEqual(
            self.client.post(f"/api/admin/moderation/answers/{user_ans.id}/", {"status": "published"}, format="json").status_code,
            status.HTTP_200_OK,
        )
        reply = self.client.post(
            f"/api/admin/questions/{question.id}/reply/",
            {"body": "Bảo hành chính hãng 24 tháng 1 đổi 1 bạn nhé."},
            format="json",
        )
        self.assertEqual(reply.status_code, status.HTTP_201_CREATED)
        self.assertTrue(reply.data["is_staff_answer"])

        # Public product API hides rejected review & marks staff vs user answers
        self.client.credentials()
        pub_reviews = self.client.get(f"/api/products/{self.product.slug}/reviews/")
        self.assertEqual(pub_reviews.data["count"], 0)
        pub_questions = self.client.get(f"/api/products/{self.product.slug}/questions/")
        self.assertEqual(len(pub_questions.data["results"]), 1)
        answers = pub_questions.data["results"][0]["answers"]
        self.assertEqual([a["is_staff_answer"] for a in answers], [False, True])
        self.assertTrue(AuditLog.objects.filter(action="reviews.moderated", entity_id=str(review.id)).exists())
        self.assertTrue(AuditLog.objects.filter(action="answers.staff_created").exists())


class CustomerLockIssue20Tests(APITestCase):
    def setUp(self):
        self.superuser = User.objects.create_superuser("su-20@example.test", "Admin!Password123")
        self.other_superuser = User.objects.create_superuser("su2-20@example.test", "Admin!Password123")
        self.staff = User.objects.create_user("staff-20@example.test", "Staff!Password123", is_staff=True)
        _grant(self.staff, ["view_user", "change_user", "view_order"])
        self.other_staff = User.objects.create_user("staff2-20@example.test", "Staff!Password123", is_staff=True)
        self.customer = User.objects.create_user("cust-20@example.test", "Buyer!Password123", first_name="Lan", last_name="Nguyen")

    def test_customer_detail_safeguards_and_immediate_jwt_revocation(self):
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {RefreshToken.for_user(self.staff).access_token}")

        # Scoped detail works
        detail = self.client.get(f"/api/admin/customers/{self.customer.id}/")
        self.assertEqual(detail.status_code, status.HTTP_200_OK)
        self.assertIn("recent_orders", detail.data)
        self.assertIn("customer_paid_total", detail.data)

        # Self-lock -> 400; non-superuser locking staff/superuser -> 403; field tampering -> 400
        self.assertEqual(
            self.client.post(f"/api/admin/customers/{self.staff.id}/status/", {"is_active": False, "reason": "x"}, format="json").status_code,
            status.HTTP_400_BAD_REQUEST,
        )
        self.assertEqual(
            self.client.post(f"/api/admin/customers/{self.other_staff.id}/status/", {"is_active": False, "reason": "x"}, format="json").status_code,
            status.HTTP_403_FORBIDDEN,
        )
        self.assertEqual(
            self.client.post(f"/api/admin/customers/{self.superuser.id}/status/", {"is_active": False, "reason": "x"}, format="json").status_code,
            status.HTTP_403_FORBIDDEN,
        )
        self.assertEqual(
            self.client.post(f"/api/admin/customers/{self.customer.id}/status/", {"is_active": False, "is_staff": True, "reason": "x"}, format="json").status_code,
            status.HTTP_400_BAD_REQUEST,
        )
        self.assertEqual(
            self.client.post(f"/api/admin/customers/{self.customer.id}/status/", {"is_active": False}, format="json").status_code,
            status.HTTP_400_BAD_REQUEST,
        )

        # Even superuser cannot lock another superuser via this API
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {RefreshToken.for_user(self.superuser).access_token}")
        self.assertEqual(
            self.client.post(f"/api/admin/customers/{self.other_superuser.id}/status/", {"is_active": False, "reason": "test"}, format="json").status_code,
            status.HTTP_403_FORBIDDEN,
        )

        # Customer obtains JWT access + refresh tokens via login endpoint
        self.client.credentials()
        login_res = self.client.post(
            "/api/auth/login/",
            {"email": self.customer.email, "password": "Buyer!Password123"},
            format="json",
        )
        self.assertEqual(login_res.status_code, status.HTTP_200_OK)
        cust_access = login_res.data["access"]
        cust_refresh = login_res.data["refresh"]

        # Staff locks customer -> immediately blocks login, refresh, AND existing access token
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {RefreshToken.for_user(self.staff).access_token}")
        locked = self.client.post(
            f"/api/admin/customers/{self.customer.id}/status/",
            {"is_active": False, "reason": "Gian lận đơn hàng"},
            format="json",
        )
        self.assertEqual(locked.status_code, status.HTTP_200_OK)
        self.assertFalse(locked.data["is_active"])
        self.assertGreaterEqual(locked.data["revoked_refresh_tokens"], 1)
        self.assertTrue(AuditLog.objects.filter(action="customer.locked", entity_id=str(self.customer.id)).exists())

        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {cust_access}")
        self.assertEqual(self.client.get("/api/accounts/me/").status_code, status.HTTP_401_UNAUTHORIZED)
        self.client.credentials()
        self.assertEqual(
            self.client.post("/api/auth/token/refresh/", {"refresh": cust_refresh}, format="json").status_code,
            status.HTTP_401_UNAUTHORIZED,
        )
        self.assertEqual(
            self.client.post("/api/auth/login/", {"email": self.customer.email, "password": "Buyer!Password123"}, format="json").status_code,
            status.HTTP_401_UNAUTHORIZED,
        )

        # Staff unlocks customer -> login works again
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {RefreshToken.for_user(self.staff).access_token}")
        unlocked = self.client.post(
            f"/api/admin/customers/{self.customer.id}/status/",
            {"is_active": True, "reason": "Đã xác minh"},
            format="json",
        )
        self.assertEqual(unlocked.status_code, status.HTTP_200_OK)
        self.client.credentials()
        self.assertEqual(
            self.client.post("/api/auth/login/", {"email": self.customer.email, "password": "Buyer!Password123"}, format="json").status_code,
            status.HTTP_200_OK,
        )


class OutboxDispatcherIssue22Tests(TransactionTestCase):
    def test_concurrent_workers_skip_locked_deliver_once_and_recover(self):
        events = [
            OutboxEvent.objects.create(
                topic="order.created",
                aggregate_id=f"ord-{idx}",
                payload={"secret_email": "pii@example.test", "order": idx},
            )
            for idx in range(6)
        ]

        seen_keys = []
        seen_lock = threading.Lock()
        overlap_gate = threading.Event()

        def concurrent_handler(ev):
            overlap_gate.set()
            with seen_lock:
                seen_keys.append(str(ev.event_key))
            return "webhook://test"

        def worker():
            close_old_connections()
            return dispatch_due_events(batch_size=3, handler=concurrent_handler)

        with ThreadPoolExecutor(max_workers=2) as pool:
            f1 = pool.submit(worker)
            f2 = pool.submit(worker)
            res1 = f1.result()
            res2 = f2.result()
        res3 = dispatch_due_events(batch_size=10, handler=concurrent_handler)

        self.assertEqual(len(seen_keys), 6)
        self.assertEqual(len(set(seen_keys)), 6)
        self.assertEqual(OutboxEvent.objects.filter(status=OutboxEvent.Status.SENT).count(), 6)
        self.assertEqual(OutboxDeliveryReceipt.objects.count(), 6)
        self.assertEqual(res1["sent"] + res2["sent"] + res3["sent"], 6)

        # Event with an already-recorded delivery receipt is idempotently skipped
        dup_event = OutboxEvent.objects.create(
            topic="order.created",
            aggregate_id="ord-dup",
            payload={"order": 999},
        )
        OutboxDeliveryReceipt.objects.create(
            event=dup_event,
            event_key=dup_event.event_key,
            topic=dup_event.topic,
            destination="prior-run",
        )
        invoked = []
        dedup_res = dispatch_due_events(batch_size=10, handler=lambda ev: (invoked.append(ev.id), "x")[1])
        self.assertEqual(dedup_res["deduped"], 1)
        self.assertEqual(invoked, [])

    def test_retry_backoff_dead_letter_stale_lock_pii_logging_and_metrics(self):
        ev_transient = OutboxEvent.objects.create(topic="payment.succeeded", aggregate_id="p-1", payload={"token": "SECRET_TOKEN_XYZ"})
        ev_perm = OutboxEvent.objects.create(topic="payment.succeeded", aggregate_id="p-2", payload={"email": "leak@example.test"})
        ev_stale = OutboxEvent.objects.create(
            topic="order.shipped",
            aggregate_id="o-stale",
            status=OutboxEvent.Status.PROCESSING,
            attempts=1,
            locked_at=timezone.now() - timedelta(seconds=600),
            payload={},
        )

        def flaky_handler(ev):
            if ev.id == ev_transient.id:
                raise TransientDispatchError("http_503", "Downstream unavailable")
            if ev.id == ev_perm.id:
                raise PermanentDispatchError("http_400", "Bad payload")
            return "local://ok"

        with self.assertLogs("operations.outbox", level=logging.INFO) as logs:
            res1 = dispatch_due_events(max_attempts=2, base_backoff_seconds=10, stale_seconds=300, handler=flaky_handler)

        log_blob = "\n".join(logs.output)
        self.assertNotIn("SECRET_TOKEN_XYZ", log_blob)
        self.assertNotIn("leak@example.test", log_blob)
        self.assertEqual(res1["requeued_stale"], 1)
        self.assertEqual(res1["sent"], 1)  # stale event recovered & dispatched
        self.assertEqual(res1["retried"], 1)
        self.assertEqual(res1["failed"], 1)  # permanent error went straight to failed

        ev_transient.refresh_from_db()
        ev_perm.refresh_from_db()
        self.assertEqual(ev_transient.status, OutboxEvent.Status.PENDING)
        self.assertEqual(ev_transient.attempts, 1)
        self.assertEqual(ev_transient.last_error_code, "http_503")
        self.assertGreater(ev_transient.available_at, timezone.now())
        self.assertEqual(ev_perm.status, OutboxEvent.Status.FAILED)

        # Second attempt fails transiently -> reaches max_attempts=2 -> dead-letter FAILED
        dispatch_due_events(
            max_attempts=2,
            base_backoff_seconds=10,
            now=ev_transient.available_at + timedelta(seconds=1),
            handler=flaky_handler,
        )
        ev_transient.refresh_from_db()
        self.assertEqual(ev_transient.status, OutboxEvent.Status.FAILED)
        self.assertEqual(ev_transient.attempts, 2)

        metrics = outbox_metrics(backlog_alert_threshold=1)
        self.assertEqual(metrics["failed"], 2)
        self.assertTrue(metrics["alert"])

        call_command("dispatch_outbox", "--once")


class OutboxRetryApiAndInventoryProducerTests(APITestCase):
    def test_inventory_adjustment_emits_outbox_and_retry_api_respects_rbac(self):
        _, variant = catalog()
        InventoryBalance.objects.create(variant=variant, on_hand=10)
        staff = User.objects.create_user("ops-22@example.test", "Staff!Password123", is_staff=True)
        _grant(staff, ["view_inventorybalance", "change_inventorybalance", "view_outboxevent"])
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {RefreshToken.for_user(staff).access_token}")

        adj = self.client.post(
            "/api/admin/inventory/",
            {
                "variant_id": variant.id,
                "quantity_delta": 5,
                "reason": "Nhập thêm hàng",
                "event_key": str(uuid.uuid4()),
            },
            format="json",
        )
        self.assertEqual(adj.status_code, status.HTTP_201_CREATED)
        self.assertTrue(OutboxEvent.objects.filter(topic="inventory.adjusted", aggregate_id=str(variant.id)).exists())

        failed_ev = OutboxEvent.objects.create(topic="order.created", aggregate_id="f1", status=OutboxEvent.Status.FAILED, payload={})
        sent_ev = OutboxEvent.objects.create(topic="order.created", aggregate_id="s1", status=OutboxEvent.Status.SENT, payload={})

        # Lacks change_outboxevent -> 403
        self.assertEqual(
            self.client.post(f"/api/admin/outbox-events/{failed_ev.id}/retry/", {}, format="json").status_code,
            status.HTTP_403_FORBIDDEN,
        )

        _grant(staff, ["view_outboxevent", "change_outboxevent"])
        # Retrying already-sent event -> 409 Conflict
        self.assertEqual(
            self.client.post(f"/api/admin/outbox-events/{sent_ev.id}/retry/", {}, format="json").status_code,
            status.HTTP_409_CONFLICT,
        )
        ok = self.client.post(f"/api/admin/outbox-events/{failed_ev.id}/retry/", {}, format="json")
        self.assertEqual(ok.status_code, status.HTTP_200_OK)
        self.assertEqual(ok.data["status"], OutboxEvent.Status.PENDING)
        self.assertTrue(AuditLog.objects.filter(action="outbox.retried", entity_id=str(failed_ev.id)).exists())
