from flask import Blueprint, request, jsonify
from ..utils.enhanced_auth_decorators_v2 import require_permission_v2
from ..services.search_service import SearchService
from ..schemas.customer_schemas import CustomerResponseSchema
from ..schemas.aircraft_schemas import AircraftResponseSchema

search_bp = Blueprint('search_bp', __name__, url_prefix='/api/search')

@search_bp.route('/customers', methods=['GET'])
@require_permission_v2('view_customers')
def search_customers():
    """Search customers by name or company name.
    Requires view_customers permission.
    ---
    tags:
      - Search
    parameters:
      - in: query
        name: q
        schema:
          type: string
        required: true
        description: Search query for customer name or company name
    security:
      - bearerAuth: []
    responses:
      200:
        description: Customer search results
        content:
          application/json:
            schema:
              type: object
              properties:
                customers:
                  type: array
                  items: CustomerResponseSchema
                message:
                  type: string
      400:
        description: Bad request (missing query parameter)
      401:
        description: Unauthorized
      403:
        description: Forbidden (missing permission)
      500:
        description: Server error
    """
    query = request.args.get('q', '').strip()
    
    if not query:
        return jsonify({'error': 'Query parameter "q" is required'}), 400
    
    try:
        customers, message, status_code = SearchService.search_customers(query)
        
        if status_code != 200:
            return jsonify({'error': message}), status_code
        
        customer_schema = CustomerResponseSchema(many=True)
        serialized_customers = customer_schema.dump(customers)
        
        return jsonify({
            'customers': serialized_customers,
            'message': message
        }), status_code
        
    except Exception as e:
        return jsonify({'error': f'Search failed: {str(e)}'}), 500


@search_bp.route('/aircraft-tails', methods=['GET'])
@require_permission_v2('view_aircraft')
def search_aircraft_tails():
    """Search aircraft by tail number.
    Requires view_aircraft permission.
    ---
    tags:
      - Search
    parameters:
      - in: query
        name: q
        schema:
          type: string
        required: true
        description: Search query for aircraft tail number
    security:
      - bearerAuth: []
    responses:
      200:
        description: Aircraft search results
        content:
          application/json:
            schema:
              type: object
              properties:
                aircraft:
                  type: array
                  items: AircraftResponseSchema
                message:
                  type: string
      400:
        description: Bad request (missing query parameter)
      401:
        description: Unauthorized
      403:
        description: Forbidden (missing permission)
      500:
        description: Server error
    """
    query = request.args.get('q', '').strip()
    
    if not query:
        return jsonify({'error': 'Query parameter "q" is required'}), 400
    
    try:
        aircraft, message, status_code = SearchService.search_aircraft_tails(query)
        
        if status_code != 200:
            return jsonify({'error': message}), status_code
        
        # Return lightweight payload for aircraft search
        aircraft_results = [
            {
                'tail_number': aircraft_item.tail_number,
                'aircraft_type': aircraft_item.aircraft_type,
                'fuel_type': aircraft_item.fuel_type,
                'customer_id': aircraft_item.customer_id
            }
            for aircraft_item in aircraft
        ]
        
        return jsonify({
            'aircraft': aircraft_results,
            'message': message
        }), status_code
        
    except Exception as e:
        return jsonify({'error': f'Search failed: {str(e)}'}), 500