from django.conf import settings
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.decorators import api_view, authentication_classes, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from orders.models import Order

from .serializers import PaymentSerializer, VnpayCreateSerializer, VnpayVerifyReturnSerializer
from .vnpay import create_vnpay_payment_attempt, process_vnpay_callback


@api_view(["GET"])
@authentication_classes([])
@permission_classes([AllowAny])
def payment_config(request):
    tmn_code = (getattr(settings, "VNPAY_TMN_CODE", "") or "").strip()
    hash_secret = (getattr(settings, "VNPAY_HASH_SECRET", "") or "").strip()
    return Response(
        {
            "vnpay_enabled": bool(tmn_code and hash_secret),
            "providers": {
                "cod": {"enabled": True, "label": "Thanh toán khi nhận hàng (COD)"},
                "vnpay": {
                    "enabled": bool(tmn_code and hash_secret),
                    "label": "Cổng thanh toán VNPay",
                },
            },
        }
    )


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def order_payments(request, public_id):
    order = get_object_or_404(Order, public_id=public_id, user=request.user)
    return Response({"results": PaymentSerializer(order.payments.order_by("-created_at"), many=True).data})


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def vnpay_create_payment(request):
    tmn_code = (getattr(settings, "VNPAY_TMN_CODE", "") or "").strip()
    hash_secret = (getattr(settings, "VNPAY_HASH_SECRET", "") or "").strip()
    if not tmn_code or not hash_secret:
        return Response(
            {"detail": "Cổng thanh toán VNPay chưa được cấu hình trên máy chủ (VNPAY_TMN_CODE / VNPAY_HASH_SECRET)."},
            status=status.HTTP_503_SERVICE_UNAVAILABLE,
        )

    serializer = VnpayCreateSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    order = get_object_or_404(
        Order,
        public_id=serializer.validated_data["order_id"],
        user=request.user,
    )
    attempt = create_vnpay_payment_attempt(
        order=order,
        request=request,
        bank_code=serializer.validated_data.get("bank_code", ""),
        locale=serializer.validated_data.get("locale", "vn"),
    )
    return Response(
        {
            "payment_url": attempt["payment_url"],
            "txn_ref": attempt["txn_ref"],
            "expires_at": attempt["expires_at"],
            "payment": PaymentSerializer(attempt["payment"]).data,
        },
        status=status.HTTP_200_OK,
    )


@api_view(["GET"])
@authentication_classes([])
@permission_classes([AllowAny])
def vnpay_ipn(request):
    result = process_vnpay_callback(request.GET, source="ipn")
    return Response(
        {"RspCode": result["rsp_code"], "Message": result["message"]},
        status=status.HTTP_200_OK,
    )


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def vnpay_verify_return(request):
    serializer = VnpayVerifyReturnSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)

    result = process_vnpay_callback(
        serializer.validated_data["params"],
        source="return",
        request_user=request.user,
    )
    if not result.get("verified") or result.get("rsp_code") == "01":
        return Response(
            {
                "verified": bool(result.get("verified")),
                "paid": False,
                "detail": result.get("message") or "Không thể xác minh kết quả thanh toán VNPay.",
                "rsp_code": result.get("rsp_code"),
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    order = result.get("order")
    payment = result.get("payment")
    return Response(
        {
            "verified": True,
            "paid": bool(result.get("paid")),
            "awaiting_ipn": bool(result.get("awaiting_ipn")),
            "rsp_code": result.get("rsp_code"),
            "response_code": result.get("response_code", ""),
            "message": result.get("message"),
            "transaction_no": result.get("transaction_no", ""),
            "order_id": str(order.public_id) if order else None,
            "order_number": order.order_number if order else None,
            "order_status": order.status if order else None,
            "amount": int(payment.amount) if payment else None,
            "payment_status": payment.status if payment else None,
        },
        status=status.HTTP_200_OK,
    )
