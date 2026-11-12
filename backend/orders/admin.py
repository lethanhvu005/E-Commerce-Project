from django.contrib import admin
from .models import Order, OrderAddress, OrderItem, OrderStatusHistory, ShippingMethod

admin.site.register([Order, OrderAddress, OrderItem, OrderStatusHistory, ShippingMethod])
