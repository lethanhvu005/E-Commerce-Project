from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from catalog.models import Product
from .models import Wishlist
from .serializers import WishlistInputSerializer, WishlistSerializer


@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def wishlist(request):
    if request.method == "GET":
        entries = Wishlist.objects.filter(user=request.user, product__status=Product.Status.ACTIVE).select_related("product__category", "product__brand").prefetch_related("product__images")
        return Response({"results": WishlistSerializer(entries, many=True).data})
    serializer = WishlistInputSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    product = get_object_or_404(Product, id=serializer.validated_data["product_id"], status=Product.Status.ACTIVE)
    entry, created = Wishlist.objects.get_or_create(user=request.user, product=product)
    return Response(WishlistSerializer(entry).data, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)


@api_view(["DELETE"])
@permission_classes([IsAuthenticated])
def wishlist_detail(request, product_id):
    entry = get_object_or_404(Wishlist, user=request.user, product_id=product_id)
    entry.delete()
    return Response(status=status.HTTP_204_NO_CONTENT)
