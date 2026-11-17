import hashlib
import hmac
import re
import unicodedata
from datetime import timedelta
from urllib.parse import quote_plus, urlparse
from zoneinfo import ZoneInfo

from django.conf import settings
from django.db import transaction
from django.utils import timezone
from rest_framework.exceptions import ValidationError

from operations.models import AuditLog, OutboxEvent
from orders.models import Order, OrderStatus, OrderStatusHistory
from promotions.models import VoucherRedemption

from .models import Payment

VN_TZ = ZoneInfo("Asia/Ho_Chi_Minh")

VNPAY_RESPONSE_MESSAGES = {
    "00": "Giao dịch thanh toán VNPay thành công.",
    "07": "Trừ tiền thành công nhưng giao dịch đang bị nghi ngờ (cần kiểm tra thêm).",
    "09": "Thẻ hoặc tài khoản chưa đăng ký dịch vụ InternetBanking tại ngân hàng.",
    "10": "Xác thực thông tin thẻ/tài khoản không đúng quá 3 lần.",
    "11": "Đã hết hạn chờ thanh toán. Vui lòng thực hiện lại giao dịch.",
    "12": "Thẻ hoặc tài khoản của bạn đang bị khóa.",
    "13": "Nhập sai mật khẩu xác thực giao dịch (OTP).",
    "24": "Bạn đã hủy giao dịch thanh toán VNPay.",
    "51": "Tài khoản không đủ số dư để thực hiện giao dịch.",
    "65": "Tài khoản đã vượt quá hạn mức giao dịch trong ngày.",
    "75": "Ngân hàng thanh toán đang bảo trì.",
    "79": "Nhập sai mật khẩu thanh toán quá số lần quy định.",
}


def vnpay_response_message(code: str) -> str:
    code = str(code or "").strip()
    return VNPAY_RESPONSE_MESSAGES.get(code, f"Thanh toán VNPay không thành công (mã {code or '99'}).")


def _sanitize_order_info(text: str) -> str:
    normalized = unicodedata.normalize("NFKD", str(text or ""))
    ascii_text = "".join(ch for ch in normalized if not unicodedata.combining(ch))
    ascii_text = ascii_text.replace("đ", "d").replace("Đ", "D")
    safe = re.sub(r"[^A-Za-z0-9 :\-]", "", ascii_text).strip()
    return (safe or "Thanh toan don hang NEXA")[:255]


def get_client_ip(request) -> str:
    forwarded_for = (request.META.get("HTTP_X_FORWARDED_FOR") or "").split(",")[0].strip()
    remote = forwarded_for or (request.META.get("REMOTE_ADDR") or "").strip() or "127.0.0.1"
    # VNPay expects IPv4 or clean IP string <= 45 chars; map IPv6 loopback to 127.0.0.1
    if remote == "::1":
        return "127.0.0.1"
    return remote[:45]


def build_signed_query(params: dict, hash_secret: str) -> tuple[str, str]:
    filtered = {
        str(k): str(v)
        for k, v in params.items()
        if v is not None and str(v) != "" and k not in {"vnp_SecureHash", "vnp_SecureHashType"}
    }
    sorted_items = sorted(filtered.items(), key=lambda kv: kv[0])
    hash_data = "&".join(f"{quote_plus(k)}={quote_plus(v)}" for k, v in sorted_items)
    signature = hmac.new(
        hash_secret.encode("utf-8"),
        hash_data.encode("utf-8"),
        hashlib.sha512,
    ).hexdigest()
    return hash_data, signature


