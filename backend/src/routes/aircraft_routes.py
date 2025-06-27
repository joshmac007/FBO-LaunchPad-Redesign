from flask import Blueprint, request, jsonify, g
from ..utils.enhanced_auth_decorators_v2 import require_permission_v2
from ..services.aircraft_service import AircraftService
from ..models.aircraft_type import AircraftType
from marshmallow import ValidationError
from ..schemas import (
    AircraftCreateRequestSchema,
    AircraftUpdateRequestSchema,
    AircraftResponseSchema,
    AircraftListResponseSchema,
    ErrorResponseSchema
)
from ..schemas.aircraft_schemas import AircraftTypeResponseSchema, CreateAircraftTypeSchema, UpdateAircraftTypeSchema

# Create blueprint for aircraft routes
aircraft_bp = Blueprint('aircraft_bp', __name__, url_prefix='/api/aircraft')

@aircraft_bp.route('', methods=['GET', 'OPTIONS'])
@aircraft_bp.route('/', methods=['GET', 'OPTIONS'])
@require_permission_v2('view_aircraft')
def get_aircraft():
    """Get a list of aircraft.
    Requires view_aircraft permission.
    ---
    tags:
      - Aircraft
    security:
      - bearerAuth: []
    responses:
      200:
        description: List of aircraft retrieved successfully
        content:
          application/json:
            schema: AircraftListResponseSchema
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
      500:
        description: Server error
        content:
          application/json:
            schema: ErrorResponseSchema
    """
    if request.method == 'OPTIONS':
        return jsonify({'message': 'OPTIONS request successful'}), 200
    
    aircraft, message, status_code = AircraftService.get_all_aircraft()
    if aircraft is not None:
        return jsonify({"message": message, "aircraft": [a.to_dict() for a in aircraft]}), status_code
    else:
        return jsonify({"error": message}), status_code

@aircraft_bp.route('', methods=['POST', 'OPTIONS'])
@aircraft_bp.route('/', methods=['POST', 'OPTIONS'])
@require_permission_v2('manage_aircraft')
def create_aircraft():
    """Create a new aircraft.
    Requires manage_aircraft permission.
    ---
    tags:
      - Aircraft
    security:
      - bearerAuth: []
    requestBody:
      required: true
      content:
        application/json:
          schema: AircraftCreateRequestSchema
    responses:
      201:
        description: Aircraft created successfully
        content:
          application/json:
            schema: AircraftResponseSchema
      400:
        description: Bad Request (e.g., validation error)
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
      409:
        description: Conflict (e.g., aircraft already exists)
        content:
          application/json:
            schema: ErrorResponseSchema
      500:
        description: Server error
        content:
          application/json:
            schema: ErrorResponseSchema
    """
    if request.method == 'OPTIONS':
        return jsonify({'message': 'OPTIONS request successful'}), 200
    
    try:
        schema = AircraftCreateRequestSchema()
        data = request.get_json()
        
        if not data:
            return jsonify({"error": "No data provided"}), 400
        
        try:
            data = schema.load(data)
        except ValidationError as e:
            return jsonify({
                "error": "Validation error",
                "details": e.messages
            }), 400

        if isinstance(data, dict):
            aircraft, message, status_code = AircraftService.create_aircraft(data)
            
            if aircraft is not None:
                return jsonify({"message": message, "aircraft": aircraft.to_dict()}), status_code
            else:
                return jsonify({"error": message}), status_code
        else:
            return jsonify({"error": "Invalid data format"}), 400
            return jsonify({"error": message}), status_code
            
    except Exception as e:
        from flask import current_app
        current_app.logger.error(f"Error creating aircraft: {e}")
        return jsonify({"error": "Server error"}), 500

