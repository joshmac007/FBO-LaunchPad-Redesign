from flask import request, jsonify, current_app
from marshmallow import ValidationError
from ...services.user_service import UserService
from src.utils.decorators import token_required, require_permission
from ...schemas.user_schemas import (
    UserUpdateRequestSchema,
    UserDetailSchema,
    ErrorResponseSchema
)
from .routes import admin_bp

# --- DIAGNOSTIC SIMPLIFICATION: All other routes temporarily commented out to isolate 404 error ---
# from ...models.user import UserRole
# from ...schemas.user_schemas import (
#     UserCreateRequestSchema,
#     UserListResponseSchema,
#     UserBriefSchema,
#     RoleBriefSchema
# )
# from ...schemas import ErrorResponseSchema
# from src.extensions import apispec

@admin_bp.route('/users', methods=['GET', 'OPTIONS'])
@token_required
@require_permission('MANAGE_USERS')
def get_users():
    if request.method == 'OPTIONS':
        return jsonify({'message': 'OPTIONS request successful'}), 200
    current_app.logger.info("--- Attempting to serve GET /api/admin/users/ via get_users ---")

    # Process query parameters for the service layer
    processed_filters = {}
    for key, value in request.args.items():
        if key == 'role_ids':
            # Use getlist for role_ids to ensure all values are captured as a list
            processed_filters[key] = request.args.getlist(key)
        else:
            # For other parameters, get the single value
            processed_filters[key] = value

    users, msg, status = UserService.get_users(processed_filters)
    if status == 200:
        schema = UserDetailSchema(many=True)
        return jsonify({"users": schema.dump(users), "message": msg}), status
    else:
        return jsonify({"error": msg}), status

@admin_bp.route('/users', methods=['POST'])
@token_required
@require_permission('MANAGE_USERS')
def create_user():
    data = request.get_json()
    # Assuming UserCreateRequestSchema was intended here
    # from ...schemas.user_schemas import UserCreateRequestSchema 
    # schema = UserCreateRequestSchema()
    # try:
    #     validated_data = schema.load(data)
    # except ValidationError as err:
    #     return jsonify({"error": "Invalid input", "messages": err.messages}), 400
    
    # For now, pass raw data to service, assuming service handles validation
    user, msg, status = UserService.create_user(data)
    
    if status == 201: # Created
        # Assuming UserDetailSchema for response
        response_schema = UserDetailSchema()
        return jsonify({"user": response_schema.dump(user), "message": msg}), status
    elif status == 400 or status == 409: # Bad request or Conflict
        return jsonify({"error": msg}), status
    else: # Other errors (e.g. 500)
        return jsonify({"error": "User creation failed", "details": msg}), status

@admin_bp.route('/users/<int:user_id>', methods=['PATCH'])
@token_required
@require_permission('MANAGE_USERS')
def update_user(user_id):
    """Update user details."""
    data = request.get_json()
    if not data:
        return jsonify({"error": "Request body cannot be empty"}), 400

    # Remove 'id' from data if present, as it's not part of UserUpdateRequestSchema
    # and user_id is passed via URL path
    data.pop('id', None)

    schema = UserUpdateRequestSchema()
    try:
        validated_data = schema.load(data)
    except ValidationError as err:
        return jsonify({"error": "Invalid input", "messages": err.messages}), 400

    user, msg, status = UserService.update_user(user_id, validated_data)

    if status == 200: # OK
        response_schema = UserDetailSchema()
        return jsonify({"user": response_schema.dump(user), "message": msg}), status
    elif status == 403: # Forbidden (e.g., self-update prevention)
         return jsonify({"error": "Forbidden", "details": msg}), status
    elif status == 404: # Not Found
        return jsonify({"error": "Not Found", "details": msg}), status
    elif status == 409: # Conflict (e.g., email exists)
        return jsonify({"error": "Conflict", "details": msg}), status
    elif status == 400: # Bad Request (e.g., invalid role id)
        return jsonify({"error": "Bad Request", "details": msg}), status
    else: # Other errors (e.g. 500)
        return jsonify({"error": "User update failed", "details": msg}), status

@admin_bp.route("/users/<int:user_id>", methods=["GET"])
@token_required
@require_permission("MANAGE_USERS")
def get_user(user_id):
    """Get a user by ID (admin endpoint)."""
    user, msg, status = UserService.get_user_by_id(user_id)
    if status == 200:
        response_schema = UserDetailSchema()
        return jsonify({"user": response_schema.dump(user), "message": msg}), status
    else:
        return jsonify({"error": msg}), status


@admin_bp.route('/users/<int:user_id>', methods=['DELETE'])
@token_required
@require_permission('MANAGE_USERS')
def delete_user(user_id):
    """Deactivate (soft delete) a user."""
    success, msg, status = UserService.delete_user(user_id)

    if success:
        return jsonify({"message": msg}), status
    elif status == 403: # Forbidden (e.g., self-delete prevention)
        return jsonify({"error": "Forbidden", "details": msg}), status
    elif status == 404: # Not Found
        return jsonify({"error": "Not Found", "details": msg}), status
    else: # Other errors (e.g. 500)
        return jsonify({"error": "User deactivation failed", "details": msg}), status 
