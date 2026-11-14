from django.urls import path

from . import views


urlpatterns = [
    path("auth/register/", views.register, name="register"),
    path("auth/login/", views.login, name="login"),
    path("auth/google/", views.google_login, name="google-login"),
    path("auth/oauth/google/", views.google_login, name="oauth-google-login"),
    path("auth/facebook/config/", views.facebook_config, name="facebook-config"),
    path("auth/facebook/", views.facebook_login, name="facebook-login"),
    path("auth/oauth/facebook/", views.facebook_login, name="oauth-facebook-login"),
    path("auth/token/refresh/", views.refresh_token, name="token-refresh"),
    path("auth/logout/", views.logout, name="logout"),
    path("accounts/me/", views.me, name="me"),
    path("accounts/me/addresses/", views.address_list, name="address-list"),
    path("accounts/me/addresses/<int:address_id>/", views.address_detail, name="address-detail"),
]
