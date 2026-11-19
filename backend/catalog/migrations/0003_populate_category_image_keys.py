from django.db import migrations


CATEGORY_IMAGE_DEFAULTS = {
    "ban-phim": ("assets/images/categories/keyboards.png", 1),
    "keyboard": ("assets/images/categories/keyboards.png", 1),
    "chuot": ("assets/images/categories/mouse.png", 2),
    "mouse": ("assets/images/categories/mouse.png", 2),
    "tai-nghe": ("assets/images/categories/headset.png", 3),
    "headset": ("assets/images/categories/headset.png", 3),
    "man-hinh": ("assets/images/categories/monitor.png", 4),
    "monitor": ("assets/images/categories/monitor.png", 4),
    "lot-chuot": ("assets/images/categories/pad.png", 5),
    "mouse-pad": ("assets/images/categories/pad.png", 5),
    "tay-cam": ("assets/images/categories/controller.png", 6),
    "controller": ("assets/images/categories/controller.png", 6),
    "webcam": ("assets/images/categories/webcam.png", 7),
    "microphone": ("assets/images/categories/microphone.png", 8),
    "phu-kien": ("assets/images/categories/pad.png", 9),
    "accessory": ("assets/images/categories/pad.png", 9),
    "ghe-gaming": ("assets/images/categories/desk.png", 10),
    "chair": ("assets/images/categories/desk.png", 10),
}


def populate_category_image_keys(apps, schema_editor):
    Category = apps.get_model("catalog", "Category")
    for category in Category.objects.all():
        slug_key = (category.slug or "").strip().lower()
        code_key = (category.code or "").strip().lower()
        match = CATEGORY_IMAGE_DEFAULTS.get(slug_key) or CATEGORY_IMAGE_DEFAULTS.get(code_key)
        if not match:
            continue
        default_image, default_sort = match
        updated_fields = []
        if not (category.image_key or "").strip():
            category.image_key = default_image
            updated_fields.append("image_key")
        if category.sort_order == 0:
            category.sort_order = default_sort
            updated_fields.append("sort_order")
        if updated_fields:
            category.save(update_fields=updated_fields)


class Migration(migrations.Migration):
    dependencies = [
        ("catalog", "0002_image_variant_product"),
    ]

    operations = [
        migrations.RunPython(populate_category_image_keys, migrations.RunPython.noop),
    ]
