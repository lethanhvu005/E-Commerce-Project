from django.urls import path

from . import views

urlpatterns = [path("admin/audit-logs/", views.audit_logs, name="audit-logs")]
