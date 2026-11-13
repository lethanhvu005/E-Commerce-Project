import hashlib
import json
import logging
import uuid
from datetime import timedelta
from decimal import Decimal

from django.db import transaction
from django.utils import timezone
from rest_framework.exceptions import ValidationError

from accounts.models import Address
from carts.models import Cart
from carts.services import cart_totals, compute_discount, get_voucher_error
from catalog.models import Product
from inventory.models import InventoryBalance, InventoryReservation
from operations.models import OutboxEvent
from payments.models import Payment
from promotions.models import Voucher, VoucherRedemption

from .models import Order, OrderAddress, OrderItem, OrderStatus, OrderStatusHistory, ShippingMethod

logger = logging.getLogger(__name__)


def shipping_method_for(data):
    filters = {"is_active": True}
    if data.get("shipping_method_id"):
        filters["id"] = data["shipping_method_id"]
    else:
        filters["code"] = data["ship_method"]
    try:
        return ShippingMethod.objects.get(**filters)
    except ShippingMethod.DoesNotExist:
        raise ValidationError({"shipping_method_id": ["Phương thức giao hàng không hợp lệ."]})


def validate_cart_items_sellable(items):
    for item in items:
        variant = item.variant
        product = variant.product
        if (
            not variant.is_active
            or product.status != Product.Status.ACTIVE
            or not product.category.is_active
            or not product.brand.is_active
        ):
            raise ValidationError(
                {"cart": [f"Sản phẩm {product.name} ({variant.sku}) hiện không còn kinh doanh."]}
            )


def validate_and_lock_voucher(voucher_id, user, subtotal):
    try:
        voucher = Voucher.objects.select_for_update().get(pk=voucher_id)
    except Voucher.DoesNotExist:
        raise ValidationError({"voucher": ["Voucher không tồn tại."]})
    voucher_error = get_voucher_error(voucher, user.id if user else None, subtotal)
    if voucher_error:
        raise ValidationError({"voucher": [voucher_error]})
    return voucher


@transaction.atomic
def release_expired_reservations(now=None, variant_ids=None):
    now = now or timezone.now()
    filters = {
        "status": InventoryReservation.Status.ACTIVE,
        "expires_at__lte": now,
    }
    if variant_ids is not None:
        filters["variant_id__in"] = list(variant_ids)
    due_order_ids = list(
        InventoryReservation.objects.filter(**filters)
        .values_list("order_id", flat=True)
        .distinct()
        .order_by("order_id")
    )
    if not due_order_ids:
        return 0

    expired_count = 0
    for order_id in due_order_ids:
        order = Order.objects.select_for_update().get(pk=order_id)
        due_reservations = list(
            order.reservations.select_for_update()
            .filter(status=InventoryReservation.Status.ACTIVE, expires_at__lte=now)
            .order_by("variant_id")
        )
        if not due_reservations:
            continue
        for reservation in due_reservations:
            balance = InventoryBalance.objects.select_for_update().get(variant_id=reservation.variant_id)
            if balance.reserved < reservation.quantity:
                logger.warning(
                    "Inventory reserved underflow prevented on expiry for variant_id=%s (reserved=%s, release=%s)",
                    reservation.variant_id,
                    balance.reserved,
                    reservation.quantity,
                )
            balance.reserved = max(0, balance.reserved - reservation.quantity)
            balance.save(update_fields=["reserved", "updated_at"])
            reservation.status = InventoryReservation.Status.EXPIRED
            reservation.closed_at = now
            reservation.save(update_fields=["status", "closed_at"])
            expired_count += 1

        if (
            order.status == OrderStatus.PENDING
            and not order.reservations.filter(status=InventoryReservation.Status.ACTIVE).exists()
        ):
            if hasattr(order, "voucher_redemption"):
                order.voucher_redemption.status = VoucherRedemption.Status.RELEASED
                order.voucher_redemption.save(update_fields=["status", "updated_at"])
            order.payments.filter(status=Payment.Status.PENDING).update(status=Payment.Status.CANCELLED)
            order.status = OrderStatus.EXPIRED
            order.save(update_fields=["status", "updated_at"])
            OrderStatusHistory.objects.create(
                order=order,
                from_status=OrderStatus.PENDING,
                to_status=OrderStatus.EXPIRED,
                actor=None,
                reason="Đơn hàng hết hạn giữ chỗ tồn kho",
            )
    return expired_count


