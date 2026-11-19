from django.db import IntegrityError, transaction
from django.db.models import Count, F, IntegerField, Q, Sum, Value
from django.db.models.functions import Coalesce
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.pagination import PageNumberPagination
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from catalog.models import ProductVariant
from operations.models import AuditLog, OutboxEvent
from .models import InventoryBalance, InventoryMovement
from .serializers import InventoryAdjustmentSerializer, InventoryBalanceSerializer, InventoryMovementSerializer


class AdminInventoryPagination(PageNumberPagination):
    page_size = 50
    page_size_query_param = "page_size"
    max_page_size = 100


def require_permission(request, permission):
    if not request.user.is_staff or not request.user.has_perm(permission):
        return Response({"detail": "Bạn không có quyền thực hiện thao tác này."}, status=status.HTTP_403_FORBIDDEN)


def movement_matches(movement, data, actor):
    return (
        movement.variant_id == data["variant_id"]
        and movement.quantity_delta == data["quantity_delta"]
        and movement.reason == data["reason"]
        and movement.actor_id == actor.id
    )


def replay_response(movement, data, actor):
    if not movement_matches(movement, data, actor):
        return Response(
            {"event_key": ["Idempotency key was already used with a different payload."]},
            status=status.HTTP_409_CONFLICT,
        )
    return Response(InventoryMovementSerializer(movement).data)


@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def inventory(request):
    permission = "inventory.view_inventorybalance" if request.method == "GET" else "inventory.change_inventorybalance"
    denied = require_permission(request, permission)
    if denied:
        return denied
    if request.method == "GET":
        base_qs = (
            InventoryBalance.objects.select_related("variant__product__category")
            .prefetch_related("variant__product__images")
            .order_by("variant__sku")
        )
        balances = base_qs
        q = (request.query_params.get("q") or "").strip()
        if q:
            balances = balances.filter(
                Q(variant__sku__icontains=q)
                | Q(variant__product__name__icontains=q)
                | Q(variant__product__short_name__icontains=q)
                | Q(variant__product__category__name__icontains=q)
            )
        stock_status = (request.query_params.get("status") or "").strip().lower()
        if stock_status == "out":
            balances = balances.filter(on_hand__lte=F("reserved"))
        elif stock_status == "low":
            balances = balances.filter(on_hand__gt=F("reserved"), on_hand__lte=F("reserved") + F("low_stock_threshold"))
        elif stock_status == "ok":
            balances = balances.filter(on_hand__gt=F("reserved") + F("low_stock_threshold"))

        def _summarize(qs):
            summary = qs.aggregate(
                total_on_hand=Coalesce(Sum("on_hand"), Value(0), output_field=IntegerField()),
                total_reserved=Coalesce(Sum("reserved"), Value(0), output_field=IntegerField()),
                total_skus=Count("variant_id"),
                low_stock_count=Count(
                    "variant_id",
                    filter=Q(on_hand__lte=F("reserved") + F("low_stock_threshold")),
                ),
                out_of_stock_count=Count(
                    "variant_id",
                    filter=Q(on_hand__lte=F("reserved")),
                ),
            )
            summary["total_available"] = max(0, summary["total_on_hand"] - summary["total_reserved"])
            return summary

        agg = _summarize(InventoryBalance.objects.all())
        filtered_agg = _summarize(balances) if (q or stock_status) else agg
        paginator = AdminInventoryPagination()
        page = paginator.paginate_queryset(balances, request)
        response = paginator.get_paginated_response(InventoryBalanceSerializer(page, many=True).data)
        response.data["summary"] = agg
        response.data["filtered_summary"] = filtered_agg
        return response
    serializer = InventoryAdjustmentSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    data = serializer.validated_data
    with transaction.atomic():
        existing = InventoryMovement.objects.filter(event_key=data["event_key"]).first()
        if existing:
            return replay_response(existing, data, request.user)
        variant = get_object_or_404(ProductVariant, id=data["variant_id"])
        try:
            with transaction.atomic():
                movement = InventoryMovement.objects.create(
                    variant=variant, actor=request.user, event_key=data["event_key"],
                    kind=InventoryMovement.Kind.ADJUSTMENT,
                    quantity_delta=data["quantity_delta"], reason=data["reason"],
                )
        except IntegrityError:
            existing = InventoryMovement.objects.get(event_key=data["event_key"])
            return replay_response(existing, data, request.user)
        balance, _ = InventoryBalance.objects.select_for_update().get_or_create(variant=variant)
        new_on_hand = balance.on_hand + data["quantity_delta"]
        if new_on_hand < balance.reserved or new_on_hand < 0:
            transaction.set_rollback(True)
            return Response({"quantity_delta": ["Điều chỉnh làm tồn kho nhỏ hơn lượng đã giữ."]}, status=status.HTTP_400_BAD_REQUEST)
        balance.on_hand = new_on_hand
        balance.save(update_fields=["on_hand", "updated_at"])
        AuditLog.objects.create(
            actor=request.user, action="inventory.adjust", entity_type="ProductVariant",
            entity_id=str(variant.id), changes={"quantity_delta": data["quantity_delta"], "reason": data["reason"]},
        )
        OutboxEvent.objects.create(
            event_key=data["event_key"],
            topic="inventory.adjusted",
            aggregate_id=str(variant.id),
            payload={
                "movement_id": movement.id,
                "variant_id": variant.id,
                "sku": variant.sku,
                "quantity_delta": data["quantity_delta"],
                "on_hand": balance.on_hand,
            },
        )
    return Response(InventoryMovementSerializer(movement).data, status=status.HTTP_201_CREATED)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def movements(request):
    denied = require_permission(request, "inventory.view_inventorymovement")
    if denied:
        return denied
    queryset = InventoryMovement.objects.select_related("variant").order_by("-created_at", "-id")
    paginator = AdminInventoryPagination()
    page = paginator.paginate_queryset(queryset, request)
    return paginator.get_paginated_response(InventoryMovementSerializer(page, many=True).data)
