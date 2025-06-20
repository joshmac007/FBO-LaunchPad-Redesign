#!/usr/bin/env python3
"""
Enhanced Permission Service for Phase 4
Advanced authorization capabilities with resource-specific permissions,
permission groups, and caching.
"""

import time
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple, Any, Set, Union
from dataclasses import dataclass, field
from enum import Enum
try:
    import redis
    REDIS_AVAILABLE = True
except ImportError:
    REDIS_AVAILABLE = False
    redis = None

from ..models.user import User
from ..models.role import Role
from ..models.permission import Permission
from ..models.permission_group import PermissionGroup, PermissionGroupMembership, RolePermissionGroup
from ..models.user_permission import UserPermission
from ..extensions import db

# Performance monitor imports - make optional too
try:
    from .permission_performance_monitor import get_permission_performance_monitor
    PERFORMANCE_MONITOR_AVAILABLE = True
except ImportError:
    PERFORMANCE_MONITOR_AVAILABLE = False
    get_permission_performance_monitor = None

# Redis cache imports - make optional
try:
    from .redis_permission_cache import get_redis_permission_cache
    REDIS_CACHE_AVAILABLE = True
except ImportError:
    REDIS_CACHE_AVAILABLE = False
    get_redis_permission_cache = None

logger = logging.getLogger(__name__)

class CacheLevel(Enum):
    """Cache levels for permission data."""
    MEMORY = "memory"    # L1: In-memory session cache
    REDIS = "redis"      # L2: Redis cache
    DATABASE = "database" # L3: Database

@dataclass
class ResourceContext:
    """Enhanced resource context for permission checking."""
    resource_type: str
    resource_id: Optional[Union[str, int]] = None
    id_param: Optional[str] = None
    ownership_check: bool = False
    department_scope: bool = False
    cascade_permissions: List[str] = field(default_factory=list)
    custom_validators: List[callable] = field(default_factory=list)
    
    def __post_init__(self):
        """Validate resource context configuration."""
        if self.ownership_check and not self.resource_id and not self.id_param:
            raise ValueError("Ownership check requires resource_id or id_param")

