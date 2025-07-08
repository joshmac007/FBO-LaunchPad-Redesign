"""
Admin routes for fuel type management.

This module provides REST API endpoints for managing fuel types, including
full CRUD operations with proper authentication and authorization.
"""

from flask import request, jsonify, current_app
from marshmallow import ValidationError
from ...services.fuel_type_admin_service import FuelTypeAdminService
from src.utils.enhanced_auth_decorators_v2 import require_permission_v2
from ...schemas.fuel_type_schemas import (
    FuelTypeSchema,
    CreateFuelTypeSchema,
    UpdateFuelTypeSchema
)
from ...schemas import ErrorResponseSchema
from .routes import admin_bp


@admin_bp.route('/management/fuel-types', methods=['GET'])
@require_permission_v2('manage_fuel_types')
def get_admin_fuel_types():
    """
    Get all fuel types for admin dashboard.
    
    Returns all fuel types with optional filtering for inactive types.
    
    ---
    tags:
      - Admin - Fuel Types
    security:
      - bearerAuth: []
    parameters:
      - in: query
        name: include_inactive
        schema:
          type: boolean
          default: false
        description: Include inactive fuel types in the response
    responses:
      200:
        description: List of fuel types retrieved successfully
        content:
          application/json:
            schema:
              type: object
              properties:
                fuel_types:
                  type: array
                  items:
                    $ref: '#/components/schemas/FuelType'
                message:
                  type: string
      401:
        description: Unauthorized
      403:
        description: Forbidden (missing permission)
      500:
        description: Server error
    """
    try:
        include_inactive = request.args.get('include_inactive', 'false').lower() == 'true'
        
        fuel_types, message, status_code = FuelTypeAdminService.get_all_fuel_types(include_inactive)
        
        if status_code == 200:
            return jsonify({
                'fuel_types': fuel_types,
                'message': message
            }), status_code
        else:
            return jsonify({'error': message}), status_code
            
    except Exception as e:
        current_app.logger.error(f"Error in get_admin_fuel_types: {str(e)}")
        return jsonify({'error': 'Failed to retrieve fuel types'}), 500


@admin_bp.route('/management/fuel-types/<int:fuel_type_id>', methods=['GET'])
@require_permission_v2('manage_fuel_types')
def get_admin_fuel_type(fuel_type_id):
    """
    Get a specific fuel type by ID.
    
    ---
    tags:
      - Admin - Fuel Types
    security:
      - bearerAuth: []
    parameters:
      - in: path
        name: fuel_type_id
        required: true
        schema:
          type: integer
        description: Fuel type ID
    responses:
      200:
        description: Fuel type retrieved successfully
        content:
          application/json:
            schema:
              type: object
              properties:
                fuel_type:
                  $ref: '#/components/schemas/FuelType'
                message:
                  type: string
      401:
        description: Unauthorized
      403:
        description: Forbidden (missing permission)
      404:
        description: Fuel type not found
      500:
        description: Server error
    """
    try:
        fuel_type, message, status_code = FuelTypeAdminService.get_fuel_type_by_id(fuel_type_id)
        
        if status_code == 200:
            return jsonify({
                'fuel_type': fuel_type.to_dict(),
                'message': message
            }), status_code
        else:
            return jsonify({'error': message}), status_code
            
    except Exception as e:
        current_app.logger.error(f"Error in get_admin_fuel_type: {str(e)}")
        return jsonify({'error': 'Failed to retrieve fuel type'}), 500


@admin_bp.route('/management/fuel-types', methods=['POST'])
@require_permission_v2('manage_fuel_types')
def create_admin_fuel_type():
    """
    Create a new fuel type.
    
    ---
    tags:
      - Admin - Fuel Types
    security:
      - bearerAuth: []
    requestBody:
      required: true
      content:
        application/json:
          schema:
            type: object
            required:
              - name
              - code
            properties:
              name:
                type: string
                description: Display name for the fuel type
                example: "Jet A-1"
              code:
                type: string
                description: Short code for the fuel type (will be uppercase)
                example: "JET_A1"
              description:
                type: string
                description: Optional description of the fuel type
                example: "Standard aviation turbine fuel"
              is_active:
                type: boolean
                description: Whether the fuel type is active
                default: true
    responses:
      201:
        description: Fuel type created successfully
        content:
          application/json:
            schema:
              type: object
              properties:
                fuel_type:
                  $ref: '#/components/schemas/FuelType'
                message:
                  type: string
      400:
        description: Bad Request (validation error)
      401:
        description: Unauthorized
      403:
        description: Forbidden (missing permission)
      409:
        description: Conflict (fuel type name or code already exists)
      500:
        description: Server error
    """
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'Request body cannot be empty'}), 400
        
        # Validate request data
        schema = CreateFuelTypeSchema()
        try:
            validated_data = schema.load(data)
        except ValidationError as e:
            return jsonify({'error': 'Validation error', 'details': e.messages}), 400
        
        # Create the fuel type
        fuel_type, message, status_code = FuelTypeAdminService.create_fuel_type(validated_data)
        
        if status_code == 201:
            return jsonify({
                'fuel_type': fuel_type.to_dict(),
                'message': message
            }), status_code
        else:
            return jsonify({'error': message}), status_code
            
    except Exception as e:
        current_app.logger.error(f"Error in create_admin_fuel_type: {str(e)}")
        return jsonify({'error': 'Failed to create fuel type'}), 500


