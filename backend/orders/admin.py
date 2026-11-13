from django.contrib import admin

from .models import Order, OrderAddress, OrderItem, OrderStatusHistory, ShippingMethod


class ReadOnlyOrderRecordAdmin(admin.ModelAdmin):
    def get_readonly_fields(self, request, obj=None):
        return [field.name for field in self.model._meta.concrete_fields]

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False


@admin.register(Order)
class OrderAdmin(ReadOnlyOrderRecordAdmin):
    list_display = ("order_number", "user", "status", "grand_total", "created_at")
    list_filter = ("status",)
    search_fields = ("order_number", "public_id", "user__email")


admin.site.register(OrderAddress, ReadOnlyOrderRecordAdmin)
admin.site.register(OrderItem, ReadOnlyOrderRecordAdmin)
admin.site.register(OrderStatusHistory, ReadOnlyOrderRecordAdmin)
admin.site.register(ShippingMethod)
