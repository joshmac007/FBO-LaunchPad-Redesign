from flask import Blueprint, request, jsonify, g
from ..utils.decorators import token_required, require_permission
from ..models.user import UserRole
from ..services.user_service import UserService
from marshmallow import ValidationError
from ..schemas import (
    UserCreateRequestSchema,
    UserUpdateRequestSchema,
    UserResponseSchema,
    UserListResponseSchema,
    ErrorResponseSchema
)

# Create blueprint for user routes
user_bp = Blueprint('user_bp', __name__, url_prefix='/api/users')

@user_bp.route('', methods=['GET', 'OPTIONS'])
@user_bp.route('/', methods=['GET', 'OPTIONS'])
@token_required
@require_permission('VIEW_USERS')
def get_users():
    """Get a list of users.
    Requires VIEW_USERS permission. Supports filtering by 'role' and 'is_active'.
    ---
    tags:
      - Users
    security:
      - bearerAuth: []
    parameters:
      - in: query
        name: role
        schema:
          type: string
          enum: [ADMIN, CSR, LST]
        required: false
        description: Filter users by role (case-insensitive)
      - in: query
        name: is_active
        schema:
          type: string
          enum: ['true', 'false']
        required: false
        description: Filter users by active status ('true' or 'false')
    responses:
      200:
        description: List of users retrieved successfully
        content:
          application/json:
            schema: UserListResponseSchema
      400:
        description: Bad Request (e.g., invalid filter value)
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
      500:
        description: Server error
        content:
          application/json:
            schema: ErrorResponseSchema
    """
    if request.method == 'OPTIONS':
        return jsonify({'message': 'OPTIONS request successful'}), 200
    
    # Extract filter parameters from request.args
    filters = {
        'role': request.args.get('role', None, type=str),
        'is_active': request.args.get('is_active', None, type=str)  # Keep as string, service handles conversion
    }
    # Remove None values so service doesn't process empty filters unnecessarily
    filters = {k: v for k, v in filters.items() if v is not None}
    
    # Call the service method
    users, message, status_code = UserService.get_users(filters=filters)
    
    # Handle the response
    if users is not None:
        # Serialize the list of user objects, excluding sensitive fields
        users_list = []
        for user in users:
            users_list.append({
                "id": user.id,
                "name": user.username,
                "email": user.email,
                "roles": [role.name for role in user.roles],
                "is_active": user.is_active,
                "created_at": user.created_at.isoformat()
            })
        # Construct the final JSON response
        response = {
            "message": message,
            "users": users_list
        }
        return jsonify(response), status_code  # Use status_code from service (should be 200)
    else:
        # Return the error message and status code provided by the service
        return jsonify({"error": message}), status_code  # Use status_code from service (e.g., 400, 500)

@user_bp.route('', methods=['POST', 'OPTIONS'])
@user_bp.route('/', methods=['POST', 'OPTIONS'])
@token_required
@require_permission('MANAGE_USERS')
def create_user():
    """Create a new user.
    Requires MANAGE_USERS permission.
    ---
    tags:
      - Users
    security:
      - bearerAuth: []
    requestBody:
      required: true
      content:
        application/json:
          schema: UserCreateRequestSchema
    responses:
      201:
        description: User created successfully
        content:
          application/json:
            schema: UserResponseSchema
      400:
        description: Bad Request (e.g., missing fields, validation error)
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
        description: Conflict (e.g., email already exists)
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
        # Load and validate request data
        schema = UserCreateRequestSchema()
        data = request.get_json()
        
        if not data:
            return jsonify({"error": "No data provided"}), 400
        
        # --- Remove Debugging ---    
        # from flask import current_app
        # current_app.logger.info(f"DEBUG: Schema fields before load: {schema.fields}") 
        # --- End Debugging ---
            
        try:
            data = schema.load(data)
        except ValidationError as e:
            return jsonify({
                "error": "Validation error",
                "details": e.messages
            }), 400
        
        # Create user
        user, message, status_code = UserService.create_user(data)
        
        if user is not None:
            # Return serialized user data
            return jsonify({
                "message": message,
                "user": {
                    "id": user.id,
                    "name": user.username,
                    "email": user.email,
                    "roles": [role.name for role in user.roles],
                    "is_active": user.is_active,
                    "created_at": user.created_at.isoformat()
                }
            }), status_code
        else:
            return jsonify({"error": message}), status_code
            
    except Exception as e:
        return jsonify({
            "error": "Internal server error",
            "details": str(e)
        }), 500

@user_bp.route('/<int:user_id>', methods=['PATCH'])
@token_required
@require_permission('MANAGE_USERS')
def update_user(user_id):
    """Update a user.
    Requires MANAGE_USERS permission.
    ---
    tags:
      - Users
    security:
      - bearerAuth: []
    parameters:
      - in: path
        name: user_id
        schema:
          type: integer
        required: true
        description: ID of user to update
    requestBody:
      required: true
      content:
        application/json:
          schema: UserUpdateRequestSchema
    responses:
      200:
        description: User updated successfully
        content:
          application/json:
            schema: UserResponseSchema
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
        description: User not found
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
        # Load and validate request data
        schema = UserUpdateRequestSchema()
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
        
        # Update user
        user, message, status_code = UserService.update_user(user_id, data)
        
        if user is not None:
            # Return serialized user data
            return jsonify({
                "message": message,
                "user": {
                    "id": user.id,
                    "name": user.username,
                    "email": user.email,
                    "roles": [role.name for role in user.roles],
                    "is_active": user.is_active,
                    "created_at": user.created_at.isoformat()
                }
            }), status_code
        else:
            return jsonify({"error": message}), status_code
            
    except Exception as e:
        return jsonify({
            "error": "Internal server error",
            "details": str(e)
        }), 500

@user_bp.route('/<int:user_id>', methods=['DELETE'])
@token_required
@require_permission('MANAGE_USERS')
def delete_user(user_id):
    """Delete a user.
    Requires MANAGE_USERS permission.
    ---
    tags:
      - Users
    security:
      - bearerAuth: []
    parameters:
      - in: path
        name: user_id
        schema:
          type: integer
        required: true
        description: ID of user to delete
    responses:
      200:
        description: User deleted successfully
      401:
        description: Unauthorized
      403:
        description: Forbidden (missing permission)
      404:
        description: User not found
      500:
        description: Server error
    """
    # Call service to delete user
    success, message, status_code = UserService.delete_user(user_id)
    
    if success:
        return jsonify({"message": message}), status_code
    else:
        return jsonify({"error": message}), status_code

@user_bp.route('/<int:user_id>', methods=['GET'])
@token_required
@require_permission('VIEW_USERS')
def get_user(user_id):
    """Get a user by ID.
    Requires VIEW_USERS permission.
    ---
    tags:
      - Users
    security:
      - bearerAuth: []
    parameters:
      - in: path
        name: user_id
        schema:
          type: integer
        required: true
        description: ID of user to retrieve
    responses:
      200:
        description: User retrieved successfully
        content:
          application/json:
            schema: UserResponseSchema
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
        description: User not found
        content:
          application/json:
            schema: ErrorResponseSchema
      500:
        description: Server error
        content:
          application/json:
            schema: ErrorResponseSchema
    """
    # Call service to get user
    user, message, status_code = UserService.get_user_by_id(user_id)
    
    if user is not None:
        return jsonify({
            "message": message,
            "user": {
                "id": user.id,
                "name": user.username,
                "email": user.email,
                "roles": [role.name for role in user.roles],
                "is_active": user.is_active,
                "created_at": user.created_at.isoformat()
            }
        }), status_code
    else:
        return jsonify({"error": message}), status_code 