from functools import wraps
from flask import jsonify, current_app
from flask_jwt_extended import verify_jwt_in_request, get_jwt_identity

def admin_required():
    def wrapper(fn):
        @wraps(fn)
        def decorator(*args, **kwargs):
            verify_jwt_in_request()
            claims = get_jwt_identity()
            
            if claims.get('role') != 'admin':
                return jsonify({'error': 'Admin privileges required'}), 403
                
            return fn(*args, **kwargs)
        return decorator
    return wrapper

def user_required():
    def wrapper(fn):
        @wraps(fn)
        def decorator(*args, **kwargs):
            verify_jwt_in_request()
            claims = get_jwt_identity()
            
            if not claims.get('role') in ['user', 'admin']:
                return jsonify({'error': 'User privileges required'}), 403
                
            return fn(*args, **kwargs)
        return decorator
    return wrapper 