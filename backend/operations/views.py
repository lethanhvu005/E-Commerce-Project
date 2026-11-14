from django.contrib.auth import get_user_model
from django.db.models import Avg, Count, DecimalField, F, Q, Sum, Value
from django.db.models.functions import Coalesce, TruncDate
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.pagination import PageNumberPagination
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import AuditLog, OutboxEvent
from .serializers import AuditLogSerializer
from catalog.models import Product
from community.models import ProductQuestion, Review
from inventory.models import InventoryBalance
from inventory.serializers import InventoryBalanceSerializer
from orders.models import Order, OrderStatus
from orders.services import confirm_order_payment, release_expired_reservations, transition_order_status
from payments.models import Payment
from promotions.models import Voucher, VoucherRedemption


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

    revenue = Payment.objects.filter(status=Payment.Status.SUCCEEDED).aggregate(
        value=Coalesce(
            Sum("amount"),
            Value(0),
            output_field=DecimalField(max_digits=14, decimal_places=0),
        ),
    )["value"]
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
            "revenue": revenue,
            "revenue_definition": "Tổng payment có status=succeeded; không tính pending, cancelled, failed hoặc refunded.",
            "orders_count": Order.objects.count(),
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
    valid_orders_filter = ~Q(orders__status__in=[OrderStatus.CANCELLED, OrderStatus.EXPIRED])
    queryset = (
        UserModel.objects.annotate(
            orders_count=Count("orders", filter=valid_orders_filter, distinct=True),
            total_spent=Coalesce(
                Sum("orders__grand_total", filter=valid_orders_filter),
                Value(0),
                output_field=DecimalField(max_digits=14, decimal_places=0),
            ),
        )
        .order_by("-date_joined", "-id")
    )
    q = (request.query_params.get("q") or "").strip()
    if q:
        queryset = queryset.filter(
            Q(email__icontains=q)
            | Q(first_name__icontains=q)
            | Q(last_name__icontains=q)
            | Q(phone__icontains=q)
        )
    paginator = AdminListPagination()
    page = paginator.paginate_queryset(queryset, request)
    data = [
        {
            "id": u.id,
            "email": u.email,
            "full_name": u.get_full_name() or u.email,
            "phone": u.phone,
            "role": "Quản trị / Nhân viên" if u.is_staff else "Khách hàng thành viên",
            "orders_count": u.orders_count,
            "total_spent": u.total_spent,
            "is_active": u.is_active,
            "date_joined": u.date_joined,
        }
        for u in page
    ]
    return paginator.get_paginated_response(data)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def admin_promotions(request):
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
        .annotate(answers_count=Count("answers"))
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
    paginator = AdminListPagination()
    page = paginator.paginate_queryset(queryset, request)
    data = [
        {
            "id": q_obj.id,
            "customer": q_obj.user.get_full_name() or q_obj.user.email,
            "email": q_obj.user.email,
            "product_name": q_obj.product.name,
            "body": q_obj.body,
            "answers_count": q_obj.answers_count,
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
            "processed_at": e.processed_at,
            "created_at": e.created_at,
        }
        for e in page
    ]
    return paginator.get_paginated_response(data)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def admin_analytics(request):
    denied = require_permissions(
        request,
        ["orders.view_order", "payments.view_payment", "accounts.view_user"],
    )
    if denied:
        return denied
    revenue = Payment.objects.filter(status=Payment.Status.SUCCEEDED).aggregate(
        value=Coalesce(
            Sum("amount"),
            Value(0),
            output_field=DecimalField(max_digits=14, decimal_places=0),
        ),
    )["value"]
    valid_orders = Order.objects.exclude(status__in=[OrderStatus.CANCELLED, OrderStatus.EXPIRED])
    orders_count = valid_orders.count()
    customers_count = get_user_model().objects.filter(is_staff=False).count()
    avg_order = valid_orders.aggregate(
        avg=Coalesce(
            Avg("grand_total"),
            Value(0),
            output_field=DecimalField(max_digits=14, decimal_places=0),
        ),
    )["avg"]
    by_day = list(
        valid_orders.annotate(day=TruncDate("created_at"))
        .values("day")
        .annotate(
            orders=Count("id"),
            revenue=Coalesce(
                Sum("grand_total"),
                Value(0),
                output_field=DecimalField(max_digits=14, decimal_places=0),
            ),
        )
        .order_by("-day")[:14]
    )
    return Response(
        {
            "revenue": revenue,
            "orders_count": orders_count,
            "customers_count": customers_count,
            "avg_order_value": avg_order,
            "daily_series": by_day,
        }
    )
