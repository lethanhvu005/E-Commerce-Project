from django.db import IntegrityError, transaction
from django.test import TestCase
from rest_framework import status
from rest_framework.test import APITestCase
from rest_framework_simplejwt.tokens import RefreshToken
from accounts.models import User
from common.test_factories import catalog
from .models import Wishlist


class WishlistModelTests(TestCase):
    def test_duplicate_product_is_rejected(self):
        product, _ = catalog()
        user = User.objects.create_user('buyer@example.test')
        Wishlist.objects.create(user=user, product=product)
        with self.assertRaises(IntegrityError), transaction.atomic():
            Wishlist.objects.create(user=user, product=product)


class WishlistApiTests(APITestCase):
    def test_wishlist_uses_authenticated_user(self):
        product, _ = catalog()
        product.status = "active"
        product.save(update_fields=["status"])
        user = User.objects.create_user("wish@example.test", "Buyer!Password123")
        token = RefreshToken.for_user(user)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {token.access_token}")

        created = self.client.post("/api/wishlist/", {"product_id": product.id}, format="json")
        self.assertEqual(created.status_code, status.HTTP_201_CREATED)
        self.assertTrue(Wishlist.objects.filter(user=user, product=product).exists())
        self.assertEqual(self.client.get("/api/wishlist/").status_code, status.HTTP_200_OK)
        self.assertEqual(self.client.delete(f"/api/wishlist/{product.id}/").status_code, status.HTTP_204_NO_CONTENT)
