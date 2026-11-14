from datetime import datetime, time, timedelta
from decimal import Decimal
from zoneinfo import ZoneInfo

from django.contrib.auth import get_user_model
from django.db import transaction
from django.db.models import Count, DecimalField, F, OuterRef, Q, Subquery, Sum, Value
from django.db.models.functions import Coalesce, TruncDate
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.utils.dateparse import parse_date
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.pagination import PageNumberPagination
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import AuditLog, OutboxEvent
from .outbox import outbox_metrics
from .serializers import AuditLogSerializer
from catalog.models import Product
from community.models import ProductQuestion, Review
from inventory.models import InventoryBalance
from inventory.serializers import InventoryBalanceSerializer
from orders.models import Order, OrderStatus
from orders.services import confirm_order_payment, release_expired_reservations, transition_order_status
from payments.models import Payment
from promotions.models import Voucher, VoucherRedemption

VN_TZ = ZoneInfo("Asia/Ho_Chi_Minh")

METRIC_DEFINITIONS = {
    "timezone": "Asia/Ho_Chi_Minh",
    "gross_order_value": "Tổng grand_total của các đơn hàng hợp lệ (loại trừ cancelled và expired) theo Order.created_at.",
    "paid_revenue": "Tổng Payment.amount có status=succeeded theo Payment.paid_at; không tính pending COD, failed, cancelled hoặc refunded.",
    "refund_amount": "Tổng Payment.amount có status=refunded theo Payment.paid_at.",
    "net_revenue": "Doanh thu thực thu còn lại (bằng paid_revenue vì mỗi đơn hàng chỉ có tối đa một thanh toán succeeded hoặc refunded toàn phần).",
    "customer_paid_total": "Tổng Payment.amount có status=succeeded thuộc các đơn hàng của khách hàng.",
}


def require_permissions(request, permissions):
    if not request.user.is_staff or not request.user.has_perms(permissions):
        return Response({"detail": "Bạn không có quyền xem dữ liệu quản trị này."}, status=status.HTTP_403_FORBIDDEN)


class AdminListPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = "page_size"
    max_page_size = 100


class AdminAuditPagination(PageNumberPagination):
    page_size = 50
    page_size_query_param = "page_size"
    max_page_size = 100


