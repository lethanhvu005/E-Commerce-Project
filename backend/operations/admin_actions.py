"""Admin write APIs: vouchers (#18), moderation (#19), customer lock/unlock (#20)."""
from datetime import datetime, time
from decimal import Decimal, InvalidOperation
from zoneinfo import ZoneInfo

from django.contrib.auth import get_user_model
from django.db import IntegrityError, transaction
from django.db.models import Count, DecimalField, Q, Sum, Value
from django.db.models.functions import Coalesce
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.utils.dateparse import parse_date, parse_datetime
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from community.models import ModerationStatus, ProductAnswer, ProductQuestion, Review
from orders.models import Order
from payments.models import Payment
from promotions.models import Voucher, VoucherRedemption

from .models import AuditLog
from .views import require_permissions


def _audit(actor, action, entity_type, entity_id, changes):
    AuditLog.objects.create(
        actor=actor,
        action=action,
        entity_type=entity_type,
        entity_id=str(entity_id),
        changes=changes,
    )


# ---------------------------------------------------------------------------
# #18 Vouchers
# ---------------------------------------------------------------------------

VOUCHER_FIELDS = ("code", "kind", "value", "max_discount", "min_subtotal", "usage_limit", "per_user_limit", "starts_at", "ends_at", "is_active")


def _to_decimal(raw, field, errors, allow_null=False):
    if raw in (None, ""):
        if allow_null:
            return None
        errors[field] = ["Trường này là bắt buộc."]
        return None
    try:
        value = Decimal(str(raw))
    except (InvalidOperation, ValueError):
        errors[field] = ["Giá trị số không hợp lệ."]
        return None
    if value != value.to_integral_value():
        errors[field] = ["Chỉ nhận số nguyên (VND)."]
        return None
    return value


def _to_int(raw, field, errors, allow_null=False, minimum=1):
    if raw in (None, ""):
        if allow_null:
            return None
        errors[field] = ["Trường này là bắt buộc."]
        return None
    try:
        value = int(raw)
    except (TypeError, ValueError):
        errors[field] = ["Phải là số nguyên."]
        return None
    if value < minimum:
        errors[field] = [f"Giá trị tối thiểu là {minimum}."]
        return None
    return value


VN_TZ = ZoneInfo("Asia/Ho_Chi_Minh")


def _parse_bool(raw, field, errors):
    if isinstance(raw, bool):
        return raw
    if isinstance(raw, (int, float)) and raw in (0, 1):
        return bool(raw)
    if isinstance(raw, str):
        norm = raw.strip().lower()
        if norm in ("true", "1", "yes"):
            return True
        if norm in ("false", "0", "no"):
            return False
    errors[field] = ["Giá trị boolean không hợp lệ."]
    return None


def _to_datetime(raw, field, errors, end_of_day=False):
    if isinstance(raw, str):
        raw_str = raw.strip()
        value = parse_datetime(raw_str)
        if value is None:
            parsed_date = parse_date(raw_str)
            if parsed_date is not None:
                value = datetime.combine(parsed_date, time(23, 59, 59) if end_of_day else time.min)
    else:
        value = raw
    if value is None:
        errors[field] = ["Thời gian không hợp lệ (định dạng ISO 8601 hoặc YYYY-MM-DD)."]
        return None
    if timezone.is_naive(value):
        value = timezone.make_aware(value, VN_TZ)
    return value


