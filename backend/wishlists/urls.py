from django.urls import path

from . import views


urlpatterns = [
    path("wishlist/", views.wishlist, name="wishlist"),
    path("wishlist/<int:product_id>/", views.wishlist_detail, name="wishlist-detail"),
]
