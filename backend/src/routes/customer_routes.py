from flask import Blueprint, request, jsonify
from ..utils.decorators import token_required, require_permission
from ..models.user import UserRole
from ..services.customer_service import CustomerService
from ..schemas.customer_schemas import (
    CustomerCreateSchema,
    CustomerUpdateSchema,
    CustomerResponseSchema,
    CustomerListSchema,
    ErrorResponseSchema
)

customer_bp = Blueprint('customer_bp', __name__, url_prefix='/api/customers')

@customer_bp.route('', methods=['GET', 'OPTIONS'])
@customer_bp.route('/', methods=['GET', 'OPTIONS'])
@token_required
@require_permission('VIEW_CUSTOMERS')
def list_customers():
    """Get all customers (VIEW_CUSTOMERS permission required).
    ---
    tags:
      - Customers
    security:
      - bearerAuth: []
    responses:
      200:
        description: Customer list
        content:
          application/json:
            schema: CustomerListSchema
    """
    if request.method == 'OPTIONS':
        return jsonify({'message': 'OPTIONS request successful'}), 200
    customers, message, status_code = CustomerService.get_all_customers()
    return jsonify({
        "message": message,
        "customers": [CustomerResponseSchema().dump(c) for c in customers]
    }), status_code

@customer_bp.route('', methods=['POST', 'OPTIONS'])
@customer_bp.route('/', methods=['POST', 'OPTIONS'])
@token_required
@require_permission('MANAGE_CUSTOMERS')
def create_customer():
    """Create a customer (MANAGE_CUSTOMERS permission required).
    ---
    tags:
      - Customers
    security:
      - bearerAuth: []
    requestBody:
      required: true
      content:
        application/json:
          schema: CustomerCreateSchema
    responses:
      201:
        description: Customer created
        content:
          application/json:
            schema: CustomerResponseSchema
    """
    if request.method == 'OPTIONS':
        return jsonify({'message': 'OPTIONS request successful'}), 200
    schema = CustomerCreateSchema()
    try:
        data = schema.load(request.get_json())
    except Exception as e:
        return jsonify({"error": str(e)}), 400
    customer, message, status_code = CustomerService.create_customer(data)
    if customer:
        return jsonify({"message": message, "customer": CustomerResponseSchema().dump(customer)}), status_code
    else:
        return jsonify({"error": message}), status_code

@customer_bp.route('/<int:customer_id>', methods=['GET'])
@token_required
@require_permission('VIEW_CUSTOMERS')
def get_customer(customer_id):
    """Get a customer by ID (VIEW_CUSTOMERS permission required).
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
        description: Customer ID
    responses:
      200:
        description: Customer found
        content:
          application/json:
            schema: CustomerResponseSchema
      404:
        description: Not found
        content:
          application/json:
            schema: ErrorResponseSchema
    """
    customer, message, status_code = CustomerService.get_customer_by_id(customer_id)
    if customer:
        return jsonify({"message": message, "customer": CustomerResponseSchema().dump(customer)}), status_code
    else:
        return jsonify({"error": message}), status_code

@customer_bp.route('/<int:customer_id>', methods=['PATCH'])
@token_required
@require_permission('MANAGE_CUSTOMERS')
def update_customer(customer_id):
    """Update a customer (MANAGE_CUSTOMERS permission required).
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
        description: Customer ID
    requestBody:
      required: true
      content:
        application/json:
          schema: CustomerUpdateSchema
    responses:
      200:
        description: Customer updated
        content:
          application/json:
            schema: CustomerResponseSchema
      404:
        description: Not found
        content:
          application/json:
            schema: ErrorResponseSchema
    """
    schema = CustomerUpdateSchema(partial=True)
    try:
        data = schema.load(request.get_json())
    except Exception as e:
        return jsonify({"error": str(e)}), 400
    customer, message, status_code = CustomerService.update_customer(customer_id, data)
    if customer:
        return jsonify({"message": message, "customer": CustomerResponseSchema().dump(customer)}), status_code
    else:
        return jsonify({"error": message}), status_code

@customer_bp.route('/<int:customer_id>', methods=['DELETE'])
@token_required
@require_permission('MANAGE_CUSTOMERS')
def delete_customer(customer_id):
    """Delete a customer (MANAGE_CUSTOMERS permission required).
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
        description: Customer ID
    responses:
      200:
        description: Customer deleted
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
    success, message, status_code = CustomerService.delete_customer(customer_id)
    if success:
        return jsonify({"message": message}), status_code
    else:
        return jsonify({"error": message}), status_code
