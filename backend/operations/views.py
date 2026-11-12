from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import AuditLog
from .serializers import AuditLogSerializer


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def audit_logs(request):
    if not request.user.is_staff or not request.user.has_perm("operations.view_auditlog"):
        return Response({"detail": "Bạn không có quyền xem nhật ký."}, status=status.HTTP_403_FORBIDDEN)
    queryset = AuditLog.objects.select_related("actor").order_by("-created_at", "-id")[:100]
    return Response({"results": AuditLogSerializer(queryset, many=True).data})
