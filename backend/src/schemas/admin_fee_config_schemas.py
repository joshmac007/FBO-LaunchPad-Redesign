"""Marshmallow schemas for admin fee configuration API endpoints."""

from marshmallow import Schema, fields, validate, validates, ValidationError


# Aircraft Types Schemas
class AircraftTypeSchema(Schema):
    """Schema for aircraft type with base min fuel for waiver."""
    id = fields.Integer(dump_only=True)
    name = fields.String(required=True, validate=validate.Length(min=1, max=100))
    base_min_fuel_gallons_for_waiver = fields.Decimal(
        required=True, 
        validate=validate.Range(min=0),
        as_string=True
    )
    default_aircraft_classification_id = fields.Integer(allow_none=True)
    default_max_gross_weight_lbs = fields.Decimal(
        allow_none=True,
        validate=validate.Range(min=0),
        as_string=True
    )
    created_at = fields.DateTime(dump_only=True)
    updated_at = fields.DateTime(dump_only=True)


class UpdateAircraftTypeFuelWaiverSchema(Schema):
    """Schema for updating aircraft type base min fuel for waiver."""
    base_min_fuel_gallons_for_waiver = fields.Decimal(
        required=True,
        validate=validate.Range(min=0),
        as_string=True
    )


# Fee Categories Schemas
class AircraftClassificationSchema(Schema):
    """Schema for fee category."""
    id = fields.Integer(dump_only=True)
    fbo_location_id = fields.Integer(dump_only=True)
    name = fields.String(required=True, validate=validate.Length(min=1, max=100))
    created_at = fields.DateTime(dump_only=True)
    updated_at = fields.DateTime(dump_only=True)


class CreateAircraftClassificationSchema(Schema):
    """Schema for creating a fee category."""
    name = fields.String(required=True, validate=validate.Length(min=1, max=100))


class UpdateAircraftClassificationSchema(Schema):
    """Schema for updating a fee category."""
    name = fields.String(required=True, validate=validate.Length(min=1, max=100))


# Aircraft Type to Fee Category Mapping Schemas
class AircraftTypeMappingSchema(Schema):
    """Schema for aircraft type to fee category mapping."""
    id = fields.Integer(dump_only=True)
    fbo_location_id = fields.Integer(dump_only=True)
    aircraft_type_id = fields.Integer(required=True)
    aircraft_type_name = fields.String(dump_only=True)
    aircraft_classification_id = fields.Integer(required=True)
    aircraft_classification_name = fields.String(dump_only=True)
    created_at = fields.DateTime(dump_only=True)
    updated_at = fields.DateTime(dump_only=True)


class CreateAircraftTypeMappingSchema(Schema):
    """Schema for creating aircraft type to fee category mapping."""
    aircraft_type_id = fields.Integer(required=True)
    aircraft_classification_id = fields.Integer(required=True)


class UpdateAircraftTypeMappingSchema(Schema):
    """Schema for updating aircraft type to fee category mapping."""
    aircraft_classification_id = fields.Integer(required=True)


class CSVUploadResultSchema(Schema):
    """Schema for CSV upload results."""
    created = fields.Integer(dump_only=True)
    updated = fields.Integer(dump_only=True)
    errors = fields.List(fields.String(), dump_only=True)