def validate_voucher_payload(data, instance=None):
    """Return (cleaned_dict, errors). Partial update when instance is given."""
    errors = {}
    cleaned = {}
    current = {f: getattr(instance, f) for f in VOUCHER_FIELDS} if instance else {}

    if "code" in data or instance is None:
        code = str(data.get("code") or "").strip().upper()
        if not code:
            errors["code"] = ["Mã voucher là bắt buộc."]
        elif len(code) > 40 or not all(ch.isalnum() or ch in "-_" for ch in code):
            errors["code"] = ["Mã chỉ gồm chữ, số, '-' hoặc '_' và tối đa 40 ký tự."]
        else:
            dup = Voucher.objects.filter(code=code)
            if instance:
                dup = dup.exclude(pk=instance.pk)
            if dup.exists():
                errors["code"] = ["Mã voucher đã tồn tại."]
            cleaned["code"] = code

    if "kind" in data or instance is None:
        kind = data.get("kind")
        if kind not in Voucher.Kind.values:
            errors["kind"] = ["Loại voucher không hợp lệ (percent, fixed, free_ship)."]
        else:
            cleaned["kind"] = kind

    effective_kind = cleaned.get("kind") or current.get("kind")
    if "value" in data or instance is None:
        raw_value = data.get("value")
        if raw_value in (None, "") and effective_kind == Voucher.Kind.FREE_SHIP:
            raw_value = 0
        val = _to_decimal(raw_value, "value", errors)
        if val is not None:
            cleaned["value"] = val
    elif effective_kind == Voucher.Kind.FREE_SHIP and instance is not None and instance.kind != Voucher.Kind.FREE_SHIP:
        cleaned["value"] = Decimal("0")

    if "max_discount" in data:
        md = _to_decimal(data.get("max_discount"), "max_discount", errors, allow_null=True)
        if md is not None and md < 0:
            errors["max_discount"] = ["Không được âm."]
        else:
            cleaned["max_discount"] = md
    if "min_subtotal" in data:
        raw_min = data.get("min_subtotal")
        ms = _to_decimal(0 if raw_min in (None, "") else raw_min, "min_subtotal", errors)
        if ms is not None and ms < 0:
            errors["min_subtotal"] = ["Không được âm."]
        elif ms is not None:
            cleaned["min_subtotal"] = ms
    if "usage_limit" in data:
        cleaned["usage_limit"] = _to_int(data.get("usage_limit"), "usage_limit", errors, allow_null=True)
    if "per_user_limit" in data:
        raw_pul = data.get("per_user_limit")
        pul = _to_int(1 if raw_pul in (None, "") else raw_pul, "per_user_limit", errors)
        if pul is not None:
            cleaned["per_user_limit"] = pul
    for f in ("starts_at", "ends_at"):
        if f in data or instance is None:
            dt = _to_datetime(data.get(f), f, errors, end_of_day=(f == "ends_at"))
            if dt is not None:
                cleaned[f] = dt
    if "is_active" in data:
        parsed_active = _parse_bool(data.get("is_active"), "is_active", errors)
        if parsed_active is not None:
            cleaned["is_active"] = parsed_active

    merged = {**current, **cleaned}
    kind = merged.get("kind")
    value = merged.get("value")
    if kind and value is not None and "value" not in errors:
        if kind == Voucher.Kind.PERCENT and not (1 <= value <= 100):
            errors["value"] = ["Voucher phần trăm phải từ 1 đến 100."]
        elif kind == Voucher.Kind.FIXED and value <= 0:
            errors["value"] = ["Voucher giảm cố định phải lớn hơn 0."]
        elif kind == Voucher.Kind.FREE_SHIP and value != 0:
            if "value" in data:
                errors["value"] = ["Voucher miễn phí vận chuyển phải có giá trị 0."]
            else:
                cleaned["value"] = Decimal("0")
    starts, ends = merged.get("starts_at"), merged.get("ends_at")
    if starts and ends and ends <= starts and "ends_at" not in errors:
        errors["ends_at"] = ["Thời gian kết thúc phải sau thời gian bắt đầu."]
    if instance is not None and "usage_limit" in cleaned and cleaned["usage_limit"] is not None:
        used = instance.redemptions.filter(status__in=[VoucherRedemption.Status.RESERVED, VoucherRedemption.Status.USED]).count()
        if cleaned["usage_limit"] < used:
            errors["usage_limit"] = [f"Không thể đặt giới hạn thấp hơn số lượt đã dùng ({used})."]
    return cleaned, errors


