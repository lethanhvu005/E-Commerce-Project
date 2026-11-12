from django.contrib import admin
from .models import InventoryBalance, InventoryMovement, InventoryReservation

admin.site.register([InventoryBalance, InventoryMovement, InventoryReservation])