# Fee Rules Schemas
class FeeRuleSchema(Schema):
    """Schema for fee rule."""
    id = fields.Integer(dump_only=True)
    fbo_location_id = fields.Integer(dump_only=True)
    fee_name = fields.String(required=True, validate=validate.Length(min=1, max=100))
    fee_code = fields.String(required=True, validate=validate.Length(min=1, max=50))
    applies_to_aircraft_classification_id = fields.Integer(required=True)
    aircraft_classification_name = fields.String(dump_only=True)
    amount = fields.Decimal(
        required=True,
        validate=validate.Range(min=0),
        as_string=True
    )
    currency = fields.String(
        validate=validate.Length(equal=3),
        missing='USD'
    )
    is_taxable = fields.Boolean(missing=False)
    is_potentially_waivable_by_fuel_uplift = fields.Boolean(missing=False)
    calculation_basis = fields.String(
        validate=validate.OneOf(['FIXED_PRICE', 'PER_UNIT_SERVICE', 'NOT_APPLICABLE']),
        missing='NOT_APPLICABLE'
    )
    waiver_strategy = fields.String(
        validate=validate.OneOf(['NONE', 'SIMPLE_MULTIPLIER', 'TIERED_MULTIPLIER']),
        missing='NONE'
    )
    simple_waiver_multiplier = fields.Decimal(
        allow_none=True,
        validate=validate.Range(min=0),
        as_string=True
    )
    has_caa_override = fields.Boolean(missing=False)
    caa_override_amount = fields.Decimal(
        allow_none=True,
        validate=validate.Range(min=0),
        as_string=True
    )
    caa_waiver_strategy_override = fields.String(
        allow_none=True,
        validate=validate.OneOf(['NONE', 'SIMPLE_MULTIPLIER', 'TIERED_MULTIPLIER'])
    )
    caa_simple_waiver_multiplier_override = fields.Decimal(
        allow_none=True,
        validate=validate.Range(min=0),
        as_string=True
    )
    is_primary_fee = fields.Boolean(missing=False)
    created_at = fields.DateTime(dump_only=True)
    updated_at = fields.DateTime(dump_only=True)

    @validates('simple_waiver_multiplier')
    def validate_simple_waiver_multiplier(self, value):
        """Validate simple waiver multiplier is required for SIMPLE_MULTIPLIER strategy."""
        if self.context.get('waiver_strategy') == 'SIMPLE_MULTIPLIER' and value is None:
            raise ValidationError('Simple waiver multiplier is required for SIMPLE_MULTIPLIER strategy')

    @validates('caa_simple_waiver_multiplier_override')
    def validate_caa_simple_waiver_multiplier_override(self, value):
        """Validate CAA simple waiver multiplier override is required for CAA SIMPLE_MULTIPLIER strategy."""
        if self.context.get('caa_waiver_strategy_override') == 'SIMPLE_MULTIPLIER' and value is None:
            raise ValidationError('CAA simple waiver multiplier override is required for CAA SIMPLE_MULTIPLIER strategy')


class CreateFeeRuleSchema(Schema):
    """Schema for creating a fee rule."""
    fee_name = fields.String(required=True, validate=validate.Length(min=1, max=100))
    fee_code = fields.String(required=True, validate=validate.Length(min=1, max=50))
    applies_to_aircraft_classification_id = fields.Integer(required=True)
    amount = fields.Decimal(
        required=True,
        validate=validate.Range(min=0),
        as_string=True
    )
    currency = fields.String(
        validate=validate.Length(equal=3),
        missing='USD'
    )
    is_taxable = fields.Boolean(missing=False)
    is_potentially_waivable_by_fuel_uplift = fields.Boolean(missing=False)
    calculation_basis = fields.String(
        validate=validate.OneOf(['FIXED_PRICE', 'PER_UNIT_SERVICE', 'NOT_APPLICABLE']),
        missing='NOT_APPLICABLE'
    )
    waiver_strategy = fields.String(
        validate=validate.OneOf(['NONE', 'SIMPLE_MULTIPLIER', 'TIERED_MULTIPLIER']),
        missing='NONE'
    )
    simple_waiver_multiplier = fields.Decimal(
        allow_none=True,
        validate=validate.Range(min=0),
        as_string=True
    )
    has_caa_override = fields.Boolean(missing=False)
    caa_override_amount = fields.Decimal(
        allow_none=True,
        validate=validate.Range(min=0),
        as_string=True
    )
    caa_waiver_strategy_override = fields.String(
        allow_none=True,
        validate=validate.OneOf(['NONE', 'SIMPLE_MULTIPLIER', 'TIERED_MULTIPLIER'])
    )
    caa_simple_waiver_multiplier_override = fields.Decimal(
        allow_none=True,
        validate=validate.Range(min=0),
        as_string=True
    )
    is_primary_fee = fields.Boolean(missing=False)


