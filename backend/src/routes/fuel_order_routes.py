from flask import Blueprint, request, jsonify, g, Response, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from ..utils.enhanced_auth_decorators_v2 import require_permission_v2, require_permission_or_ownership_v2, require_any_permission_v2
from ..models.user import UserRole
from ..models.fuel_order import FuelOrder, FuelOrderStatus
from ..services.fuel_order_service import FuelOrderService
from ..schemas import OrderStatusCountsResponseSchema, ErrorResponseSchema
from ..schemas.fuel_order_schemas import (
    FuelOrderCreateRequestSchema,
    FuelOrderCreateResponseSchema,
    FuelOrderResponseSchema,
    FuelOrderBriefResponseSchema,
    FuelOrderListResponseSchema,
    PaginationSchema
)
from ..models import User, Customer
from ..extensions import db
import logging
from datetime import datetime

# Create the blueprint for fuel order routes
fuel_order_bp = Blueprint('fuel_order_bp', __name__)

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
    
    # Parse request data
    data = request.get_json()
    
    # Call the service layer to handle all business logic
    fuel_order, message, status_code = FuelOrderService.create_fuel_order(data)
    
    if fuel_order:
        # Use Marshmallow schema for consistent serialization
        schema = FuelOrderCreateResponseSchema()
        return jsonify(schema.dump({
            'message': message,
            'fuel_order': fuel_order
        })), status_code
    else:
        # Error - return the error message
        return jsonify({"error": message}), status_code

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
            # Use Marshmallow schema for consistent serialization
            brief_schema = FuelOrderBriefResponseSchema(many=True)
            orders_data = brief_schema.dump(paginated_result.items)
            
            pagination_schema = PaginationSchema()
            pagination_data = pagination_schema.dump({
                'page': paginated_result.page,
                'per_page': paginated_result.per_page,
                'total_pages': paginated_result.pages,
                'total_items': paginated_result.total,
                'has_next': paginated_result.has_next,
                'has_prev': paginated_result.has_prev
            })
            
            response = {
                "orders": orders_data,
                "message": message,
                "pagination": pagination_data
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
            # Use the schema for consistent serialization with receipt_id and is_locked fields
            schema = FuelOrderResponseSchema()
            return jsonify({"message": message, "fuel_order": schema.dump(fuel_order)}), status_code
        else:
            return jsonify({"error": message}), status_code
    except Exception as e:
        current_app.logger.error(f"Unhandled exception in get_fuel_order: {str(e)}")
        return jsonify({"error": "Internal server error in get_fuel_order.", "details": str(e)}), 500

@fuel_order_bp.route('/<int:order_id>/status', methods=['PATCH'])
@jwt_required()
@require_any_permission_v2('update_order_status', 'edit_fuel_order', resource_context={'resource_type': 'fuel_order', 'id_param': 'order_id'})
def update_fuel_order_status(order_id):
    """Update a fuel order's status with auditing.
    Requires update_order_status or edit_fuel_order permission for the specific order.
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
                enum: [Dispatched, Acknowledged, "En Route", Fueling, Completed, Reviewed, Cancelled]
              start_meter_reading:
                type: number
                format: float
                description: Required when status is COMPLETED
              end_meter_reading:
                type: number
                format: float
                description: Required when status is COMPLETED
              reason:
                type: string
                description: Optional reason for the status change
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
    if not data or 'status' not in data:
        return jsonify({"error": "Missing 'status' in request body"}), 400

    try:
        updated_order = FuelOrderService.manual_update_order_status(
            order_id=order_id,
            user_id=get_jwt_identity(),
            update_data=data
        )
        # Use Marshmallow schema for consistent serialization
        schema = FuelOrderResponseSchema()
        return jsonify({
            "message": "Status updated successfully.",
            "fuel_order": schema.dump(updated_order)
        }), 200
    except ValueError as e:
        # Distinguish between 404 and 400 errors
        if "not found" in str(e).lower():
            return jsonify({"error": str(e)}), 404
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error updating fuel order status: {str(e)}")
        return jsonify({"error": f"Error updating fuel order: {str(e)}"}), 500

@fuel_order_bp.route('/<int:order_id>/submit-data', methods=['PUT'])
@jwt_required()
@require_permission_v2('complete_fuel_order', {'resource_type': 'fuel_order', 'id_param': 'order_id'})
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

@fuel_order_bp.route('/statuses', methods=['GET'])
@jwt_required()
def get_fuel_order_statuses():
    """Get all possible fuel order status values.
    Accessible by any authenticated user.
    ---
    tags:
      - Fuel Orders
    security:
      - bearerAuth: []
    responses:
      200:
        description: List of fuel order statuses
        content:
          application/json:
            schema:
              type: array
              items:
                type: string
              example: ["Dispatched", "Acknowledged", "En Route", "Fueling", "Completed", "Reviewed", "Cancelled"]
      401:
        description: Unauthorized (invalid/missing token)
        content:
          application/json:
            schema: ErrorResponseSchema
    """
    return jsonify({
        'statuses': [status.value for status in FuelOrderStatus]
    }), 200


# =============================================================================
# NEW FUELER SYSTEM ROUTES FOR REAL-TIME ORDER MANAGEMENT
# =============================================================================

@fuel_order_bp.route('/<int:order_id>/claim', methods=['POST'])
@jwt_required()
@require_permission_v2('access_fueler_dashboard')
def claim_order(order_id):
    """
    Atomically claim an unassigned fuel order to prevent race conditions.
    
    This endpoint allows fuelers to claim orders that are currently unassigned.
    The operation is atomic to prevent multiple fuelers from claiming the same order.
    
    Args:
        order_id: The ID of the fuel order to claim
        
    Returns:
        JSON response with order details and success/error message
    """
    try:
        order, message, status_code = FuelOrderService.claim_order(order_id, g.current_user.id)
        
        if order:
            return jsonify({
                'message': message,
                'order': order.to_dict()
            }), status_code
        else:
            return jsonify({'error': message}), status_code
            
    except Exception as e:
        logger.error(f"Error in claim_order endpoint: {e}")
        return jsonify({'error': 'Internal server error'}), 500


@fuel_order_bp.route('/<int:order_id>/csr-update', methods=['PATCH'])
@jwt_required()
@require_any_permission_v2('manage_fuel_orders', 'edit_fuel_order')
def csr_update_order(order_id):
    """
    Allow CSR to update order details and increment change version.
    
    This endpoint allows Customer Service Representatives to update order details
    while the order is in progress. The fueler must acknowledge the changes before
    continuing with order processing.
    
    Args:
        order_id: The ID of the fuel order to update
        
    Request Body:
        JSON object containing fields to update (e.g., requested_amount, location_on_ramp, etc.)
        
    Returns:
        JSON response with updated order details and new change version
    """
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({'error': 'Request body is required'}), 400
        
        order, message, status_code = FuelOrderService.csr_update_order(
            order_id, data, g.current_user.id
        )
        
        if order:
            return jsonify({
                'message': message,
                'order': order.to_dict(),
                'change_version': order.change_version
            }), status_code
        else:
            return jsonify({'error': message}), status_code
            
    except Exception as e:
        logger.error(f"Error in csr_update_order endpoint: {e}")
        return jsonify({'error': 'Internal server error'}), 500


@fuel_order_bp.route('/<int:order_id>/acknowledge-change', methods=['POST'])
@jwt_required()
@require_permission_v2('access_fueler_dashboard')
def acknowledge_order_change(order_id):
    """
    Acknowledge CSR changes to allow fueler to continue with order processing.
    
    This endpoint allows fuelers to acknowledge changes made by CSRs to their orders.
    Once acknowledged, the fueler can continue with normal order processing.
    
    Args:
        order_id: The ID of the fuel order with pending changes
        
    Request Body:
        JSON object containing:
        - change_version: The version number of changes being acknowledged
        
    Returns:
        JSON response confirming acknowledgment and updated order status
    """
    try:
        data = request.get_json()
        
        if not data or 'change_version' not in data:
            return jsonify({'error': 'change_version is required'}), 400
        
        try:
            change_version = int(data['change_version'])
        except (ValueError, TypeError):
            return jsonify({'error': 'change_version must be a valid integer'}), 400
        
        order, message, status_code = FuelOrderService.acknowledge_order_change(
            order_id, change_version, g.current_user.id
        )
        
        if order:
            return jsonify({
                'message': message,
                'order': order.to_dict()
            }), status_code
        else:
            return jsonify({'error': message}), status_code
            
    except Exception as e:
        logger.error(f"Error in acknowledge_order_change endpoint: {e}")
        return jsonify({'error': 'Internal server error'}), 500


@fuel_order_bp.route('/<int:order_id>/submit-data-atomic', methods=['PUT'])
@jwt_required()
@require_permission_v2('complete_fuel_order')
def submit_fuel_data_atomic(order_id):
    """
    Atomically complete a fuel order with meter readings and truck updates.
    
    This endpoint provides atomic completion of fuel orders, ensuring that both
    the order completion and fuel truck meter updates happen in a single transaction.
    This prevents data inconsistencies and race conditions.
    
    Args:
        order_id: The ID of the fuel order to complete
        
    Request Body:
        JSON object containing:
        - start_meter_reading: Starting meter reading (required)
        - end_meter_reading: Ending meter reading (required)
        - lst_notes: Optional notes from the Line Service Technician
        
    Returns:
        JSON response with completed order details and calculated gallons dispensed
    """
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({'error': 'Request body is required'}), 400
        
        # Validate required fields
        required_fields = ['start_meter_reading', 'end_meter_reading']
        missing_fields = [field for field in required_fields if field not in data]
        
        if missing_fields:
            return jsonify({
                'error': f'Missing required fields: {", ".join(missing_fields)}'
            }), 400
        
        order, message, status_code = FuelOrderService.complete_order_atomic(
            order_id, data, g.current_user.id
        )
        
        if order:
            return jsonify({
                'message': message,
                'order': order.to_dict(),
                'gallons_dispensed': float(order.gallons_dispensed) if order.gallons_dispensed else 0
            }), status_code
        else:
            return jsonify({'error': message}), status_code
            
    except Exception as e:
        logger.error(f"Error in submit_fuel_data_atomic endpoint: {e}")
        return jsonify({'error': 'Internal server error'}), 500 