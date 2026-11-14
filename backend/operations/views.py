from django.contrib.auth import get_user_model
from django.db.models import Count, DecimalField, F, Sum, Value
from django.db.models.functions import Coalesce
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.pagination import PageNumberPagination
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import AuditLog
from .serializers import AuditLogSerializer
from catalog.models import Product
from inventory.models import InventoryBalance
from orders.models import Order
from payments.models import Payment


def require_permissions(request, permissions):
    if not request.user.is_staff or not request.user.has_perms(permissions):
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