class UpdateFeeRuleSchema(Schema):
    """Schema for updating a fee rule."""
    fee_name = fields.String(validate=validate.Length(min=1, max=100))
    fee_code = fields.String(validate=validate.Length(min=1, max=50))
    applies_to_aircraft_classification_id = fields.Integer()
    amount = fields.Decimal(
        validate=validate.Range(min=0),
        as_string=True
    )
    currency = fields.String(validate=validate.Length(equal=3))
    is_taxable = fields.Boolean()
    is_potentially_waivable_by_fuel_uplift = fields.Boolean()
    calculation_basis = fields.String(
        validate=validate.OneOf(['FIXED_PRICE', 'PER_UNIT_SERVICE', 'NOT_APPLICABLE'])
    )
    waiver_strategy = fields.String(
        validate=validate.OneOf(['NONE', 'SIMPLE_MULTIPLIER', 'TIERED_MULTIPLIER'])
    )
    simple_waiver_multiplier = fields.Decimal(
        allow_none=True,
        validate=validate.Range(min=0),
        as_string=True
    )
    has_caa_override = fields.Boolean()
    caa_override_amount = fields.Decimal(
        allow_none=True,
        validate=validate.Range(min=0),
        as_string=True
    )
    caa_waiver_strategy_override = fields.String(
        allow_none=True,
        validate=validate.OneOf(['NONE', 'SIMPLE_MULTIPLIER', 'TIERED_MULTIPLIER'])
    )
    caa_simple_waiver_multiplier_override = fields.Decimal(
        allow_none=True,
        validate=validate.Range(min=0),
        as_string=True
    )
    is_primary_fee = fields.Boolean()


# Waiver Tiers Schemas
class WaiverTierSchema(Schema):
    """Schema for waiver tier."""
    id = fields.Integer(dump_only=True)
    fbo_location_id = fields.Integer(dump_only=True)
    name = fields.String(required=True, validate=validate.Length(min=1, max=100))
    fuel_uplift_multiplier = fields.Decimal(
        required=True,
        validate=validate.Range(min=0),
        as_string=True
    )
    fees_waived_codes = fields.List(
        fields.String(),
        required=True,
        validate=validate.Length(min=1)
    )
    tier_priority = fields.Integer(
        required=True,
        validate=validate.Range(min=1)
    )
    is_caa_specific_tier = fields.Boolean(missing=False)
    created_at = fields.DateTime(dump_only=True)
    updated_at = fields.DateTime(dump_only=True)


class CreateWaiverTierSchema(Schema):
    """Schema for creating a waiver tier."""
    name = fields.String(required=True, validate=validate.Length(min=1, max=100))
    fuel_uplift_multiplier = fields.Decimal(
        required=True,
        validate=validate.Range(min=0),
        as_string=True
    )
    fees_waived_codes = fields.List(
        fields.String(),
        required=True,
        validate=validate.Length(min=1)
    )
    tier_priority = fields.Integer(
        required=True,
        validate=validate.Range(min=1)
    )
    is_caa_specific_tier = fields.Boolean(missing=False)


class UpdateWaiverTierSchema(CreateWaiverTierSchema):
    pass


class CreateAircraftFeeSetupSchema(Schema):
    aircraft_type_name = fields.Str(required=True, validate=validate.Length(min=1))
    aircraft_classification_id = fields.Int(required=True)
    min_fuel_gallons = fields.Float(required=True, validate=validate.Range(min=0))
    initial_ramp_fee_rule_id = fields.Int(allow_none=True)
    initial_ramp_fee_amount = fields.Float(allow_none=True, validate=validate.Range(min=0))


class FBOAircraftTypeConfigSchema(Schema):
    """Schema for FBO-specific aircraft type configuration."""
    id = fields.Integer(dump_only=True)
    fbo_location_id = fields.Integer(required=True)
    aircraft_type_id = fields.Integer(required=True)
    aircraft_type_name = fields.String(dump_only=True)
    base_min_fuel_gallons_for_waiver = fields.Decimal(
        required=True,
        validate=validate.Range(min=0),
        as_string=True
    )
    created_at = fields.DateTime(dump_only=True)
    updated_at = fields.DateTime(dump_only=True)


class FeeRuleOverrideSchema(Schema):
    """Schema for fee rule override."""
    id = fields.Integer(dump_only=True)
    fbo_location_id = fields.Integer(required=True)
    aircraft_type_id = fields.Integer(required=True)
    fee_rule_id = fields.Integer(required=True)
    override_amount = fields.Decimal(
        allow_none=True,
        validate=validate.Range(min=0),
        as_string=True
    )
    override_caa_amount = fields.Decimal(
        allow_none=True,
        validate=validate.Range(min=0),
        as_string=True
    )
    created_at = fields.DateTime(dump_only=True)
    updated_at = fields.DateTime(dump_only=True) 