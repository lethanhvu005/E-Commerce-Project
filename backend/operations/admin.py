from django.contrib import admin

from .models import AuditLog, OutboxEvent


class ImmutableOperationsAdmin(admin.ModelAdmin):
    def get_readonly_fields(self, request, obj=None):
        return [field.name for field in self.model._meta.concrete_fields]

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False


@admin.register(AuditLog)
class AuditLogAdmin(ImmutableOperationsAdmin):
    list_display = ("actor", "action", "entity_type", "entity_id", "created_at")
    search_fields = ("actor__email", "action", "entity_type", "entity_id")


@admin.register(OutboxEvent)
class OutboxEventAdmin(ImmutableOperationsAdmin):
    list_display = ("topic", "aggregate_id", "processed_at", "created_at")
    list_filter = ("topic",)
