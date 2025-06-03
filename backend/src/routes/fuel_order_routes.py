from flask import Blueprint, request, jsonify, g, Response, current_app
from flask_jwt_extended import jwt_required
from decimal import Decimal
from datetime import datetime
from ..utils.enhanced_auth_decorators_v2 import require_permission_v2, require_permission_or_ownership_v2
from ..models.user import UserRole
from ..models.fuel_order import FuelOrder, FuelOrderStatus
from ..services.fuel_order_service import FuelOrderService
from ..models.fuel_truck import FuelTruck
from ..schemas import OrderStatusCountsResponseSchema, ErrorResponseSchema
from ..extensions import db
from ..models.aircraft import Aircraft
from ..services.aircraft_service import AircraftService
from sqlalchemy.exc import IntegrityError
from ..models import User, Customer
import logging

# Create the blueprint for fuel order routes
fuel_order_bp = Blueprint('fuel_order_bp', __name__)

# Special value for auto-assigning LST
AUTO_ASSIGN_LST_ID = -1  # If this value is provided, backend will auto-select least busy LST
AUTO_ASSIGN_TRUCK_ID = -1 # If this value is provided, backend will auto-select an available truck

logger = logging.getLogger(__name__)

@fuel_order_bp.route('/stats/status-counts', methods=['GET', 'OPTIONS'])
@fuel_order_bp.route('/stats/status-counts/', methods=['GET', 'OPTIONS'])
@jwt_required()
@require_permission_v2('view_order_statistics')
def get_status_counts():
    if request.method == 'OPTIONS':
        return jsonify({'message': 'OPTIONS request successful'}), 200
    try:
        counts, message, status_code = FuelOrderService.get_status_counts(current_user=g.current_user)
        if counts is not None:
            return jsonify({"message": message, "counts": counts}), status_code
        else:
            return jsonify({"error": message}), status_code
    except Exception as e:
        current_app.logger.error(f"Unhandled exception in get_status_counts: {str(e)}")
        return jsonify({"error": "Internal server error in get_status_counts.", "details": str(e)}), 500


