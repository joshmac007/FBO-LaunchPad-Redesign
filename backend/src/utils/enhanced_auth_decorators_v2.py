"""
Enhanced Authorization Decorators v2.0 for Phase 4
Advanced decorators with resource context, caching, and permission groups.
"""

import functools
import logging
from typing import Dict, List, Optional, Union, Callable, Any
from flask import request, jsonify, g
from flask_jwt_extended import get_jwt_identity, verify_jwt_in_request

from ..services.enhanced_permission_service import (
    enhanced_permission_service, 
    ResourceContext
)

logger = logging.getLogger(__name__)

def require_permission_v2(permission: str, 
                         resource_context: Optional[Union[Dict, ResourceContext]] = None,
                         allow_self: bool = False,
                         cache_ttl: Optional[int] = None):
    """
    Enhanced permission decorator with comprehensive context support.
    
    Args:
        permission: The permission name to check
        resource_context: Optional resource context (Dict or ResourceContext)
        allow_self: Allow access if user is accessing their own data
        cache_ttl: Cache time-to-live for permission checks
    
    Example:
        @require_permission_v2('create_fuel_order')
        def create_fuel_order():
            # User needs create_fuel_order permission
            
        @require_permission_v2('view_fuel_order', {'resource_type': 'fuel_order', 'id_param': 'order_id'})
        def get_fuel_order(order_id):
            # User needs view_fuel_order permission for specific order
    """
    def decorator(f):
        @functools.wraps(f)
        def decorated_function(*args, **kwargs):
            try:
                # Verify JWT token and get current user
                try:
                    verify_jwt_in_request()
                    current_user_id = get_jwt_identity()
                except Exception as jwt_error:
                    logger.warning(f"JWT verification failed for permission check: {permission} - {jwt_error}")
                    return jsonify({'error': 'Authentication required'}), 401
                    
                if not current_user_id:
                    logger.warning(f"No authenticated user for permission check: {permission}")
                    return jsonify({'error': 'Authentication required'}), 401
                
                # Convert user_id to integer and get user object
                try:
                    current_user_id = int(current_user_id)
                    from ..models.user import User
                    current_user = User.query.get(current_user_id)
                    if not current_user:
                        logger.warning(f"User {current_user_id} not found during permission check")
                        return jsonify({'error': 'User not found'}), 401
                    
                    # Set g.current_user for routes that expect it
                    g.current_user = current_user
                    
                except (ValueError, TypeError) as e:
                    logger.warning(f"Invalid user ID format: {current_user_id} - {e}")
                    return jsonify({'error': 'Invalid user identifier'}), 401
                
                # Process resource context
                context = None
                if resource_context:
                    context = _process_resource_context(resource_context, kwargs)
                
                # Special case: allow self-access
                if allow_self and context and context.resource_type == 'user':
                    if context.resource_id == current_user_id:
                        logger.debug(f"Self-access allowed for user {current_user_id}")
                        return f(*args, **kwargs)
                
                # Check permission using enhanced service
                has_permission = enhanced_permission_service.user_has_permission(
                    user_id=current_user_id,
                    permission=permission,
                    resource_context=context
                )
                
                if not has_permission:
                    logger.warning(f"Permission denied: user {current_user_id} lacks '{permission}'")
                    return jsonify({
                        'error': 'Insufficient permissions',
                        'required_permission': permission,
                        'resource_context': {
                            'type': context.resource_type if context else None,
                            'id': context.resource_id if context else None
                        } if context else None
                    }), 403
                
                # Store context for use in route
                g.permission_context = context
                g.verified_permission = permission
                
                return f(*args, **kwargs)
                
            except Exception as e:
                logger.error(f"Error in permission decorator: {e}")
                return jsonify({"error": "Authentication error in decorator"}), 401
                
        return decorated_function
    return decorator

