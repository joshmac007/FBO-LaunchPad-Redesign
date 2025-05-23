from flask import request, jsonify
from ...services.role_service import RoleService
from ...services.permission_service import PermissionService
from src.utils.decorators import token_required, require_permission
from ...models.user import UserRole
from ...schemas.role_schemas import (
    RoleSchema,
    RoleListResponseSchema,
    RoleCreateRequestSchema,
    RoleUpdateRequestSchema,
    RoleAssignPermissionRequestSchema
)
from ...schemas.permission_schemas import PermissionSchema
from ...schemas import ErrorResponseSchema
from marshmallow import ValidationError
from src.extensions import apispec
from .routes import admin_bp

@admin_bp.route('roles', methods=['GET', 'OPTIONS'])
@admin_bp.route('/roles', methods=['GET', 'OPTIONS'])
@token_required
@require_permission('MANAGE_ROLES')
def get_roles():
    """
    ---
    get:
      summary: List all roles (admin, MANAGE_ROLES permission required)
      tags:
        - Admin - Roles
      responses:
        200:
          description: List of roles
          content:
            application/json:
              schema: RoleListResponseSchema
        401:
          description: Unauthorized
        403:
          description: Forbidden (missing permission)
    """
    roles, msg, status = RoleService.get_all_roles()
    schema = RoleSchema(many=True)
    return jsonify({"roles": schema.dump(roles)}), status

@admin_bp.route('roles', methods=['POST', 'OPTIONS'])
@admin_bp.route('/roles', methods=['POST', 'OPTIONS'])
@token_required
@require_permission('MANAGE_ROLES')
def create_role():
    """
    ---
    post:
      summary: Create a new role (admin, MANAGE_ROLES permission required)
      tags:
        - Admin - Roles
      requestBody:
        required: true
        content:
          application/json:
            schema: RoleCreateRequestSchema
      responses:
        201:
          description: Role created
          content:
            application/json:
              schema: RoleSchema
        400:
          description: Bad request
        409:
          description: Conflict
    """
    if request.method == 'OPTIONS':
        return jsonify({'message': 'OPTIONS request successful'}), 200
    data = request.get_json()
    role, msg, status = RoleService.create_role(data)
    if not role:
        return jsonify({"error": msg}), status
    schema = RoleSchema()
    return jsonify(schema.dump(role)), status

@admin_bp.route('/roles/<int:role_id>', methods=['GET'])
@token_required
@require_permission('MANAGE_ROLES')
def get_role(role_id):
    """
    ---
    get:
      summary: Get a role by ID (admin, MANAGE_ROLES permission required)
      tags:
        - Admin - Roles
      parameters:
        - in: path
          name: role_id
          schema:
            type: integer
          required: true
      responses:
        200:
          description: Role details
          content:
            application/json:
              schema: RoleSchema
        404:
          description: Not found
    """
    role, msg, status = RoleService.get_role_by_id(role_id)
    if not role:
        return jsonify({"error": msg}), status
    schema = RoleSchema()
    return jsonify(schema.dump(role)), status

@admin_bp.route('/roles/<int:role_id>', methods=['PATCH'])
@token_required
@require_permission('MANAGE_ROLES')
def update_role(role_id):
    """
    ---
    patch:
      summary: Update a role by ID (admin, MANAGE_ROLES permission required)
      tags:
        - Admin - Roles
      parameters:
        - in: path
          name: role_id
          schema:
            type: integer
          required: true
      requestBody:
        required: true
        content:
          application/json:
            schema: RoleUpdateRequestSchema
      responses:
        200:
          description: Role updated
          content:
            application/json:
              schema: RoleSchema
        400:
          description: Bad request
        404:
          description: Not found
    """
    data = request.get_json()
    role, msg, status = RoleService.update_role(role_id, data)
    if not role:
        return jsonify({"error": msg}), status
    schema = RoleSchema()
    return jsonify(schema.dump(role)), status

