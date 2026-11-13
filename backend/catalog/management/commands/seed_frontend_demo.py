from datetime import timedelta

from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone
from django.utils.text import slugify

from catalog.models import (
    Brand,
    Category,
    Collection,
    CollectionProduct,
    HomeBanner,
    Product,
    ProductFeature,
    ProductImage,
    ProductVariant,
)
from inventory.models import InventoryBalance
from orders.models import ShippingMethod
from promotions.models import Voucher


CATEGORIES = [
    ("Bàn phím", "keyboard", "ban-phim", "keyboards.png"),
    ("Chuột", "mouse", "chuot", "mouse.png"),
    ("Tai nghe", "headset", "tai-nghe", "headset.png"),
    ("Màn hình", "monitor", "man-hinh", "monitor.png"),
    ("Phụ kiện", "accessory", "phu-kien", "pad.png"),
    ("Ghế gaming", "chair", "ghe-gaming", "desk.png"),
]

PRODUCTS = [
    ("NEXA X75 Mechanical Keyboard", "NEXA X75", "NEXA", "keyboard", 2490000, 3290000, 45, "NEXA-X75", "Bán chạy", "#8a73ff", "Bàn phím cơ layout 75%, hot-swap, RGB đa chế độ, kết nối ba chế độ.", ["Layout 75% tiện dụng", "Hot-swap hỗ trợ switch 3/5 pin", "Kết nối USB-C / 2.4GHz / Bluetooth", "Gõ mượt, độ trễ thấp"]),
    ("Logitech G Pro X Superlight 2", "G Pro X Superlight 2", "Logitech", "mouse", 2890000, 3590000, 5, "LOGI-GPX2", "-20%", "#8298ff", "Chuột gaming không dây siêu nhẹ, cảm biến chính xác, phù hợp eSports.", ["Trọng lượng siêu nhẹ", "Cảm biến độ chính xác cao", "Wireless tối ưu độ trễ", "Thiết kế công thái học"]),
    ("Razer BlackShark V2 Pro", "BlackShark V2 Pro", "Razer", "headset", 4990000, None, 28, "RAZER-BSV2", "Mới", "#65d5ff", "Tai nghe gaming không dây cao cấp, tối ưu định vị âm thanh.", ["Micro thoại rõ ràng", "Đệm tai êm, thoải mái", "Âm thanh vòm sống động", "Thiết kế gọn nhẹ"]),
    ("ASUS TUF Gaming VG27AQ", "ASUS TUF VG27AQ", "ASUS", "monitor", 6990000, None, 12, "ASUS-VG27AQ", "", "#6f6eff", "Màn hình gaming 27 inch QHD cho không gian hiển thị sắc nét.", ["27 inch QHD", "Tần số quét cao", "Góc nhìn rộng", "Thiết kế viền mỏng"]),
    ("Keychron K2 Wireless Keyboard", "Keychron K2", "Keychron", "keyboard", 2690000, 2990000, 8, "KEY-K2", "-10%", "#f598a9", "Bàn phím cơ không dây nhỏ gọn với trải nghiệm gõ tinh tế.", ["Thiết kế gọn 75%", "Hỗ trợ nhiều thiết bị", "Bluetooth ổn định", "Keycap bền đẹp"]),
    ("NEXA S98 RGB Triple Mode", "NEXA S98", "NEXA", "keyboard", 3290000, 3590000, 36, "NEXA-S98", "Mới", "#4ed9dc", "Bàn phím 98 phím với dải RGB và kết nối đa thiết bị.", ["Layout 98 phím", "Kết nối 3 chế độ", "RGB tùy chỉnh", "Hot-swap nhanh chóng"]),
    ("Corsair K70 Pro Gaming Keyboard", "Corsair K70 Pro", "Corsair", "keyboard", 4290000, None, 21, "COR-K70", "", "#d65aff", "Bàn phím gaming full-size hiệu năng cao.", ["Switch độ bền cao", "Full-size", "RGB từng phím", "Khung chắc chắn"]),
    ("HyperX Cloud III Wireless", "HyperX Cloud III", "HyperX", "headset", 3190000, 3690000, 17, "HYX-CLOUD3", "-14%", "#e36fbc", "Tai nghe không dây với pin lâu, thiết kế linh hoạt.", ["Pin sử dụng dài", "Mic tháo rời", "Đệm tai êm", "Âm trầm mạnh"]),
    ("Logitech G502 X LIGHTSPEED", "Logitech G502 X", "Logitech", "mouse", 2590000, None, 52, "LOGI-G502", "Bán chạy", "#9b75ff", "Chuột gaming nhiều nút, thiết kế tối ưu công việc và trò chơi.", ["Nút chức năng đa dạng", "Wireless ổn định", "Tùy chỉnh DPI", "Cảm biến chính xác"]),
    ("NEXA Vision 27 QHD", "NEXA Vision 27", "NEXA", "monitor", 5490000, 6190000, 19, "NEXA-V27", "-11%", "#4ecefa", "Màn hình 27 inch sắc nét, thẩm mỹ tối giản.", ["Độ phân giải QHD", "Cổng HDMI / DisplayPort", "Chế độ bảo vệ mắt", "Chân đế vững chắc"]),
    ("NEXA Desk Mat XL", "NEXA Desk Mat", "NEXA", "accessory", 490000, 650000, 86, "NEXA-MAT", "-25%", "#64aaff", "Lót bàn cỡ lớn hoàn thiện setup làm việc.", ["Bề mặt chống trượt", "Chống thấm nhẹ", "Viền may chắc chắn", "Phù hợp setup tối giản"]),
    ("NEXA Ergo Pro Chair", "NEXA Ergo Pro", "NEXA", "chair", 4290000, None, 9, "NEXA-CHAIR", "Mới", "#c57cff", "Ghế công thái học hỗ trợ tư thế ngồi dài.", ["Tựa lưng điều chỉnh", "Đệm ngồi êm", "Tay vịn linh hoạt", "Thiết kế mạnh mẽ"]),
]