def require_any_permission_v2(*permissions: str, 
                             resource_context: Optional[Dict] = None):
    """
    Enhanced decorator that requires ANY of the specified permissions.
    
    Args:
        *permissions: Multiple permission names (user needs at least one)
        resource_context: Optional resource context for all permissions
        
    Example:
        @require_any_permission_v2('view_any_fuel_order', 'view_assigned_orders')
        def get_fuel_orders():
            # User needs either permission to access
    """
    def decorator(f):
        @functools.wraps(f)
        def decorated_function(*args, **kwargs):
            try:
                # Verify JWT token and get current user
                try:
                    verify_jwt_in_request()
                    current_user_id = get_jwt_identity()
                except Exception as jwt_error:
                    logger.warning(f"JWT verification failed for permission check: {permissions} - {jwt_error}")
                    return jsonify({'error': 'Authentication required'}), 401
                    
                if not current_user_id:
                    logger.warning(f"No authenticated user for permission check: {permissions}")
                    return jsonify({'error': 'Authentication required'}), 401
                
                # Convert user_id to integer and get user object
                try:
                    current_user_id = int(current_user_id)
                    from ..models.user import User
                    current_user = User.query.get(current_user_id)
                    if not current_user:
                        logger.warning(f"User {current_user_id} not found during permission check")
                        return jsonify({'error': 'User not found'}), 401
                    
                    # Set g.current_user for routes that expect it
                    g.current_user = current_user
                    
                except (ValueError, TypeError) as e:
                    logger.warning(f"Invalid user ID format: {current_user_id} - {e}")
                    return jsonify({'error': 'Invalid user identifier'}), 401
                
                # Process resource context if provided
                context = None
                if resource_context:
                    context = _process_resource_context(resource_context, kwargs)
                
                # Check if user has any of the required permissions
                has_any_permission = False
                granted_permission = None
                
                for permission in permissions:
                    if enhanced_permission_service.user_has_permission(
                        user_id=current_user_id,
                        permission=permission,
                        resource_context=context
                    ):
                        has_any_permission = True
                        granted_permission = permission
                        break
                
                if not has_any_permission:
                    logger.warning(f"Permission denied: user {current_user_id} lacks any of {permissions}")
                    return jsonify({
                        'error': 'Insufficient permissions',
                        'required_permissions': list(permissions),
                        'message': 'You need at least one of the specified permissions'
                    }), 403
                
                # Store context for use in route
                g.permission_context = context
                g.verified_permission = granted_permission
                
                print(f"--- ANY_PERMISSION DECORATOR: Permission granted ({granted_permission}). Calling route function.", flush=True)
                return f(*args, **kwargs)
                
            except Exception as e:
                print(f"--- ANY_PERMISSION DECORATOR: EXCEPTION! {type(e).__name__}: {e}", flush=True)
                import traceback
                traceback.print_exc()
                logger.error(f"Error in any-permission decorator: {e}")
                return jsonify({"error": "Authentication error in decorator"}), 401
                
        return decorated_function
    return decorator

