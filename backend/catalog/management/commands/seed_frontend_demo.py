from datetime import timedelta
from decimal import Decimal
import hashlib
import uuid

from django.contrib.admin.models import ADDITION, CHANGE, LogEntry
from django.contrib.auth.models import Group, Permission
from django.contrib.contenttypes.models import ContentType
from django.core.management.base import BaseCommand
from django.db import transaction
from django.db.models import Sum
from django.utils import timezone
from django.utils.text import slugify
from rest_framework.authtoken.models import Token

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


class Command(BaseCommand):
    help = "Nạp dữ liệu mẫu đầy đủ cho tất cả các bảng trong database. Có thể chạy lại an toàn (idempotent)."

    @transaction.atomic
    def handle(self, *args, **options):
        now = timezone.now()

        # 1. Categories & Brands
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

        # 2. Products, Variants, InventoryBalances, Features, Images
        seeded_products = []
        variants_by_sku = {}
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

            variant, _ = ProductVariant.objects.update_or_create(
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

            InventoryBalance.objects.update_or_create(
                variant=variant,
                defaults={"on_hand": max(stock, 20), "reserved": 0, "low_stock_threshold": 5},
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

        # 3. Collections & Banners
        all_collection, _ = Collection.objects.update_or_create(
            slug="gaming-gear",
            defaults={"name": "Gaming Gear Tuyển Chọn", "is_active": True, "sort_order": 1},
        )
        nexa_collection, _ = Collection.objects.update_or_create(
            slug="nexa-select",
            defaults={"name": "NEXA Studio Signature", "is_active": True, "sort_order": 2},
        )
        esports_collection, _ = Collection.objects.update_or_create(
            slug="esports-pro",
            defaults={"name": "Chuẩn Thi Đấu eSports", "is_active": True, "sort_order": 3},
        )
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
            HomeBanner.objects.update_or_create(
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
        std_ship, _ = ShippingMethod.objects.update_or_create(
            code="standard",
            defaults={"name": "Giao tiêu chuẩn", "base_fee": 30000, "free_threshold": 1000000, "min_days": 2, "max_days": 4, "is_active": True},
        )
        exp_ship, _ = ShippingMethod.objects.update_or_create(
            code="express",
            defaults={"name": "Giao hỏa tốc", "base_fee": 50000, "free_threshold": None, "min_days": 1, "max_days": 2, "is_active": True},
        )

        voucher_defs = [
            ("NEXA10", Voucher.Kind.PERCENT, 10, 100000, 500000, 500, 10),
            ("NEXA5", Voucher.Kind.PERCENT, 5, 50000, 0, 1000, 10),
            ("FREESHIP", Voucher.Kind.FREE_SHIP, 0, None, 300000, 1000, 10),
            ("NEXA200K", Voucher.Kind.FIXED, 200000, None, 2000000, 200, 5),
            ("GAMING50K", Voucher.Kind.FIXED, 50000, None, 500000, 500, 5),
        ]
        vouchers_by_code = {}
        for code, kind, value, max_discount, min_subtotal, usage_limit, per_user_limit in voucher_defs:
            v, _ = Voucher.objects.update_or_create(
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

        # 5. Auth Groups, Users, Tokens, and Addresses
        admin_group, _ = Group.objects.get_or_create(name="Quản trị viên hệ thống")
        ops_group, _ = Group.objects.get_or_create(name="Nhân viên vận hành & kho")
        cs_group, _ = Group.objects.get_or_create(name="Chăm sóc khách hàng")
        all_perms = list(Permission.objects.all()[:20])
        if all_perms:
            admin_group.permissions.set(all_perms)
            ops_group.permissions.set(all_perms[:10])
            cs_group.permissions.set(all_perms[10:20])

        user_specs = [
            ("lethanhvu005@gmail.com", "Vũ", "Lê Thành", "0901234567", True, True),
            ("lethanhvu2005@gmail.com", "Thành", "Lê", "0912345678", False, False),
            ("vu@gmail.com", "Vũ", "Nguyễn", "0987654321", False, False),
            ("minh.tran@nexa.vn", "Minh", "Trần Quốc", "0938112233", False, False),
            ("huong.pham@nexa.vn", "Hương", "Phạm Thu", "0977445566", False, False),
            ("khoa.staff@nexa.vn", "Khoa", "Đặng Đăng", "0966889900", True, False),
        ]
        users_by_email = {}
        for email, first_name, last_name, phone, is_staff, is_superuser in user_specs:
            user, created = User.objects.get_or_create(
                email=email,
                defaults={
                    "first_name": first_name,
                    "last_name": last_name,
                    "phone": phone,
                    "is_staff": is_staff,
                    "is_superuser": is_superuser,
                    "is_active": True,
                    "email_verified_at": now - timedelta(days=20),
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
            if not user.email_verified_at:
                user.email_verified_at = now - timedelta(days=20)
                updated_fields.append("email_verified_at")
            if created:
                user.set_password("Nexa@12345")
                updated_fields.append("password")
            if updated_fields:
                user.save(update_fields=updated_fields)

            if user.is_superuser:
                user.groups.add(admin_group, ops_group)
            elif user.is_staff:
                user.groups.add(ops_group, cs_group)
            else:
                user.groups.add(cs_group)

            Token.objects.get_or_create(user=user)
            users_by_email[email] = user

        address_specs = [
            ("lethanhvu005@gmail.com", "Lê Thành Vũ", "0901234567", "128 Nguyễn Cơ Thạch, Khu đô thị Sala", "Phường An Lợi Đông", "TP. Hồ Chí Minh", True),
            ("lethanhvu005@gmail.com", "Lê Thành Vũ (Văn phòng)", "0901234567", "Tòa nhà Bitexco, 2 Hải Triều", "Phường Bến Nghé", "TP. Hồ Chí Minh", False),
            ("lethanhvu2005@gmail.com", "Lê Thành", "0912345678", "456 Lê Văn Việt, Khu Công Nghệ Cao", "Phường Tăng Nhơn Phú A", "TP. Hồ Chí Minh", True),
            ("vu@gmail.com", "Nguyễn Vũ", "0987654321", "88 Láng Hạ, Tòa nhà Sky City", "Phường Láng Hạ", "Hà Nội", True),
            ("minh.tran@nexa.vn", "Trần Quốc Minh", "0938112233", "215 Nguyễn Văn Linh", "Phường Thạc Gián", "Đà Nẵng", True),
            ("huong.pham@nexa.vn", "Phạm Thu Hương", "0977445566", "19 Đại lộ Hòa Bình", "Phường Tân An", "Cần Thơ", True),
            ("khoa.staff@nexa.vn", "Đặng Đăng Khoa", "0966889900", "35 Nguyễn Huệ", "Phường Bến Nghé", "TP. Hồ Chí Minh", True),
        ]
        default_address_by_email = {}
        for email, recipient, phone, line, ward, province, is_default in address_specs:
            u = users_by_email[email]
            if is_default:
                existing_default = Address.objects.filter(user=u, is_default=True).first()
                if existing_default:
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
                Address.objects.update_or_create(
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

        # 6. Active Carts & Guest Cart
        active_cart_specs = [
            ("lethanhvu005@gmail.com", "NEXA10", [("NEXA-X75", 1), ("NEXA-MAT", 2)]),
            ("lethanhvu2005@gmail.com", "FREESHIP", [("LOGI-GPX2", 1), ("RAZER-BSV2", 1)]),
            ("vu@gmail.com", None, [("KEY-K2", 1)]),
            ("minh.tran@nexa.vn", "GAMING50K", [("RAZER-VV3P", 1), ("RAZER-ATLAS", 1)]),
        ]
        for email, voucher_code, items in active_cart_specs:
            u = users_by_email[email]
            cart, _ = Cart.objects.get_or_create(
                user=u,
                status=Cart.Status.ACTIVE,
                defaults={
                    "voucher": vouchers_by_code.get(voucher_code) if voucher_code else None,
                    "expires_at": now + timedelta(days=30),
                },
            )
            if voucher_code and not cart.voucher_id:
                cart.voucher = vouchers_by_code.get(voucher_code)
                cart.save(update_fields=["voucher"])
            for sku, qty in items:
                CartItem.objects.update_or_create(
                    cart=cart,
                    variant=variants_by_sku[sku],
                    defaults={"quantity": qty},
                )

        guest_hash = deterministic_sha256("guest-demo-cart-1")
        guest_cart, _ = Cart.objects.update_or_create(
            guest_token_hash=guest_hash,
            defaults={
                "user": None,
                "status": Cart.Status.ACTIVE,
                "expires_at": now + timedelta(days=14),
                "voucher": vouchers_by_code["NEXA5"],
            },
        )
        CartItem.objects.update_or_create(
            cart=guest_cart,
            variant=variants_by_sku["NEXA-S98"],
            defaults={"quantity": 1},
        )

        # 7. Orders, OrderAddresses, OrderItems, OrderStatusHistory, Payments, VoucherRedemptions, InventoryReservations, InventoryMovements
        order_specs = [
            {
                "order_number": "NX-20261101-001",
                "email": "lethanhvu005@gmail.com",
                "status": OrderStatus.DELIVERED,
                "shipping": std_ship,
                "voucher_code": "NEXA10",
                "items": [("NEXA-X75", 1), ("LOGI-GPX2", 1)],
                "payment_provider": Payment.Provider.VNPAY,
                "payment_status": Payment.Status.SUCCEEDED,
                "note": "Giao giờ hành chính tại sảnh tòa nhà.",
                "days_ago": 10,
            },
            {
                "order_number": "NX-20261105-002",
                "email": "lethanhvu005@gmail.com",
                "status": OrderStatus.SHIPPED,
                "shipping": exp_ship,
                "voucher_code": "NEXA200K",
                "items": [("ASUS-VG27AQ", 1), ("NEXA-MAT", 1)],
                "payment_provider": Payment.Provider.MOMO,
                "payment_status": Payment.Status.SUCCEEDED,
                "note": "Gọi trước khi giao 15 phút.",
                "days_ago": 4,
            },
            {
                "order_number": "NX-20261110-003",
                "email": "lethanhvu005@gmail.com",
                "status": OrderStatus.PACKING,
                "shipping": std_ship,
                "voucher_code": "GAMING50K",
                "items": [("RAZER-HV3", 1)],
                "payment_provider": Payment.Provider.COD,
                "payment_status": Payment.Status.PENDING,
                "note": "Đóng gói chống sốc kỹ giúp mình.",
                "days_ago": 1,
            },
            {
                "order_number": "NX-20261102-004",
                "email": "lethanhvu2005@gmail.com",
                "status": OrderStatus.DELIVERED,
                "shipping": std_ship,
                "voucher_code": "NEXA5",
                "items": [("KEY-K2", 1), ("HYX-CLOUD3", 1)],
                "payment_provider": Payment.Provider.VNPAY,
                "payment_status": Payment.Status.SUCCEEDED,
                "note": "Giao buổi chiều sau 14h.",
                "days_ago": 8,
            },
            {
                "order_number": "NX-20261112-005",
                "email": "lethanhvu2005@gmail.com",
                "status": OrderStatus.PENDING,
                "shipping": exp_ship,
                "voucher_code": None,
                "items": [("RAZER-VV3P", 1)],
                "payment_provider": Payment.Provider.COD,
                "payment_status": Payment.Status.PENDING,
                "note": "Kiểm tra hàng nguyên seal khi nhận.",
                "days_ago": 0,
            },
            {
                "order_number": "NX-20261103-006",
                "email": "vu@gmail.com",
                "status": OrderStatus.DELIVERED,
                "shipping": std_ship,
                "voucher_code": "FREESHIP",
                "items": [("LOGI-G502", 1), ("NEXA-AURA71", 1)],
                "payment_provider": Payment.Provider.COD,
                "payment_status": Payment.Status.SUCCEEDED,
                "note": "Để ở quầy lễ tân nếu không nghe máy.",
                "days_ago": 7,
            },
            {
                "order_number": "NX-20261108-007",
                "email": "vu@gmail.com",
                "status": OrderStatus.CANCELLED,
                "shipping": std_ship,
                "voucher_code": None,
                "items": [("COR-K70", 1)],
                "payment_provider": Payment.Provider.VNPAY,
                "payment_status": Payment.Status.CANCELLED,
                "note": "Đổi sang mẫu TKL nhỏ gọn hơn.",
                "days_ago": 3,
            },
            {
                "order_number": "NX-20261109-008",
                "email": "minh.tran@nexa.vn",
                "status": OrderStatus.CONFIRMED,
                "shipping": exp_ship,
                "voucher_code": "NEXA10",
                "items": [("KEY-Q1PRO", 1), ("RAZER-ATLAS", 1)],
                "payment_provider": Payment.Provider.MOMO,
                "payment_status": Payment.Status.SUCCEEDED,
                "note": "Xuất hóa đơn VAT công ty.",
                "days_ago": 2,
            },
            {
                "order_number": "NX-20261104-009",
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
        ]

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

            for sku, qty in spec["items"]:
                CartItem.objects.update_or_create(
                    cart=source_cart,
                    variant=variants_by_sku[sku],
                    defaults={"quantity": qty},
                )

            order, _ = Order.objects.update_or_create(
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

            OrderAddress.objects.update_or_create(
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
                oi, _ = OrderItem.objects.update_or_create(
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
                if spec["status"] == OrderStatus.DELIVERED:
                    delivered_order_items[(user.email, variant.product.slug)] = oi

                # InventoryReservation for every order item
                if spec["status"] in [OrderStatus.PENDING, OrderStatus.CONFIRMED, OrderStatus.PACKING]:
                    res_status = InventoryReservation.Status.ACTIVE
                    closed_at = None
                elif spec["status"] in [OrderStatus.SHIPPED, OrderStatus.DELIVERED]:
                    res_status = InventoryReservation.Status.CONSUMED
                    closed_at = now - timedelta(hours=2)
                elif spec["status"] == OrderStatus.CANCELLED:
                    res_status = InventoryReservation.Status.RELEASED
                    closed_at = now - timedelta(hours=2)
                else:
                    res_status = InventoryReservation.Status.EXPIRED
                    closed_at = now - timedelta(hours=2)

                InventoryReservation.objects.update_or_create(
                    order=order,
                    variant=variant,
                    defaults={
                        "quantity": qty,
                        "status": res_status,
                        "expires_at": now + timedelta(days=7),
                        "closed_at": closed_at,
                    },
                )

                # InventoryMovement (sale for shipped/delivered)
                if spec["status"] in [OrderStatus.SHIPPED, OrderStatus.DELIVERED]:
                    InventoryMovement.objects.update_or_create(
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

                for from_st, to_st, actor_user, reason_text in transitions:
                    OrderStatusHistory.objects.create(
                        order=order,
                        from_status=from_st,
                        to_status=to_st,
                        actor=actor_user,
                        reason=reason_text,
                    )

            # VoucherRedemption
            if voucher:
                red_status = (
                    VoucherRedemption.Status.USED
                    if spec["status"] in [OrderStatus.CONFIRMED, OrderStatus.PACKING, OrderStatus.SHIPPED, OrderStatus.DELIVERED]
                    else VoucherRedemption.Status.RESERVED
                )
                VoucherRedemption.objects.update_or_create(
                    order=order,
                    defaults={
                        "voucher": voucher,
                        "user": user,
                        "status": red_status,
                        "discount_amount": discount_total + shipping_discount,
                    },
                )

            # Payment
            paid_at_val = (now - timedelta(days=spec["days_ago"])) if spec["payment_status"] in [Payment.Status.SUCCEEDED, Payment.Status.REFUNDED] else None
            Payment.objects.update_or_create(
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

        # Sync InventoryBalance.reserved with active reservations and add receipt/adjustment movements
        for sku, variant in variants_by_sku.items():
            active_res = (
                InventoryReservation.objects.filter(variant=variant, status=InventoryReservation.Status.ACTIVE)
                .aggregate(total=Sum("quantity"))["total"]
                or 0
            )
            balance = InventoryBalance.objects.get(variant=variant)
            balance.reserved = active_res
            if balance.on_hand < active_res + 10:
                balance.on_hand = active_res + 25
            balance.save(update_fields=["on_hand", "reserved", "updated_at"])

            InventoryMovement.objects.update_or_create(
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

        # 8. Community: Reviews, ProductQuestions, ProductAnswers
        review_specs = [
            ("lethanhvu005@gmail.com", "NEXA-X75", 5, "Bàn phím gõ cực kỳ đầm tay, stabilizer được cân chỉnh sẵn rất mượt và LED RGB sáng đều đẹp mắt.", ModerationStatus.PUBLISHED),
            ("lethanhvu005@gmail.com", "LOGI-GPX2", 5, "Chuột nhẹ đến bất ngờ, di tâm trong Valorant và CS2 cực kỳ chuẩn xác, pin dùng cả tuần chưa hết.", ModerationStatus.PUBLISHED),
            ("lethanhvu2005@gmail.com", "KEY-K2", 5, "Kết nối Bluetooth với MacBook và PC chuyển đổi rất nhanh, build chắc chắn, gõ code cả ngày không mỏi.", ModerationStatus.PUBLISHED),
            ("lethanhvu2005@gmail.com", "HYX-CLOUD3", 4, "Đệm tai siêu êm, đeo 5 tiếng liên tục không bị nóng tai, âm thanh định vị tiếng bước chân rất rõ.", ModerationStatus.PUBLISHED),
            ("vu@gmail.com", "LOGI-G502", 5, "Con lăn vô cực huyền thoại kết hợp switch quang học mới bấm rất nảy, nhiều nút phụ tiện cho cả làm việc.", ModerationStatus.PUBLISHED),
            ("vu@gmail.com", "NEXA-AURA71", 4, "Trong tầm giá hơn 2 triệu thì chiếc tai nghe không dây này quá đáng tiền, mic lọc ồn tốt khi họp nhóm.", ModerationStatus.PUBLISHED),
            ("minh.tran@nexa.vn", "ASUS-VG27AQ", 5, "Màn hình 2K 165Hz màu sắc tươi, không bị hở sáng, đóng gói giao hàng cực kỳ cẩn thận.", ModerationStatus.PUBLISHED),
            ("huong.pham@nexa.vn", "NEXA-S98", 5, "Layout 98 phím có cụm phím số rất tiện nhập liệu mà vẫn gọn bàn làm việc, âm gõ trầm ấm.", ModerationStatus.PENDING),
        ]
        for email, sku, stars, body, rev_status in review_specs:
            u = users_by_email[email]
            product = variants_by_sku[sku].product
            verified_oi = delivered_order_items.get((email, product.slug))
            Review.objects.update_or_create(
                user=u,
                product=product,
                defaults={
                    "order_item": verified_oi,
                    "stars": stars,
                    "body": body,
                    "status": rev_status,
                },
            )

        qa_specs = [
            (
                "NEXA-X75",
                "lethanhvu2005@gmail.com",
                "Mẫu bàn phím NEXA X75 này có hỗ trợ thay switch 5 pin không shop?",
                ModerationStatus.PUBLISHED,
                [
                    ("lethanhvu005@gmail.com", "Chào bạn, mạch của NEXA X75 hỗ trợ hot-swap 5 pin toàn bộ phím và tương thích hầu hết switch cơ hiện nay nhé!", ModerationStatus.PUBLISHED),
                    ("khoa.staff@nexa.vn", "Trong hộp sản phẩm cũng tặng kèm sẵn keycap/switch puller để bạn thay thế dễ dàng ạ.", ModerationStatus.PUBLISHED),
                ],
            ),
            (
                "LOGI-GPX2",
                "vu@gmail.com",
                "Chuột Logitech G Pro X Superlight 2 có kèm đầu thu Lightspeed USB-C trong hộp không?",
                ModerationStatus.PUBLISHED,
                [
                    ("lethanhvu005@gmail.com", "Dạ có đầy đủ receiver Lightspeed, dây sạc USB-C dù siêu mềm và bộ grip tape chính hãng đi kèm trong hộp ạ.", ModerationStatus.PUBLISHED),
                ],
            ),
            (
                "ASUS-VG27AQ",
                "minh.tran@nexa.vn",
                "Màn hình này gắn arm chuẩn VESA 100x100mm được không ạ?",
                ModerationStatus.PUBLISHED,
                [
                    ("khoa.staff@nexa.vn", "Hoàn toàn tương thích chuẩn VESA 100x100mm bạn nhé, tháo chân đế rất nhanh chỉ với 4 ốc.", ModerationStatus.PUBLISHED),
                ],
            ),
        ]
        for sku, ask_email, q_body, q_status, answers in qa_specs:
            product = variants_by_sku[sku].product
            ask_user = users_by_email[ask_email]
            question, _ = ProductQuestion.objects.get_or_create(
                product=product,
                user=ask_user,
                body=q_body,
                defaults={"status": q_status},
            )
            for ans_email, a_body, a_status in answers:
                ProductAnswer.objects.get_or_create(
                    question=question,
                    user=users_by_email[ans_email],
                    body=a_body,
                    defaults={"status": a_status},
                )

        # 9. Wishlists
        wishlist_specs = [
            ("lethanhvu005@gmail.com", ["RAZER-HV3", "ASUS-XG27", "KEY-Q1PRO", "RAZER-VV3P"]),
            ("lethanhvu2005@gmail.com", ["NEXA-X75", "LOGI-GPX2-HS", "NEXA-V27"]),
            ("vu@gmail.com", ["NEXA-S98", "COR-TC100", "RAZER-ATLAS"]),
            ("minh.tran@nexa.vn", ["NEXA-PULSE8K", "NEXA-OPT24"]),
        ]
        for email, skus in wishlist_specs:
            u = users_by_email[email]
            for sku in skus:
                Wishlist.objects.get_or_create(
                    user=u,
                    product=variants_by_sku[sku].product,
                )

        # 10. Operations: AuditLogs & OutboxEvents
        audit_specs = [
            ("order.status_updated", "Order", "NX-20261101-001", {"from": "shipped", "to": "delivered", "verified_by": "lethanhvu005@gmail.com"}),
            ("inventory.stock_received", "ProductVariant", "NEXA-X75", {"added": 45, "warehouse": "HCM-Hub-01"}),
            ("voucher.published", "Voucher", "NEXA200K", {"value": 200000, "min_subtotal": 2000000}),
            ("catalog.price_updated", "ProductVariant", "LOGI-GPX2", {"old_price": 3590000, "new_price": 2890000}),
            ("community.review_moderated", "Review", "NEXA-X75", {"status": "published", "moderator": "lethanhvu005@gmail.com"}),
        ]
        for action, entity_type, entity_id, changes in audit_specs:
            AuditLog.objects.update_or_create(
                request_id=deterministic_uuid(f"audit-{action}-{entity_id}"),
                defaults={
                    "actor": staff_actor,
                    "action": action,
                    "entity_type": entity_type,
                    "entity_id": entity_id,
                    "changes": changes,
                },
            )

        outbox_specs = [
            ("order.created", "NX-20261101-001", OutboxEvent.Status.SENT, {"order_number": "NX-20261101-001", "grand_total": 5280000}),
            ("payment.succeeded", "NX-20261101-001", OutboxEvent.Status.SENT, {"order_number": "NX-20261101-001", "provider": "vnpay"}),
            ("order.delivered", "NX-20261101-001", OutboxEvent.Status.SENT, {"order_number": "NX-20261101-001", "customer": "lethanhvu005@gmail.com"}),
            ("order.created", "NX-20261112-005", OutboxEvent.Status.PENDING, {"order_number": "NX-20261112-005", "grand_total": 3940000}),
            ("inventory.low_stock", "ASUS-XG27", OutboxEvent.Status.PENDING, {"sku": "ASUS-XG27", "available": 12}),
        ]
        for topic, agg_id, ob_status, payload in outbox_specs:
            OutboxEvent.objects.update_or_create(
                event_key=deterministic_uuid(f"outbox-{topic}-{agg_id}"),
                defaults={
                    "topic": topic,
                    "aggregate_id": agg_id,
                    "payload": payload,
                    "status": ob_status,
                    "attempts": 1 if ob_status == OutboxEvent.Status.SENT else 0,
                    "processed_at": now if ob_status == OutboxEvent.Status.SENT else None,
                },
            )

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
            "Đã nạp đầy đủ dữ liệu mẫu cho TẤT CẢ các bảng trong PostgreSQL thành công!"
        ))