def serialize_voucher(v):
    used = v.redemptions.filter(status__in=[VoucherRedemption.Status.RESERVED, VoucherRedemption.Status.USED]).count()
    return {
        "id": v.id,
        "code": v.code,
        "kind": v.kind,
        "value": v.value,
        "max_discount": v.max_discount,
        "min_subtotal": v.min_subtotal,
        "usage_limit": v.usage_limit,
        "per_user_limit": v.per_user_limit,
        "used_count": used,
        "is_active": v.is_active,
        "starts_at": v.starts_at,
        "ends_at": v.ends_at,
    }


def create_voucher_for_request(request):
    denied = require_permissions(request, ["promotions.add_voucher"])
    if denied:
        return denied
    cleaned, errors = validate_voucher_payload(request.data)
    if errors:
        return Response(errors, status=status.HTTP_400_BAD_REQUEST)
    try:
        with transaction.atomic():
            voucher = Voucher.objects.create(**cleaned)
            _audit(request.user, "voucher.created", "Voucher", voucher.code, {k: str(v) for k, v in cleaned.items()})
    except IntegrityError:
        return Response({"detail": "Dữ liệu voucher vi phạm ràng buộc (mã trùng hoặc giá trị không hợp lệ)."}, status=status.HTTP_400_BAD_REQUEST)
    return Response(serialize_voucher(voucher), status=status.HTTP_201_CREATED)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def admin_voucher_create(request):
    return create_voucher_for_request(request)


@api_view(["GET", "PATCH", "PUT"])
@permission_classes([IsAuthenticated])
def admin_voucher_detail(request, voucher_id):
    perm = "promotions.view_voucher" if request.method == "GET" else "promotions.change_voucher"
    denied = require_permissions(request, [perm])
    if denied:
        return denied
    if request.method == "GET":
        voucher = get_object_or_404(Voucher, pk=voucher_id)
        return Response(serialize_voucher(voucher))
    try:
        with transaction.atomic():
            voucher = get_object_or_404(Voucher.objects.select_for_update(), pk=voucher_id)
            cleaned, errors = validate_voucher_payload(request.data, instance=voucher)
            if errors:
                return Response(errors, status=status.HTTP_400_BAD_REQUEST)
            before = {k: str(getattr(voucher, k)) for k in cleaned}
            for k, v in cleaned.items():
                setattr(voucher, k, v)
            voucher.save(update_fields=list(cleaned.keys()) or None)
            _audit(request.user, "voucher.updated", "Voucher", voucher.code, {"before": before, "after": {k: str(v) for k, v in cleaned.items()}})
    except IntegrityError:
        return Response({"detail": "Dữ liệu voucher vi phạm ràng buộc."}, status=status.HTTP_400_BAD_REQUEST)
    return Response(serialize_voucher(voucher))


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def admin_voucher_status(request, voucher_id):
    denied = require_permissions(request, ["promotions.change_voucher"])
    if denied:
        return denied
    if "is_active" not in request.data:
        return Response({"is_active": ["Trường này là bắt buộc."]}, status=status.HTTP_400_BAD_REQUEST)
    errors = {}
    next_active = _parse_bool(request.data.get("is_active"), "is_active", errors)
    if errors:
        return Response(errors, status=status.HTTP_400_BAD_REQUEST)
    with transaction.atomic():
        voucher = get_object_or_404(Voucher.objects.select_for_update(), pk=voucher_id)
        old = voucher.is_active
        if old != next_active:
            voucher.is_active = next_active
            voucher.save(update_fields=["is_active"])
            _audit(
                request.user,
                "voucher.activated" if next_active else "voucher.deactivated",
                "Voucher",
                voucher.code,
                {"from": old, "to": next_active},
            )
    return Response(serialize_voucher(voucher))


# ---------------------------------------------------------------------------
# #19 Moderation
# ---------------------------------------------------------------------------

