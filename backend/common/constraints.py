"""Reusable expressions; constraints remain part of each model's Meta."""
from django.core.exceptions import ValidationError
from django.db import models
from django.db.models.functions import Length, Trim
from django.db.models.lookups import Exact, GreaterThanOrEqual


def validate_json_object(value):
    if not isinstance(value, dict):
        raise ValidationError('Expected a JSON object.')


def json_object_constraint(field, name):
    return models.CheckConstraint(
        condition=Exact(
            models.Func(models.F(field), function='jsonb_typeof', output_field=models.CharField()),
            models.Value('object'),
        ),
        name=name,
    )


def trimmed_length_constraint(field, minimum, name):
    return models.CheckConstraint(
        condition=GreaterThanOrEqual(Length(Trim(models.F(field))), models.Value(minimum)),
        name=name,
    )