def _compute_analytics(start_dt=None, end_exclusive=None):
    valid_orders = Order.objects.exclude(status__in=[OrderStatus.CANCELLED, OrderStatus.EXPIRED])
    succeeded_payments = Payment.objects.filter(status=Payment.Status.SUCCEEDED)
    refunded_payments = Payment.objects.filter(status=Payment.Status.REFUNDED)

    if start_dt is not None:
        valid_orders = valid_orders.filter(created_at__gte=start_dt)
        succeeded_payments = succeeded_payments.filter(paid_at__gte=start_dt)
        refunded_payments = refunded_payments.filter(paid_at__gte=start_dt)
    if end_exclusive is not None:
        valid_orders = valid_orders.filter(created_at__lt=end_exclusive)
        succeeded_payments = succeeded_payments.filter(paid_at__lt=end_exclusive)
        refunded_payments = refunded_payments.filter(paid_at__lt=end_exclusive)

    zero_dec = DecimalField(max_digits=14, decimal_places=0)
    gross_order_value = valid_orders.aggregate(v=Coalesce(Sum("grand_total"), Value(0), output_field=zero_dec))["v"]
    paid_revenue = succeeded_payments.aggregate(v=Coalesce(Sum("amount"), Value(0), output_field=zero_dec))["v"]
    refund_amount = refunded_payments.aggregate(v=Coalesce(Sum("amount"), Value(0), output_field=zero_dec))["v"]
    net_revenue = paid_revenue
    settled_gross = paid_revenue + refund_amount
    orders_count = valid_orders.count()
    avg_order_value = Decimal(int(gross_order_value // orders_count)) if orders_count else Decimal("0")

    days_map = {}

    def _ensure_day(day_val):
        if day_val not in days_map:
            days_map[day_val] = {
                "day": day_val,
                "orders": 0,
                "gross_order_value": Decimal("0"),
                "paid_revenue": Decimal("0"),
                "refund_amount": Decimal("0"),
                "net_revenue": Decimal("0"),
                "revenue": Decimal("0"),
            }
        return days_map[day_val]

    for row in (
        valid_orders.annotate(day=TruncDate("created_at", tzinfo=VN_TZ))
        .values("day")
        .annotate(orders=Count("id"), gross=Coalesce(Sum("grand_total"), Value(0), output_field=zero_dec))
    ):
        entry = _ensure_day(row["day"])
        entry["orders"] = row["orders"]
        entry["gross_order_value"] = row["gross"]

    for row in (
        succeeded_payments.filter(paid_at__isnull=False)
        .annotate(day=TruncDate("paid_at", tzinfo=VN_TZ))
        .values("day")
        .annotate(paid=Coalesce(Sum("amount"), Value(0), output_field=zero_dec))
    ):
        entry = _ensure_day(row["day"])
        entry["paid_revenue"] = row["paid"]
        entry["net_revenue"] = row["paid"]
        entry["revenue"] = row["paid"]

    for row in (
        refunded_payments.filter(paid_at__isnull=False)
        .annotate(day=TruncDate("paid_at", tzinfo=VN_TZ))
        .values("day")
        .annotate(refund=Coalesce(Sum("amount"), Value(0), output_field=zero_dec))
    ):
        entry = _ensure_day(row["day"])
        entry["refund_amount"] = row["refund"]

    daily_series = [
        {**days_map[d], "day": d.isoformat()}
        for d in sorted(days_map.keys(), reverse=True)
        if d is not None
    ]
    return {
        "timezone": "Asia/Ho_Chi_Minh",
        "revenue": paid_revenue,
        "paid_revenue": paid_revenue,
        "gross_order_value": gross_order_value,
        "refund_amount": refund_amount,
        "net_revenue": net_revenue,
        "settled_gross": settled_gross,
        "orders_count": orders_count,
        "avg_order_value": avg_order_value,
        "daily_series": daily_series,
        "metric_definitions": METRIC_DEFINITIONS,
    }


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def dashboard(request):
    denied = require_permissions(
        request,
        [
            "orders.view_order",
            "catalog.view_product",
            "inventory.view_inventorybalance",
            "accounts.view_user",
        ],
    )
    if denied:
        return denied

    metrics = _compute_analytics()
    low_stock_qs = (
        InventoryBalance.objects.select_related("variant__product__category")
        .prefetch_related("variant__product__images")
        .filter(on_hand__lte=F("reserved") + F("low_stock_threshold"))
        .order_by(F("on_hand") - F("reserved"), "variant__sku")
    )
    low_stock = low_stock_qs.count()
    low_stock_items = InventoryBalanceSerializer(low_stock_qs[:6], many=True).data
    recent_orders = list(
        Order.objects.select_related("user")
        .order_by("-created_at", "-id")
        .values("public_id", "order_number", "user__email", "status", "grand_total", "created_at")[:8]
    )
    return Response(
        {
            "timezone": metrics["timezone"],
            "revenue": metrics["paid_revenue"],
            "paid_revenue": metrics["paid_revenue"],
            "gross_order_value": metrics["gross_order_value"],
            "refund_amount": metrics["refund_amount"],
            "net_revenue": metrics["net_revenue"],
            "revenue_definition": METRIC_DEFINITIONS["paid_revenue"],
            "metric_definitions": METRIC_DEFINITIONS,
            "orders_count": Order.objects.count(),
            "valid_orders_count": metrics["orders_count"],
            "products_count": Product.objects.count(),
            "customers_count": get_user_model().objects.filter(is_staff=False).count(),
            "low_stock_count": low_stock,
            "low_stock_items": low_stock_items,
            "orders_by_status": list(Order.objects.values("status").annotate(count=Count("id")).order_by("status")),
            "recent_orders": recent_orders,
        }
    )


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def audit_logs(request):
    denied = require_permissions(request, ["operations.view_auditlog"])
    if denied:
        return denied
    queryset = AuditLog.objects.select_related("actor").order_by("-created_at", "-id")
    q = (request.query_params.get("q") or "").strip()
    if q:
        queryset = queryset.filter(
            Q(action__icontains=q)
            | Q(entity_type__icontains=q)
            | Q(entity_id__icontains=q)
            | Q(actor__email__icontains=q)
        )
    paginator = AdminAuditPagination()
    page = paginator.paginate_queryset(queryset, request)
    return paginator.get_paginated_response(AuditLogSerializer(page, many=True).data)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def admin_orders(request):
    denied = require_permissions(request, ["orders.view_order"])
    if denied:
        return denied
    queryset = (
        Order.objects.select_related("user", "shipping_method", "voucher")
        .prefetch_related("payments")
        .annotate(items_count=Coalesce(Sum("items__quantity"), Value(0)))
        .order_by("-created_at", "-id")
    )
    q = (request.query_params.get("q") or "").strip()
    if q:
        queryset = queryset.filter(
            Q(order_number__icontains=q)
            | Q(user__email__icontains=q)
            | Q(user__first_name__icontains=q)
            | Q(user__last_name__icontains=q)
            | Q(status__icontains=q)
        )
    status_filter = (request.query_params.get("status") or "").strip()
    if status_filter:
        queryset = queryset.filter(status=status_filter)
    paginator = AdminListPagination()
    page = paginator.paginate_queryset(queryset, request)
    data = []
    for o in page:
        latest_payment = next(iter(o.payments.all()), None)
        data.append(
            {
                "id": o.id,
                "public_id": str(o.public_id),
                "order_number": o.order_number,
                "customer_email": o.user.email,
                "customer_name": o.user.get_full_name() or o.user.email,
                "created_at": o.created_at,
                "items_count": o.items_count,
                "grand_total": o.grand_total,
                "status": o.status,
                "shipping_method": o.shipping_method_snapshot,
                "voucher_code": o.voucher_code_snapshot,
                "payment_status": latest_payment.status if latest_payment else None,
                "payment_provider": latest_payment.provider if latest_payment else None,
            }
        )
    return paginator.get_paginated_response(data)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def admin_order_status(request, public_id):
    denied = require_permissions(request, ["orders.change_order"])
    if denied:
        return denied
    order = get_object_or_404(Order, public_id=public_id)
    next_status = (request.data.get("status") or "").strip()
    reason = (request.data.get("reason") or "").strip()
    confirm_cod = bool(request.data.get("confirm_cod_payment", False))
    updated = transition_order_status(
        order,
        to_status=next_status,
        actor=request.user,
        reason=reason,
        confirm_cod_payment=confirm_cod,
    )
    latest_payment = updated.payments.order_by("-created_at", "-id").first()
    return Response(
        {
            "public_id": str(updated.public_id),
            "order_number": updated.order_number,
            "status": updated.status,
            "payment_status": latest_payment.status if latest_payment else None,
        }
    )


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def admin_order_confirm_payment(request, public_id):
    denied = require_permissions(request, ["payments.change_payment"])
    if denied:
        return denied
    order = get_object_or_404(Order, public_id=public_id)
    provider_ref = (request.data.get("provider_reference") or "").strip()
    payment = confirm_order_payment(order, actor=request.user, provider_reference=provider_ref)
    return Response(
        {
            "public_id": str(order.public_id),
            "order_number": order.order_number,
            "payment_id": payment.id,
            "payment_status": payment.status,
            "paid_at": payment.paid_at,
        }
    )


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def admin_release_expired_reservations(request):
    denied = require_permissions(request, ["inventory.change_inventorybalance"])
    if denied:
        return denied
    released_count = release_expired_reservations()
    return Response({"released_count": released_count})


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def admin_customers(request):
    denied = require_permissions(request, ["accounts.view_user"])
    if denied:
        return denied
    UserModel = get_user_model()
    zero_dec = DecimalField(max_digits=14, decimal_places=0)
    orders_sub = (
        Order.objects.filter(user=OuterRef("pk"))
        .exclude(status__in=[OrderStatus.CANCELLED, OrderStatus.EXPIRED])
        .values("user")
    )
    orders_count_sub = orders_sub.annotate(c=Count("id")).values("c")[:1]
    gross_value_sub = orders_sub.annotate(s=Sum("grand_total")).values("s")[:1]
    paid_total_sub = (
        Payment.objects.filter(order__user=OuterRef("pk"), status=Payment.Status.SUCCEEDED)
        .values("order__user")
        .annotate(s=Sum("amount"))
        .values("s")[:1]
    )
    refunded_total_sub = (
        Payment.objects.filter(order__user=OuterRef("pk"), status=Payment.Status.REFUNDED)
        .values("order__user")
        .annotate(s=Sum("amount"))
        .values("s")[:1]
    )
    queryset = UserModel.objects.annotate(
        orders_count=Coalesce(Subquery(orders_count_sub), Value(0)),
        gross_order_value=Coalesce(Subquery(gross_value_sub), Value(0), output_field=zero_dec),
        customer_paid_total=Coalesce(Subquery(paid_total_sub), Value(0), output_field=zero_dec),
        refunded_total=Coalesce(Subquery(refunded_total_sub), Value(0), output_field=zero_dec),
    ).order_by("-date_joined", "-id")
    q = (request.query_params.get("q") or "").strip()
    if q:
        queryset = queryset.filter(
            Q(email__icontains=q)
            | Q(first_name__icontains=q)
            | Q(last_name__icontains=q)
            | Q(phone__icontains=q)
        )
    status_filter = (request.query_params.get("status") or "").strip().lower()
    if status_filter == "active":
        queryset = queryset.filter(is_active=True)
    elif status_filter == "locked":
        queryset = queryset.filter(is_active=False)
    paginator = AdminListPagination()
    page = paginator.paginate_queryset(queryset, request)
    data = [
        {
            "id": u.id,
            "email": u.email,
            "full_name": u.get_full_name() or u.email,
            "phone": u.phone,
            "role": "Quản trị / Nhân viên" if u.is_staff else "Khách hàng thành viên",
            "is_staff": u.is_staff,
            "is_superuser": u.is_superuser,
            "orders_count": u.orders_count,
            "customer_paid_total": u.customer_paid_total,
            "total_spent": u.customer_paid_total,
            "gross_order_value": u.gross_order_value,
            "refunded_total": u.refunded_total,
            "is_active": u.is_active,
            "date_joined": u.date_joined,
        }
        for u in page
    ]
    return paginator.get_paginated_response(data)


@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def admin_promotions(request):
    if request.method == "POST":
        from .admin_actions import create_voucher_for_request

        return create_voucher_for_request(request)
    denied = require_permissions(request, ["promotions.view_voucher"])
    if denied:
        return denied
    active_redemption_filter = Q(
        redemptions__status__in=[VoucherRedemption.Status.RESERVED, VoucherRedemption.Status.USED]
    )
    queryset = Voucher.objects.annotate(
        used_count=Count("redemptions", filter=active_redemption_filter, distinct=True)
    ).order_by("code")
    q = (request.query_params.get("q") or "").strip()
    if q:
        queryset = queryset.filter(Q(code__icontains=q) | Q(kind__icontains=q))
    status_filter = (request.query_params.get("status") or "").strip().lower()
    if status_filter == "active":
        queryset = queryset.filter(is_active=True)
    elif status_filter == "inactive":
        queryset = queryset.filter(is_active=False)
    kind_filter = (request.query_params.get("kind") or "").strip().lower()
    if kind_filter in Voucher.Kind.values:
        queryset = queryset.filter(kind=kind_filter)
    paginator = AdminListPagination()
    page = paginator.paginate_queryset(queryset, request)
    data = [
        {
            "id": v.id,
            "code": v.code,
            "kind": v.kind,
            "value": v.value,
            "max_discount": v.max_discount,
            "min_subtotal": v.min_subtotal,
            "usage_limit": v.usage_limit,
            "per_user_limit": v.per_user_limit,
            "used_count": v.used_count,
            "is_active": v.is_active,
            "starts_at": v.starts_at,
            "ends_at": v.ends_at,
        }
        for v in page
    ]
    return paginator.get_paginated_response(data)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def admin_reviews(request):
    denied = require_permissions(request, ["community.view_review"])
    if denied:
        return denied
    queryset = Review.objects.select_related(
        "user", "product", "order_item__order", "order_item__variant"
    ).order_by("-created_at", "-id")
    q = (request.query_params.get("q") or "").strip()
    if q:
        queryset = queryset.filter(
            Q(body__icontains=q)
            | Q(product__name__icontains=q)
            | Q(user__email__icontains=q)
            | Q(user__first_name__icontains=q)
            | Q(user__last_name__icontains=q)
        )
    status_filter = (request.query_params.get("status") or "").strip().lower()
    if status_filter in ("pending", "published", "rejected"):
        queryset = queryset.filter(status=status_filter)
    paginator = AdminListPagination()
    page = paginator.paginate_queryset(queryset, request)
    data = [
        {
            "id": r.id,
            "author": r.user.get_full_name() or r.user.email,
            "email": r.user.email,
            "product_name": r.product.name,
            "product_slug": r.product.slug,
            "stars": r.stars,
            "body": r.body,
            "status": r.status,
            "is_verified_buyer": r.is_verified_buyer,
            "created_at": r.created_at,
        }
        for r in page
    ]
    return paginator.get_paginated_response(data)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def admin_questions(request):
    denied = require_permissions(request, ["community.view_productquestion"])
    if denied:
        return denied
    queryset = (
        ProductQuestion.objects.select_related("user", "product")
        .annotate(
            answers_count=Count("answers", distinct=True),
            pending_answers_count=Count("answers", filter=Q(answers__status="pending"), distinct=True),
        )
        .order_by("-created_at", "-id")
    )
    q = (request.query_params.get("q") or "").strip()
    if q:
        queryset = queryset.filter(
            Q(body__icontains=q)
            | Q(product__name__icontains=q)
            | Q(user__email__icontains=q)
            | Q(user__first_name__icontains=q)
            | Q(user__last_name__icontains=q)
        )
    status_filter = (request.query_params.get("status") or "").strip().lower()
    if status_filter in ("pending", "published", "rejected"):
        queryset = queryset.filter(status=status_filter)
    paginator = AdminListPagination()
    page = paginator.paginate_queryset(queryset, request)
    data = [
        {
            "id": q_obj.id,
            "customer": q_obj.user.get_full_name() or q_obj.user.email,
            "email": q_obj.user.email,
            "product_name": q_obj.product.name,
            "product_slug": q_obj.product.slug,
            "body": q_obj.body,
            "answers_count": q_obj.answers_count,
            "pending_answers_count": q_obj.pending_answers_count,
            "status": q_obj.status,
            "created_at": q_obj.created_at,
        }
        for q_obj in page
    ]
    return paginator.get_paginated_response(data)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def admin_outbox_events(request):
    denied = require_permissions(request, ["operations.view_outboxevent"])
    if denied:
        return denied
    queryset = OutboxEvent.objects.order_by("-created_at", "-id")
    q = (request.query_params.get("q") or "").strip()
    if q:
        queryset = queryset.filter(
            Q(topic__icontains=q) | Q(aggregate_id__icontains=q) | Q(status__icontains=q)
        )
    status_filter = (request.query_params.get("status") or "").strip().lower()
    if status_filter in OutboxEvent.Status.values:
        queryset = queryset.filter(status=status_filter)
    paginator = AdminAuditPagination()
    page = paginator.paginate_queryset(queryset, request)
    data = [
        {
            "id": e.id,
            "event_key": str(e.event_key),
            "topic": e.topic,
            "aggregate_id": e.aggregate_id,
            "status": e.status,
            "attempts": e.attempts,
            "last_error_code": e.last_error_code,
            "available_at": e.available_at,
            "locked_at": e.locked_at,
            "processed_at": e.processed_at,
            "created_at": e.created_at,
        }
        for e in page
    ]
    response = paginator.get_paginated_response(data)
    response.data["summary"] = outbox_metrics()
    return response


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def admin_outbox_retry(request, event_id):
    denied = require_permissions(request, ["operations.change_outboxevent"])
    if denied:
        return denied
    with transaction.atomic():
        event = get_object_or_404(OutboxEvent.objects.select_for_update(), pk=event_id)
        if event.status != OutboxEvent.Status.FAILED:
            return Response(
                {"detail": "Chỉ có thể thử lại sự kiện đang ở trạng thái failed."},
                status=status.HTTP_409_CONFLICT,
            )
        event.status = OutboxEvent.Status.PENDING
        event.available_at = timezone.now()
        event.locked_at = None
        event.last_error_code = None
        event.save(update_fields=["status", "available_at", "locked_at", "last_error_code"])
        AuditLog.objects.create(
            actor=request.user,
            action="outbox.retried",
            entity_type="OutboxEvent",
            entity_id=str(event.id),
            changes={"event_key": str(event.event_key), "topic": event.topic, "attempts": event.attempts},
        )
    return Response(
        {
            "id": event.id,
            "event_key": str(event.event_key),
            "topic": event.topic,
            "status": event.status,
            "attempts": event.attempts,
            "available_at": event.available_at,
        }
    )


def _parse_date_range(request):
    start_raw = (request.query_params.get("start_date") or "").strip()
    end_raw = (request.query_params.get("end_date") or "").strip()
    start_dt = None
    end_exclusive = None
    start_d = None
    end_d = None
    if start_raw:
        start_d = parse_date(start_raw)
        if start_d is None:
            return None, None, Response({"start_date": ["Định dạng ngày không hợp lệ (YYYY-MM-DD)."]}, status=status.HTTP_400_BAD_REQUEST)
        start_dt = datetime.combine(start_d, time.min, tzinfo=VN_TZ)
    if end_raw:
        end_d = parse_date(end_raw)
        if end_d is None:
            return None, None, Response({"end_date": ["Định dạng ngày không hợp lệ (YYYY-MM-DD)."]}, status=status.HTTP_400_BAD_REQUEST)
        end_exclusive = datetime.combine(end_d + timedelta(days=1), time.min, tzinfo=VN_TZ)
    if start_d and end_d and start_d > end_d:
        return None, None, Response({"detail": "start_date không được lớn hơn end_date."}, status=status.HTTP_400_BAD_REQUEST)
    return start_dt, end_exclusive, None


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def admin_analytics(request):
    denied = require_permissions(
        request,
        ["orders.view_order", "payments.view_payment", "accounts.view_user"],
    )
    if denied:
        return denied
    start_dt, end_exclusive, err_resp = _parse_date_range(request)
    if err_resp is not None:
        return err_resp
    metrics = _compute_analytics(start_dt=start_dt, end_exclusive=end_exclusive)
    customers_count = get_user_model().objects.filter(is_staff=False).count()
    return Response(
        {
            **metrics,
            "customers_count": customers_count,
            "start_date": request.query_params.get("start_date") or None,
            "end_date": request.query_params.get("end_date") or None,
        }
    )
