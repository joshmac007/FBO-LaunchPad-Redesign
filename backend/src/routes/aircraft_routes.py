from flask import Blueprint, request, jsonify
from ..utils.decorators import token_required, require_permission
from ..models.user import UserRole
from ..services.aircraft_service import AircraftService
from ..schemas.aircraft_schemas import (
    AircraftCreateSchema,
    AircraftUpdateSchema,
    AircraftResponseSchema,
    AircraftListSchema,
    ErrorResponseSchema
)

aircraft_bp = Blueprint('aircraft_bp', __name__, url_prefix='/api/aircraft')

@aircraft_bp.route('', methods=['GET', 'OPTIONS'])
@aircraft_bp.route('/', methods=['GET', 'OPTIONS'])
@token_required
@require_permission('VIEW_AIRCRAFT')
def list_aircraft():
    """Get all aircraft (VIEW_AIRCRAFT permission required).
    ---
    tags:
      - Aircraft
    security:
      - bearerAuth: []
    responses:
      200:
        description: Aircraft list
        content:
          application/json:
            schema: AircraftListSchema
    """
    if request.method == 'OPTIONS':
        return jsonify({'message': 'OPTIONS request successful'}), 200
    filters = {}
    if 'customer_id' in request.args:
        filters['customer_id'] = request.args.get('customer_id', type=int)
    aircraft, message, status_code = AircraftService.get_all_aircraft(filters)
    return jsonify({
        "message": message,
        "aircraft": [AircraftResponseSchema().dump(a) for a in aircraft]
    }), status_code

@aircraft_bp.route('', methods=['POST', 'OPTIONS'])
@aircraft_bp.route('/', methods=['POST', 'OPTIONS'])
@token_required
@require_permission('MANAGE_AIRCRAFT')
def create_aircraft():
    """Create an aircraft (MANAGE_AIRCRAFT permission required).
    ---
    tags:
      - Aircraft
    security:
      - bearerAuth: []
    requestBody:
      required: true
      content:
        application/json:
          schema: AircraftCreateSchema
    responses:
      201:
        description: Aircraft created
        content:
          application/json:
            schema: AircraftResponseSchema
    """
    if request.method == 'OPTIONS':
        return jsonify({'message': 'OPTIONS request successful'}), 200
    schema = AircraftCreateSchema()
    try:
        data = schema.load(request.get_json())
    except Exception as e:
        return jsonify({"error": str(e)}), 400
    aircraft, message, status_code = AircraftService.create_aircraft(data)
    if aircraft:
        return jsonify({"message": message, "aircraft": AircraftResponseSchema().dump(aircraft)}), status_code
    else:
        return jsonify({"error": message}), status_code

@aircraft_bp.route('/<string:tail_number>', methods=['GET'])
@token_required
@require_permission('VIEW_AIRCRAFT')
def get_aircraft(tail_number):
    """Get an aircraft by tail number (VIEW_AIRCRAFT permission required).
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
        description: Tail number
    responses:
      200:
        description: Aircraft found
        content:
          application/json:
            schema: AircraftResponseSchema
      404:
        description: Not found
        content:
          application/json:
            schema: ErrorResponseSchema
    """
    aircraft, message, status_code = AircraftService.get_aircraft_by_tail(tail_number)
    if aircraft:
        return jsonify({"message": message, "aircraft": AircraftResponseSchema().dump(aircraft)}), status_code
    else:
        return jsonify({"error": message}), status_code

@aircraft_bp.route('/<string:tail_number>', methods=['PATCH'])
@token_required
@require_permission('MANAGE_AIRCRAFT')
def update_aircraft(tail_number):
    """Update an aircraft (MANAGE_AIRCRAFT permission required).
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
        description: Tail number
    requestBody:
      required: true
      content:
        application/json:
          schema: AircraftUpdateSchema
    responses:
      200:
        description: Aircraft updated
        content:
          application/json:
            schema: AircraftResponseSchema
      404:
        description: Not found
        content:
          application/json:
            schema: ErrorResponseSchema
    """
    schema = AircraftUpdateSchema(partial=True)
    try:
        data = schema.load(request.get_json())
    except Exception as e:
        return jsonify({"error": str(e)}), 400
    aircraft, message, status_code = AircraftService.update_aircraft(tail_number, data)
    if aircraft:
        return jsonify({"message": message, "aircraft": AircraftResponseSchema().dump(aircraft)}), status_code
    else:
        return jsonify({"error": message}), status_code

@aircraft_bp.route('/<string:tail_number>', methods=['DELETE'])
@token_required
@require_permission('MANAGE_AIRCRAFT')
def delete_aircraft(tail_number):
    """Delete an aircraft (MANAGE_AIRCRAFT permission required).
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
        description: Tail number
    responses:
      200:
        description: Aircraft deleted
        content:
          application/json:
            schema:
              type: object
              properties:
                message:
                  type: string
      404:
        description: Not found
        content:
          application/json:
            schema: ErrorResponseSchema
    """
    success, message, status_code = AircraftService.delete_aircraft(tail_number)
    if success:
        return jsonify({"message": message}), status_code
    else:
        return jsonify({"error": message}), status_code
