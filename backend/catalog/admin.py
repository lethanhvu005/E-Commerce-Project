from django.contrib import admin
from .models import Brand, Category, Collection, CollectionProduct, HomeBanner, Product, ProductFeature, ProductImage, ProductVariant

admin.site.register([Brand, Category, Collection, CollectionProduct, HomeBanner, Product, ProductFeature, ProductImage, ProductVariant])
