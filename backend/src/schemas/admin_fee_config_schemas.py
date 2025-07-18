"""Marshmallow schemas for admin fee configuration API endpoints."""

from marshmallow import Schema, fields, validate, validates, ValidationError, validates_schema
from marshmallow import EXCLUDE


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
    classification_id = fields.Integer(required=True, data_key='classification_id')
    default_max_gross_weight_lbs = fields.Decimal(
        allow_none=True,
        validate=validate.Range(min=0),
        as_string=True
    )
    created_at = fields.DateTime(dump_only=True)
    updated_at = fields.DateTime(dump_only=True)

    class Meta:
        unknown = EXCLUDE


class UpdateAircraftTypeFuelWaiverSchema(Schema):
    """Schema for updating aircraft type base min fuel for waiver."""
    base_min_fuel_gallons_for_waiver = fields.Decimal(
        required=True,
        validate=validate.Range(min=0),
        as_string=True
    )


# Aircraft Classifications Schemas
class AircraftClassificationSchema(Schema):
    """Schema for aircraft classification."""
    id = fields.Integer(dump_only=True)
    name = fields.String(required=True, validate=validate.Length(min=1, max=100))
    created_at = fields.DateTime(dump_only=True)
    updated_at = fields.DateTime(dump_only=True)

    class Meta:
        unknown = EXCLUDE


class CreateAircraftClassificationSchema(Schema):
    """Schema for creating an aircraft classification."""
    name = fields.String(required=True, validate=validate.Length(min=1, max=100))


class UpdateAircraftClassificationSchema(Schema):
    """Schema for updating an aircraft classification."""
    name = fields.String(required=True, validate=validate.Length(min=1, max=100))


# Aircraft Type to Classification Mapping Schemas (Deprecated)



class CSVUploadResultSchema(Schema):
    """Schema for CSV upload results."""
    created = fields.Integer(dump_only=True)
    updated = fields.Integer(dump_only=True)
    errors = fields.List(fields.String(), dump_only=True)


# Fee Rules Schemas
class FeeRuleSchema(Schema):
    """Schema for fee rule."""
    id = fields.Integer(dump_only=True)
    fee_name = fields.String(required=True, validate=validate.Length(min=1, max=100))
    fee_code = fields.String(required=True, validate=validate.Length(min=1, max=50))
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
    created_at = fields.DateTime(dump_only=True)
    updated_at = fields.DateTime(dump_only=True)

    class Meta:
        unknown = EXCLUDE

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

    # Note: Classification-specific validation has been removed
    # All fee rules are now global with overrides handled separately


class UpdateFeeRuleSchema(Schema):
    """Schema for updating a fee rule."""
    fee_name = fields.String(validate=validate.Length(min=1, max=100))
    fee_code = fields.String(validate=validate.Length(min=1, max=50))
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

    # Note: Classification-specific validation has been removed
    # All fee rules are now global with overrides handled separately


# Waiver Tiers Schemas
class WaiverTierSchema(Schema):
    """Schema for waiver tier."""
    id = fields.Integer(dump_only=True)
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

    class Meta:
        unknown = EXCLUDE


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




class FeeRuleOverrideSchema(Schema):
    """Schema for fee rule override."""
    id = fields.Integer(dump_only=True)
    aircraft_type_id = fields.Integer(allow_none=True)
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

    class Meta:
        unknown = EXCLUDE


