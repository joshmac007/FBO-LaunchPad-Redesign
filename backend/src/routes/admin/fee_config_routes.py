"""Admin fee configuration routes for FBO-specific fee management."""

from flask import Blueprint, request, jsonify, current_app
from marshmallow import ValidationError
from typing import Dict, Any

from ...services.admin_fee_config_service import AdminFeeConfigService
from ...schemas.admin_fee_config_schemas import (
    AircraftTypeSchema, UpdateAircraftTypeFuelWaiverSchema,
    FeeCategorySchema, CreateFeeCategorySchema, UpdateFeeCategorySchema,
    AircraftTypeMappingSchema, CreateAircraftTypeMappingSchema, UpdateAircraftTypeMappingSchema,
    CSVUploadResultSchema,
    FeeRuleSchema, CreateFeeRuleSchema, UpdateFeeRuleSchema,
    WaiverTierSchema, CreateWaiverTierSchema, UpdateWaiverTierSchema,
    CreateAircraftFeeSetupSchema
)
from ...utils.enhanced_auth_decorators_v2 import require_permission_v2

# Create Blueprint
admin_fee_config_bp = Blueprint('admin_fee_config', __name__)

# Schema instances
aircraft_type_schema = AircraftTypeSchema()
aircraft_type_list_schema = AircraftTypeSchema(many=True)
update_aircraft_type_fuel_waiver_schema = UpdateAircraftTypeFuelWaiverSchema()

fee_category_schema = FeeCategorySchema()
fee_category_list_schema = FeeCategorySchema(many=True)
create_fee_category_schema = CreateFeeCategorySchema()
update_fee_category_schema = UpdateFeeCategorySchema()