@fuel_order_bp.route('', methods=['POST', 'OPTIONS'])
@fuel_order_bp.route('/', methods=['POST', 'OPTIONS'])
@jwt_required()
@require_permission_v2('create_fuel_order')
def create_fuel_order():
    if request.method == 'OPTIONS':
        # Pre-flight request. Reply successfully:
        # Flask-CORS will handle adding the necessary headers.
        # We just need to return a valid response.
        return jsonify({'message': 'OPTIONS request successful'}), 200
    current_app.logger.info(f"--- Entered create_fuel_order function. Request Method: {request.method} ---")
    logger.info('[DEBUG] JWT_SECRET_KEY in create_fuel_order: %s', current_app.config.get('JWT_SECRET_KEY'))
    logger.info('[DEBUG] JWT_ALGORITHM in create_fuel_order: %s', current_app.config.get('JWT_ALGORITHM', 'HS256'))
    logger.info('Entered create_fuel_order')
    logger.info('Request data: %s', request.get_json())
    """Create a new fuel order.
    Requires create_fuel_order permission. If assigned_lst_user_id is -1, the backend will auto-assign the least busy active LST.
    ---
    tags:
      - Fuel Orders
    security:
      - bearerAuth: []
    requestBody:
      required: true
      content:
        application/json:
          schema: FuelOrderCreateRequestSchema
    responses:
      201:
        description: Fuel order created successfully
        content:
          application/json:
            schema: FuelOrderCreateResponseSchema
      400:
        description: Bad Request (e.g., missing fields, validation error, invalid related IDs)
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
    data = request.get_json()
    
    # Check if data exists and is a dictionary
    if not data or not isinstance(data, dict):
        return jsonify({"error": "Invalid request data"}), 400
    
    # Required fields validation (modified for assigned_truck_id and requested_amount)
    base_required_fields = {
        'tail_number': str,
        'fuel_type': str,
        'assigned_lst_user_id': int,
        'assigned_truck_id': int,
        # 'requested_amount': float, # Handled separately for robust conversion
        # 'location_on_ramp': str # Removed to allow Marshmallow to handle validation
    }

    # Validate requested_amount separately for robust conversion
    if 'requested_amount' not in data:
        logger.error('Step 2.1: Missing required field: requested_amount')
        return jsonify({"error": "Missing required field: requested_amount"}), 400
    try:
        data['requested_amount'] = float(data['requested_amount'])
        if data['requested_amount'] <= 0: # Assuming requested amount must be positive
             logger.error('Step 2.1: Invalid value for requested_amount: must be positive')
             return jsonify({"error": "Invalid value for requested_amount: must be a positive number"}), 400
    except (ValueError, TypeError):
        logger.error('Step 2.1: Invalid type or value for requested_amount. Value: %s', data.get('requested_amount'))
        return jsonify({"error": "Invalid type for field: requested_amount (must be a valid number)"}), 400

    for field, field_type in base_required_fields.items():
        if field not in data:
            logger.error('Step 2.1: Missing required field: %s', field)
            return jsonify({"error": f"Missing required field: {field}"}), 400
        if field == 'assigned_lst_user_id':
            try:
                data[field] = int(data[field])
                if data[field] != AUTO_ASSIGN_LST_ID and data[field] <= 0: # Assuming positive IDs or -1
                    return jsonify({"error": f"Invalid ID for field: {field}"}), 400
            except Exception:
                return jsonify({"error": f"Invalid type for field: {field} (must be integer or {AUTO_ASSIGN_LST_ID})"}), 400
        elif field == 'assigned_truck_id':
            try:
                data[field] = int(data[field])
                if data[field] != AUTO_ASSIGN_TRUCK_ID and data[field] <= 0: # Assuming positive IDs or -1
                    return jsonify({"error": f"Invalid ID for field: {field}"}), 400
            except Exception:
                return jsonify({"error": f"Invalid type for field: {field} (must be integer or {AUTO_ASSIGN_TRUCK_ID})"}), 400
        else:
            # For other fields, ensure they are of the expected type and not empty if string
            if not isinstance(data[field], field_type):
                return jsonify({"error": f"Invalid type for field: {field}"}), 400
            if field_type == str and not data[field].strip():
                 return jsonify({"error": f"Field {field} cannot be empty"}), 400

    # --- START AIRCRAFT GET OR CREATE ---
    tail_number_to_check = data['tail_number']
    aircraft, _, aircraft_status_code = AircraftService.get_aircraft_by_tail(tail_number_to_check)

    if aircraft_status_code == 404: # Aircraft not found, try to create it
        logger.info(f"Aircraft with tail_number {tail_number_to_check} not found. Attempting to create.")
        aircraft_data = {
            'tail_number': tail_number_to_check,
            'aircraft_type': data.get('aircraft_type', 'Unknown'), # Use provided or default
            'fuel_type': data['fuel_type'] # Use fuel_type from order
        }
        # Check if 'aircraft_type' was provided in the request, if not, use a default.
        # This is important because Aircraft model requires aircraft_type.
        if 'aircraft_type' not in data or not data['aircraft_type']:
             logger.warning(f"aircraft_type not provided for new tail_number {tail_number_to_check}. Defaulting to 'Unknown'.")
             aircraft_data['aircraft_type'] = 'Unknown'


        new_aircraft, message, new_aircraft_status_code = AircraftService.create_aircraft(aircraft_data)
        if new_aircraft_status_code == 201:
            logger.info(f"Successfully created new aircraft: {tail_number_to_check}")
            aircraft = new_aircraft # Use the newly created aircraft
        elif new_aircraft_status_code == 409: # Already exists, race condition? Try to get it again.
            logger.warning(f"Aircraft {tail_number_to_check} already exists (encountered 409 on create), attempting to retrieve again.")
            aircraft, _, aircraft_status_code = AircraftService.get_aircraft_by_tail(tail_number_to_check)
            if not aircraft:
                logger.error(f"Failed to retrieve aircraft {tail_number_to_check} after 409 on create: {message}")
                return jsonify({"error": f"Failed to process aircraft {tail_number_to_check} after creation attempt: {message}"}), 500
        else: # Other error creating aircraft
            logger.error(f"Failed to create aircraft {tail_number_to_check}: {message} (Status: {new_aircraft_status_code})")
            return jsonify({"error": f"Failed to create new aircraft {tail_number_to_check}: {message}"}), new_aircraft_status_code
    elif aircraft_status_code != 200 and aircraft_status_code != 404: # Other error fetching aircraft
        logger.error(f"Error fetching aircraft {tail_number_to_check}: (Status: {aircraft_status_code})")
        return jsonify({"error": f"Error fetching aircraft details for {tail_number_to_check}"}), aircraft_status_code
    
    # At this point, 'aircraft' should hold the valid aircraft object (either existing or newly created)
    # Or an error response would have been returned.
    # We can also update the aircraft's fuel_type if it differs from the order,
    # or if the aircraft was just created with a default.
    if aircraft and aircraft.fuel_type != data['fuel_type']:
        logger.info(f"Updating fuel_type for aircraft {aircraft.tail_number} from {aircraft.fuel_type} to {data['fuel_type']}.")
        updated_aircraft, msg, status = AircraftService.update_aircraft(aircraft.tail_number, {'fuel_type': data['fuel_type']})
        if status != 200:
            logger.warning(f"Could not update fuel_type for aircraft {aircraft.tail_number}: {msg}")
        else:
            aircraft = updated_aircraft # ensure 'aircraft' variable has the latest state.

    # --- END AIRCRAFT GET OR CREATE ---

    # LST Auto-assignment
    if data['assigned_lst_user_id'] == AUTO_ASSIGN_LST_ID:
        try:
            from src.services.fuel_order_service import FuelOrderService
            # Get all active LST users using permission-based logic
            lst_users = FuelOrderService.get_active_lsts()
            if not lst_users:
                logger.error('No active LST users found for auto-assignment')
                return jsonify({"error": "No active LST users available for auto-assignment"}), 400
            # Find the LST with the fewest active/in-progress orders
            least_busy = None
            min_orders = None
            for lst in lst_users:
                count = FuelOrder.query.filter(
                    FuelOrder.assigned_lst_user_id == lst.id,
                    FuelOrder.status.in_([
                        FuelOrderStatus.DISPATCHED,
                        FuelOrderStatus.ACKNOWLEDGED,
                        FuelOrderStatus.EN_ROUTE,
                        FuelOrderStatus.FUELING
                    ])
                ).count()
                if min_orders is None or count < min_orders:
                    min_orders = count
                    least_busy = lst
            if not least_busy:
                logger.error('Auto-assign logic failed to select an LST')
                return jsonify({"error": "Auto-assign failed to select an LST"}), 400
            data['assigned_lst_user_id'] = least_busy.id
            logger.info(f"Auto-assigned LST user_id {least_busy.id} (username={least_busy.username}) with {min_orders} active orders.")
        except Exception as e:
            logger.error(f"Error during auto-assignment of LST: {str(e)}")
            return jsonify({"error": f"Error during auto-assignment of LST: {str(e)}"}), 500
    # --- END LST AUTO-ASSIGN ---

    # Truck Auto-assignment
    if data['assigned_truck_id'] == AUTO_ASSIGN_TRUCK_ID:
        try:
            # Get all active FuelTrucks
            # For simplicity, picking the first active one.
            # Future enhancement: more sophisticated selection logic (e.g., fuel type compatibility, availability)
            active_truck = FuelTruck.query.filter(FuelTruck.is_active == True).first()
            
            if not active_truck:
                logger.error('No active FuelTrucks found for auto-assignment')
                return jsonify({"error": "No active FuelTrucks available for auto-assignment"}), 400
            
            data['assigned_truck_id'] = active_truck.id
            logger.info(f"Auto-assigned FuelTruck ID {active_truck.id} (Name: {active_truck.name if hasattr(active_truck, 'name') else 'N/A'}).")
        except Exception as e:
            logger.error(f"Error during auto-assignment of FuelTruck: {str(e)}")
            return jsonify({"error": f"Error during auto-assignment of FuelTruck: {str(e)}"}), 500
    # --- END TRUCK AUTO-ASSIGN ---

    # Optional fields validation
    optional_fields = {
        'customer_id': int,
        'additive_requested': bool,
        'csr_notes': str,
        'location_on_ramp': str  # Added location_on_ramp as optional field
    }
    
    for field, field_type in optional_fields.items():
        if field in data:
            try:
                # Convert to expected type if necessary
                if field_type == int:
                    # Allow None for optional integer fields
                    if data[field] is not None:
                        data[field] = int(data[field])
                    # If data[field] is None, leave as None
                elif field_type == bool and not isinstance(data[field], bool):
                    data[field] = bool(data[field])
                elif field_type == str and data[field] is not None and not isinstance(data[field], str):
                    data[field] = str(data[field])
            except (ValueError, TypeError):
                logger.error('Step 3.1: Invalid type for optional field %s. Value: %s', field, data[field])
                return jsonify({"error": f"Invalid type for field {field}. Expected {field_type.__name__}"}), 400
    logger.info('Step 3: Passed optional fields validation')
    
    # Create the fuel order
    try:
        logger.info('Step 4: Creating FuelOrder with data: %s', data)
        fuel_order = FuelOrder(
            tail_number=data['tail_number'],
            customer_id=data.get('customer_id'),
            fuel_type=data['fuel_type'],
            additive_requested=data.get('additive_requested', False),
            requested_amount=data['requested_amount'],
            assigned_lst_user_id=data['assigned_lst_user_id'],
            assigned_truck_id=data['assigned_truck_id'],
            location_on_ramp=data.get('location_on_ramp'),
            csr_notes=data.get('csr_notes')
        )
        logger.info('Step 5: FuelOrder object created')
        db.session.add(fuel_order)
        logger.info('Step 6: FuelOrder added to session')
        db.session.commit()
        logger.info('Step 7: FuelOrder committed')
        return jsonify({
            'message': 'Fuel order created successfully',
            'fuel_order': {
                'id': fuel_order.id,
                'tail_number': fuel_order.tail_number,
                'customer_id': fuel_order.customer_id,
                'fuel_type': fuel_order.fuel_type,
                'additive_requested': fuel_order.additive_requested,
                'requested_amount': str(fuel_order.requested_amount) if fuel_order.requested_amount else None,
                'assigned_lst_user_id': fuel_order.assigned_lst_user_id,
                'assigned_truck_id': fuel_order.assigned_truck_id,
                'location_on_ramp': fuel_order.location_on_ramp,
                'csr_notes': fuel_order.csr_notes,
                'status': fuel_order.status.value,
                'created_at': fuel_order.created_at.isoformat()
            }
        }), 201
    except Exception as e:
        db.session.rollback()
        logger.exception("Exception in create_fuel_order")
        return jsonify({"error": f"Error creating fuel order: {str(e)}"}), 500

@fuel_order_bp.route('', methods=['GET', 'OPTIONS'])
@fuel_order_bp.route('/', methods=['GET', 'OPTIONS'])
@jwt_required()
@require_permission_v2('view_assigned_orders')
def get_fuel_orders():
    import traceback
    try:
        current_app.logger.info(f"[get_fuel_orders] User: {getattr(g, 'current_user', None)} | Args: {request.args}")
        from src.services.fuel_order_service import FuelOrderService
        filters = dict(request.args)
        paginated_result, message = FuelOrderService.get_fuel_orders(current_user=g.current_user, filters=filters)
        if paginated_result is not None:
            orders_list = []
            for order in paginated_result.items:
                # Use a custom to_dict if available, else fallback to basic fields
                if hasattr(order, 'to_dict'):
                    orders_list.append(order.to_dict())
                else:
                    orders_list.append({
                        'id': order.id,
                        'tail_number': order.tail_number,
                        'customer_id': order.customer_id,
                        'fuel_type': order.fuel_type,
                        'additive_requested': order.additive_requested,
                        'requested_amount': str(order.requested_amount) if order.requested_amount else None,
                        'assigned_lst_user_id': order.assigned_lst_user_id,
                        'assigned_truck_id': order.assigned_truck_id,
                        'location_on_ramp': order.location_on_ramp,
                        'csr_notes': order.csr_notes,
                        'status': order.status.value,
                        'created_at': order.created_at.isoformat() if order.created_at else None
                    })
            response = {
                "orders": orders_list,
                "message": message,
                "pagination": {
                    "page": paginated_result.page,
                    "per_page": paginated_result.per_page,
                    "total": paginated_result.total,
                    "pages": paginated_result.pages,
                    "has_next": paginated_result.has_next,
                    "has_prev": paginated_result.has_prev
                }
            }
            return jsonify(response), 200
        else:
            return jsonify({"error": message}), 400
    except Exception as e:
        current_app.logger.error(f"Unhandled exception in get_fuel_orders route: {str(e)}\n{traceback.format_exc()}")
        return jsonify({"error": "An internal server error occurred in get_fuel_orders route.", "details": str(e)}), 500

@fuel_order_bp.route('/<int:order_id>', methods=['GET'])
@jwt_required()
@require_permission_or_ownership_v2('view_all_orders', 'fuel_order', 'order_id')
def get_fuel_order(order_id):
    """Get details of a specific fuel order.
    Requires view_all_orders permission OR ownership of the order.
    ---
    tags:
      - Fuel Orders
    security:
      - bearerAuth: []
    parameters:
      - in: path
        name: order_id
        schema:
          type: integer
        required: true
        description: ID of the fuel order to retrieve
    responses:
      200:
        description: Fuel order details retrieved successfully
        content:
          application/json:
            schema:
              type: object
              properties:
                message:
                  type: string
                fuel_order:
                  type: object
      401:
        description: Unauthorized
        content:
          application/json:
            schema: ErrorResponseSchema
      403:
        description: Forbidden (missing permission or not order owner)
        content:
          application/json:
            schema: ErrorResponseSchema
      404:
        description: Fuel order not found
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
        fuel_order, message, status_code = FuelOrderService.get_fuel_order_by_id(order_id, current_user=g.current_user)
        if fuel_order is not None:
            return jsonify({"message": message, "fuel_order": fuel_order}), status_code
        else:
            return jsonify({"error": message}), status_code
    except Exception as e:
        current_app.logger.error(f"Unhandled exception in get_fuel_order: {str(e)}")
        return jsonify({"error": "Internal server error in get_fuel_order.", "details": str(e)}), 500

