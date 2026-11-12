from django.contrib import admin
from .models import ProductAnswer, ProductQuestion, Review

admin.site.register([ProductAnswer, ProductQuestion, Review])
