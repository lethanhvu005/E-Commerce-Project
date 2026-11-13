from django.urls import path

from . import views

urlpatterns = [
    path("admin/dashboard/", views.dashboard, name="admin-dashboard"),
    path("admin/audit-logs/", views.audit_logs, name="audit-logs"),
]