def require_all_permissions_v2(*permissions: str,
                              resource_context: Optional[Dict] = None):
    """
    Enhanced decorator that requires ALL of the specified permissions.
    
    Args:
        *permissions: Multiple permission names (user needs all of them)
        resource_context: Optional resource context for all permissions
        
    Example:
        @require_all_permissions_v2('manage_users', 'view_sensitive_data')
        def get_user_sensitive_info():
            # User needs both permissions to access
    """
    def decorator(f):
        @functools.wraps(f)
        def decorated_function(*args, **kwargs):
            print("--- ALL_PERMISSIONS DECORATOR: START ---", flush=True)
            try:
                # Verify JWT token and get current user
                try:
                    verify_jwt_in_request()
                    current_user_id = get_jwt_identity()
                    print(f"--- ALL_PERMISSIONS DECORATOR: JWT identity is '{current_user_id}'", flush=True)
                except Exception as jwt_error:
                    print(f"--- ALL_PERMISSIONS DECORATOR: JWT verification failed: {jwt_error}", flush=True)
                    logger.warning(f"JWT verification failed for permission check: {permissions} - {jwt_error}")
                    return jsonify({'error': 'Authentication required'}), 401
                    
                if not current_user_id:
                    print("--- ALL_PERMISSIONS DECORATOR: No authenticated user!", flush=True)
                    logger.warning(f"No authenticated user for permission check: {permissions}")
                    return jsonify({'error': 'Authentication required'}), 401
                
                # Convert user_id to integer and get user object
                try:
                    current_user_id = int(current_user_id)
                    from ..models.user import User
                    current_user = User.query.get(current_user_id)
                    if not current_user:
                        print("--- ALL_PERMISSIONS DECORATOR: User not found in DB!", flush=True)
                        logger.warning(f"User {current_user_id} not found during permission check")
                        return jsonify({'error': 'User not found'}), 401
                    
                    # Set g.current_user for routes that expect it
                    g.current_user = current_user
                    print(f"--- ALL_PERMISSIONS DECORATOR: Set g.current_user to {current_user.email}", flush=True)
                    
                except (ValueError, TypeError) as e:
                    print(f"--- ALL_PERMISSIONS DECORATOR: Invalid user ID format: {current_user_id} - {e}", flush=True)
                    logger.warning(f"Invalid user ID format: {current_user_id} - {e}")
                    return jsonify({'error': 'Invalid user identifier'}), 401
                
                # Process resource context if provided
                context = None
                if resource_context:
                    context = _process_resource_context(resource_context, kwargs)
                
                # Check if user has all required permissions
                missing_permissions = []
                
                for permission in permissions:
                    if not enhanced_permission_service.user_has_permission(
                        user_id=current_user_id,
                        permission=permission,
                        resource_context=context
                    ):
                        missing_permissions.append(permission)
                
                if missing_permissions:
                    print(f"--- ALL_PERMISSIONS DECORATOR: Permission denied for {current_user.email} (missing: {missing_permissions})", flush=True)
                    logger.warning(f"Permission denied: user {current_user_id} missing {missing_permissions}")
                    return jsonify({
                        'error': 'Insufficient permissions',
                        'missing_permissions': missing_permissions,
                        'message': 'You need all of the specified permissions'
                    }), 403
                
                # Store context for use in route
                g.permission_context = context
                g.verified_permissions = list(permissions)
                
                print(f"--- ALL_PERMISSIONS DECORATOR: All permissions granted ({permissions}). Calling route function.", flush=True)
                return f(*args, **kwargs)
                
            except Exception as e:
                print(f"--- ALL_PERMISSIONS DECORATOR: EXCEPTION! {type(e).__name__}: {e}", flush=True)
                import traceback
                traceback.print_exc()
                logger.error(f"Error in all-permissions decorator: {e}")
                return jsonify({"error": "Authentication error in decorator"}), 401
                
        return decorated_function
    return decorator

