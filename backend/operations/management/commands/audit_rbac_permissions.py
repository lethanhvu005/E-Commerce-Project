from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = "Audit current RBAC groups, permissions, and non-staff users assigned to staff groups (read-only by default)."

    def add_arguments(self, parser):
        parser.add_argument(
            "--fix-non-staff-groups",
            action="store_true",
            help="Remove groups from non-staff customer accounts if explicitly requested.",
        )

    def handle(self, *args, **options):
        User = get_user_model()
        fix_non_staff = options.get("fix_non_staff_groups", False)

        for group in Group.objects.prefetch_related("permissions__content_type").order_by("name"):
            perms = [
                f"{p.content_type.app_label}.{p.codename}"
                for p in group.permissions.all()
            ]
            # Keep management-command output portable on Windows terminals that
            # still default to cp1252 while preserving the original group name.
            safe_group_name = group.name.encode("ascii", "backslashreplace").decode("ascii")
            self.stdout.write(f"[Group] {safe_group_name}: {len(perms)} permissions -> {', '.join(sorted(perms))}")

        non_staff_with_groups = User.objects.filter(is_staff=False, is_superuser=False, groups__isnull=False).distinct()
        count = non_staff_with_groups.count()
        if count == 0:
            self.stdout.write(self.style.SUCCESS("RBAC Audit OK: No non-staff customer belongs to any group."))
        else:
            self.stdout.write(
                self.style.WARNING(f"RBAC Audit Warning: Found {count} non-staff user(s) assigned to groups.")
            )
            if fix_non_staff:
                for u in non_staff_with_groups:
                    u.groups.clear()
                self.stdout.write(self.style.SUCCESS(f"Cleared groups from {count} non-staff user(s)."))
