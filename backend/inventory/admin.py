from django.contrib import admin

from .models import InventoryBalance, InventoryMovement, InventoryReservation


class ReadOnlyOperationalAdmin(admin.ModelAdmin):
    def get_readonly_fields(self, request, obj=None):
        return [field.name for field in self.model._meta.concrete_fields]

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False


@admin.register(InventoryBalance)
class InventoryBalanceAdmin(ReadOnlyOperationalAdmin):
    list_display = ("variant", "on_hand", "reserved", "available", "updated_at")
    search_fields = ("variant__sku",)


@admin.register(InventoryReservation)
class InventoryReservationAdmin(ReadOnlyOperationalAdmin):
    list_display = ("order", "variant", "quantity", "status", "expires_at")
    list_filter = ("status",)


@admin.register(InventoryMovement)
class InventoryMovementAdmin(ReadOnlyOperationalAdmin):
    list_display = ("variant", "kind", "quantity_delta", "actor", "created_at")
    list_filter = ("kind",)
    search_fields = ("variant__sku", "event_key")
