from django.db import transaction
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import CartItem
from .serializers import CartItemInputSerializer, CartItemSerializer, QuantitySerializer
from .services import add_item, cart_totals, get_cart, validate_variant


def cart_response(cart):
    items, subtotal, discount, total = cart_totals(cart)
    return Response({
        "id": cart.id,
        "items": CartItemSerializer(items, many=True).data,
        "subtotal": subtotal,
        "discount_total": discount,
        "total": total,
        "voucher_code": cart.voucher.code if cart.voucher_id else None,
    })


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def cart_detail(request):
    return cart_response(get_cart(request.user))


@api_view(["POST", "DELETE"])
@permission_classes([IsAuthenticated])
def cart_items(request):
    if request.method == "DELETE":
        cart = get_cart(request.user)
        cart.items.all().delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
    serializer = CartItemInputSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    cart = add_item(request.user, **serializer.validated_data)
    return cart_response(cart)


@api_view(["PATCH", "DELETE"])
@permission_classes([IsAuthenticated])
def cart_item_detail(request, item_id):
    cart = get_cart(request.user)
    item = get_object_or_404(CartItem, id=item_id, cart=cart)
    if request.method == "DELETE":
        item.delete()
        return cart_response(cart)
    serializer = QuantitySerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    with transaction.atomic():
        validate_variant(item.variant_id, serializer.validated_data["quantity"])
        item.quantity = serializer.validated_data["quantity"]
        item.save(update_fields=["quantity", "updated_at"])
    return cart_response(cart)
