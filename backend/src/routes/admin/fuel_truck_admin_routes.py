from flask import request, jsonify, current_app
from marshmallow import ValidationError
from ...services.fuel_truck_service import FuelTruckService
from src.utils.enhanced_auth_decorators_v2 import require_permission_v2
from ...schemas.fuel_truck_schemas import (
    FuelTruckSchema,
    FuelTruckCreateRequestSchema,
    FuelTruckUpdateRequestSchema
)
from ...schemas import ErrorResponseSchema
from .routes import admin_bp

@admin_bp.route('/fuel-trucks', methods=['GET', 'OPTIONS'])
@require_permission_v2('manage_fuel_trucks')
def get_admin_fuel_trucks():
    """Get all fuel trucks for admin dashboard.
    Returns all fuel trucks with detailed information for admin management.
    ---
    tags:
      - Admin - Fuel Trucks
    security:
      - bearerAuth: []
    parameters:
      - in: query
        name: status
        schema:
          type: string
          enum: [active, inactive, maintenance, all]
        required: false
        description: Filter trucks by status (default: all)
    responses:
      200:
        description: List of fuel trucks retrieved successfully
        content:
          application/json:
            schema:
              type: object
              properties:
                fuelTrucks:
                  type: array
                  items:
                    type: object
                    properties:
                      id:
                        type: integer
                      truck_number:
                        type: string
                      capacity:
                        type: number
                      fuel_type:
                        type: string
                      status:
                        type: string
                        enum: [active, inactive, maintenance]
                      location:
                        type: string
                      last_maintenance:
                        type: string
                        format: date-time
                      next_maintenance:
                        type: string
                        format: date-time
                      is_active:
                        type: boolean
                      created_at:
                        type: string
                        format: date-time
                      updated_at:
                        type: string
                        format: date-time
                message:
                  type: string
      401:
        description: Unauthorized
      403:
        description: Forbidden (missing permission)
      500:
        description: Server error
    """
    if request.method == 'OPTIONS':
        return jsonify({'message': 'OPTIONS request successful'}), 200
    
    try:
        # Get query parameters
        status_filter = request.args.get('status', 'all')
        
        # Build filters
        filters = {}
        
        # Handle status filter
        if status_filter != 'all':
            if status_filter == 'active':
                filters['is_active'] = True
                filters['status'] = 'active'
            elif status_filter == 'inactive':
                filters['is_active'] = False
            elif status_filter == 'maintenance':
                filters['status'] = 'maintenance'
        
        # Get fuel trucks
        trucks, message, status_code = FuelTruckService.get_trucks(filters=filters)
        
        if status_code != 200:
            return jsonify({"error": message}), status_code
        
        # Convert to admin format with additional details
        admin_trucks = []
        for truck in trucks:
            truck_data = {
                "id": truck.id,
                "truck_number": truck.truck_number,
                "capacity": truck.capacity,
                "fuel_type": truck.fuel_type,
                "status": getattr(truck, 'status', 'active' if truck.is_active else 'inactive'),
                "location": getattr(truck, 'location', 'Hangar A'),
                "last_maintenance": truck.last_maintenance.isoformat() if hasattr(truck, 'last_maintenance') and truck.last_maintenance else None,
                "next_maintenance": truck.next_maintenance.isoformat() if hasattr(truck, 'next_maintenance') and truck.next_maintenance else None,
                "is_active": truck.is_active,
                "created_at": truck.created_at.isoformat(),
                "updated_at": truck.updated_at.isoformat()
            }
            admin_trucks.append(truck_data)
        
        return jsonify({
            "fuelTrucks": admin_trucks,
            "message": f"Retrieved {len(admin_trucks)} fuel trucks successfully"
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"Error in get_admin_fuel_trucks: {str(e)}")
        return jsonify({"error": "Failed to retrieve fuel trucks"}), 500

@admin_bp.route('/fuel-trucks', methods=['POST'])
@require_permission_v2('manage_fuel_trucks')
def create_admin_fuel_truck():
    """Create a new fuel truck (admin endpoint).
    Creates a new fuel truck with admin-specific validation and defaults.
    ---
    tags:
      - Admin - Fuel Trucks
    security:
      - bearerAuth: []
    requestBody:
      required: true
      content:
        application/json:
          schema:
            type: object
            required:
              - truck_number
              - capacity
              - fuel_type
            properties:
              truck_number:
                type: string
              capacity:
                type: number
              fuel_type:
                type: string
                enum: [Jet A, Avgas 100LL]
              status:
                type: string
                enum: [active, inactive, maintenance]
                default: active
              location:
                type: string
                default: Hangar A
    responses:
      201:
        description: Fuel truck created successfully
      400:
        description: Bad Request (validation error)
      401:
        description: Unauthorized
      403:
        description: Forbidden (missing permission)
      409:
        description: Conflict (truck number already exists)
      500:
        description: Server error
    """
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "Request body cannot be empty"}), 400

        # Validate required fields
        required_fields = ['truck_number', 'capacity', 'fuel_type']
        for field in required_fields:
            if field not in data:
                return jsonify({"error": f"Missing required field: {field}"}), 400

        # Set defaults for admin creation
        if 'status' not in data:
            data['status'] = 'active'
        if 'location' not in data:
            data['location'] = 'Hangar A'
        if 'is_active' not in data:
            data['is_active'] = True

        # Create the truck
        truck, message, status_code = FuelTruckService.create_truck(data)

        if status_code == 201:
            truck_data = {
                "id": truck.id,
                "truck_number": truck.truck_number,
                "capacity": truck.capacity,
                "fuel_type": truck.fuel_type,
                "status": getattr(truck, 'status', 'active'),
                "location": getattr(truck, 'location', 'Hangar A'),
                "is_active": truck.is_active,
                "created_at": truck.created_at.isoformat(),
                "updated_at": truck.updated_at.isoformat()
            }
            return jsonify({
                "fuelTruck": truck_data,
                "message": message
            }), status_code
        else:
            return jsonify({"error": message}), status_code

    except Exception as e:
        current_app.logger.error(f"Error in create_admin_fuel_truck: {str(e)}")
        return jsonify({"error": "Failed to create fuel truck"}), 500

