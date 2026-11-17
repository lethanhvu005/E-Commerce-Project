from django.urls import path

from . import views


urlpatterns = [
    path("payments/config/", views.payment_config, name="payment-config"),
    path("payments/vnpay/create/", views.vnpay_create_payment, name="vnpay-create-payment"),
    path("payments/vnpay/ipn/", views.vnpay_ipn, name="vnpay-ipn"),
    path("payments/vnpay/verify-return/", views.vnpay_verify_return, name="vnpay-verify-return"),
    path("orders/<uuid:public_id>/payments/", views.order_payments, name="order-payments"),
]