def build_vnpay_payment_url(
    *,
    tmn_code: str,
    hash_secret: str,
    payment_url: str,
    return_url: str,
    txn_ref: str,
    amount_vnd: int,
    order_info: str,
    ip_addr: str,
    bank_code: str = "",
    locale: str = "vn",
    now=None,
) -> tuple[str, object]:
    parsed = urlparse(payment_url)
    if parsed.scheme != "https" or not parsed.netloc:
        raise ValidationError({"payment": ["VNPAY_PAYMENT_URL phải sử dụng giao thức HTTPS hợp lệ."]})
    amount_int = int(amount_vnd)
    if amount_int <= 0:
        raise ValidationError({"amount": ["Số tiền thanh toán phải lớn hơn 0 VND."]})

    current_vn = (now or timezone.now()).astimezone(VN_TZ)
    expire_vn = current_vn + timedelta(minutes=15)

    vnp_params = {
        "vnp_Version": "2.1.0",
        "vnp_Command": "pay",
        "vnp_TmnCode": tmn_code,
        "vnp_Amount": str(amount_int * 100),
        "vnp_CurrCode": "VND",
        "vnp_TxnRef": txn_ref,
        "vnp_OrderInfo": _sanitize_order_info(order_info),
        "vnp_OrderType": "other",
        "vnp_Locale": locale if locale in {"vn", "en"} else "vn",
        "vnp_ReturnUrl": return_url,
        "vnp_IpAddr": ip_addr or "127.0.0.1",
        "vnp_CreateDate": current_vn.strftime("%Y%m%d%H%M%S"),
        "vnp_ExpireDate": expire_vn.strftime("%Y%m%d%H%M%S"),
    }
    if bank_code and re.fullmatch(r"[A-Za-z0-9_]{2,20}", bank_code.strip()):
        vnp_params["vnp_BankCode"] = bank_code.strip()

    query_string, signature = build_signed_query(vnp_params, hash_secret)
    separator = "&" if "?" in payment_url else "?"
    full_url = f"{payment_url}{separator}{query_string}&vnp_SecureHash={signature}"
    return full_url, expire_vn


def verify_vnpay_signature(query_params: dict, hash_secret: str) -> bool:
    if not hash_secret:
        return False
    received = str(query_params.get("vnp_SecureHash") or "").strip()
    if not received:
        return False
    vnp_only = {
        k: v
        for k, v in query_params.items()
        if str(k).startswith("vnp_") and k not in {"vnp_SecureHash", "vnp_SecureHashType"}
    }
    if not vnp_only:
        return False
    _, expected = build_signed_query(vnp_only, hash_secret)
    return hmac.compare_digest(expected.lower(), received.lower())


def _parse_txn_ref(txn_ref: str) -> tuple[str, int] | None:
    raw = str(txn_ref or "").strip()
    if "P" not in raw:
        return None
    order_number, _, payment_id_str = raw.rpartition("P")
    if not order_number or not payment_id_str.isdigit():
        return None
    return order_number, int(payment_id_str)


@transaction.atomic
def create_vnpay_payment_attempt(order: Order, request, bank_code: str = "", locale: str = "vn") -> dict:
    tmn_code = (getattr(settings, "VNPAY_TMN_CODE", "") or "").strip()
    hash_secret = (getattr(settings, "VNPAY_HASH_SECRET", "") or "").strip()
    payment_url = (getattr(settings, "VNPAY_PAYMENT_URL", "") or "").strip()
    return_url = (getattr(settings, "VNPAY_RETURN_URL", "") or "").strip()
    if not tmn_code or not hash_secret:
        raise ValidationError({"vnpay": ["Máy chủ chưa cấu hình VNPAY_TMN_CODE / VNPAY_HASH_SECRET."]})

    locked_order = Order.objects.select_for_update().get(pk=order.pk)
    if locked_order.status != OrderStatus.PENDING:
        raise ValidationError({"order": ["Chỉ có thể thanh toán VNPay cho đơn hàng đang ở trạng thái chờ xử lý."]})
    if locked_order.payments.filter(status__in=[Payment.Status.SUCCEEDED, Payment.Status.REFUNDED]).exists():
        raise ValidationError({"payment": ["Đơn hàng này đã được thanh toán trước đó."]})

    # Cancel any earlier unfinished pending attempt so payments_one_pending_uq stays valid
    locked_order.payments.filter(status=Payment.Status.PENDING).update(status=Payment.Status.CANCELLED)

    payment = Payment.objects.create(
        order=locked_order,
        provider=Payment.Provider.VNPAY,
        amount=locked_order.grand_total,
        status=Payment.Status.PENDING,
    )
    txn_ref = f"{locked_order.order_number}P{payment.id}"
    payment.provider_reference = txn_ref
    payment.save(update_fields=["provider_reference"])

    url, expires_at = build_vnpay_payment_url(
        tmn_code=tmn_code,
        hash_secret=hash_secret,
        payment_url=payment_url,
        return_url=return_url,
        txn_ref=txn_ref,
        amount_vnd=int(locked_order.grand_total),
        order_info=f"Thanh toan don hang {locked_order.order_number}",
        ip_addr=get_client_ip(request),
        bank_code=bank_code,
        locale=locale,
    )
    return {
        "payment_url": url,
        "txn_ref": txn_ref,
        "expires_at": expires_at.isoformat(),
        "payment": payment,
    }