@admin_bp.route('/roles/<int:role_id>', methods=['DELETE'])
@token_required
@require_permission('MANAGE_ROLES')
def delete_role(role_id):
    """
    ---
    delete:
      summary: Delete a role by ID (admin, MANAGE_ROLES permission required)
      tags:
        - Admin - Roles
      parameters:
        - in: path
          name: role_id
          schema:
            type: integer
          required: true
      responses:
        204:
          description: Role deleted
        404:
          description: Not found
        409:
          description: Conflict (role is assigned to users)
    """
    deleted, msg, status = RoleService.delete_role(role_id)
    if not deleted:
        return jsonify({"error": msg}), status
    return '', 204

@admin_bp.route('/roles/<int:role_id>/permissions', methods=['GET'])
@token_required
@require_permission('MANAGE_ROLES')
def get_role_permissions(role_id):
    """
    ---
    get:
      summary: Get permissions assigned to a role (admin, MANAGE_ROLES permission required)
      tags:
        - Admin - Roles
      parameters:
        - in: path
          name: role_id
          schema:
            type: integer
          required: true
      responses:
        200:
          description: List of permissions assigned to the role
          content:
            application/json:
              schema: RoleSchema
        404:
          description: Role not found
    """
    role, msg, status = RoleService.get_role_by_id(role_id)
    if not role:
        return jsonify({"error": msg}), status
    schema = RoleSchema()
    return jsonify(schema.dump(role)), status

@admin_bp.route('/roles/<int:role_id>/permissions', methods=['POST'])
@token_required
@require_permission('MANAGE_ROLES')
def assign_permission(role_id):
    """Assign a permission to a role.
    Requires MANAGE_ROLES permission.
    ---
    post:
      summary: Assign permission to role (admin, MANAGE_ROLES permission required)
      tags:
        - Admin - Roles
      security:
        - bearerAuth: []
      parameters:
        - in: path
          name: role_id
          schema:
            type: integer
          required: true
          description: ID of the role
      requestBody:
        required: true
        content:
          application/json:
            schema: RoleAssignPermissionRequestSchema
      responses:
        200:
          description: Permission assigned
          content:
            application/json:
              schema:
                type: object
                properties:
                  message:
                    type: string
        400:
          description: Bad request
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
          description: Role or permission not found
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
        schema = RoleAssignPermissionRequestSchema()
        data = schema.load(request.get_json())
    except ValidationError as e:
        return jsonify({
            "error": "Validation error",
            "details": e.messages
        }), 400

    role, message, status_code = RoleService.assign_permission_to_role(role_id, data['permission_id'])
    if role is not None:
        return jsonify({"message": message}), status_code
    return jsonify({"error": message}), status_code

@admin_bp.route('/roles/<int:role_id>/permissions/<int:permission_id>', methods=['DELETE'])
@token_required
@require_permission('MANAGE_ROLES')
def remove_permission(role_id, permission_id):
    """Remove a permission from a role.
    Requires MANAGE_ROLES permission.
    ---
    delete:
      summary: Remove permission from role (admin, MANAGE_ROLES permission required)
      tags:
        - Admin - Roles
      security:
        - bearerAuth: []
      parameters:
        - in: path
          name: role_id
          schema:
            type: integer
          required: true
          description: ID of the role
        - in: path
          name: permission_id
          schema:
            type: integer
          required: true
          description: ID of the permission to remove
      responses:
        200:
          description: Permission removed
          content:
            application/json:
              schema:
                type: object
                properties:
                  message:
                    type: string
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
          description: Role or permission not found
          content:
            application/json:
              schema: ErrorResponseSchema
        500:
          description: Server error
          content:
            application/json:
              schema: ErrorResponseSchema
    """
    role, message, status_code = RoleService.remove_permission_from_role(role_id, permission_id)
    if role is not None:
        return jsonify({"message": message}), status_code
    return jsonify({"error": message}), status_code 