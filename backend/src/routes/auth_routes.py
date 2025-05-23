from flask import Blueprint, request, jsonify, current_app, g
from ..services.auth_service import AuthService
from flask_jwt_extended import create_access_token
from ..schemas import (
    RegisterRequestSchema,
    RegisterResponseSchema,
    LoginRequestSchema,
    LoginSuccessResponseSchema,
    ErrorResponseSchema,
    UserPermissionsResponseSchema
)
from ..models.user import User
from ..models.role import Role
from ..extensions import db, jwt
from marshmallow import ValidationError
from functools import wraps
import time
from datetime import datetime, timedelta
import jwt as pyjwt
from src.utils.rate_limiting import rate_limit
from flask import g
from ..utils.decorators import token_required

auth_bp = Blueprint('auth', __name__)

# Rate limiting state
login_attempts = {}
RATE_LIMIT = 5  # attempts
RATE_WINDOW = 300  # seconds (5 minutes)

def reset_rate_limits():
    """Reset rate limiting state (for testing)."""
    global login_attempts
    login_attempts = {}

@auth_bp.route('/register', methods=['POST', 'OPTIONS'])
@auth_bp.route('register', methods=['POST', 'OPTIONS'])
def register():
    """Register a new user.
    ---
    tags:
      - Authentication
    requestBody:
      required: true
      content:
        application/json:
          schema: RegisterRequestSchema
    responses:
      201:
        description: User registered successfully
        content:
          application/json:
            schema: RegisterResponseSchema
      400:
        description: Bad Request (e.g., missing fields, invalid email/password format)
        content:
          application/json:
            schema: ErrorResponseSchema
      409:
        description: Conflict (e.g., email already registered)
        content:
          application/json:
            schema: ErrorResponseSchema
    """
    if request.method == 'OPTIONS':
        return jsonify({'message': 'OPTIONS request successful'}), 200

    schema = RegisterRequestSchema()
    try:
        data = schema.load(request.json)
    except:
        return jsonify({'error': 'Invalid request data'}), 400

    if User.query.filter_by(email=data['email']).first():
        return jsonify({'error': 'Email already registered'}), 409

    user = User(
        username=data['username'],
        email=data['email'],
        name=data['name'],
        is_active=True
    )
    user.set_password(data['password'])

    db.session.add(user)
    db.session.commit()

    return jsonify({
        'message': 'User registered successfully',
        'user': {
            'id': user.id,
            'email': user.email,
            'name': user.name
        }
    }), 201

@auth_bp.route('/login', methods=['POST', 'OPTIONS'])
@auth_bp.route('login', methods=['POST', 'OPTIONS'])
@rate_limit(limit=5, window=300)
def login():
    """Login endpoint that returns a JWT token on successful authentication
    ---
    tags:
      - Authentication
    requestBody:
      required: true
      content:
        application/json:
          schema: LoginRequestSchema
    responses:
      200:
        description: Login successful
        content:
          application/json:
            schema: LoginSuccessResponseSchema
      400:
        description: Bad Request (e.g., missing fields)
        content:
          application/json:
            schema: ErrorResponseSchema
      401:
        description: Unauthorized (e.g., invalid credentials)
        content:
          application/json:
            schema: ErrorResponseSchema
      429:
        description: Too Many Requests (rate limit exceeded)
        content:
          application/json:
            schema: ErrorResponseSchema
    """
    if request.method == 'OPTIONS':
        return jsonify({'message': 'OPTIONS request successful'}), 200

    try:
        # Validate request data
        schema = LoginRequestSchema()
        data = request.get_json()
        
        if not data:
            return jsonify({
                'error': 'Missing required fields',
                'details': 'Request body is empty'
            }), 400
            
        try:
            data = schema.load(data)
        except ValidationError as err:
            return jsonify({
                'error': 'Missing required fields',
                'details': err.messages
            }), 400
        
        # Find user by email
        user = User.query.filter_by(email=data['email']).first()
        
        if not user:
            return jsonify({'error': 'Invalid email or password'}), 401
            
        if not user.is_active:
            return jsonify({'error': 'User account is inactive'}), 401
            
        # Check password
        if not user.check_password(data['password']):
            return jsonify({'error': 'Invalid email or password'}), 401
            
        # Generate access token with user roles and status
        access_token = create_access_token(
            identity=str(user.id),
            additional_claims={
                'username': user.username,
                'roles': [role.name for role in user.roles],
                'is_active': user.is_active
            }
        )
        
        # Generate response
        response_schema = LoginSuccessResponseSchema()
        return response_schema.dump({
            'user': user.to_dict(),
            'token': access_token
        }), 200
        
    except Exception as e:
        import traceback
        tb = traceback.format_exc()
        print(f"[LOGIN ERROR] {str(e)}\nTraceback:\n{tb}")
        return jsonify({
            'error': 'Internal server error',
            'details': str(e)
        }), 500 

@auth_bp.route('/me/permissions', methods=['GET'])
@token_required
def get_my_permissions():
    """Get the effective permissions for the currently authenticated user.
    ---
    tags:
      - Authentication
    security:
      - bearerAuth: []
    responses:
      200:
        description: List of effective permission strings for the user.
        content:
          application/json:
            schema: UserPermissionsResponseSchema
      401:
        description: Unauthorized (invalid/missing token)
        content:
          application/json:
            schema: ErrorResponseSchema
      500:
        description: Server error while retrieving permissions
        content:
          application/json:
            schema: ErrorResponseSchema
    """
    current_user = g.current_user
    permissions, message, status_code = AuthService.get_user_effective_permissions(current_user)
    if permissions is not None:
        result = UserPermissionsResponseSchema().dump({
            "message": message,
            "permissions": permissions
        })
        return jsonify(result), status_code
    else:
        return jsonify({"error": message}), status_code 