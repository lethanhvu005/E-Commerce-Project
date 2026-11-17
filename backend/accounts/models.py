from django.conf import settings
from django.contrib.auth.base_user import AbstractBaseUser, BaseUserManager
from django.contrib.auth.models import PermissionsMixin
from django.db import models
from django.db.models import Q
from django.db.models.functions import Lower, Trim
from django.utils import timezone

from common.models import TimestampedModel


class UserManager(BaseUserManager):
    use_in_migrations = True

    def create_user(self, email, password=None, **extra_fields):
        if (not email or not email.strip()) and not extra_fields.get('facebook_sub'):
            raise ValueError('Email is required.')
        normalized_email = email.strip().lower() if email else None
        user = self.model(email=normalized_email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        extra_fields.setdefault('is_active', True)
        if extra_fields['is_staff'] is not True or extra_fields['is_superuser'] is not True:
            raise ValueError('A superuser must have is_staff=True and is_superuser=True.')
        return self.create_user(email, password, **extra_fields)


class User(AbstractBaseUser, PermissionsMixin):
    email = models.EmailField(max_length=254, unique=True, null=True, blank=True)
    first_name = models.CharField(max_length=150, blank=True, default='')
    last_name = models.CharField(max_length=150, blank=True, default='')
    phone = models.CharField(max_length=20, blank=True, default='')
    google_sub = models.CharField(max_length=128, unique=True, null=True, blank=True)
    facebook_sub = models.CharField(max_length=128, unique=True, null=True, blank=True)
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)
    email_verified_at = models.DateTimeField(null=True, blank=True)
    date_joined = models.DateTimeField(default=timezone.now)

    objects = UserManager()
    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = []

    class Meta:
        db_table = 'users'
        constraints = [
            models.CheckConstraint(
                condition=Q(email=Lower(Trim('email'))) & ~Q(email=''), name='users_email_normalized',
            ),
        ]

    def clean(self):
        super().clean()
        self.email = self.email.strip().lower() if self.email else None

    def save(self, *args, **kwargs):
        self.email = self.email.strip().lower() if self.email else None
        super().save(*args, **kwargs)

    def get_full_name(self):
        return f'{self.first_name} {self.last_name}'.strip()

    def get_short_name(self):
        return self.first_name

    def __str__(self):
        return self.email or f'Facebook user {self.facebook_sub}'


class Address(TimestampedModel):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name='addresses')
    recipient_name = models.CharField(max_length=150)
    phone = models.CharField(max_length=20)
    address_line = models.CharField(max_length=300)
    ward = models.CharField(max_length=150)
    province = models.CharField(max_length=150)
    country_code = models.CharField(max_length=2, default='VN')
    is_default = models.BooleanField(default=False)

    class Meta:
        db_table = 'addresses'
        constraints = [
            models.CheckConstraint(condition=Q(country_code='VN'), name='addresses_country_vn'),
            models.UniqueConstraint(fields=['user'], condition=Q(is_default=True), name='addresses_one_default_uq'),
        ]

    def __str__(self):
        return f'{self.recipient_name}: {self.address_line}'
