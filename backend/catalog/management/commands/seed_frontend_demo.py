from datetime import timedelta
from decimal import Decimal
import hashlib
import os
import uuid

from django.conf import settings
from django.contrib.admin.models import ADDITION, CHANGE, LogEntry
from django.contrib.auth.models import Group, Permission
from django.contrib.contenttypes.models import ContentType
from django.core.management.base import BaseCommand, CommandError
from django.db import connection, transaction
from django.db.models import Sum
from django.utils import timezone
from django.utils.text import slugify

from accounts.models import Address, User
from carts.models import Cart, CartItem
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
from community.models import ModerationStatus, ProductAnswer, ProductQuestion, Review
from inventory.models import InventoryBalance, InventoryMovement, InventoryReservation
from operations.models import AuditLog, OutboxEvent
from orders.models import Order, OrderAddress, OrderItem, OrderStatus, OrderStatusHistory, ShippingMethod
from payments.models import Payment
from promotions.models import Voucher, VoucherRedemption
from wishlists.models import Wishlist


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
    ("Logitech G Pro X Superlight 2", "G Pro X Superlight 2", "Logitech", "mouse", 2890000, 3590000, 25, "LOGI-GPX2", "-20%", "#8298ff", "Chuột gaming không dây siêu nhẹ, cảm biến chính xác, phù hợp eSports.", ["Trọng lượng siêu nhẹ", "Cảm biến độ chính xác cao", "Wireless tối ưu độ trễ", "Thiết kế công thái học"]),
    ("Razer BlackShark V2 Pro", "BlackShark V2 Pro", "Razer", "headset", 4990000, None, 28, "RAZER-BSV2", "Mới", "#65d5ff", "Tai nghe gaming không dây cao cấp, tối ưu định vị âm thanh.", ["Micro thoại rõ ràng", "Đệm tai êm, thoải mái", "Âm thanh vòm sống động", "Thiết kế gọn nhẹ"]),
    ("ASUS TUF Gaming VG27AQ", "ASUS TUF VG27AQ", "ASUS", "monitor", 6990000, None, 18, "ASUS-VG27AQ", "", "#6f6eff", "Màn hình gaming 27 inch QHD cho không gian hiển thị sắc nét.", ["27 inch QHD", "Tần số quét cao", "Góc nhìn rộng", "Thiết kế viền mỏng"]),
    ("Keychron K2 Wireless Keyboard", "Keychron K2", "Keychron", "keyboard", 2690000, 2990000, 20, "KEY-K2", "-10%", "#f598a9", "Bàn phím cơ không dây nhỏ gọn với trải nghiệm gõ tinh tế.", ["Thiết kế gọn 75%", "Hỗ trợ nhiều thiết bị", "Bluetooth ổn định", "Keycap bền đẹp"]),
    ("NEXA S98 RGB Triple Mode", "NEXA S98", "NEXA", "keyboard", 3290000, 3590000, 36, "NEXA-S98", "Mới", "#4ed9dc", "Bàn phím 98 phím với dải RGB và kết nối đa thiết bị.", ["Layout 98 phím", "Kết nối 3 chế độ", "RGB tùy chỉnh", "Hot-swap nhanh chóng"]),
    ("Corsair K70 Pro Gaming Keyboard", "Corsair K70 Pro", "Corsair", "keyboard", 4290000, None, 21, "COR-K70", "", "#d65aff", "Bàn phím gaming full-size hiệu năng cao.", ["Switch độ bền cao", "Full-size", "RGB từng phím", "Khung chắc chắn"]),
    ("HyperX Cloud III Wireless", "HyperX Cloud III", "HyperX", "headset", 3190000, 3690000, 17, "HYX-CLOUD3", "-14%", "#e36fbc", "Tai nghe không dây với pin lâu, thiết kế linh hoạt.", ["Pin sử dụng dài", "Mic tháo rời", "Đệm tai êm", "Âm trầm mạnh"]),
    ("Logitech G502 X LIGHTSPEED", "Logitech G502 X", "Logitech", "mouse", 2590000, None, 52, "LOGI-G502", "Bán chạy", "#9b75ff", "Chuột gaming nhiều nút, thiết kế tối ưu công việc và trò chơi.", ["Nút chức năng đa dạng", "Wireless ổn định", "Tùy chỉnh DPI", "Cảm biến chính xác"]),
    ("NEXA Vision 27 QHD", "NEXA Vision 27", "NEXA", "monitor", 5490000, 6190000, 19, "NEXA-V27", "-11%", "#4ecefa", "Màn hình 27 inch sắc nét, thẩm mỹ tối giản.", ["Độ phân giải QHD", "Cổng HDMI / DisplayPort", "Chế độ bảo vệ mắt", "Chân đế vững chắc"]),
    ("NEXA Desk Mat XL", "NEXA Desk Mat", "NEXA", "accessory", 490000, 650000, 86, "NEXA-MAT", "-25%", "#64aaff", "Lót bàn cỡ lớn hoàn thiện setup làm việc.", ["Bề mặt chống trượt", "Chống thấm nhẹ", "Viền may chắc chắn", "Phù hợp setup tối giản"]),
    ("NEXA Ergo Pro Chair", "NEXA Ergo Pro", "NEXA", "chair", 4290000, None, 15, "NEXA-CHAIR", "Mới", "#c57cff", "Ghế công thái học hỗ trợ tư thế ngồi dài.", ["Tựa lưng điều chỉnh", "Đệm ngồi êm", "Tay vịn linh hoạt", "Thiết kế mạnh mẽ"]),
    ("Razer Huntsman V3 Pro TKL", "Huntsman V3 Pro", "Razer", "keyboard", 5290000, 5890000, 14, "RAZER-HV3", "-10%", "#4cd964", "Bàn phím Analog Optical thế hệ mới hỗ trợ Rapid Trigger chuẩn thi đấu.", ["Switch Analog Optical Gen-2", "Rapid Trigger siêu nhạy", "Khung nhôm máy bay", "Kê tay từ tính êm ái"]),
    ("Logitech G Pro X TKL Lightspeed", "G Pro X TKL", "Logitech", "keyboard", 4190000, 4590000, 22, "LOGI-PROX-TKL", "Bán chạy", "#5ac8fa", "Bàn phím cơ TKL không dây phát triển cùng tuyển thủ eSports chuyên nghiệp.", ["Kết nối Lightspeed 1ms", "Layout TKL gọn gàng", "Keycap PBT hai lớp", "RGB Lightsync đồng bộ"]),
    ("Keychron Q1 Pro QMK Wireless", "Keychron Q1 Pro", "Keychron", "keyboard", 4690000, None, 16, "KEY-Q1PRO", "Mới", "#ff9f0a", "Bàn phím cơ khung nhôm CNC nguyên khối, hỗ trợ QMK/VIA toàn diện.", ["Khung nhôm CNC 6063", "Gasket mount êm ái", "QMK/VIA tùy biến", "Núm xoay kim loại"]),
    ("Razer Viper V3 Pro Ultralight", "Viper V3 Pro", "Razer", "mouse", 3890000, 4290000, 16, "RAZER-VV3P", "Bán chạy", "#30d158", "Chuột eSports siêu nhẹ 54g với cảm biến Focus Pro 35K Gen-2.", ["Siêu nhẹ 54g", "Polling rate 8000Hz", "Cảm biến Focus Pro 35K", "Pin 95 giờ liên tục"]),
    ("NEXA Pulse Air 8K Wireless", "NEXA Pulse Air", "NEXA", "mouse", 1890000, 2290000, 38, "NEXA-PULSE8K", "-17%", "#64d2ff", "Chuột không dây đối xứng siêu nhẹ tích hợp thu phát 8KHz.", ["Cảm biến PAW3395", "Trọng lượng 49g", "Đi kèm receiver 8KHz", "Switch quang học bền bỉ"]),
    ("Corsair M75 Air Wireless", "Corsair M75 Air", "Corsair", "mouse", 2790000, 3190000, 19, "COR-M75", "-13%", "#bf5af2", "Chuột gaming đối xứng tối ưu tốc độ vẩy tâm trong các tựa game FPS.", ["Thiết kế đối xứng chuẩn FPS", "Cảm biến Marksman 26K", "Kết nối Slipstream", "Feet 100% PTFE"]),
    ("Logitech G Pro X 2 Lightspeed", "G Pro X 2 Headset", "Logitech", "headset", 5190000, 5690000, 15, "LOGI-GPX2-HS", "-9%", "#5e5ce6", "Tai nghe màng loa Graphene 50mm cho độ chi tiết âm thanh vượt trội.", ["Màng loa Graphene 50mm", "Pin lên tới 50 giờ", "Khung thép & nhôm bền nhẹ", "Micro Blue VO!CE"]),
    ("NEXA Aura 7.1 Studio Wireless", "NEXA Aura 7.1", "NEXA", "headset", 2190000, 2590000, 31, "NEXA-AURA71", "-15%", "#32ade6", "Tai nghe không dây 3 chế độ với âm thanh vòm 7.1 và chống ồn đàm thoại.", ["Âm thanh vòm 7.1", "Đệm tai vải thoáng khí", "Độ trễ thấp 15ms", "Kết nối 2.4GHz & Bluetooth"]),
    ("ASUS ROG Strix XG27AQMR 300Hz", "ROG Strix XG27AQMR", "ASUS", "monitor", 11490000, 12490000, 12, "ASUS-XG27", "Mới", "#ff375f", "Màn hình Fast IPS QHD 300Hz chuyên dụng cho game thủ cạnh tranh đỉnh cao.", ["Tấm nền QHD 300Hz", "Thời gian phản hồi 1ms GTG", "ELMB Sync chống nhòe", "Chuẩn màu DisplayHDR 600"]),
    ("NEXA Optic 24G 240Hz Fast IPS", "NEXA Optic 24G", "NEXA", "monitor", 4390000, 4890000, 24, "NEXA-OPT24", "-10%", "#0a84ff", "Màn hình 24.5 inch 240Hz viền siêu mỏng, chân đế xoay dọc linh hoạt.", ["Tần số quét 240Hz", "Tấm nền Fast IPS 99% sRGB", "Chân đế nâng hạ xoay 90°", "Tương thích G-Sync/FreeSync"]),
    ("Razer Atlas Glass Gaming Pad", "Razer Atlas Glass", "Razer", "accessory", 2390000, None, 13, "RAZER-ATLAS", "Mới", "#66d4cf", "Bàn di chuột kính cường lực xử lý bề mặt vi khắc CNC siêu mượt.", ["Kính cường lực CNC", "Bề mặt chống bám bẩn", "Đế cao su chống trượt toàn phần", "Tối ưu cho mắt đọc quang học"]),
    ("Corsair TC100 Relaxed Gaming Chair", "Corsair TC100", "Corsair", "chair", 5690000, 6290000, 14, "COR-TC100", "-10%", "#ac8e68", "Ghế gaming form rộng bọc vải thoáng khí, kèm gối lưng và gối cổ cao su non.", ["Form ngồi rộng thoải mái", "Bọc vải mềm thoáng khí", "Ngả lưng 160 độ", "Trụ thủy lực Class 4"]),
]

IMAGE_BY_CATEGORY = {code: image for _, code, _, image in CATEGORIES}


def deterministic_uuid(namespace_str: str) -> uuid.UUID:
    return uuid.uuid5(uuid.NAMESPACE_DNS, f"nexa-commerceos.{namespace_str}")


def deterministic_sha256(seed_str: str) -> str:
    return hashlib.sha256(f"nexa-commerceos.{seed_str}".encode("utf-8")).hexdigest()


def _save_or_get(manager, force_overwrite: bool, **kwargs):
    if force_overwrite:
        return manager.update_or_create(**kwargs)
    return manager.get_or_create(**kwargs)


