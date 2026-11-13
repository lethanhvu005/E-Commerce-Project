from decimal import Decimal

from django.db import transaction
from django.utils import timezone
from rest_framework.exceptions import ValidationError

from catalog.models import Product, ProductVariant
from promotions.models import Voucher, VoucherRedemption

from .models import Cart, CartItem


def get_cart(user, lock=False):
    queryset = Cart.objects
    if lock:
        queryset = queryset.select_for_update()
    cart, _ = queryset.get_or_create(user=user, status=Cart.Status.ACTIVE)
    return cart


def validate_variant(variant_id, quantity):
    try:
        variant = ProductVariant.objects.select_related("product__category", "product__brand", "inventory").get(
            id=variant_id,
            is_active=True,
            product__status=Product.Status.ACTIVE,
            product__category__is_active=True,
            product__brand__is_active=True,
        )
    except ProductVariant.DoesNotExist:
        raise ValidationError({"variant_id": ["Phiên bản sản phẩm không còn bán."]})
    try:
        available = variant.inventory.available
    except ProductVariant.inventory.RelatedObjectDoesNotExist:
        available = 0
    if quantity > available:
        raise ValidationError({"quantity": [f"Chỉ còn {available} sản phẩm khả dụng."]})
    return variant


@transaction.atomic
def add_item(user, variant_id, quantity):
    cart = get_cart(user, lock=True)
    variant = validate_variant(variant_id, quantity)
    item, created = CartItem.objects.select_for_update().get_or_create(
        cart=cart, variant=variant, defaults={"quantity": quantity}
    )
    if not created:
        new_quantity = item.quantity + quantity
        validate_variant(variant_id, new_quantity)
        item.quantity = new_quantity
        item.save(update_fields=["quantity", "updated_at"])
    return cart


def is_voucher_usable(voucher, user_id, subtotal, now=None):
    if not voucher or not voucher.is_active:
        return False
    now = now or timezone.now()
    if not (voucher.starts_at <= now < voucher.ends_at):
        return False
    if subtotal < voucher.min_subtotal:
        return False
    active_redemptions = VoucherRedemption.objects.filter(voucher=voucher).exclude(
        status=VoucherRedemption.Status.RELEASED
    )
    if voucher.usage_limit is not None and active_redemptions.count() >= voucher.usage_limit:
        return False
    if user_id and voucher.per_user_limit is not None:
        if active_redemptions.filter(user_id=user_id).count() >= voucher.per_user_limit:
            return False
    return True


def cart_totals(cart):
    items = list(
        cart.items.select_related("variant__product__category", "variant__product__brand")
        .prefetch_related("variant__product__images")
        .order_by("id")
    )
    subtotal = sum((item.variant.price * item.quantity for item in items), Decimal("0"))
    discount = Decimal("0")
    if cart.voucher_id:
        voucher = cart.voucher
        if is_voucher_usable(voucher, cart.user_id, subtotal):
            if voucher.kind == Voucher.Kind.PERCENT:
                discount = subtotal * voucher.value / Decimal("100")
                if voucher.max_discount is not None:
                    discount = min(discount, voucher.max_discount)
            elif voucher.kind == Voucher.Kind.FIXED:
                discount = min(subtotal, voucher.value)
    return items, subtotal, discount, subtotal - discount
