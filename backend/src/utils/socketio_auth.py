"""
SocketIO Authentication and Permission System for Fueler System
"""

import functools
import logging
from typing import Optional, Dict, Any
from flask import request
from flask_socketio import disconnect
from flask_jwt_extended import decode_token, JWTManager
from jwt.exceptions import InvalidTokenError, ExpiredSignatureError

from ..services.permission_service import enhanced_permission_service
from ..models.user import User

logger = logging.getLogger(__name__)

def require_permission_socket(permission: str):
    """
    SocketIO permission decorator that checks JWT token and user permissions.
    
    Args:
        permission: The permission name to check (e.g., 'access_fueler_dashboard')
        
    Usage:
        @socketio.on('connect')
        @require_permission_socket('access_fueler_dashboard')
        def handle_connect():
            # User has been authenticated and has the required permission
            pass
    """
    def decorator(f):
        @functools.wraps(f)
        def decorated_function(*args, **kwargs):
            try:
                # Get JWT token from query parameters or headers
                token = None
                
                # Try to get token from query parameters first (common for SocketIO)
                if hasattr(request, 'args') and 'token' in request.args:
                    token = request.args.get('token')
                
                # Try to get token from Authorization header
                if not token and hasattr(request, 'headers'):
                    auth_header = request.headers.get('Authorization', '')
                    if auth_header.startswith('Bearer '):
                        token = auth_header.split(' ')[1]
                
                if not token:
                    logger.warning("SocketIO connection attempt without token")
                    return False
                
                # Decode and verify JWT token
                try:
                    from flask import current_app
                    decoded_token = decode_token(token)
                    user_id = decoded_token['sub']
                    
                    # Get user from database
                    user = User.query.get(int(user_id))
                    if not user:
                        logger.warning(f"SocketIO: User {user_id} not found")
                        return False
                    
                    # Check if user has required permission
                    has_permission = enhanced_permission_service.user_has_permission(
                        user_id=user.id,
                        permission=permission
                    )
                    
                    if not has_permission:
                        logger.warning(f"SocketIO: User {user.email} lacks permission '{permission}'")
                        return False
                    
                    # Store user info in session for later use
                    from flask import session
                    session['user_id'] = user.id
                    session['user_email'] = user.email
                    session['verified_permission'] = permission
                    
                    logger.info(f"SocketIO: User {user.email} connected with permission '{permission}'")
                    
                    # Call the original function
                    return f(*args, **kwargs)
                    
                except (InvalidTokenError, ExpiredSignatureError, ValueError) as e:
                    logger.warning(f"SocketIO: Invalid token - {e}")
                    return False
                    
            except Exception as e:
                logger.error(f"SocketIO permission check error: {e}")
                return False
                
        return decorated_function
    return decorator

def get_current_socket_user() -> Optional[User]:
    """
    Get the current authenticated user from SocketIO session.
    
    Returns:
        User object if authenticated, None otherwise
    """
    try:
        from flask import session
        user_id = session.get('user_id')
        if user_id:
            return User.query.get(user_id)
    except Exception as e:
        logger.error(f"Error getting current socket user: {e}")
    return None

def emit_to_user_room(user_id: int, event: str, data: Dict[str, Any]):
    """
    Emit a SocketIO event to a specific user's room.
    
    Args:
        user_id: The user ID to send the event to
        event: The event name
        data: The event data
    """
    try:
        from ..extensions import socketio
        room = f"user_{user_id}"
        socketio.emit(event, data, room=room)
        logger.debug(f"Emitted '{event}' to user {user_id}")
    except Exception as e:
        logger.error(f"Error emitting to user room: {e}")

def emit_to_csr_room(event: str, data: Dict[str, Any]):
    """
    Emit a SocketIO event to the CSR room.
    
    Args:
        event: The event name
        data: The event data
    """
    try:
        from ..extensions import socketio
        socketio.emit(event, data, room="csr_room")
        logger.debug(f"Emitted '{event}' to CSR room")
    except Exception as e:
        logger.error(f"Error emitting to CSR room: {e}")

def emit_to_fuelers_subset(event: str, data: Dict[str, Any], max_fuelers: int = 5):
    """
    Emit a SocketIO event to a randomized subset of connected fuelers.
    This is used for load balancing new order notifications.
    
    Args:
        event: The event name
        data: The event data
        max_fuelers: Maximum number of fuelers to notify
    """
    try:
        from ..extensions import socketio
        import random
        
        # Get all connected fuelers (this is a simplified implementation)
        # In a real implementation, you'd track connected fuelers
        socketio.emit(event, data, room="fuelers_room")
        logger.debug(f"Emitted '{event}' to fuelers room")
    except Exception as e:
        logger.error(f"Error emitting to fuelers subset: {e}") 