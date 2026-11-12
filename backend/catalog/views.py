from django.db.models import Min, Q
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework.decorators import api_view, authentication_classes, permission_classes
from rest_framework.pagination import PageNumberPagination
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from .models import Brand, Category, Collection, HomeBanner, Product
from .serializers import (
    BrandSerializer, CategorySerializer, CollectionSerializer, HomeBannerSerializer,
    ProductDetailSerializer, ProductListSerializer, ProductVariantSerializer,
)


class CatalogPagination(PageNumberPagination):
    page_size = 12
    page_size_query_param = "page_size"
    max_page_size = 50


def paginated_response(request, queryset, serializer_class):
    paginator = CatalogPagination()
    page = paginator.paginate_queryset(queryset, request)
    return paginator.get_paginated_response(serializer_class(page, many=True).data)


def active_products():
    return (
        Product.objects.filter(status=Product.Status.ACTIVE, category__is_active=True, brand__is_active=True)
        .select_related("category", "brand")
        .prefetch_related("images")
        .annotate(min_price=Min("variants__price", filter=Q(variants__is_active=True)))
    )


@api_view(["GET"])
@authentication_classes([])
@permission_classes([AllowAny])
def categories(request):
    queryset = Category.objects.filter(is_active=True).order_by("sort_order", "id")
    return Response({"results": CategorySerializer(queryset, many=True).data})


@api_view(["GET"])
@authentication_classes([])
@permission_classes([AllowAny])
def brands(request):
    queryset = Brand.objects.filter(is_active=True).order_by("name", "id")
    return Response({"results": BrandSerializer(queryset, many=True).data})


@api_view(["GET"])
@authentication_classes([])
@permission_classes([AllowAny])
def products(request):
    queryset = active_products()
    search = request.query_params.get("search", "").strip()
    category = request.query_params.get("category", "").strip()
    brand = request.query_params.get("brand", "").strip()
    ordering = request.query_params.get("ordering", "-created_at")
    if search:
        queryset = queryset.filter(Q(name__icontains=search) | Q(summary__icontains=search) | Q(variants__sku__icontains=search))
    if category:
        queryset = queryset.filter(category__slug=category)
    if brand:
        queryset = queryset.filter(brand__slug=brand)
    ordering_map = {
        "name": "name", "-name": "-name", "price": "min_price",
        "-price": "-min_price", "created_at": "created_at", "-created_at": "-created_at",
    }
    queryset = queryset.order_by(ordering_map.get(ordering, "-created_at"), "id").distinct()
    return paginated_response(request, queryset, ProductListSerializer)


@api_view(["GET"])
@authentication_classes([])
@permission_classes([AllowAny])
def product_detail(request, slug):
    queryset = active_products().prefetch_related("features", "variants__inventory")
    product = get_object_or_404(queryset, slug=slug)
    return Response(ProductDetailSerializer(product).data)


@api_view(["GET"])
@authentication_classes([])
@permission_classes([AllowAny])
def product_variants(request, slug):
    product = get_object_or_404(active_products(), slug=slug)
    variants = product.variants.filter(is_active=True).select_related("inventory").order_by("price", "id")
    return Response({"results": ProductVariantSerializer(variants, many=True).data})


@api_view(["GET"])
@authentication_classes([])
@permission_classes([AllowAny])
def collections(request):
    queryset = Collection.objects.filter(is_active=True).order_by("sort_order", "id")
    return paginated_response(request, queryset, CollectionSerializer)


@api_view(["GET"])
@authentication_classes([])
@permission_classes([AllowAny])
def collection_products(request, slug):
    collection = get_object_or_404(Collection, slug=slug, is_active=True)
    queryset = active_products().filter(collection_entries__collection=collection).order_by("collection_entries__sort_order", "id")
    return paginated_response(request, queryset, ProductListSerializer)


@api_view(["GET"])
@authentication_classes([])
@permission_classes([AllowAny])
def home_banners(request):
    now = timezone.now()
    queryset = HomeBanner.objects.filter(is_active=True).filter(
        Q(starts_at__isnull=True) | Q(starts_at__lte=now),
        Q(ends_at__isnull=True) | Q(ends_at__gt=now),
    ).order_by("sort_order", "id")
    return Response({"results": HomeBannerSerializer(queryset, many=True).data})
