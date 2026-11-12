from django.contrib import admin
from .models import AuditLog, OutboxEvent

admin.site.register([AuditLog, OutboxEvent])
