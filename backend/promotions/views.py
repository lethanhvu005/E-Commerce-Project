from django.db.models import Q
from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import api_view, authentication_classes, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from carts.services import cart_totals, get_cart
from .models import Voucher, VoucherRedemption
from .serializers import VoucherCodeSerializer, VoucherSerializer


@api_view(["GET"])
@authentication_classes([])
@permission_classes([AllowAny])
def vouchers(request):
    now = timezone.now()
    queryset = Voucher.objects.filter(is_active=True, starts_at__lte=now, ends_at__gt=now).order_by("ends_at", "id")
    return Response({"results": VoucherSerializer(queryset, many=True).data})


@api_view(["POST", "DELETE"])
@permission_classes([IsAuthenticated])
def cart_voucher(request):
    cart = get_cart(request.user)
    if request.method == "DELETE":
        cart.voucher = None
        cart.save(update_fields=["voucher", "updated_at"])
    else:
        serializer = VoucherCodeSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        now = timezone.now()
        try:
            voucher = Voucher.objects.get(
                code=serializer.validated_data["code"], is_active=True,
                starts_at__lte=now, ends_at__gt=now,
            )
        except Voucher.DoesNotExist:
            return Response({"code": ["Voucher không hợp lệ hoặc đã hết hạn."]}, status=status.HTTP_400_BAD_REQUEST)
        _, subtotal, _, _ = cart_totals(cart)
        if subtotal < voucher.min_subtotal:
            return Response(
                {"code": [f"Đơn hàng tối thiểu là {voucher.min_subtotal} VND."]},
                status=status.HTTP_400_BAD_REQUEST,
            )
        active_redemptions = VoucherRedemption.objects.filter(voucher=voucher).exclude(
            status=VoucherRedemption.Status.RELEASED
        )
        if voucher.usage_limit is not None and active_redemptions.count() >= voucher.usage_limit:
            return Response(
                {"code": ["Voucher đã hết lượt sử dụng."]},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if voucher.per_user_limit is not None and active_redemptions.filter(user=request.user).count() >= voucher.per_user_limit:
            return Response(
                {"code": ["Bạn đã dùng hết số lượt cho phép của voucher này."]},
                status=status.HTTP_400_BAD_REQUEST,
            )
        cart.voucher = voucher
        cart.save(update_fields=["voucher", "updated_at"])

    items, subtotal, discount, total = cart_totals(cart)
    return Response({
        "subtotal": subtotal,
        "discount_total": discount,
        "total": total,
        "voucher_code": cart.voucher.code if cart.voucher_id else None,
    })
