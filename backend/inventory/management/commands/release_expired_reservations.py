from django.core.management.base import BaseCommand

from orders.services import release_expired_reservations


class Command(BaseCommand):
    help = "Giải phóng các bản ghi giữ chỗ tồn kho (InventoryReservation) và voucher của đơn PENDING đã quá hạn."

    def handle(self, *args, **options):
        expired_count = release_expired_reservations()
        self.stdout.write(
            self.style.SUCCESS(f"Đã giải phóng {expired_count} giữ chỗ tồn kho quá hạn.")
        )
