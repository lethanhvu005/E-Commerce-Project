from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.decorators import api_view, authentication_classes, permission_classes
from rest_framework.pagination import PageNumberPagination
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from .models import Order, ShippingMethod
from .serializers import CancelSerializer, CheckoutInputSerializer, OrderHistorySerializer, OrderSerializer, ShippingMethodSerializer
from .services import cancel_order, create_order, preview


@api_view(["GET"])
@authentication_classes([])
@permission_classes([AllowAny])
def shipping_methods(request):
    methods = ShippingMethod.objects.filter(is_active=True).order_by("base_fee", "id")
    return Response({"results": ShippingMethodSerializer(methods, many=True).data})


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def checkout_preview(request):
    serializer = CheckoutInputSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    return Response(preview(request.user, serializer.validated_data))


@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def orders(request):
    if request.method == "GET":
        queryset = (
            Order.objects.filter(user=request.user)
            .prefetch_related("items__variant__product__images", "items__variant__product__category")
            .order_by("-created_at", "-id")
        )
        requested_status = request.query_params.get("status")
        if requested_status:
            queryset = queryset.filter(status=requested_status)
        paginator = PageNumberPagination()
        paginator.page_size = 10
        page = paginator.paginate_queryset(queryset, request)
        return paginator.get_paginated_response(OrderSerializer(page, many=True).data)
    serializer = CheckoutInputSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    if "checkout_key" not in serializer.validated_data:
        return Response({"checkout_key": ["Trường này là bắt buộc."]}, status=status.HTTP_400_BAD_REQUEST)
    try:
        order, created = create_order(request.user, serializer.validated_data)
    except Exception as error:
        if getattr(error, "get_codes", lambda: None)() == {"checkout_key": ["conflict"]}:
            return Response(error.detail, status=status.HTTP_409_CONFLICT)
        raise
    return Response(OrderSerializer(order).data, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def order_detail(request, public_id):
    order = get_object_or_404(
        Order.objects.prefetch_related(
            "items__variant__product__images",
            "items__variant__product__category",
        ).select_related("delivery_address"),
        public_id=public_id, user=request.user,
    )
    return Response(OrderSerializer(order).data)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def order_history(request, public_id):
    order = get_object_or_404(Order, public_id=public_id, user=request.user)
    history = order.status_history.order_by("created_at", "id")
    return Response({"results": OrderHistorySerializer(history, many=True).data})


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def order_cancel(request, public_id):
    order = get_object_or_404(Order, public_id=public_id, user=request.user)
    serializer = CancelSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    return Response(OrderSerializer(cancel_order(order, request.user, serializer.validated_data["reason"])).data)
