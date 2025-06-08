from flask import Blueprint, request, jsonify, g
from ..utils.enhanced_auth_decorators_v2 import require_permission_v2
from ..services.customer_service import CustomerService
from marshmallow import ValidationError
from ..schemas import (
    CustomerCreateRequestSchema, 
    CustomerUpdateRequestSchema,
    CustomerResponseSchema,
    CustomerListResponseSchema,
    ErrorResponseSchema
)

customer_bp = Blueprint('customer_bp', __name__, url_prefix='/api/customers')

@customer_bp.route('', methods=['GET', 'OPTIONS'])
@customer_bp.route('/', methods=['GET', 'OPTIONS'])
@require_permission_v2('view_customers')
def get_customers():
    """Get a list of customers.
    Requires view_customers permission.
    ---
    tags:
      - Customers
    security:
      - bearerAuth: []
    responses:
      200:
        description: List of customers retrieved successfully
        content:
          application/json:
            schema: CustomerListResponseSchema
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
    
    customers, message, status_code = CustomerService.get_all_customers()
    if customers is not None:
        # Convert list of customer objects to list of dictionaries
        customers_data = [customer.to_dict() for customer in customers]
        return jsonify({"message": message, "customers": customers_data}), status_code
    else:
        return jsonify({"error": message}), status_code

@customer_bp.route('', methods=['POST', 'OPTIONS'])
@customer_bp.route('/', methods=['POST', 'OPTIONS'])
@require_permission_v2('manage_customers')
def create_customer():
    """Create a new customer.
    Requires manage_customers permission.
    ---
    tags:
      - Customers
    security:
      - bearerAuth: []
    requestBody:
      required: true
      content:
        application/json:
          schema: CustomerCreateRequestSchema
    responses:
      201:
        description: Customer created successfully
        content:
          application/json:
            schema: CustomerResponseSchema
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
        description: Conflict (e.g., customer already exists)
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
        schema = CustomerCreateRequestSchema()
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
        
        customer, message, status_code = CustomerService.create_customer(data)
        
        if customer is not None:
            return jsonify({"message": message, "customer": customer.to_dict()}), status_code
        else:
            return jsonify({"error": message}), status_code
            
    except Exception as e:
        from flask import current_app
        current_app.logger.error(f"Error creating customer: {e}")
        return jsonify({"error": "Server error"}), 500

@customer_bp.route('/<int:customer_id>', methods=['GET'])
@require_permission_v2('view_customers', 'customer', 'customer_id')
def get_customer(customer_id):
    """Get a customer by ID.
    Requires view_customers permission for the specific customer.
    ---
    tags:
      - Customers
    security:
      - bearerAuth: []
    parameters:
      - in: path
        name: customer_id
        schema:
          type: integer
        required: true
        description: ID of the customer to retrieve
    responses:
      200:
        description: Customer retrieved successfully
        content:
          application/json:
            schema: CustomerResponseSchema
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
        description: Customer not found
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
        customer, message, status_code = CustomerService.get_customer_by_id(customer_id)
        
        if customer is not None:
            return jsonify({"message": message, "customer": customer.to_dict()}), status_code
        else:
            return jsonify({"error": message}), status_code
            
    except Exception as e:
        from flask import current_app
        current_app.logger.error(f"Error getting customer {customer_id}: {e}")
        return jsonify({"error": "Server error"}), 500

@customer_bp.route('/<int:customer_id>', methods=['PATCH'])
@require_permission_v2('manage_customers', 'customer', 'customer_id')
def update_customer(customer_id):
    """Update a customer.
    Requires manage_customers permission for the specific customer.
    ---
    tags:
      - Customers
    security:
      - bearerAuth: []
    parameters:
      - in: path
        name: customer_id
        schema:
          type: integer
        required: true
        description: ID of the customer to update
    requestBody:
      required: true
      content:
        application/json:
          schema: CustomerUpdateRequestSchema
    responses:
      200:
        description: Customer updated successfully
        content:
          application/json:
            schema: CustomerResponseSchema
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
        description: Customer not found
        content:
          application/json:
            schema: ErrorResponseSchema
      409:
        description: Conflict (e.g., customer data conflict)
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
        schema = CustomerUpdateRequestSchema()
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
        
        customer, message, status_code = CustomerService.update_customer(customer_id, data)
        
        if customer is not None:
            return jsonify({"message": message, "customer": customer.to_dict()}), status_code
        else:
            return jsonify({"error": message}), status_code
            
    except Exception as e:
        from flask import current_app
        current_app.logger.error(f"Error updating customer {customer_id}: {e}")
        return jsonify({"error": "Server error"}), 500

@customer_bp.route('/<int:customer_id>', methods=['DELETE'])
@require_permission_v2('manage_customers', 'customer', 'customer_id')
def delete_customer(customer_id):
    """Delete a customer.
    Requires manage_customers permission for the specific customer.
    ---
    tags:
      - Customers
    security:
      - bearerAuth: []
    parameters:
      - in: path
        name: customer_id
        schema:
          type: integer
        required: true
        description: ID of the customer to delete
    responses:
      204:
        description: Customer deleted successfully
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
        description: Customer not found
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
        deleted, message, status_code = CustomerService.delete_customer(customer_id)
        
        if deleted:
            return '', 204
        else:
            return jsonify({"error": message}), status_code
            
    except Exception as e:
        from flask import current_app
        current_app.logger.error(f"Error deleting customer {customer_id}: {e}")
        return jsonify({"error": "Server error"}), 500