def _confirm_vnpay_payment_locked(order: Order, payment: Payment, *, txn_ref: str, vnp_tx_no: str, source: str):
    now = timezone.now()
    ref_value = vnp_tx_no or txn_ref
    if (
        ref_value
        and Payment.objects.filter(provider=Payment.Provider.VNPAY, provider_reference=ref_value)
        .exclude(pk=payment.pk)
        .exists()
    ):
        ref_value = f"{txn_ref}:{vnp_tx_no}"[:150]

    payment.status = Payment.Status.SUCCEEDED
    payment.paid_at = now
    payment.provider_reference = ref_value[:150]
    payment.save(update_fields=["status", "paid_at", "provider_reference"])

    old_status = order.status
    if order.status == OrderStatus.PENDING:
        if (
            hasattr(order, "voucher_redemption")
            and order.voucher_redemption.status == VoucherRedemption.Status.RESERVED
        ):
            order.voucher_redemption.status = VoucherRedemption.Status.USED
            order.voucher_redemption.save(update_fields=["status", "updated_at"])
        order.reservations.filter(status="active").update(expires_at=now + timedelta(days=7))
        order.status = OrderStatus.CONFIRMED
        order.save(update_fields=["status", "updated_at"])
        OrderStatusHistory.objects.create(
            order=order,
            from_status=old_status,
            to_status=OrderStatus.CONFIRMED,
            actor=None,
            reason=f"Thanh toán VNPay thành công ({ref_value})",
        )
        OutboxEvent.objects.create(
            topic="order.confirmed",
            aggregate_id=str(order.public_id),
            payload={"order_number": order.order_number, "status": OrderStatus.CONFIRMED},
        )

    AuditLog.objects.create(
        actor=None,
        action="payment.vnpay_confirmed",
        entity_type="Order",
        entity_id=order.order_number,
        changes={
            "payment_id": payment.id,
            "txn_ref": txn_ref,
            "vnp_TransactionNo": vnp_tx_no,
            "amount": int(payment.amount),
            "source": source,
        },
    )
    OutboxEvent.objects.create(
        topic="payment.succeeded",
        aggregate_id=str(order.public_id),
        payload={
            "order_number": order.order_number,
            "provider": Payment.Provider.VNPAY,
            "amount": int(payment.amount),
            "txn_ref": txn_ref,
        },
    )


def _normalize_params(raw_params) -> dict:
    if hasattr(raw_params, "items"):
        return {str(k): str(v) for k, v in raw_params.items()}
    return {}