@fuel_order_bp.route('/<int:order_id>/status', methods=['PATCH'])
@jwt_required()
@require_permission_v2('update_order_status', 'fuel_order', 'order_id')
def update_fuel_order_status(order_id):
    """Update a fuel order's status.
    Requires update_order_status permission for the specific order.
    ---
    tags:
      - Fuel Orders
    security:
      - bearerAuth: []
    parameters:
      - in: path
        name: order_id
        schema:
          type: integer
        required: true
        description: ID of the fuel order to update
    requestBody:
      required: true
      content:
        application/json:
          schema:
            type: object
            properties:
              status:
                type: string
                enum: [pending, fueling, completed, cancelled]
              lst_notes:
                type: string
            required:
              - status
    responses:
      200:
        description: Status updated successfully
        content:
          application/json:
            schema:
              type: object
              properties:
                message:
                  type: string
                fuel_order:
                  type: object
      400:
        description: Bad Request
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
        description: Fuel order not found
        content:
          application/json:
            schema: ErrorResponseSchema
      500:
        description: Server error
        content:
          application/json:
            schema: ErrorResponseSchema
    """
    data = request.get_json()
    
    # Check if data exists and is a dictionary
    if not data or not isinstance(data, dict):
        return jsonify({"error": "Invalid request data"}), 400
    
    # Required fields validation
    required_fields = {
        'status': str,
        'assigned_truck_id': int
    }
    
    for field, field_type in required_fields.items():
        if field not in data:
            return jsonify({"error": f"Missing required field: {field}"}), 400
        try:
            # Convert to expected type if necessary
            if field_type == int:
                data[field] = int(data[field])
            elif field_type == str and not isinstance(data[field], str):
                data[field] = str(data[field])
            
            # Additional validation for specific fields
            if field_type == str and not data[field].strip():
                return jsonify({"error": f"Field {field} cannot be empty"}), 400
        except (ValueError, TypeError):
            return jsonify({"error": f"Invalid type for field {field}. Expected {field_type.__name__}"}), 400
    
    # Get the fuel order
    fuel_order = FuelOrder.query.get(order_id)
    if not fuel_order:
        return jsonify({"error": "Fuel order not found"}), 404
    
    # Update the fuel order
    try:
        # Convert status to uppercase for enum lookup
        status_value = data['status'].upper()
        print(f"Attempting to update status to: {status_value}")
        if status_value not in FuelOrderStatus.__members__:
            print(f"Invalid status value: {data['status']}")
            print(f"Valid status values: {list(FuelOrderStatus.__members__.keys())}")
            return jsonify({"error": f"Invalid status value: {data['status']}"}), 400
            
        fuel_order.status = FuelOrderStatus[status_value]
        fuel_order.assigned_truck_id = data['assigned_truck_id']
        fuel_order.lst_notes = data.get('lst_notes')
        db.session.commit()
        
        return jsonify({
            'id': fuel_order.id,
            'tail_number': fuel_order.tail_number,
            'customer_id': fuel_order.customer_id,
            'fuel_type': fuel_order.fuel_type,
            'additive_requested': fuel_order.additive_requested,
            'requested_amount': fuel_order.requested_amount,
            'assigned_lst_user_id': fuel_order.assigned_lst_user_id,
            'assigned_truck_id': fuel_order.assigned_truck_id,
            'location_on_ramp': fuel_order.location_on_ramp,
            'csr_notes': fuel_order.csr_notes,
            'status': fuel_order.status.value,
            'updated_at': fuel_order.updated_at.isoformat()
        }), 200
    except Exception as e:
        db.session.rollback()
        print(f"Error updating fuel order: {str(e)}")
        print(f"Data: {data}")
        print(f"Status value: {data['status']}")
        return jsonify({"error": f"Error updating fuel order: {str(e)}"}), 500

