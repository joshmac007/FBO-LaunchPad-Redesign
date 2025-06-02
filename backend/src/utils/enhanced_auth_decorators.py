"""
Enhanced Authentication Decorators for Granular Permission System

This module provides advanced authentication decorators that support:
- Resource-specific permission checking
- Multiple permission options
- Ownership-based access control
- Dynamic permission checking within routes
"""

from functools import wraps
from typing import Optional, List, Union
from flask import g, request, jsonify, current_app

from ..utils.decorators import token_required


class PermissionContext:
    """
    Context class for dynamic permission checking within routes.
    Provides utilities for checking permissions and resource access.
    """
    
    def __init__(self, user_id: int, user_permissions: dict):
        self.user_id = user_id
        self.user_permissions = user_permissions
    
    def has_permission(self, permission_name: str, resource_type: str = None, resource_id: str = None) -> bool:
        """Check if the user has a specific permission."""
        try:
            from ..services.permission_service import PermissionService
            return PermissionService.user_has_permission(
                user_id=self.user_id,
                permission_name=permission_name,
                resource_type=resource_type,
                resource_id=resource_id
            )
        except ImportError:
            # Fallback to basic permission checking
            return permission_name in self.user_permissions
    
    def can_view_resource(self, resource_type: str, resource_id: str) -> bool:
        """Check if user can view a specific resource."""
        return (
            self.has_permission(f'view_{resource_type}', resource_type, resource_id) or
            self.has_permission(f'view_any_{resource_type}') or
            self.has_permission(f'manage_{resource_type}')
        )
    
    def can_edit_resource(self, resource_type: str, resource_id: str) -> bool:
        """Check if user can edit a specific resource."""
        return (
            self.has_permission(f'edit_{resource_type}', resource_type, resource_id) or
            self.has_permission(f'edit_any_{resource_type}') or
            self.has_permission(f'manage_{resource_type}')
        )
    
    def can_delete_resource(self, resource_type: str, resource_id: str) -> bool:
        """Check if user can delete a specific resource."""
        return (
            self.has_permission(f'delete_{resource_type}', resource_type, resource_id) or
            self.has_permission(f'delete_any_{resource_type}') or
            self.has_permission(f'manage_{resource_type}')
        )
    
    def get_permissions(self) -> dict:
        """Get all user permissions."""
        return self.user_permissions


def require_permission(permission_name: str, resource_type: str = None, resource_id_param: str = None):
    """
    Enhanced permission decorator with resource-specific checking.
    
    Args:
        permission_name (str): Permission name to check
        resource_type (str): Optional resource type (e.g., 'fuel_order')
        resource_id_param (str): Optional parameter name containing resource ID
        
    Usage:
        @require_permission('view_fuel_order', 'fuel_order', 'order_id')
        @require_permission('manage_users')
    """
    def decorator(f):
        @wraps(f)
        @token_required
        def decorated_function(*args, **kwargs):
            user = g.current_user
            
            # Get resource ID from route parameters if specified
            resource_id = None
            if resource_id_param and resource_id_param in kwargs:
                resource_id = str(kwargs[resource_id_param])
            
            # Check permission using enhanced service
            try:
                from ..services.permission_service import PermissionService
                has_perm = PermissionService.user_has_permission(
                    user_id=user.id,
                    permission_name=permission_name,
                    resource_type=resource_type,
                    resource_id=resource_id
                )
            except ImportError:
                # Fallback to basic permission checking
                has_perm = user.has_permission(permission_name)
            
            if not has_perm:
                return jsonify({
                    'error': 'Insufficient permissions',
                    'required_permission': permission_name,
                    'resource_type': resource_type,
                    'resource_id': resource_id
                }), 403
            
            # Create permission context for use within the route
            try:
                from ..services.permission_service import PermissionService
                user_permissions = PermissionService.get_user_effective_permissions(user.id)
            except ImportError:
                user_permissions = {}
            
            g.permission_context = PermissionContext(user.id, user_permissions)
            g.access_reason = 'permission'
            
            return f(*args, **kwargs)
        return decorated_function
    return decorator


def require_any_permission(*permission_names: str):
    """
    Decorator that allows access if user has ANY of the specified permissions.
    
    Args:
        *permission_names: Variable number of permission names
        
    Usage:
        @require_any_permission('manage_orders', 'view_all_orders', 'perform_fueling')
    """
    def decorator(f):
        @wraps(f)
        @token_required
        def decorated_function(*args, **kwargs):
            user = g.current_user
            
            # Check if user has any of the required permissions
            has_any_permission = False
            granted_permission = None
            
            try:
                from ..services.permission_service import PermissionService
                for permission_name in permission_names:
                    if PermissionService.user_has_permission(user.id, permission_name):
                        has_any_permission = True
                        granted_permission = permission_name
                        break
            except ImportError:
                # Fallback to basic permission checking
                for permission_name in permission_names:
                    if user.has_permission(permission_name):
                        has_any_permission = True
                        granted_permission = permission_name
                        break
            
            if not has_any_permission:
                return jsonify({
                    'error': 'Insufficient permissions',
                    'required_any_of': list(permission_names)
                }), 403
            
            # Store which permission granted access
            g.granted_permission = granted_permission
            
            # Create permission context
            try:
                from ..services.permission_service import PermissionService
                user_permissions = PermissionService.get_user_effective_permissions(user.id)
            except ImportError:
                user_permissions = {}
            
            g.permission_context = PermissionContext(user.id, user_permissions)
            
            return f(*args, **kwargs)
        return decorated_function
    return decorator


