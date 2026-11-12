from django.contrib.auth import authenticate
from django.db import IntegrityError, transaction
from django.test import TestCase
from rest_framework import status
from rest_framework.test import APITestCase
from rest_framework_simplejwt.tokens import RefreshToken
from .models import Address, User


class AccountModelTests(TestCase):
    def test_email_login_password_and_permissions(self):
        user = User.objects.create_superuser(' ADMIN@example.test ', 'test-password')
        self.assertEqual(user.email, 'admin@example.test')
        self.assertTrue(user.check_password('test-password'))
        self.assertTrue(user.is_staff and user.is_superuser)
        self.assertEqual(authenticate(email=user.email, password='test-password'), user)
        with self.assertRaises(ValueError):
            User.objects.create_superuser('bad@example.test', is_staff=False)

    def test_only_one_default_address(self):
        user = User.objects.create_user('buyer@example.test')
        fields = dict(user=user, recipient_name='Buyer', phone='000', address_line='Street', ward='Ward', province='City', is_default=True)
        Address.objects.create(**fields)
        with self.assertRaises(IntegrityError), transaction.atomic():
            Address.objects.create(**fields)


class RegisterApiTests(APITestCase):
    url = "/api/auth/register/"

    def test_register_creates_customer_and_does_not_return_password(self):
        response = self.client.post(
            self.url,
            {
                "email": "  NewBuyer@Example.test ",
                "password": "R4ndom!Buyer-Password",
                "first_name": "New",
                "last_name": "Buyer",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertNotIn("password", response.data)
        self.assertEqual(response.data["email"], "newbuyer@example.test")

        user = User.objects.get(email="newbuyer@example.test")
        self.assertTrue(user.check_password("R4ndom!Buyer-Password"))
        self.assertFalse(user.is_staff)
        self.assertFalse(user.is_superuser)

    def test_duplicate_email_is_rejected_without_case_sensitivity(self):
        User.objects.create_user("buyer@example.test", "Existing!Password123")

        response = self.client.post(
            self.url,
            {
                "email": "BUYER@example.test",
                "password": "R4ndom!Buyer-Password",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("email", response.data)
        self.assertEqual(User.objects.filter(email="buyer@example.test").count(), 1)

    def test_weak_password_is_rejected(self):
        response = self.client.post(
            self.url,
            {"email": "weak@example.test", "password": "123"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("password", response.data)
        self.assertFalse(User.objects.filter(email="weak@example.test").exists())

    def test_password_similar_to_account_name_is_rejected(self):
        response = self.client.post(
            self.url,
            {
                "email": "john.doe@example.test",
                "password": "john.doe@example.test",
                "first_name": "John",
                "last_name": "Doe",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("password", response.data)
        self.assertFalse(User.objects.filter(email="john.doe@example.test").exists())

    def test_registration_rejects_client_supplied_staff_role(self):
        response = self.client.post(
            self.url,
            {
                "email": "staff@example.test",
                "password": "R4ndom!Buyer-Password",
                "is_staff": True,
                "is_superuser": True,
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("is_staff", response.data)
        self.assertFalse(User.objects.filter(email="staff@example.test").exists())

    def test_register_does_not_allow_get(self):
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_405_METHOD_NOT_ALLOWED)


class AccountAuthApiTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user("buyer@example.test", "Buyer!Password123")

    def authenticate(self, user=None):
        refresh = RefreshToken.for_user(user or self.user)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {refresh.access_token}")
        return refresh

    def test_login_refresh_and_logout(self):
        login_response = self.client.post(
            "/api/auth/login/",
            {"email": "BUYER@example.test", "password": "Buyer!Password123"},
            format="json",
        )
        self.assertEqual(login_response.status_code, status.HTTP_200_OK)
        self.assertIn("access", login_response.data)
        self.assertIn("refresh", login_response.data)

        refresh_response = self.client.post(
            "/api/auth/token/refresh/",
            {"refresh": login_response.data["refresh"]},
            format="json",
        )
        self.assertEqual(refresh_response.status_code, status.HTTP_200_OK)
        self.assertIn("access", refresh_response.data)
        self.assertIn("refresh", refresh_response.data)

        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {refresh_response.data['access']}")
        logout_response = self.client.post(
            "/api/auth/logout/",
            {"refresh": refresh_response.data["refresh"]},
            format="json",
        )
        self.assertEqual(logout_response.status_code, status.HTTP_204_NO_CONTENT)

        replay_response = self.client.post(
            "/api/auth/token/refresh/",
            {"refresh": refresh_response.data["refresh"]},
            format="json",
        )
        self.assertEqual(replay_response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_me_rejects_protected_fields(self):
        self.authenticate()
        response = self.client.patch(
            "/api/accounts/me/",
            {"first_name": "Buyer", "email": "hacker@example.test", "is_staff": True},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.user.refresh_from_db()
        self.assertEqual(self.user.email, "buyer@example.test")
        self.assertFalse(self.user.is_staff)

    def test_addresses_are_scoped_to_current_user(self):
        self.authenticate()
        created = self.client.post(
            "/api/accounts/me/addresses/",
            {
                "recipient": "Buyer",
                "phone": "0900000000",
                "address": "1 Main Street",
                "ward": "Ward 1",
                "province": "Da Nang",
                "is_default": True,
            },
            format="json",
        )
        self.assertEqual(created.status_code, status.HTTP_201_CREATED)

        other = User.objects.create_user("other@example.test", "Other!Password123")
        other_address = Address.objects.create(
            user=other,
            recipient_name="Other",
            phone="0911111111",
            address_line="2 Other Street",
            ward="Ward 2",
            province="Hue",
        )
        forbidden = self.client.get(f"/api/accounts/me/addresses/{other_address.id}/")
        self.assertEqual(forbidden.status_code, status.HTTP_404_NOT_FOUND)

        listing = self.client.get("/api/accounts/me/addresses/")
        self.assertEqual(listing.status_code, status.HTTP_200_OK)
        self.assertEqual(len(listing.data["results"]), 1)