class PermissionService:
    """
    Enhanced Permission Service with advanced capabilities:
    - Resource-specific permissions
    - Database-backed permission groups  
    - Multi-layer caching with Redis
    - Performance monitoring
    """
    
    def __init__(self):
        """Initialize the Enhanced Permission Service."""
        self.memory_cache = {}
        self.cache_timestamps = {}
        self.memory_cache_size = 1000
        self.memory_cache_ttl = 300  # 5 minutes
        
        # Initialize Redis cache if available
        self.redis_cache = None
        if REDIS_CACHE_AVAILABLE and get_redis_permission_cache:
            try:
                self.redis_cache = get_redis_permission_cache()
            except Exception as e:
                logger.warning(f"Failed to initialize Redis cache: {e}")
        
        # Initialize optional services
        self.redis_available = REDIS_CACHE_AVAILABLE and self.redis_cache is not None
        self.performance_available = PERFORMANCE_MONITOR_AVAILABLE
        
        logger.info(f"Enhanced Permission Service initialized - Redis: {self.redis_available}, Performance: {self.performance_available}")
    
    def _init_services(self):
        """Initialize external services (Redis, Performance Monitor)."""
        # This method is kept for compatibility but services are now handled globally
        pass
    
    def get_permission_groups(self, include_inactive=False) -> Dict[str, PermissionGroup]:
        """Get all permission groups from database."""
        try:
            query = PermissionGroup.query
            if not include_inactive:
                query = query.filter_by(is_active=True)
                
            groups = query.all()
            return {group.name: group for group in groups}
            
        except Exception as e:
            logger.error(f"Error loading permission groups from database: {e}")
            return {}
    
    def get_user_permission_groups(self, user_id: int) -> List[PermissionGroup]:
        """Get permission groups assigned to a user through their roles."""
        user = User.query.get(user_id)
        if not user:
            logger.warning(f"get_user_permission_groups: User ID {user_id} not found.")
            return []

        logger.info(f"get_user_permission_groups: Processing user ID {user_id} ({user.email})")
        groups = []
        user_roles = user.roles # Assuming user.roles is already a list of Role objects
        logger.info(f"get_user_permission_groups: User has roles: {[role.name for role in user_roles]}")

        for role in user_roles:
            logger.info(f"get_user_permission_groups: Checking role '{role.name}' (ID: {role.id})")
            
            # Accessing the relationship directly
            active_role_group_assignments = [
                rpg for rpg in role.role_permission_groups 
                if rpg.is_active and rpg.group and rpg.group.is_active
            ]
            logger.info(f"get_user_permission_groups: Role '{role.name}' has {len(active_role_group_assignments)} active group assignments.")

            for rpg_assignment in active_role_group_assignments:
                group = rpg_assignment.group
                logger.info(f"get_user_permission_groups: Role '{role.name}' is assigned to active group '{group.name}' (ID: {group.id})")
                if group not in groups:
                    groups.append(group)
                else:
                    logger.info(f"get_user_permission_groups: Group '{group.name}' already added.")
        
        logger.info(f"get_user_permission_groups: Found {len(groups)} unique active groups for user {user_id}: {[g.name for g in groups]}")
        return groups
    
    def user_has_permission(self, user_id: int, permission: str, 
                          resource_context: Optional[ResourceContext] = None) -> bool:
        """
        Enhanced permission checking with resource context support and performance monitoring.
        
        Args:
            user_id: ID of the user to check
            permission: Permission name to check
            resource_context: Optional resource-specific context
            
        Returns:
            bool: True if user has permission, False otherwise
        """
        start_time = time.time()
        result = False
        cache_hit = False
        
        try:
            # Step 1: Check cache layers
            cache_key = self._generate_cache_key(user_id, permission, resource_context)
            
            # L1 Cache: Memory
            cached_result = self._get_from_memory_cache(cache_key)
            if cached_result is not None:
                logger.debug(f"Permission check cache hit (L1) for user {user_id}, permission {permission}")
                result = cached_result
                cache_hit = True
            else:
                # L2 Cache: Redis (only if available)
                if REDIS_CACHE_AVAILABLE and get_redis_permission_cache:
                    try:
                        redis_cache = get_redis_permission_cache()
                        cached_result = redis_cache.get(cache_key)
                        if cached_result is not None:
                            logger.debug(f"Permission check cache hit (L2) for user {user_id}, permission {permission}")
                            result = cached_result
                            cache_hit = True
                            # Store in L1 cache
                            self._store_in_memory_cache(cache_key, cached_result)
                    except Exception as e:
                        logger.warning(f"Redis cache error, falling back to database: {e}")
                
                # Step 2: Perform permission check if not cached
                if not cache_hit:
                    result = self._check_permission_with_context(user_id, permission, resource_context)
                    
                    # Step 3: Cache the result
                    self._store_in_memory_cache(cache_key, result)
                    if REDIS_CACHE_AVAILABLE and get_redis_permission_cache:
                        try:
                            redis_cache = get_redis_permission_cache()
                            redis_cache.set(cache_key, result, ttl=1800)  # 30 minutes
                        except Exception as e:
                            logger.warning(f"Failed to store in Redis cache: {e}")
            
            # Step 4: Record performance metrics (only if available)
            if PERFORMANCE_MONITOR_AVAILABLE and get_permission_performance_monitor:
                try:
                    monitor = get_permission_performance_monitor()
                    response_time_ms = (time.time() - start_time) * 1000
                    monitor.record_permission_check(
                        user_id=user_id,
                        permission=permission,
                        result=result,
                        response_time_ms=response_time_ms,
                        cache_hit=cache_hit
                    )
                except Exception as e:
                    logger.warning(f"Failed to record performance metrics: {e}")
            
            return result
            
        except Exception as e:
            logger.error(f"Error checking permission {permission} for user {user_id}: {e}")
            
            # Record failed check (only if available)
            if PERFORMANCE_MONITOR_AVAILABLE and get_permission_performance_monitor:
                try:
                    response_time_ms = (time.time() - start_time) * 1000
                    monitor = get_permission_performance_monitor()
                    monitor.record_permission_check(
                        user_id=user_id,
                        permission=permission,
                        result=False,
                        response_time_ms=response_time_ms,
                        cache_hit=False
                    )
                except Exception as e:
                    logger.warning(f"Failed to record error metrics: {e}")
            
            # Fallback to basic permission check
            return self._basic_permission_check(user_id, permission)
    
    def _check_permission_with_context(self, user_id: int, permission: str,
                                     resource_context: Optional[ResourceContext]) -> bool:
        """Perform detailed permission check with resource context."""
        
        # Get user and roles
        user = User.query.get(user_id)
        if not user:
            return False
            
        # Step 1: Check basic permission
        if not self._user_has_basic_permission(user, permission):
            return False
            
        # Step 2: Apply resource context if provided
        if resource_context:
            return self._check_resource_context(user, permission, resource_context)
            
        return True
        
    def _user_has_basic_permission(self, user: User, permission: str) -> bool:
        """Check if user has basic permission through roles and groups (Golden Path only)."""
        try:
            # GOLDEN PATH ENFORCEMENT: User → Role → PermissionGroup → Permission
            # Check permissions ONLY through permission groups, no direct role permissions
            for role in user.roles:
                if self._role_has_permission_through_groups(role, permission):
                    return True
                    
            return False
            
        except Exception as e:
            logger.error(f"Error checking basic permission {permission} for user {user.id}: {e}")
            return False
    
    def _role_has_permission_through_groups(self, role: Role, permission: str) -> bool:
        """Check if role has permission through permission groups."""
        try:
            # Get groups assigned to this role
            role_groups = RolePermissionGroup.query.filter_by(
                role_id=role.id,
                is_active=True
            ).join(PermissionGroup).filter_by(is_active=True).all()
            
            for role_group in role_groups:
                group = role_group.group
                if group.has_permission(permission):
                    logger.debug(f"Permission '{permission}' found in group '{group.name}' for role '{role.name}'")
                    return True
                    
            return False
            
        except Exception as e:
            logger.error(f"Error checking group permissions for role {role.id}: {e}")
            return False
    
    def _check_resource_context(self, user: User, permission: str, 
                              context: ResourceContext) -> bool:
        """Check resource-specific permission context."""
        try:
            # Step 1: Ownership check
            if context.ownership_check:
                if not self._check_resource_ownership(user, context):
                    logger.debug(f"Resource ownership check failed for user {user.id}")
                    return False
                    
            # Step 2: Department scope check
            if context.department_scope:
                if not self._check_department_scope(user, context):
                    logger.debug(f"Department scope check failed for user {user.id}")
                    return False
                    
            # Step 3: Custom validators
            for validator in context.custom_validators:
                if not validator(user, context):
                    logger.debug(f"Custom validator failed for user {user.id}")
                    return False
                    
            # Step 4: Cascade permissions
            if context.cascade_permissions:
                for cascade_perm in context.cascade_permissions:
                    if not self._user_has_basic_permission(user, cascade_perm):
                        logger.debug(f"Cascade permission {cascade_perm} failed for user {user.id}")
                        return False
                        
            return True
            
        except Exception as e:
            logger.error(f"Error checking resource context for user {user.id}: {e}")
            return False
    
    def _check_resource_ownership(self, user: User, context: ResourceContext) -> bool:
        """Check if user owns or is assigned to the resource."""
        try:
            # Import here to avoid circular imports
            from ..models.fuel_order import FuelOrder
            from ..models.aircraft import Aircraft
            from ..models.customer import Customer
            
            resource_id = context.resource_id
            
            if context.resource_type == 'fuel_order':
                order = FuelOrder.query.get(resource_id)
                if order:
                    # Check if user is assigned to the order (LST assignment)
                    # Note: FuelOrder doesn't have created_by_id field
                    return order.assigned_lst_user_id == user.id
                           
            elif context.resource_type == 'user':
                # Users can always access their own profile
                return resource_id == user.id
                
            elif context.resource_type == 'aircraft':
                aircraft = Aircraft.query.get(resource_id)
                if aircraft:
                    # Check if user has access to this customer's aircraft
                    # Note: This would need to be implemented based on your user-customer relationship
                    return True  # Placeholder
                    
            return False
            
        except Exception as e:
            logger.error(f"Error checking resource ownership: {e}")
            return False
    
    def _check_department_scope(self, user: User, context: ResourceContext) -> bool:
        """Check if resource is within user's department scope."""
        # Placeholder for department-based access control
        # Will be implemented based on user department and resource department
        return True
    
    def _basic_permission_check(self, user_id: int, permission: str) -> bool:
        """Fallback to basic permission check without enhancements (Golden Path only)."""
        try:
            user = User.query.get(user_id)
            if not user:
                return False
                
            # GOLDEN PATH ENFORCEMENT: User → Role → PermissionGroup → Permission
            # Check permissions ONLY through permission groups, no direct role permissions
            for role in user.roles:
                if self._role_has_permission_through_groups(role, permission):
                    return True
                    
            return False
            
        except Exception as e:
            logger.error(f"Error in basic permission check: {e}")
            return False
    
    def _generate_cache_key(self, user_id: int, permission: str, 
                          resource_context: Optional[ResourceContext]) -> str:
        """Generate cache key for permission check."""
        if self.redis_cache:
            return self.redis_cache.generate_cache_key(
                user_id=user_id,
                permission=permission,
                resource_context=resource_context.__dict__ if resource_context else None
            )
        else:
            # Fallback cache key generation
            base_key = f"perm:{user_id}:{permission}"
            if resource_context:
                context_hash = hash(f"{resource_context.resource_type}:{resource_context.resource_id}")
                base_key += f":{context_hash}"
            return base_key
    
    def _get_from_memory_cache(self, key: str) -> Optional[bool]:
        """Get permission result from memory cache."""
        try:
            cache_entry = self.memory_cache.get(key)
            if cache_entry and cache_entry['expires'] > datetime.now():
                return cache_entry['value']
        except Exception as e:
            logger.warning(f"Memory cache read error for key {key}: {e}")
        return None
    
    def _store_in_memory_cache(self, key: str, value: bool):
        """Store permission result in memory cache."""
        try:
            expires = datetime.now() + timedelta(seconds=self.memory_cache_ttl)
            self.memory_cache[key] = {'value': value, 'expires': expires}
        except Exception as e:
            logger.warning(f"Memory cache write error for key {key}: {e}")
    
    def invalidate_user_cache(self, user_id: int):
        """Invalidate all cached permissions for a user."""
        try:
            # Clear memory cache
            keys_to_remove = [k for k in self.memory_cache.keys() if f":{user_id}:" in k]
            for key in keys_to_remove:
                del self.memory_cache[key]
                
            # Clear Redis cache
            if self.redis_cache:
                self.redis_cache.invalidate_user_permissions(user_id)
                    
            logger.info(f"Cache invalidated for user {user_id}")
            
        except Exception as e:
            logger.error(f"Error invalidating cache for user {user_id}: {e}")
    
    def invalidate_role_cache(self, role_id: int):
        """Invalidate cache for all users with a specific role."""
        try:
            if self.redis_cache:
                self.redis_cache.invalidate_role_permissions(role_id)
            else:
                # Fallback: invalidate all memory cache entries
                role = Role.query.get(role_id)
                if role:
                    for user in role.users:
                        self.invalidate_user_cache(user.id)
                        
            logger.info(f"Cache invalidated for role {role_id}")
            
        except Exception as e:
            logger.error(f"Error invalidating cache for role {role_id}: {e}")
    
    def invalidate_group_cache(self, group_id: int):
        """Invalidate cache for all users affected by a permission group change."""
        try:
            if self.redis_cache:
                self.redis_cache.invalidate_permission_group(group_id)
            else:
                # Fallback: manual invalidation
                group = PermissionGroup.query.get(group_id)
                if group:
                    affected_users = set()
                    
                    # Get all roles assigned to this group
                    role_groups = RolePermissionGroup.query.filter_by(group_id=group_id).all()
                    for role_group in role_groups:
                        for user in role_group.role.users:
                            affected_users.add(user.id)
                    
                    # Invalidate cache for each affected user
                    for user_id in affected_users:
                        self.invalidate_user_cache(user_id)
                        
            logger.info(f"Cache invalidated for group {group_id}")
            
        except Exception as e:
            logger.error(f"Error invalidating cache for group {group_id}: {e}")
    
    def get_user_permissions(self, user_id: int, include_groups=True) -> List[str]:
        """Get all permissions for a user (cached)."""
        cache_key = f"user_perms:{user_id}:{include_groups}"
        
        # L1 Cache Check
        cached_perms = self._get_from_memory_cache(cache_key)
        if cached_perms is not None:
            return cached_perms

        # L2 Redis Cache Check
        if self.redis_cache:
            cached_perms = self.redis_cache.get(cache_key)
            if cached_perms is not None:
                self._store_in_memory_cache(cache_key, cached_perms)
                return cached_perms

        user = self._get_user(user_id)
        if not user:
            logger.warning(f"get_user_permissions: User ID {user_id} not found during permission fetch.")
            return []

        logger.info(f"get_user_permissions: Starting permission fetch for user ID {user_id} ({user.email})")
        permissions = set()

        # Part 1: Legacy role_permissions table has been removed - Golden Path architecture only
        logger.info(f"get_user_permissions: Legacy role.permissions have been removed - using permission groups only.")


        # Part 2: Permissions from Permission Groups
        if include_groups:
            logger.info(f"get_user_permissions: Fetching permission groups for user {user_id}...")
            user_groups = self.get_user_permission_groups(user_id) # This now has logging
            
            if not user_groups:
                logger.warning(f"get_user_permissions: No active permission groups found for user {user_id}.")
            else:
                logger.info(f"get_user_permissions: User {user_id} is in groups: {[g.name for g in user_groups]}. Processing permissions for these groups.")
                for group in user_groups:
                    logger.info(f"get_user_permissions: Getting all permissions for group '{group.name}' (ID: {group.id})")
                    # group.get_all_permissions() returns a set of permission NAMES (strings)
                    group_permission_names = group.get_all_permissions() 
                    if group_permission_names:
                        logger.info(f"get_user_permissions: Group '{group.name}' provides permissions: {list(group_permission_names)}")
                        permissions.update(group_permission_names)
                    else:
                        logger.info(f"get_user_permissions: Group '{group.name}' provides no permissions directly or via hierarchy.")
        else:
            logger.info(f"get_user_permissions: Skipping group permissions fetch as include_groups is False.")

        # Part 3: Direct UserPermission assignments (UserPermission model)
        logger.info(f"get_user_permissions: Checking direct UserPermission assignments for user {user_id}...")
        direct_assignments = UserPermission.query.filter_by(user_id=user_id, is_active=True).all()
        if direct_assignments:
            for assignment in direct_assignments:
                if assignment.permission:
                    logger.info(f"get_user_permissions: User {user_id} has direct permission '{assignment.permission.name}'")
                    permissions.add(assignment.permission.name)
        else:
            logger.info(f"get_user_permissions: No active direct UserPermission assignments found for user {user_id}.")


        perm_list = sorted(list(permissions))
        logger.info(f"get_user_permissions: Final aggregated permissions for user {user_id}: {perm_list}")
        
        # Cache the result
        self._store_in_memory_cache(cache_key, perm_list)
        if self.redis_cache:
            self.redis_cache.set(cache_key, perm_list, ttl=1800)  # 30 minutes

        return perm_list
    
    def get_user_permission_summary(self, user_id: int) -> Dict[str, Any]:
        """Get comprehensive permission summary for a user."""
        try:
            user = User.query.get(user_id)
            if not user:
                return {}
            
            # Direct role permissions have been removed - using permission groups only
            direct_permissions = set()
            
            # Get group permissions
            group_permissions = {}
            user_groups = self.get_user_permission_groups(user_id)
            for group in user_groups:
                group_perms = group.get_all_permissions()
                group_permissions[group.name] = {
                    'display_name': group.display_name,
                    'permissions': group_perms,
                    'hierarchy_path': group.get_hierarchy_path()
                }
            
            # Get all permissions (combined)
            all_permissions = set(direct_permissions)
            for group_name, group_data in group_permissions.items():
                all_permissions.update(group_data['permissions'])
            
            return {
                'user_id': user_id,
                'username': user.username,
                'roles': [role.name for role in user.roles],
                'direct_permissions': list(direct_permissions),
                'group_permissions': group_permissions,
                'all_permissions': list(all_permissions),
                'total_permissions': len(all_permissions),
                'last_updated': datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Error getting permission summary for user {user_id}: {e}")
            return {}
    
    def get_cache_stats(self) -> Dict[str, Any]:
        """Get cache statistics from both memory and Redis caches."""
        stats = {
            'memory_cache': {
                'entries': len(self.memory_cache),
                'max_size': self.memory_cache_size,
                'usage_percent': round((len(self.memory_cache) / self.memory_cache_size) * 100, 2)
            },
            'redis_cache': {
                'available': REDIS_CACHE_AVAILABLE,
                'entries': 0,
                'health': 'unavailable'
            }
        }
        
        if REDIS_CACHE_AVAILABLE and get_redis_permission_cache:
            try:
                redis_stats = get_redis_permission_cache().get_stats()
                stats['redis_cache'].update(redis_stats)
                stats['redis_cache']['health'] = 'healthy'
            except Exception as e:
                logger.warning(f"Failed to get Redis cache stats: {e}")
                stats['redis_cache']['health'] = 'error'
                
        return stats
    
    def get_performance_stats(self) -> Dict[str, Any]:
        """Get performance statistics."""
        if PERFORMANCE_MONITOR_AVAILABLE and get_permission_performance_monitor:
            try:
                return get_permission_performance_monitor().get_current_stats()
            except Exception as e:
                logger.warning(f"Failed to get performance stats: {e}")
                
        return {
            'monitoring_available': False,
            'total_checks': 0,
            'cache_hits': 0,
            'cache_misses': 0
        }
    
    def invalidate_cache(self, user_id: Optional[int] = None, role_id: Optional[int] = None, 
                        permission_group_id: Optional[int] = None) -> bool:
        """Invalidate cache entries."""
        try:
            # Always clear memory cache
            if user_id:
                # Clear specific user caches
                keys_to_remove = [key for key in self.memory_cache.keys() if f"user_{user_id}" in key]
                for key in keys_to_remove:
                    del self.memory_cache[key]
            else:
                # Clear all memory cache
                self.memory_cache.clear()
            
            # Clear Redis cache if available
            if REDIS_CACHE_AVAILABLE and get_redis_permission_cache:
                try:
                    if user_id:
                        get_redis_permission_cache().invalidate_user_cache(user_id)
                    elif role_id:
                        get_redis_permission_cache().invalidate_role_cache(role_id)
                    elif permission_group_id:
                        get_redis_permission_cache().invalidate_group_cache(permission_group_id)
                    else:
                        get_redis_permission_cache().clear_all()
                except Exception as e:
                    logger.warning(f"Failed to invalidate Redis cache: {e}")
                    
            logger.info(f"Cache invalidated - user_id: {user_id}, role_id: {role_id}, group_id: {permission_group_id}")
            return True
            
        except Exception as e:
            logger.error(f"Error invalidating cache: {e}")
            return False
    
    def _get_user(self, user_id: int) -> Optional[User]:
        """Helper method to get user by ID."""
        try:
            return User.query.get(user_id)
        except Exception as e:
            logger.error(f"Error getting user {user_id}: {e}")
            return None
    
    def _get_current_timestamp(self) -> str:
        """Helper method to get current timestamp."""
        return datetime.now().isoformat()
    
    # Legacy compatibility methods
    @classmethod
    def check_user_permission_legacy(cls, user_id: int, permission_name: str, 
                          resource_type: str = None, resource_id: str = None) -> bool:
        """
        Legacy compatibility classmethod for user_has_permission.
        Maps to the new instance method user_has_permission.
        """
        # Get the global service instance
        service = enhanced_permission_service
        
        # Create resource context if needed
        resource_context = None
        if resource_type or resource_id:
            resource_context = ResourceContext(
                resource_type=resource_type or 'unknown',
                resource_id=resource_id,
                ownership_check=True if resource_id else False
            )
        
        # Call the instance method directly - bypass name collision by calling the core logic
        return service._check_permission_with_context(user_id, permission_name, resource_context)
    
    @classmethod
    def get_all_permissions(cls) -> Tuple[List[Permission], str, int]:
        """
        Legacy compatibility method for get_all_permissions.
        Returns all permissions from the database.
        """
        try:
            permissions = Permission.query.filter_by(is_active=True).all()
            return permissions, "Permissions retrieved successfully", 200
        except Exception as e:
            logger.error(f"Error getting all permissions: {e}")
            return [], f"Error retrieving permissions: {str(e)}", 500
    
    @classmethod 
    def get_user_effective_permissions(cls, user_id: int, include_resource_context: bool = False) -> Dict[str, any]:
        """
        Legacy compatibility method for get_user_effective_permissions.
        Maps to the new get_user_permissions method.
        """
        service = enhanced_permission_service
        permissions_list = service.get_user_permissions(user_id, include_groups=True)
        
        # Convert list format to legacy dict format
        effective_permissions = {}
        for perm_name in permissions_list:
            effective_permissions[perm_name] = {
                'permission': perm_name,
                'resource_type': 'global',
                'scope': 'global',
                'source': 'enhanced_service'
            }
        
        return effective_permissions

# Global instance
enhanced_permission_service = PermissionService() 