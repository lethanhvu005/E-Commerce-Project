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
]
