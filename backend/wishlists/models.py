from django.conf import settings
from django.db import models
from django.utils import timezone


class Wishlist(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='wishlist_entries')
    product = models.ForeignKey('catalog.Product', on_delete=models.PROTECT, related_name='wishlist_entries')
    created_at = models.DateTimeField(default=timezone.now, editable=False)

    class Meta:
        db_table = 'wishlists'
        constraints = [models.UniqueConstraint(fields=['user', 'product'], name='wishlists_user_product_uq')]
