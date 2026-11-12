"""Small ORM fixtures for tests; never seed the application database."""
import uuid
from datetime import timedelta
from django.utils import timezone
from accounts.models import User
from catalog.models import Brand, Category, Product, ProductVariant
from carts.models import Cart
from orders.models import Order, ShippingMethod
from promotions.models import Voucher


def catalog():
    category = Category.objects.create(name='Keyboard', code='keyboard', slug='keyboard')
    brand = Brand.objects.create(name='Demo', slug='demo')
    product = Product.objects.create(category=category, brand=brand, name='Keyboard', short_name='KB', slug='keyboard')
    variant = ProductVariant.objects.create(product=product, sku='KB-01', option_key='default', price=100)
    return product, variant


def order(user=None):
    user = user or User.objects.create_user('buyer@example.test')
    cart = Cart.objects.create(user=user)
    shipping, _ = ShippingMethod.objects.get_or_create(code='standard', defaults={'name': 'Standard', 'base_fee': 0, 'min_days': 1, 'max_days': 3})
    return Order.objects.create(
        user=user, source_cart=cart, order_number=uuid.uuid4().hex,
        checkout_key=uuid.uuid4(), request_hash='a' * 64,
        subtotal=100, grand_total=100, shipping_method=shipping,
        shipping_method_snapshot=shipping.name, contact_email_snapshot=user.email,
    )


def voucher():
    return Voucher.objects.create(code='DEMO10', kind='percent', value=10, starts_at=timezone.now(), ends_at=timezone.now() + timedelta(days=1))
