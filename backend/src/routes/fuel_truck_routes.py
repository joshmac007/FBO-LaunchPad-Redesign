from flask import Blueprint, request, jsonify, g
from ..utils.enhanced_auth_decorators_v2 import require_permission_v2
from ..models.user import UserRole
from ..services import FuelTruckService
from ..schemas import (
    FuelTruckListResponseSchema,
    FuelTruckCreateRequestSchema,
    FuelTruckUpdateRequestSchema,
    FuelTruckCreateResponseSchema,
    FuelTruckSchema,
    ErrorResponseSchema
)

# Create the blueprint for fuel truck routes
truck_bp = Blueprint('truck_bp', __name__, url_prefix='/api/fuel-trucks')

@truck_bp.route('', methods=['GET', 'OPTIONS'])
@truck_bp.route('/', methods=['GET', 'OPTIONS'])
@require_permission_v2('view_fuel_trucks')
def get_fuel_trucks():
    if request.method == 'OPTIONS':
        return jsonify({'message': 'OPTIONS request successful'}), 200
    """Get a list of fuel trucks.
    Requires view_fuel_trucks permission. Supports filtering by active status.
    ---
    tags:
      - Fuel Trucks
    security:
      - bearerAuth: []
    parameters:
      - in: query
        name: is_active
        schema:
          type: string
          enum: ['true', 'false']
        required: false
        description: Filter trucks by active status ('true' or 'false')
    responses:
      200:
        description: List of fuel trucks retrieved successfully
        content:
          application/json:
            schema: FuelTruckListResponseSchema
      400:
        description: Bad Request (e.g., invalid filter value)
        content:
          application/json:
            schema: ErrorResponseSchema
      401:
        description: Unauthorized (invalid/missing token)
        content:
          application/json:
            schema: ErrorResponseSchema
      403:
        description: Forbidden (missing permission)
        content:
          application/json:
            schema: ErrorResponseSchema
      500:
        description: Server error (e.g., database error)
        content:
          application/json:
            schema: ErrorResponseSchema
    """
    # Extract filter parameters from request.args
    filters = {
        'is_active': request.args.get('is_active', None, type=str)
    }
    filters = {k: v for k, v in filters.items() if v is not None}

    # Call FuelTruckService to get trucks with filters
    trucks, message, status_code = FuelTruckService.get_trucks(filters=filters)

    if trucks is not None:
        trucks_list = [truck.to_dict() for truck in trucks]
        response = {
            "message": message,
            "fuel_trucks": trucks_list
        }
        return jsonify(response), status_code
    else:
        return jsonify({"error": message}), status_code

@truck_bp.route('/', methods=['POST'])
@require_permission_v2('manage_fuel_trucks')
def create_fuel_truck():
    """Create a new fuel truck.
    Requires manage_fuel_trucks permission.
    ---
    tags:
      - Fuel Trucks
    security:
      - bearerAuth: []
    requestBody:
      required: true
      content:
        application/json:
          schema: FuelTruckCreateRequestSchema
    responses:
      201:
        description: Fuel truck created successfully
        content:
          application/json:
            schema: FuelTruckCreateResponseSchema
      400:
        description: Bad Request (e.g., validation error, duplicate truck number)
        content:
          application/json:
            schema: ErrorResponseSchema
      401:
        description: Unauthorized (invalid/missing token)
        content:
          application/json:
            schema: ErrorResponseSchema
      403:
        description: Forbidden (missing permission)
        content:
          application/json:
            schema: ErrorResponseSchema
      500:
        description: Server error (e.g., database error)
        content:
          application/json:
            schema: ErrorResponseSchema
    """
    # Validate request data
    schema = FuelTruckCreateRequestSchema()
    try:
        data = schema.load(request.get_json())
    except Exception as e:
        return jsonify({"error": str(e)}), 400

    # Call service to create truck
    truck, message, status_code = FuelTruckService.create_truck(data)

    if truck is not None:
        response = {
            "message": message,
            "fuel_truck": FuelTruckSchema().dump(truck)
        }
        return jsonify(response), status_code
    else:
        return jsonify({"error": message}), status_code

