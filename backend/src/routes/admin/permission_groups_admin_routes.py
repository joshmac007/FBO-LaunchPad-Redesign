"""
Permission Groups Admin Routes
Provides administrative interface for managing permission groups and role assignments.
Phase 4 Step 2 implementation.
"""

from flask import Blueprint, request, jsonify
from flask_jwt_extended import get_jwt_identity
from sqlalchemy.exc import IntegrityError

from ...utils.enhanced_auth_decorators_v2 import require_permission_v2, audit_permission_access
from ...models.permission_group import PermissionGroup, PermissionGroupMembership, RolePermissionGroup
from ...models.permission import Permission
from ...models.role import Role
from ...services.permission_service import enhanced_permission_service
from ...extensions import db

# Create admin blueprint
permission_groups_admin_bp = Blueprint('permission_groups_admin', __name__, url_prefix='/api/admin/permission-groups')

@permission_groups_admin_bp.route('/', methods=['GET'])
@require_permission_v2('administrative_operations')
def get_permission_groups():
    """Get all permission groups with optional filtering."""
    try:
        # Parse query parameters
        include_inactive = request.args.get('include_inactive', 'false').lower() == 'true'
        include_permissions = request.args.get('include_permissions', 'false').lower() == 'true'
        include_children = request.args.get('include_children', 'false').lower() == 'true'
        parent_only = request.args.get('parent_only', 'false').lower() == 'true'
        
        # Build query
        query = PermissionGroup.query
        
        if not include_inactive:
            query = query.filter_by(is_active=True)
            
        if parent_only:
            query = query.filter(PermissionGroup.parent_id.is_(None))
        
        # Order by sort_order and name
        groups = query.order_by(PermissionGroup.sort_order, PermissionGroup.name).all()
        
        # Serialize groups
        groups_data = []
        for group in groups:
            group_data = group.to_dict(
                include_permissions=include_permissions,
                include_children=include_children
            )
            
            # Add additional admin info
            group_data['role_assignments'] = len(group.role_groups)
            group_data['can_delete'], group_data['delete_reason'] = group.can_delete()
            
            groups_data.append(group_data)
        
        return jsonify({
            'groups': groups_data,
            'total': len(groups_data),
            'filters_applied': {
                'include_inactive': include_inactive,
                'include_permissions': include_permissions,
                'include_children': include_children,
                'parent_only': parent_only
            }
        }), 200
        
    except Exception as e:
        return jsonify({'error': f'Failed to retrieve permission groups: {str(e)}'}), 500

@permission_groups_admin_bp.route('/<int:group_id>', methods=['GET'])
@require_permission_v2('administrative_operations')
def get_permission_group(group_id):
    """Get a specific permission group with full details."""
    try:
        group = PermissionGroup.query.get_or_404(group_id)
        
        # Get detailed information
        group_data = group.to_dict(include_permissions=True, include_children=True)
        
        # Add role assignments
        role_assignments = []
        for role_group in group.role_groups:
            if role_group.is_active:
                role_assignments.append({
                    'role_id': role_group.role_id,
                    'role_name': role_group.role.name,
                    'assigned_at': role_group.assigned_at.isoformat(),
                    'assigned_by': role_group.assigned_by.username if role_group.assigned_by else None
                })
        
        group_data['role_assignments'] = role_assignments
        group_data['can_delete'], group_data['delete_reason'] = group.can_delete()
        
        # Get permission memberships with details
        permission_memberships = []
        for membership in group.group_permissions:
            if membership.is_active:
                permission_memberships.append({
                    'permission_id': membership.permission_id,
                    'permission_name': membership.permission.name,
                    'granted_at': membership.granted_at.isoformat(),
                    'granted_by': membership.granted_by.username if membership.granted_by else None
                })
        
        group_data['permission_memberships'] = permission_memberships
        
        return jsonify(group_data), 200
        
    except Exception as e:
        return jsonify({'error': f'Failed to retrieve permission group: {str(e)}'}), 500

