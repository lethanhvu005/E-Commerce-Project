from django.db import migrations


class Migration(migrations.Migration):
    dependencies = [('catalog', '0001_initial')]

    # Django 4.2 has no native composite ForeignKey. Keep this invariant in
    # PostgreSQL as well as ProductImage.clean(), including for bulk writes.
    operations = [
        migrations.RunSQL(
            'ALTER TABLE product_images ADD CONSTRAINT images_variant_product_fk '
            'FOREIGN KEY (variant_id, product_id) REFERENCES product_variants (id, product_id) ON DELETE RESTRICT',
            'ALTER TABLE product_images DROP CONSTRAINT images_variant_product_fk',
        ),
    ]