IMAGE_BY_CATEGORY = {code: image for _, code, _, image in CATEGORIES}


class Command(BaseCommand):
    help = "Nạp dữ liệu mẫu từ frontend_html vào database. Có thể chạy lại an toàn."

    @transaction.atomic
    def handle(self, *args, **options):
        categories = {}
        for sort_order, (name, code, slug, image) in enumerate(CATEGORIES, 1):
            category, _ = Category.objects.update_or_create(
                code=code,
                defaults={
                    "name": name,
                    "slug": slug,
                    "image_key": f"assets/images/categories/{image}",
                    "is_active": True,
                    "sort_order": sort_order,
                },
            )
            categories[code] = category

        brands = {}
        for name in sorted({item[2] for item in PRODUCTS}):
            brand, _ = Brand.objects.update_or_create(
                slug=slugify(name),
                defaults={"name": name, "is_active": True},
            )
            brands[name] = brand

        seeded_products = []
        for item in PRODUCTS:
            name, short_name, brand_name, category_code, price, old_price, stock, sku, badge, accent, description, features = item
            product, _ = Product.objects.update_or_create(
                slug=slugify(name),
                defaults={
                    "category": categories[category_code],
                    "brand": brands[brand_name],
                    "name": name,
                    "short_name": short_name,
                    "badge": badge,
                    "accent_color": accent,
                    "summary": features[0],
                    "description": description,
                    "specifications": {"Điểm nổi bật": features[0], "Kết nối": features[2]},
                    "status": Product.Status.ACTIVE,
                    "warranty_months": 12,
                },
            )
            seeded_products.append(product)

            variant, _ = ProductVariant.objects.update_or_create(
                sku=sku,
                defaults={
                    "product": product,
                    "option_key": "standard",
                    "color": "Black",
                    "switch_type": "",
                    "connection": features[2],
                    "layout": features[0],
                    "price": price,
                    "compare_at_price": old_price,
                    "currency": "VND",
                    "is_active": True,
                },
            )
            InventoryBalance.objects.update_or_create(
                variant=variant,
                defaults={"on_hand": stock, "reserved": 0, "low_stock_threshold": 5},
            )

            ProductFeature.objects.filter(product=product).delete()
            ProductFeature.objects.bulk_create([
                ProductFeature(product=product, content=feature, sort_order=index)
                for index, feature in enumerate(features, 1)
            ])

            ProductImage.objects.update_or_create(
                product=product,
                is_cover=True,
                defaults={
                    "variant": None,
                    "object_key": f"assets/images/categories/{IMAGE_BY_CATEGORY[category_code]}",
                    "alt_text": name,
                    "width": 1024,
                    "height": 1024,
                    "sort_order": 1,
                },
            )

        all_collection, _ = Collection.objects.update_or_create(
            slug="gaming-gear",
            defaults={"name": "Gaming Gear", "is_active": True, "sort_order": 1},
        )
        nexa_collection, _ = Collection.objects.update_or_create(
            slug="nexa-select",
            defaults={"name": "NEXA Select", "is_active": True, "sort_order": 2},
        )
        CollectionProduct.objects.filter(collection__in=[all_collection, nexa_collection]).delete()
        CollectionProduct.objects.bulk_create([
            CollectionProduct(collection=all_collection, product=product, sort_order=index)
            for index, product in enumerate(seeded_products, 1)
        ] + [
            CollectionProduct(collection=nexa_collection, product=product, sort_order=index)
            for index, product in enumerate([p for p in seeded_products if p.brand.name == "NEXA"], 1)
        ])

        banners = [
            ("Cảm Nhận Từng Khoảnh Khắc", "Âm thanh cho những khoảnh khắc riêng. Thiết kế cho nhịp sống của bạn.", "cobalt-sound-wide.png", "cobalt-sound-wide-day.png", "/products?category=tai-nghe"),
            ("Cảm Hứng Trên Từng Phím Chạm", "Một góc làm việc có gu. Một nhịp sáng tạo rất riêng — bắt đầu từ bàn phím bạn chọn.", "cobalt-keys-lettered.png", "cobalt-keys-day.png", "/products?category=ban-phim"),
            ("Tự Do Trong Từng Chuyển Động", "Khám phá thiết bị phù hợp với cách bạn làm việc, chơi và tận hưởng mỗi ngày.", "cobalt-motion.png", "cobalt-motion-day.png", "/products?category=chuot"),
        ]
        for sort_order, (title, subtitle, dark_image, light_image, link) in enumerate(banners, 1):
            HomeBanner.objects.update_or_create(
                title=title,
                defaults={
                    "subtitle": subtitle,
                    "desktop_image_key": f"assets/images/campaign/{dark_image}",
                    "mobile_image_key": f"assets/images/campaign/{light_image}",
                    "link_path": link,
                    "is_active": True,
                    "sort_order": sort_order,
                },
            )

        ShippingMethod.objects.update_or_create(code="standard", defaults={"name": "Giao tiêu chuẩn", "base_fee": 30000, "free_threshold": 1000000, "min_days": 2, "max_days": 4, "is_active": True})
        ShippingMethod.objects.update_or_create(code="express", defaults={"name": "Giao hỏa tốc", "base_fee": 50000, "free_threshold": None, "min_days": 1, "max_days": 2, "is_active": True})

        now = timezone.now()
        vouchers = [
            ("NEXA10", Voucher.Kind.PERCENT, 10, 100000),
            ("NEXA5", Voucher.Kind.PERCENT, 5, 50000),
            ("FREESHIP", Voucher.Kind.FREE_SHIP, 0, None),
        ]
        for code, kind, value, max_discount in vouchers:
            Voucher.objects.update_or_create(
                code=code,
                defaults={
                    "kind": kind,
                    "value": value,
                    "max_discount": max_discount,
                    "min_subtotal": 0,
                    "usage_limit": None,
                    "per_user_limit": 10,
                    "starts_at": now - timedelta(days=1),
                    "ends_at": now + timedelta(days=365),
                    "is_active": True,
                },
            )

        self.stdout.write(self.style.SUCCESS(
            f"Đã nạp {len(CATEGORIES)} danh mục, {len(brands)} thương hiệu, "
            f"{len(PRODUCTS)} sản phẩm, 3 banner, 2 bộ sưu tập, 3 voucher và 2 phương thức giao hàng."
        ))
