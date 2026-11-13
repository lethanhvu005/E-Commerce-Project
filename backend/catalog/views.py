from django.db import transaction
from django.db.models import F, Min, Q
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework.decorators import api_view, authentication_classes, permission_classes
from rest_framework.pagination import PageNumberPagination
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework import status
from rest_framework.response import Response

from operations.models import AuditLog
from .models import Brand, Category, Collection, HomeBanner, Product, ProductImage, ProductVariant
from .serializers import (
    BrandSerializer, CategorySerializer, CollectionSerializer, HomeBannerSerializer,
    ProductDetailSerializer, ProductListSerializer, ProductVariantSerializer,
    AdminProductImageSerializer, AdminProductSerializer, AdminProductVariantSerializer,
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
        .prefetch_related("images", "variants__inventory", "reviews")
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
    collection = request.query_params.get("collection", "").strip()
    min_price = request.query_params.get("min_price", "").strip()
    max_price = request.query_params.get("max_price", "").strip()
    in_stock = request.query_params.get("in_stock", "").strip()
    ordering = request.query_params.get("ordering", "-created_at")
    if search:
        queryset = queryset.filter(Q(name__icontains=search) | Q(summary__icontains=search) | Q(variants__sku__icontains=search))
    if category:
        queryset = queryset.filter(category__slug=category)
    if brand:
        queryset = queryset.filter(brand__slug=brand)
    if collection:
        queryset = queryset.filter(collection_entries__collection__slug=collection, collection_entries__collection__is_active=True)
    if min_price.isdigit():
        queryset = queryset.filter(min_price__gte=int(min_price))
    if max_price.isdigit():
        queryset = queryset.filter(min_price__lte=int(max_price))
    if in_stock in ("1", "true", "True"):
        queryset = queryset.filter(variants__is_active=True, variants__inventory__on_hand__gt=F("variants__inventory__reserved"))
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


def require_catalog_permission(request, permission):
    if not request.user.is_staff or not request.user.has_perm(permission):
        return Response({"detail": "You do not have permission to manage catalog data."}, status=status.HTTP_403_FORBIDDEN)


def admin_product_queryset():
    return Product.objects.select_related("category", "brand").prefetch_related("variants", "images", "features")


class AdminCatalogPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = "page_size"
    max_page_size = 100


@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def admin_products(request):
    permission = "catalog.view_product" if request.method == "GET" else "catalog.add_product"
    denied = require_catalog_permission(request, permission)
    if denied:
        return denied
    if request.method == "GET":
        queryset = admin_product_queryset().order_by("-created_at", "-id")
        search = request.query_params.get("search", "").strip()
        product_status = request.query_params.get("status", "").strip()
        if search:
            queryset = queryset.filter(Q(name__icontains=search) | Q(slug__icontains=search) | Q(variants__sku__icontains=search)).distinct()
        if product_status:
            queryset = queryset.filter(status=product_status)
        paginator = AdminCatalogPagination()
        page = paginator.paginate_queryset(queryset, request)
        return paginator.get_paginated_response(AdminProductSerializer(page, many=True).data)

    serializer = AdminProductSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    with transaction.atomic():
        product = serializer.save()
        AuditLog.objects.create(actor=request.user, action="catalog.product.create", entity_type="Product", entity_id=str(product.id), changes={"status": product.status})
    return Response(AdminProductSerializer(product).data, status=status.HTTP_201_CREATED)


@api_view(["GET", "PATCH"])
@permission_classes([IsAuthenticated])
def admin_product_detail(request, product_id):
    permission = "catalog.view_product" if request.method == "GET" else "catalog.change_product"
    denied = require_catalog_permission(request, permission)
    if denied:
        return denied
    product = get_object_or_404(admin_product_queryset(), id=product_id)
    if request.method == "GET":
        return Response(AdminProductSerializer(product).data)
    serializer = AdminProductSerializer(product, data=request.data, partial=True)
    serializer.is_valid(raise_exception=True)
    with transaction.atomic():
        changed_fields = sorted(serializer.validated_data.keys())
        product = serializer.save()
        AuditLog.objects.create(actor=request.user, action="catalog.product.update", entity_type="Product", entity_id=str(product.id), changes={"fields": changed_fields})
    return Response(AdminProductSerializer(product).data)


@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def admin_product_variants(request, product_id):
    permission = "catalog.view_productvariant" if request.method == "GET" else "catalog.add_productvariant"
    denied = require_catalog_permission(request, permission)
    if denied:
        return denied
    product = get_object_or_404(Product, id=product_id)
    if request.method == "GET":
        return Response({"results": AdminProductVariantSerializer(product.variants.order_by("id"), many=True).data})
    serializer = AdminProductVariantSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    variant = serializer.save(product=product)
    AuditLog.objects.create(actor=request.user, action="catalog.variant.create", entity_type="ProductVariant", entity_id=str(variant.id), changes={"product_id": product.id})
    return Response(AdminProductVariantSerializer(variant).data, status=status.HTTP_201_CREATED)


@api_view(["GET", "PATCH"])
@permission_classes([IsAuthenticated])
def admin_product_variant_detail(request, product_id, variant_id):
    permission = "catalog.view_productvariant" if request.method == "GET" else "catalog.change_productvariant"
    denied = require_catalog_permission(request, permission)
    if denied:
        return denied
    variant = get_object_or_404(ProductVariant, id=variant_id, product_id=product_id)
    if request.method == "GET":
        return Response(AdminProductVariantSerializer(variant).data)
    serializer = AdminProductVariantSerializer(variant, data=request.data, partial=True)
    serializer.is_valid(raise_exception=True)
    variant = serializer.save()
    AuditLog.objects.create(actor=request.user, action="catalog.variant.update", entity_type="ProductVariant", entity_id=str(variant.id), changes={"fields": sorted(serializer.validated_data.keys())})
    return Response(AdminProductVariantSerializer(variant).data)


@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def admin_product_images(request, product_id):
    permission = "catalog.view_productimage" if request.method == "GET" else "catalog.add_productimage"
    denied = require_catalog_permission(request, permission)
    if denied:
        return denied
    product = get_object_or_404(Product, id=product_id)
    if request.method == "GET":
        return Response({"results": AdminProductImageSerializer(product.images.order_by("sort_order", "id"), many=True).data})
    serializer = AdminProductImageSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    variant = serializer.validated_data.get("variant")
    if variant and variant.product_id != product.id:
        return Response({"variant_id": ["Variant must belong to this product."]}, status=status.HTTP_400_BAD_REQUEST)
    with transaction.atomic():
        if serializer.validated_data.get("is_cover"):
            product.images.filter(is_cover=True).update(is_cover=False)
        image = serializer.save(product=product)
        AuditLog.objects.create(actor=request.user, action="catalog.image.create", entity_type="ProductImage", entity_id=str(image.id), changes={"product_id": product.id})
    return Response(AdminProductImageSerializer(image).data, status=status.HTTP_201_CREATED)


@api_view(["GET", "PATCH", "DELETE"])
@permission_classes([IsAuthenticated])
def admin_product_image_detail(request, product_id, image_id):
    permission_map = {"GET": "catalog.view_productimage", "PATCH": "catalog.change_productimage", "DELETE": "catalog.delete_productimage"}
    denied = require_catalog_permission(request, permission_map[request.method])
    if denied:
        return denied
    image = get_object_or_404(ProductImage, id=image_id, product_id=product_id)
    if request.method == "GET":
        return Response(AdminProductImageSerializer(image).data)
    if request.method == "DELETE":
        image.delete()
        AuditLog.objects.create(actor=request.user, action="catalog.image.delete", entity_type="ProductImage", entity_id=str(image_id), changes={"product_id": product_id})
        return Response(status=status.HTTP_204_NO_CONTENT)
    serializer = AdminProductImageSerializer(image, data=request.data, partial=True)
    serializer.is_valid(raise_exception=True)
    variant = serializer.validated_data.get("variant", image.variant)
    if variant and variant.product_id != product_id:
        return Response({"variant_id": ["Variant must belong to this product."]}, status=status.HTTP_400_BAD_REQUEST)
    with transaction.atomic():
        if serializer.validated_data.get("is_cover"):
            ProductImage.objects.filter(product_id=product_id, is_cover=True).exclude(id=image.id).update(is_cover=False)
        image = serializer.save()
        AuditLog.objects.create(actor=request.user, action="catalog.image.update", entity_type="ProductImage", entity_id=str(image.id), changes={"fields": sorted(serializer.validated_data.keys())})
    return Response(AdminProductImageSerializer(image).data)
