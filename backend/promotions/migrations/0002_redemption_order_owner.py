from django.db import migrations


class Migration(migrations.Migration):
    dependencies = [
        ('promotions', '0001_initial'),
        ('orders', '0002_initial'),
    ]

    operations = [
        migrations.RunSQL(
            'ALTER TABLE voucher_redemptions ADD CONSTRAINT redemptions_order_user_fk '
            'FOREIGN KEY (order_id, user_id) REFERENCES orders (id, user_id) ON DELETE RESTRICT',
            'ALTER TABLE voucher_redemptions DROP CONSTRAINT redemptions_order_user_fk',
        ),
    ]
