import hashlib
import json
import uuid
from datetime import timedelta
from decimal import Decimal

from django.db import transaction
from django.utils import timezone
from rest_framework.exceptions import ValidationError

from accounts.models import Address
from carts.models import Cart
from carts.services import cart_totals
from inventory.models import InventoryBalance, InventoryReservation
from operations.models import OutboxEvent
from payments.models import Payment
from promotions.models import Voucher, VoucherRedemption

from .models import Order, OrderAddress, OrderItem, OrderStatus, OrderStatusHistory, ShippingMethod


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
    shipping_fee = shipping.base_fee
    if shipping.free_threshold is not None and subtotal >= shipping.free_threshold:
        shipping_fee = Decimal("0")
    shipping_discount = Decimal("0")
    if cart.voucher_id and cart.voucher.kind == Voucher.Kind.FREE_SHIP:
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
    key = data["checkout_key"]
    digest = request_hash(data)
    existing = Order.objects.filter(user=user, checkout_key=key).first()
    if existing:
        if existing.request_hash != digest:
            raise ValidationError({"checkout_key": ["Khóa này đã được dùng với dữ liệu khác."]}, code="conflict")
        return existing, False
    address, shipping, cart, items, subtotal, discount, shipping_fee, shipping_discount, grand_total = checkout_values(user, data, lock=True)

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
        voucher=cart.voucher, voucher_code_snapshot=cart.voucher.code if cart.voucher_id else None,
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
    if cart.voucher_id:
        VoucherRedemption.objects.create(voucher=cart.voucher, user=user, order=order, discount_amount=discount)
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
        balance.reserved -= reservation.quantity
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
