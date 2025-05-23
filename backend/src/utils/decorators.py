"""
Authentication decorators for protecting API routes.
"""
from functools import wraps
from flask import request, jsonify, current_app, g, make_response
import jwt
from ..models.user import User, UserRole


def token_required(f):
    """
    A decorator that protects routes by verifying the JWT token in the Authorization header.
    Skips verification for OPTIONS requests to support CORS preflight.
    
    The token must be provided in the format: 'Bearer <token>'.
    On successful verification, the authenticated user is stored in g.current_user.
    
    Args:
        f: The route function to be decorated.
        
    Returns:
        decorated_function: The wrapped function that performs token verification.
        
    Raises:
        401 Unauthorized: If the token is missing, invalid, expired, or the user is not found/inactive.
    """
    @wraps(f)
    def decorated_function(*args, **kwargs):
        # Skip token verification for OPTIONS requests
        if request.method == 'OPTIONS':
            resp = make_response() 
            return resp 
            
        token = None
        auth_header = request.headers.get('Authorization')
        
        print(f"Auth header: {auth_header}")
        
        # Check if Authorization header exists and follows Bearer scheme
        if auth_header:
            try:
                # Extract token from "Bearer <token>"
                token_parts = auth_header.split()
                if len(token_parts) == 2 and token_parts[0].lower() == 'bearer':
                    token = token_parts[1]
                print(f"Token parts: {token_parts}")
            except Exception as e:
                print(f"Error parsing auth header: {e}")
                return jsonify({"error": "Invalid Authorization header format"}), 401
        
        if not token:
            return jsonify({"error": "Authentication token is missing!"}), 401
            
        try:
            # Decode and verify the token
            print(f"Decoding token: {token}")
            payload = jwt.decode(
                token,
                current_app.config['JWT_SECRET_KEY'],
                algorithms=[current_app.config.get('JWT_ALGORITHM', 'HS256')]
            )
            print(f"Token payload: {payload}")
            
            # Get user from database
            user_id = payload['sub']
            if not isinstance(user_id, str):
                user_id = str(user_id)
            current_user = User.query.get(int(user_id))
            print(f"Found user: {current_user}")
            
            # Verify user exists and is active
            if not current_user or not current_user.is_active:
                return jsonify({"error": "User not found or inactive"}), 401
                
            # Store user in request context
            g.current_user = current_user
            
        except jwt.ExpiredSignatureError:
            print("Token expired")
            return jsonify({"error": "Token has expired!"}), 401
        except jwt.InvalidTokenError as e:
            print(f"Invalid token: {e}")
            return jsonify({"error": "Invalid token!"}), 401
        except Exception as e:
            print(f"Token processing error: {e}")
            return jsonify({"error": "Token processing error"}), 401
            
        return f(*args, **kwargs)
        
    return decorated_function 

def require_permission(permission_name: str):
    """
    Decorator to ensure the logged-in user has the specified permission.
    Must be applied AFTER @token_required. Skips checks for OPTIONS requests.
    """
    def _decorator(f):
        @wraps(f)
        def _wrapper(*args, **kwargs):
            # Skip permission check for OPTIONS requests (CORS preflight)
            if request.method == 'OPTIONS':
                resp = make_response() 
                return resp 

            # 1. Check if user context exists (from @token_required)
            if not hasattr(g, 'current_user') or not g.current_user:
                # Log this internal server error
                print(f"ERROR: g.current_user not found in @require_permission('{permission_name}'). Check decorator order.")
                return jsonify({"error": "Internal Server Error: Authentication context missing"}), 500

            # 2. Check if the user has the required permission
            if not g.current_user.has_permission(permission_name):
                return jsonify({"error": f"Forbidden: Requires permission '{permission_name}'"}), 403

            # 3. Permission granted, proceed to the route function
            return f(*args, **kwargs)
        return _wrapper
    return _decorator 