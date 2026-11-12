from django.urls import path

from . import views


urlpatterns = [
    path("cart/", views.cart_detail, name="cart"),
    path("cart/items/", views.cart_items, name="cart-items"),
    path("cart/items/<int:item_id>/", views.cart_item_detail, name="cart-item-detail"),
]
