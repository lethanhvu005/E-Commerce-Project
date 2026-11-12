from django.urls import path

from . import views

urlpatterns = [
    path("admin/inventory/", views.inventory, name="admin-inventory"),
    path("admin/inventory/movements/", views.movements, name="admin-inventory-movements"),
]
