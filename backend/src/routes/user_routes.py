from flask import Blueprint, request, jsonify, g
from ..utils.enhanced_auth_decorators_v2 import require_permission_v2
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
from ..schemas.user_schemas import UserDetailSchema, UserBriefSchema, UserPreferencesSchema

# Create blueprint for user routes
user_bp = Blueprint('user_bp', __name__, url_prefix='/api/users')

@user_bp.route('', methods=['GET', 'OPTIONS'])
@user_bp.route('/', methods=['GET', 'OPTIONS'])
@require_permission_v2('view_users')
def get_users():
    """Get a list of users.
    Requires view_users permission. Supports filtering by 'role' and 'is_active'.
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
    
    # Handle role_ids parameter (multiple values)
    role_ids = request.args.getlist('role_ids')
    if role_ids:
        try:
            # Convert string IDs to integers
            filters['role_ids'] = [int(rid) for rid in role_ids]
        except ValueError:
            return jsonify({"error": "Invalid role_ids format, must be integers"}), 400
    
    # Remove None values so service doesn't process empty filters unnecessarily
    filters = {k: v for k, v in filters.items() if v is not None}
    
    # Call the service method
    users, message, status_code = UserService.get_users(filters=filters)
    
    # Handle the response
    if users is not None:
        # Use UserBriefSchema for consistent formatting with admin endpoints
        schema = UserBriefSchema(many=True)
        users_list = schema.dump(users)
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
@require_permission_v2('manage_users')
def create_user():
    """Create a new user.
    Requires manage_users permission.
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
            # Use UserDetailSchema for consistent formatting with admin endpoints
            schema = UserDetailSchema()
            user_data = schema.dump(user)
            return jsonify({
                "message": message,
                "user": user_data
            }), status_code
        else:
            return jsonify({"error": message}), status_code
            
    except Exception as e:
        return jsonify({
            "error": "Internal server error",
            "details": str(e)
        }), 500

@user_bp.route('/<int:user_id>', methods=['PATCH'])
@require_permission_v2('manage_users', {'resource_type': 'user', 'id_param': 'user_id'})
def update_user(user_id):
    """Update a user.
    Requires manage_users permission.
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
        description: ID of the user to update
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
            # Use UserDetailSchema for consistent formatting with admin endpoints
            schema = UserDetailSchema()
            user_data = schema.dump(user)
            return jsonify({
                "message": message,
                "user": user_data
            }), status_code
        else:
            return jsonify({"error": message}), status_code
            
    except Exception as e:
        from flask import current_app
        current_app.logger.error(f"Error updating user {user_id}: {e}")
        return jsonify({"error": "Server error"}), 500

@user_bp.route('/<int:user_id>', methods=['DELETE'])
@require_permission_v2('manage_users', {'resource_type': 'user', 'id_param': 'user_id'})
def delete_user(user_id):
    """Delete a user.
    Requires manage_users permission.
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
        description: ID of the user to delete
    responses:
      204:
        description: User deleted successfully
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
        deleted, message, status_code = UserService.delete_user(user_id)
        
        if deleted:
            return '', 204
        else:
            return jsonify({"error": message}), status_code
            
    except Exception as e:
        from flask import current_app
        current_app.logger.error(f"Error deleting user {user_id}: {e}")
        return jsonify({"error": "Server error"}), 500

@user_bp.route('/<int:user_id>', methods=['GET'])
@require_permission_v2('view_users', {'resource_type': 'user', 'id_param': 'user_id'})
def get_user(user_id):
    """Get a user by ID.
    Requires view_users permission.
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
        description: ID of the user to retrieve
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
    try:
        user, message, status_code = UserService.get_user_by_id(user_id)
        
        if user is not None:
            # Use UserDetailSchema for consistent formatting with admin endpoints
            schema = UserDetailSchema()
            user_data = schema.dump(user)
            return jsonify({
                "message": message,
                "user": user_data
            }), status_code
        else:
            return jsonify({"error": message}), status_code
            
    except Exception as e:
        from flask import current_app
        current_app.logger.error(f"Error getting user {user_id}: {e}")
        return jsonify({"error": "Server error"}), 500

@user_bp.route('/me/preferences', methods=['PATCH'])
@require_permission_v2('view_profile')
def update_user_preferences():
    """Update current user's preferences.
    Requires view_profile permission.
    ---
    tags:
      - Users
    security:
      - bearerAuth: []
    requestBody:
      required: true
      content:
        application/json:
          schema: UserPreferencesSchema
    responses:
      200:
        description: User preferences updated successfully
        content:
          application/json:
            schema:
              type: object
              properties:
                message:
                  type: string
                preferences:
                  type: object
      400:
        description: Bad Request (validation error)
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
    try:
        # Get current user from token
        current_user = g.current_user
        if not current_user:
            return jsonify({"error": "User not found"}), 401
        
        # Load and validate request data
        schema = UserPreferencesSchema()
        data = request.get_json()
        
        if not data:
            return jsonify({"error": "No data provided"}), 400
        
        try:
            validated_data = schema.load(data)
        except ValidationError as e:
            return jsonify({
                "error": "Validation error",
                "details": e.messages
            }), 400
        
        # Update user preferences using service
        preferences, message, status_code = UserService.update_user_preferences(
            current_user.id, 
            validated_data
        )
        
        if preferences is not None:
            return jsonify({
                "message": message,
                "preferences": preferences
            }), status_code
        else:
            return jsonify({"error": message}), status_code
            
    except Exception as e:
        from flask import current_app
        current_app.logger.error(f"Error updating user preferences: {e}")
        return jsonify({"error": "Server error"}), 500 