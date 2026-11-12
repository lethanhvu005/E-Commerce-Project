from django.db import IntegrityError, transaction
from django.test import TestCase
from common.test_factories import order
from .models import Payment


class PaymentModelTests(TestCase):
    def test_one_pending_attempt_and_paid_timestamp(self):
        purchase = order()
        payment = Payment.objects.create(order=purchase, provider='cod', amount=100)
        payment.full_clean()
        with self.assertRaises(IntegrityError), transaction.atomic():
            Payment.objects.create(order=purchase, provider='cod', amount=100)
        with self.assertRaises(IntegrityError), transaction.atomic():
            Payment.objects.filter(pk=payment.pk).update(status='succeeded')
