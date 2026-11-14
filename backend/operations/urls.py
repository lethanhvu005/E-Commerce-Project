from django.urls import path

from . import admin_actions, views

urlpatterns = [
    path("admin/dashboard/", views.dashboard, name="admin-dashboard"),
    path("admin/audit-logs/", views.audit_logs, name="audit-logs"),
    path("admin/orders/", views.admin_orders, name="admin-orders"),
    path("admin/orders/<uuid:public_id>/status/", views.admin_order_status, name="admin-order-status"),
    path("admin/orders/<uuid:public_id>/confirm-payment/", views.admin_order_confirm_payment, name="admin-order-confirm-payment"),
    path("admin/reservations/release-expired/", views.admin_release_expired_reservations, name="admin-release-expired-reservations"),
    path("admin/customers/", views.admin_customers, name="admin-customers"),
    path("admin/customers/<int:user_id>/", admin_actions.admin_customer_detail, name="admin-customer-detail"),
    path("admin/customers/<int:user_id>/status/", admin_actions.admin_customer_status, name="admin-customer-status"),
    path("admin/promotions/", views.admin_promotions, name="admin-promotions"),
    path("admin/promotions/<int:voucher_id>/", admin_actions.admin_voucher_detail, name="admin-voucher-detail"),
    path("admin/promotions/<int:voucher_id>/status/", admin_actions.admin_voucher_status, name="admin-voucher-status"),
    path("admin/reviews/", views.admin_reviews, name="admin-reviews"),
    path("admin/questions/", views.admin_questions, name="admin-questions"),
    path("admin/questions/<int:question_id>/answers/", admin_actions.admin_question_answers, name="admin-question-answers"),
    path("admin/questions/<int:question_id>/reply/", admin_actions.admin_answer_question, name="admin-answer-question"),
    path("admin/moderation/<str:kind>/<int:object_id>/", admin_actions.admin_moderate, name="admin-moderate"),
    path("admin/outbox-events/", views.admin_outbox_events, name="admin-outbox-events"),
    path("admin/outbox-events/<int:event_id>/retry/", views.admin_outbox_retry, name="admin-outbox-retry"),
    path("admin/analytics/", views.admin_analytics, name="admin-analytics"),
]
