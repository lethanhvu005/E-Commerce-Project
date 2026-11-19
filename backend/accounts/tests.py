from django.conf import settings
from django.contrib.auth import authenticate
from django.core.cache import cache
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

    def setUp(self):
        cache.clear()

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
        cache.clear()
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

    def test_refresh_token_rejects_deactivated_user(self):
        refresh = RefreshToken.for_user(self.user)
        self.user.is_active = False
        self.user.save(update_fields=["is_active"])
        response = self.client.post(
            "/api/auth/token/refresh/",
            {"refresh": str(refresh)},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

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

    def test_facebook_user_can_add_email_from_profile(self):
        facebook_user = User.objects.create_user(
            email=None,
            password=None,
            facebook_sub="facebook-profile-email-001",
            first_name="Facebook",
        )
        self.authenticate(facebook_user)

        profile = self.client.get("/api/accounts/me/")
        self.assertEqual(profile.status_code, status.HTTP_200_OK)
        self.assertIsNone(profile.data["email"])
        self.assertTrue(profile.data["can_edit_email"])

        updated = self.client.patch(
            "/api/accounts/me/",
            {"email": "  Facebook.User@Example.test  "},
            format="json",
        )
        self.assertEqual(updated.status_code, status.HTTP_200_OK)
        self.assertEqual(updated.data["email"], "facebook.user@example.test")
        facebook_user.refresh_from_db()
        self.assertEqual(facebook_user.email, "facebook.user@example.test")
        self.assertIsNone(facebook_user.email_verified_at)

    def test_facebook_user_cannot_take_existing_email(self):
        facebook_user = User.objects.create_user(
            email=None,
            password=None,
            facebook_sub="facebook-profile-email-002",
        )
        self.authenticate(facebook_user)
        response = self.client.patch(
            "/api/accounts/me/",
            {"email": "BUYER@example.test"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        facebook_user.refresh_from_db()
        self.assertIsNone(facebook_user.email)

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

    def test_google_login_creates_verified_user_and_returns_jwt(self):
        from unittest.mock import patch
        from django.test import override_settings

        mock_payload = {
            "aud": "test-google-client-id.apps.googleusercontent.com",
            "iss": "https://accounts.google.com",
            "sub": "google-sub-1234567890",
            "email": "GoogleUser@Example.test",
            "email_verified": "true",
            "given_name": "Minh",
            "family_name": "Nguyễn",
        }
        with override_settings(GOOGLE_CLIENT_ID="test-google-client-id.apps.googleusercontent.com"):
            with patch("accounts.views.verify_google_oauth_payload", return_value=mock_payload):
                res = self.client.post(
                    "/api/auth/google/",
                    {"access_token": "mock-google-access-token"},
                    format="json",
                )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertIn("access", res.data)
        self.assertIn("refresh", res.data)
        self.assertEqual(res.data["user"]["email"], "googleuser@example.test")
        user = User.objects.get(email="googleuser@example.test")
        self.assertEqual(user.google_sub, "google-sub-1234567890")
        self.assertIsNotNone(user.email_verified_at)
        self.assertEqual(user.first_name, "Minh")
        self.assertEqual(user.last_name, "Nguyễn")

        # Subsequent login with same sub but changed Google email still resolves to bound user
        changed_email_payload = {**mock_payload, "email": "new-google-email@example.test"}
        with override_settings(GOOGLE_CLIENT_ID="test-google-client-id.apps.googleusercontent.com"):
            with patch("accounts.views.verify_google_oauth_payload", return_value=changed_email_payload):
                res2 = self.client.post(
                    "/api/auth/google/",
                    {"access_token": "mock-google-access-token"},
                    format="json",
                )
        self.assertEqual(res2.status_code, status.HTTP_200_OK)
        self.assertEqual(res2.data["user"]["id"], user.id)

    def test_google_login_blocks_staff_and_existing_password_accounts_and_invalid_iss(self):
        from unittest.mock import patch
        from django.test import override_settings

        staff = User.objects.create_user("staff-oauth@example.test", "Staff!Password123", is_staff=True)
        pwd_user = User.objects.create_user("pwd-oauth@example.test", "Customer!Password123")

        with override_settings(GOOGLE_CLIENT_ID="test-google-client-id.apps.googleusercontent.com"):
            # 1. Block staff account auto-linking
            staff_payload = {
                "aud": "test-google-client-id.apps.googleusercontent.com",
                "iss": "https://accounts.google.com",
                "sub": "google-sub-staff-001",
                "email": staff.email,
                "email_verified": "true",
            }
            with patch("accounts.views.verify_google_oauth_payload", return_value=staff_payload):
                res_staff = self.client.post("/api/auth/google/", {"access_token": "tok"}, format="json")
            self.assertEqual(res_staff.status_code, status.HTTP_403_FORBIDDEN)
            self.assertTrue(res_staff.data.get("requires_reverification"))

            # 1b. Staff account can link Google OAuth after step-up password verification & logs AuditLog (S11)
            from operations.models import AuditLog

            with patch("accounts.views.verify_google_oauth_payload", return_value=staff_payload):
                res_staff_linked = self.client.post(
                    "/api/auth/google/",
                    {"access_token": "tok", "password": "Staff!Password123"},
                    format="json",
                )
            self.assertEqual(res_staff_linked.status_code, status.HTTP_200_OK)
            staff.refresh_from_db()
            self.assertEqual(staff.google_sub, "google-sub-staff-001")
            self.assertTrue(
                AuditLog.objects.filter(
                    actor=staff,
                    action="account.google_oauth_linked",
                    entity_id=str(staff.pk),
                ).exists()
            )

            # 1c. Subsequent Google login for already-linked staff succeeds directly & logs AuditLog
            with patch("accounts.views.verify_google_oauth_payload", return_value=staff_payload):
                res_staff_next = self.client.post("/api/auth/google/", {"access_token": "tok"}, format="json")
            self.assertEqual(res_staff_next.status_code, status.HTTP_200_OK)
            self.assertTrue(
                AuditLog.objects.filter(
                    actor=staff,
                    action="account.staff_google_oauth_login",
                    entity_id=str(staff.pk),
                ).exists()
            )

            # 2. Block existing password account auto-linking
            pwd_payload = {
                "aud": "test-google-client-id.apps.googleusercontent.com",
                "iss": "https://accounts.google.com",
                "sub": "google-sub-pwd-001",
                "email": pwd_user.email,
                "email_verified": "true",
            }
            with patch("accounts.views.verify_google_oauth_payload", return_value=pwd_payload):
                res_pwd = self.client.post("/api/auth/google/", {"access_token": "tok"}, format="json")
            self.assertEqual(res_pwd.status_code, status.HTTP_409_CONFLICT)

            # 3. Reject invalid issuer (iss)
            bad_iss_payload = {
                "aud": "test-google-client-id.apps.googleusercontent.com",
                "iss": "https://evil-issuer.example.com",
                "sub": "google-sub-evil-001",
                "email": "new-oauth@example.test",
                "email_verified": "true",
            }
            with patch("accounts.views.verify_google_oauth_payload", return_value=bad_iss_payload):
                res_iss = self.client.post("/api/auth/google/", {"access_token": "tok"}, format="json")
            self.assertEqual(res_iss.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_facebook_config_and_login_create_verified_customer(self):
        from unittest.mock import patch
        from django.test import override_settings

        profile = {
            "id": "facebook-user-123",
            "email": "FacebookUser@example.test",
            "first_name": "An",
            "last_name": "Nguyen",
        }
        with override_settings(FACEBOOK_APP_ID="facebook-app-123", FACEBOOK_APP_SECRET="secret"):
            config = self.client.get("/api/auth/facebook/config/")
            self.assertEqual(config.status_code, status.HTTP_200_OK)
            self.assertEqual(config.data, {"app_id": "facebook-app-123", "enabled": True})

            with patch("accounts.views.verify_facebook_access_token", return_value=profile):
                response = self.client.post(
                    "/api/auth/facebook/",
                    {"access_token": "facebook-access-token"},
                    format="json",
                )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("access", response.data)
        self.assertIn("refresh", response.data)
        user = User.objects.get(email="facebookuser@example.test")
        self.assertEqual(user.facebook_sub, "facebook-user-123")
        self.assertFalse(user.has_usable_password())
        self.assertIsNotNone(user.email_verified_at)

    def test_facebook_login_rejects_existing_password_account(self):
        from unittest.mock import patch
        from django.test import override_settings

        User.objects.create_user("existing@example.test", "Customer!Password123")
        profile = {
            "id": "facebook-user-existing",
            "email": "existing@example.test",
            "first_name": "Existing",
            "last_name": "User",
        }
        with override_settings(FACEBOOK_APP_ID="facebook-app-123", FACEBOOK_APP_SECRET="secret"):
            with patch("accounts.views.verify_facebook_access_token", return_value=profile):
                response = self.client.post(
                    "/api/auth/facebook/",
                    {"access_token": "facebook-access-token"},
                    format="json",
                )

        self.assertEqual(response.status_code, status.HTTP_409_CONFLICT)

    def test_facebook_login_works_without_email_and_does_not_create_fake_email(self):
        from unittest.mock import patch
        from django.test import override_settings

        profile = {
            "id": "facebook-user-without-email",
            "first_name": "No",
            "last_name": "Email",
        }
        with override_settings(FACEBOOK_APP_ID="facebook-app-123", FACEBOOK_APP_SECRET="secret"):
            with patch("accounts.views.verify_facebook_access_token", return_value=profile):
                response = self.client.post(
                    "/api/auth/facebook/",
                    {"access_token": "facebook-access-token"},
                    format="json",
                )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data["requires_email_verification"])
        user = User.objects.get(facebook_sub="facebook-user-without-email")
        self.assertIsNone(user.email)
        self.assertIsNone(user.email_verified_at)

    def test_facebook_user_email_otp_request_and_verify_flow(self):
        from django.core import mail
        from django.core.cache import cache

        fb_user = User.objects.create_user(
            email=None,
            password=None,
            facebook_sub="facebook-otp-user-001",
            first_name="Minh",
            last_name="Le",
        )
        self.authenticate(fb_user)

        # 1. Cannot request OTP for an email already taken by another user
        taken_res = self.client.post(
            "/api/accounts/me/email-otp/request/",
            {"email": "BUYER@example.test"},
            format="json",
        )
        self.assertEqual(taken_res.status_code, status.HTTP_400_BAD_REQUEST)

        # 2. Request OTP for a new Gmail address
        req_res = self.client.post(
            "/api/accounts/me/email-otp/request/",
            {"email": "  NewUser.FB@gmail.com  "},
            format="json",
        )
        self.assertEqual(req_res.status_code, status.HTTP_200_OK)
        self.assertEqual(req_res.data["email"], "newuser.fb@gmail.com")
        self.assertEqual(len(mail.outbox), 1)
        self.assertIn("newuser.fb@gmail.com", mail.outbox[0].to)

        otp_record = cache.get(f"email_otp:{fb_user.pk}")
        self.assertIsNotNone(otp_record)
        code = otp_record["code"]
        self.assertEqual(len(code), 6)
        self.assertTrue(code.isdigit())

        # 3. Wrong OTP is rejected
        wrong_code = "000000" if code != "000000" else "999999"
        wrong_res = self.client.post(
            "/api/accounts/me/email-otp/verify/",
            {"email": "newuser.fb@gmail.com", "otp": wrong_code},
            format="json",
        )
        self.assertEqual(wrong_res.status_code, status.HTTP_400_BAD_REQUEST)
        fb_user.refresh_from_db()
        self.assertIsNone(fb_user.email)

        # 4. Correct OTP verifies and binds the Gmail address
        verify_res = self.client.post(
            "/api/accounts/me/email-otp/verify/",
            {"email": "newuser.fb@gmail.com", "otp": code},
            format="json",
        )
        self.assertEqual(verify_res.status_code, status.HTTP_200_OK)
        self.assertEqual(verify_res.data["user"]["email"], "newuser.fb@gmail.com")
        self.assertIsNotNone(verify_res.data["user"]["email_verified_at"])

        fb_user.refresh_from_db()
        self.assertEqual(fb_user.email, "newuser.fb@gmail.com")
        self.assertIsNotNone(fb_user.email_verified_at)
        self.assertIsNone(cache.get(f"email_otp:{fb_user.pk}"))

    def test_email_otp_requests_are_rate_limited_per_user(self):
        from django.test import override_settings

        facebook_user = User.objects.create_user(
            email=None,
            password=None,
            facebook_sub="facebook-otp-throttle-001",
        )
        self.authenticate(facebook_user)

        rates = {
            "anon": "60/minute",
            "login": "5/minute",
            "password_reset": "10/minute",
            "register": "3/hour",
            "otp": "1/minute",
        }
        with override_settings(REST_FRAMEWORK={**settings.REST_FRAMEWORK, "DEFAULT_THROTTLE_RATES": rates}):
            first = self.client.post(
                "/api/accounts/me/email-otp/request/",
                {"email": "first.otp@gmail.com"},
                format="json",
            )
            second = self.client.post(
                "/api/accounts/me/email-otp/request/",
                {"email": "second.otp@gmail.com"},
                format="json",
            )

        self.assertEqual(first.status_code, status.HTTP_200_OK)
        self.assertEqual(second.status_code, status.HTTP_429_TOO_MANY_REQUESTS)

    def test_phone_and_email_must_have_valid_format(self):
        self.authenticate()
        bad_phone = self.client.patch("/api/accounts/me/", {"phone": "12345"}, format="json")
        self.assertEqual(bad_phone.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("phone", bad_phone.data)

        ok_phone = self.client.patch("/api/accounts/me/", {"phone": "+84 947 243 014"}, format="json")
        self.assertEqual(ok_phone.status_code, status.HTTP_200_OK)
        self.assertEqual(ok_phone.data["phone"], "0947243014")

        bad_addr = self.client.post(
            "/api/accounts/me/addresses/",
            {"recipient": "A", "phone": "0123456789", "address": "1 X", "ward": "W", "province": "P"},
            format="json",
        )
        self.assertEqual(bad_addr.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("phone", bad_addr.data)

        fb_user = User.objects.create_user(email=None, password=None, facebook_sub="fb-format-001")
        self.authenticate(fb_user)
        for bad_email in ("not-an-email", "abc@gmai.com", "a b@gmail.com"):
            res = self.client.post(
                "/api/accounts/me/email-otp/request/", {"email": bad_email}, format="json"
            )
            self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST, bad_email)

    def test_support_contact_dispatches_email(self):
        from django.core import mail

        res = self.client.post(
            "/api/accounts/support-contact/",
            {
                "name": "Khách Hàng Test",
                "email": "khach@example.test",
                "phone": "0901234567",
                "subject": "Tư vấn sản phẩm",
                "message": "Tôi muốn tư vấn thêm về bàn phím cơ không dây NEXA.",
            },
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertEqual(len(mail.outbox), 1)
        self.assertIn("Tư vấn sản phẩm", mail.outbox[0].subject)

    def test_profile_email_change_sends_otp_to_old_email_and_requires_new_email_otp_on_next_login(self):
        from django.core import mail

        user = User.objects.create_user(
            "old.buyer@gmail.com",
            "Buyer!Password123",
            first_name="Lan",
            last_name="Tran",
            google_sub="google-sub-old-123",
            email_verified_at=None,
        )
        self.authenticate(user)

        # Cannot change to existing user's email
        taken = self.client.post(
            "/api/accounts/me/email-change/request/",
            {"new_email": "buyer@example.test"},
            format="json",
        )
        self.assertEqual(taken.status_code, status.HTTP_400_BAD_REQUEST)

        # Request change -> OTP must go to OLD email
        req_res = self.client.post(
            "/api/accounts/me/email-change/request/",
            {"new_email": "  New.Buyer@gmail.com "},
            format="json",
        )
        self.assertEqual(req_res.status_code, status.HTTP_200_OK)
        self.assertEqual(req_res.data["old_email"], "old.buyer@gmail.com")
        self.assertEqual(req_res.data["new_email"], "new.buyer@gmail.com")
        self.assertEqual(len(mail.outbox), 1)
        self.assertEqual(mail.outbox[0].to, ["old.buyer@gmail.com"])

        old_otp = cache.get(f"email_change_otp:{user.pk}")["code"]

        # Wrong OTP rejected
        wrong_verify = self.client.post(
            "/api/accounts/me/email-change/verify/",
            {"new_email": "new.buyer@gmail.com", "otp": "000000" if old_otp != "000000" else "999999"},
            format="json",
        )
        self.assertEqual(wrong_verify.status_code, status.HTTP_400_BAD_REQUEST)

        # Correct OTP changes email and marks requires_email_login_otp=True
        ok_verify = self.client.post(
            "/api/accounts/me/email-change/verify/",
            {"new_email": "new.buyer@gmail.com", "otp": old_otp},
            format="json",
        )
        self.assertEqual(ok_verify.status_code, status.HTTP_200_OK)
        self.assertEqual(ok_verify.data["user"]["email"], "new.buyer@gmail.com")
        user.refresh_from_db()
        self.assertEqual(user.email, "new.buyer@gmail.com")
        self.assertIsNone(user.email_verified_at)
        self.assertTrue(user.requires_email_login_otp)
        self.assertIsNone(user.google_sub)

        # Next login with new email: wrong password rejected before OTP
        self.client.credentials()
        bad_pw = self.client.post(
            "/api/auth/login/",
            {"email": "new.buyer@gmail.com", "password": "WrongPassword!999"},
            format="json",
        )
        self.assertEqual(bad_pw.status_code, status.HTTP_401_UNAUTHORIZED)

        # Correct password triggers OTP sent to NEW email (no tokens issued yet)
        mail.outbox.clear()
        login_challenge = self.client.post(
            "/api/auth/login/",
            {"email": "new.buyer@gmail.com", "password": "Buyer!Password123"},
            format="json",
        )
        self.assertEqual(login_challenge.status_code, status.HTTP_200_OK)
        self.assertTrue(login_challenge.data["requires_email_verification"])
        self.assertNotIn("access", login_challenge.data)
        self.assertEqual(len(mail.outbox), 1)
        self.assertEqual(mail.outbox[0].to, ["new.buyer@gmail.com"])

        new_login_otp = cache.get(f"login_new_email_otp:{user.pk}")["code"]

        # Verify login OTP issues JWT tokens and clears flag
        login_done = self.client.post(
            "/api/auth/login/",
            {"email": "new.buyer@gmail.com", "password": "Buyer!Password123", "otp": new_login_otp},
            format="json",
        )
        self.assertEqual(login_done.status_code, status.HTTP_200_OK)
        self.assertIn("access", login_done.data)
        self.assertIn("refresh", login_done.data)

        user.refresh_from_db()
        self.assertFalse(user.requires_email_login_otp)
        self.assertIsNotNone(user.email_verified_at)

        # Following login proceeds directly without OTP
        login_next = self.client.post(
            "/api/auth/login/",
            {"email": "new.buyer@gmail.com", "password": "Buyer!Password123"},
            format="json",
        )
        self.assertEqual(login_next.status_code, status.HTTP_200_OK)
        self.assertIn("access", login_next.data)

    def test_forgot_password_request_and_confirm_flow(self):
        from django.core import mail

        # Unknown email returns generic 200 without sending email
        unknown_res = self.client.post(
            "/api/auth/password-reset/request/",
            {"email": "nobody@gmail.com"},
            format="json",
        )
        self.assertEqual(unknown_res.status_code, status.HTTP_200_OK)
        self.assertEqual(len(mail.outbox), 0)

        # Registered user requests password reset
        req_res = self.client.post(
            "/api/auth/password-reset/request/",
            {"email": "buyer@example.test"},
            format="json",
        )
        self.assertEqual(req_res.status_code, status.HTTP_200_OK)
        self.assertEqual(len(mail.outbox), 1)
        self.assertEqual(mail.outbox[0].to, ["buyer@example.test"])

        reset_otp = cache.get(f"password_reset_otp:{self.user.pk}")["code"]

        # Wrong OTP rejected
        bad_otp = self.client.post(
            "/api/auth/password-reset/confirm/",
            {
                "email": "buyer@example.test",
                "otp": "000000" if reset_otp != "000000" else "999999",
                "new_password": "NewStrong!Password456",
                "confirm_password": "NewStrong!Password456",
            },
            format="json",
        )
        self.assertEqual(bad_otp.status_code, status.HTTP_400_BAD_REQUEST)

        # Weak password rejected without consuming OTP
        weak_pw = self.client.post(
            "/api/auth/password-reset/confirm/",
            {
                "email": "buyer@example.test",
                "otp": reset_otp,
                "new_password": "123",
                "confirm_password": "123",
            },
            format="json",
        )
        self.assertEqual(weak_pw.status_code, status.HTTP_400_BAD_REQUEST)

        # Valid confirmation updates password
        confirm_res = self.client.post(
            "/api/auth/password-reset/confirm/",
            {
                "email": "buyer@example.test",
                "otp": reset_otp,
                "new_password": "NewStrong!Password456",
                "confirm_password": "NewStrong!Password456",
            },
            format="json",
        )
        self.assertEqual(confirm_res.status_code, status.HTTP_200_OK)
        self.assertIsNone(cache.get(f"password_reset_otp:{self.user.pk}"))

        # Old password fails, new password succeeds
        old_login = self.client.post(
            "/api/auth/login/",
            {"email": "buyer@example.test", "password": "Buyer!Password123"},
            format="json",
        )
        self.assertEqual(old_login.status_code, status.HTTP_401_UNAUTHORIZED)

        new_login = self.client.post(
            "/api/auth/login/",
            {"email": "buyer@example.test", "password": "NewStrong!Password456"},
            format="json",
        )
        self.assertEqual(new_login.status_code, status.HTTP_200_OK)
        self.assertIn("access", new_login.data)

    def test_brevo_https_mail_transport_when_configured(self):
        from unittest.mock import MagicMock, patch
        from django.test import override_settings

        mock_resp = MagicMock()
        mock_resp.status = 201
        mock_resp.__enter__.return_value = mock_resp

        with override_settings(
            EMAIL_BACKEND="django.core.mail.backends.smtp.EmailBackend",
            BREVO_API_KEY="test-brevo-key",
            BREVO_SENDER_EMAIL="sender@gmail.com",
        ), patch("accounts.mailer.urlopen", return_value=mock_resp) as mocked_urlopen:
            res = self.client.post(
                "/api/auth/password-reset/request/",
                {"email": "buyer@example.test"},
                format="json",
            )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertTrue(mocked_urlopen.called)
        req_arg = mocked_urlopen.call_args.args[0]
        self.assertEqual(req_arg.full_url, "https://api.brevo.com/v3/smtp/email")

    def test_smtp_blocked_port_fails_fast_without_hanging(self):
        from unittest.mock import patch
        from django.test import override_settings

        with override_settings(
            DEBUG=False,
            EMAIL_BACKEND="django.core.mail.backends.smtp.EmailBackend",
            BREVO_API_KEY="",
            RESEND_API_KEY="",
            EMAIL_WEBHOOK_URL="",
            EMAIL_HOST_USER="sender@gmail.com",
            EMAIL_HOST_PASSWORD="app-password",
        ), patch("accounts.mailer._probe_smtp_reachable", side_effect=TimeoutError("SMTP blocked")):
            res = self.client.post(
                "/api/auth/password-reset/request/",
                {"email": "buyer@example.test"},
                format="json",
            )
        self.assertEqual(res.status_code, status.HTTP_503_SERVICE_UNAVAILABLE)
        self.assertIsNone(cache.get(f"password_reset_otp:{self.user.pk}"))

    def test_webhook_mail_validates_json_ok_response(self):
        from unittest.mock import MagicMock, patch
        from django.test import override_settings

        ok_resp = MagicMock()
        ok_resp.status = 200
        ok_resp.read.return_value = b'{"ok": true}'
        ok_resp.__enter__.return_value = ok_resp

        with override_settings(
            EMAIL_BACKEND="django.core.mail.backends.smtp.EmailBackend",
            BREVO_API_KEY="",
            RESEND_API_KEY="",
            EMAIL_WEBHOOK_URL="https://script.google.com/macros/s/demo/exec",
            EMAIL_WEBHOOK_SECRET="sec-1",
        ), patch("accounts.mailer.urlopen", return_value=ok_resp):
            res_ok = self.client.post(
                "/api/auth/password-reset/request/",
                {"email": "buyer@example.test"},
                format="json",
            )
        self.assertEqual(res_ok.status_code, status.HTTP_200_OK)

        bad_resp = MagicMock()
        bad_resp.status = 200
        bad_resp.read.return_value = b'{"ok": false, "error": "unauthorized"}'
        bad_resp.__enter__.return_value = bad_resp

        with override_settings(
            DEBUG=False,
            EMAIL_BACKEND="django.core.mail.backends.smtp.EmailBackend",
            BREVO_API_KEY="",
            RESEND_API_KEY="",
            EMAIL_WEBHOOK_URL="https://script.google.com/macros/s/demo/exec",
            EMAIL_WEBHOOK_SECRET="wrong",
        ), patch("accounts.mailer.urlopen", return_value=bad_resp):
            res_bad = self.client.post(
                "/api/auth/password-reset/request/",
                {"email": "buyer@example.test"},
                format="json",
            )
        self.assertEqual(res_bad.status_code, status.HTTP_503_SERVICE_UNAVAILABLE)