def checkout_values(user, data, lock=False):
    address = Address.objects.filter(id=data["address_id"], user=user).first()
    if not address:
        raise ValidationError({"address_id": ["Địa chỉ không thuộc tài khoản hiện tại."]})
    shipping = shipping_method_for(data)
    carts = Cart.objects.filter(user=user, status=Cart.Status.ACTIVE)
    if lock:
        carts = carts.select_for_update()
    cart = carts.first()
    if not cart:
        raise ValidationError({"cart": ["Giỏ hàng đang trống."]})
    items, subtotal, discount, total_after_discount = cart_totals(cart)
    if not items:
        raise ValidationError({"cart": ["Giỏ hàng đang trống."]})
    validate_cart_items_sellable(items)
    if getattr(cart, "_voucher_error", None):
        raise ValidationError({"voucher": [cart._voucher_error]})
    shipping_fee = shipping.base_fee
    if shipping.free_threshold is not None and subtotal >= shipping.free_threshold:
        shipping_fee = Decimal("0")
    shipping_discount = Decimal("0")
    if cart.voucher_id and cart.voucher.kind == Voucher.Kind.FREE_SHIP and getattr(cart, "_voucher_usable", False):
        shipping_discount = shipping_fee
    grand_total = total_after_discount + shipping_fee - shipping_discount
    return address, shipping, cart, items, subtotal, discount, shipping_fee, shipping_discount, grand_total


def preview(user, data):
    values = checkout_values(user, data)
    return {
        "subtotal": values[4], "discount_total": values[5], "shipping_fee": values[6],
        "shipping_discount": values[7], "grand_total": values[8], "currency": "VND",
    }


def request_hash(data):
    normalized = {key: str(value) for key, value in sorted(data.items()) if key != "checkout_key"}
    return hashlib.sha256(json.dumps(normalized, separators=(",", ":")).encode()).hexdigest()


