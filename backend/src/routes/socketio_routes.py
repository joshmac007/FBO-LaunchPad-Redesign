"""
SocketIO Event Handlers for Fueler System Real-time Communication
"""

import logging
from flask_socketio import emit, join_room, leave_room, disconnect
from datetime import datetime

from ..extensions import socketio
from ..utils.socketio_auth import require_permission_socket, get_current_socket_user

logger = logging.getLogger(__name__)

@socketio.on('connect')
@require_permission_socket('access_fueler_dashboard')
def handle_connect(*args, **kwargs):
    """
    Handle client connection to SocketIO.
    Requires 'access_fueler_dashboard' permission.
    """
    try:
        user = get_current_socket_user()
        if user:
            # Join user-specific room for targeted messages
            user_room = f"user_{user.id}"
            join_room(user_room)
            
            # Join role-based rooms
            # Get user permissions from enhanced permission service
            try:
                from ..services.permission_service import enhanced_permission_service
                user_permissions = enhanced_permission_service.get_user_permissions(user.id, include_groups=True)
            except ImportError:
                # Fallback to checking permissions individually
                user_permissions = []
                for permission in ['access_fueler_dashboard', 'manage_fuel_orders', 'edit_fuel_order']:
                    if user.has_permission(permission):
                        user_permissions.append(permission)
            
            if 'access_fueler_dashboard' in user_permissions:
                join_room('fuelers_room')
                logger.info(f"User {user.email} joined fuelers_room")
            
            if any(p in user_permissions for p in ['manage_fuel_orders', 'edit_fuel_order']):
                join_room('csr_room')
                logger.info(f"User {user.email} joined csr_room")
            
            # Send connection confirmation
            emit('connection_confirmed', {
                'user_id': user.id,
                'user_email': user.email,
                'rooms': ['fuelers_room'] if 'access_fueler_dashboard' in user_permissions else [],
                'timestamp': str(datetime.utcnow())
            })
            
            logger.info(f"SocketIO: User {user.email} connected successfully")
            
    except Exception as e:
        logger.error(f"Error in connect handler: {e}")
        disconnect()

@socketio.on('disconnect')
def handle_disconnect(*args, **kwargs):
    """
    Handle client disconnection from SocketIO.
    """
    try:
        user = get_current_socket_user()
        if user:
            logger.info(f"SocketIO: User {user.email} disconnected")
        else:
            logger.info("SocketIO: Anonymous user disconnected")
    except Exception as e:
        logger.error(f"Error in disconnect handler: {e}")

@socketio.on('join_room')
def handle_join_room(data):
    """
    Handle explicit room join requests.
    """
    try:
        user = get_current_socket_user()
        if not user:
            emit('error', {'message': 'Authentication required'})
            return
        
        room_name = data.get('room')
        if not room_name:
            emit('error', {'message': 'Room name required'})
            return
        
        # Validate room access permissions
        try:
            from ..services.permission_service import enhanced_permission_service
            user_permissions = enhanced_permission_service.get_user_permissions(user.id, include_groups=True)
        except ImportError:
            # Fallback to checking permissions individually
            user_permissions = []
            for permission in ['access_fueler_dashboard', 'manage_fuel_orders', 'edit_fuel_order']:
                if user.has_permission(permission):
                    user_permissions.append(permission)
        
        allowed_rooms = []
        if 'access_fueler_dashboard' in user_permissions:
            allowed_rooms.extend(['fuelers_room'])
        if any(p in user_permissions for p in ['manage_fuel_orders', 'edit_fuel_order']):
            allowed_rooms.extend(['csr_room'])
        
        if room_name in allowed_rooms or room_name == f"user_{user.id}":
            join_room(room_name)
            emit('room_joined', {'room': room_name})
            logger.info(f"User {user.email} joined room {room_name}")
        else:
            emit('error', {'message': 'Access denied to room'})
            logger.warning(f"User {user.email} denied access to room {room_name}")
            
    except Exception as e:
        logger.error(f"Error in join_room handler: {e}")
        emit('error', {'message': 'Internal error'})

@socketio.on('leave_room')
def handle_leave_room(data):
    """
    Handle explicit room leave requests.
    """
    try:
        user = get_current_socket_user()
        if not user:
            emit('error', {'message': 'Authentication required'})
            return
        
        room_name = data.get('room')
        if not room_name:
            emit('error', {'message': 'Room name required'})
            return
        
        leave_room(room_name)
        emit('room_left', {'room': room_name})
        logger.info(f"User {user.email} left room {room_name}")
        
    except Exception as e:
        logger.error(f"Error in leave_room handler: {e}")
        emit('error', {'message': 'Internal error'})

@socketio.on('ping')
def handle_ping(*args, **kwargs):
    """
    Handle ping requests for connection testing.
    """
    try:
        user = get_current_socket_user()
        emit('pong', {
            'timestamp': str(datetime.utcnow()),
            'user_id': user.id if user else None
        })
    except Exception as e:
        logger.error(f"Error in ping handler: {e}")
        emit('error', {'message': 'Internal error'})

 