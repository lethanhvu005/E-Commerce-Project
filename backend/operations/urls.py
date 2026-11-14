from django.urls import path

from . import views

urlpatterns = [
    path("admin/dashboard/", views.dashboard, name="admin-dashboard"),
    path("admin/audit-logs/", views.audit_logs, name="audit-logs"),
    path("admin/orders/", views.admin_orders, name="admin-orders"),
    path("admin/orders/<uuid:public_id>/status/", views.admin_order_status, name="admin-order-status"),
    path("admin/orders/<uuid:public_id>/confirm-payment/", views.admin_order_confirm_payment, name="admin-order-confirm-payment"),
    path("admin/reservations/release-expired/", views.admin_release_expired_reservations, name="admin-release-expired-reservations"),
    path("admin/customers/", views.admin_customers, name="admin-customers"),
    path("admin/promotions/", views.admin_promotions, name="admin-promotions"),
    path("admin/reviews/", views.admin_reviews, name="admin-reviews"),
    path("admin/questions/", views.admin_questions, name="admin-questions"),
    path("admin/outbox-events/", views.admin_outbox_events, name="admin-outbox-events"),
    path("admin/analytics/", views.admin_analytics, name="admin-analytics"),
]
