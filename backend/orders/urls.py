from django.urls import path

from . import views


urlpatterns = [
    path("shipping-methods/", views.shipping_methods, name="shipping-methods"),
    path("checkout/preview/", views.checkout_preview, name="checkout-preview"),
    path("orders/", views.orders, name="orders"),
    path("orders/<uuid:public_id>/", views.order_detail, name="order-detail"),
    path("orders/<uuid:public_id>/history/", views.order_history, name="order-history"),
    path("orders/<uuid:public_id>/cancel/", views.order_cancel, name="order-cancel"),
]
