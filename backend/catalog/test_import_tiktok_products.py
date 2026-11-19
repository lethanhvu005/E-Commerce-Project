import json
import tempfile
from pathlib import Path

from django.core.management import call_command
from django.test import TestCase

from catalog.management.commands.import_tiktok_products import normalize_record
from catalog.models import Product, ProductImage, ProductVariant
from inventory.models import InventoryBalance


SAMPLE = {
    "product_id": "1738284577586448079",
    "name": "Chuột gaming Logitech G Pro",
    "category": "chuot",
    "keyword": "chuột gaming",
    "price": "117000",
    "original_price": "150000",
    "currency": "VND",
    "image": "https://example.test/mouse.jpg",
    "url": "https://shop.tiktok.com/view/product/1738284577586448079",
    "shop": "Demo shop",
    "units_sold": 2,
    "has_inventory": True,
    "source": "TikTok Shop",
}


class TikTokProductImportTests(TestCase):
    def test_normalize_record_maps_to_catalog_schema(self):
        normalized = normalize_record(SAMPLE)
        self.assertEqual(normalized["category"]["code"], "mouse")
        self.assertEqual(normalized["brand"], "Logitech")
        self.assertEqual(normalized["sku"], "TT-1738284577586448079")
        self.assertEqual(normalized["price"], 117000)
        self.assertEqual(normalized["compare_at_price"], 150000)

    def test_command_is_idempotent_and_dry_run_rolls_back(self):
        with tempfile.TemporaryDirectory() as directory:
            source = Path(directory) / "products.json"
            output = Path(directory) / "normalized.json"
            source.write_text(json.dumps([SAMPLE], ensure_ascii=False), encoding="utf-8")

            call_command(
                "import_tiktok_products",
                source,
                normalized_output=output,
                dry_run=True,
            )
            self.assertTrue(output.exists())
            self.assertEqual(Product.objects.count(), 0)

            call_command("import_tiktok_products", source)
            call_command("import_tiktok_products", source)

        self.assertEqual(Product.objects.count(), 1)
        self.assertEqual(ProductVariant.objects.count(), 1)
        self.assertEqual(ProductImage.objects.count(), 1)
        self.assertEqual(InventoryBalance.objects.get().on_hand, 1)
