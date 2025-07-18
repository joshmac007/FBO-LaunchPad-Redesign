from flask import request, jsonify
from ...services.aircraft_service import AircraftService
from ...services.customer_service import CustomerService
from src.utils.enhanced_auth_decorators_v2 import require_permission_v2
from ...models.user import UserRole
from ...schemas.admin_schemas import AdminAircraftSchema, AdminAircraftListResponseSchema, ErrorResponseSchema
from src.extensions import apispec
from .routes import admin_bp

@admin_bp.route('/aircraft', methods=['GET', 'OPTIONS'])
@require_permission_v2('manage_aircraft')
def list_aircraft():
    """
    ---
    get:
      summary: List all aircraft (admin, manage_aircraft permission required)
      tags:
        - Admin - Aircraft
      responses:
        200:
          description: List of aircraft
          content:
            application/json:
              schema: AdminAircraftListResponseSchema
        401:
          description: Unauthorized
        403:
          description: Forbidden (missing permission)
    """
    if request.method == 'OPTIONS':
        return jsonify({'message': 'OPTIONS request successful'}), 200
    aircraft_list, msg, status = AircraftService.get_all_aircraft(request.args)
    schema = AdminAircraftSchema(many=True)
    return jsonify({"aircraft": schema.dump(aircraft_list)}), status

@admin_bp.route('/aircraft', methods=['POST', 'OPTIONS'])
@require_permission_v2('manage_aircraft')
def create_aircraft():
    """
    ---
    post:
      summary: Create a new aircraft (admin, manage_aircraft permission required)
      tags:
        - Admin - Aircraft
      requestBody:
        required: true
        content:
          application/json:
            schema: AdminAircraftSchema
      responses:
        201:
          description: Aircraft created
          content:
            application/json:
              schema: AdminAircraftSchema
        400:
          description: Bad request
        409:
          description: Conflict
    """
    if request.method == 'OPTIONS':
        return jsonify({'message': 'OPTIONS request successful'}), 200
    data = request.get_json()
    aircraft, msg, status = AircraftService.create_aircraft(data)
    if not aircraft:
        return jsonify({"error": msg}), status
    schema = AdminAircraftSchema()
    return jsonify(schema.dump(aircraft)), status

@admin_bp.route('/aircraft/<string:tail_number>', methods=['GET'])
@require_permission_v2('manage_aircraft', {'resource_type': 'aircraft', 'id_param': 'tail_number'})
def get_aircraft(tail_number):
    """
    ---
    get:
      summary: Get an aircraft by tail number (admin, manage_aircraft permission required)
      tags:
        - Admin - Aircraft
      parameters:
        - in: path
          name: tail_number
          schema:
            type: string
          required: true
      responses:
        200:
          description: Aircraft details
          content:
            application/json:
              schema: AdminAircraftSchema
        404:
          description: Not found
    """
    aircraft, msg, status = AircraftService.get_aircraft_by_tail(tail_number)
    if not aircraft:
        return jsonify({"error": msg}), status
    schema = AdminAircraftSchema()
    return jsonify(schema.dump(aircraft)), status

@admin_bp.route('/aircraft/<string:tail_number>', methods=['PATCH'])
@require_permission_v2('manage_aircraft', {'resource_type': 'aircraft', 'id_param': 'tail_number'})
def update_aircraft(tail_number):
    """
    ---
    patch:
      summary: Update an aircraft by tail number (admin, manage_aircraft permission required)
      tags:
        - Admin - Aircraft
      parameters:
        - in: path
          name: tail_number
          schema:
            type: string
          required: true
      requestBody:
        required: true
        content:
          application/json:
            schema: AdminAircraftSchema
      responses:
        200:
          description: Aircraft updated
          content:
            application/json:
              schema: AdminAircraftSchema
        400:
          description: Bad request
        404:
          description: Not found
    """
    data = request.get_json()
    aircraft, msg, status = AircraftService.update_aircraft(tail_number, data)
    if not aircraft:
        return jsonify({"error": msg}), status
    schema = AdminAircraftSchema()
    return jsonify(schema.dump(aircraft)), status

@admin_bp.route('/aircraft/<string:tail_number>', methods=['DELETE'])
@require_permission_v2('manage_aircraft', {'resource_type': 'aircraft', 'id_param': 'tail_number'})
def delete_aircraft(tail_number):
    """
    ---
    delete:
      summary: Delete an aircraft by tail number (admin, manage_aircraft permission required)
      tags:
        - Admin - Aircraft
      parameters:
        - in: path
          name: tail_number
          schema:
            type: string
          required: true
      responses:
        200:
          description: Aircraft deleted successfully
        404:
          description: Not found
        409:
          description: Conflict (referenced by other records)
    """
    deleted, msg, status = AircraftService.delete_aircraft(tail_number)
    if not deleted:
        return jsonify({"error": msg}), status
    return jsonify({"message": msg}), status