@transaction.atomic
def process_vnpay_callback(raw_params, *, source: str = "ipn", request_user=None) -> dict:
    params = _normalize_params(raw_params)
    tmn_code = (getattr(settings, "VNPAY_TMN_CODE", "") or "").strip()
    hash_secret = (getattr(settings, "VNPAY_HASH_SECRET", "") or "").strip()

    if not tmn_code or not hash_secret:
        return {"rsp_code": "99", "message": "Máy chủ chưa cấu hình VNPay.", "verified": False, "paid": False}

    if not verify_vnpay_signature(params, hash_secret):
        return {"rsp_code": "97", "message": "Chữ ký giao dịch VNPay không hợp lệ.", "verified": False, "paid": False}

    if str(params.get("vnp_TmnCode") or "").strip() != tmn_code:
        return {"rsp_code": "97", "message": "Mã website (vnp_TmnCode) không khớp.", "verified": False, "paid": False}

    curr_code = str(params.get("vnp_CurrCode") or "VND").strip().upper()
    if curr_code != "VND":
        return {"rsp_code": "04", "message": "Loại tiền tệ không hợp lệ.", "verified": True, "paid": False}

    parsed_ref = _parse_txn_ref(params.get("vnp_TxnRef", ""))
    if not parsed_ref:
        return {"rsp_code": "01", "message": "Mã tham chiếu giao dịch không tồn tại.", "verified": True, "paid": False}
    order_number, payment_id = parsed_ref

    order_qs = Order.objects.select_for_update().filter(order_number=order_number)
    if request_user is not None:
        order_qs = order_qs.filter(user=request_user)
    order = order_qs.first()
    if not order:
        return {"rsp_code": "01", "message": "Không tìm thấy đơn hàng tương ứng.", "verified": True, "paid": False}

    payment = order.payments.select_for_update().filter(pk=payment_id, provider=Payment.Provider.VNPAY).first()
    if not payment:
        return {"rsp_code": "01", "message": "Không tìm thấy giao dịch thanh toán tương ứng.", "verified": True, "paid": False}

    raw_amount = str(params.get("vnp_Amount") or "").strip()
    if not raw_amount.isdigit() or int(raw_amount) != int(payment.amount) * 100:
        return {
            "rsp_code": "04",
            "message": "Số tiền giao dịch VNPay không khớp với giá trị đơn hàng.",
            "verified": True,
            "paid": False,
            "order": order,
            "payment": payment,
        }

    response_code = str(params.get("vnp_ResponseCode") or "").strip()
    tx_status = str(params.get("vnp_TransactionStatus") or "").strip()
    vnp_tx_no = str(params.get("vnp_TransactionNo") or "").strip()
    txn_ref = params.get("vnp_TxnRef", "")

    if payment.status == Payment.Status.SUCCEEDED or order.payments.filter(
        status__in=[Payment.Status.SUCCEEDED, Payment.Status.REFUNDED]
    ).exists():
        return {
            "rsp_code": "02",
            "message": "Giao dịch này đã được xác nhận thanh toán trước đó.",
            "verified": True,
            "paid": True,
            "response_code": response_code or "00",
            "transaction_no": vnp_tx_no or payment.provider_reference,
            "order": order,
            "payment": payment,
        }

    if order.status in {OrderStatus.CANCELLED, OrderStatus.EXPIRED}:
        return {
            "rsp_code": "02",
            "message": "Đơn hàng đã bị hủy hoặc hết hạn giữ chỗ.",
            "verified": True,
            "paid": False,
            "response_code": response_code,
            "transaction_no": vnp_tx_no,
            "order": order,
            "payment": payment,
        }

    is_success = response_code == "00" and (not tx_status or tx_status == "00")
    allow_return_reconcile = bool(getattr(settings, "VNPAY_ALLOW_RETURN_RECONCILE", False))

    if source == "return" and not allow_return_reconcile:
        # Strict mode (e.g. production): return URL only verifies signature and reflects current DB state.
        return {
            "rsp_code": "00" if is_success else response_code or "99",
            "message": (
                "Chữ ký VNPay hợp lệ. Đang chờ hệ thống đồng bộ xác nhận IPN từ cổng thanh toán."
                if is_success
                else vnpay_response_message(response_code)
            ),
            "verified": True,
            "paid": payment.status == Payment.Status.SUCCEEDED,
            "awaiting_ipn": is_success and payment.status != Payment.Status.SUCCEEDED,
            "response_code": response_code,
            "transaction_no": vnp_tx_no,
            "order": order,
            "payment": payment,
        }

    if is_success:
        _confirm_vnpay_payment_locked(
            order,
            payment,
            txn_ref=txn_ref,
            vnp_tx_no=vnp_tx_no,
            source=source,
        )
        return {
            "rsp_code": "00",
            "message": "Thanh toán VNPay thành công.",
            "verified": True,
            "paid": True,
            "response_code": response_code,
            "transaction_no": vnp_tx_no or payment.provider_reference,
            "order": order,
            "payment": payment,
        }

    # Payment failed / user cancelled at VNPay gateway: close attempt cleanly while keeping order PENDING
    if payment.status == Payment.Status.PENDING:
        payment.status = Payment.Status.CANCELLED if response_code == "24" else Payment.Status.FAILED
        payment.save(update_fields=["status"])
        AuditLog.objects.create(
            actor=None,
            action="payment.vnpay_failed",
            entity_type="Order",
            entity_id=order.order_number,
            changes={
                "payment_id": payment.id,
                "txn_ref": txn_ref,
                "response_code": response_code,
                "tx_status": tx_status,
                "source": source,
            },
        )
    return {
        "rsp_code": "00",
        "message": vnpay_response_message(response_code),
        "verified": True,
        "paid": False,
        "response_code": response_code,
        "transaction_no": vnp_tx_no,
        "order": order,
        "payment": payment,
    }
