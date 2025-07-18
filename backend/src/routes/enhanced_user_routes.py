"""
Enhanced User Management API Routes for Granular Permission System

This module provides API endpoints for managing users with the new permission system:
- Direct permission assignment/revocation
- Permission group assignment
- Effective permissions calculation
- Permission audit trails
"""

from flask import Blueprint, request, jsonify, current_app
from datetime import datetime
from typing import Dict, List, Optional

from ..utils.enhanced_auth_decorators_v2 import (
    require_permission_v2, 
    require_any_permission_v2,
    require_permission_or_ownership_v2
)
from ..services.permission_service import enhanced_permission_service
from ..services.user_service import UserService
from ..models.user import User
from ..models.permission import Permission
from ..models.permission_group import PermissionGroup
from ..models.user_permission import UserPermission
from ..extensions import db

# Create the blueprint for enhanced user routes
enhanced_user_bp = Blueprint('enhanced_user_bp', __name__)

# =============================================================================
# USER MANAGEMENT ENDPOINTS
# =============================================================================

@enhanced_user_bp.route('', methods=['GET', 'OPTIONS'])
@enhanced_user_bp.route('/', methods=['GET', 'OPTIONS'])
@require_permission_v2('view_users')
def get_all_users():
    """
    Get all users with optional filtering.
    This matches the expected frontend endpoint: GET /api/admin/users
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
    
    try:
        # Call the service method
        users, message, status_code = UserService.get_users(filters=filters)
        
        # Handle the response
        if users is not None:
            # Use schema for consistent formatting
            from ..schemas.user_schemas import UserBriefSchema
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
            
    except Exception as e:
        current_app.logger.error(f"Error fetching users: {str(e)}")
        return jsonify({"error": "Failed to fetch users"}), 500

# =============================================================================
# DIRECT PERMISSION ASSIGNMENT ENDPOINTS
# =============================================================================

@enhanced_user_bp.route('/<int:user_id>/permissions', methods=['GET'])
@require_permission_v2('view_user_permissions', {'resource_type': 'user', 'id_param': 'user_id'})
def get_user_permissions(user_id):
    """
    Get all effective permissions for a specific user.
    Shows permissions from all sources: direct, groups, and roles.
    """
    try:
        # Check if user exists
        user = User.query.get(user_id)
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        # Get effective permissions with full context
        effective_permissions = enhanced_permission_service.get_user_permissions(
            user_id, include_groups=True
        )
        
        # Get permission summary
        summary = enhanced_permission_service.get_user_permission_summary(user_id)
        
        return jsonify({
            'user_id': user_id,
            'username': user.username,
            'effective_permissions': effective_permissions,
            'summary': summary,
            'total_permissions': len(effective_permissions)
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"Error retrieving user permissions: {str(e)}")
        return jsonify({'error': 'Failed to retrieve user permissions'}), 500

@enhanced_user_bp.route('/<int:user_id>/permissions/direct', methods=['POST'])
@require_permission_v2('assign_direct_permissions')
def grant_direct_permission(user_id):
    """
    Grant a direct permission to a user.
    Supports resource-specific permissions and expiration.
    """
    data = request.get_json()
    
    # Validate required fields
    if not data or 'permission_id' not in data:
        return jsonify({'error': 'permission_id is required'}), 400
    
    try:
        permission_id = int(data['permission_id'])
    except (ValueError, TypeError):
        return jsonify({'error': 'permission_id must be a valid integer'}), 400
    
    # Check if user exists
    user = User.query.get(user_id)
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    # Check if permission exists
    permission = Permission.query.get(permission_id)
    if not permission:
        return jsonify({'error': 'Permission not found'}), 404
    
    # Get current user ID for audit trail
    perm_ctx = get_permission_context()
    granted_by_user_id = perm_ctx.user_id if perm_ctx else None
    
    # Optional fields
    resource_type = data.get('resource_type')
    resource_id = data.get('resource_id')
    reason = data.get('reason')
    expires_at = None
    
    if data.get('expires_at'):
        try:
            expires_at = datetime.fromisoformat(data['expires_at'])
        except ValueError:
            return jsonify({'error': 'expires_at must be a valid ISO datetime string'}), 400
    
    try:
        success, message = PermissionService.grant_direct_permission(
            user_id=user_id,
            permission_id=permission_id,
            granted_by_user_id=granted_by_user_id,
            resource_type=resource_type,
            resource_id=resource_id,
            reason=reason,
            expires_at=expires_at
        )
        
        if success:
            return jsonify({
                'message': message,
                'permission_granted': {
                    'user_id': user_id,
                    'permission_id': permission_id,
                    'permission_name': permission.name,
                    'resource_type': resource_type,
                    'resource_id': resource_id,
                    'expires_at': expires_at.isoformat() if expires_at else None
                }
            }), 201
        else:
            return jsonify({'error': message}), 400
            
    except Exception as e:
        current_app.logger.error(f"Error granting permission: {str(e)}")
        return jsonify({'error': 'Failed to grant permission'}), 500

@enhanced_user_bp.route('/<int:user_id>/permissions/direct', methods=['DELETE'])
@require_permission_v2('revoke_direct_permissions')
def revoke_direct_permission(user_id):
    """
    Revoke a direct permission from a user.
    """
    data = request.get_json()
    
    # Validate required fields
    if not data or 'permission_id' not in data:
        return jsonify({'error': 'permission_id is required'}), 400
    
    try:
        permission_id = int(data['permission_id'])
    except (ValueError, TypeError):
        return jsonify({'error': 'permission_id must be a valid integer'}), 400
    
    # Check if user exists
    user = User.query.get(user_id)
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    # Get current user ID for audit trail
    perm_ctx = get_permission_context()
    revoked_by_user_id = perm_ctx.user_id if perm_ctx else None
    
    # Optional fields
    resource_type = data.get('resource_type')
    resource_id = data.get('resource_id')
    reason = data.get('reason')
    
    try:
        success, message = PermissionService.revoke_direct_permission(
            user_id=user_id,
            permission_id=permission_id,
            revoked_by_user_id=revoked_by_user_id,
            resource_type=resource_type,
            resource_id=resource_id,
            reason=reason
        )
        
        if success:
            return jsonify({
                'message': message,
                'permission_revoked': {
                    'user_id': user_id,
                    'permission_id': permission_id,
                    'resource_type': resource_type,
                    'resource_id': resource_id
                }
            }), 200
        else:
            return jsonify({'error': message}), 400
            
    except Exception as e:
        current_app.logger.error(f"Error revoking permission: {str(e)}")
        return jsonify({'error': 'Failed to revoke permission'}), 500

# =============================================================================
# PERMISSION GROUP MANAGEMENT ENDPOINTS
# =============================================================================

@enhanced_user_bp.route('/permission-groups', methods=['GET'])
@require_permission_v2('view_permission_groups')
def get_permission_groups():
    """
    Get all permission groups with optional filtering.
    """
    try:
        # Get query parameters
        category = request.args.get('category')
        is_active = request.args.get('is_active')
        include_permissions = request.args.get('include_permissions', '').lower() == 'true'
        
        # Build query
        query = PermissionGroup.query
        
        if category:
            query = query.filter(PermissionGroup.category == category)
        
        if is_active is not None:
            active_bool = is_active.lower() == 'true'
            query = query.filter(PermissionGroup.is_active == active_bool)
        
        # Order by sort_order, then name
        groups = query.order_by(PermissionGroup.sort_order, PermissionGroup.name).all()
        
        # Convert to dictionaries
        result = [group.to_dict(include_permissions=include_permissions) for group in groups]
        
        return jsonify({
            'permission_groups': result,
            'total': len(result)
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"Error retrieving permission groups: {str(e)}")
        return jsonify({'error': 'Failed to retrieve permission groups'}), 500

@enhanced_user_bp.route('/permission-groups', methods=['POST'])
@require_permission_v2('create_permission_groups')
def create_permission_group():
    """
    Create a new permission group.
    """
    data = request.get_json()
    
    # Validate required fields
    if not data or 'name' not in data:
        return jsonify({'error': 'name is required'}), 400
    
    # Get current user ID for audit trail
    perm_ctx = get_permission_context()
    created_by_user_id = perm_ctx.user_id if perm_ctx else None
    
    try:
        # Create new permission group
        group = PermissionGroup(
            name=data['name'],
            description=data.get('description'),
            category=data.get('category', 'custom'),
            parent_group_id=data.get('parent_group_id'),
            sort_order=data.get('sort_order', 0),
            created_by_user_id=created_by_user_id
        )
        
        # Add permissions if provided
        if 'permission_ids' in data and isinstance(data['permission_ids'], list):
            permissions = Permission.query.filter(
                Permission.id.in_(data['permission_ids'])
            ).all()
            
            if len(permissions) != len(data['permission_ids']):
                found_ids = {p.id for p in permissions}
                missing_ids = set(data['permission_ids']) - found_ids
                return jsonify({
                    'error': f'Some permissions not found: {list(missing_ids)}'
                }), 400
            
            for permission in permissions:
                group.add_permission(permission)
        
        db.session.add(group)
        db.session.commit()
        
        return jsonify({
            'message': 'Permission group created successfully',
            'permission_group': group.to_dict(include_permissions=True)
        }), 201
        
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error creating permission group: {str(e)}")
        return jsonify({'error': 'Failed to create permission group'}), 500

@enhanced_user_bp.route('/permission-groups/<int:group_id>', methods=['PUT'])
@require_permission_v2('edit_permission_groups')
def update_permission_group(group_id):
    """
    Update an existing permission group.
    """
    group = PermissionGroup.query.get(group_id)
    if not group:
        return jsonify({'error': 'Permission group not found'}), 404
    
    # Check if it's a system group
    if group.is_system_group:
        return jsonify({'error': 'Cannot modify system permission groups'}), 403
    
    data = request.get_json()
    if not data:
        return jsonify({'error': 'No data provided'}), 400
    
    try:
        # Update basic fields
        if 'name' in data:
            group.name = data['name']
        if 'description' in data:
            group.description = data['description']
        if 'category' in data:
            group.category = data['category']
        if 'sort_order' in data:
            group.sort_order = data['sort_order']
        if 'is_active' in data:
            group.is_active = data['is_active']
        
        # Update permissions if provided
        if 'permission_ids' in data and isinstance(data['permission_ids'], list):
            # Clear existing permissions
            group.permissions = []
            
            # Add new permissions
            if data['permission_ids']:
                permissions = Permission.query.filter(
                    Permission.id.in_(data['permission_ids'])
                ).all()
                
                if len(permissions) != len(data['permission_ids']):
                    found_ids = {p.id for p in permissions}
                    missing_ids = set(data['permission_ids']) - found_ids
                    return jsonify({
                        'error': f'Some permissions not found: {list(missing_ids)}'
                    }), 400
                
                for permission in permissions:
                    group.add_permission(permission)
        
        db.session.commit()
        
        return jsonify({
            'message': 'Permission group updated successfully',
            'permission_group': group.to_dict(include_permissions=True)
        }), 200
        
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error updating permission group: {str(e)}")
        return jsonify({'error': 'Failed to update permission group'}), 500

@enhanced_user_bp.route('/permission-groups/<int:group_id>', methods=['DELETE'])
@require_permission_v2('delete_permission_groups')
def delete_permission_group(group_id):
    """
    Delete a permission group.
    """
    group = PermissionGroup.query.get(group_id)
    if not group:
        return jsonify({'error': 'Permission group not found'}), 404
    
    # Check if it's a system group
    if group.is_system_group:
        return jsonify({'error': 'Cannot delete system permission groups'}), 403
    
    # Check if group has users assigned
    if group.get_user_count() > 0:
        return jsonify({
            'error': 'Cannot delete permission group: users are currently assigned to this group'
        }), 409
    
    try:
        # Clear permissions before deletion
        group.permissions = []
        db.session.delete(group)
        db.session.commit()
        
        return jsonify({
            'message': 'Permission group deleted successfully'
        }), 200
        
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error deleting permission group: {str(e)}")
        return jsonify({'error': 'Failed to delete permission group'}), 500

@enhanced_user_bp.route('/<int:user_id>/permission-groups', methods=['GET'])
@require_permission_v2('view_user_permissions', {'resource_type': 'user', 'id_param': 'user_id'})
def get_user_permission_groups(user_id):
    """
    Get all permission groups assigned to a specific user.
    """
    try:
        # Check if user exists
        user = User.query.get(user_id)
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        # Get user's permission groups
        groups = enhanced_permission_service.get_user_permission_groups(user_id)
        
        return jsonify({
            'user_id': user_id,
            'username': user.username,
            'permission_groups': groups,
            'total_groups': len(groups)
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"Error retrieving user permission groups: {str(e)}")
        return jsonify({'error': 'Failed to retrieve user permission groups'}), 500

@enhanced_user_bp.route('/<int:user_id>/permission-groups', methods=['PUT'])
@require_permission_v2('assign_permission_groups')
def assign_permission_groups(user_id):
    """
    Assign permission groups to a user.
    Replaces existing group assignments.
    """
    user = User.query.get(user_id)
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    data = request.get_json()
    if not data or 'group_ids' not in data:
        return jsonify({'error': 'group_ids is required'}), 400
    
    group_ids = data['group_ids']
    if not isinstance(group_ids, list):
        return jsonify({'error': 'group_ids must be a list'}), 400
    
    try:
        # Get the groups
        if group_ids:
            groups = PermissionGroup.query.filter(
                PermissionGroup.id.in_(group_ids),
                PermissionGroup.is_active == True
            ).all()
            
            if len(groups) != len(group_ids):
                found_ids = {g.id for g in groups}
                missing_ids = set(group_ids) - found_ids
                return jsonify({
                    'error': f'Some permission groups not found or inactive: {list(missing_ids)}'
                }), 400
        else:
            groups = []
        
        # Replace existing assignments
        user.permission_groups = groups
        db.session.commit()
        
        # Clear permission cache for this user
        PermissionService._clear_user_cache(user_id)
        
        return jsonify({
            'message': 'Permission groups assigned successfully',
            'user_id': user_id,
            'assigned_groups': [g.to_dict() for g in groups]
        }), 200
        
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error assigning permission groups: {str(e)}")
        return jsonify({'error': 'Failed to assign permission groups'}), 500

# =============================================================================
# PERMISSION AUDIT TRAIL ENDPOINTS
# =============================================================================

@enhanced_user_bp.route('/<int:user_id>/permissions/audit', methods=['GET'])
@require_permission_v2('view_permission_audit')
def get_user_permission_audit(user_id):
    """
    Get audit trail for user's direct permission assignments.
    """
    user = User.query.get(user_id)
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    try:
        # Get all user permissions (including revoked ones)
        user_permissions = UserPermission.query.filter_by(user_id=user_id).all()
        
        audit_trail = []
        for user_perm in user_permissions:
            audit_entry = {
                'id': user_perm.id,
                'permission_name': user_perm.permission.name if user_perm.permission else None,
                'permission_id': user_perm.permission_id,
                'resource_type': user_perm.resource_type,
                'resource_id': user_perm.resource_id,
                'is_active': user_perm.is_active,
                'granted_at': user_perm.granted_at.isoformat() if user_perm.granted_at else None,
                'granted_by_user_id': user_perm.granted_by_user_id,
                'expires_at': user_perm.expires_at.isoformat() if user_perm.expires_at else None,
                'reason': user_perm.reason,
                'revoked_at': user_perm.revoked_at.isoformat() if user_perm.revoked_at else None,
                'revoked_by_user_id': user_perm.revoked_by_user_id,
                'revoked_reason': user_perm.revoked_reason,
                'is_valid': user_perm.is_valid()
            }
            audit_trail.append(audit_entry)
        
        # Sort by granted_at (most recent first)
        audit_trail.sort(key=lambda x: x['granted_at'] or '', reverse=True)
        
        return jsonify({
            'user_id': user_id,
            'username': user.username,
            'audit_trail': audit_trail,
            'total_entries': len(audit_trail)
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"Error retrieving permission audit: {str(e)}")
        return jsonify({'error': 'Failed to retrieve permission audit trail'}), 500

# =============================================================================
# UTILITY ENDPOINTS
# =============================================================================

@enhanced_user_bp.route('/permissions/available', methods=['GET'])
@require_permission_v2('view_available_permissions')
def get_available_permissions():
    """
    Get all available permissions that can be assigned.
    """
    try:
        # Get query parameters
        category = request.args.get('category')
        resource_type = request.args.get('resource_type')
        is_active = request.args.get('is_active', 'true').lower() == 'true'
        
        # Build query
        query = Permission.query.filter(Permission.is_active == is_active)
        
        if category:
            query = query.filter(Permission.category == category)
        
        if resource_type:
            query = query.filter(Permission.resource_type == resource_type)
        
        permissions = query.order_by(Permission.category, Permission.name).all()
        
        # Group by category
        grouped_permissions = {}
        for perm in permissions:
            cat = perm.category or 'uncategorized'
            if cat not in grouped_permissions:
                grouped_permissions[cat] = []
            grouped_permissions[cat].append(perm.to_dict())
        
        return jsonify({
            'permissions': grouped_permissions,
            'total': len(permissions),
            'categories': list(grouped_permissions.keys())
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"Error retrieving available permissions: {str(e)}")
        return jsonify({'error': 'Failed to retrieve available permissions'}), 500

@enhanced_user_bp.route('/<int:user_id>/permissions/summary', methods=['GET'])
@require_permission_v2('view_user_permissions', {'resource_type': 'user', 'id_param': 'user_id'})
def get_user_permission_summary(user_id):
    """
    Get a concise summary of user's permissions by source.
    """
    user = User.query.get(user_id)
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    try:
        summary = PermissionService.get_permission_summary(user_id)
        
        return jsonify({
            'user_id': user_id,
            'username': user.username,
            'permission_summary': summary
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"Error retrieving permission summary: {str(e)}")
        return jsonify({'error': 'Failed to retrieve permission summary'}), 500

# Compatibility function for get_permission_context
def get_permission_context():
    """Get current permission context for audit trail."""
    from flask import g
    return getattr(g, 'current_user', None)

# Compatibility function for admin_required
def admin_required(f):
    """Admin required decorator using v2 system."""
    return require_permission_v2('administrative_operations')(f) 