@admin_bp.route('/fuel-trucks/<int:truck_id>', methods=['GET'])
@require_permission_v2('manage_fuel_trucks')
def get_admin_fuel_truck(truck_id):
    """Get a fuel truck by ID (admin endpoint)."""
    try:
        truck, message, status_code = FuelTruckService.get_truck_by_id(truck_id)
        
        if status_code == 200:
            truck_data = {
                "id": truck.id,
                "truck_number": truck.truck_number,
                "capacity": truck.capacity,
                "fuel_type": truck.fuel_type,
                "status": getattr(truck, 'status', 'active' if truck.is_active else 'inactive'),
                "location": getattr(truck, 'location', 'Hangar A'),
                "last_maintenance": truck.last_maintenance.isoformat() if hasattr(truck, 'last_maintenance') and truck.last_maintenance else None,
                "next_maintenance": truck.next_maintenance.isoformat() if hasattr(truck, 'next_maintenance') and truck.next_maintenance else None,
                "is_active": truck.is_active,
                "created_at": truck.created_at.isoformat(),
                "updated_at": truck.updated_at.isoformat()
            }
            return jsonify({
                "fuelTruck": truck_data,
                "message": message
            }), status_code
        else:
            return jsonify({"error": message}), status_code

    except Exception as e:
        current_app.logger.error(f"Error in get_admin_fuel_truck: {str(e)}")
        return jsonify({"error": "Failed to retrieve fuel truck"}), 500

@admin_bp.route('/fuel-trucks/<int:truck_id>', methods=['PATCH'])
@require_permission_v2('manage_fuel_trucks')
def update_admin_fuel_truck(truck_id):
    """Update a fuel truck (admin endpoint)."""
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "Request body cannot be empty"}), 400

        # Update the truck
        truck, message, status_code = FuelTruckService.update_truck(truck_id, data)

        if status_code == 200:
            truck_data = {
                "id": truck.id,
                "truck_number": truck.truck_number,
                "capacity": truck.capacity,
                "fuel_type": truck.fuel_type,
                "status": getattr(truck, 'status', 'active' if truck.is_active else 'inactive'),
                "location": getattr(truck, 'location', 'Hangar A'),
                "is_active": truck.is_active,
                "created_at": truck.created_at.isoformat(),
                "updated_at": truck.updated_at.isoformat()
            }
            return jsonify({
                "fuelTruck": truck_data,
                "message": message
            }), status_code
        else:
            return jsonify({"error": message}), status_code

    except Exception as e:
        current_app.logger.error(f"Error in update_admin_fuel_truck: {str(e)}")
        return jsonify({"error": "Failed to update fuel truck"}), 500

@admin_bp.route('/fuel-trucks/<int:truck_id>', methods=['DELETE'])
@require_permission_v2('manage_fuel_trucks')
def delete_admin_fuel_truck(truck_id):
    """Delete (deactivate) a fuel truck (admin endpoint)."""
    try:
        success, message, status_code = FuelTruckService.delete_truck(truck_id)

        if success:
            return jsonify({"message": message}), status_code
        else:
            return jsonify({"error": message}), status_code

    except Exception as e:
        current_app.logger.error(f"Error in delete_admin_fuel_truck: {str(e)}")
        return jsonify({"error": "Failed to delete fuel truck"}), 500

@admin_bp.route('/fuel-trucks/stats', methods=['GET'])
@require_permission_v2('manage_fuel_trucks')
def get_fuel_truck_stats():
    """Get fuel truck statistics for admin dashboard."""
    try:
        # Get all trucks
        trucks, message, status_code = FuelTruckService.get_trucks()
        
        if status_code != 200:
            return jsonify({"error": message}), status_code
        
        # Calculate statistics
        total_trucks = len(trucks)
        active_trucks = len([t for t in trucks if t.is_active])
        maintenance_trucks = len([t for t in trucks if getattr(t, 'status', 'active') == 'maintenance'])
        
        # Calculate capacity statistics
        total_capacity = sum(t.capacity for t in trucks if t.is_active)
        avg_capacity = total_capacity / active_trucks if active_trucks > 0 else 0
        
        stats = {
            "total_trucks": total_trucks,
            "active_trucks": active_trucks,
            "inactive_trucks": total_trucks - active_trucks,
            "maintenance_trucks": maintenance_trucks,
            "total_capacity": total_capacity,
            "average_capacity": round(avg_capacity, 1),
            "utilization_rate": round((active_trucks / total_trucks * 100) if total_trucks > 0 else 0, 1)
        }
        
        return jsonify({
            "stats": stats,
            "message": "Fuel truck statistics retrieved successfully"
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"Error in get_fuel_truck_stats: {str(e)}")
        return jsonify({"error": "Failed to retrieve fuel truck statistics"}), 500 