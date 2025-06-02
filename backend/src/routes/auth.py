from flask import g, jsonify
from flask_jwt_extended import jwt_required
from flask_restful import Resource
from flask import current_app

@auth_bp.route('/me/permissions', methods=['GET'])
@token_required
def get_current_user_permissions():
    """
    Get effective permissions for the current authenticated user.
    Used by frontend PermissionContext to load user permissions.
    """
    try:
        user_id = g.current_user.id
        
        # Import here to avoid circular imports
        from ..services.permission_service import PermissionService
        
        # Get effective permissions with resource context
        effective_permissions = PermissionService.get_user_effective_permissions(
            user_id, include_resource_context=True
        )
        
        # Get permission summary for UI display
        summary = PermissionService.get_permission_summary(user_id)
        
        # Create a simplified list for frontend consumption
        permission_list = list(effective_permissions.keys())
        
        return jsonify({
            'user_id': user_id,
            'username': g.current_user.username,
            'permissions': permission_list,
            'effective_permissions': effective_permissions,
            'summary': summary,
            'total_permissions': len(effective_permissions)
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"Error retrieving user permissions: {str(e)}")
        return jsonify({'error': 'Failed to retrieve user permissions'}), 500 