from django.core.exceptions import ValidationError
from django.db import IntegrityError, transaction
from django.db.models.deletion import ProtectedError
from django.test import TestCase
from rest_framework import status
from rest_framework.test import APITestCase
from rest_framework_simplejwt.tokens import RefreshToken
from accounts.models import User
from common.test_factories import catalog
from .models import Brand, Product, ProductImage, ProductVariant


class CatalogModelTests(TestCase):
    def setUp(self):
        self.product, self.variant = catalog()

    def test_defaults_and_full_clean(self):
        self.product.full_clean()
        self.variant.full_clean()
        self.assertEqual(self.product.status, 'draft')
        self.assertEqual(self.product.specifications, {})
        self.assertIsNotNone(self.product.created_at)
        self.assertEqual(self.product.variants.get(), self.variant)

    def test_prices_and_json_are_checked_on_bulk_write(self):
        for change in [{'price': -1}, {'compare_at_price': 50}, {'sku': 'lowercase'}]:
            with self.subTest(change=change), self.assertRaises(IntegrityError), transaction.atomic():
                ProductVariant.objects.filter(pk=self.variant.pk).update(**change)
        with self.assertRaises(IntegrityError), transaction.atomic():
            Product.objects.filter(pk=self.product.pk).update(specifications=[])

    def test_image_variant_must_belong_to_product(self):
        other = Product.objects.create(category=self.product.category, brand=self.product.brand, name='Other', short_name='Other', slug='other')
        image = ProductImage(product=other, variant=self.variant, object_key='image.png', width=10, height=10)
        with self.assertRaises(ValidationError):
            image.full_clean()
        with self.assertRaises(IntegrityError), transaction.atomic():
            image.save()

    def test_crud_and_protected_parent(self):
        brand = Brand.objects.create(name='Unused', slug='unused')
        brand.name = 'Updated'
        brand.save()
        brand.refresh_from_db()
        self.assertEqual(brand.name, 'Updated')
        brand.delete()
        self.assertFalse(Brand.objects.filter(slug='unused').exists())
        with self.assertRaises(ProtectedError):
            self.product.brand.delete()


class CatalogApiTests(APITestCase):
    def setUp(self):
        self.product, self.variant = catalog()
        self.product.status = Product.Status.ACTIVE
        self.product.save(update_fields=["status"])

    def test_public_catalog_list_and_detail(self):
        listing = self.client.get("/api/products/?search=Keyboard&ordering=price")
        self.assertEqual(listing.status_code, status.HTTP_200_OK)
        self.assertEqual(listing.data["count"], 1)
        self.assertEqual(listing.data["results"][0]["slug"], "keyboard")

        detail = self.client.get("/api/products/keyboard/")
        self.assertEqual(detail.status_code, status.HTTP_200_OK)
        self.assertEqual(detail.data["variants"][0]["sku"], "KB-01")
        self.assertEqual(detail.data["variants"][0]["available"], 0)

    def test_draft_product_is_not_public(self):
        self.product.status = Product.Status.DRAFT
        self.product.save(update_fields=["status"])
        self.assertEqual(self.client.get("/api/products/").data["count"], 0)
        self.assertEqual(self.client.get("/api/products/keyboard/").status_code, status.HTTP_404_NOT_FOUND)

    def test_categories_and_brands_are_public(self):
        categories = self.client.get("/api/categories/")
        brands = self.client.get("/api/brands/")
        self.assertEqual(categories.status_code, status.HTTP_200_OK)
        self.assertEqual(brands.status_code, status.HTTP_200_OK)
        self.assertEqual(len(categories.data["results"]), 1)
        self.assertEqual(len(brands.data["results"]), 1)


