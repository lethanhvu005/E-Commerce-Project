from django.contrib import admin

from .models import ProductAnswer, ProductQuestion, Review, ReviewReply

admin.site.register([ProductAnswer, ProductQuestion, Review, ReviewReply])