MODERATION_MODELS = {
    "reviews": (Review, "community.change_review", "Review"),
    "questions": (ProductQuestion, "community.change_productquestion", "ProductQuestion"),
    "answers": (ProductAnswer, "community.change_productanswer", "ProductAnswer"),
}


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def admin_moderate(request, kind, object_id):
    if kind not in MODERATION_MODELS:
        return Response({"detail": "Loại nội dung không hợp lệ."}, status=status.HTTP_404_NOT_FOUND)
    model, perm, entity = MODERATION_MODELS[kind]
    denied = require_permissions(request, [perm])
    if denied:
        return denied
    new_status = (request.data.get("status") or "").strip()
    reason = (request.data.get("reason") or "").strip()[:500]
    if new_status not in (ModerationStatus.PUBLISHED, ModerationStatus.REJECTED, ModerationStatus.PENDING):
        return Response({"status": ["Trạng thái phải là published, rejected hoặc pending."]}, status=status.HTTP_400_BAD_REQUEST)
    if new_status == ModerationStatus.REJECTED and not reason:
        return Response({"reason": ["Vui lòng nhập lý do từ chối."]}, status=status.HTTP_400_BAD_REQUEST)
    with transaction.atomic():
        obj = get_object_or_404(model.objects.select_for_update(), pk=object_id)
        old_status = obj.status
        if old_status == new_status:
            return Response({"id": obj.id, "status": obj.status, "changed": False})
        if kind == "reviews" and new_status == ModerationStatus.PUBLISHED and not obj.is_verified_buyer:
            return Response(
                {
                    "status": [
                        "Đánh giá này không gắn với đơn hàng đã giao thành công của người dùng nên không đủ điều kiện công khai."
                    ]
                },
                status=status.HTTP_400_BAD_REQUEST,
            )
        obj.status = new_status
        fields = ["status"]
        if hasattr(obj, "updated_at"):
            fields.append("updated_at")
        obj.save(update_fields=fields)
        _audit(request.user, f"{kind}.moderated", entity, obj.id, {"from": old_status, "to": new_status, "reason": reason})
    return Response({"id": obj.id, "status": obj.status, "changed": True})


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def admin_answer_question(request, question_id):
    denied = require_permissions(request, ["community.add_productanswer"])
    if denied:
        return denied
    body = (request.data.get("body") or "").strip()
    if len(body) < 5 or len(body) > 2000:
        return Response({"body": ["Nội dung trả lời phải từ 5 đến 2000 ký tự."]}, status=status.HTTP_400_BAD_REQUEST)
    with transaction.atomic():
        question = get_object_or_404(ProductQuestion.objects.select_for_update(), pk=question_id)
        if question.status != ModerationStatus.PUBLISHED:
            return Response(
                {"detail": "Chỉ được gửi phản hồi công khai cho câu hỏi đã được duyệt (published)."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        answer = ProductAnswer.objects.create(
            question=question, user=request.user, body=body, status=ModerationStatus.PUBLISHED
        )
        _audit(request.user, "answers.staff_created", "ProductAnswer", answer.id, {"question_id": question.id})
    return Response(
        {"id": answer.id, "question_id": question.id, "body": answer.body, "status": answer.status, "is_staff_answer": True},
        status=status.HTTP_201_CREATED,
    )


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def admin_question_answers(request, question_id):
    denied = require_permissions(request, ["community.view_productanswer"])
    if denied:
        return denied
    question = get_object_or_404(ProductQuestion, pk=question_id)
    answers = question.answers.select_related("user").order_by("created_at", "id")
    return Response(
        {
            "results": [
                {
                    "id": a.id,
                    "author": a.user.get_full_name() or a.user.email,
                    "is_staff_answer": a.user.is_staff,
                    "body": a.body,
                    "status": a.status,
                    "created_at": a.created_at,
                }
                for a in answers
            ]
        }
    )


# ---------------------------------------------------------------------------
# #20 Customers
# ---------------------------------------------------------------------------


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def admin_customer_detail(request, user_id):
    denied = require_permissions(request, ["accounts.view_user", "orders.view_order"])
    if denied:
        return denied
    User = get_user_model()
    user = get_object_or_404(User, pk=user_id)
    orders = list(
        Order.objects.filter(user=user)
        .order_by("-created_at", "-id")
        .values("public_id", "order_number", "status", "grand_total", "created_at")[:20]
    )
    paid_total = Payment.objects.filter(order__user=user, status=Payment.Status.SUCCEEDED).aggregate(
        v=Coalesce(Sum("amount"), Value(0), output_field=DecimalField(max_digits=14, decimal_places=0))
    )["v"]
    refunded_total = Payment.objects.filter(order__user=user, status=Payment.Status.REFUNDED).aggregate(
        v=Coalesce(Sum("amount"), Value(0), output_field=DecimalField(max_digits=14, decimal_places=0))
    )["v"]
    total_orders_count = Order.objects.filter(user=user).count()
    valid_orders_count = Order.objects.filter(user=user).exclude(status__in=["cancelled", "expired"]).count()
    return Response(
        {
            "id": user.id,
            "email": user.email,
            "full_name": user.get_full_name() or user.email,
            "phone": user.phone,
            "is_active": user.is_active,
            "is_staff": user.is_staff,
            "date_joined": user.date_joined,
            "last_login": user.last_login,
            "orders_count": valid_orders_count,
            "valid_orders_count": valid_orders_count,
            "total_orders_count": total_orders_count,
            "customer_paid_total": paid_total,
            "refunded_total": refunded_total,
            "addresses_count": user.addresses.count(),
            "recent_orders": orders,
        }
    )


def _revoke_refresh_tokens(user):
    try:
        from rest_framework_simplejwt.token_blacklist.models import BlacklistedToken, OutstandingToken
    except Exception:  # pragma: no cover
        return 0
    revoked = 0
    for token in OutstandingToken.objects.filter(user=user):
        _, created = BlacklistedToken.objects.get_or_create(token=token)
        revoked += int(created)
    return revoked


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def admin_customer_status(request, user_id):
    denied = require_permissions(request, ["accounts.change_user"])
    if denied:
        return denied
    if "is_active" not in request.data:
        return Response({"is_active": ["Trường này là bắt buộc."]}, status=status.HTTP_400_BAD_REQUEST)
    allowed = {"is_active", "reason"}
    rejected = set(request.data.keys()) - allowed
    if rejected:
        return Response({f: ["Không được sửa trường này tại API khóa/mở tài khoản."] for f in rejected}, status=status.HTTP_400_BAD_REQUEST)
    bool_errors = {}
    make_active = _parse_bool(request.data.get("is_active"), "is_active", bool_errors)
    if bool_errors:
        return Response(bool_errors, status=status.HTTP_400_BAD_REQUEST)
    reason = (request.data.get("reason") or "").strip()[:500]
    User = get_user_model()
    with transaction.atomic():
        user = get_object_or_404(User.objects.select_for_update(), pk=user_id)
        if user.pk == request.user.pk:
            return Response({"detail": "Không thể tự khóa tài khoản của chính bạn."}, status=status.HTTP_400_BAD_REQUEST)
        if (user.is_superuser or user.is_staff) and not request.user.is_superuser:
            return Response({"detail": "Chỉ superuser mới được khóa/mở tài khoản nhân viên hoặc quản trị."}, status=status.HTTP_403_FORBIDDEN)
        if user.is_superuser and not make_active:
            return Response({"detail": "Không được khóa tài khoản superuser qua API này."}, status=status.HTTP_403_FORBIDDEN)
        if not make_active and not reason:
            return Response({"reason": ["Vui lòng nhập lý do khóa tài khoản."]}, status=status.HTTP_400_BAD_REQUEST)
        old = user.is_active
        if old == make_active:
            return Response(
                {
                    "id": user.id,
                    "is_active": user.is_active,
                    "changed": False,
                    "revoked_refresh_tokens": 0,
                }
            )
        user.is_active = make_active
        user.save(update_fields=["is_active"])
        revoked = 0 if make_active else _revoke_refresh_tokens(user)
        _audit(
            request.user,
            "customer.unlocked" if make_active else "customer.locked",
            "User",
            user.id,
            {"from": old, "to": make_active, "reason": reason, "revoked_refresh_tokens": revoked},
        )
    return Response({"id": user.id, "is_active": user.is_active, "changed": True, "revoked_refresh_tokens": revoked})
