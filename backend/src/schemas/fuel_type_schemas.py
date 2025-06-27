"""
Marshmallow schemas for fuel type management.

Following the project's schema-first development approach using Marshmallow
for API validation and serialization.
"""

from marshmallow import Schema, fields, validate, validates, ValidationError, post_load
from decimal import Decimal


class FuelTypeSchema(Schema):
    """Schema for fuel type data."""
    id = fields.Integer(dump_only=True)
    name = fields.String(required=True, validate=validate.Length(min=1, max=100))
    code = fields.String(required=True, validate=validate.Length(min=1, max=50))
    description = fields.String(allow_none=True, validate=validate.Length(max=1000))
    is_active = fields.Boolean(required=True)
    created_at = fields.DateTime(dump_only=True)
    updated_at = fields.DateTime(dump_only=True)

    @validates('name')
    def validate_name(self, value):
        """Validate fuel type name."""
        if not value.strip():
            raise ValidationError('Name cannot be empty or whitespace only')

    @validates('code')
    def validate_code(self, value):
        """Validate fuel type code."""
        if not value.strip():
            raise ValidationError('Code cannot be empty or whitespace only')
        # Code should be uppercase alphanumeric with underscores
        code = value.strip().upper()
        if not all(c.isalnum() or c == '_' for c in code):
            raise ValidationError('Code must contain only letters, numbers, and underscores')

    @post_load
    def process_strings(self, data, **kwargs):
        """Process string fields."""
        if 'name' in data:
            data['name'] = data['name'].strip()
        if 'code' in data:
            data['code'] = data['code'].strip().upper()
        return data


class CreateFuelTypeSchema(Schema):
    """Schema for creating a new fuel type."""
    name = fields.String(required=True, validate=validate.Length(min=1, max=100))
    code = fields.String(required=True, validate=validate.Length(min=1, max=50))
    description = fields.String(allow_none=True, validate=validate.Length(max=1000))
    is_active = fields.Boolean(load_default=True)

    @validates('name')
    def validate_name(self, value):
        """Validate fuel type name."""
        if not value.strip():
            raise ValidationError('Name cannot be empty or whitespace only')

    @validates('code')
    def validate_code(self, value):
        """Validate fuel type code."""
        if not value.strip():
            raise ValidationError('Code cannot be empty or whitespace only')
        # Code should be uppercase alphanumeric with underscores
        code = value.strip().upper()
        if not all(c.isalnum() or c == '_' for c in code):
            raise ValidationError('Code must contain only letters, numbers, and underscores')

    @post_load
    def process_strings(self, data, **kwargs):
        """Process string fields."""
        if 'name' in data:
            data['name'] = data['name'].strip()
        if 'code' in data:
            data['code'] = data['code'].strip().upper()
        return data


class UpdateFuelTypeSchema(Schema):
    """Schema for updating an existing fuel type."""
    name = fields.String(validate=validate.Length(min=1, max=100))
    code = fields.String(validate=validate.Length(min=1, max=50))
    description = fields.String(allow_none=True, validate=validate.Length(max=1000))
    is_active = fields.Boolean()

    @validates('name')
    def validate_name(self, value):
        """Validate fuel type name if provided."""
        if value is not None and not value.strip():
            raise ValidationError('Name cannot be empty or whitespace only')

    @validates('code')
    def validate_code(self, value):
        """Validate fuel type code if provided."""
        if value is not None:
            if not value.strip():
                raise ValidationError('Code cannot be empty or whitespace only')
            # Code should be uppercase alphanumeric with underscores
            code = value.strip().upper()
            if not all(c.isalnum() or c == '_' for c in code):
                raise ValidationError('Code must contain only letters, numbers, and underscores')

    @post_load
    def process_strings(self, data, **kwargs):
        """Process string fields."""
        if 'name' in data and data['name'] is not None:
            data['name'] = data['name'].strip()
        if 'code' in data and data['code'] is not None:
            data['code'] = data['code'].strip().upper()
        return data


class FuelPriceSchema(Schema):
    """Schema for fuel price data."""
    fuel_type_id = fields.Integer(required=True, validate=validate.Range(min=1))
    fuel_type_name = fields.String(dump_only=True)
    fuel_type_code = fields.String(dump_only=True)
    price = fields.Decimal(
        allow_none=True,
        validate=validate.Range(min=0, max=999.9999),
        as_string=True,
        places=4
    )
    currency = fields.String(
        load_default='USD',
        validate=validate.Length(equal=3)
    )
    effective_date = fields.DateTime(allow_none=True, dump_only=True)
    created_at = fields.DateTime(allow_none=True, dump_only=True)
    updated_at = fields.DateTime(allow_none=True, dump_only=True)

    @validates('currency')
    def validate_currency(self, value):
        """Validate currency code."""
        if len(value) != 3:
            raise ValidationError('Currency must be a 3-letter code')

    @post_load
    def process_currency(self, data, **kwargs):
        """Process currency field."""
        if 'currency' in data:
            data['currency'] = data['currency'].upper()
        return data


class FuelPriceEntrySchema(Schema):
    """Schema for a single fuel price entry in a batch update."""
    fuel_type_id = fields.Integer(required=True, validate=validate.Range(min=1))
    price = fields.Decimal(
        required=True,
        validate=validate.Range(min=0.01, max=999.9999),
        as_string=True,
        places=4
    )

    @validates('price')
    def validate_price_precision(self, value):
        """Validate price decimal precision."""
        if value is not None:
            # Convert to Decimal for precision checking
            decimal_value = Decimal(str(value))
            # Check decimal places
            if decimal_value.as_tuple().exponent < -4:
                raise ValidationError('Price cannot have more than 4 decimal places')


class SetFuelPricesRequestSchema(Schema):
    """Schema for setting multiple fuel prices."""
    fuel_prices = fields.List(
        fields.Nested(FuelPriceEntrySchema),
        required=True,
        validate=validate.Length(min=1)
    )

    @validates('fuel_prices')
    def validate_unique_fuel_types(self, value):
        """Ensure no duplicate fuel types in the request."""
        if value:
            fuel_type_ids = [entry['fuel_type_id'] for entry in value]
            if len(fuel_type_ids) != len(set(fuel_type_ids)):
                raise ValidationError('Duplicate fuel type IDs are not allowed')


class FuelPricesResponseSchema(Schema):
    """Schema for fuel prices response."""
    fuel_prices = fields.List(fields.Nested(FuelPriceSchema))


class FuelTypesResponseSchema(Schema):
    """Schema for fuel types response."""
    fuel_types = fields.List(fields.Nested(FuelTypeSchema))


class SetFuelPricesResponseSchema(Schema):
    """Schema for set fuel prices response."""
    success = fields.Boolean()
    updated_count = fields.Integer()
    message = fields.String()