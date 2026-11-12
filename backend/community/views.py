from django.db import IntegrityError
from django.db.models import Avg, Count
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes, throttle_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import UserRateThrottle

from catalog.models import Product
from .models import ModerationStatus, ProductAnswer, ProductQuestion, Review
from .serializers import AnswerSerializer, QuestionSerializer, ReviewSerializer, ReviewUpdateSerializer


def require_user(request):
    if not request.user or not request.user.is_authenticated:
        return Response({"detail": "Cần đăng nhập để thực hiện thao tác này."}, status=status.HTTP_401_UNAUTHORIZED)
    return None


@api_view(["GET", "POST"])
@permission_classes([AllowAny])
def product_reviews(request, slug):
    product = get_object_or_404(Product, slug=slug, status=Product.Status.ACTIVE)
    if request.method == "GET":
        queryset = Review.objects.filter(product=product, status=ModerationStatus.PUBLISHED).select_related("user", "order_item__order", "order_item__variant")
        summary = queryset.aggregate(rating=Avg("stars"), count=Count("id"))
        return Response({"rating": summary["rating"], "count": summary["count"], "results": ReviewSerializer(queryset, many=True).data})
    auth_error = require_user(request)
    if auth_error:
        return auth_error
    serializer = ReviewSerializer(data=request.data, context={"request": request, "product": product})
    serializer.is_valid(raise_exception=True)
    try:
        review = serializer.save(product=product, user=request.user, status=ModerationStatus.PENDING)
    except IntegrityError:
        return Response({"detail": "Bạn đã đánh giá sản phẩm này."}, status=status.HTTP_400_BAD_REQUEST)
    return Response(ReviewSerializer(review).data, status=status.HTTP_201_CREATED)


@api_view(["PATCH", "DELETE"])
@permission_classes([IsAuthenticated])
def review_detail(request, review_id):
    review = get_object_or_404(Review, id=review_id, user=request.user)
    if request.method == "DELETE":
        review.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
    serializer = ReviewUpdateSerializer(review, data=request.data, partial=True)
    serializer.is_valid(raise_exception=True)
    serializer.save(status=ModerationStatus.PENDING)
    return Response(ReviewSerializer(review).data)


@api_view(["GET", "POST"])
@permission_classes([AllowAny])
def product_questions(request, slug):
    product = get_object_or_404(Product, slug=slug, status=Product.Status.ACTIVE)
    if request.method == "GET":
        questions = ProductQuestion.objects.filter(product=product, status=ModerationStatus.PUBLISHED).select_related("user").order_by("-created_at")
        return Response({"results": QuestionSerializer(questions, many=True).data})
    auth_error = require_user(request)
    if auth_error:
        return auth_error
    serializer = QuestionSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    question = serializer.save(product=product, user=request.user, status=ModerationStatus.PENDING)
    return Response(QuestionSerializer(question).data, status=status.HTTP_201_CREATED)


@api_view(["GET", "POST"])
@permission_classes([AllowAny])
def question_answers(request, question_id):
    question = get_object_or_404(ProductQuestion, id=question_id, status=ModerationStatus.PUBLISHED)
    if request.method == "GET":
        answers = question.answers.filter(status=ModerationStatus.PUBLISHED).select_related("user").order_by("created_at")
        return Response({"results": AnswerSerializer(answers, many=True).data})
    auth_error = require_user(request)
    if auth_error:
        return auth_error
    serializer = AnswerSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    answer = serializer.save(question=question, user=request.user, status=ModerationStatus.PENDING)
    return Response(AnswerSerializer(answer).data, status=status.HTTP_201_CREATED)