@aircraft_bp.route('/<string:tail_number>', methods=['GET'])
@require_permission_v2('view_aircraft', {'resource_type': 'aircraft', 'id_param': 'tail_number'})
def get_aircraft_by_tail(tail_number):
    """Get an aircraft by tail number.
    Requires view_aircraft permission for the specific aircraft.
    ---
    tags:
      - Aircraft
    security:
      - bearerAuth: []
    parameters:
      - in: path
        name: tail_number
        schema:
          type: string
        required: true
        description: Tail number of the aircraft to retrieve
    responses:
      200:
        description: Aircraft retrieved successfully
        content:
          application/json:
            schema: AircraftResponseSchema
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
        description: Aircraft not found
        content:
          application/json:
            schema: ErrorResponseSchema
      500:
        description: Server error
        content:
          application/json:
            schema: ErrorResponseSchema
    """
    try:
        aircraft, message, status_code = AircraftService.get_aircraft_by_tail(tail_number)
        
        if aircraft is not None:
            return jsonify({"message": message, "aircraft": aircraft.to_dict()}), status_code
        else:
            return jsonify({"error": message}), status_code
            
    except Exception as e:
        from flask import current_app
        current_app.logger.error(f"Error getting aircraft {tail_number}: {e}")
        return jsonify({"error": str(e)}), 500

@aircraft_bp.route('/<string:tail_number>', methods=['PATCH'])
@require_permission_v2('manage_aircraft', {'resource_type': 'aircraft', 'id_param': 'tail_number'})
def update_aircraft(tail_number):
    """Update an aircraft.
    Requires manage_aircraft permission for the specific aircraft.
    ---
    tags:
      - Aircraft
    security:
      - bearerAuth: []
    parameters:
      - in: path
        name: tail_number
        schema:
          type: string
        required: true
        description: Tail number of the aircraft to update
    requestBody:
      required: true
      content:
        application/json:
          schema: AircraftUpdateRequestSchema
    responses:
      200:
        description: Aircraft updated successfully
        content:
          application/json:
            schema: AircraftResponseSchema
      400:
        description: Bad Request (e.g., validation error)
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
        description: Aircraft not found
        content:
          application/json:
            schema: ErrorResponseSchema
      409:
        description: Conflict (e.g., aircraft data conflict)
        content:
          application/json:
            schema: ErrorResponseSchema
      500:
        description: Server error
        content:
          application/json:
            schema: ErrorResponseSchema
    """
    try:
        schema = AircraftUpdateRequestSchema()
        data = request.get_json()
        
        if not data:
            return jsonify({"error": "No data provided"}), 400
        
        try:
            data = schema.load(data)
        except ValidationError as e:
            return jsonify({
                "error": "Validation error",
                "details": e.messages
            }), 400

        if not isinstance(data, dict):
            return jsonify({"error": "Invalid data format"}), 400
        
        aircraft, message, status_code = AircraftService.update_aircraft(tail_number, data)
        
        if aircraft is not None:
            return jsonify({"message": message, "aircraft": aircraft.to_dict()}), status_code
            return jsonify({"error": message}), status_code
            
    except Exception as e:
        from flask import current_app
        current_app.logger.error(f"Error updating aircraft {tail_number}: {e}")
        return jsonify({"error": "Server error"}), 500

@aircraft_bp.route('/<string:tail_number>', methods=['DELETE'])
@require_permission_v2('manage_aircraft', {'resource_type': 'aircraft', 'id_param': 'tail_number'})
def delete_aircraft(tail_number):
    """Delete an aircraft.
    Requires manage_aircraft permission for the specific aircraft.
    ---
    tags:
      - Aircraft
    security:
      - bearerAuth: []
    parameters:
      - in: path
        name: tail_number
        schema:
          type: string
        required: true
        description: Tail number of the aircraft to delete
    responses:
      204:
        description: Aircraft deleted successfully
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
        description: Aircraft not found
        content:
          application/json:
            schema: ErrorResponseSchema
      500:
        description: Server error
        content:
          application/json:
            schema: ErrorResponseSchema
    """
    try:
        deleted, message, status_code = AircraftService.delete_aircraft(tail_number)
        
        if deleted:
            return '', 204
        else:
            return jsonify({"error": message}), status_code
            
    except Exception as e:
        from flask import current_app
        current_app.logger.error(f"Error deleting aircraft {tail_number}: {e}")
        return jsonify({"error": "Server error"}), 500

