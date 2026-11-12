from django.urls import path

from . import views


urlpatterns = [
    path("vouchers/", views.vouchers, name="vouchers"),
    path("cart/voucher/", views.cart_voucher, name="cart-voucher"),
]
