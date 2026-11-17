import uuid
from decimal import Decimal
from urllib.parse import parse_qs, urlparse

from django.db import IntegrityError, transaction
from django.test import TestCase, override_settings
from rest_framework import status
from rest_framework.test import APITestCase
from rest_framework_simplejwt.tokens import RefreshToken

from accounts.models import Address, User
from carts.models import Cart, CartItem
from common.test_factories import catalog, order
from inventory.models import InventoryBalance
from operations.models import AuditLog, OutboxEvent
from orders.models import Order, OrderStatus, ShippingMethod

from .models import Payment
from .vnpay import build_signed_query


class PaymentModelTests(TestCase):
    def test_one_pending_attempt_and_paid_timestamp(self):
        purchase = order()
        payment = Payment.objects.create(order=purchase, provider="cod", amount=100)
        payment.full_clean()
        with self.assertRaises(IntegrityError), transaction.atomic():
            Payment.objects.create(order=purchase, provider="cod", amount=100)
        with self.assertRaises(IntegrityError), transaction.atomic():
            Payment.objects.filter(pk=payment.pk).update(status="succeeded")


VNPAY_TEST_SETTINGS = {
    "VNPAY_TMN_CODE": "TESTTMNCODE",
    "VNPAY_HASH_SECRET": "SuperSecretVNPayKeyForUnitTestsOnly1234567890",
    "VNPAY_PAYMENT_URL": "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html",
    "VNPAY_RETURN_URL": "http://localhost:3000/payment/vnpay-return",
    "VNPAY_ALLOW_RETURN_RECONCILE": True,
}


class VnpayIntegrationTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user("vnpay-buyer@example.test", "Buyer!Password123")
        self.other_user = User.objects.create_user("other-buyer@example.test", "Buyer!Password123")
        token = RefreshToken.for_user(self.user)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {token.access_token}")

        self.address = Address.objects.create(
            user=self.user,
            recipient_name="VNPay Buyer",
            phone="0947243014",
            address_line="K249 Nguyen Dinh Chieu",
            ward="Khue My",
            province="Da Nang",
        )
        self.shipping, _ = ShippingMethod.objects.get_or_create(
            code="standard",
            defaults={
                "name": "Standard",
                "base_fee": Decimal("30000"),
                "min_days": 2,
                "max_days": 4,
            },
        )
        self.product, self.variant = catalog()
        self.product.status = "active"
        self.product.save(update_fields=["status"])
        self.variant.price = Decimal("500000")
        self.variant.save(update_fields=["price"])
        InventoryBalance.objects.create(variant=self.variant, on_hand=10)

        cart = Cart.objects.create(user=self.user)
        CartItem.objects.create(cart=cart, variant=self.variant, quantity=1)

    def _create_order(self, payment_method="vnpay"):
        res = self.client.post(
            "/api/orders/",
            {
                "address_id": self.address.id,
                "shipping_method_id": self.shipping.id,
                "checkout_key": str(uuid.uuid4()),
                "payment_method": payment_method,
            },
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        return Order.objects.get(public_id=res.data["public_id"])

    def _sign_vnpay_callback(self, params: dict) -> dict:
        _, sig = build_signed_query(params, VNPAY_TEST_SETTINGS["VNPAY_HASH_SECRET"])
        return {**params, "vnp_SecureHash": sig}

    @override_settings(VNPAY_TMN_CODE="", VNPAY_HASH_SECRET="")
    def test_payment_config_and_create_require_server_secrets(self):
        cfg = self.client.get("/api/payments/config/")
        self.assertEqual(cfg.status_code, status.HTTP_200_OK)
        self.assertFalse(cfg.data["vnpay_enabled"])

        created_order = self._create_order("vnpay")
        res = self.client.post(
            "/api/payments/vnpay/create/",
            {"order_id": str(created_order.public_id)},
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_503_SERVICE_UNAVAILABLE)

    @override_settings(**VNPAY_TEST_SETTINGS)
    def test_create_vnpay_url_idor_and_unique_retry_txn_ref(self):
        cfg = self.client.get("/api/payments/config/")
        self.assertEqual(cfg.status_code, status.HTTP_200_OK)
        self.assertTrue(cfg.data["vnpay_enabled"])
        self.assertNotIn("SuperSecretVNPayKey", str(cfg.data))

        created_order = self._create_order("vnpay")
        self.assertEqual(created_order.grand_total, Decimal("530000"))

        res1 = self.client.post(
            "/api/payments/vnpay/create/",
            {"order_id": str(created_order.public_id)},
            format="json",
        )
        self.assertEqual(res1.status_code, status.HTTP_200_OK)
        parsed = urlparse(res1.data["payment_url"])
        self.assertEqual(parsed.scheme, "https")
        qs = parse_qs(parsed.query)
        self.assertEqual(qs["vnp_TmnCode"][0], "TESTTMNCODE")
        self.assertEqual(qs["vnp_Amount"][0], str(530000 * 100))
        self.assertEqual(qs["vnp_CurrCode"][0], "VND")
        txn_ref_1 = qs["vnp_TxnRef"][0]

        # Retrying generates a new unique vnp_TxnRef and cancels prior pending attempt
        res2 = self.client.post(
            "/api/payments/vnpay/create/",
            {"order_id": str(created_order.public_id)},
            format="json",
        )
        self.assertEqual(res2.status_code, status.HTTP_200_OK)
        txn_ref_2 = res2.data["txn_ref"]
        self.assertNotEqual(txn_ref_1, txn_ref_2)
        self.assertEqual(
            created_order.payments.filter(status=Payment.Status.PENDING).count(),
            1,
        )

        # IDOR protection (S10): another user cannot create VNPay URL for this order
        other_token = RefreshToken.for_user(self.other_user)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {other_token.access_token}")
        idor_res = self.client.post(
            "/api/payments/vnpay/create/",
            {"order_id": str(created_order.public_id)},
            format="json",
        )
        self.assertEqual(idor_res.status_code, status.HTTP_404_NOT_FOUND)

    @override_settings(**VNPAY_TEST_SETTINGS)
    def test_vnpay_ipn_verifies_signature_amount_and_is_idempotent(self):
        created_order = self._create_order("vnpay")
        create_res = self.client.post(
            "/api/payments/vnpay/create/",
            {"order_id": str(created_order.public_id)},
            format="json",
        )
        txn_ref = create_res.data["txn_ref"]

        base_ipn = {
            "vnp_TmnCode": "TESTTMNCODE",
            "vnp_Amount": str(int(created_order.grand_total) * 100),
            "vnp_CurrCode": "VND",
            "vnp_BankCode": "NCB",
            "vnp_OrderInfo": f"Thanh toan don hang {created_order.order_number}",
            "vnp_PayDate": "20261117183000",
            "vnp_ResponseCode": "00",
            "vnp_TransactionStatus": "00",
            "vnp_TransactionNo": "14599887",
            "vnp_TxnRef": txn_ref,
        }

        # 1. Tampered signature -> RspCode 97
        bad_sig = {**base_ipn, "vnp_SecureHash": "0" * 128}
        ipn_bad = self.client.get("/api/payments/vnpay/ipn/", bad_sig)
        self.assertEqual(ipn_bad.status_code, status.HTTP_200_OK)
        self.assertEqual(ipn_bad.data["RspCode"], "97")

        # 2. Tampered amount -> RspCode 04
        forged_amt = self._sign_vnpay_callback({**base_ipn, "vnp_Amount": "100"})
        ipn_amt = self.client.get("/api/payments/vnpay/ipn/", forged_amt)
        self.assertEqual(ipn_amt.data["RspCode"], "04")
        created_order.refresh_from_db()
        self.assertEqual(created_order.status, OrderStatus.PENDING)

        # 3. Genuine IPN -> RspCode 00, payment succeeded, order confirmed
        valid_ipn = self._sign_vnpay_callback(base_ipn)
        ipn_ok = self.client.get("/api/payments/vnpay/ipn/", valid_ipn)
        self.assertEqual(ipn_ok.status_code, status.HTTP_200_OK)
        self.assertEqual(ipn_ok.data["RspCode"], "00")

        created_order.refresh_from_db()
        self.assertEqual(created_order.status, OrderStatus.CONFIRMED)
        succeeded = created_order.payments.get(status=Payment.Status.SUCCEEDED)
        self.assertEqual(succeeded.provider, Payment.Provider.VNPAY)
        self.assertEqual(succeeded.provider_reference, "14599887")
        self.assertIsNotNone(succeeded.paid_at)
        self.assertTrue(AuditLog.objects.filter(action="payment.vnpay_confirmed", entity_id=created_order.order_number).exists())
        self.assertTrue(OutboxEvent.objects.filter(topic="payment.succeeded", aggregate_id=str(created_order.public_id)).exists())

        # 4. Replay IPN -> RspCode 02 (already confirmed)
        ipn_replay = self.client.get("/api/payments/vnpay/ipn/", valid_ipn)
        self.assertEqual(ipn_replay.data["RspCode"], "02")

    @override_settings(**VNPAY_TEST_SETTINGS)
    def test_vnpay_failed_payment_keeps_order_pending_and_return_verification_enforces_ownership(self):
        created_order = self._create_order("vnpay")
        create_res = self.client.post(
            "/api/payments/vnpay/create/",
            {"order_id": str(created_order.public_id)},
            format="json",
        )
        txn_ref = create_res.data["txn_ref"]

        cancelled_cb = self._sign_vnpay_callback(
            {
                "vnp_TmnCode": "TESTTMNCODE",
                "vnp_Amount": str(int(created_order.grand_total) * 100),
                "vnp_ResponseCode": "24",
                "vnp_TransactionStatus": "02",
                "vnp_TransactionNo": "0",
                "vnp_TxnRef": txn_ref,
            }
        )
        verify_res = self.client.post(
            "/api/payments/vnpay/verify-return/",
            {"params": cancelled_cb},
            format="json",
        )
        self.assertEqual(verify_res.status_code, status.HTTP_200_OK)
        self.assertTrue(verify_res.data["verified"])
        self.assertFalse(verify_res.data["paid"])
        self.assertEqual(verify_res.data["response_code"], "24")

        created_order.refresh_from_db()
        self.assertEqual(created_order.status, OrderStatus.PENDING)
        self.assertEqual(
            created_order.payments.order_by("-id").first().status,
            Payment.Status.CANCELLED,
        )

        # User can retry paying via VNPay
        retry_res = self.client.post(
            "/api/payments/vnpay/create/",
            {"order_id": str(created_order.public_id)},
            format="json",
        )
        self.assertEqual(retry_res.status_code, status.HTTP_200_OK)
        success_cb = self._sign_vnpay_callback(
            {
                "vnp_TmnCode": "TESTTMNCODE",
                "vnp_Amount": str(int(created_order.grand_total) * 100),
                "vnp_ResponseCode": "00",
                "vnp_TransactionStatus": "00",
                "vnp_TransactionNo": "14600001",
                "vnp_TxnRef": retry_res.data["txn_ref"],
            }
        )

        # Other user cannot verify someone else's order return callback
        other_token = RefreshToken.for_user(self.other_user)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {other_token.access_token}")
        other_verify = self.client.post(
            "/api/payments/vnpay/verify-return/",
            {"params": success_cb},
            format="json",
        )
        self.assertEqual(other_verify.status_code, status.HTTP_400_BAD_REQUEST)

        # Owner can verify return callback cleanly
        owner_token = RefreshToken.for_user(self.user)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {owner_token.access_token}")
        owner_verify = self.client.post(
            "/api/payments/vnpay/verify-return/",
            {"params": success_cb},
            format="json",
        )
        self.assertEqual(owner_verify.status_code, status.HTTP_200_OK)
        self.assertTrue(owner_verify.data["paid"])
        created_order.refresh_from_db()
        self.assertEqual(created_order.status, OrderStatus.CONFIRMED)