def require_permission_or_ownership_v2(permission: str,
                                      resource_type: str,
                                      id_param: str,
                                      allow_admin_override: bool = True):
    """
    Enhanced decorator for permission OR ownership checks.
    
    Args:
        permission: General permission that grants access
        resource_type: Type of resource (e.g., 'fuel_order', 'user')
        id_param: URL parameter name containing resource ID
        allow_admin_override: Allow admin users to bypass ownership
        
    Example:
        @require_permission_or_ownership_v2('view_any_fuel_order', 'fuel_order', 'order_id')
        def get_fuel_order(order_id):
            # User needs view_any_fuel_order OR owns this specific order
    """
    def decorator(f):
        @functools.wraps(f)
        def decorated_function(*args, **kwargs):
            print("--- OWNERSHIP DECORATOR: START ---", flush=True)
            try:
                # Verify JWT token and get current user
                try:
                    verify_jwt_in_request()
                    current_user_id = get_jwt_identity()
                    print(f"--- OWNERSHIP DECORATOR: JWT identity is '{current_user_id}'", flush=True)
                except Exception as jwt_error:
                    print(f"--- OWNERSHIP DECORATOR: JWT verification failed: {jwt_error}", flush=True)
                    logger.warning(f"JWT verification failed for permission check: {permission} - {jwt_error}")
                    return jsonify({'error': 'Authentication required'}), 401
                    
                if not current_user_id:
                    print("--- OWNERSHIP DECORATOR: No authenticated user!", flush=True)
                    logger.warning(f"No authenticated user for permission check: {permission}")
                    return jsonify({'error': 'Authentication required'}), 401
                
                # Convert user_id to integer and get user object
                try:
                    current_user_id = int(current_user_id)
                    from ..models.user import User
                    current_user = User.query.get(current_user_id)
                    if not current_user:
                        print("--- OWNERSHIP DECORATOR: User not found in DB!", flush=True)
                        logger.warning(f"User {current_user_id} not found during permission check")
                        return jsonify({'error': 'User not found'}), 401
                    
                    # Set g.current_user for routes that expect it
                    g.current_user = current_user
                    print(f"--- OWNERSHIP DECORATOR: Set g.current_user to {current_user.email}", flush=True)
                    
                except (ValueError, TypeError) as e:
                    print(f"--- OWNERSHIP DECORATOR: Invalid user ID format: {current_user_id} - {e}", flush=True)
                    logger.warning(f"Invalid user ID format: {current_user_id} - {e}")
                    return jsonify({'error': 'Invalid user identifier'}), 401
                
                # Get resource ID from URL parameters
                resource_id = kwargs.get(id_param)
                if not resource_id:
                    logger.error(f"Resource ID parameter '{id_param}' not found in route")
                    return jsonify({'error': 'Invalid resource identifier'}), 400
                
                # First check: Does user have the general permission?
                has_general_permission = enhanced_permission_service.user_has_permission(
                    user_id=current_user_id,
                    permission=permission
                )
                
                if has_general_permission:
                    print(f"--- OWNERSHIP DECORATOR: User has general permission '{permission}'. Calling route function.", flush=True)
                    logger.debug(f"User {current_user_id} has general permission '{permission}'")
                    g.access_method = 'permission'
                    g.verified_permission = permission
                    return f(*args, **kwargs)
                
                # Second check: Does user own this specific resource?
                ownership_context = ResourceContext(
                    resource_type=resource_type,
                    resource_id=resource_id,
                    ownership_check=True
                )
                
                has_ownership = enhanced_permission_service.user_has_permission(
                    user_id=current_user_id,
                    permission=f"view_own_{resource_type}",  # Ownership permission pattern
                    resource_context=ownership_context
                )
                
                if has_ownership:
                    print(f"--- OWNERSHIP DECORATOR: User has ownership access to {resource_type} {resource_id}. Calling route function.", flush=True)
                    logger.debug(f"User {current_user_id} has ownership access to {resource_type} {resource_id}")
                    g.access_method = 'ownership'
                    g.verified_permission = f"view_own_{resource_type}"
                    return f(*args, **kwargs)
                
                # Admin override check
                if allow_admin_override:
                    is_admin = enhanced_permission_service.user_has_permission(
                        user_id=current_user_id,
                        permission='admin'
                    )
                    
                    if is_admin:
                        print(f"--- OWNERSHIP DECORATOR: Admin user granted access via admin override. Calling route function.", flush=True)
                        logger.debug(f"Admin user {current_user_id} granted access via admin override")
                        g.access_method = 'admin_override'
                        g.verified_permission = 'admin'
                        return f(*args, **kwargs)
                
                # Access denied
                print(f"--- OWNERSHIP DECORATOR: Access denied for {current_user.email} (lacks {permission} and doesn't own {resource_type} {resource_id})", flush=True)
                logger.warning(f"Access denied: user {current_user_id} lacks '{permission}' and doesn't own {resource_type} {resource_id}")
                return jsonify({
                    'error': 'Access denied',
                    'message': f'You need {permission} permission or ownership of this {resource_type}'
                }), 403
                
            except Exception as e:
                print(f"--- OWNERSHIP DECORATOR: EXCEPTION! {type(e).__name__}: {e}", flush=True)
                import traceback
                traceback.print_exc()
                logger.error(f"Error in permission-or-ownership decorator: {e}")
                return jsonify({"error": "Authentication error in decorator"}), 401
                
        return decorated_function
    return decorator

