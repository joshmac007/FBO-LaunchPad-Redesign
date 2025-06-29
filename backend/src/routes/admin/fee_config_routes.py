"""Admin fee configuration routes for FBO-specific fee management."""

import logging
from flask import Blueprint, request, jsonify, current_app
from marshmallow import ValidationError
from typing import Dict, Any, cast

from ...services.admin_fee_config_service import AdminFeeConfigService
from ...schemas.admin_fee_config_schemas import (
    AircraftTypeSchema, UpdateAircraftTypeFuelWaiverSchema,
    AircraftClassificationSchema, CreateAircraftClassificationSchema, UpdateAircraftClassificationSchema,
    AircraftTypeMappingSchema, CreateAircraftTypeMappingSchema, UpdateAircraftTypeMappingSchema,
    CSVUploadResultSchema,
    FeeRuleSchema, CreateFeeRuleSchema, UpdateFeeRuleSchema,
    WaiverTierSchema, CreateWaiverTierSchema, UpdateWaiverTierSchema,
    CreateAircraftFeeSetupSchema, FBOAircraftTypeConfigSchema, 
    FeeRuleOverrideSchema
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
        loaded_data = update_aircraft_type_fuel_waiver_schema.load(request.json)
        data = cast(Dict[str, Any], loaded_data)
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
        return jsonify(update_aircraft_type_mapping_schema.dump(updated_mapping))
    except ValueError as e:
        return jsonify({"error": str(e)}), 404
    except Exception as e:
        current_app.logger.error(f"Error updating aircraft type classification: {e}")
        return jsonify({"error": "An unexpected error occurred"}), 500


# Legacy FBO-scoped routes for backward compatibility
@admin_fee_config_bp.route('/api/admin/fbo/<int:fbo_id>/fee-categories', methods=['GET'])
@require_permission_v2('manage_fbo_fee_schedules')
def get_fee_categories_legacy(fbo_id):
    """Legacy route - Get all aircraft classifications (ignores FBO ID)."""
    logger.warning(
        "DEPRECATED ROUTE: /api/admin/fbo/.../fee-categories is deprecated. "
        "Use the global /api/admin/aircraft-classifications endpoint instead."
    )
    try:
        classifications = AdminFeeConfigService.get_aircraft_classifications()
        return jsonify({'fee_categories': classifications}), 200
    except Exception as e:
        current_app.logger.error(f"Error fetching aircraft classifications: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500


@admin_fee_config_bp.route('/api/admin/fbo/<int:fbo_id>/fee-categories/<int:category_id>', methods=['GET'])
@require_permission_v2('manage_fbo_fee_schedules')
def get_aircraft_classification_legacy(fbo_id, category_id):
    """Legacy route - Get a single aircraft classification by ID (ignores FBO ID)."""
    logger.warning(
        f"DEPRECATED ROUTE: /api/admin/fbo/{fbo_id}/fee-categories/{category_id} is deprecated. "
        f"Use /api/admin/aircraft-classifications/{category_id} instead."
    )
    try:
        classification = AdminFeeConfigService.get_aircraft_classification_by_id(category_id)
        if not classification:
            return jsonify({'error': 'Aircraft classification not found'}), 404
        return jsonify({'aircraft_classification': classification}), 200
    except Exception as e:
        current_app.logger.error(f"Error fetching aircraft classification: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500


@admin_fee_config_bp.route('/api/admin/fbo/<int:fbo_id>/fee-categories', methods=['POST'])
@require_permission_v2('manage_fbo_fee_schedules')
def create_aircraft_classification_legacy(fbo_id):
    """Legacy route - Create a new aircraft classification (ignores FBO ID)."""
    logger.warning(
        f"DEPRECATED ROUTE: /api/admin/fbo/{fbo_id}/fee-categories is deprecated. "
        "Use /api/admin/aircraft-classifications instead."
    )
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


@admin_fee_config_bp.route('/api/admin/fbo/<int:fbo_id>/fee-categories/<int:category_id>', methods=['PUT'])
@require_permission_v2('manage_fbo_fee_schedules')
def update_aircraft_classification_legacy(fbo_id, category_id):
    """Legacy route - Update an aircraft classification (ignores FBO ID)."""
    logger.warning(
        f"DEPRECATED ROUTE: /api/admin/fbo/{fbo_id}/fee-categories/{category_id} is deprecated. "
        f"Use /api/admin/aircraft-classifications/{category_id} instead."
    )
    try:
        if not request.json:
            return jsonify({'error': 'Invalid JSON in request body'}), 400
        loaded_data = update_aircraft_classification_schema.load(request.json)
        data = cast(Dict[str, Any], loaded_data)
        classification = AdminFeeConfigService.update_aircraft_classification(category_id, data['name'])
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


@admin_fee_config_bp.route('/api/admin/fbo/<int:fbo_id>/fee-categories/<int:category_id>', methods=['DELETE'])
@require_permission_v2('manage_fbo_fee_schedules')
def delete_aircraft_classification_legacy(fbo_id, category_id):
    """Legacy route - Delete an aircraft classification (ignores FBO ID)."""
    logger.warning(
        f"DEPRECATED ROUTE: /api/admin/fbo/{fbo_id}/fee-categories/{category_id} is deprecated. "
        f"Use /api/admin/aircraft-classifications/{category_id} instead."
    )
    try:
        success = AdminFeeConfigService.delete_aircraft_classification(category_id)
        if not success:
            return jsonify({'error': 'Aircraft classification not found'}), 404
        return '', 204
    except ValueError as e:
        return jsonify({'error': str(e)}), 409
    except Exception as e:
        current_app.logger.error(f"Error deleting aircraft classification: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500


@admin_fee_config_bp.route('/api/admin/fbo/<int:fbo_id>/fee-categories/general', methods=['GET'])
@require_permission_v2('manage_fbo_fee_schedules')
def get_general_aircraft_classification_legacy(fbo_id):
    """Legacy route - Get or create the 'General' aircraft classification (ignores FBO ID)."""
    logger.warning(
        f"DEPRECATED ROUTE: /api/admin/fbo/{fbo_id}/fee-categories/general is deprecated. "
        "Use /api/admin/aircraft-classifications/general instead."
    )
    try:
        classification = AdminFeeConfigService.get_or_create_general_aircraft_classification()
        return jsonify({'aircraft_classification': classification}), 200
    except Exception as e:
        current_app.logger.error(f"Error getting/creating general aircraft classification: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500


# Aircraft Type to Fee Category Mapping Routes
@admin_fee_config_bp.route('/api/admin/fbo/<int:fbo_id>/aircraft-type-mappings', methods=['GET'])
@require_permission_v2('manage_fbo_fee_schedules')
def get_aircraft_type_mappings(fbo_id):
    """Get all aircraft type to fee category mappings for a specific FBO, optionally filtered by fee category."""
    try:
        category_id = request.args.get('aircraft_classification_id', type=int)
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
        loaded_data = create_aircraft_type_mapping_schema.load(request.json)
        data = cast(Dict[str, Any], loaded_data)
        mapping = AdminFeeConfigService.create_aircraft_type_mapping(
            fbo_id, 
            data['aircraft_type_id'], 
            data['aircraft_classification_id']
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
        loaded_data = update_aircraft_type_mapping_schema.load(request.json)
        data = cast(Dict[str, Any], loaded_data)
        mapping = AdminFeeConfigService.update_aircraft_type_mapping(
            fbo_id, 
            mapping_id, 
            data['aircraft_classification_id']
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
        category_id = request.args.get('applies_to_aircraft_classification_id', type=int)
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
        loaded_data = create_fee_rule_schema.load(request.json)
        data = cast(Dict[str, Any], loaded_data)
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
        loaded_data = update_fee_rule_schema.load(request.json)
        data = cast(Dict[str, Any], loaded_data)
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
        loaded_data = create_waiver_tier_schema.load(request.json)
        data = cast(Dict[str, Any], loaded_data)
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
        loaded_data = update_waiver_tier_schema.load(request.json)
        data = cast(Dict[str, Any], loaded_data)
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


@admin_fee_config_bp.route('/api/admin/fbo/<int:fbo_id>/waiver-tiers/reorder', methods=['PUT'])
@require_permission_v2('manage_fbo_fee_schedules')
def reorder_waiver_tiers(fbo_id):
    """Atomically reorder waiver tiers by updating their tier_priority values."""
    try:
        if not request.json:
            return jsonify({'error': 'Invalid JSON in request body'}), 400
        
        tier_updates = request.json.get('tier_updates')
        if not tier_updates:
            return jsonify({'error': 'Missing tier_updates in request body'}), 400
        
        result = AdminFeeConfigService.reorder_waiver_tiers(fbo_id, tier_updates)
        return jsonify(result), 200
    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        current_app.logger.error(f"Error reordering waiver tiers: {str(e)}")
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
    """Delete a fee rule override using query parameters."""
    # Get required parameters from query string
    aircraft_type_id = request.args.get('aircraft_type_id', type=int)
    fee_rule_id = request.args.get('fee_rule_id', type=int)
    
    # Validate that both parameters are present
    if aircraft_type_id is None:
        return jsonify({"error": "Missing required parameter: aircraft_type_id"}), 400
    if fee_rule_id is None:
        return jsonify({"error": "Missing required parameter: fee_rule_id"}), 400

    # Construct data dictionary for service call
    data = {
        'fbo_location_id': fbo_id,
        'aircraft_type_id': aircraft_type_id,
        'fee_rule_id': fee_rule_id
    }

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
    """Create a new aircraft fee setup for an FBO."""
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'Invalid JSON in request body'}), 400

        validated_data = create_aircraft_fee_setup_schema.load(data)
        validated_data = cast(Dict[str, Any], validated_data)

        new_setup = AdminFeeConfigService.create_aircraft_fee_setup(
            fbo_location_id=fbo_id,
            aircraft_type_name=validated_data['aircraft_type_name'],
            aircraft_classification_id=validated_data['aircraft_classification_id'],
            min_fuel_gallons=validated_data['min_fuel_gallons'],
            initial_ramp_fee_rule_id=validated_data.get('initial_ramp_fee_rule_id'),
            initial_ramp_fee_amount=validated_data.get('initial_ramp_fee_amount')
        )

        # Build response with proper schema serialization
        fbo_config_schema = FBOAircraftTypeConfigSchema()
        override_schema = FeeRuleOverrideSchema()
        
        response_data = {
            "message": new_setup.get("message", "Aircraft fee setup created successfully"),
            "fbo_aircraft_config": fbo_config_schema.dump(new_setup['fbo_aircraft_config']),
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
        current_app.logger.error(f"Error in create_aircraft_fee_setup for fbo_id {fbo_id}: {e}")
        return jsonify({'error': 'An unexpected error occurred'}), 500


# Fuel Type Management Routes
@admin_fee_config_bp.route('/api/admin/fbo/<int:fbo_id>/fuel-types', methods=['GET'])
@require_permission_v2('manage_fbo_fee_schedules')
def get_fuel_types(fbo_id: int):
    """Get all active fuel types."""
    try:
        fuel_types = AdminFeeConfigService.get_all_active_fuel_types()
        return jsonify({'fuel_types': fuel_types}), 200
    except Exception as e:
        current_app.logger.error(f"Error fetching fuel types: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500


# Fuel Price Management Routes
@admin_fee_config_bp.route('/api/admin/fbo/<int:fbo_id>/fuel-prices', methods=['GET'])
@require_permission_v2('manage_fuel_prices')
def get_fuel_prices(fbo_id):
    """Get current fuel prices for a specific FBO."""
    try:
        prices = AdminFeeConfigService.get_current_fuel_prices(fbo_id)
        return jsonify({'fuel_prices': prices}), 200
    except Exception as e:
        current_app.logger.error(f"Error fetching fuel prices: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500


@admin_fee_config_bp.route('/api/admin/fbo/<int:fbo_id>/fuel-prices', methods=['PUT'])
@require_permission_v2('manage_fuel_prices')
def set_fuel_prices(fbo_id):
    """Set current fuel prices for a specific FBO."""
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
        
        result = AdminFeeConfigService.set_current_fuel_prices(fbo_id, prices_data)
        return jsonify(result), 200
    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        current_app.logger.error(f"Error setting fuel prices: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500


# Aircraft Classification Mapping Routes (Refactored)
@admin_fee_config_bp.route('/api/admin/fbo/<int:fbo_id>/aircraft-classification-mappings/by-type/<int:aircraft_type_id>', methods=['PUT'])
@require_permission_v2('manage_fbo_fee_schedules')
def update_or_create_mapping_by_type(fbo_id, aircraft_type_id):
    """
    DEPRECATED: Updates or creates an aircraft type mapping for a given FBO and aircraft type.
    This route is intended to simplify moving an aircraft type to a new classification.
    """
    logger.warning(
        f"DEPRECATED: PUT /api/admin/fbo/{fbo_id}/aircraft-classification-mappings/by-type/{aircraft_type_id} is deprecated. "
        f"Use PUT /api/admin/aircraft-types/{aircraft_type_id}/classification instead. "
        "Aircraft classification mappings are now global resources."
    )
    data = request.get_json()
    if not data or 'classification_id' not in data:
        return jsonify({'error': 'Missing classification_id in request body'}), 400

    try:
        classification_id = int(data['classification_id'])
        updated_mapping = AdminFeeConfigService.update_aircraft_type_classification(
            aircraft_type_id=aircraft_type_id,
            aircraft_classification_id=classification_id
        )
        return jsonify(update_aircraft_type_mapping_schema.dump(updated_mapping))
    except ValueError as e:
        return jsonify({'error': str(e)}), 404
    except Exception as e:
        current_app.logger.error(f"Error updating aircraft type classification: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500 