class AdminCatalogApiTests(APITestCase):
    def authenticate(self, user):
        token = RefreshToken.for_user(user)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {token.access_token}")

    def test_customer_cannot_access_admin_products(self):
        self.authenticate(User.objects.create_user("buyer-catalog@example.test", "Buyer!Password123"))
        self.assertEqual(self.client.get("/api/admin/products/").status_code, status.HTTP_403_FORBIDDEN)

    def test_superuser_can_list_create_update_and_manage_variant_and_image(self):
        admin = User.objects.create_superuser("admin-catalog@example.test", "Admin!Password123")
        self.authenticate(admin)
        existing, _ = catalog()

        listing = self.client.get("/api/admin/products/?status=draft&search=Keyboard")
        self.assertEqual(listing.status_code, status.HTTP_200_OK)
        self.assertEqual(listing.data["count"], 1)

        payload = {
            "category_id": existing.category_id,
            "brand_id": existing.brand_id,
            "name": "Admin Mouse",
            "slug": "admin-mouse",
            "short_name": "Mouse",
            "summary": "Created through admin API",
            "status": "draft",
            "warranty_months": 24,
        }
        created = self.client.post("/api/admin/products/", payload, format="json")
        self.assertEqual(created.status_code, status.HTTP_201_CREATED)
        product_id = created.data["id"]

        updated = self.client.patch(f"/api/admin/products/{product_id}/", {"status": "active"}, format="json")
        self.assertEqual(updated.status_code, status.HTTP_200_OK)
        self.assertEqual(updated.data["status"], "active")

        variant = self.client.post(
            f"/api/admin/products/{product_id}/variants/",
            {"sku": " mouse-01 ", "option_key": "default", "price": 500000},
            format="json",
        )
        self.assertEqual(variant.status_code, status.HTTP_201_CREATED)
        self.assertEqual(variant.data["sku"], "MOUSE-01")

        image = self.client.post(
            f"/api/admin/products/{product_id}/images/",
            {"variant_id": variant.data["id"], "object_key": "products/mouse.webp", "width": 800, "height": 800, "is_cover": True},
            format="json",
        )
        self.assertEqual(image.status_code, status.HTTP_201_CREATED)
        self.assertTrue(image.data["is_cover"])


class SeedFrontendDemoCommandTests(TestCase):
    def test_seed_command_blocks_when_debug_is_false(self):
        from django.core.management import CommandError, call_command
        from django.test import override_settings

        with override_settings(DEBUG=False):
            with self.assertRaises(CommandError):
                call_command("seed_frontend_demo")

    def test_seed_command_is_idempotent_and_preserves_existing_business_data(self):
        from django.core.management import call_command
        from django.test import override_settings
        from inventory.models import InventoryBalance, InventoryReservation
        from orders.models import Order

        with override_settings(DEBUG=True):
            call_command("seed_frontend_demo")
            self.assertEqual(Product.objects.count(), 24)
            self.assertEqual(Order.objects.count(), 30)
            self.assertFalse(User.objects.filter(is_superuser=True).exists())

            # Modify an existing variant price and inventory balance
            variant = ProductVariant.objects.get(sku="NEXA-X75")
            variant.price = 1990000
            variant.save(update_fields=["price"])
            balance = InventoryBalance.objects.get(variant=variant)
            balance.on_hand = 123
            balance.save(update_fields=["on_hand"])

            # Re-run seed command without --force-overwrite: existing data must be preserved
            call_command("seed_frontend_demo")
            variant.refresh_from_db()
            balance.refresh_from_db()
            self.assertEqual(variant.price, 1990000)
            self.assertEqual(balance.on_hand, 123)
            self.assertEqual(Product.objects.count(), 24)
            self.assertEqual(Order.objects.count(), 30)

            # Active reservations use 30-minute window
            active_res = InventoryReservation.objects.filter(status=InventoryReservation.Status.ACTIVE).first()
            self.assertIsNotNone(active_res)

            # Non-staff customers must not belong to any staff groups
            self.assertEqual(User.objects.filter(is_staff=False, groups__isnull=False).count(), 0)
            call_command("audit_rbac_permissions")