# Special endpoint for CSR quick aircraft creation during fuel order process
@aircraft_bp.route('/quick-create', methods=['POST', 'OPTIONS'])
@require_permission_v2('manage_aircraft')
def create_aircraft_quick():
    """Quick aircraft creation for CSRs during fuel order process.
    Requires manage_aircraft permission.
    ---
    tags:
      - Aircraft
    security:
      - bearerAuth: []
    requestBody:
      required: true
      content:
        application/json:
          schema:
            type: object
            properties:
              tail_number:
                type: string
              aircraft_type:
                type: string
              fuel_type:
                type: string
            required:
              - tail_number
              - aircraft_type
              - fuel_type
    responses:
      201:
        description: Aircraft created successfully
        content:
          application/json:
            schema: AircraftResponseSchema
      400:
        description: Bad Request (e.g., validation error)
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
      409:
        description: Conflict (e.g., aircraft already exists)
        content:
          application/json:
            schema: ErrorResponseSchema
      500:
        description: Server error
        content:
          application/json:
            schema: ErrorResponseSchema
    """
    if request.method == 'OPTIONS':
        return jsonify({'message': 'OPTIONS request successful'}), 200
    
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({"error": "No data provided"}), 400
        
        # Validate required fields for quick create
        required_fields = ['tail_number', 'aircraft_type', 'fuel_type']
        for field in required_fields:
            if field not in data or not data[field]:
                return jsonify({"error": f"Missing required field: {field}"}), 400
        
        # Create aircraft with basic information
        aircraft_data = {
            'tail_number': data['tail_number'].strip().upper(),
            'aircraft_type': data['aircraft_type'].strip(),
            'fuel_type': data['fuel_type'].strip()
        }
        
        aircraft, message, status_code = AircraftService.create_aircraft(aircraft_data)
        
        if aircraft is not None:
            return jsonify({"message": message, "aircraft": aircraft.to_dict()}), status_code
        else:
            return jsonify({"error": message}), status_code
            
    except Exception as e:
        from flask import current_app
        current_app.logger.error(f"Error in quick aircraft creation: {e}")
        return jsonify({"error": "Server error"}), 500

@aircraft_bp.route('/types', methods=['GET', 'OPTIONS'])
@require_permission_v2('view_aircraft')
def get_aircraft_types():
    """Get all available aircraft types.
    Requires manage_aircraft permission.
    ---
    tags:
      - Aircraft
    security:
      - bearerAuth: []
    responses:
      200:
        description: Aircraft types retrieved successfully
        content:
          application/json:
            schema:
              type: array
              items:
                $ref: '#/components/schemas/AircraftTypeResponseSchema'
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
      500:
        description: Server error
        content:
          application/json:
            schema: ErrorResponseSchema
    """
    if request.method == 'OPTIONS':
        return jsonify({'message': 'OPTIONS request successful'}), 200
    
    try:
        # Query all aircraft types, ordered alphabetically by name
        aircraft_types = AircraftType.query.order_by(AircraftType.name.asc()).all()
        
        # Serialize using the schema
        schema = AircraftTypeResponseSchema(many=True)
        serialized_types = schema.dump(aircraft_types)
        
        return jsonify(serialized_types), 200
        
    except Exception as e:
        from flask import current_app
        current_app.logger.error(f"Error fetching aircraft types: {e}")
        return jsonify({"error": "Server error"}), 500

@aircraft_bp.route('/types', methods=['POST', 'OPTIONS'])
@require_permission_v2('manage_aircraft_types')
def create_aircraft_type():
    """Create a new aircraft type.
    Requires manage_aircraft_types permission.
    ---
    tags:
      - Aircraft Types
    security:
      - bearerAuth: []
    requestBody:
      required: true
      content:
        application/json:
          schema: CreateAircraftTypeSchema
    responses:
      201:
        description: Aircraft type created successfully
        content:
          application/json:
            schema: AircraftTypeResponseSchema
      400:
        description: Bad Request (e.g., validation error)
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
      409:
        description: Conflict (e.g., aircraft type already exists)
        content:
          application/json:
            schema: ErrorResponseSchema
      500:
        description: Server error
        content:
          application/json:
            schema: ErrorResponseSchema
    """
    if request.method == 'OPTIONS':
        return jsonify({'message': 'OPTIONS request successful'}), 200
    
    try:
        schema = CreateAircraftTypeSchema()
        data = request.get_json()
        
        if not data:
            return jsonify({"error": "No data provided"}), 400
        
        try:
            data = schema.load(data)
        except ValidationError as e:
            return jsonify({
                "error": "Validation error",
                "details": e.messages
            }), 400

        aircraft_type, message, status_code = AircraftService.create_aircraft_type(data)
        
        if aircraft_type is not None:
            response_schema = AircraftTypeResponseSchema()
            return jsonify({"message": message, "aircraft_type": response_schema.dump(aircraft_type)}), status_code
        else:
            return jsonify({"error": message}), status_code
            
    except Exception as e:
        from flask import current_app
        current_app.logger.error(f"Error creating aircraft type: {e}")
        return jsonify({"error": "Server error"}), 500