class Command(BaseCommand):
    help = "Nạp dữ liệu mẫu đầy đủ cho tất cả các bảng trong database demo/test. Có thể chạy lại an toàn (idempotent)."

    def add_arguments(self, parser):
        parser.add_argument(
            "--allow-non-debug",
            action="store_true",
            help="Cho phép chạy trên môi trường demo/staging khi DEBUG=False (yêu cầu tên DB chứa 'demo' hoặc 'test').",
        )
        parser.add_argument(
            "--force-overwrite",
            action="store_true",
            help="Ghi đè dữ liệu mẫu đã tồn tại bằng update_or_create (mặc định dùng get_or_create để bảo vệ dữ liệu hiện có).",
        )

    @transaction.atomic
    def handle(self, *args, **options):
        allow_non_debug = bool(options.get("allow_non_debug"))
        force_overwrite = bool(options.get("force_overwrite"))
        env_name = os.environ.get("DJANGO_ENV", "").strip().lower()
        db_name = str(connection.settings_dict.get("NAME") or "").lower()

        if env_name == "production" or (not settings.DEBUG and not allow_non_debug):
            raise CommandError(
                "Chặn thực thi seed_frontend_demo khi DEBUG=False hoặc trên môi trường production. "
                "Chỉ chạy trên môi trường phát triển/demo hoặc truyền --allow-non-debug cho DB demo/test."
            )
        if not settings.DEBUG and "demo" not in db_name and "test" not in db_name:
            raise CommandError(
                f"Từ chối chạy seed_frontend_demo trên database '{db_name}' khi DEBUG=False. "
                "Tên database phải chứa 'demo' hoặc 'test'."
            )

        now = timezone.now()

        # 1. Categories & Brands
        categories = {}
        for sort_order, (name, code, slug, image) in enumerate(CATEGORIES, 1):
            category, _ = _save_or_get(
                Category.objects,
                force_overwrite,
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
            brand, _ = _save_or_get(
                Brand.objects,
                force_overwrite,
                slug=slugify(name),
                defaults={"name": name, "is_active": True},
            )
            brands[name] = brand

        # 2. Products, Variants, InventoryBalances, Features, Images
        seeded_products = []
        variants_by_sku = {}
        newly_created_skus = set()
        for idx, item in enumerate(PRODUCTS):
            name, short_name, brand_name, category_code, price, old_price, stock, sku, badge, accent, description, features = item
            product, product_created = _save_or_get(
                Product.objects,
                force_overwrite,
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
                    "specifications": {
                        "Điểm nổi bật": features[0],
                        "Kết nối": features[2],
                        "Bảo hành": "24 tháng chính hãng",
                    },
                    "status": Product.Status.ACTIVE,
                    "warranty_months": 24,
                },
            )
            seeded_products.append(product)

            variant, _ = _save_or_get(
                ProductVariant.objects,
                force_overwrite,
                sku=sku,
                defaults={
                    "product": product,
                    "option_key": "standard",
                    "color": "Đen Obsidian",
                    "switch_type": "Linear Red" if category_code == "keyboard" else "",
                    "connection": features[2],
                    "layout": features[0],
                    "price": price,
                    "compare_at_price": old_price,
                    "currency": "VND",
                    "is_active": True,
                },
            )
            variants_by_sku[sku] = variant

            _, balance_created = _save_or_get(
                InventoryBalance.objects,
                force_overwrite,
                variant=variant,
                defaults={"on_hand": max(stock, 20), "reserved": 0, "low_stock_threshold": 10},
            )
            if balance_created:
                newly_created_skus.add(sku)

            if product_created or force_overwrite or not ProductFeature.objects.filter(product=product).exists():
                ProductFeature.objects.filter(product=product).delete()
                ProductFeature.objects.bulk_create([
                    ProductFeature(product=product, content=feature, sort_order=index)
                    for index, feature in enumerate(features, 1)
                ])

            _save_or_get(
                ProductImage.objects,
                force_overwrite,
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

        # 3. Collections & Banners
        all_collection, _ = _save_or_get(
            Collection.objects,
            force_overwrite,
            slug="gaming-gear",
            defaults={"name": "Gaming Gear Tuyển Chọn", "is_active": True, "sort_order": 1},
        )
        nexa_collection, _ = _save_or_get(
            Collection.objects,
            force_overwrite,
            slug="nexa-select",
            defaults={"name": "NEXA Studio Signature", "is_active": True, "sort_order": 2},
        )
        esports_collection, _ = _save_or_get(
            Collection.objects,
            force_overwrite,
            slug="esports-pro",
            defaults={"name": "Chuẩn Thi Đấu eSports", "is_active": True, "sort_order": 3},
        )
        if force_overwrite or not CollectionProduct.objects.filter(collection=all_collection).exists():
            CollectionProduct.objects.filter(collection__in=[all_collection, nexa_collection, esports_collection]).delete()
            CollectionProduct.objects.bulk_create(
                [
                    CollectionProduct(collection=all_collection, product=product, sort_order=index)
                    for index, product in enumerate(seeded_products, 1)
                ]
                + [
                    CollectionProduct(collection=nexa_collection, product=product, sort_order=index)
                    for index, product in enumerate([p for p in seeded_products if p.brand.name == "NEXA"], 1)
                ]
                + [
                    CollectionProduct(collection=esports_collection, product=product, sort_order=index)
                    for index, product in enumerate(seeded_products[:8], 1)
                ]
            )

        banners = [
            ("Cảm Nhận Từng Khoảnh Khắc", "Âm thanh cho những khoảnh khắc riêng. Thiết kế cho nhịp sống của bạn.", "cobalt-sound-wide.png", "cobalt-sound-wide-day.png", "/products?category=tai-nghe"),
            ("Cảm Hứng Trên Từng Phím Chạm", "Một góc làm việc có gu. Một nhịp sáng tạo rất riêng — bắt đầu từ bàn phím bạn chọn.", "cobalt-keys-lettered.png", "cobalt-keys-day.png", "/products?category=ban-phim"),
            ("Tự Do Trong Từng Chuyển Động", "Khám phá thiết bị phù hợp với cách bạn làm việc, chơi và tận hưởng mỗi ngày.", "cobalt-motion.png", "cobalt-motion-day.png", "/products?category=chuot"),
        ]
        for sort_order, (title, subtitle, dark_image, light_image, link) in enumerate(banners, 1):
            _save_or_get(
                HomeBanner.objects,
                force_overwrite,
                title=title,
                defaults={
                    "subtitle": subtitle,
                    "desktop_image_key": f"assets/images/campaign/{dark_image}",
                    "mobile_image_key": f"assets/images/campaign/{light_image}",
                    "link_path": link,
                    "starts_at": now - timedelta(days=30),
                    "ends_at": now + timedelta(days=365),
                    "is_active": True,
                    "sort_order": sort_order,
                },
            )

        # 4. Shipping Methods & Vouchers
        std_ship, _ = _save_or_get(
            ShippingMethod.objects,
            force_overwrite,
            code="standard",
            defaults={"name": "Giao tiêu chuẩn", "base_fee": 30000, "free_threshold": 1000000, "min_days": 2, "max_days": 4, "is_active": True},
        )
        exp_ship, _ = _save_or_get(
            ShippingMethod.objects,
            force_overwrite,
            code="express",
            defaults={"name": "Giao hỏa tốc", "base_fee": 50000, "free_threshold": None, "min_days": 1, "max_days": 2, "is_active": True},
        )

        voucher_defs = [
            ("NEXA10", Voucher.Kind.PERCENT, 10, 100000, 500000, 500, 10),
            ("NEXA5", Voucher.Kind.PERCENT, 5, 50000, 0, 1000, 10),
            ("FREESHIP", Voucher.Kind.FREE_SHIP, 0, None, 300000, 1000, 10),
            ("NEXA200K", Voucher.Kind.FIXED, 200000, None, 2000000, 200, 5),
            ("GAMING50K", Voucher.Kind.FIXED, 50000, None, 500000, 500, 5),
            ("SETUP500K", Voucher.Kind.FIXED, 500000, None, 8000000, 100, 3),
            ("NEWMEMBER15", Voucher.Kind.PERCENT, 15, 150000, 1000000, 300, 2),
            ("VIP300K", Voucher.Kind.FIXED, 300000, None, 4000000, 150, 5),
        ]
        vouchers_by_code = {}
        for code, kind, value, max_discount, min_subtotal, usage_limit, per_user_limit in voucher_defs:
            v, _ = _save_or_get(
                Voucher.objects,
                force_overwrite,
                code=code,
                defaults={
                    "kind": kind,
                    "value": value,
                    "max_discount": max_discount,
                    "min_subtotal": min_subtotal,
                    "usage_limit": usage_limit,
                    "per_user_limit": per_user_limit,
                    "starts_at": now - timedelta(days=15),
                    "ends_at": now + timedelta(days=365),
                    "is_active": True,
                },
            )
            vouchers_by_code[code] = v

        # 5. Auth Groups, Users, and Addresses (No hardcoded superuser passwords or long-lived DRF Tokens)
        admin_group, _ = Group.objects.get_or_create(name="Quản trị viên hệ thống")
        ops_group, _ = Group.objects.get_or_create(name="Nhân viên vận hành & kho")
        cs_group, _ = Group.objects.get_or_create(name="Chăm sóc khách hàng")
        all_perms = list(Permission.objects.all())
        if all_perms:
            admin_group.permissions.set(all_perms)
            ops_group.permissions.set(all_perms)
            cs_group.permissions.set(all_perms[:20])

        seed_password = os.environ.get("SEED_DEMO_PASSWORD", "").strip()
        user_specs = [
            ("lethanhvu005@gmail.com", "Vũ", "Lê Thành", "0901234567", True),
            ("lethanhvu2005@gmail.com", "Thành", "Lê", "0912345678", False),
            ("vu@gmail.com", "Vũ", "Nguyễn", "0987654321", False),
            ("minh.tran@nexa.vn", "Minh", "Trần Quốc", "0938112233", False),
            ("huong.pham@nexa.vn", "Hương", "Phạm Thu", "0977445566", False),
            ("khoa.staff@nexa.vn", "Khoa", "Đặng Đăng", "0966889900", True),
            ("anh.nguyen@nexa.vn", "Anh", "Nguyễn Hoàng", "0905123890", False),
            ("linh.le@nexa.vn", "Linh", "Lê Mỹ", "0918234567", False),
            ("duc.vo@nexa.vn", "Đức", "Võ Minh", "0944556677", False),
            ("trang.hoang@nexa.vn", "Trang", "Hoàng Thảo", "0989112244", False),
        ]
        users_by_email = {}
        for email, first_name, last_name, phone, is_staff in user_specs:
            user, created = User.objects.get_or_create(
                email=email,
                defaults={
                    "first_name": first_name,
                    "last_name": last_name,
                    "phone": phone,
                    "is_staff": is_staff,
                    "is_superuser": False,
                    "is_active": True,
                },
            )
            updated_fields = []
            if not user.first_name:
                user.first_name = first_name
                updated_fields.append("first_name")
            if not user.last_name:
                user.last_name = last_name
                updated_fields.append("last_name")
            if not user.phone:
                user.phone = phone
                updated_fields.append("phone")
            if created:
                if seed_password:
                    user.set_password(seed_password)
                else:
                    user.set_unusable_password()
                updated_fields.append("password")
            if updated_fields:
                user.save(update_fields=updated_fields)

            if user.is_superuser:
                user.groups.add(admin_group, ops_group)
            elif user.is_staff:
                user.groups.add(ops_group, cs_group)
            else:
                user.groups.add(cs_group)

            users_by_email[email] = user

        address_specs = [
            ("lethanhvu005@gmail.com", "Lê Thành Vũ", "0901234567", "128 Nguyễn Cơ Thạch, Khu đô thị Sala", "Phường An Lợi Đông", "TP. Hồ Chí Minh", True),
            ("lethanhvu005@gmail.com", "Lê Thành Vũ (Văn phòng)", "0901234567", "Tòa nhà Bitexco, 2 Hải Triều", "Phường Bến Nghé", "TP. Hồ Chí Minh", False),
            ("lethanhvu2005@gmail.com", "Lê Thành", "0912345678", "456 Lê Văn Việt, Khu Công Nghệ Cao", "Phường Tăng Nhơn Phú A", "TP. Hồ Chí Minh", True),
            ("lethanhvu2005@gmail.com", "Lê Thành (Studio)", "0912345678", "72 Lê Thánh Tôn, Vincom Center", "Phường Bến Nghé", "TP. Hồ Chí Minh", False),
            ("vu@gmail.com", "Nguyễn Vũ", "0987654321", "88 Láng Hạ, Tòa nhà Sky City", "Phường Láng Hạ", "Hà Nội", True),
            ("vu@gmail.com", "Nguyễn Vũ (Cơ quan)", "0987654321", "54 Liễu Giai, Lotte Center", "Phường Cống Vị", "Hà Nội", False),
            ("minh.tran@nexa.vn", "Trần Quốc Minh", "0938112233", "215 Nguyễn Văn Linh", "Phường Thạc Gián", "Đà Nẵng", True),
            ("huong.pham@nexa.vn", "Phạm Thu Hương", "0977445566", "19 Đại lộ Hòa Bình", "Phường Tân An", "Cần Thơ", True),
            ("khoa.staff@nexa.vn", "Đặng Đăng Khoa", "0966889900", "35 Nguyễn Huệ", "Phường Bến Nghé", "TP. Hồ Chí Minh", True),
            ("anh.nguyen@nexa.vn", "Nguyễn Hoàng Anh", "0905123890", "102 Trần Phú", "Phường Lộc Thọ", "Khánh Hòa", True),
            ("linh.le@nexa.vn", "Lê Mỹ Linh", "0918234567", "18 Hoàng Diệu", "Phường Hải Châu 2", "Đà Nẵng", True),
            ("duc.vo@nexa.vn", "Võ Minh Đức", "0944556677", "240 Cầu Giấy", "Phường Quan Hoa", "Hà Nội", True),
            ("trang.hoang@nexa.vn", "Hoàng Thảo Trang", "0989112244", "68 Nguyễn Văn Cừ", "Phường Nguyễn Cư Trinh", "TP. Hồ Chí Minh", True),
        ]
        default_address_by_email = {}
        for email, recipient, phone, line, ward, province, is_default in address_specs:
            u = users_by_email[email]
            if is_default:
                existing_default = Address.objects.filter(user=u, is_default=True).first()
                if existing_default:
                    if force_overwrite:
                        existing_default.recipient_name = recipient
                        existing_default.phone = phone
                        existing_default.address_line = line
                        existing_default.ward = ward
                        existing_default.province = province
                        existing_default.save()
                    default_address_by_email[email] = existing_default
                else:
                    addr = Address.objects.create(
                        user=u,
                        recipient_name=recipient,
                        phone=phone,
                        address_line=line,
                        ward=ward,
                        province=province,
                        country_code="VN",
                        is_default=True,
                    )
                    default_address_by_email[email] = addr
            else:
                _save_or_get(
                    Address.objects,
                    force_overwrite,
                    user=u,
                    address_line=line,
                    defaults={
                        "recipient_name": recipient,
                        "phone": phone,
                        "ward": ward,
                        "province": province,
                        "country_code": "VN",
                        "is_default": False,
                    },
                )

        # Ensure any other manually registered users also have a default address without overwriting existing data
        for u in User.objects.exclude(email__in=users_by_email.keys()):
            users_by_email[u.email] = u
            existing_def = Address.objects.filter(user=u, is_default=True).first()
            if not existing_def:
                existing_def = Address.objects.create(
                    user=u,
                    recipient_name=u.get_full_name() or u.email.split("@")[0],
                    phone=u.phone or "0909888777",
                    address_line="100 Nguyễn Thị Minh Khai",
                    ward="Phường 6",
                    province="TP. Hồ Chí Minh",
                    country_code="VN",
                    is_default=True,
                )
            default_address_by_email[u.email] = existing_def

        # 6. Active Carts & Guest Cart
        active_cart_specs = [
            ("lethanhvu005@gmail.com", "NEXA10", [("NEXA-X75", 1), ("NEXA-MAT", 2)]),
            ("lethanhvu2005@gmail.com", "FREESHIP", [("LOGI-GPX2", 1), ("RAZER-BSV2", 1)]),
            ("vu@gmail.com", "GAMING50K", [("KEY-K2", 1), ("RAZER-ATLAS", 1)]),
            ("minh.tran@nexa.vn", "GAMING50K", [("RAZER-VV3P", 1), ("RAZER-ATLAS", 1)]),
            ("huong.pham@nexa.vn", "NEXA5", [("NEXA-S98", 1)]),
            ("anh.nguyen@nexa.vn", "NEXA200K", [("ASUS-VG27AQ", 1)]),
        ]
        for email, voucher_code, items in active_cart_specs:
            u = users_by_email[email]
            cart, cart_created = Cart.objects.get_or_create(
                user=u,
                status=Cart.Status.ACTIVE,
                defaults={
                    "voucher": vouchers_by_code.get(voucher_code) if voucher_code else None,
                    "expires_at": now + timedelta(days=30),
                },
            )
            if cart_created or force_overwrite:
                if voucher_code and not cart.voucher_id:
                    cart.voucher = vouchers_by_code.get(voucher_code)
                    cart.save(update_fields=["voucher"])
                for sku, qty in items:
                    _save_or_get(
                        CartItem.objects,
                        force_overwrite,
                        cart=cart,
                        variant=variants_by_sku[sku],
                        defaults={"quantity": qty},
                    )

        guest_hash = deterministic_sha256("guest-demo-cart-1")
        guest_cart, guest_created = _save_or_get(
            Cart.objects,
            force_overwrite,
            guest_token_hash=guest_hash,
            defaults={
                "user": None,
                "status": Cart.Status.ACTIVE,
                "expires_at": now + timedelta(days=14),
                "voucher": vouchers_by_code["NEXA5"],
            },
        )
        if guest_created or force_overwrite:
            _save_or_get(
                CartItem.objects,
                force_overwrite,
                cart=guest_cart,
                variant=variants_by_sku["NEXA-S98"],
                defaults={"quantity": 1},
            )

        # 7. Orders across all statuses and all 14 days for all users
        order_specs = [
            # --- lethanhvu005@gmail.com (8 orders covering all tabs: Delivered, Shipped, Packing, Confirmed, Pending, Cancelled) ---
            {
                "order_number": "NX-20261101-001",
                "email": "lethanhvu005@gmail.com",
                "status": OrderStatus.DELIVERED,
                "shipping": std_ship,
                "voucher_code": "NEXA10",
                "items": [("NEXA-X75", 1), ("LOGI-GPX2", 1), ("NEXA-MAT", 1)],
                "payment_provider": Payment.Provider.VNPAY,
                "payment_status": Payment.Status.SUCCEEDED,
                "note": "Giao giờ hành chính tại sảnh tòa nhà.",
                "days_ago": 12,
            },
            {
                "order_number": "NX-20261103-002",
                "email": "lethanhvu005@gmail.com",
                "status": OrderStatus.DELIVERED,
                "shipping": exp_ship,
                "voucher_code": "NEXA200K",
                "items": [("RAZER-BSV2", 1), ("ASUS-VG27AQ", 1), ("RAZER-ATLAS", 1)],
                "payment_provider": Payment.Provider.MOMO,
                "payment_status": Payment.Status.SUCCEEDED,
                "note": "Gọi trước khi giao 15 phút.",
                "days_ago": 9,
            },
            {
                "order_number": "NX-20261106-003",
                "email": "lethanhvu005@gmail.com",
                "status": OrderStatus.DELIVERED,
                "shipping": std_ship,
                "voucher_code": "VIP300K",
                "items": [("KEY-Q1PRO", 1), ("RAZER-VV3P", 1), ("COR-TC100", 1)],
                "payment_provider": Payment.Provider.VNPAY,
                "payment_status": Payment.Status.SUCCEEDED,
                "note": "Giao tận phòng làm việc tầng 4.",
                "days_ago": 6,
            },
            {
                "order_number": "NX-20261109-004",
                "email": "lethanhvu005@gmail.com",
                "status": OrderStatus.SHIPPED,
                "shipping": exp_ship,
                "voucher_code": "SETUP500K",
                "items": [("ASUS-XG27", 1), ("LOGI-GPX2-HS", 1)],
                "payment_provider": Payment.Provider.VNPAY,
                "payment_status": Payment.Status.SUCCEEDED,
                "note": "Hàng màn hình giá trị cao, xin nhẹ tay.",
                "days_ago": 3,
            },
            {
                "order_number": "NX-20261111-005",
                "email": "lethanhvu005@gmail.com",
                "status": OrderStatus.PACKING,
                "shipping": std_ship,
                "voucher_code": "GAMING50K",
                "items": [("RAZER-HV3", 1), ("NEXA-PULSE8K", 1)],
                "payment_provider": Payment.Provider.COD,
                "payment_status": Payment.Status.PENDING,
                "note": "Đóng gói chống sốc 2 lớp giúp mình.",
                "days_ago": 2,
            },
            {
                "order_number": "NX-20261113-006",
                "email": "lethanhvu005@gmail.com",
                "status": OrderStatus.CONFIRMED,
                "shipping": exp_ship,
                "voucher_code": "NEXA10",
                "items": [("NEXA-S98", 1), ("COR-M75", 1)],
                "payment_provider": Payment.Provider.MOMO,
                "payment_status": Payment.Status.SUCCEEDED,
                "note": "Giao nhanh trong sáng mai.",
                "days_ago": 1,
            },
            {
                "order_number": "NX-20261114-007",
                "email": "lethanhvu005@gmail.com",
                "status": OrderStatus.PENDING,
                "shipping": std_ship,
                "voucher_code": "FREESHIP",
                "items": [("NEXA-CHAIR", 1), ("NEXA-OPT24", 1)],
                "payment_provider": Payment.Provider.COD,
                "payment_status": Payment.Status.PENDING,
                "note": "Hỗ trợ lắp đặt ghế khi giao.",
                "days_ago": 0,
            },
            {
                "order_number": "NX-20261104-008",
                "email": "lethanhvu005@gmail.com",
                "status": OrderStatus.CANCELLED,
                "shipping": std_ship,
                "voucher_code": None,
                "items": [("COR-K70", 1)],
                "payment_provider": Payment.Provider.VNPAY,
                "payment_status": Payment.Status.CANCELLED,
                "note": "Đổi sang đặt bản TKL nhỏ gọn hơn.",
                "days_ago": 8,
            },
            # --- lethanhvu2005@gmail.com (6 orders covering all tabs) ---
            {
                "order_number": "NX-20261102-009",
                "email": "lethanhvu2005@gmail.com",
                "status": OrderStatus.DELIVERED,
                "shipping": std_ship,
                "voucher_code": "NEXA5",
                "items": [("KEY-K2", 1), ("HYX-CLOUD3", 1), ("LOGI-G502", 1)],
                "payment_provider": Payment.Provider.VNPAY,
                "payment_status": Payment.Status.SUCCEEDED,
                "note": "Giao buổi chiều sau 14h.",
                "days_ago": 11,
            },
            {
                "order_number": "NX-20261105-010",
                "email": "lethanhvu2005@gmail.com",
                "status": OrderStatus.DELIVERED,
                "shipping": exp_ship,
                "voucher_code": "NEXA200K",
                "items": [("NEXA-V27", 1), ("LOGI-PROX-TKL", 1), ("NEXA-AURA71", 1)],
                "payment_provider": Payment.Provider.MOMO,
                "payment_status": Payment.Status.SUCCEEDED,
                "note": "Giao tại cổng Khu Công Nghệ Cao.",
                "days_ago": 7,
            },
            {
                "order_number": "NX-20261110-011",
                "email": "lethanhvu2005@gmail.com",
                "status": OrderStatus.SHIPPED,
                "shipping": exp_ship,
                "voucher_code": "NEWMEMBER15",
                "items": [("NEXA-X75", 1), ("RAZER-VV3P", 1)],
                "payment_provider": Payment.Provider.VNPAY,
                "payment_status": Payment.Status.SUCCEEDED,
                "note": "Gọi điện trước khi giao 30 phút.",
                "days_ago": 3,
            },
            {
                "order_number": "NX-20261112-012",
                "email": "lethanhvu2005@gmail.com",
                "status": OrderStatus.CONFIRMED,
                "shipping": std_ship,
                "voucher_code": "NEXA10",
                "items": [("ASUS-VG27AQ", 1), ("NEXA-MAT", 1)],
                "payment_provider": Payment.Provider.MOMO,
                "payment_status": Payment.Status.SUCCEEDED,
                "note": "Kiểm tra kỹ điểm chết màn hình trước khi xuất kho.",
                "days_ago": 1,
            },
            {
                "order_number": "NX-20261114-013",
                "email": "lethanhvu2005@gmail.com",
                "status": OrderStatus.PENDING,
                "shipping": exp_ship,
                "voucher_code": None,
                "items": [("KEY-Q1PRO", 1)],
                "payment_provider": Payment.Provider.COD,
                "payment_status": Payment.Status.PENDING,
                "note": "Kiểm tra hàng nguyên seal khi nhận.",
                "days_ago": 0,
            },
            {
                "order_number": "NX-20261107-014",
                "email": "lethanhvu2005@gmail.com",
                "status": OrderStatus.CANCELLED,
                "shipping": std_ship,
                "voucher_code": None,
                "items": [("RAZER-BSV2", 1)],
                "payment_provider": Payment.Provider.VNPAY,
                "payment_status": Payment.Status.CANCELLED,
                "note": "Đặt nhầm địa chỉ nhận hàng, hủy để đặt lại.",
                "days_ago": 5,
            },
            # --- vu@gmail.com (6 orders covering all tabs) ---
            {
                "order_number": "NX-20261103-015",
                "email": "vu@gmail.com",
                "status": OrderStatus.DELIVERED,
                "shipping": std_ship,
                "voucher_code": "FREESHIP",
                "items": [("LOGI-G502", 1), ("NEXA-AURA71", 1), ("NEXA-S98", 1)],
                "payment_provider": Payment.Provider.COD,
                "payment_status": Payment.Status.SUCCEEDED,
                "note": "Để ở quầy lễ tân nếu không nghe máy.",
                "days_ago": 10,
            },
            {
                "order_number": "NX-20261106-016",
                "email": "vu@gmail.com",
                "status": OrderStatus.DELIVERED,
                "shipping": exp_ship,
                "voucher_code": "VIP300K",
                "items": [("COR-K70", 1), ("NEXA-CHAIR", 1), ("NEXA-OPT24", 1)],
                "payment_provider": Payment.Provider.VNPAY,
                "payment_status": Payment.Status.SUCCEEDED,
                "note": "Giao ngoài giờ hành chính sau 18h.",
                "days_ago": 6,
            },
            {
                "order_number": "NX-20261109-017",
                "email": "vu@gmail.com",
                "status": OrderStatus.SHIPPED,
                "shipping": std_ship,
                "voucher_code": "NEXA10",
                "items": [("LOGI-GPX2", 1), ("HYX-CLOUD3", 1)],
                "payment_provider": Payment.Provider.MOMO,
                "payment_status": Payment.Status.SUCCEEDED,
                "note": "Giao tại sảnh A tòa nhà Sky City.",
                "days_ago": 3,
            },
            {
                "order_number": "NX-20261112-018",
                "email": "vu@gmail.com",
                "status": OrderStatus.PACKING,
                "shipping": exp_ship,
                "voucher_code": "GAMING50K",
                "items": [("RAZER-ATLAS", 1), ("NEXA-PULSE8K", 1)],
                "payment_provider": Payment.Provider.VNPAY,
                "payment_status": Payment.Status.SUCCEEDED,
                "note": "Pad kính cường lực xin bọc kỹ xốp nổ.",
                "days_ago": 1,
            },
            {
                "order_number": "NX-20261114-019",
                "email": "vu@gmail.com",
                "status": OrderStatus.PENDING,
                "shipping": std_ship,
                "voucher_code": "NEXA200K",
                "items": [("COR-TC100", 1)],
                "payment_provider": Payment.Provider.COD,
                "payment_status": Payment.Status.PENDING,
                "note": "Giao vào cuối tuần thứ Bảy.",
                "days_ago": 0,
            },
            {
                "order_number": "NX-20261108-020",
                "email": "vu@gmail.com",
                "status": OrderStatus.CANCELLED,
                "shipping": std_ship,
                "voucher_code": None,
                "items": [("ASUS-XG27", 1)],
                "payment_provider": Payment.Provider.VNPAY,
                "payment_status": Payment.Status.CANCELLED,
                "note": "Đổi sang mẫu màn hình 24.5 inch phù hợp bàn làm việc.",
                "days_ago": 4,
            },
            # --- Other customer orders for rich analytics & verified reviews across all 24 SKUs ---
            {
                "order_number": "NX-20261101-021",
                "email": "minh.tran@nexa.vn",
                "status": OrderStatus.DELIVERED,
                "shipping": exp_ship,
                "voucher_code": "NEXA200K",
                "items": [("ASUS-VG27AQ", 1), ("KEY-Q1PRO", 1), ("RAZER-ATLAS", 1), ("COR-M75", 1)],
                "payment_provider": Payment.Provider.MOMO,
                "payment_status": Payment.Status.SUCCEEDED,
                "note": "Xuất hóa đơn VAT công ty.",
                "days_ago": 13,
            },
            {
                "order_number": "NX-20261104-022",
                "email": "minh.tran@nexa.vn",
                "status": OrderStatus.DELIVERED,
                "shipping": std_ship,
                "voucher_code": "SETUP500K",
                "items": [("RAZER-HV3", 1), ("LOGI-PROX-TKL", 1), ("LOGI-GPX2-HS", 1), ("ASUS-XG27", 1)],
                "payment_provider": Payment.Provider.VNPAY,
                "payment_status": Payment.Status.SUCCEEDED,
                "note": "Giao cho phòng eSports Đà Nẵng.",
                "days_ago": 8,
            },
            {
                "order_number": "NX-20261102-023",
                "email": "huong.pham@nexa.vn",
                "status": OrderStatus.DELIVERED,
                "shipping": std_ship,
                "voucher_code": "NEXA10",
                "items": [("NEXA-S98", 1), ("NEXA-V27", 1), ("NEXA-MAT", 2), ("NEXA-PULSE8K", 1)],
                "payment_provider": Payment.Provider.VNPAY,
                "payment_status": Payment.Status.SUCCEEDED,
                "note": "Giao giờ hành chính.",
                "days_ago": 10,
            },
            {
                "order_number": "NX-20261104-024",
                "email": "huong.pham@nexa.vn",
                "status": OrderStatus.EXPIRED,
                "shipping": std_ship,
                "voucher_code": None,
                "items": [("NEXA-CHAIR", 1)],
                "payment_provider": Payment.Provider.VNPAY,
                "payment_status": Payment.Status.FAILED,
                "note": "",
                "days_ago": 6,
            },
            {
                "order_number": "NX-20261105-025",
                "email": "anh.nguyen@nexa.vn",
                "status": OrderStatus.DELIVERED,
                "shipping": exp_ship,
                "voucher_code": "VIP300K",
                "items": [("NEXA-X75", 1), ("LOGI-GPX2", 1), ("RAZER-BSV2", 1), ("KEY-K2", 1)],
                "payment_provider": Payment.Provider.MOMO,
                "payment_status": Payment.Status.SUCCEEDED,
                "note": "Đóng gói kỹ gửi đi Nha Trang.",
                "days_ago": 7,
            },
            {
                "order_number": "NX-20261107-026",
                "email": "linh.le@nexa.vn",
                "status": OrderStatus.DELIVERED,
                "shipping": std_ship,
                "voucher_code": "NEWMEMBER15",
                "items": [("COR-K70", 1), ("HYX-CLOUD3", 1), ("LOGI-G502", 1), ("NEXA-CHAIR", 1)],
                "payment_provider": Payment.Provider.VNPAY,
                "payment_status": Payment.Status.SUCCEEDED,
                "note": "Giao trước 17h chiều.",
                "days_ago": 5,
            },
            {
                "order_number": "NX-20261108-027",
                "email": "duc.vo@nexa.vn",
                "status": OrderStatus.DELIVERED,
                "shipping": exp_ship,
                "voucher_code": "SETUP500K",
                "items": [("RAZER-HV3", 1), ("LOGI-PROX-TKL", 1), ("RAZER-VV3P", 1), ("COR-M75", 1)],
                "payment_provider": Payment.Provider.VNPAY,
                "payment_status": Payment.Status.SUCCEEDED,
                "note": "Nhận hàng tại sảnh văn phòng Cầu Giấy.",
                "days_ago": 4,
            },
            {
                "order_number": "NX-20261110-028",
                "email": "trang.hoang@nexa.vn",
                "status": OrderStatus.DELIVERED,
                "shipping": std_ship,
                "voucher_code": "NEXA200K",
                "items": [("LOGI-GPX2-HS", 1), ("NEXA-AURA71", 1), ("NEXA-OPT24", 1), ("COR-TC100", 1)],
                "payment_provider": Payment.Provider.MOMO,
                "payment_status": Payment.Status.SUCCEEDED,
                "note": "Gọi cho lễ tân nhận giúp nếu mình đang họp.",
                "days_ago": 2,
            },
            {
                "order_number": "NX-20261111-029",
                "email": "anh.nguyen@nexa.vn",
                "status": OrderStatus.DELIVERED,
                "shipping": std_ship,
                "voucher_code": "GAMING50K",
                "items": [("NEXA-V27", 1), ("ASUS-XG27", 1)],
                "payment_provider": Payment.Provider.VNPAY,
                "payment_status": Payment.Status.SUCCEEDED,
                "note": "Bọc chống thấm nước cẩn thận.",
                "days_ago": 2,
            },
            {
                "order_number": "NX-20261113-030",
                "email": "linh.le@nexa.vn",
                "status": OrderStatus.SHIPPED,
                "shipping": exp_ship,
                "voucher_code": "NEXA10",
                "items": [("KEY-Q1PRO", 1), ("RAZER-ATLAS", 1)],
                "payment_provider": Payment.Provider.MOMO,
                "payment_status": Payment.Status.SUCCEEDED,
                "note": "Giao nhanh giúp mình nhé.",
                "days_ago": 1,
            },
        ]

        # Also clean up old demo order numbers that were renamed so there are no duplicates
        old_demo_nums = ["NX-20261105-002", "NX-20261110-003", "NX-20261102-004", "NX-20261112-005", "NX-20261103-006", "NX-20261108-007", "NX-20261109-008", "NX-20261104-009"]
        for old_num in old_demo_nums:
            old_ord = Order.objects.filter(order_number=old_num).first()
            if old_ord:
                Review.objects.filter(order_item__order=old_ord).update(order_item=None)
                InventoryMovement.objects.filter(order=old_ord).delete()
                InventoryReservation.objects.filter(order=old_ord).delete()
                VoucherRedemption.objects.filter(order=old_ord).delete()
                Payment.objects.filter(order=old_ord).delete()
                OrderStatusHistory.objects.filter(order=old_ord).delete()
                OrderItem.objects.filter(order=old_ord).delete()
                OrderAddress.objects.filter(order=old_ord).delete()
                sc = old_ord.source_cart
                old_ord.delete()
                if sc:
                    CartItem.objects.filter(cart=sc).delete()
                    sc.delete()

        staff_actor = users_by_email["lethanhvu005@gmail.com"]
        delivered_order_items = {}

        for spec in order_specs:
            order_number = spec["order_number"]
            user = users_by_email[spec["email"]]
            addr = default_address_by_email[spec["email"]]
            ship = spec["shipping"]
            voucher = vouchers_by_code.get(spec["voucher_code"]) if spec["voucher_code"] else None
            created_time = now - timedelta(days=spec["days_ago"], hours=3)

            # Calculate totals
            subtotal = sum(variants_by_sku[sku].price * qty for sku, qty in spec["items"])
            shipping_fee = Decimal("0") if (ship.free_threshold and subtotal >= ship.free_threshold) else ship.base_fee
            discount_total = Decimal("0")
            shipping_discount = Decimal("0")
            if voucher:
                if voucher.kind == Voucher.Kind.PERCENT:
                    raw = (subtotal * voucher.value) // Decimal("100")
                    discount_total = min(raw, voucher.max_discount) if voucher.max_discount else raw
                elif voucher.kind == Voucher.Kind.FIXED:
                    discount_total = min(voucher.value, subtotal)
                elif voucher.kind == Voucher.Kind.FREE_SHIP:
                    shipping_discount = shipping_fee
            grand_total = subtotal - discount_total + shipping_fee - shipping_discount

            # Dedicated converted source_cart for this order
            existing_order = Order.objects.filter(order_number=order_number).select_related("source_cart").first()
            if existing_order:
                source_cart = existing_order.source_cart
            else:
                source_cart = Cart.objects.create(
                    user=user,
                    status=Cart.Status.CONVERTED,
                    voucher=voucher,
                    expires_at=created_time + timedelta(days=7),
                )

            if not existing_order or force_overwrite:
                for sku, qty in spec["items"]:
                    _save_or_get(
                        CartItem.objects,
                        force_overwrite,
                        cart=source_cart,
                        variant=variants_by_sku[sku],
                        defaults={"quantity": qty},
                    )

            order, order_created = _save_or_get(
                Order.objects,
                force_overwrite,
                order_number=order_number,
                defaults={
                    "user": user,
                    "checkout_key": deterministic_uuid(f"checkout-{order_number}"),
                    "request_hash": deterministic_sha256(f"req-{order_number}"),
                    "source_cart": source_cart,
                    "status": spec["status"],
                    "currency": "VND",
                    "subtotal": subtotal,
                    "discount_total": discount_total,
                    "shipping_fee": shipping_fee,
                    "shipping_discount": shipping_discount,
                    "grand_total": grand_total,
                    "voucher": voucher,
                    "voucher_code_snapshot": voucher.code if voucher else None,
                    "shipping_method": ship,
                    "shipping_method_snapshot": ship.name,
                    "contact_email_snapshot": user.email,
                    "customer_note": spec["note"],
                },
            )
            if order_created or force_overwrite:
                Order.objects.filter(pk=order.pk).update(created_at=created_time, updated_at=created_time)

            _save_or_get(
                OrderAddress.objects,
                force_overwrite,
                order=order,
                defaults={
                    "recipient_name": addr.recipient_name,
                    "phone": addr.phone,
                    "address_line": addr.address_line,
                    "ward": addr.ward,
                    "province": addr.province,
                    "country_code": "VN",
                },
            )

            for sku, qty in spec["items"]:
                variant = variants_by_sku[sku]
                oi, _ = _save_or_get(
                    OrderItem.objects,
                    force_overwrite,
                    order=order,
                    variant=variant,
                    defaults={
                        "product_name_snapshot": variant.product.name,
                        "sku_snapshot": variant.sku,
                        "options_snapshot": {
                            "color": variant.color,
                            "connection": variant.connection,
                            "layout": variant.layout,
                        },
                        "quantity": qty,
                        "unit_price": variant.price,
                        "line_total": variant.price * qty,
                    },
                )
                if order.status == OrderStatus.DELIVERED:
                    delivered_order_items[(user.email, variant.product.slug)] = oi

                # InventoryReservation for every order item (30-minute hold window matching checkout)
                if spec["status"] in [OrderStatus.PENDING, OrderStatus.CONFIRMED, OrderStatus.PACKING]:
                    res_status = InventoryReservation.Status.ACTIVE
                    res_created_at = now
                    closed_at = None
                    expires_at_val = now + timedelta(minutes=30)
                elif spec["status"] in [OrderStatus.SHIPPED, OrderStatus.DELIVERED]:
                    res_status = InventoryReservation.Status.CONSUMED
                    res_created_at = created_time
                    closed_at = created_time + timedelta(minutes=25)
                    expires_at_val = created_time + timedelta(minutes=30)
                elif spec["status"] == OrderStatus.CANCELLED:
                    res_status = InventoryReservation.Status.RELEASED
                    res_created_at = created_time
                    closed_at = created_time + timedelta(minutes=15)
                    expires_at_val = created_time + timedelta(minutes=30)
                else:
                    res_status = InventoryReservation.Status.EXPIRED
                    res_created_at = created_time
                    closed_at = created_time + timedelta(minutes=30)
                    expires_at_val = created_time + timedelta(minutes=30)

                _save_or_get(
                    InventoryReservation.objects,
                    force_overwrite,
                    order=order,
                    variant=variant,
                    defaults={
                        "quantity": qty,
                        "status": res_status,
                        "created_at": res_created_at,
                        "expires_at": expires_at_val,
                        "closed_at": closed_at,
                    },
                )

                # InventoryMovement (sale for shipped/delivered)
                if spec["status"] in [OrderStatus.SHIPPED, OrderStatus.DELIVERED]:
                    _save_or_get(
                        InventoryMovement.objects,
                        force_overwrite,
                        order=order,
                        variant=variant,
                        kind=InventoryMovement.Kind.SALE,
                        defaults={
                            "actor": staff_actor,
                            "event_key": deterministic_uuid(f"sale-{order_number}-{sku}"),
                            "quantity_delta": -qty,
                            "reason": f"Xuất kho giao đơn hàng {order_number}",
                        },
                    )

            # OrderStatusHistory timeline
            if not order.status_history.exists():
                transitions = [(None, OrderStatus.PENDING, user, "Khởi tạo đơn hàng từ giỏ hàng")]
                if spec["status"] in [OrderStatus.CONFIRMED, OrderStatus.PACKING, OrderStatus.SHIPPED, OrderStatus.DELIVERED]:
                    transitions.append((OrderStatus.PENDING, OrderStatus.CONFIRMED, staff_actor, "Hệ thống đã xác nhận thanh toán & tồn kho"))
                if spec["status"] in [OrderStatus.PACKING, OrderStatus.SHIPPED, OrderStatus.DELIVERED]:
                    transitions.append((OrderStatus.CONFIRMED, OrderStatus.PACKING, staff_actor, "Kho NEXA đang đóng gói chống sốc"))
                if spec["status"] in [OrderStatus.SHIPPED, OrderStatus.DELIVERED]:
                    transitions.append((OrderStatus.PACKING, OrderStatus.SHIPPED, staff_actor, "Đã bàn giao cho đơn vị vận chuyển"))
                if spec["status"] == OrderStatus.DELIVERED:
                    transitions.append((OrderStatus.SHIPPED, OrderStatus.DELIVERED, staff_actor, "Giao hàng thành công tới người nhận"))
                if spec["status"] == OrderStatus.CANCELLED:
                    transitions.append((OrderStatus.PENDING, OrderStatus.CANCELLED, user, spec["note"] or "Khách hàng yêu cầu hủy đơn"))
                if spec["status"] == OrderStatus.EXPIRED:
                    transitions.append((OrderStatus.PENDING, OrderStatus.EXPIRED, None, "Quá thời hạn giữ chỗ thanh toán"))

                for step_i, (from_st, to_st, actor_user, reason_text) in enumerate(transitions):
                    hist = OrderStatusHistory.objects.create(
                        order=order,
                        from_status=from_st,
                        to_status=to_st,
                        actor=actor_user,
                        reason=reason_text,
                    )
                    OrderStatusHistory.objects.filter(pk=hist.pk).update(
                        created_at=created_time + timedelta(hours=step_i * 2)
                    )

            # VoucherRedemption (RELEASED for cancelled/expired orders)
            if voucher:
                if spec["status"] in [OrderStatus.CONFIRMED, OrderStatus.PACKING, OrderStatus.SHIPPED, OrderStatus.DELIVERED]:
                    red_status = VoucherRedemption.Status.USED
                elif spec["status"] == OrderStatus.PENDING:
                    red_status = VoucherRedemption.Status.RESERVED
                else:
                    red_status = VoucherRedemption.Status.RELEASED
                _save_or_get(
                    VoucherRedemption.objects,
                    force_overwrite,
                    order=order,
                    defaults={
                        "voucher": voucher,
                        "user": user,
                        "status": red_status,
                        "discount_amount": discount_total + shipping_discount,
                    },
                )

            # Payment
            paid_at_val = created_time if spec["payment_status"] in [Payment.Status.SUCCEEDED, Payment.Status.REFUNDED] else None
            pay_obj, pay_created = _save_or_get(
                Payment.objects,
                force_overwrite,
                idempotency_key=deterministic_uuid(f"pay-{order_number}"),
                defaults={
                    "order": order,
                    "provider": spec["payment_provider"],
                    "status": spec["payment_status"],
                    "amount": grand_total,
                    "currency": "VND",
                    "provider_reference": f"TXN-{order_number}" if spec["payment_provider"] != Payment.Provider.COD else None,
                    "paid_at": paid_at_val,
                },
            )
            if pay_created or force_overwrite:
                Payment.objects.filter(pk=pay_obj.pk).update(created_at=created_time)

        # Sync InventoryBalance.reserved with active reservations for newly seeded or force-overwritten SKUs
        low_stock_skus = {"ASUS-XG27": 7, "KEY-Q1PRO": 8, "RAZER-ATLAS": 6}
        for sku, variant in variants_by_sku.items():
            balance = InventoryBalance.objects.get(variant=variant)
            if sku in newly_created_skus or force_overwrite:
                active_res = (
                    InventoryReservation.objects.filter(variant=variant, status=InventoryReservation.Status.ACTIVE)
                    .aggregate(total=Sum("quantity"))["total"]
                    or 0
                )
                balance.reserved = active_res
                if sku in low_stock_skus:
                    balance.low_stock_threshold = 10
                    balance.on_hand = active_res + low_stock_skus[sku]
                else:
                    balance.low_stock_threshold = 8
                    if balance.on_hand < active_res + 15:
                        balance.on_hand = active_res + 28
                balance.save(update_fields=["on_hand", "reserved", "low_stock_threshold", "updated_at"])

            _save_or_get(
                InventoryMovement.objects,
                force_overwrite,
                event_key=deterministic_uuid(f"receipt-initial-{sku}"),
                defaults={
                    "variant": variant,
                    "order": None,
                    "actor": staff_actor,
                    "kind": InventoryMovement.Kind.RECEIPT,
                    "quantity_delta": balance.on_hand,
                    "reason": f"Nhập kho lô hàng chính hãng mã {sku}",
                },
            )

        # 8. Community: Comprehensive Reviews & Q&A for ALL 24 Products
        product_review_map = {
            "NEXA-X75": [
                ("lethanhvu005@gmail.com", 5, "Bàn phím gõ cực kỳ đầm tay, stabilizer được cân chỉnh sẵn rất mượt và LED RGB sáng đều đẹp mắt.", ModerationStatus.PUBLISHED, 10),
                ("lethanhvu2005@gmail.com", 5, "Layout 75% vừa vặn bàn làm việc, kết nối 2.4GHz cực nhạy không có độ trễ khi chơi game.", ModerationStatus.PUBLISHED, 7),
                ("anh.nguyen@nexa.vn", 5, "Foam tiêu âm 3 lớp làm rất tốt, âm gõ clacky nghe cực cuốn, pin dùng liên tục cả tuần.", ModerationStatus.PUBLISHED, 5),
                ("minh.tran@nexa.vn", 4, "Keycap PBT nhám nhẹ chống bám vân tay tốt, phần mềm chỉnh macro trực quan dễ dùng.", ModerationStatus.PUBLISHED, 2),
            ],
            "LOGI-GPX2": [
                ("lethanhvu005@gmail.com", 5, "Chuột nhẹ đến bất ngờ, di tâm trong Valorant và CS2 cực kỳ chuẩn xác, pin dùng cả tuần chưa hết.", ModerationStatus.PUBLISHED, 11),
                ("vu@gmail.com", 5, "Switch quang học Lightforce mới bấm đanh và nảy hơn đời 1 rất nhiều, cổng sạc USB-C quá tiện.", ModerationStatus.PUBLISHED, 6),
                ("anh.nguyen@nexa.vn", 5, "Cảm biến Hero 2 32K tracking mượt mà trên cả pad vải lẫn pad kính, xứng đáng chuột quốc dân eSports.", ModerationStatus.PUBLISHED, 4),
                ("duc.vo@nexa.vn", 4, "Form cầm an toàn phù hợp cả claw grip và palm grip, feet zin lướt khá êm.", ModerationStatus.PUBLISHED, 1),
            ],
            "RAZER-BSV2": [
                ("lethanhvu005@gmail.com", 5, "Micro HyperClear Super Wideband thu âm trong vắt như mic rời, đồng đội khen giọng rất rõ.", ModerationStatus.PUBLISHED, 8),
                ("anh.nguyen@nexa.vn", 5, "Đệm tai FlowKnit cực thoáng, đeo 6 tiếng liên tục cuối tuần vẫn nhẹ đầu và không nóng tai.", ModerationStatus.PUBLISHED, 5),
                ("minh.tran@nexa.vn", 4, "Định vị tiếng bước chân trong FPS cực chuẩn nhờ profile eSports có sẵn trên Synapse.", ModerationStatus.PUBLISHED, 3),
                ("huong.pham@nexa.vn", 5, "Thời lượng pin thực tế lên tới gần 70 giờ, cả tuần mới phải cắm sạc một lần.", ModerationStatus.PUBLISHED, 1),
            ],
            "ASUS-VG27AQ": [
                ("lethanhvu005@gmail.com", 5, "Màn hình 27 inch 2K 165Hz quá sắc nét, màu sắc IPS tươi tắn, vừa làm đồ họa vừa bắn FPS đều ngon.", ModerationStatus.PUBLISHED, 8),
                ("minh.tran@nexa.vn", 5, "Chân đế công thái học nâng hạ xoay dọc rất mượt, bật G-Sync Compatible không hề bị xé hình.", ModerationStatus.PUBLISHED, 12),
                ("lethanhvu2005@gmail.com", 4, "Tấm nền không bị hở sáng ở các góc, shop đóng gói chống sốc cực kỳ cẩn thận.", ModerationStatus.PUBLISHED, 4),
                ("anh.nguyen@nexa.vn", 5, "Trong tầm giá dưới 7 triệu thì chiếc màn 2K này vô địch về độ bền và hiệu năng.", ModerationStatus.PUBLISHED, 2),
            ],
            "KEY-K2": [
                ("lethanhvu2005@gmail.com", 5, "Kết nối Bluetooth với MacBook và PC chuyển đổi rất nhanh bằng tổ hợp phím, gõ code cả ngày không mỏi.", ModerationStatus.PUBLISHED, 10),
                ("anh.nguyen@nexa.vn", 5, "Có sẵn bộ keycap cho cả macOS và Windows trong hộp, build khung nhôm cực kỳ cứng cáp.", ModerationStatus.PUBLISHED, 6),
                ("vu@gmail.com", 4, "Pin 4000mAh rất trâu, thiết kế cổ điển đặt lên bàn làm việc nhìn cực kỳ tối giản.", ModerationStatus.PUBLISHED, 3),
            ],
            "NEXA-S98": [
                ("vu@gmail.com", 5, "Layout 98 phím có cụm phím số rất tiện nhập liệu kế toán và code mà vẫn gọn hơn full-size nhiều.", ModerationStatus.PUBLISHED, 9),
                ("huong.pham@nexa.vn", 5, "Dải LED viền RGB hai bên hông rất đẹp, âm gõ trầm ấm nhờ lót sẵn đệm silicone dày.", ModerationStatus.PUBLISHED, 8),
                ("lethanhvu005@gmail.com", 5, "Mạch hot-swap 5 pin nhận diện switch nhạy, núm xoay chỉnh âm lượng vặn rất đầm tay.", ModerationStatus.PUBLISHED, 2),
                ("linh.le@nexa.vn", 5, "Đang chờ nhận thêm bộ switch tactile để lắp thử trên chiếc S98 này, rất ưng ý.", ModerationStatus.PENDING, 1),
            ],
            "COR-K70": [
                ("vu@gmail.com", 5, "Khung nhôm phay xước đặc trưng của Corsair cực kỳ sang, cụm phím media và con lăn nhôm quá tiện.", ModerationStatus.PUBLISHED, 5),
                ("linh.le@nexa.vn", 5, "Tần số phản hồi AXON 8000Hz siêu nhanh, kê tay từ tính đi kèm mềm và đỡ cổ tay rất tốt.", ModerationStatus.PUBLISHED, 4),
                ("duc.vo@nexa.vn", 4, "Keycap PBT Double-shot dày dặn, hiệu ứng đèn iCUE đồng bộ với toàn bộ dàn PC cực đẹp.", ModerationStatus.PUBLISHED, 2),
            ],
            "HYX-CLOUD3": [
                ("lethanhvu2005@gmail.com", 5, "Đệm tai memory foam siêu êm đúng chất HyperX, đeo 5 tiếng liên tục không bị đau vành tai.", ModerationStatus.PUBLISHED, 9),
                ("linh.le@nexa.vn", 5, "Pin lên đến 120 giờ thực sự ấn tượng, mua về dùng hơn 2 tuần lễ vẫn chưa phải sạc lại.", ModerationStatus.PUBLISHED, 4),
                ("vu@gmail.com", 4, "Màng loa 53mm đặt nghiêng cho âm trường rộng, nghe nhạc lẫn chơi game thế giới mở đều hay.", ModerationStatus.PUBLISHED, 2),
            ],
            "LOGI-G502": [
                ("lethanhvu2005@gmail.com", 5, "Con lăn vô cực hai chế độ cuộn tài liệu dài cực sướng, chuyển sang bắn súng cũng rất đầm.", ModerationStatus.PUBLISHED, 10),
                ("vu@gmail.com", 5, "Bản G502 X Lightspeed giảm trọng lượng đáng kể so với đời cũ, nút bắn tỉa DPI Shift tháo đảo chiều rất thông minh.", ModerationStatus.PUBLISHED, 8),
                ("linh.le@nexa.vn", 5, "Nhiều nút phụ lập trình được trên G HUB, hỗ trợ đắc lực cho cả dựng video Premiere và chơi MMO.", ModerationStatus.PUBLISHED, 3),
            ],
            "NEXA-V27": [
                ("lethanhvu2005@gmail.com", 5, "Màn hình NEXA Vision 27 QHD viền siêu mỏng 3 cạnh, ghép 2 màn hình liền mạch cực đẹp.", ModerationStatus.PUBLISHED, 6),
                ("huong.pham@nexa.vn", 5, "Màu sắc chuẩn xác ngay khi xuất xưởng, làm việc văn phòng và chỉnh ảnh Lightroom rất dịu mắt.", ModerationStatus.PUBLISHED, 9),
                ("anh.nguyen@nexa.vn", 4, "Có đầy đủ cáp DisplayPort và HDMI đi kèm trong hộp, chân đế kim loại chắc chắn không rung lắc.", ModerationStatus.PUBLISHED, 2),
            ],
            "NEXA-MAT": [
                ("lethanhvu005@gmail.com", 5, "Pad chuột cỡ XL phủ kín mặt bàn, bề mặt vải dệt mịn giúp di chuột mượt mà và kiểm soát tâm tốt.", ModerationStatus.PUBLISHED, 11),
                ("huong.pham@nexa.vn", 5, "Lớp phủ kháng nước hiệu quả, lỡ làm đổ chút cà phê chỉ cần lấy khăn giấy thấm nhẹ là sạch.", ModerationStatus.PUBLISHED, 8),
                ("lethanhvu2005@gmail.com", 5, "Viền bo may chìm không gây cấn cổ tay khi tì lâu, đế cao su bám chặt mặt bàn gỗ.", ModerationStatus.PUBLISHED, 3),
            ],
            "NEXA-CHAIR": [
                ("vu@gmail.com", 5, "Ghế NEXA Ergo Pro đỡ thắt lưng chuẩn công thái học, ngồi code 8-10 tiếng mỗi ngày hết hẳn đau mỏi lưng.", ModerationStatus.PUBLISHED, 5),
                ("linh.le@nexa.vn", 5, "Lưới thoáng khí ngồi mùa hè rất mát, bệ tỳ tay 4D chỉnh được mọi góc độ vừa tầm bàn.", ModerationStatus.PUBLISHED, 4),
                ("lethanhvu005@gmail.com", 4, "Khung chân hợp kim nhôm sáng bóng, bánh xe PU lăn êm không gây xước sàn gỗ.", ModerationStatus.PUBLISHED, 1),
            ],
            "RAZER-HV3": [
                ("minh.tran@nexa.vn", 5, "Tính năng Rapid Trigger trên switch quang học Analog Gen-2 giúp counter-strafe trong Valorant nhanh không tưởng!", ModerationStatus.PUBLISHED, 7),
                ("duc.vo@nexa.vn", 5, "Chỉnh được điểm nhận phím từ 0.1mm đến 4.0mm ngay trên bàn phím không cần mở phần mềm, quá đỉnh.", ModerationStatus.PUBLISHED, 3),
                ("lethanhvu005@gmail.com", 5, "Mặt trên bằng nhôm máy bay cứng cáp, kê tay giả da có nam châm hít rất gọn.", ModerationStatus.PUBLISHED, 2),
            ],
            "LOGI-PROX-TKL": [
                ("lethanhvu2005@gmail.com", 5, "Kết nối Lightspeed dùng chung 1 đầu thu với chuột G Pro X Superlight 2 cực gọn cổng USB.", ModerationStatus.PUBLISHED, 6),
                ("minh.tran@nexa.vn", 5, "Đi kèm hộp đựng cứng chống sốc rất xịn để mang đi thi đấu hoặc ra quán net.", ModerationStatus.PUBLISHED, 7),
                ("duc.vo@nexa.vn", 4, "Keycap PBT xuyên LED sáng rõ, con lăn chỉnh âm lượng mượt và tiện lợi.", ModerationStatus.PUBLISHED, 3),
            ],
            "KEY-Q1PRO": [
                ("lethanhvu005@gmail.com", 5, "Khung nhôm CNC 6063 nguyên khối nặng gần 2kg cực kỳ đầm, cấu trúc Gasket mount nhún êm tuyệt vời.", ModerationStatus.PUBLISHED, 5),
                ("minh.tran@nexa.vn", 5, "Keymap trực tiếp trên trình duyệt bằng VIA không cần cài app, núm xoay CNC hoàn thiện sắc sảo.", ModerationStatus.PUBLISHED, 11),
                ("linh.le@nexa.vn", 5, "Keycap KSA profile PBT hai lớp gõ rất ôm ngón tay, âm thanh stock đã cực kỳ hay rồi.", ModerationStatus.PUBLISHED, 1),
                ("duc.vo@nexa.vn", 5, "Đang trải nghiệm thêm kết nối Bluetooth 5.1 trên iPad Pro, độ trễ rất thấp.", ModerationStatus.PENDING, 0),
            ],
            "RAZER-VV3P": [
                ("lethanhvu005@gmail.com", 5, "Trọng lượng 54g cân bằng hoàn hảo, đi kèm sẵn HyperPolling Wireless Dongle 8000Hz trong hộp luôn!", ModerationStatus.PUBLISHED, 5),
                ("duc.vo@nexa.vn", 5, "Form mới nâng phần lưng cao hơn Viper V2 Pro nên ôm lòng bàn tay cực kỳ thoải mái.", ModerationStatus.PUBLISHED, 3),
                ("lethanhvu2005@gmail.com", 5, "Lớp phủ bề mặt mịn bám tay cực tốt kể cả khi ra mồ hôi tay lúc thi đấu căng thẳng.", ModerationStatus.PUBLISHED, 2),
            ],
            "NEXA-PULSE8K": [
                ("huong.pham@nexa.vn", 5, "Mức giá chưa tới 2 triệu mà có sẵn mắt đọc PAW3395 và đầu thu 8KHz, trọng lượng 49g nhẹ như lông hồng.", ModerationStatus.PUBLISHED, 8),
                ("lethanhvu005@gmail.com", 5, "Switch quang học bấm giòn, không lo bị double-click, feet PTFE lớn lướt cực êm.", ModerationStatus.PUBLISHED, 3),
                ("vu@gmail.com", 4, "Thiết kế đối xứng dễ làm quen, đèn báo mức DPI và dung lượng pin trên dock thu phát rất trực quan.", ModerationStatus.PUBLISHED, 1),
            ],
            "COR-M75": [
                ("minh.tran@nexa.vn", 5, "Chuột đối xứng thuần FPS của Corsair làm rất tốt, không có chi tiết thừa, vẩy tâm cực nhanh.", ModerationStatus.PUBLISHED, 11),
                ("duc.vo@nexa.vn", 5, "Nút bấm Quickstrike không có khoảng trễ hành trình, phản hồi tức thì từng pha đấu súng.", ModerationStatus.PUBLISHED, 3),
                ("lethanhvu005@gmail.com", 4, "Kết nối không dây Slipstream cực kỳ ổn định, cầm nắm chắc chắn.", ModerationStatus.PUBLISHED, 1),
            ],
            "LOGI-GPX2-HS": [
                ("minh.tran@nexa.vn", 5, "Màng loa Graphene 50mm tách bạch hoàn toàn tiếng bước chân và tiếng nổ lựu đạn, âm thanh cực kỳ chi tiết.", ModerationStatus.PUBLISHED, 7),
                ("trang.hoang@nexa.vn", 5, "Trong hộp tặng kèm cả bộ đệm tai da lẫn đệm tai vải nhung để thay đổi theo thời tiết, rất chu đáo.", ModerationStatus.PUBLISHED, 2),
                ("lethanhvu005@gmail.com", 5, "Khớp xoay tai nghe linh hoạt, có cả Bluetooth để vừa chơi game trên PC vừa nhận cuộc gọi điện thoại.", ModerationStatus.PUBLISHED, 2),
            ],
            "NEXA-AURA71": [
                ("lethanhvu2005@gmail.com", 5, "Trong tầm giá hơn 2 triệu thì chiếc tai nghe không dây này quá đáng tiền, mic lọc ồn AI rất tốt khi họp nhóm.", ModerationStatus.PUBLISHED, 6),
                ("vu@gmail.com", 5, "Âm thanh vòm 7.1 xem phim hành động và chơi game AAA cực kỳ sống động, trọng lượng nhẹ chỉ 260g.", ModerationStatus.PUBLISHED, 9),
                ("trang.hoang@nexa.vn", 4, "Đệm tai vải lưới mát mẻ, màu sắc hiện đại hợp với góc setup trắng đen.", ModerationStatus.PUBLISHED, 2),
            ],
            "ASUS-XG27": [
                ("minh.tran@nexa.vn", 5, "Tần số quét 300Hz ở độ phân giải 2K thực sự là đỉnh cao công nghệ, chuyển động mượt như lụa!", ModerationStatus.PUBLISHED, 7),
                ("anh.nguyen@nexa.vn", 5, "Công nghệ ELMB Sync vừa chống nhòe chuyển động vừa giữ G-Sync, bắn CS2 và Apex Legends nhìn địch cực rõ.", ModerationStatus.PUBLISHED, 2),
                ("lethanhvu005@gmail.com", 5, "Độ sáng HDR600 rực rỡ, bảng màu hiệu chỉnh sẵn từ nhà máy kèm giấy chứng nhận Calman Verified.", ModerationStatus.PUBLISHED, 3),
                ("vu@gmail.com", 4, "Chân đế ROG thiết kế hầm hố, có lỗ ốc 1/4 inch trên đỉnh để gắn webcam hoặc đèn livestream rất tiện.", ModerationStatus.PENDING, 1),
            ],
            "NEXA-OPT24": [
                ("vu@gmail.com", 5, "Màn hình 24.5 inch 240Hz chuẩn kích thước thi đấu FPS, tấm nền Fast IPS màu đẹp và góc nhìn rộng.", ModerationStatus.PUBLISHED, 5),
                ("trang.hoang@nexa.vn", 5, "Chân đế xoay dọc 90 độ rất nhẹ nhàng, mình dùng làm màn hình phụ đọc tài liệu và dựng dọc cực chuẩn.", ModerationStatus.PUBLISHED, 2),
                ("lethanhvu005@gmail.com", 5, "Viền mỏng đều 4 cạnh, menu OSD điều khiển bằng núm joystick 5 hướng phía sau rất dễ thao tác.", ModerationStatus.PUBLISHED, 1),
            ],
            "RAZER-ATLAS": [
                ("lethanhvu005@gmail.com", 5, "Lần đầu dùng pad kính cường lực mà mê luôn, bề mặt xử lý vi khắc CNC di chuột nhẹ như bay mà dừng tâm vẫn chuẩn.", ModerationStatus.PUBLISHED, 8),
                ("minh.tran@nexa.vn", 5, "Không bao giờ lo mòn bề mặt hay ẩm mốc như pad vải, lau nhẹ bằng khăn ẩm là sạch bóng như mới.", ModerationStatus.PUBLISHED, 11),
                ("vu@gmail.com", 5, "Mặt đế cao su phủ kín toàn bộ tấm kính nên đặt lên bàn cực kỳ đầm, không bị xê dịch dù vẩy chuột mạnh.", ModerationStatus.PUBLISHED, 1),
                ("linh.le@nexa.vn", 5, "Thiết kế họa tiết tối giản của Razer rất hợp với chuột Viper V3 Pro.", ModerationStatus.PENDING, 0),
            ],
            "COR-TC100": [
                ("lethanhvu005@gmail.com", 5, "Form ghế Relaxed rộng rãi thoải mái, không bị bó hai bên đùi như các mẫu ghế racing truyền thống.", ModerationStatus.PUBLISHED, 5),
                ("trang.hoang@nexa.vn", 5, "Chất liệu vải dệt mềm mại và cực kỳ thoáng lưng, gối cổ cao su non nâng đỡ gáy rất êm khi ngả nghỉ trưa.", ModerationStatus.PUBLISHED, 2),
                ("vu@gmail.com", 5, "Khung thép chắc chắn, ngả lưng 160 độ nằm xem phim cực sướng, lắp đặt chỉ mất khoảng 20 phút.", ModerationStatus.PUBLISHED, 1),
                ("duc.vo@nexa.vn", 2, "Giao hàng hơi trễ 1 tiếng do mưa lớn nhưng nhân viên hỗ trợ rất nhiệt tình.", ModerationStatus.REJECTED, 1),
            ],
        }

        for sku, rev_list in product_review_map.items():
            product = variants_by_sku[sku].product
            for email, stars, body, rev_status, days_ago in rev_list:
                u = users_by_email[email]
                verified_oi = delivered_order_items.get((email, product.slug))
                rev, rev_created = _save_or_get(
                    Review.objects,
                    force_overwrite,
                    user=u,
                    product=product,
                    defaults={
                        "order_item": verified_oi,
                        "stars": stars,
                        "body": body,
                        "status": rev_status,
                    },
                )
                if rev_created or force_overwrite:
                    rev_time = now - timedelta(days=days_ago, hours=2)
                    Review.objects.filter(pk=rev.pk).update(created_at=rev_time, updated_at=rev_time)

        # Q&A for ALL 24 Products (2 questions + answers per product)
        qa_templates_by_category = {
            "keyboard": [
                (
                    "Mẫu bàn phím {name} này có hỗ trợ hot-swap thay switch 5 pin không shop?",
                    [
                        ("lethanhvu005@gmail.com", "Chào bạn, sản phẩm {name} hỗ trợ đầy đủ tính năng kết nối ổn định và đi kèm phụ kiện chính hãng nguyên seal trong hộp nhé!"),
                        ("khoa.staff@nexa.vn", "Bên mình bảo hành chính hãng 24 tháng 1 đổi 1 và hỗ trợ kỹ thuật vệ sinh, cân chỉnh stabilizer miễn phí trọn đời ạ."),
                    ],
                ),
                (
                    "Bàn phím {name} dùng với macOS và Windows có chuyển đổi nhanh được không?",
                    [
                        ("khoa.staff@nexa.vn", "Hoàn toàn tương thích cả macOS lẫn Windows bạn nhé, bạn có thể chuyển layout phím tắt chỉ với một gạt công tắc hoặc tổ hợp phím Fn."),
                    ],
                ),
            ],
            "mouse": [
                (
                    "Chuột {name} trong hộp đã kèm sẵn đầu thu Wireless và dây sạc USB-C dù siêu mềm chưa ạ?",
                    [
                        ("lethanhvu005@gmail.com", "Dạ sản phẩm {name} chính hãng tại NEXA đi kèm đầy đủ receiver không dây, cáp sạc paracord chống rối và bộ phụ kiện tiêu chuẩn trong hộp ạ."),
                        ("khoa.staff@nexa.vn", "Nếu bạn cần dán sẵn feet PTFE hoặc grip tape khi giao hàng, bạn cứ ghi chú vào đơn hàng để kỹ thuật viên hỗ trợ nhé!"),
                    ],
                ),
                (
                    "Pin của chuột {name} dùng liên tục được khoảng bao lâu và bảo hành thế nào?",
                    [
                        ("khoa.staff@nexa.vn", "Thời lượng pin thực tế đạt từ 70 đến 95 giờ sử dụng liên tục tùy mức polling rate, và được bảo hành chính hãng 24 tháng tại hệ thống NEXA ạ."),
                    ],
                ),
            ],
            "headset": [
                (
                    "Tai nghe {name} kết nối không dây với PS5 và PC cùng lúc có bị trễ âm thanh không?",
                    [
                        ("lethanhvu005@gmail.com", "Với công nghệ kết nối không dây 2.4GHz độ trễ siêu thấp dưới 15ms, {name} đảm bảo âm thanh đồng bộ tức thì cho cả PC và PS5 bạn nhé!"),
                    ],
                ),
                (
                    "Đệm tai của {name} đeo lâu có bị bí nóng không và có phụ kiện thay thế không shop?",
                    [
                        ("khoa.staff@nexa.vn", "Đệm tai của {name} sử dụng mút hoạt tính bọc chất liệu thoáng khí cao cấp nên đeo nhiều giờ vẫn êm và mát tai, NEXA cũng luôn sẵn đệm tai thay thế chính hãng ạ."),
                    ],
                ),
            ],
            "monitor": [
                (
                    "Màn hình {name} có hỗ trợ ngàm gắn arm chuẩn VESA 100x100mm và kèm sẵn dây DisplayPort không?",
                    [
                        ("lethanhvu005@gmail.com", "Dạ màn hình {name} hỗ trợ chuẩn VESA 100x100mm tương thích mọi loại arm màn hình hiện nay, và trong thùng đã kèm sẵn cáp DisplayPort băng thông cao để lên tối đa tần số quét ạ."),
                    ],
                ),
                (
                    "Chính sách bảo hành điểm chết của màn hình {name} tại NEXA như thế nào ạ?",
                    [
                        ("khoa.staff@nexa.vn", "NEXA hỗ trợ kiểm tra điểm chết trực tiếp trước khi xuất kho và áp dụng bảo hành chính hãng 24 tháng tận nơi theo tiêu chuẩn nhà sản xuất bạn nhé!"),
                    ],
                ),
            ],
            "accessory": [
                (
                    "Sản phẩm {name} vệ sinh hằng ngày như thế nào để giữ bề mặt bền đẹp lâu dài?",
                    [
                        ("lethanhvu005@gmail.com", "Bạn chỉ cần dùng khăn microfiber ẩm lau nhẹ bề mặt {name} và để khô tự nhiên ở nơi thoáng mát, tuyệt đối không dùng hóa chất tẩy rửa mạnh nhé."),
                    ],
                ),
                (
                    "Kích thước của {name} có vừa với bàn làm việc dài 1m2 không shop?",
                    [
                        ("khoa.staff@nexa.vn", "Hoàn toàn vừa vặn và tôn dáng góc setup trên bàn 1m2 trở lên bạn nhé, mặt đế cao su chống trượt bám rất chắc trên cả mặt gỗ và mặt kính ạ."),
                    ],
                ),
            ],
            "chair": [
                (
                    "Ghế {name} có hỗ trợ giao lắp đặt tận nơi tại TP.HCM và Hà Nội không?",
                    [
                        ("lethanhvu005@gmail.com", "Dạ đội ngũ kỹ thuật NEXA hỗ trợ giao và lắp đặt hoàn chỉnh tận phòng miễn phí tại nội thành TP.HCM và Hà Nội trong vòng 2 giờ ạ!"),
                    ],
                ),
                (
                    "Chiều cao 1m75 nặng 78kg ngồi mẫu ghế {name} này có thoải mái không shop?",
                    [
                        ("khoa.staff@nexa.vn", "Rất vừa vặn bạn nhé! {name} sử dụng trụ thủy lực Class 4 chịu tải tới 130kg và phần tựa lưng, kê tay điều chỉnh linh hoạt theo vóc dáng người ngồi ạ."),
                    ],
                ),
            ],
        }

        customer_emails_cycle = [
            "lethanhvu2005@gmail.com",
            "vu@gmail.com",
            "minh.tran@nexa.vn",
            "huong.pham@nexa.vn",
            "anh.nguyen@nexa.vn",
            "linh.le@nexa.vn",
            "duc.vo@nexa.vn",
            "trang.hoang@nexa.vn",
        ]

        for p_idx, item in enumerate(PRODUCTS):
            name, short_name, _, category_code, _, _, _, sku, _, _, _, _ = item
            product = variants_by_sku[sku].product
            templates = qa_templates_by_category[category_code]
            for t_idx, (q_tpl, ans_list) in enumerate(templates):
                asker = users_by_email[customer_emails_cycle[(p_idx + t_idx) % len(customer_emails_cycle)]]
                q_body = q_tpl.format(name=short_name)
                question, _ = _save_or_get(
                    ProductQuestion.objects,
                    force_overwrite,
                    product=product,
                    user=asker,
                    body=q_body,
                    defaults={"status": ModerationStatus.PUBLISHED},
                )
                for ans_email, a_tpl in ans_list:
                    a_body = a_tpl.format(name=short_name)
                    _save_or_get(
                        ProductAnswer.objects,
                        force_overwrite,
                        question=question,
                        user=users_by_email[ans_email],
                        body=a_body,
                        defaults={"status": ModerationStatus.PUBLISHED},
                    )

        # Also add 3 pending questions for Admin Support moderation queue
        pending_questions = [
            ("NEXA-X75", "duc.vo@nexa.vn", "Shop còn sẵn bản switch Tactile Brown cho mẫu NEXA X75 tại chi nhánh Quận 1 không ạ?"),
            ("ASUS-XG27", "trang.hoang@nexa.vn", "Mua màn hình ROG Strix XG27AQMR kèm arm màn hình có được áp dụng chồng mã SETUP500K không?"),
            ("RAZER-VV3P", "linh.le@nexa.vn", "Chuột Viper V3 Pro màu trắng bao giờ về thêm hàng tại kho Hà Nội vậy shop?"),
        ]
        for sku, ask_email, q_body in pending_questions:
            _save_or_get(
                ProductQuestion.objects,
                force_overwrite,
                product=variants_by_sku[sku].product,
                user=users_by_email[ask_email],
                body=q_body,
                defaults={"status": ModerationStatus.PENDING},
            )

        # 9. Wishlists (rich favorites for every user account)
        wishlist_specs = [
            ("lethanhvu005@gmail.com", ["RAZER-HV3", "ASUS-XG27", "KEY-Q1PRO", "RAZER-VV3P", "LOGI-GPX2-HS", "COR-TC100"]),
            ("lethanhvu2005@gmail.com", ["NEXA-X75", "LOGI-GPX2-HS", "NEXA-V27", "RAZER-ATLAS", "NEXA-CHAIR"]),
            ("vu@gmail.com", ["NEXA-S98", "COR-TC100", "RAZER-ATLAS", "LOGI-GPX2", "ASUS-VG27AQ"]),
            ("minh.tran@nexa.vn", ["NEXA-PULSE8K", "NEXA-OPT24", "KEY-Q1PRO"]),
            ("huong.pham@nexa.vn", ["NEXA-CHAIR", "HYX-CLOUD3", "LOGI-G502"]),
            ("anh.nguyen@nexa.vn", ["RAZER-VV3P", "COR-M75", "NEXA-MAT"]),
        ]
        for email, skus in wishlist_specs:
            u = users_by_email[email]
            for sku in skus:
                Wishlist.objects.get_or_create(
                    user=u,
                    product=variants_by_sku[sku].product,
                )

        # 10. Operations: AuditLogs & OutboxEvents (12+ entries each)
        audit_specs = [
            ("order.status_updated", "Order", "NX-20261101-001", {"from": "shipped", "to": "delivered", "verified_by": "lethanhvu005@gmail.com"}),
            ("order.status_updated", "Order", "NX-20261103-002", {"from": "shipped", "to": "delivered", "verified_by": "lethanhvu005@gmail.com"}),
            ("order.status_updated", "Order", "NX-20261109-004", {"from": "packing", "to": "shipped", "carrier": "NEXA Express"}),
            ("inventory.stock_received", "ProductVariant", "NEXA-X75", {"added": 45, "warehouse": "HCM-Hub-01"}),
            ("inventory.stock_received", "ProductVariant", "LOGI-GPX2", {"added": 30, "warehouse": "HCM-Hub-01"}),
            ("inventory.low_stock_alert", "ProductVariant", "ASUS-XG27", {"available": 7, "threshold": 10}),
            ("inventory.low_stock_alert", "ProductVariant", "RAZER-ATLAS", {"available": 6, "threshold": 10}),
            ("voucher.published", "Voucher", "NEXA200K", {"value": 200000, "min_subtotal": 2000000}),
            ("voucher.published", "Voucher", "SETUP500K", {"value": 500000, "min_subtotal": 8000000}),
            ("catalog.price_updated", "ProductVariant", "LOGI-GPX2", {"old_price": 3590000, "new_price": 2890000}),
            ("community.review_moderated", "Review", "NEXA-X75", {"status": "published", "moderator": "lethanhvu005@gmail.com"}),
            ("community.question_answered", "ProductQuestion", "LOGI-GPX2", {"answered_by": "khoa.staff@nexa.vn"}),
        ]
        for idx, (action, entity_type, entity_id, changes) in enumerate(audit_specs):
            al, al_created = _save_or_get(
                AuditLog.objects,
                force_overwrite,
                request_id=deterministic_uuid(f"audit-{action}-{entity_id}-{idx}"),
                defaults={
                    "actor": staff_actor,
                    "action": action,
                    "entity_type": entity_type,
                    "entity_id": entity_id,
                    "changes": changes,
                },
            )
            if al_created or force_overwrite:
                AuditLog.objects.filter(pk=al.pk).update(created_at=now - timedelta(hours=idx * 6))

        outbox_specs = [
            ("order.created", "NX-20261101-001", OutboxEvent.Status.SENT, {"order_number": "NX-20261101-001", "grand_total": 5770000}),
            ("payment.succeeded", "NX-20261101-001", OutboxEvent.Status.SENT, {"order_number": "NX-20261101-001", "provider": "vnpay"}),
            ("order.delivered", "NX-20261101-001", OutboxEvent.Status.SENT, {"order_number": "NX-20261101-001", "customer": "lethanhvu005@gmail.com"}),
            ("order.created", "NX-20261103-002", OutboxEvent.Status.SENT, {"order_number": "NX-20261103-002", "grand_total": 14220000}),
            ("payment.succeeded", "NX-20261103-002", OutboxEvent.Status.SENT, {"order_number": "NX-20261103-002", "provider": "momo"}),
            ("order.delivered", "NX-20261103-002", OutboxEvent.Status.SENT, {"order_number": "NX-20261103-002", "customer": "lethanhvu005@gmail.com"}),
            ("order.shipped", "NX-20261109-004", OutboxEvent.Status.SENT, {"order_number": "NX-20261109-004", "tracking": "VNX-990412"}),
            ("order.created", "NX-20261114-007", OutboxEvent.Status.PENDING, {"order_number": "NX-20261114-007", "grand_total": 8680000}),
            ("order.created", "NX-20261114-013", OutboxEvent.Status.PENDING, {"order_number": "NX-20261114-013", "grand_total": 4740000}),
            ("inventory.low_stock", "ASUS-XG27", OutboxEvent.Status.PENDING, {"sku": "ASUS-XG27", "available": 7}),
            ("inventory.low_stock", "KEY-Q1PRO", OutboxEvent.Status.PENDING, {"sku": "KEY-Q1PRO", "available": 8}),
            ("inventory.low_stock", "RAZER-ATLAS", OutboxEvent.Status.PENDING, {"sku": "RAZER-ATLAS", "available": 6}),
        ]
        for idx, (topic, agg_id, ob_status, payload) in enumerate(outbox_specs):
            ob, ob_created = _save_or_get(
                OutboxEvent.objects,
                force_overwrite,
                event_key=deterministic_uuid(f"outbox-{topic}-{agg_id}"),
                defaults={
                    "topic": topic,
                    "aggregate_id": agg_id,
                    "payload": payload,
                    "status": ob_status,
                    "attempts": 1 if ob_status == OutboxEvent.Status.SENT else 0,
                    "processed_at": now - timedelta(hours=idx * 4) if ob_status == OutboxEvent.Status.SENT else None,
                },
            )
            if ob_created or force_overwrite:
                OutboxEvent.objects.filter(pk=ob.pk).update(created_at=now - timedelta(hours=idx * 5))

        # 11. Django Admin LogEntry
        product_ct = ContentType.objects.get_for_model(Product)
        order_ct = ContentType.objects.get_for_model(Order)
        if not LogEntry.objects.exists():
            first_product = seeded_products[0]
            LogEntry.objects.create(
                user=staff_actor,
                content_type=product_ct,
                object_id=str(first_product.pk),
                object_repr=str(first_product),
                action_flag=CHANGE,
                change_message="Cập nhật thông số kỹ thuật và tồn kho chuẩn thương mại điện tử.",
            )
            first_order = Order.objects.first()
            if first_order:
                LogEntry.objects.create(
                    user=staff_actor,
                    content_type=order_ct,
                    object_id=str(first_order.pk),
                    object_repr=str(first_order),
                    action_flag=ADDITION,
                    change_message="Khởi tạo và xác nhận đơn hàng mẫu trên hệ thống.",
                )

        self.stdout.write(self.style.SUCCESS(
            "Đã nạp đầy đủ dữ liệu mẫu (Đơn hàng, Đánh giá, Hỏi đáp, Tồn kho, Khuyến mãi...) cho TẤT CẢ các bảng và sản phẩm trong PostgreSQL thành công!"
        ))
