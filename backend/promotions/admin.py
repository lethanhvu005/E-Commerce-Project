from django.contrib import admin

from .models import Voucher, VoucherRedemption


@admin.register(Voucher)
class VoucherAdmin(admin.ModelAdmin):
    list_display = ("code", "kind", "value", "is_active", "starts_at", "ends_at")
    list_filter = ("kind", "is_active")
    search_fields = ("code",)


@admin.register(VoucherRedemption)
class VoucherRedemptionAdmin(admin.ModelAdmin):
    list_display = ("voucher", "user", "order", "status", "discount_amount", "created_at")
    list_filter = ("status",)

    def get_readonly_fields(self, request, obj=None):
        return [field.name for field in self.model._meta.concrete_fields]

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False