def cache_user_permissions(cache_key_func: Optional[Callable] = None,
                         ttl: int = 300):
    """
    Decorator to cache user permissions for expensive permission operations.
    
    Args:
        cache_key_func: Function to generate custom cache key
        ttl: Time to live in seconds
        
    Example:
        @cache_user_permissions(ttl=600)
        @require_permission_v2('expensive_operation')
        def expensive_operation():
            # This permission check will be cached for 10 minutes
    """
    def decorator(f):
        @functools.wraps(f)
        def decorated_function(*args, **kwargs):
            # This decorator works in conjunction with the permission decorators
            # The enhanced_permission_service already handles caching
            # This decorator can add additional caching logic if needed
            return f(*args, **kwargs)
        return decorated_function
    return decorator

def audit_permission_access(audit_details: Optional[Dict] = None):
    """
    Decorator to add enhanced auditing to permission checks.
    
    Args:
        audit_details: Additional details to include in audit log
        
    Example:
        @audit_permission_access({'action': 'view_sensitive_data', 'category': 'security'})
        @require_permission_v2('view_sensitive_data')
        def get_sensitive_data():
            # This access will be audited with additional details
    """
    def decorator(f):
        @functools.wraps(f)
        def decorated_function(*args, **kwargs):
            try:
                # Execute the original function
                result = f(*args, **kwargs)
                
                # Log successful access with audit details
                try:
                    verify_jwt_in_request()
                    current_user_id = get_jwt_identity()
                except Exception:
                    current_user_id = None
                    
                audit_log = {
                    'user_id': current_user_id,
                    'function': f.__name__,
                    'success': True,
                    'timestamp': enhanced_permission_service._get_current_timestamp(),
                    **(audit_details or {})
                }
                
                logger.info(f"Audit log: {audit_log}")
                return result
                
            except Exception as e:
                # Log failed access
                try:
                    verify_jwt_in_request()
                    current_user_id = get_jwt_identity()
                except Exception:
                    current_user_id = None
                    
                audit_log = {
                    'user_id': current_user_id,
                    'function': f.__name__,
                    'success': False,
                    'error': str(e),
                    'timestamp': enhanced_permission_service._get_current_timestamp(),
                    **(audit_details or {})
                }
                
                logger.error(f"Audit log (failed): {audit_log}")
                raise
                
        return decorated_function
    return decorator

# Helper functions

def _process_resource_context(context_input: Union[Dict, ResourceContext], 
                            route_kwargs: Dict) -> Optional[ResourceContext]:
    """Process resource context input and resolve parameter values."""
    try:
        if isinstance(context_input, ResourceContext):
            context = context_input
        elif isinstance(context_input, dict):
            context = ResourceContext(**context_input)
        else:
            logger.error(f"Invalid resource context type: {type(context_input)}")
            return None
        
        # Resolve resource_id from route parameters if id_param is specified
        if context.id_param and not context.resource_id:
            context.resource_id = route_kwargs.get(context.id_param)
            
        return context
        
    except Exception as e:
        logger.error(f"Error processing resource context: {e}")
        return None

def get_current_user_permissions() -> List[str]:
    """Helper function to get current user's permissions."""
    try:
        try:
            verify_jwt_in_request()
            current_user_id = get_jwt_identity()
        except Exception:
            return []
            
        if not current_user_id:
            return []
            
        return enhanced_permission_service.get_user_permissions(current_user_id)
        
    except Exception as e:
        logger.error(f"Error getting current user permissions: {e}")
        return []

def has_permission(permission: str, 
                  resource_context: Optional[ResourceContext] = None) -> bool:
    """Helper function to check permission programmatically."""
    try:
        try:
            verify_jwt_in_request()
            current_user_id = get_jwt_identity()
        except Exception:
            return False
            
        if not current_user_id:
            return False
            
        return enhanced_permission_service.user_has_permission(
            user_id=current_user_id,
            permission=permission,
            resource_context=resource_context
        )
        
    except Exception as e:
        logger.error(f"Error checking permission programmatically: {e}")
        return False

# Backward compatibility aliases
require_permission = require_permission_v2
require_permission_or_ownership = require_permission_or_ownership_v2 