from django.core.exceptions import ValidationError
from django.db import IntegrityError, transaction
from django.db.models.deletion import ProtectedError
from django.test import TestCase
from rest_framework import status
from rest_framework.test import APITestCase
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