@fuel_order_bp.route('/<int:order_id>/submit-data', methods=['PUT'])
@jwt_required()
@require_permission_v2('complete_fuel_order', 'fuel_order', 'order_id')
def submit_fuel_data(order_id):
    """Submit fuel meter readings and notes for a fuel order.
    Requires complete_fuel_order permission for the specific order. Order must be in FUELING status.
    ---
    tags:
      - Fuel Orders
    security:
      - bearerAuth: []
    parameters:
      - in: path
        name: order_id
        schema:
          type: integer
        required: true
        description: ID of the fuel order to complete
    requestBody:
      required: true
      content:
        application/json:
          schema:
            type: object
            properties:
              fuel_delivered:
                type: number
                format: float
              start_meter_reading:
                type: number
                format: float
              end_meter_reading:
                type: number
                format: float
              lst_notes:
                type: string
            required:
              - fuel_delivered
              - start_meter_reading
              - end_meter_reading
    responses:
      200:
        description: Fuel data submitted successfully
        content:
          application/json:
            schema:
              type: object
              properties:
                message:
                  type: string
                fuel_order:
                  type: object
      400:
        description: Bad Request
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
        description: Fuel order not found
        content:
          application/json:
            schema: ErrorResponseSchema
      500:
        description: Server error
        content:
          application/json:
            schema: ErrorResponseSchema
    """
    # Get the fuel order
    fuel_order = FuelOrder.query.get_or_404(order_id)
    
    # Verify the LST is assigned to this order
    if fuel_order.assigned_lst_user_id != g.current_user.id:
        return jsonify({
            "error": "You are not authorized to submit data for this fuel order"
        }), 403
    
    # Verify order is in FUELING status
    if fuel_order.status != FuelOrderStatus.FUELING:
        return jsonify({
            "error": "Fuel order must be in FUELING status to submit meter readings"
        }), 422
    
    # Get and validate request data
    data = request.get_json()
    if not data:
        return jsonify({"error": "No data provided"}), 400
        
    # Validate required fields
    required_fields = {
        'fuel_delivered': float,
        'start_meter_reading': float,
        'end_meter_reading': float
    }
    
    for field, field_type in required_fields.items():
        if field not in data:
            return jsonify({"error": f"Missing required field: {field}"}), 400
        try:
            value = field_type(data[field])
            if value < 0:
                return jsonify({"error": f"{field} cannot be negative"}), 400
            data[field] = value
        except (ValueError, TypeError):
            return jsonify({"error": f"Invalid type for field {field}. Expected {field_type.__name__}"}), 400
            
    # Validate meter readings
    if data['end_meter_reading'] <= data['start_meter_reading']:
        return jsonify({
            "error": "End meter reading must be greater than start meter reading"
        }), 400
    
    try:
        # Update the fuel order
        fuel_order.fuel_delivered = data['fuel_delivered']
        fuel_order.start_meter_reading = data['start_meter_reading']
        fuel_order.end_meter_reading = data['end_meter_reading']
        fuel_order.lst_notes = data.get('lst_notes')
        fuel_order.status = FuelOrderStatus.COMPLETED
        fuel_order.completion_timestamp = datetime.utcnow()
        
        db.session.commit()
        
        return jsonify({
            "message": "Fuel data submitted successfully",
            "fuel_order": {
                "id": fuel_order.id,
                "status": fuel_order.status.value,
                "tail_number": fuel_order.tail_number,
                "fuel_delivered": fuel_order.fuel_delivered,
                "start_meter_reading": str(fuel_order.start_meter_reading),
                "end_meter_reading": str(fuel_order.end_meter_reading),
                "calculated_gallons_dispensed": str(fuel_order.calculated_gallons_dispensed),
                "lst_notes": fuel_order.lst_notes,
                "completion_timestamp": fuel_order.completion_timestamp.isoformat()
            }
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": f"Error submitting fuel data: {str(e)}"}), 500

@fuel_order_bp.route('/<int:order_id>/review', methods=['PATCH'])
@jwt_required()
@require_permission_v2('review_fuel_order')
def review_fuel_order(order_id):
    """Mark a completed fuel order as reviewed.
    Requires review_fuel_order permission. Order must be in COMPLETED state.
    ---
    tags:
      - Fuel Orders
    security:
      - bearerAuth: []
    parameters:
      - in: path
        name: order_id
        schema:
          type: integer
        required: true
        description: ID of the fuel order to review
    responses:
      200:
        description: Fuel order marked as reviewed successfully
        content:
          application/json:
            schema: FuelOrderUpdateResponseSchema # Use schema that returns updated order
      400:
        description: Bad Request (order not in COMPLETED state)
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
        description: Not Found
        content:
          application/json:
            schema: ErrorResponseSchema
      500:
        description: Server error
        content:
          application/json:
            schema: ErrorResponseSchema
    """
    # Call service method to review the order
    reviewed_order, message, status_code = FuelOrderService.review_fuel_order(
        order_id=order_id,
        reviewer_user=g.current_user
    )
    
    # Handle the result from the service
    if reviewed_order is not None:
        # Serialize the reviewed order details for the response
        order_details = {
            "id": reviewed_order.id,
            "status": reviewed_order.status.value,  # Should be REVIEWED
            "reviewed_by_csr_user_id": reviewed_order.reviewed_by_csr_user_id,
            "reviewed_timestamp": reviewed_order.reviewed_timestamp.isoformat() if reviewed_order.reviewed_timestamp else None
        }
        return jsonify({"message": message, "fuel_order": order_details}), status_code  # Use status_code from service (should be 200)
    else:
        return jsonify({"error": message}), status_code  # Use status_code from service (e.g., 400, 404, 500) 

@fuel_order_bp.route('/export', methods=['GET'])
@jwt_required()
@require_permission_v2('export_orders_csv')
def export_fuel_orders_csv():
    """Export fuel orders to a CSV file.
    Requires export_orders_csv permission.
    ---
    tags:
      - Fuel Orders
    security:
      - bearerAuth: []
    responses:
      200:
        description: CSV file exported successfully
      401:
        description: Unauthorized
      403:
        description: Forbidden (missing permission)
      500:
        description: Server error
    """
    # Extract filter parameters from request.args
    filters = {
        'status': request.args.get('status', None, type=str)
        # TODO: Add date_from, date_to filters later
    }

    # Call service method to generate CSV data
    csv_data, message, status_code = FuelOrderService.export_fuel_orders_to_csv(
        current_user=g.current_user,
        filters=filters
    )

    # Handle the result from the service
    if csv_data is not None and status_code == 200:
        # Check if we got an empty list (no data found)
        if isinstance(csv_data, list) and len(csv_data) == 0:
            return jsonify({"message": message}), 200

        # Generate dynamic filename with timestamp
        timestamp = datetime.utcnow().strftime('%Y%m%d_%H%M%S')
        filename = f"fuel_orders_export_{timestamp}.csv"

        # Create response with CSV data and appropriate headers
        response = Response(
            csv_data,
            mimetype='text/csv',
            headers={
                "Content-Disposition": f"attachment; filename={filename}"
            }
        )
        return response
    else:
        # Return error message and status code from service
        return jsonify({"error": message}), status_code 