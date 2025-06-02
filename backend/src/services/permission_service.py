from typing import Tuple, List, Optional, Dict, Set
from datetime import datetime
from flask import current_app
from sqlalchemy.orm import selectinload
from sqlalchemy import and_, or_

from ..extensions import db
from ..models.user import User
from ..models.permission import Permission
from ..models.permission_group import PermissionGroup
from ..models.user_permission import UserPermission
from ..models.role import Role
from ..models.role_permission import role_permissions

class PermissionService:
    """
    Enhanced permission service for granular permission management.
    Handles direct user permissions, permission groups, and resource-specific permissions.
    """
    
    # Cache for user permissions to improve performance
    _permission_cache = {}
    _cache_timeout = 300  # 5 minutes
    
    @classmethod
    def get_user_effective_permissions(cls, user_id: int, include_resource_context: bool = False) -> Dict[str, any]:
        """
        Get all effective permissions for a user from all sources:
        1. Direct user permissions
        2. Permission groups
        3. Legacy role permissions (during transition)
        
        Args:
            user_id (int): User ID
            include_resource_context (bool): Whether to include resource-specific permissions
            
        Returns:
            Dict containing permission names and their contexts
        """
        cache_key = f"user_permissions_{user_id}_{include_resource_context}"
        
        # Check cache first
        if cache_key in cls._permission_cache:
            cached_data, timestamp = cls._permission_cache[cache_key]
            if (datetime.utcnow() - timestamp).seconds < cls._cache_timeout:
                return cached_data
        
        user = User.query.options(
            selectinload(User.direct_permissions),
            selectinload(User.permission_groups),
            selectinload(User.roles)
        ).get(user_id)
        
        if not user:
            return {}
        
        effective_permissions = {}
        
        # 1. Get direct user permissions
        direct_perms = cls._get_direct_user_permissions(user, include_resource_context)
        effective_permissions.update(direct_perms)
        
        # 2. Get permissions from permission groups
        group_perms = cls._get_group_permissions(user, include_resource_context)
        effective_permissions.update(group_perms)
        
        # 3. Get legacy role permissions (for backward compatibility)
        role_perms = cls._get_legacy_role_permissions(user)
        effective_permissions.update(role_perms)
        
        # Cache the result
        cls._permission_cache[cache_key] = (effective_permissions, datetime.utcnow())
        
        return effective_permissions
    
    @classmethod
    def _get_direct_user_permissions(cls, user: User, include_resource_context: bool) -> Dict[str, any]:
        """Get permissions directly assigned to the user."""
        permissions = {}
        
        for user_perm in user.direct_permissions:
            if not user_perm.is_valid():
                continue
                
            perm = user_perm.permission
            if not perm or not perm.is_active:
                continue
            
            perm_key = perm.name
            
            if include_resource_context and (user_perm.resource_type or user_perm.resource_id):
                # Resource-specific permission
                resource_key = f"{perm.name}:{user_perm.resource_type or 'global'}:{user_perm.resource_id or 'any'}"
                permissions[resource_key] = {
                    'permission': perm.name,
                    'resource_type': user_perm.resource_type,
                    'resource_id': user_perm.resource_id,
                    'scope': perm.scope,
                    'source': 'direct',
                    'granted_at': user_perm.granted_at.isoformat() if user_perm.granted_at else None
                }
            else:
                # Global permission
                permissions[perm_key] = {
                    'permission': perm.name,
                    'resource_type': perm.resource_type,
                    'scope': perm.scope,
                    'source': 'direct',
                    'granted_at': user_perm.granted_at.isoformat() if user_perm.granted_at else None
                }
        
        return permissions
    
    @classmethod
    def _get_group_permissions(cls, user: User, include_resource_context: bool) -> Dict[str, any]:
        """Get permissions from user's permission groups."""
        permissions = {}
        
        for group in user.permission_groups:
            if not group.is_active:
                continue
                
            # Get all permissions including inherited ones
            group_permissions = group.get_all_permissions(include_inherited=True)
            
            for perm in group_permissions:
                if not perm.is_active:
                    continue
                
                perm_key = perm.name
                
                # For group permissions, we don't have resource-specific context
                # unless the permission itself requires it
                if perm_key not in permissions:
                    permissions[perm_key] = {
                        'permission': perm.name,
                        'resource_type': perm.resource_type,
                        'scope': perm.scope,
                        'source': f'group:{group.name}',
                        'group_id': group.id
                    }
        
        return permissions
    
    @classmethod
    def _get_legacy_role_permissions(cls, user: User) -> Dict[str, any]:
        """Get permissions from legacy roles (for backward compatibility)."""
        permissions = {}
        
        for role in user.roles:
            for perm in role.permissions:
                if not perm or not perm.is_active:
                    continue
                
                perm_key = perm.name
                
                if perm_key not in permissions:
                    permissions[perm_key] = {
                        'permission': perm.name,
                        'resource_type': perm.resource_type,
                        'scope': perm.scope,
                        'source': f'role:{role.name}',
                        'role_id': role.id
                    }
        
        return permissions
    
    @classmethod
    def user_has_permission(cls, user_id: int, permission_name: str, 
                          resource_type: str = None, resource_id: str = None) -> bool:
        """
        Check if a user has a specific permission, optionally for a specific resource.
        
        Args:
            user_id (int): User ID
            permission_name (str): Permission name to check
            resource_type (str): Optional resource type (e.g., 'fuel_order')
            resource_id (str): Optional specific resource ID or 'own'
            
        Returns:
            bool: True if user has the permission
        """
        effective_permissions = cls.get_user_effective_permissions(user_id, include_resource_context=True)
        
        # Check for exact permission match
        if permission_name in effective_permissions:
            perm_data = effective_permissions[permission_name]
            
            # If no resource context required, permission granted
            if not resource_type and not resource_id:
                return True
            
            # Check resource-specific permissions
            if resource_type:
                perm_resource_type = perm_data.get('resource_type')
                perm_scope = perm_data.get('scope')
                
                # Global permissions (no resource_type) grant access to all resources
                if not perm_resource_type or perm_resource_type == 'global':
                    return True
                
                # Resource type must match
                if perm_resource_type != resource_type:
                    return False
                
                # Check scope
                if perm_scope == 'any':
                    return True
                elif perm_scope == 'own' and resource_id:
                    # Need to check if the resource belongs to the user
                    return cls._check_resource_ownership(user_id, resource_type, resource_id)
        
        # Check for resource-specific permission entries
        if resource_type and resource_id:
            resource_key = f"{permission_name}:{resource_type}:{resource_id}"
            if resource_key in effective_permissions:
                return True
            
            # Check for wildcard resource permissions
            wildcard_key = f"{permission_name}:{resource_type}:any"
            if wildcard_key in effective_permissions:
                return True
        
        return False
    
    @classmethod
    def _check_resource_ownership(cls, user_id: int, resource_type: str, resource_id: str) -> bool:
        """
        Check if a user owns a specific resource.
        This is a simplified implementation - in practice, you'd check the actual resource tables.
        """
        if resource_id == 'own':
            return True
        
        # Map resource types to their ownership checks
        ownership_checks = {
            'fuel_order': cls._check_fuel_order_ownership,
            'user': cls._check_user_ownership,
            'aircraft': cls._check_aircraft_ownership,
        }
        
        check_func = ownership_checks.get(resource_type)
        if check_func:
            return check_func(user_id, resource_id)
        
        return False
    
    @classmethod
    def _check_fuel_order_ownership(cls, user_id: int, resource_id: str) -> bool:
        """Check if user owns/created a fuel order."""
        from ..models.fuel_order import FuelOrder
        
        try:
            resource_id_int = int(resource_id)
            fuel_order = FuelOrder.query.filter_by(id=resource_id_int).first()
            return fuel_order and fuel_order.created_by_user_id == user_id
        except (ValueError, TypeError):
            return False
    
    @classmethod
    def _check_user_ownership(cls, user_id: int, resource_id: str) -> bool:
        """Check if user is accessing their own profile."""
        try:
            resource_id_int = int(resource_id)
            return user_id == resource_id_int
        except (ValueError, TypeError):
            return False
    
    @classmethod
    def _check_aircraft_ownership(cls, user_id: int, resource_id: str) -> bool:
        """Check if user owns an aircraft (simplified - would need actual ownership model)."""
        # This would need to be implemented based on your aircraft ownership model
        return False
    
    @classmethod
    def grant_direct_permission(cls, user_id: int, permission_id: int, 
                              granted_by_user_id: int, resource_type: str = None, 
                              resource_id: str = None, reason: str = None,
                              expires_at: datetime = None) -> Tuple[bool, str]:
        """
        Grant a direct permission to a user.
        
        Returns:
            Tuple[bool, str]: (success, message)
        """
        try:
            # Check if permission already exists
            existing = UserPermission.query.filter_by(
                user_id=user_id,
                permission_id=permission_id,
                resource_type=resource_type,
                resource_id=resource_id,
                is_active=True
            ).first()
            
            if existing:
                return False, "Permission already granted"
            
            # Create new permission assignment
            user_permission = UserPermission(
                user_id=user_id,
                permission_id=permission_id,
                granted_by_user_id=granted_by_user_id,
                resource_type=resource_type,
                resource_id=resource_id,
                reason=reason,
                expires_at=expires_at
            )
            
            db.session.add(user_permission)
            db.session.commit()
            
            # Clear cache for this user
            cls._clear_user_cache(user_id)
            
            return True, "Permission granted successfully"
            
        except Exception as e:
            db.session.rollback()
            current_app.logger.error(f"Error granting permission: {str(e)}")
            return False, f"Error granting permission: {str(e)}"
    
    @classmethod
    def revoke_direct_permission(cls, user_id: int, permission_id: int,
                               revoked_by_user_id: int, resource_type: str = None,
                               resource_id: str = None, reason: str = None) -> Tuple[bool, str]:
        """
        Revoke a direct permission from a user.
        
        Returns:
            Tuple[bool, str]: (success, message)
        """
        try:
            user_permission = UserPermission.query.filter_by(
                user_id=user_id,
                permission_id=permission_id,
                resource_type=resource_type,
                resource_id=resource_id,
                is_active=True
            ).first()
            
            if not user_permission:
                return False, "Permission not found or already revoked"
            
            user_permission.revoke(revoked_by_user_id, reason)
            db.session.commit()
            
            # Clear cache for this user
            cls._clear_user_cache(user_id)
            
            return True, "Permission revoked successfully"
            
        except Exception as e:
            db.session.rollback()
            current_app.logger.error(f"Error revoking permission: {str(e)}")
            return False, f"Error revoking permission: {str(e)}"
    
    @classmethod
    def _clear_user_cache(cls, user_id: int):
        """Clear cached permissions for a specific user."""
        keys_to_remove = [key for key in cls._permission_cache.keys() 
                         if key.startswith(f"user_permissions_{user_id}_")]
        for key in keys_to_remove:
            del cls._permission_cache[key]
    
    @classmethod
    def clear_all_cache(cls):
        """Clear all cached permissions."""
        cls._permission_cache.clear()
    
    @classmethod
    def get_permission_summary(cls, user_id: int) -> Dict[str, any]:
        """
        Get a summary of user's permissions organized by source.
        
        Returns:
            Dict with permission breakdown by source
        """
        effective_permissions = cls.get_user_effective_permissions(user_id, include_resource_context=True)
        
        summary = {
            'total_permissions': len(effective_permissions),
            'by_source': {
                'direct': [],
                'groups': [],
                'roles': []
            },
            'by_category': {},
            'resource_specific': []
        }
        
        for perm_key, perm_data in effective_permissions.items():
            source = perm_data.get('source', 'unknown')
            
            if source == 'direct':
                summary['by_source']['direct'].append(perm_data)
            elif source.startswith('group:'):
                summary['by_source']['groups'].append(perm_data)
            elif source.startswith('role:'):
                summary['by_source']['roles'].append(perm_data)
            
            # Check if it's resource-specific
            if perm_data.get('resource_type') or perm_data.get('resource_id'):
                summary['resource_specific'].append(perm_data)
        
        return summary 