from django.shortcuts import get_object_or_404
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from orders.models import Order
from .serializers import PaymentSerializer


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def order_payments(request, public_id):
    order = get_object_or_404(Order, public_id=public_id, user=request.user)
    return Response({"results": PaymentSerializer(order.payments.order_by("-created_at"), many=True).data})