def require_all_permissions(*permission_names: str):
    """
    Decorator that requires user to have ALL of the specified permissions.
    
    Args:
        *permission_names: Variable number of permission names
        
    Usage:
        @require_all_permissions('view_orders', 'export_data')
    """
    def decorator(f):
        @wraps(f)
        @token_required
        def decorated_function(*args, **kwargs):
            user = g.current_user
            
            # Check if user has all required permissions
            missing_permissions = []
            
            try:
                from ..services.permission_service import PermissionService
                for permission_name in permission_names:
                    if not PermissionService.user_has_permission(user.id, permission_name):
                        missing_permissions.append(permission_name)
            except ImportError:
                # Fallback to basic permission checking
                for permission_name in permission_names:
                    if not user.has_permission(permission_name):
                        missing_permissions.append(permission_name)
            
            if missing_permissions:
                return jsonify({
                    'error': 'Insufficient permissions',
                    'missing_permissions': missing_permissions,
                    'required_all_of': list(permission_names)
                }), 403
            
            # Create permission context
            try:
                from ..services.permission_service import PermissionService
                user_permissions = PermissionService.get_user_effective_permissions(user.id)
            except ImportError:
                user_permissions = {}
            
            g.permission_context = PermissionContext(user.id, user_permissions)
            
            return f(*args, **kwargs)
        return decorated_function
    return decorator


def require_permission_or_ownership(permission_name: str, resource_type: str, resource_id_param: str):
    """
    Decorator that allows access if user has permission OR owns the resource.
    
    Args:
        permission_name (str): Permission name to check
        resource_type (str): Resource type (e.g., 'fuel_order')
        resource_id_param (str): Parameter name containing resource ID
        
    Usage:
        @require_permission_or_ownership('view_any_fuel_order', 'fuel_order', 'order_id')
    """
    def decorator(f):
        @wraps(f)
        @token_required
        def decorated_function(*args, **kwargs):
            user = g.current_user
            
            # Get resource ID from route parameters
            if resource_id_param not in kwargs:
                return jsonify({
                    'error': f'Resource ID parameter {resource_id_param} not found'
                }), 400
            
            resource_id = str(kwargs[resource_id_param])
            
            # Check permission first
            has_permission = False
            access_reason = None
            
            try:
                from ..services.permission_service import PermissionService
                
                # Check global permission
                if PermissionService.user_has_permission(user.id, permission_name):
                    has_permission = True
                    access_reason = 'permission'
                # Check ownership if no global permission
                elif PermissionService.user_has_permission(
                    user.id, permission_name.replace('_any_', '_own_'), resource_type, resource_id
                ):
                    has_permission = True
                    access_reason = 'ownership'
                
            except ImportError:
                # Fallback to basic permission checking
                if user.has_permission(permission_name):
                    has_permission = True
                    access_reason = 'permission'
            
            if not has_permission:
                return jsonify({
                    'error': 'Insufficient permissions',
                    'required_permission_or_ownership': permission_name,
                    'resource_type': resource_type,
                    'resource_id': resource_id
                }), 403
            
            # Store access reason for debugging
            g.access_reason = access_reason
            
            # Create permission context
            try:
                from ..services.permission_service import PermissionService
                user_permissions = PermissionService.get_user_effective_permissions(user.id)
            except ImportError:
                user_permissions = {}
            
            g.permission_context = PermissionContext(user.id, user_permissions)
            
            return f(*args, **kwargs)
        return decorated_function
    return decorator


def get_permission_context() -> Optional[PermissionContext]:
    """
    Get the current permission context from the request.
    
    Returns:
        PermissionContext or None if not available
    """
    return getattr(g, 'permission_context', None)


# Convenience decorators for backward compatibility and ease of use
def admin_required():
    """Convenience decorator for admin-level permissions."""
    return require_any_permission('admin_access', 'manage_users', 'manage_system')


def csr_required():
    """Convenience decorator for CSR-level permissions."""
    return require_any_permission('csr_access', 'manage_orders', 'create_fuel_order')


def fueler_required():
    """Convenience decorator for fueler-level permissions."""
    return require_any_permission('fueler_access', 'perform_fueling', 'update_fuel_order_status')


def manager_required():
    """Convenience decorator for manager-level permissions."""
    return require_any_permission('manager_access', 'view_reports', 'manage_operations') 