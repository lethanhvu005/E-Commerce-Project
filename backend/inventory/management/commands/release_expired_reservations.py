from django.core.management.base import BaseCommand

from orders.services import release_expired_reservations


class Command(BaseCommand):
    help = "Giải phóng các bản ghi giữ chỗ tồn kho (InventoryReservation) đã quá hạn 30 phút và chuyển đơn pending sang expired."

    def handle(self, *args, **options):
        released_count = release_expired_reservations()
        self.stdout.write(
            self.style.SUCCESS(f"Đã giải phóng {released_count} giữ chỗ tồn kho quá hạn.")
        )
