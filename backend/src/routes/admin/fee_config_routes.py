"""Admin fee configuration routes for FBO-specific fee management."""

import logging
from flask import Blueprint, request, jsonify, current_app
from marshmallow import ValidationError
from typing import Dict, Any, cast

from ...services.admin_fee_config_service import AdminFeeConfigService
from ...models.fee_schedule_version import FeeScheduleVersion
from ...extensions import db
from ...schemas.admin_fee_config_schemas import (
    AircraftTypeSchema, UpdateAircraftTypeFuelWaiverSchema,
    AircraftClassificationSchema, CreateAircraftClassificationSchema, UpdateAircraftClassificationSchema,

    CSVUploadResultSchema,
    FeeRuleSchema, CreateFeeRuleSchema, UpdateFeeRuleSchema,
    WaiverTierSchema, CreateWaiverTierSchema, UpdateWaiverTierSchema,
    CreateAircraftFeeSetupSchema, 
    FeeRuleOverrideSchema, FeeScheduleSnapshotSchema
)
from ...utils.enhanced_auth_decorators_v2 import require_permission_v2

# Create Blueprint
admin_fee_config_bp = Blueprint('admin_fee_config', __name__)

# Logger
logger = logging.getLogger(__name__)

# Schema instances
aircraft_type_schema = AircraftTypeSchema()
aircraft_type_list_schema = AircraftTypeSchema(many=True)
update_aircraft_type_fuel_waiver_schema = UpdateAircraftTypeFuelWaiverSchema()

aircraft_classification_schema = AircraftClassificationSchema()
aircraft_classification_list_schema = AircraftClassificationSchema(many=True)
create_aircraft_classification_schema = CreateAircraftClassificationSchema()
update_aircraft_classification_schema = UpdateAircraftClassificationSchema()


csv_upload_result_schema = CSVUploadResultSchema()

fee_rule_schema = FeeRuleSchema()
fee_rule_list_schema = FeeRuleSchema(many=True)
create_fee_rule_schema = CreateFeeRuleSchema()
update_fee_rule_schema = UpdateFeeRuleSchema()

waiver_tier_schema = WaiverTierSchema()
waiver_tier_list_schema = WaiverTierSchema(many=True)
create_waiver_tier_schema = CreateWaiverTierSchema()
update_waiver_tier_schema = UpdateWaiverTierSchema()
create_aircraft_fee_setup_schema = CreateAircraftFeeSetupSchema()


@admin_fee_config_bp.errorhandler(ValidationError)
def handle_validation_error(e):
    """Handle Marshmallow validation errors."""
    return jsonify({'error': 'Validation failed', 'messages': e.messages}), 400


@admin_fee_config_bp.errorhandler(ValueError)
def handle_value_error(e):
    """Handle value errors from service layer."""
    return jsonify({'error': str(e)}), 400


