from django.db import IntegrityError, transaction
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.pagination import PageNumberPagination
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from catalog.models import ProductVariant
from operations.models import AuditLog
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
        balances = InventoryBalance.objects.select_related("variant").order_by("variant__sku")
        paginator = AdminInventoryPagination()
        page = paginator.paginate_queryset(balances, request)
        return paginator.get_paginated_response(InventoryBalanceSerializer(page, many=True).data)
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
