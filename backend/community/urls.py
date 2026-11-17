from django.urls import path

from . import views


urlpatterns = [
    path("products/<slug:slug>/reviews/", views.product_reviews, name="product-reviews"),
    path("reviews/<int:review_id>/", views.review_detail, name="review-detail"),
    path("reviews/<int:review_id>/replies/", views.review_replies, name="review-replies"),
    path("products/<slug:slug>/questions/", views.product_questions, name="product-questions"),
    path("questions/<int:question_id>/answers/", views.question_answers, name="question-answers"),
]