# Aircraft Types Routes
@admin_fee_config_bp.route('/api/admin/aircraft-types', methods=['GET'])
@require_permission_v2('manage_fbo_fee_schedules')
def get_aircraft_types():
    """Get all aircraft types with base min fuel for waiver."""
    try:
        aircraft_types = AdminFeeConfigService.get_aircraft_types()
        return jsonify({'aircraft_types': aircraft_types}), 200
    except Exception as e:
        current_app.logger.error(f"Error fetching aircraft types: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500


@admin_fee_config_bp.route('/api/admin/aircraft-types/<int:aircraft_type_id>', methods=['PUT'])
@require_permission_v2('manage_fbo_fee_schedules')
def update_aircraft_type_fuel_waiver(aircraft_type_id):
    """Update base min fuel for waiver for a specific aircraft type."""
    try:
        if not request.json:
            return jsonify({'error': 'Invalid JSON in request body'}), 400
        loaded_data = update_aircraft_type_fuel_waiver_schema.load(request.json)
        data = cast(Dict[str, Any], loaded_data)
        result = AdminFeeConfigService.update_aircraft_type_fuel_waiver(
            aircraft_type_id, 
            data['base_min_fuel_gallons_for_waiver']
        )
        return jsonify({'aircraft_type': result}), 200
    except ValidationError as e:
        return jsonify({'error': 'Validation failed', 'messages': e.messages}), 400
    except ValueError as e:
        return jsonify({'error': str(e)}), 404
    except Exception as e:
        current_app.logger.error(f"Error updating aircraft type fuel waiver: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500


# Aircraft Classifications Routes (Global)
@admin_fee_config_bp.route('/api/admin/aircraft-classifications', methods=['GET'])
@require_permission_v2('manage_fbo_fee_schedules')
def get_aircraft_classifications():
    """Get all aircraft classifications."""
    try:
        classifications = AdminFeeConfigService.get_aircraft_classifications()
        return jsonify({'aircraft_classifications': classifications}), 200
    except Exception as e:
        current_app.logger.error(f"Error fetching aircraft classifications: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500


@admin_fee_config_bp.route('/api/admin/aircraft-classifications/<int:classification_id>', methods=['GET'])
@require_permission_v2('manage_fbo_fee_schedules')
def get_aircraft_classification(classification_id):
    """Get a single aircraft classification by ID."""
    try:
        classification = AdminFeeConfigService.get_aircraft_classification_by_id(classification_id)
        if not classification:
            return jsonify({'error': 'Aircraft classification not found'}), 404
        return jsonify({'aircraft_classification': classification}), 200
    except Exception as e:
        current_app.logger.error(f"Error fetching aircraft classification: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500


@admin_fee_config_bp.route('/api/admin/aircraft-classifications', methods=['POST'])
@require_permission_v2('manage_fbo_fee_schedules')
def create_aircraft_classification():
    """Create a new aircraft classification."""
    try:
        # Check if request has valid JSON first
        if not request.is_json:
            return jsonify({'error': 'Content-Type must be application/json'}), 400
        try:
            json_data = request.json
        except Exception:
            return jsonify({'error': 'Invalid JSON in request body'}), 400
        if json_data is None:
            return jsonify({'error': 'Invalid JSON in request body'}), 400
        loaded_data = create_aircraft_classification_schema.load(json_data)
        data = cast(Dict[str, Any], loaded_data)
        classification = AdminFeeConfigService.create_aircraft_classification(data['name'])
        return jsonify(classification), 201
    except ValidationError as e:
        return jsonify({'error': 'Validation failed', 'messages': e.messages}), 400
    except ValueError as e:
        return jsonify({'error': str(e)}), 409
    except Exception as e:
        current_app.logger.error(f"Error creating aircraft classification: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500


@admin_fee_config_bp.route('/api/admin/aircraft-classifications/<int:classification_id>', methods=['PUT'])
@require_permission_v2('manage_fbo_fee_schedules')
def update_aircraft_classification(classification_id):
    """Update an aircraft classification."""
    try:
        if not request.json:
            return jsonify({'error': 'Invalid JSON in request body'}), 400
        loaded_data = update_aircraft_classification_schema.load(request.json)
        data = cast(Dict[str, Any], loaded_data)
        classification = AdminFeeConfigService.update_aircraft_classification(classification_id, data['name'])
        if not classification:
            return jsonify({'error': 'Aircraft classification not found'}), 404
        return jsonify({'aircraft_classification': classification}), 200
    except ValidationError as e:
        return jsonify({'error': 'Validation failed', 'messages': e.messages}), 400
    except ValueError as e:
        return jsonify({'error': str(e)}), 409
    except Exception as e:
        current_app.logger.error(f"Error updating aircraft classification: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500


@admin_fee_config_bp.route('/api/admin/aircraft-classifications/<int:classification_id>', methods=['DELETE'])
@require_permission_v2('manage_fbo_fee_schedules')
def delete_aircraft_classification(classification_id):
    """Delete an aircraft classification."""
    try:
        success = AdminFeeConfigService.delete_aircraft_classification(classification_id)
        if not success:
            return jsonify({'error': 'Aircraft classification not found'}), 404
        return '', 204
    except ValueError as e:
        return jsonify({'error': str(e)}), 409
    except Exception as e:
        current_app.logger.error(f"Error deleting aircraft classification: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500


@admin_fee_config_bp.route('/api/admin/aircraft-classifications/general', methods=['GET'])
@require_permission_v2('manage_fbo_fee_schedules')
def get_general_aircraft_classification():
    """Get or create the 'General' aircraft classification."""
    try:
        classification = AdminFeeConfigService.get_or_create_general_aircraft_classification()
        return jsonify({'aircraft_classification': classification}), 200
    except Exception as e:
        current_app.logger.error(f"Error getting/creating general aircraft classification: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500


# Aircraft Classification Mapping Routes (Refactored)
@admin_fee_config_bp.route('/api/admin/aircraft-types/<int:aircraft_type_id>/classification', methods=['PUT'])
@require_permission_v2('manage_fbo_fee_schedules')
def update_aircraft_type_classification(aircraft_type_id):
    """
    Update an aircraft type's classification (global operation).
    """
    data = request.get_json()
    if not data or 'classification_id' not in data:
        return jsonify({"error": "Missing classification_id in request body"}), 400

    try:
        classification_id = int(data['classification_id'])
        # Note: The service method already exists and is correct.
        updated_mapping = AdminFeeConfigService.update_aircraft_type_classification(
            aircraft_type_id=aircraft_type_id, aircraft_classification_id=classification_id
        )
        return jsonify(updated_mapping)
    except ValueError as e:
        return jsonify({"error": str(e)}), 404
    except Exception as e:
        current_app.logger.error(f"Error updating aircraft type classification: {e}")
        return jsonify({"error": "An unexpected error occurred"}), 500







# Fee Rules Routes
@admin_fee_config_bp.route('/api/admin/fee-rules', methods=['GET'])
@require_permission_v2('manage_fbo_fee_schedules')
def get_fee_rules():
    """Get all fee rules, optionally filtered by fee category."""
    try:
        category_id = request.args.get('applies_to_aircraft_classification_id', type=int)
        rules = AdminFeeConfigService.get_fee_rules(category_id)
        return jsonify({'fee_rules': rules}), 200
    except Exception as e:
        current_app.logger.error(f"Error fetching fee rules: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500


@admin_fee_config_bp.route('/api/admin/fee-rules', methods=['POST'])
@require_permission_v2('manage_fbo_fee_schedules')
def create_fee_rule():
    """Create or update a fee rule (upsert)."""
    try:
        if not request.json:
            return jsonify({'error': 'Invalid JSON in request body'}), 400
        loaded_data = create_fee_rule_schema.load(request.json)
        data = cast(Dict[str, Any], loaded_data)
        rule = AdminFeeConfigService.create_fee_rule(data)
        return jsonify(rule), 201
    except ValidationError as e:
        return jsonify({'error': 'Validation failed', 'messages': e.messages}), 400
    except ValueError as e:
        return jsonify({'error': str(e)}), 409
    except Exception as e:
        current_app.logger.error(f"Error creating fee rule: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500


@admin_fee_config_bp.route('/api/admin/fee-rules/<int:rule_id>', methods=['GET'])
@require_permission_v2('manage_fbo_fee_schedules')
def get_fee_rule(rule_id):
    """Get a single fee rule by ID."""
    try:
        rule = AdminFeeConfigService.get_fee_rule(rule_id)
        if not rule:
            return jsonify({'error': 'Fee rule not found'}), 404
        return jsonify(rule), 200
    except Exception as e:
        current_app.logger.error(f"Error fetching fee rule: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500


@admin_fee_config_bp.route('/api/admin/fee-rules/<int:rule_id>', methods=['PUT'])
@require_permission_v2('manage_fbo_fee_schedules')
def update_fee_rule(rule_id):
    """Update a fee rule."""
    try:
        if not request.json:
            return jsonify({'error': 'Invalid JSON in request body'}), 400
        loaded_data = update_fee_rule_schema.load(request.json)
        data = cast(Dict[str, Any], loaded_data)
        rule = AdminFeeConfigService.update_fee_rule(rule_id, data)
        if not rule:
            return jsonify({'error': 'Fee rule not found'}), 404
        return jsonify(rule), 200
    except ValidationError as e:
        return jsonify({'error': 'Validation failed', 'messages': e.messages}), 400
    except ValueError as e:
        return jsonify({'error': str(e)}), 409
    except Exception as e:
        current_app.logger.error(f"Error updating fee rule: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500


@admin_fee_config_bp.route('/api/admin/fee-rules/<int:rule_id>', methods=['DELETE'])
@require_permission_v2('manage_fbo_fee_schedules')
def delete_fee_rule(rule_id):
    """Delete a fee rule."""
    try:
        success = AdminFeeConfigService.delete_fee_rule(rule_id)
        if not success:
            return jsonify({'error': 'Fee rule not found'}), 404
        return '', 204
    except Exception as e:
        current_app.logger.error(f"Error deleting fee rule: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500


# Waiver Tiers Routes
@admin_fee_config_bp.route('/api/admin/waiver-tiers', methods=['GET'])
@require_permission_v2('manage_fbo_fee_schedules')
def get_waiver_tiers():
    """Get all waiver tiers."""
    try:
        tiers = AdminFeeConfigService.get_waiver_tiers()
        return jsonify({'waiver_tiers': tiers}), 200
    except Exception as e:
        current_app.logger.error(f"Error fetching waiver tiers: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500


@admin_fee_config_bp.route('/api/admin/waiver-tiers', methods=['POST'])
@require_permission_v2('manage_fbo_fee_schedules')
def create_waiver_tier():
    """Create a new waiver tier."""
    try:
        if not request.json:
            return jsonify({'error': 'Invalid JSON in request body'}), 400
        loaded_data = create_waiver_tier_schema.load(request.json)
        data = cast(Dict[str, Any], loaded_data)
        tier = AdminFeeConfigService.create_waiver_tier(data)
        return jsonify({'waiver_tier': tier}), 201
    except ValidationError as e:
        return jsonify({'error': 'Validation failed', 'messages': e.messages}), 400
    except Exception as e:
        current_app.logger.error(f"Error creating waiver tier: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500


@admin_fee_config_bp.route('/api/admin/waiver-tiers/<int:tier_id>', methods=['GET'])
@require_permission_v2('manage_fbo_fee_schedules')
def get_waiver_tier(tier_id):
    """Get a single waiver tier by ID."""
    try:
        tier = AdminFeeConfigService.get_waiver_tier(tier_id)
        if not tier:
            return jsonify({'error': 'Waiver tier not found'}), 404
        return jsonify({'waiver_tier': tier}), 200
    except Exception as e:
        current_app.logger.error(f"Error fetching waiver tier: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500


@admin_fee_config_bp.route('/api/admin/waiver-tiers/<int:tier_id>', methods=['PUT'])
@require_permission_v2('manage_fbo_fee_schedules')
def update_waiver_tier(tier_id):
    """Update a waiver tier."""
    try:
        if not request.json:
            return jsonify({'error': 'Invalid JSON in request body'}), 400
        loaded_data = update_waiver_tier_schema.load(request.json)
        data = cast(Dict[str, Any], loaded_data)
        tier = AdminFeeConfigService.update_waiver_tier(tier_id, data)
        if not tier:
            return jsonify({'error': 'Waiver tier not found'}), 404
        return jsonify({'waiver_tier': tier}), 200
    except ValidationError as e:
        return jsonify({'error': 'Validation failed', 'messages': e.messages}), 400
    except ValueError as e:
        return jsonify({'error': str(e)}), 409
    except Exception as e:
        current_app.logger.error(f"Error updating waiver tier: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500


@admin_fee_config_bp.route('/api/admin/waiver-tiers/<int:tier_id>', methods=['DELETE'])
@require_permission_v2('manage_fbo_fee_schedules')
def delete_waiver_tier(tier_id):
    """Delete a waiver tier."""
    try:
        success = AdminFeeConfigService.delete_waiver_tier(tier_id)
        if not success:
            return jsonify({'error': 'Waiver tier not found'}), 404
        return '', 204
    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        current_app.logger.error(f"Error deleting waiver tier: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500


@admin_fee_config_bp.route('/api/admin/waiver-tiers/reorder', methods=['PUT'])
@require_permission_v2('manage_fbo_fee_schedules')
def reorder_waiver_tiers():
    """Atomically reorder waiver tiers by updating their tier_priority values."""
    try:
        if not request.json:
            return jsonify({'error': 'Invalid JSON in request body'}), 400
        
        tier_updates = request.json.get('tier_updates')
        if not tier_updates:
            return jsonify({'error': 'Missing tier_updates in request body'}), 400
        
        result = AdminFeeConfigService.reorder_waiver_tiers(tier_updates)
        return jsonify(result), 200
    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        current_app.logger.error(f"Error reordering waiver tiers: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500


@admin_fee_config_bp.route('/api/admin/fee-schedule/consolidated', methods=['GET'])
@require_permission_v2('manage_fbo_fee_schedules')
def get_consolidated_fee_schedule():
    """Get a consolidated fee schedule."""
    try:
        schedule = AdminFeeConfigService.get_consolidated_fee_schedule()
        return jsonify(schedule), 200
    except Exception as e:
        current_app.logger.error(f"Error getting consolidated fee schedule: {e}")
        return jsonify({"error": "An internal error occurred"}), 500


@admin_fee_config_bp.route('/api/admin/fee-schedule/global', methods=['GET'])
@require_permission_v2('manage_fbo_fee_schedules')
def get_global_fee_schedule():
    """Get the entire global fee schedule for the admin UI."""
    try:
        schedule_data = AdminFeeConfigService.get_global_fee_schedule()
        return jsonify(schedule_data), 200
    except Exception as e:
        current_app.logger.error(f"Error getting global fee schedule: {e}")
        return jsonify({"error": "An internal error occurred"}), 500


@admin_fee_config_bp.route('/api/admin/fee-rule-overrides', methods=['PUT'])
@require_permission_v2('manage_fbo_fee_schedules')
def upsert_fee_rule_override():
    """Create or update a fee rule override."""
    data = request.get_json()
    if not data:
        return jsonify({"error": "Invalid JSON"}), 400
    
    try:
        override = AdminFeeConfigService.upsert_fee_rule_override(data)
        return jsonify(override), 200
    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        current_app.logger.error(f"Error upserting fee rule override: {e}")
        return jsonify({"error": "An internal error occurred"}), 500


@admin_fee_config_bp.route('/api/admin/fee-rule-overrides', methods=['DELETE'])
@require_permission_v2('manage_fbo_fee_schedules')
def delete_fee_rule_override():
    """Delete a fee rule override using query parameters."""
    # Get parameters from query string
    classification_id = request.args.get('classification_id', type=int)
    aircraft_type_id = request.args.get('aircraft_type_id', type=int)
    fee_rule_id = request.args.get('fee_rule_id', type=int)
    
    # Validate that fee_rule_id is present
    if fee_rule_id is None:
        return jsonify({"error": "Missing required parameter: fee_rule_id"}), 400
    
    # Validate that exactly one of classification_id or aircraft_type_id is present
    has_classification = classification_id is not None
    has_aircraft_type = aircraft_type_id is not None
    
    if not (has_classification ^ has_aircraft_type):  # XOR check
        return jsonify({"error": "Must specify either classification_id OR aircraft_type_id, but not both"}), 400

    # Construct data dictionary for service call
    data = {'fee_rule_id': fee_rule_id}
    if has_classification:
        data['classification_id'] = classification_id
    else:
        data['aircraft_type_id'] = aircraft_type_id

    try:
        result = AdminFeeConfigService.delete_fee_rule_override(data)
        return jsonify(result), 200
    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        current_app.logger.error(f"Error deleting fee rule override: {str(e)}")
        return jsonify({'error': 'A database error occurred'}), 500


@admin_fee_config_bp.route('/api/admin/aircraft-fee-setup', methods=['POST'])
@require_permission_v2('manage_fbo_fee_schedules')
def create_aircraft_fee_setup():
    """Create a new aircraft fee setup."""
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'Invalid JSON in request body'}), 400

        validated_data = create_aircraft_fee_setup_schema.load(data)
        validated_data = cast(Dict[str, Any], validated_data)

        new_setup = AdminFeeConfigService.create_aircraft_fee_setup(
            aircraft_type_name=validated_data['aircraft_type_name'],
            aircraft_classification_id=validated_data['aircraft_classification_id'],
            min_fuel_gallons=validated_data['min_fuel_gallons'],
            initial_ramp_fee_rule_id=validated_data.get('initial_ramp_fee_rule_id'),
            initial_ramp_fee_amount=validated_data.get('initial_ramp_fee_amount')
        )

        # Build response with proper schema serialization
        override_schema = FeeRuleOverrideSchema()
        
        response_data = {
            "message": new_setup.get("message", "Aircraft fee setup created successfully"),
            "aircraft_type": aircraft_type_schema.dump(new_setup['aircraft_type'])
        }

        if 'fee_rule_override' in new_setup and new_setup['fee_rule_override']:
            response_data['fee_rule_override'] = override_schema.dump(new_setup['fee_rule_override'])

        return jsonify(response_data), 201

    except ValidationError as err:
        return jsonify({'error': 'Validation failed', 'messages': err.messages}), 400
    except ValueError as e:
        return jsonify({'error': str(e)}), 409
    except Exception as e:
        current_app.logger.error(f"Error in create_aircraft_fee_setup: {e}")
        return jsonify({'error': 'An unexpected error occurred'}), 500


# Fuel Type Management Routes
@admin_fee_config_bp.route('/api/admin/fuel-types', methods=['GET'])
@require_permission_v2('manage_fuel_types')
def get_fuel_types():
    """Get all fuel types, optionally including inactive ones."""
    try:
        include_inactive = request.args.get('include_inactive', 'false').lower() == 'true'
        if include_inactive:
            fuel_types = AdminFeeConfigService.get_all_fuel_types()
        else:
            fuel_types = AdminFeeConfigService.get_all_active_fuel_types()
        return jsonify({'fuel_types': fuel_types}), 200
    except Exception as e:
        current_app.logger.error(f"Error fetching fuel types: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500


# Fuel Price Management Routes
@admin_fee_config_bp.route('/api/admin/fuel-prices', methods=['GET'])
@require_permission_v2('manage_fuel_prices')
def get_fuel_prices():
    """Get current fuel prices."""
    try:
        prices = AdminFeeConfigService.get_current_fuel_prices()
        return jsonify({'fuel_prices': prices}), 200
    except Exception as e:
        current_app.logger.error(f"Error fetching fuel prices: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500


@admin_fee_config_bp.route('/api/admin/fuel-prices', methods=['PUT'])
@require_permission_v2('manage_fuel_prices')
def set_fuel_prices():
    """Set current fuel prices."""
    try:
        if not request.json:
            return jsonify({'error': 'Invalid JSON in request body'}), 400
        
        prices_data = request.json.get('fuel_prices')
        if not prices_data:
            return jsonify({'error': 'Missing fuel_prices in request body'}), 400
        
        if not isinstance(prices_data, list):
            return jsonify({'error': 'fuel_prices must be an array'}), 400
        
        # Validate each price entry
        for price_entry in prices_data:
            if not isinstance(price_entry, dict):
                return jsonify({'error': 'Each fuel price entry must be an object'}), 400
            
            if 'fuel_type_id' not in price_entry or 'price' not in price_entry:
                return jsonify({'error': 'Each fuel price entry must have fuel_type_id and price fields'}), 400
            
            # Validate fuel_type_id is an integer
            try:
                int(price_entry['fuel_type_id'])
            except (ValueError, TypeError):
                return jsonify({'error': 'fuel_type_id must be a valid integer'}), 400
            
            # Validate price is a number
            try:
                float(price_entry['price'])
            except (ValueError, TypeError):
                fuel_type_id = price_entry.get('fuel_type_id', 'unknown')
                return jsonify({'error': f"Invalid price value for fuel type ID {fuel_type_id}"}), 400
        
        result = AdminFeeConfigService.set_current_fuel_prices(prices_data)
        return jsonify(result), 200
    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        current_app.logger.error(f"Error setting fuel prices: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500


# ==========================================
# Fee Schedule Versioning & Configuration Management
# ==========================================

@admin_fee_config_bp.route('/api/admin/fee-schedule/versions', methods=['GET'])
@require_permission_v2('manage_fbo_fee_schedules')
def get_fee_schedule_versions():
    """Get all fee schedule versions."""
    try:
        versions = FeeScheduleVersion.query.order_by(FeeScheduleVersion.created_at.desc()).all()
        versions_data = [version.to_dict() for version in versions]
        return jsonify({'versions': versions_data}), 200
    except Exception as e:
        current_app.logger.error(f"Error fetching fee schedule versions: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500


@admin_fee_config_bp.route('/api/admin/fee-schedule/versions', methods=['POST'])
@require_permission_v2('manage_fbo_fee_schedules')
def create_fee_schedule_version():
    """Create a new manual fee schedule version (snapshot)."""
    try:
        if not request.json:
            return jsonify({'error': 'Invalid JSON in request body'}), 400
        
        data = request.json
        version_name = data.get('version_name')
        description = data.get('description', '')
        
        if not version_name:
            return jsonify({'error': 'version_name is required'}), 400
        
        # Get current user ID from request context
        from flask import g
        if not getattr(g, 'current_user', None):
            return jsonify({'error': 'User authentication required'}), 401
        user_id = g.current_user.id
        
        # Create configuration snapshot
        snapshot_data = AdminFeeConfigService._create_configuration_snapshot()
        
        # Create version record
        version = FeeScheduleVersion(
            version_name=version_name,
            description=description,
            configuration_data=snapshot_data,
            version_type='manual',
            created_by_user_id=user_id
        )
        
        db.session.add(version)
        db.session.commit()
        
        return jsonify({
            'message': 'Version created successfully',
            'version': version.to_dict()
        }), 201
        
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error creating fee schedule version: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500


@admin_fee_config_bp.route('/api/admin/fee-schedule/versions/<int:version_id>/restore', methods=['POST'])
@require_permission_v2('manage_fbo_fee_schedules')
def restore_fee_schedule_version(version_id):
    """Restore fee configuration from a specific version."""
    try:
        AdminFeeConfigService.restore_from_version(version_id)
        return jsonify({'message': 'Configuration restored successfully'}), 200
    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        current_app.logger.error(f"Error restoring fee schedule version: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500


@admin_fee_config_bp.route('/api/admin/fee-schedule/import', methods=['POST'])
@require_permission_v2('manage_fbo_fee_schedules')
def import_fee_configuration():
    """Import fee configuration from uploaded JSON file."""
    try:
        if 'file' not in request.files:
            return jsonify({'error': 'No file provided'}), 400
        
        file = request.files['file']
        if file.filename == '' or file.filename is None:
            return jsonify({'error': 'No file selected'}), 400
        
        if not file.filename.lower().endswith('.json'):
            return jsonify({'error': 'File must be a JSON file'}), 400
        
        # Get current user ID from request context
        from flask import g
        if not getattr(g, 'current_user', None):
            return jsonify({'error': 'User authentication required'}), 401
        user_id = g.current_user.id
        
        # Import configuration
        AdminFeeConfigService.import_configuration_from_file(file.stream, user_id)
        
        return jsonify({
            'message': 'Configuration imported successfully. A backup of the previous state is available for 48 hours.'
        }), 200
        
    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        current_app.logger.error(f"Error importing fee configuration: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500


@admin_fee_config_bp.route('/api/admin/fee-schedule/export', methods=['GET'])
@require_permission_v2('manage_fbo_fee_schedules')
def export_fee_configuration():
    """Export current fee configuration as JSON file."""
    try:
        # Create configuration snapshot
        snapshot_data = AdminFeeConfigService._create_configuration_snapshot()
        
        # Create response with proper headers for file download
        from flask import make_response
        response = make_response(jsonify(snapshot_data))
        response.headers['Content-Type'] = 'application/json'
        response.headers['Content-Disposition'] = 'attachment; filename=fee_configuration_export.json'
        
        return response
        
    except Exception as e:
        current_app.logger.error(f"Error exporting fee configuration: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500