# Fee Schedule Snapshot Schema for Versioning and Import
class FeeScheduleSnapshotSchema(Schema):
    """
    Comprehensive schema for validating fee schedule snapshots.
    Used for configuration backups, versioning, and import validation.
    """
    # Aircraft Classifications
    classifications = fields.List(
        fields.Nested(AircraftClassificationSchema),
        required=True,
        validate=validate.Length(min=1)
    )
    
    # Aircraft Types
    aircraft_types = fields.List(
        fields.Nested(AircraftTypeSchema),
        required=True,
        validate=validate.Length(min=1)
    )
    
    
    # Fee Rules
    fee_rules = fields.List(
        fields.Nested(FeeRuleSchema),
        required=True,
        validate=validate.Length(min=1)
    )
    
    # Fee Rule Overrides
    overrides = fields.List(
        fields.Nested(FeeRuleOverrideSchema),
        required=True
    )
    
    # Waiver Tiers
    waiver_tiers = fields.List(
        fields.Nested(WaiverTierSchema),
        required=True
    )
    
    class Meta:
        unknown = EXCLUDE

    @validates_schema
    def validate_internal_consistency(self, data, **kwargs):
        """
        Perform comprehensive internal consistency checks on the snapshot.
        Ensures all referenced IDs exist within the same snapshot.
        """
        errors = {}
        
        # Extract IDs for validation
        classification_ids = {item['id'] for item in data.get('classifications', []) if 'id' in item}
        aircraft_type_ids = {item['id'] for item in data.get('aircraft_types', []) if 'id' in item}
        fee_rule_ids = {item['id'] for item in data.get('fee_rules', []) if 'id' in item}
        
        # Validate fee rules reference valid classifications
        fee_rules = data.get('fee_rules', [])
        # Note: applies_to_classification_id field has been deprecated
        # All fee rules are now global with overrides handled separately
        
        # Validate aircraft types reference valid classifications
        aircraft_types = data.get('aircraft_types', [])
        for i, aircraft_type in enumerate(aircraft_types):
            classification_id = aircraft_type.get('classification_id')
            if classification_id and classification_id not in classification_ids:
                if 'aircraft_types' not in errors:
                    errors['aircraft_types'] = {}
                if i not in errors['aircraft_types']:
                    errors['aircraft_types'][i] = {}
                errors['aircraft_types'][i]['classification_id'] = [
                    f'Aircraft type references non-existent classification ID: {classification_id}'
                ]
        
        
        # Validate overrides reference valid aircraft types and fee rules
        overrides = data.get('overrides', [])
        for i, override in enumerate(overrides):
            aircraft_type_id = override.get('aircraft_type_id')
            fee_rule_id = override.get('fee_rule_id')
            
            if aircraft_type_id and aircraft_type_id not in aircraft_type_ids:
                if 'overrides' not in errors:
                    errors['overrides'] = {}
                if i not in errors['overrides']:
                    errors['overrides'][i] = {}
                errors['overrides'][i]['aircraft_type_id'] = [
                    f'Override references non-existent aircraft type ID: {aircraft_type_id}'
                ]
            
            if fee_rule_id and fee_rule_id not in fee_rule_ids:
                if 'overrides' not in errors:
                    errors['overrides'] = {}
                if i not in errors['overrides']:
                    errors['overrides'][i] = {}
                errors['overrides'][i]['fee_rule_id'] = [
                    f'Override references non-existent fee rule ID: {fee_rule_id}'
                ]
        
        # Validate waiver tiers reference valid fee codes
        fee_codes = {fee_rule['fee_code'] for fee_rule in fee_rules if 'fee_code' in fee_rule}
        waiver_tiers = data.get('waiver_tiers', [])
        for i, tier in enumerate(waiver_tiers):
            fees_waived_codes = tier.get('fees_waived_codes', [])
            for j, fee_code in enumerate(fees_waived_codes):
                if fee_code not in fee_codes:
                    if 'waiver_tiers' not in errors:
                        errors['waiver_tiers'] = {}
                    if i not in errors['waiver_tiers']:
                        errors['waiver_tiers'][i] = {}
                    if 'fees_waived_codes' not in errors['waiver_tiers'][i]:
                        errors['waiver_tiers'][i]['fees_waived_codes'] = {}
                    errors['waiver_tiers'][i]['fees_waived_codes'][j] = [
                        f'Waiver tier references non-existent fee code: {fee_code}'
                    ]
        
        if errors:
            raise ValidationError(errors) 