@admin_bp.route('/management/fuel-types/<int:fuel_type_id>', methods=['PUT'])
@require_permission_v2('manage_fuel_types')
def update_admin_fuel_type(fuel_type_id):
    """
    Update an existing fuel type.
    
    ---
    tags:
      - Admin - Fuel Types
    security:
      - bearerAuth: []
    parameters:
      - in: path
        name: fuel_type_id
        required: true
        schema:
          type: integer
        description: Fuel type ID
    requestBody:
      required: true
      content:
        application/json:
          schema:
            type: object
            properties:
              name:
                type: string
                description: Display name for the fuel type
                example: "Jet A-1"
              code:
                type: string
                description: Short code for the fuel type (will be uppercase)
                example: "JET_A1"
              description:
                type: string
                description: Optional description of the fuel type
                example: "Standard aviation turbine fuel"
              is_active:
                type: boolean
                description: Whether the fuel type is active
    responses:
      200:
        description: Fuel type updated successfully
        content:
          application/json:
            schema:
              type: object
              properties:
                fuel_type:
                  $ref: '#/components/schemas/FuelType'
                message:
                  type: string
      400:
        description: Bad Request (validation error)
      401:
        description: Unauthorized
      403:
        description: Forbidden (missing permission)
      404:
        description: Fuel type not found
      409:
        description: Conflict (fuel type name or code already exists)
      500:
        description: Server error
    """
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'Request body cannot be empty'}), 400
        
        # Validate request data
        schema = UpdateFuelTypeSchema()
        try:
            validated_data = schema.load(data)
        except ValidationError as e:
            return jsonify({'error': 'Validation error', 'details': e.messages}), 400
        
        # Update the fuel type
        fuel_type, message, status_code = FuelTypeAdminService.update_fuel_type(fuel_type_id, validated_data)
        
        if status_code == 200:
            return jsonify({
                'fuel_type': fuel_type.to_dict(),
                'message': message
            }), status_code
        else:
            return jsonify({'error': message}), status_code
            
    except Exception as e:
        current_app.logger.error(f"Error in update_admin_fuel_type: {str(e)}")
        return jsonify({'error': 'Failed to update fuel type'}), 500


@admin_bp.route('/management/fuel-types/<int:fuel_type_id>', methods=['DELETE'])
@require_permission_v2('manage_fuel_types')
def delete_admin_fuel_type(fuel_type_id):
    """
    Delete (deactivate) a fuel type.
    
    This endpoint performs a soft delete by setting the fuel type as inactive
    if it has been used in orders or has price history. Otherwise, it performs
    a hard delete.
    
    ---
    tags:
      - Admin - Fuel Types
    security:
      - bearerAuth: []
    parameters:
      - in: path
        name: fuel_type_id
        required: true
        schema:
          type: integer
        description: Fuel type ID
    responses:
      200:
        description: Fuel type deleted/deactivated successfully
        content:
          application/json:
            schema:
              type: object
              properties:
                message:
                  type: string
      401:
        description: Unauthorized
      403:
        description: Forbidden (missing permission)
      404:
        description: Fuel type not found
      500:
        description: Server error
    """
    try:
        success, message, status_code = FuelTypeAdminService.delete_fuel_type(fuel_type_id)
        
        if success:
            return jsonify({'message': message}), status_code
        else:
            return jsonify({'error': message}), status_code
            
    except Exception as e:
        current_app.logger.error(f"Error deleting fuel type: {e}")
        return jsonify({"error": "Failed to delete fuel type"}), 500


@admin_bp.route('/management/fuel-types/<int:fuel_type_id>/usage-stats', methods=['GET'])
@require_permission_v2('manage_fuel_types')
def get_fuel_type_usage_stats(fuel_type_id):
    """
    Get usage statistics for a fuel type.
    
    Returns information about how the fuel type is used in orders and pricing.
    
    ---
    tags:
      - Admin - Fuel Types
    security:
      - bearerAuth: []
    parameters:
      - in: path
        name: fuel_type_id
        required: true
        schema:
          type: integer
        description: Fuel type ID
    responses:
      200:
        description: Usage statistics retrieved successfully
        content:
          application/json:
            schema:
              type: object
              properties:
                stats:
                  type: object
                  properties:
                    fuel_type_id:
                      type: integer
                    fuel_type_name:
                      type: string
                    fuel_type_code:
                      type: string
                    is_active:
                      type: boolean
                    orders_count:
                      type: integer
                    price_history_count:
                      type: integer
                    latest_price:
                      type: number
                      nullable: true
                    latest_price_date:
                      type: string
                      format: date-time
                      nullable: true
                    can_be_deleted:
                      type: boolean
                message:
                  type: string
      401:
        description: Unauthorized
      403:
        description: Forbidden (missing permission)
      404:
        description: Fuel type not found
      500:
        description: Server error
    """
    try:
        stats, message, status_code = FuelTypeAdminService.get_fuel_type_usage_stats(fuel_type_id)
        
        if status_code == 200:
            return jsonify({
                'stats': stats,
                'message': message
            }), status_code
        else:
            return jsonify({'error': message}), status_code
            
    except Exception as e:
        current_app.logger.error(f"Error in get_fuel_type_usage_stats: {str(e)}")
        return jsonify({'error': 'Failed to retrieve usage statistics'}), 500