@permission_groups_admin_bp.route('/', methods=['POST'])
@audit_permission_access({'action': 'create_permission_group', 'category': 'admin'})
@require_permission_v2('administrative_operations')
def create_permission_group():
    """Create a new permission group."""
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        # Validate required fields
        required_fields = ['name', 'display_name']
        for field in required_fields:
            if field not in data:
                return jsonify({'error': f'Missing required field: {field}'}), 400
        
        # Create new group
        group = PermissionGroup(
            name=data['name'],
            display_name=data['display_name'],
            description=data.get('description'),
            parent_id=data.get('parent_id'),
            sort_order=data.get('sort_order', 0),
            is_system_group=data.get('is_system_group', False)
        )
        
        db.session.add(group)
        db.session.flush()  # Get the ID
        
        # Add permissions if provided
        if 'permission_ids' in data:
            current_user_id = get_jwt_identity()
            for permission_id in data['permission_ids']:
                permission = Permission.query.get(permission_id)
                if permission:
                    membership = PermissionGroupMembership(
                        group_id=group.id,
                        permission_id=permission_id,
                        granted_by_id=current_user_id
                    )
                    db.session.add(membership)
        
        db.session.commit()
        
        # Invalidate cache if group is assigned to roles
        enhanced_permission_service.invalidate_group_cache(group.id)
        
        return jsonify({
            'message': 'Permission group created successfully',
            'group': group.to_dict(include_permissions=True)
        }), 201
        
    except IntegrityError as e:
        db.session.rollback()
        return jsonify({'error': 'Permission group name already exists'}), 409
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Failed to create permission group: {str(e)}'}), 500

@permission_groups_admin_bp.route('/<int:group_id>', methods=['PUT'])
@audit_permission_access({'action': 'update_permission_group', 'category': 'admin'})
@require_permission_v2('administrative_operations')
def update_permission_group(group_id):
    """Update an existing permission group."""
    try:
        group = PermissionGroup.query.get_or_404(group_id)
        data = request.get_json()
        
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        # Check if it's a system group for restricted updates
        if group.is_system_group and 'name' in data:
            return jsonify({'error': 'Cannot change name of system groups'}), 403
        
        # Update basic fields
        if 'display_name' in data:
            group.display_name = data['display_name']
        if 'description' in data:
            group.description = data['description']
        if 'parent_id' in data:
            # Validate parent doesn't create circular reference
            if data['parent_id'] and data['parent_id'] == group.id:
                return jsonify({'error': 'Cannot set group as its own parent'}), 400
            group.parent_id = data['parent_id']
        if 'sort_order' in data:
            group.sort_order = data['sort_order']
        if 'is_active' in data:
            group.is_active = data['is_active']
        
        # Update name for non-system groups
        if 'name' in data and not group.is_system_group:
            group.name = data['name']
        
        db.session.commit()
        
        # Invalidate cache
        enhanced_permission_service.invalidate_group_cache(group.id)
        
        return jsonify({
            'message': 'Permission group updated successfully',
            'group': group.to_dict(include_permissions=True)
        }), 200
        
    except IntegrityError as e:
        db.session.rollback()
        return jsonify({'error': 'Permission group name already exists'}), 409
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Failed to update permission group: {str(e)}'}), 500

@permission_groups_admin_bp.route('/<int:group_id>', methods=['DELETE'])
@audit_permission_access({'action': 'delete_permission_group', 'category': 'admin'})
@require_permission_v2('administrative_operations')
def delete_permission_group(group_id):
    """Delete a permission group."""
    try:
        group = PermissionGroup.query.get_or_404(group_id)
        
        # Check if group can be deleted
        can_delete, reason = group.can_delete()
        if not can_delete:
            return jsonify({'error': reason}), 403
        
        # Invalidate cache before deletion
        enhanced_permission_service.invalidate_group_cache(group.id)
        
        # Delete the group (cascade will handle memberships and role assignments)
        db.session.delete(group)
        db.session.commit()
        
        return jsonify({'message': 'Permission group deleted successfully'}), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Failed to delete permission group: {str(e)}'}), 500