@aircraft_bp.route('/types/<int:type_id>', methods=['PUT', 'OPTIONS'])
@require_permission_v2('manage_aircraft_types')
def update_aircraft_type(type_id):
    """Update an aircraft type.
    Requires manage_aircraft_types permission.
    ---
    tags:
      - Aircraft Types
    security:
      - bearerAuth: []
    parameters:
      - in: path
        name: type_id
        schema:
          type: integer
        required: true
        description: ID of the aircraft type to update
    requestBody:
      required: true
      content:
        application/json:
          schema: UpdateAircraftTypeSchema
    responses:
      200:
        description: Aircraft type updated successfully
        content:
          application/json:
            schema: AircraftTypeResponseSchema
      400:
        description: Bad Request (e.g., validation error)
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
        description: Aircraft type not found
        content:
          application/json:
            schema: ErrorResponseSchema
      409:
        description: Conflict (e.g., aircraft type name already exists)
        content:
          application/json:
            schema: ErrorResponseSchema
      500:
        description: Server error
        content:
          application/json:
            schema: ErrorResponseSchema
    """
    if request.method == 'OPTIONS':
        return jsonify({'message': 'OPTIONS request successful'}), 200
    
    try:
        schema = UpdateAircraftTypeSchema()
        data = request.get_json()
        
        if not data:
            return jsonify({"error": "No data provided"}), 400
        
        try:
            data = schema.load(data)
        except ValidationError as e:
            return jsonify({
                "error": "Validation error",
                "details": e.messages
            }), 400

        aircraft_type, message, status_code = AircraftService.update_aircraft_type(type_id, data)
        
        if aircraft_type is not None:
            response_schema = AircraftTypeResponseSchema()
            return jsonify({"message": message, "aircraft_type": response_schema.dump(aircraft_type)}), status_code
        else:
            return jsonify({"error": message}), status_code
            
    except Exception as e:
        from flask import current_app
        current_app.logger.error(f"Error updating aircraft type {type_id}: {e}")
        return jsonify({"error": "Server error"}), 500

@aircraft_bp.route('/types/<int:type_id>', methods=['DELETE', 'OPTIONS'])
@require_permission_v2('manage_aircraft_types')
def delete_aircraft_type(type_id):
    """Delete an aircraft type.
    Requires manage_aircraft_types permission.
    ---
    tags:
      - Aircraft Types
    security:
      - bearerAuth: []
    parameters:
      - in: path
        name: type_id
        schema:
          type: integer
        required: true
        description: ID of the aircraft type to delete
    responses:
      204:
        description: Aircraft type deleted successfully
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
        description: Aircraft type not found
        content:
          application/json:
            schema: ErrorResponseSchema
      409:
        description: Conflict (e.g., aircraft type is in use)
        content:
          application/json:
            schema: ErrorResponseSchema
      500:
        description: Server error
        content:
          application/json:
            schema: ErrorResponseSchema
    """
    if request.method == 'OPTIONS':
        return jsonify({'message': 'OPTIONS request successful'}), 200
    
    try:
        deleted, message, status_code = AircraftService.delete_aircraft_type(type_id)
        
        if deleted:
            return '', 204
        else:
            return jsonify({"error": message}), status_code
            
    except Exception as e:
        from flask import current_app
        current_app.logger.error(f"Error deleting aircraft type {type_id}: {e}")
        return jsonify({"error": "Server error"}), 500