@truck_bp.route('/<int:truck_id>', methods=['GET'])
@require_permission_v2('view_fuel_trucks', {'resource_type': 'fuel_truck', 'id_param': 'truck_id'})
def get_fuel_truck(truck_id):
    """Get a fuel truck by ID.
    Requires view_fuel_trucks permission for the specific truck.
    ---
    tags:
      - Fuel Trucks
    security:
      - bearerAuth: []
    parameters:
      - in: path
        name: truck_id
        schema:
          type: integer
        required: true
        description: ID of the fuel truck to retrieve
    responses:
      200:
        description: Fuel truck retrieved successfully
        content:
          application/json:
            schema: FuelTruckSchema
      401:
        description: Unauthorized
        content:
          application/json:
            schema: ErrorResponseSchema
      403:
        description: Forbidden (missing permission)
        content:
          application/json:
            schema: ErrorResponseSchema
      404:
        description: Fuel truck not found
        content:
          application/json:
            schema: ErrorResponseSchema
      500:
        description: Server error
        content:
          application/json:
            schema: ErrorResponseSchema
    """
    truck, message, status_code = FuelTruckService.get_truck_by_id(truck_id)
    if truck is not None:
        return jsonify({
            "message": message,
            "fuel_truck": FuelTruckSchema().dump(truck)
        }), status_code
    else:
        return jsonify({"error": message}), status_code

@truck_bp.route('/<int:truck_id>', methods=['PATCH'])
@require_permission_v2('manage_fuel_trucks')
def update_fuel_truck(truck_id):
    """Update a fuel truck.
    Requires manage_fuel_trucks permission.
    ---
    tags:
      - Fuel Trucks
    security:
      - bearerAuth: []
    parameters:
      - in: path
        name: truck_id
        schema:
          type: integer
        required: true
        description: ID of the fuel truck to update
    requestBody:
      required: true
      content:
        application/json:
          schema: FuelTruckUpdateRequestSchema
    responses:
      200:
        description: Fuel truck updated successfully
        content:
          application/json:
            schema: FuelTruckSchema
      400:
        description: Bad Request (validation error)
        content:
          application/json:
            schema: ErrorResponseSchema
      401:
        description: Unauthorized
        content:
          application/json:
            schema: ErrorResponseSchema
      403:
        description: Forbidden (missing permission)
        content:
          application/json:
            schema: ErrorResponseSchema
      404:
        description: Fuel truck not found
        content:
          application/json:
            schema: ErrorResponseSchema
      500:
        description: Server error
        content:
          application/json:
            schema: ErrorResponseSchema
    """
    schema = FuelTruckUpdateRequestSchema()
    try:
        data = schema.load(request.get_json())
    except Exception as e:
        return jsonify({"error": str(e)}), 400
    truck, message, status_code = FuelTruckService.update_truck(truck_id, data)
    if truck is not None:
        return jsonify({
            "message": message,
            "fuel_truck": FuelTruckSchema().dump(truck)
        }), status_code
    else:
        return jsonify({"error": message}), status_code

@truck_bp.route('/<int:truck_id>', methods=['DELETE'])
@require_permission_v2('manage_fuel_trucks')
def delete_fuel_truck(truck_id):
    """Delete a fuel truck by ID.
    Requires manage_fuel_trucks permission.
    ---
    tags:
      - Fuel Trucks
    security:
      - bearerAuth: []
    parameters:
      - in: path
        name: truck_id
        schema:
          type: integer
        required: true
        description: ID of the fuel truck to delete
    responses:
      200:
        description: Fuel truck deleted successfully
      401:
        description: Unauthorized
      403:
        description: Forbidden (missing permission)
      404:
        description: Fuel truck not found
      500:
        description: Server error
    """
    success, message, status_code = FuelTruckService.delete_truck(truck_id)
    if success:
        return jsonify({"message": message}), status_code
    else:
        return jsonify({"error": message}), status_code