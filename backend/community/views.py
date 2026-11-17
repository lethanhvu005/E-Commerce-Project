from django.db import IntegrityError
from django.db.models import Avg, Count, F
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes, throttle_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import UserRateThrottle

from catalog.models import Product
from orders.models import OrderItem, OrderStatus
from .models import ModerationStatus, ProductAnswer, ProductQuestion, Review, ReviewReply
from .serializers import AnswerSerializer, QuestionSerializer, ReviewReplySerializer, ReviewSerializer, ReviewUpdateSerializer


def require_user(request):
    if not request.user or not request.user.is_authenticated:
        return Response({"detail": "Cần đăng nhập để thực hiện thao tác này."}, status=status.HTTP_401_UNAUTHORIZED)
    return None


def review_eligibility(user, product):
    """Return a server-derived review permission for this user and product."""
    if not user or not user.is_authenticated:
        return {
            "can_review": False,
            "reason": "login_required",
            "message": "Đăng nhập để kiểm tra sản phẩm bạn đã mua.",
        }, None

    existing = Review.objects.filter(user=user, product=product).first()
    if existing:
        return {
            "can_review": False,
            "reason": "already_reviewed",
            "message": "Bạn đã gửi đánh giá cho sản phẩm này.",
            "review_id": existing.id,
            "review_status": existing.status,
        }, None

    order_item = (
        OrderItem.objects.filter(
            order__user=user,
            order__status=OrderStatus.DELIVERED,
            variant__product=product,
        )
        .select_related("order", "variant__product")
        .order_by("-order__updated_at", "-id")
        .first()
    )
    if not order_item:
        return {
            "can_review": False,
            "reason": "purchase_required",
            "message": "Chỉ khách hàng đã nhận sản phẩm mới có thể viết đánh giá.",
        }, None

    return {
        "can_review": True,
        "reason": "eligible",
        "message": "Đơn hàng đã giao được xác minh.",
        "order_number": order_item.order.order_number,
    }, order_item


@api_view(["GET", "POST"])
@permission_classes([AllowAny])
def product_reviews(request, slug):
    product = get_object_or_404(Product, slug=slug, status=Product.Status.ACTIVE)
    if request.method == "GET":
        queryset = Review.objects.filter(
            product=product,
            status=ModerationStatus.PUBLISHED,
            order_item__order__status=OrderStatus.DELIVERED,
            order_item__variant__product=product,
            order_item__order__user_id=F("user_id"),
        ).select_related("user", "order_item__order", "order_item__variant").prefetch_related("replies__user")
        summary = queryset.aggregate(rating=Avg("stars"), count=Count("id"))
        eligibility, _ = review_eligibility(request.user, product)
        return Response({
            "rating": summary["rating"],
            "count": summary["count"],
            "results": ReviewSerializer(queryset, many=True).data,
            "eligibility": eligibility,
        })
    auth_error = require_user(request)
    if auth_error:
        return auth_error
    eligibility, order_item = review_eligibility(request.user, product)
    if not eligibility["can_review"]:
        return Response(
            {"detail": eligibility["message"], "code": eligibility["reason"]},
            status=status.HTTP_403_FORBIDDEN,
        )
    serializer = ReviewSerializer(
        data=request.data,
        context={"request": request, "product": product, "order_item": order_item},
    )
    serializer.is_valid(raise_exception=True)
    try:
        review = serializer.save(
            product=product,
            user=request.user,
            order_item=order_item,
            status=ModerationStatus.PENDING,
        )
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
def review_replies(request, review_id):
    review = get_object_or_404(
        Review.objects.select_related("order_item__order", "order_item__variant__product"),
        id=review_id,
        status=ModerationStatus.PUBLISHED,
        order_item__order__status=OrderStatus.DELIVERED,
    )
    if request.method == "GET":
        replies = review.replies.filter(status=ModerationStatus.PUBLISHED).select_related("user").order_by("created_at", "id")
        return Response({"results": ReviewReplySerializer(replies, many=True).data})

    auth_error = require_user(request)
    if auth_error:
        return auth_error
    serializer = ReviewReplySerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    reply = serializer.save(review=review, user=request.user, status=ModerationStatus.PENDING)
    return Response(ReviewReplySerializer(reply).data, status=status.HTTP_201_CREATED)


@api_view(["GET", "POST"])
@permission_classes([AllowAny])
def product_questions(request, slug):
    product = get_object_or_404(Product, slug=slug, status=Product.Status.ACTIVE)
    if request.method == "GET":
        questions = (
            ProductQuestion.objects.filter(product=product, status=ModerationStatus.PUBLISHED)
            .select_related("user")
            .prefetch_related("answers__user")
            .order_by("-created_at")
        )
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
