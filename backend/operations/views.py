from django.contrib.auth import get_user_model
from django.db.models import Avg, Count, DecimalField, F, Sum, Value
from django.db.models.functions import Coalesce, TruncDate
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
from orders.models import Order
from payments.models import Payment
from promotions.models import Voucher


def require_permissions(request, permissions):
    if not request.user.is_staff or not request.user.has_perms(permissions):
        return Response({"detail": "Bạn không có quyền xem dữ liệu quản trị này."}, status=status.HTTP_403_FORBIDDEN)


def require_staff(request):
    if not request.user.is_staff:
        return Response({"detail": "Bạn không có quyền xem dữ liệu quản trị này."}, status=status.HTTP_403_FORBIDDEN)


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
    low_stock = InventoryBalance.objects.filter(
        on_hand__gt=F("reserved"),
        on_hand__lte=F("reserved") + F("low_stock_threshold"),
    ).count()
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
            "orders_by_status": list(Order.objects.values("status").annotate(count=Count("id")).order_by("status")),
            "recent_orders": recent_orders,
        }
    )


class AdminAuditPagination(PageNumberPagination):
    page_size = 50
    page_size_query_param = "page_size"
    max_page_size = 100


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def audit_logs(request):
    if not request.user.is_staff or not request.user.has_perm("operations.view_auditlog"):
        return Response({"detail": "Bạn không có quyền xem nhật ký."}, status=status.HTTP_403_FORBIDDEN)
    queryset = AuditLog.objects.select_related("actor").order_by("-created_at", "-id")
    paginator = AdminAuditPagination()
    page = paginator.paginate_queryset(queryset, request)
    return paginator.get_paginated_response(AuditLogSerializer(page, many=True).data)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def admin_orders(request):
    denied = require_staff(request)
    if denied:
        return denied
    orders = (
        Order.objects.select_related("user", "shipping_method", "voucher")
        .annotate(items_count=Coalesce(Sum("items__quantity"), Value(0)))
        .order_by("-created_at", "-id")
    )
    data = [
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
        }
        for o in orders
    ]
    return Response({"count": len(data), "results": data})


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def admin_customers(request):
    denied = require_staff(request)
    if denied:
        return denied
    UserModel = get_user_model()
    customers = (
        UserModel.objects.annotate(
            orders_count=Count("orders", distinct=True),
            total_spent=Coalesce(
                Sum("orders__grand_total"),
                Value(0),
                output_field=DecimalField(max_digits=14, decimal_places=0),
            ),
        )
        .order_by("-date_joined", "-id")
    )
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
        for u in customers
    ]
    return Response({"count": len(data), "results": data})


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def admin_promotions(request):
    denied = require_staff(request)
    if denied:
        return denied
    vouchers = Voucher.objects.annotate(used_count=Count("redemptions")).order_by("code")
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
        for v in vouchers
    ]
    return Response({"count": len(data), "results": data})


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def admin_reviews(request):
    denied = require_staff(request)
    if denied:
        return denied
    reviews = Review.objects.select_related("user", "product", "order_item__order", "order_item__variant").order_by("-created_at", "-id")
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
        for r in reviews
    ]
    return Response({"count": len(data), "results": data})


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def admin_questions(request):
    denied = require_staff(request)
    if denied:
        return denied
    questions = (
        ProductQuestion.objects.select_related("user", "product")
        .annotate(answers_count=Count("answers"))
        .order_by("-created_at", "-id")
    )
    data = [
        {
            "id": q.id,
            "customer": q.user.get_full_name() or q.user.email,
            "email": q.user.email,
            "product_name": q.product.name,
            "body": q.body,
            "answers_count": q.answers_count,
            "status": q.status,
            "created_at": q.created_at,
        }
        for q in questions
    ]
    return Response({"count": len(data), "results": data})


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def admin_outbox_events(request):
    denied = require_staff(request)
    if denied:
        return denied
    events = OutboxEvent.objects.order_by("-created_at", "-id")[:50]
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
        for e in events
    ]
    return Response({"count": len(data), "results": data})


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def admin_analytics(request):
    denied = require_staff(request)
    if denied:
        return denied
    revenue = Payment.objects.filter(status=Payment.Status.SUCCEEDED).aggregate(
        value=Coalesce(
            Sum("amount"),
            Value(0),
            output_field=DecimalField(max_digits=14, decimal_places=0),
        ),
    )["value"]
    orders_count = Order.objects.count()
    customers_count = get_user_model().objects.filter(is_staff=False).count()
    avg_order = Order.objects.aggregate(
        avg=Coalesce(
            Avg("grand_total"),
            Value(0),
            output_field=DecimalField(max_digits=14, decimal_places=0),
        ),
    )["avg"]
    by_day = list(
        Order.objects.annotate(day=TruncDate("created_at"))
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
