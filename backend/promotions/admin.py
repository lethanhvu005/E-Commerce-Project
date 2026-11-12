from django.contrib import admin
from .models import Voucher, VoucherRedemption

admin.site.register([Voucher, VoucherRedemption])
