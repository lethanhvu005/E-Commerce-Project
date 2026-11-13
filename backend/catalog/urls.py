from django.urls import path

from . import views


urlpatterns = [
    path("categories/", views.categories, name="categories"),
    path("brands/", views.brands, name="brands"),
    path("products/", views.products, name="products"),
    path("products/<slug:slug>/", views.product_detail, name="product-detail"),
    path("products/<slug:slug>/variants/", views.product_variants, name="product-variants"),
    path("collections/", views.collections, name="collections"),
    path("collections/<slug:slug>/products/", views.collection_products, name="collection-products"),
    path("home-banners/", views.home_banners, name="home-banners"),
    path("admin/products/", views.admin_products, name="admin-products"),
    path("admin/products/<int:product_id>/", views.admin_product_detail, name="admin-product-detail"),
    path("admin/products/<int:product_id>/variants/", views.admin_product_variants, name="admin-product-variants"),
    path("admin/products/<int:product_id>/variants/<int:variant_id>/", views.admin_product_variant_detail, name="admin-product-variant-detail"),
    path("admin/products/<int:product_id>/images/", views.admin_product_images, name="admin-product-images"),
    path("admin/products/<int:product_id>/images/<int:image_id>/", views.admin_product_image_detail, name="admin-product-image-detail"),
]
