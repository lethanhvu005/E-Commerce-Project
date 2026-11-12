from django.urls import path

from . import views


urlpatterns = [
    path("orders/<uuid:public_id>/payments/", views.order_payments, name="order-payments"),
]