@transaction.atomic
def create_order(user, data):
    # Serialize checkout attempts for one account. This closes both races:
    # retries with the same key and different keys targeting the same active cart.
    type(user).objects.select_for_update().only('pk').get(pk=user.pk)
    key = data["checkout_key"]
    digest = request_hash(data)
    existing = Order.objects.filter(user=user, checkout_key=key).first()
    if existing:
        if existing.request_hash != digest:
            raise ValidationError({"checkout_key": ["Khóa này đã được dùng với dữ liệu khác."]}, code="conflict")
        return existing, False
    release_expired_reservations()
    address, shipping, cart, items, subtotal, discount, shipping_fee, shipping_discount, grand_total = checkout_values(user, data, lock=True)

    locked_voucher = None
    if cart.voucher_id:
        locked_voucher = validate_and_lock_voucher(cart.voucher_id, user, subtotal)
        discount = compute_discount(locked_voucher, subtotal)
        shipping_discount = Decimal("0")
        if locked_voucher.kind == Voucher.Kind.FREE_SHIP:
            shipping_discount = shipping_fee
        grand_total = (subtotal - discount) + shipping_fee - shipping_discount

    balances = {}
    for item in sorted(items, key=lambda row: row.variant_id):
        try:
            balance = InventoryBalance.objects.select_for_update().get(variant_id=item.variant_id)
        except InventoryBalance.DoesNotExist:
            raise ValidationError({"cart": [f"SKU {item.variant.sku} chưa có tồn kho."]})
        if balance.available < item.quantity:
            raise ValidationError({"cart": [f"SKU {item.variant.sku} không đủ tồn kho."]})
        balances[item.variant_id] = balance

    order = Order.objects.create(
        user=user, source_cart=cart, order_number=uuid.uuid4().hex[:16].upper(),
        checkout_key=key, request_hash=digest, subtotal=subtotal, discount_total=discount,
        shipping_fee=shipping_fee, shipping_discount=shipping_discount, grand_total=grand_total,
        voucher=locked_voucher, voucher_code_snapshot=locked_voucher.code if locked_voucher else None,
        shipping_method=shipping, shipping_method_snapshot=shipping.name,
        contact_email_snapshot=user.email, customer_note=data.get("note", ""),
    )
    OrderAddress.objects.create(
        order=order, recipient_name=address.recipient_name, phone=address.phone,
        address_line=address.address_line, ward=address.ward, province=address.province,
        country_code=address.country_code,
    )
    expiry = timezone.now() + timedelta(minutes=30)
    for item in items:
        variant = item.variant
        OrderItem.objects.create(
            order=order, variant=variant, product_name_snapshot=variant.product.name,
            sku_snapshot=variant.sku,
            options_snapshot={"color": variant.color, "switch_type": variant.switch_type, "connection": variant.connection, "layout": variant.layout},
            quantity=item.quantity, unit_price=variant.price, line_total=variant.price * item.quantity,
        )
        balance = balances[item.variant_id]
        balance.reserved += item.quantity
        balance.save(update_fields=["reserved", "updated_at"])
        InventoryReservation.objects.create(order=order, variant=variant, quantity=item.quantity, expires_at=expiry)
    if locked_voucher:
        VoucherRedemption.objects.create(voucher=locked_voucher, user=user, order=order, discount_amount=discount)
    Payment.objects.create(order=order, provider=Payment.Provider.COD, amount=grand_total)
    OrderStatusHistory.objects.create(order=order, to_status=OrderStatus.PENDING, actor=user, reason="Đơn hàng được tạo")
    OutboxEvent.objects.create(topic="order.created", aggregate_id=str(order.public_id), payload={"order_number": order.order_number})
    cart.status = Cart.Status.CONVERTED
    cart.save(update_fields=["status", "updated_at"])
    return order, True


@transaction.atomic
def cancel_order(order, user, reason):
    order = Order.objects.select_for_update().get(pk=order.pk)
    if order.status not in {OrderStatus.PENDING, OrderStatus.CONFIRMED, OrderStatus.PACKING}:
        raise ValidationError({"status": ["Đơn hàng không còn có thể hủy."]})
    old_status = order.status
    now = timezone.now()
    for reservation in order.reservations.select_for_update().filter(status=InventoryReservation.Status.ACTIVE):
        balance = InventoryBalance.objects.select_for_update().get(variant=reservation.variant)
        if balance.reserved < reservation.quantity:
            logger.warning(
                "Inventory reserved underflow prevented for variant_id=%s (reserved=%s, release=%s)",
                reservation.variant_id,
                balance.reserved,
                reservation.quantity,
            )
        balance.reserved = max(0, balance.reserved - reservation.quantity)
        balance.save(update_fields=["reserved", "updated_at"])
        reservation.status = InventoryReservation.Status.RELEASED
        reservation.closed_at = now
        reservation.save(update_fields=["status", "closed_at"])
    if hasattr(order, "voucher_redemption"):
        order.voucher_redemption.status = VoucherRedemption.Status.RELEASED
        order.voucher_redemption.save(update_fields=["status", "updated_at"])
    order.payments.filter(status=Payment.Status.PENDING).update(status=Payment.Status.CANCELLED)
    order.status = OrderStatus.CANCELLED
    order.save(update_fields=["status", "updated_at"])
    OrderStatusHistory.objects.create(order=order, from_status=old_status, to_status=OrderStatus.CANCELLED, actor=user, reason=reason)
    return order