aircraft_type_mapping_schema = AircraftTypeMappingSchema()
aircraft_type_mapping_list_schema = AircraftTypeMappingSchema(many=True)
create_aircraft_type_mapping_schema = CreateAircraftTypeMappingSchema()
update_aircraft_type_mapping_schema = UpdateAircraftTypeMappingSchema()
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
@admin_fee_config_bp.route('/api/admin/fbo/<int:fbo_id>/aircraft-types', methods=['GET'])
@require_permission_v2('manage_fbo_fee_schedules')
def get_aircraft_types(fbo_id):
    """Get all aircraft types with base min fuel for waiver."""
    try:
        aircraft_types = AdminFeeConfigService.get_aircraft_types(fbo_id)
        return jsonify({'aircraft_types': aircraft_types}), 200
    except Exception as e:
        current_app.logger.error(f"Error fetching aircraft types: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500


@admin_fee_config_bp.route('/api/admin/fbo/<int:fbo_id>/aircraft-types/<int:aircraft_type_id>', methods=['PUT'])
@require_permission_v2('manage_fbo_fee_schedules')
def update_aircraft_type_fuel_waiver(fbo_id, aircraft_type_id):
    """Update base min fuel for waiver for a specific aircraft type."""
    try:
        if not request.json:
            return jsonify({'error': 'Invalid JSON in request body'}), 400
        data = update_aircraft_type_fuel_waiver_schema.load(request.json)  # type: ignore
        result = AdminFeeConfigService.update_aircraft_type_fuel_waiver(
            fbo_id,
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


# Fee Categories Routes
@admin_fee_config_bp.route('/api/admin/fbo/<int:fbo_id>/fee-categories', methods=['GET'])
@require_permission_v2('manage_fbo_fee_schedules')
def get_fee_categories(fbo_id):
    """Get all fee categories for a specific FBO."""
    try:
        categories = AdminFeeConfigService.get_fee_categories(fbo_id)
        return jsonify({'fee_categories': categories}), 200
    except Exception as e:
        current_app.logger.error(f"Error fetching fee categories: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500


@admin_fee_config_bp.route('/api/admin/fbo/<int:fbo_id>/fee-categories/<int:category_id>', methods=['GET'])
@require_permission_v2('manage_fbo_fee_schedules')
def get_fee_category(fbo_id, category_id):
    """Get a single fee category by ID for a specific FBO."""
    try:
        category = AdminFeeConfigService.get_fee_category(fbo_id, category_id)
        if not category:
            return jsonify({'error': 'Fee category not found'}), 404
        return jsonify({'fee_category': category}), 200
    except Exception as e:
        current_app.logger.error(f"Error fetching fee category: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500


@admin_fee_config_bp.route('/api/admin/fbo/<int:fbo_id>/fee-categories', methods=['POST'])
@require_permission_v2('manage_fbo_fee_schedules')
def create_fee_category(fbo_id):
    """Create a new fee category for a specific FBO."""
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
        data = create_fee_category_schema.load(json_data)
        category = AdminFeeConfigService.create_fee_category(fbo_id, data['name'])  # type: ignore
        return jsonify(category), 201
    except ValidationError as e:
        return jsonify({'error': 'Validation failed', 'messages': e.messages}), 400
    except ValueError as e:
        return jsonify({'error': str(e)}), 409
    except Exception as e:
        current_app.logger.error(f"Error creating fee category: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500


@admin_fee_config_bp.route('/api/admin/fbo/<int:fbo_id>/fee-categories/<int:category_id>', methods=['PUT'])
@require_permission_v2('manage_fbo_fee_schedules')
def update_fee_category(fbo_id, category_id):
    """Update a fee category for a specific FBO."""
    try:
        if not request.json:
            return jsonify({'error': 'Invalid JSON in request body'}), 400
        data = update_fee_category_schema.load(request.json)  # type: ignore
        category = AdminFeeConfigService.update_fee_category(fbo_id, category_id, data['name'])
        if not category:
            return jsonify({'error': 'Fee category not found'}), 404
        return jsonify({'fee_category': category}), 200
    except ValidationError as e:
        return jsonify({'error': 'Validation failed', 'messages': e.messages}), 400
    except ValueError as e:
        return jsonify({'error': str(e)}), 409
    except Exception as e:
        current_app.logger.error(f"Error updating fee category: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500


@admin_fee_config_bp.route('/api/admin/fbo/<int:fbo_id>/fee-categories/<int:category_id>', methods=['DELETE'])
@require_permission_v2('manage_fbo_fee_schedules')
def delete_fee_category(fbo_id, category_id):
    """Delete a fee category for a specific FBO."""
    try:
        success = AdminFeeConfigService.delete_fee_category(fbo_id, category_id)
        if not success:
            return jsonify({'error': 'Fee category not found'}), 404
        return '', 204
    except ValueError as e:
        return jsonify({'error': str(e)}), 409
    except Exception as e:
        current_app.logger.error(f"Error deleting fee category: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500


# Aircraft Type to Fee Category Mapping Routes
@admin_fee_config_bp.route('/api/admin/fbo/<int:fbo_id>/aircraft-type-mappings', methods=['GET'])
@require_permission_v2('manage_fbo_fee_schedules')
def get_aircraft_type_mappings(fbo_id):
    """Get all aircraft type to fee category mappings for a specific FBO, optionally filtered by fee category."""
    try:
        category_id = request.args.get('fee_category_id', type=int)
        mappings = AdminFeeConfigService.get_aircraft_type_mappings(fbo_id, category_id)
        return jsonify(mappings), 200
    except Exception as e:
        current_app.logger.error(f"Error fetching aircraft type mappings: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500


@admin_fee_config_bp.route('/api/admin/fbo/<int:fbo_id>/aircraft-type-mappings', methods=['POST'])
@require_permission_v2('manage_fbo_fee_schedules')
def create_aircraft_type_mapping(fbo_id):
    """Create a new aircraft type to fee category mapping."""
    try:
        if not request.json:
            return jsonify({'error': 'Invalid JSON in request body'}), 400
        data = create_aircraft_type_mapping_schema.load(request.json)  # type: ignore
        mapping = AdminFeeConfigService.create_aircraft_type_mapping(
            fbo_id, 
            data['aircraft_type_id'], 
            data['fee_category_id']
        )
        return jsonify(mapping), 201
    except ValidationError as e:
        return jsonify({'error': 'Validation failed', 'messages': e.messages}), 400
    except ValueError as e:
        return jsonify({'error': str(e)}), 409
    except Exception as e:
        current_app.logger.error(f"Error creating aircraft type mapping: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500


@admin_fee_config_bp.route('/api/admin/fbo/<int:fbo_id>/aircraft-type-mappings/<int:mapping_id>', methods=['PUT'])
@require_permission_v2('manage_fbo_fee_schedules')
def update_aircraft_type_mapping(fbo_id, mapping_id):
    """Update an aircraft type to fee category mapping."""
    try:
        if not request.json:
            return jsonify({'error': 'Invalid JSON in request body'}), 400
        data = update_aircraft_type_mapping_schema.load(request.json)  # type: ignore
        mapping = AdminFeeConfigService.update_aircraft_type_mapping(
            fbo_id, 
            mapping_id, 
            data['fee_category_id']
        )
        if not mapping:
            return jsonify({'error': 'Aircraft type mapping not found'}), 404
        return jsonify(mapping), 200
    except ValidationError as e:
        return jsonify({'error': 'Validation failed', 'messages': e.messages}), 400
    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        current_app.logger.error(f"Error updating aircraft type mapping: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500


@admin_fee_config_bp.route('/api/admin/fbo/<int:fbo_id>/aircraft-type-mappings/<int:mapping_id>', methods=['DELETE'])
@require_permission_v2('manage_fbo_fee_schedules')
def delete_aircraft_type_mapping(fbo_id, mapping_id):
    """Delete an aircraft type to fee category mapping."""
    try:
        success = AdminFeeConfigService.delete_aircraft_type_mapping(fbo_id, mapping_id)
        if not success:
            return jsonify({'error': 'Aircraft type mapping not found'}), 404
        return '', 204
    except Exception as e:
        current_app.logger.error(f"Error deleting aircraft type mapping: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500


@admin_fee_config_bp.route('/api/admin/fbo/<int:fbo_id>/aircraft-type-mappings/upload-csv', methods=['POST'])
@require_permission_v2('manage_fbo_fee_schedules')
def upload_aircraft_type_mappings_csv(fbo_id):
    """Upload CSV file for aircraft type to fee category mappings."""
    try:
        if 'file' not in request.files:
            return jsonify({'error': 'No file provided'}), 400
        
        file = request.files['file']
        if file.filename == '' or file.filename is None:
            return jsonify({'error': 'No file selected'}), 400
        
        if not file.filename.endswith('.csv'):
            return jsonify({'error': 'File must be a CSV'}), 400
        
        csv_content = file.read().decode('utf-8')
        result = AdminFeeConfigService.upload_aircraft_type_mappings_csv(fbo_id, csv_content)
        return jsonify(result), 200
    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        current_app.logger.error(f"Error uploading CSV: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500


# Fee Rules Routes
@admin_fee_config_bp.route('/api/admin/fbo/<int:fbo_id>/fee-rules', methods=['GET'])
@require_permission_v2('manage_fbo_fee_schedules')
def get_fee_rules(fbo_id):
    """Get all fee rules for a specific FBO, optionally filtered by fee category."""
    try:
        category_id = request.args.get('applies_to_fee_category_id', type=int)
        rules = AdminFeeConfigService.get_fee_rules(fbo_id, category_id)
        return jsonify({'fee_rules': rules}), 200
    except Exception as e:
        current_app.logger.error(f"Error fetching fee rules: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500


@admin_fee_config_bp.route('/api/admin/fbo/<int:fbo_id>/fee-rules', methods=['POST'])
@require_permission_v2('manage_fbo_fee_schedules')
def create_fee_rule(fbo_id):
    """Create a new fee rule for a specific FBO."""
    try:
        if not request.json:
            return jsonify({'error': 'Invalid JSON in request body'}), 400
        data = create_fee_rule_schema.load(request.json)  # type: ignore
        rule = AdminFeeConfigService.create_fee_rule(fbo_id, data)
        return jsonify({'fee_rule': rule}), 201
    except ValidationError as e:
        return jsonify({'error': 'Validation failed', 'messages': e.messages}), 400
    except ValueError as e:
        return jsonify({'error': str(e)}), 409
    except Exception as e:
        current_app.logger.error(f"Error creating fee rule: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500


@admin_fee_config_bp.route('/api/admin/fbo/<int:fbo_id>/fee-rules/<int:rule_id>', methods=['GET'])
@require_permission_v2('manage_fbo_fee_schedules')
def get_fee_rule(fbo_id, rule_id):
    """Get a single fee rule by ID for a specific FBO."""
    try:
        rule = AdminFeeConfigService.get_fee_rule(fbo_id, rule_id)
        if not rule:
            return jsonify({'error': 'Fee rule not found'}), 404
        return jsonify({'fee_rule': rule}), 200
    except Exception as e:
        current_app.logger.error(f"Error fetching fee rule: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500


@admin_fee_config_bp.route('/api/admin/fbo/<int:fbo_id>/fee-rules/<int:rule_id>', methods=['PUT'])
@require_permission_v2('manage_fbo_fee_schedules')
def update_fee_rule(fbo_id, rule_id):
    """Update a fee rule for a specific FBO."""
    try:
        if not request.json:
            return jsonify({'error': 'Invalid JSON in request body'}), 400
        data = update_fee_rule_schema.load(request.json)  # type: ignore
        rule = AdminFeeConfigService.update_fee_rule(fbo_id, rule_id, data)
        if not rule:
            return jsonify({'error': 'Fee rule not found'}), 404
        return jsonify({'fee_rule': rule}), 200
    except ValidationError as e:
        return jsonify({'error': 'Validation failed', 'messages': e.messages}), 400
    except ValueError as e:
        return jsonify({'error': str(e)}), 409
    except Exception as e:
        current_app.logger.error(f"Error updating fee rule: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500


@admin_fee_config_bp.route('/api/admin/fbo/<int:fbo_id>/fee-rules/<int:rule_id>', methods=['DELETE'])
@require_permission_v2('manage_fbo_fee_schedules')
def delete_fee_rule(fbo_id, rule_id):
    """Delete a fee rule for a specific FBO."""
    try:
        success = AdminFeeConfigService.delete_fee_rule(fbo_id, rule_id)
        if not success:
            return jsonify({'error': 'Fee rule not found'}), 404
        return '', 204
    except Exception as e:
        current_app.logger.error(f"Error deleting fee rule: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500


# Waiver Tiers Routes
@admin_fee_config_bp.route('/api/admin/fbo/<int:fbo_id>/waiver-tiers', methods=['GET'])
@require_permission_v2('manage_fbo_fee_schedules')
def get_waiver_tiers(fbo_id):
    """Get all waiver tiers for a specific FBO."""
    try:
        tiers = AdminFeeConfigService.get_waiver_tiers(fbo_id)
        return jsonify({'waiver_tiers': tiers}), 200
    except Exception as e:
        current_app.logger.error(f"Error fetching waiver tiers: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500


@admin_fee_config_bp.route('/api/admin/fbo/<int:fbo_id>/waiver-tiers', methods=['POST'])
@require_permission_v2('manage_fbo_fee_schedules')
def create_waiver_tier(fbo_id):
    """Create a new waiver tier for a specific FBO."""
    try:
        if not request.json:
            return jsonify({'error': 'Invalid JSON in request body'}), 400
        data = create_waiver_tier_schema.load(request.json)  # type: ignore
        tier = AdminFeeConfigService.create_waiver_tier(fbo_id, data)
        return jsonify({'waiver_tier': tier}), 201
    except ValidationError as e:
        return jsonify({'error': 'Validation failed', 'messages': e.messages}), 400
    except Exception as e:
        current_app.logger.error(f"Error creating waiver tier: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500


@admin_fee_config_bp.route('/api/admin/fbo/<int:fbo_id>/waiver-tiers/<int:tier_id>', methods=['GET'])
@require_permission_v2('manage_fbo_fee_schedules')
def get_waiver_tier(fbo_id, tier_id):
    """Get a single waiver tier by ID for a specific FBO."""
    try:
        tier = AdminFeeConfigService.get_waiver_tier(fbo_id, tier_id)
        if not tier:
            return jsonify({'error': 'Waiver tier not found'}), 404
        return jsonify({'waiver_tier': tier}), 200
    except Exception as e:
        current_app.logger.error(f"Error fetching waiver tier: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500


@admin_fee_config_bp.route('/api/admin/fbo/<int:fbo_id>/waiver-tiers/<int:tier_id>', methods=['PUT'])
@require_permission_v2('manage_fbo_fee_schedules')
def update_waiver_tier(fbo_id, tier_id):
    """Update a waiver tier for a specific FBO."""
    try:
        if not request.json:
            return jsonify({'error': 'Invalid JSON in request body'}), 400
        data = update_waiver_tier_schema.load(request.json)  # type: ignore
        tier = AdminFeeConfigService.update_waiver_tier(fbo_id, tier_id, data)
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


@admin_fee_config_bp.route('/api/admin/fbo/<int:fbo_id>/waiver-tiers/<int:tier_id>', methods=['DELETE'])
@require_permission_v2('manage_fbo_fee_schedules')
def delete_waiver_tier(fbo_id, tier_id):
    """Delete a waiver tier for a specific FBO."""
    try:
        success = AdminFeeConfigService.delete_waiver_tier(fbo_id, tier_id)
        if not success:
            return jsonify({'error': 'Waiver tier not found'}), 404
        return '', 204
    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        current_app.logger.error(f"Error deleting waiver tier: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500


@admin_fee_config_bp.route('/api/admin/fbo/<int:fbo_id>/fee-schedule/consolidated', methods=['GET'])
@require_permission_v2('manage_fbo_fee_schedules')
def get_consolidated_fee_schedule(fbo_id):
    """Get a consolidated fee schedule for the FBO."""
    try:
        schedule = AdminFeeConfigService.get_consolidated_fee_schedule(fbo_id)
        return jsonify(schedule), 200
    except Exception as e:
        current_app.logger.error(f"Error getting consolidated fee schedule: {e}")
        return jsonify({"error": "An internal error occurred"}), 500


@admin_fee_config_bp.route('/api/admin/fbo/<int:fbo_id>/fee-rule-overrides', methods=['PUT'])
@require_permission_v2('manage_fbo_fee_schedules')
def upsert_fee_rule_override(fbo_id):
    """Create or update a fee rule override."""
    data = request.get_json()
    if not data:
        return jsonify({"error": "Invalid JSON"}), 400
    
    # Add fbo_id from URL to the data
    data['fbo_location_id'] = fbo_id
    
    try:
        override = AdminFeeConfigService.upsert_fee_rule_override(data)
        return jsonify(override), 200
    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        current_app.logger.error(f"Error upserting fee rule override: {e}")
        return jsonify({"error": "An internal error occurred"}), 500


@admin_fee_config_bp.route('/api/admin/fbo/<int:fbo_id>/fee-rule-overrides', methods=['DELETE'])
@require_permission_v2('manage_fbo_fee_schedules')
def delete_fee_rule_override(fbo_id):
    """Delete a fee rule override."""
    data = request.get_json()
    if not data:
        return jsonify({"error": "Invalid JSON"}), 400

    # Add fbo_id from URL to the data
    data['fbo_location_id'] = fbo_id

    try:
        result = AdminFeeConfigService.delete_fee_rule_override(data)
        return jsonify(result), 200
    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        current_app.logger.error(f"Error deleting fee rule override: {str(e)}")
        return jsonify({'error': 'A database error occurred'}), 500


@admin_fee_config_bp.route('/api/admin/fbo/<int:fbo_id>/aircraft-fee-setup', methods=['POST'])
@require_permission_v2('manage_fbo_fee_schedules')
def create_aircraft_fee_setup(fbo_id):
    """Create a new aircraft type, map it to a fee category, and set its min fuel."""
    try:
        if not request.json:
            return jsonify({'error': 'Invalid JSON in request body'}), 400
        
        data = create_aircraft_fee_setup_schema.load(request.json)
        
        result = AdminFeeConfigService.create_aircraft_fee_setup(
            fbo_location_id=fbo_id,
            aircraft_type_name=data['aircraft_type_name'],
            fee_category_id=data['fee_category_id'],
            min_fuel_gallons=data['min_fuel_gallons']
        )
        return jsonify(result), 201
    except ValidationError as e:
        return jsonify({'error': 'Validation failed', 'messages': e.messages}), 400
    except ValueError as e:
        return jsonify({'error': str(e)}), 409 # Using 409 for logical conflicts
    except Exception as e:
        current_app.logger.error(f"Error in aircraft fee setup: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500 