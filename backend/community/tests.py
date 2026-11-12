from django.core.exceptions import ValidationError
from django.db import IntegrityError, transaction
from django.test import TestCase
from rest_framework import status
from rest_framework.test import APITestCase
from rest_framework_simplejwt.tokens import RefreshToken
from accounts.models import User
from common.test_factories import catalog, order
from orders.models import OrderItem
from .models import ModerationStatus, ProductQuestion, Review


class CommunityModelTests(TestCase):
    def test_review_rating_and_trimmed_length(self):
        product, _ = catalog()
        purchase = order()
        for fields in [{'stars': 6, 'body': 'Long enough review'}, {'stars': 4, 'body': '    short    '}]:
            with self.subTest(fields=fields), self.assertRaises(IntegrityError), transaction.atomic():
                Review.objects.create(product=product, user=purchase.user, **fields)

    def test_verified_buyer_is_derived(self):
        product, variant = catalog()
        purchase = order()
        item = OrderItem.objects.create(order=purchase, variant=variant, product_name_snapshot=product.name, sku_snapshot=variant.sku, quantity=1, unit_price=100, line_total=100)
        review = Review(product=product, user=purchase.user, order_item=item, stars=5, body='A useful product review')
        self.assertFalse(review.is_verified_buyer)
        with self.assertRaises(ValidationError):
            review.full_clean()
        purchase.status = 'delivered'
        purchase.save()
        review.order_item.order = purchase
        self.assertTrue(review.is_verified_buyer)
        review.full_clean()


class CommunityApiTests(APITestCase):
    def setUp(self):
        self.product, _ = catalog()
        self.product.status = "active"
        self.product.save(update_fields=["status"])
        self.user = User.objects.create_user("reviewer@example.test", "Buyer!Password123")
        token = RefreshToken.for_user(self.user)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {token.access_token}")

    def test_review_is_pending_and_not_public_until_published(self):
        created = self.client.post(
            f"/api/products/{self.product.slug}/reviews/",
            {"stars": 5, "body": "Sản phẩm dùng rất tốt."},
            format="json",
        )
        self.assertEqual(created.status_code, status.HTTP_201_CREATED)
        self.assertEqual(created.data["status"], ModerationStatus.PENDING)
        public = self.client.get(f"/api/products/{self.product.slug}/reviews/")
        self.assertEqual(public.data["count"], 0)

        review = Review.objects.get(user=self.user, product=self.product)
        review.status = ModerationStatus.PUBLISHED
        review.save(update_fields=["status"])
        self.assertEqual(self.client.get(f"/api/products/{self.product.slug}/reviews/").data["count"], 1)

    def test_question_is_pending(self):
        response = self.client.post(
            f"/api/products/{self.product.slug}/questions/",
            {"body": "Sản phẩm có bảo hành không?"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["status"], ModerationStatus.PENDING)
        self.assertEqual(ProductQuestion.objects.get().user, self.user)