@permission_groups_admin_bp.route('/<int:group_id>/permissions', methods=['POST'])
@audit_permission_access({'action': 'add_group_permissions', 'category': 'admin'})
@require_permission_v2('administrative_operations')
def add_permissions_to_group(group_id):
    """Add permissions to a permission group."""
    try:
        group = PermissionGroup.query.get_or_404(group_id)
        data = request.get_json()
        
        if not data or 'permission_ids' not in data:
            return jsonify({'error': 'permission_ids required'}), 400
        
        current_user_id = get_jwt_identity()
        added_permissions = []
        
        for permission_id in data['permission_ids']:
            permission = Permission.query.get(permission_id)
            if not permission:
                continue
                
            # Check if membership already exists
            existing = PermissionGroupMembership.query.filter_by(
                group_id=group_id,
                permission_id=permission_id
            ).first()
            
            if not existing:
                membership = PermissionGroupMembership(
                    group_id=group_id,
                    permission_id=permission_id,
                    granted_by_id=current_user_id
                )
                db.session.add(membership)
                added_permissions.append(permission.name)
            elif not existing.is_active:
                # Reactivate if previously deactivated
                existing.is_active = True
                existing.granted_by_id = current_user_id
                existing.granted_at = db.func.now()
                added_permissions.append(permission.name)
        
        db.session.commit()
        
        # Invalidate cache
        enhanced_permission_service.invalidate_group_cache(group.id)
        
        return jsonify({
            'message': f'Added {len(added_permissions)} permissions to group',
            'added_permissions': added_permissions,
            'group': group.to_dict(include_permissions=True)
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Failed to add permissions: {str(e)}'}), 500

@permission_groups_admin_bp.route('/<int:group_id>/permissions/<int:permission_id>', methods=['DELETE'])
@audit_permission_access({'action': 'remove_group_permission', 'category': 'admin'})
@require_permission_v2('administrative_operations')
def remove_permission_from_group(group_id, permission_id):
    """Remove a permission from a permission group."""
    try:
        group = PermissionGroup.query.get_or_404(group_id)
        
        membership = PermissionGroupMembership.query.filter_by(
            group_id=group_id,
            permission_id=permission_id
        ).first()
        
        if not membership:
            return jsonify({'error': 'Permission not found in group'}), 404
        
        # Deactivate instead of deleting for audit trail
        membership.is_active = False
        db.session.commit()
        
        # Invalidate cache
        enhanced_permission_service.invalidate_group_cache(group.id)
        
        return jsonify({
            'message': 'Permission removed from group successfully'
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Failed to remove permission: {str(e)}'}), 500

@permission_groups_admin_bp.route('/<int:group_id>/roles', methods=['GET'])
@require_permission_v2('administrative_operations')
def get_group_role_assignments(group_id):
    """Get all role assignments for a permission group."""
    try:
        group = PermissionGroup.query.get_or_404(group_id)
        
        assignments = []
        for role_group in group.role_groups:
            if role_group.is_active:
                assignments.append(role_group.to_dict())
        
        return jsonify({
            'group_id': group_id,
            'group_name': group.name,
            'role_assignments': assignments,
            'total': len(assignments)
        }), 200
        
    except Exception as e:
        return jsonify({'error': f'Failed to retrieve role assignments: {str(e)}'}), 500

@permission_groups_admin_bp.route('/<int:group_id>/roles', methods=['POST'])
@audit_permission_access({'action': 'assign_group_to_roles', 'category': 'admin'})
@require_permission_v2('administrative_operations')
def assign_group_to_roles(group_id):
    """Assign a permission group to multiple roles."""
    try:
        group = PermissionGroup.query.get_or_404(group_id)
        data = request.get_json()
        
        if not data or 'role_ids' not in data:
            return jsonify({'error': 'role_ids required'}), 400
        
        current_user_id = get_jwt_identity()
        assigned_roles = []
        
        for role_id in data['role_ids']:
            role = Role.query.get(role_id)
            if not role:
                continue
                
            # Check if assignment already exists
            existing = RolePermissionGroup.query.filter_by(
                role_id=role_id,
                group_id=group_id
            ).first()
            
            if not existing:
                assignment = RolePermissionGroup(
                    role_id=role_id,
                    group_id=group_id,
                    assigned_by_id=current_user_id
                )
                db.session.add(assignment)
                assigned_roles.append(role.name)
            elif not existing.is_active:
                # Reactivate if previously deactivated
                existing.is_active = True
                existing.assigned_by_id = current_user_id
                existing.assigned_at = db.func.now()
                assigned_roles.append(role.name)
        
        db.session.commit()
        
        # Invalidate cache for affected roles
        for role_id in data['role_ids']:
            enhanced_permission_service.invalidate_role_cache(role_id)
        
        return jsonify({
            'message': f'Group assigned to {len(assigned_roles)} roles',
            'assigned_roles': assigned_roles
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Failed to assign group to roles: {str(e)}'}), 500

@permission_groups_admin_bp.route('/<int:group_id>/roles/<int:role_id>', methods=['DELETE'])
@audit_permission_access({'action': 'unassign_group_from_role', 'category': 'admin'})
@require_permission_v2('administrative_operations')
def unassign_group_from_role(group_id, role_id):
    """Remove a permission group assignment from a role."""
    try:
        assignment = RolePermissionGroup.query.filter_by(
            role_id=role_id,
            group_id=group_id
        ).first()
        
        if not assignment:
            return jsonify({'error': 'Group assignment not found'}), 404
        
        # Deactivate instead of deleting for audit trail
        assignment.is_active = False
        db.session.commit()
        
        # Invalidate cache for affected role
        enhanced_permission_service.invalidate_role_cache(role_id)
        
        return jsonify({
            'message': 'Group unassigned from role successfully'
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Failed to unassign group from role: {str(e)}'}), 500

@permission_groups_admin_bp.route('/hierarchy', methods=['GET'])
@require_permission_v2('administrative_operations')
def get_permission_groups_hierarchy():
    """Get permission groups in hierarchical tree structure."""
    try:
        # Get all active groups
        groups = PermissionGroup.query.filter_by(is_active=True).order_by(
            PermissionGroup.sort_order, PermissionGroup.name
        ).all()
        
        # Build hierarchy tree
        groups_by_id = {group.id: group.to_dict(include_permissions=True) for group in groups}
        root_groups = []
        
        for group in groups:
            group_data = groups_by_id[group.id]
            
            if group.parent_id is None:
                # Root group
                root_groups.append(group_data)
            else:
                # Child group - add to parent's children
                parent_data = groups_by_id.get(group.parent_id)
                if parent_data:
                    if 'children' not in parent_data:
                        parent_data['children'] = []
                    parent_data['children'].append(group_data)
        
        return jsonify({
            'hierarchy': root_groups,
            'total_groups': len(groups)
        }), 200
        
    except Exception as e:
        return jsonify({'error': f'Failed to retrieve hierarchy: {str(e)}'}), 500

# Error handlers
@permission_groups_admin_bp.errorhandler(403)
def permission_denied(error):
    """Enhanced permission denied handler."""
    return jsonify({
        'error': 'Permission denied',
        'message': 'You do not have sufficient administrative permissions'
    }), 403

@permission_groups_admin_bp.errorhandler(404)
def not_found(error):
    """Enhanced not found handler."""
    return jsonify({
        'error': 'Resource not found',
        'message': 'The requested permission group or related resource was not found'
    }), 404 