from flask import request, jsonify
from ...services.customer_service import CustomerService
from src.utils.enhanced_auth_decorators_v2 import require_permission_v2
from ...models.user import UserRole
from ...schemas.admin_schemas import AdminCustomerSchema, AdminCustomerListResponseSchema, ErrorResponseSchema
from src.extensions import apispec
from .routes import admin_bp

@admin_bp.route('/customers', methods=['GET', 'OPTIONS'])
@require_permission_v2('manage_customers')
def list_customers():
    """
    ---
    get:
      summary: List all customers (admin, manage_customers permission required)
      tags:
        - Admin - Customers
      responses:
        200:
          description: List of customers
          content:
            application/json:
              schema: AdminCustomerListResponseSchema
        401:
          description: Unauthorized
        403:
          description: Forbidden (missing permission)
    """
    if request.method == 'OPTIONS':
        return jsonify({'message': 'OPTIONS request successful'}), 200
    customers, msg, status = CustomerService.get_all_customers(request.args)
    schema = AdminCustomerSchema(many=True)
    return jsonify({"customers": schema.dump(customers)}), status

@admin_bp.route('/customers', methods=['POST', 'OPTIONS'])
@require_permission_v2('manage_customers')
def create_customer():
    """
    ---
    post:
      summary: Create a new customer (admin, manage_customers permission required)
      tags:
        - Admin - Customers
      requestBody:
        required: true
        content:
          application/json:
            schema: AdminCustomerSchema
      responses:
        201:
          description: Customer created
          content:
            application/json:
              schema: AdminCustomerSchema
        400:
          description: Bad request
        409:
          description: Conflict
    """
    if request.method == 'OPTIONS':
        return jsonify({'message': 'OPTIONS request successful'}), 200
    data = request.get_json()
    customer, msg, status = CustomerService.create_customer(data)
    if not customer:
        return jsonify({"error": msg}), status
    schema = AdminCustomerSchema()
    return jsonify(schema.dump(customer)), status

@admin_bp.route('/customers/<int:customer_id>', methods=['GET'])
@require_permission_v2('manage_customers', {'resource_type': 'customer', 'id_param': 'customer_id'})
def get_customer(customer_id):
    """
    ---
    get:
      summary: Get a customer by ID (admin, manage_customers permission required)
      tags:
        - Admin - Customers
      parameters:
        - in: path
          name: customer_id
          schema:
            type: integer
          required: true
      responses:
        200:
          description: Customer details
          content:
            application/json:
              schema: AdminCustomerSchema
        404:
          description: Not found
    """
    customer, msg, status = CustomerService.get_customer_by_id(customer_id)
    if not customer:
        return jsonify({"error": msg}), status
    schema = AdminCustomerSchema()
    return jsonify(schema.dump(customer)), status

@admin_bp.route('/customers/<int:customer_id>', methods=['PATCH'])
@require_permission_v2('manage_customers', {'resource_type': 'customer', 'id_param': 'customer_id'})
def update_customer(customer_id):
    """
    ---
    patch:
      summary: Update a customer by ID (admin, manage_customers permission required)
      tags:
        - Admin - Customers
      parameters:
        - in: path
          name: customer_id
          schema:
            type: integer
          required: true
      requestBody:
        required: true
        content:
          application/json:
            schema: AdminCustomerSchema
      responses:
        200:
          description: Customer updated
          content:
            application/json:
              schema: AdminCustomerSchema
        400:
          description: Bad request
        404:
          description: Not found
    """
    data = request.get_json()
    customer, msg, status = CustomerService.update_customer(customer_id, data)
    if not customer:
        return jsonify({"error": msg}), status
    schema = AdminCustomerSchema()
    return jsonify(schema.dump(customer)), status

@admin_bp.route('/customers/<int:customer_id>', methods=['DELETE'])
@require_permission_v2('manage_customers', {'resource_type': 'customer', 'id_param': 'customer_id'})
def delete_customer(customer_id):
    """
    ---
    delete:
      summary: Delete a customer by ID (admin, manage_customers permission required)
      tags:
        - Admin - Customers
      parameters:
        - in: path
          name: customer_id
          schema:
            type: integer
          required: true
      responses:
        204:
          description: Customer deleted
        404:
          description: Not found
        409:
          description: Conflict (referenced by other records)
    """
    deleted, msg, status = CustomerService.delete_customer(customer_id)
    if not deleted:
        return jsonify({"error": msg}), status
    return '', 204
