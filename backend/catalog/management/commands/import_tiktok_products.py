import json
import re
import sys
from decimal import Decimal, InvalidOperation
from pathlib import Path

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.utils.text import slugify

from catalog.models import Brand, Category, Product, ProductImage, ProductVariant
from inventory.models import InventoryBalance


CATEGORY_MAP = {
    "chuot": ("Chuột", "mouse", "chuot", "assets/images/categories/mouse.png"),
    "ban_phim": ("Bàn phím", "keyboard", "ban-phim", "assets/images/categories/keyboards.png"),
    "tai_nghe": ("Tai nghe", "headset", "tai-nghe", "assets/images/categories/headset.png"),
    "man_hinh": ("Màn hình", "monitor", "man-hinh", "assets/images/categories/monitor.png"),
    "lot_chuot": ("Lót chuột", "mouse-pad", "lot-chuot", "assets/images/categories/pad.png"),
    "webcam": ("Webcam", "webcam", "webcam", "assets/images/categories/webcam.png"),
    "tay_cam": ("Tay cầm", "controller", "tay-cam", "assets/images/categories/controller.png"),
    "microphone": ("Microphone", "microphone", "microphone", "assets/images/categories/microphone.png"),
}

KNOWN_BRANDS = (
    "Logitech",
    "Razer",
    "Corsair",
    "HyperX",
    "SteelSeries",
    "ASUS",
    "Acer",
    "MSI",
    "Dell",
    "LG",
    "Samsung",
    "Sony",
    "JBL",
    "Rapoo",
    "Keychron",
    "Attack Shark",
    "DareU",
    "Fantech",
    "Akko",
    "Aula",
    "Edifier",
    "Maono",
    "Fifine",
    "INPHIC",
)


def clean_text(value, max_length=None):
    text = re.sub(r"\s+", " ", str(value or "")).strip()
    return text[:max_length].rstrip() if max_length else text


def parse_money(value, field_name):
    try:
        amount = Decimal(str(value or "0")).quantize(Decimal("1"))
    except (InvalidOperation, ValueError, TypeError) as exc:
        raise ValueError(f"{field_name} không phải số hợp lệ") from exc
    if amount < 0:
        raise ValueError(f"{field_name} không được âm")
    return amount


def infer_brand(name):
    folded_name = name.casefold()
    for brand in KNOWN_BRANDS:
        if brand.casefold() in folded_name:
            return brand
    return "Khác"


def normalize_record(record):
    product_id = clean_text(record.get("product_id"), 40)
    name = clean_text(record.get("name"), 200)
    category_key = clean_text(record.get("category"), 40).lower()
    if not product_id or not product_id.isdigit():
        raise ValueError("product_id phải là chuỗi chữ số")
    if not name:
        raise ValueError("name không được để trống")
    if category_key not in CATEGORY_MAP:
        raise ValueError(f"category không được hỗ trợ: {category_key}")

    price = parse_money(record.get("price"), "price")
    original_price = parse_money(record.get("original_price"), "original_price")
    compare_at_price = original_price if original_price > price else None
    currency = clean_text(record.get("currency"), 3).upper()
    if currency != "VND":
        raise ValueError("chỉ hỗ trợ tiền tệ VND")

    category_name, category_code, category_slug, category_image = CATEGORY_MAP[category_key]
    short_name = name if len(name) <= 120 else f"{name[:117].rstrip()}..."
    product_slug = f"{slugify(name)[:190].strip('-') or 'san-pham'}-{product_id[-12:]}"
    image_url = clean_text(record.get("image"), 500)
    product_url = clean_text(record.get("url"), 500)
    shop = clean_text(record.get("shop"), 200)
    keyword = clean_text(record.get("keyword"), 200)
    units_sold = max(int(record.get("units_sold") or 0), 0)
    has_inventory = bool(record.get("has_inventory"))

    return {
        "source_product_id": product_id,
        "sku": f"TT-{product_id}",
        "name": name,
        "short_name": short_name,
        "slug": product_slug,
        "category": {
            "name": category_name,
            "code": category_code,
            "slug": category_slug,
            "image_key": category_image,
        },
        "brand": infer_brand(name),
        "price": int(price),
        "compare_at_price": int(compare_at_price) if compare_at_price is not None else None,
        "currency": currency,
        "image_url": image_url,
        "source_url": product_url,
        "shop": shop,
        "keyword": keyword,
        "units_sold": units_sold,
        "has_inventory": has_inventory,
        "source": clean_text(record.get("source"), 100) or "TikTok Shop",
    }


class Command(BaseCommand):
    help = "Chuẩn hóa và nạp sản phẩm TikTok Shop vào catalog theo cách idempotent."

    def add_arguments(self, parser):
        parser.add_argument("json_path", type=Path, help="Đường dẫn file JSON nguồn.")
        parser.add_argument(
            "--normalized-output",
            type=Path,
            help="Ghi dữ liệu đã chuẩn hóa ra JSON để kiểm tra hoặc lưu trữ.",
        )
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Kiểm tra toàn bộ dữ liệu và thao tác DB nhưng rollback ở cuối.",
        )
        parser.add_argument(
            "--normalize-only",
            action="store_true",
            help="Chỉ kiểm tra và ghi JSON chuẩn hóa, không kết nối database.",
        )

    def handle(self, *args, **options):
        # Windows PowerShell thường dùng cp1252; chuyển CLI sang UTF-8 để tên sản phẩm
        # và thông báo tiếng Việt không làm command dừng giữa chừng.
        for stream in (sys.stdout, sys.stderr):
            if hasattr(stream, "reconfigure"):
                stream.reconfigure(encoding="utf-8")

        source_path = options["json_path"].resolve()
        if not source_path.is_file():
            raise CommandError(f"Không tìm thấy file: {source_path}")

        try:
            raw_records = json.loads(source_path.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError) as exc:
            raise CommandError(f"Không đọc được JSON: {exc}") from exc
        if not isinstance(raw_records, list):
            raise CommandError("JSON gốc phải là một mảng sản phẩm.")

        normalized_records = []
        validation_errors = []
        seen_ids = set()
        for index, record in enumerate(raw_records, start=1):
            if not isinstance(record, dict):
                validation_errors.append(f"Dòng {index}: phải là object")
                continue
            try:
                normalized = normalize_record(record)
                source_id = normalized["source_product_id"]
                if source_id in seen_ids:
                    raise ValueError(f"product_id bị trùng: {source_id}")
                seen_ids.add(source_id)
                normalized_records.append(normalized)
            except (TypeError, ValueError) as exc:
                validation_errors.append(f"Dòng {index}: {exc}")

        if validation_errors:
            preview = "\n".join(validation_errors[:20])
            suffix = "\n..." if len(validation_errors) > 20 else ""
            raise CommandError(
                f"Có {len(validation_errors)} lỗi dữ liệu, chưa nạp DB:\n{preview}{suffix}"
            )

        output_path = options.get("normalized_output")
        if output_path:
            output_path = output_path.resolve()
            output_path.parent.mkdir(parents=True, exist_ok=True)
            output_path.write_text(
                json.dumps(normalized_records, ensure_ascii=False, indent=2),
                encoding="utf-8",
            )
            self.stdout.write(f"Đã ghi dữ liệu chuẩn hóa: {output_path}")

        if options["normalize_only"]:
            if not output_path:
                raise CommandError("--normalize-only yêu cầu --normalized-output.")
            self.stdout.write(
                self.style.SUCCESS(
                    f"ĐÃ CHUẨN HÓA: {len(normalized_records)} sản phẩm; chưa thay đổi database."
                )
            )
            return

        counters = {
            "products_created": 0,
            "products_existing": 0,
            "variants_created": 0,
            "images_created": 0,
            "inventories_created": 0,
        }

        with transaction.atomic():
            for record in normalized_records:
                category_data = record["category"]
                category, _ = Category.objects.get_or_create(
                    code=category_data["code"],
                    defaults={
                        "name": category_data["name"],
                        "slug": category_data["slug"],
                        "image_key": category_data.get("image_key", ""),
                        "is_active": True,
                    },
                )
                if not category.image_key and category_data.get("image_key"):
                    category.image_key = category_data["image_key"]
                    category.save(update_fields=["image_key"])
                brand_slug = slugify(record["brand"]) or "khac"
                brand, _ = Brand.objects.get_or_create(
                    slug=brand_slug,
                    defaults={"name": record["brand"], "is_active": True},
                )

                product, product_created = Product.objects.get_or_create(
                    slug=record["slug"],
                    defaults={
                        "category": category,
                        "brand": brand,
                        "name": record["name"],
                        "short_name": record["short_name"],
                        "summary": record["keyword"],
                        "description": f"Sản phẩm từ {record['shop'] or record['source']}.",
                        "specifications": {
                            "source": record["source"],
                            "source_product_id": record["source_product_id"],
                            "source_url": record["source_url"],
                            "shop": record["shop"],
                            "keyword": record["keyword"],
                            "units_sold_at_import": record["units_sold"],
                            "inventory_from_source": record["has_inventory"],
                        },
                        "status": Product.Status.ACTIVE,
                    },
                )
                counters["products_created" if product_created else "products_existing"] += 1

                variant, variant_created = ProductVariant.objects.get_or_create(
                    sku=record["sku"],
                    defaults={
                        "product": product,
                        "option_key": "standard",
                        "price": record["price"],
                        "compare_at_price": record["compare_at_price"],
                        "currency": record["currency"],
                        "is_active": True,
                    },
                )
                if variant.product_id != product.id:
                    raise CommandError(
                        f"SKU {record['sku']} đã thuộc sản phẩm khác; transaction đã rollback."
                    )
                counters["variants_created"] += int(variant_created)

                if record["image_url"] and not ProductImage.objects.filter(
                    product=product, is_cover=True
                ).exists():
                    ProductImage.objects.create(
                        product=product,
                        variant=variant,
                        object_key=record["image_url"],
                        alt_text=record["name"],
                        width=800,
                        height=800,
                        sort_order=1,
                        is_cover=True,
                    )
                    counters["images_created"] += 1

                _, inventory_created = InventoryBalance.objects.get_or_create(
                    variant=variant,
                    defaults={
                        # Nguồn chỉ cho biết còn hàng hay không, không cung cấp số lượng thật.
                        "on_hand": 1 if record["has_inventory"] else 0,
                        "reserved": 0,
                        "low_stock_threshold": 0,
                    },
                )
                counters["inventories_created"] += int(inventory_created)

            if options["dry_run"]:
                transaction.set_rollback(True)

        mode = "DRY-RUN (đã rollback)" if options["dry_run"] else "ĐÃ NẠP DB"
        self.stdout.write(self.style.SUCCESS(f"{mode}: {len(normalized_records)} sản phẩm hợp lệ"))
        self.stdout.write(json.dumps(counters, ensure_ascii=False))
