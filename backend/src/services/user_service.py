from typing import Tuple, List, Optional, Dict, Any, Set
from flask import g, has_request_context # Import g and has_request_context
from datetime import datetime
from sqlalchemy.orm import selectinload
from sqlalchemy import and_, or_, func, case, distinct
from sqlalchemy.exc import IntegrityError

from ..models.user import User
from ..models.role import Role
from ..models.permission import Permission
from ..models.permission_group import PermissionGroup
from ..models.user_permission import UserPermission
from ..extensions import db
from ..services.permission_service import PermissionService


class UserService:
    """Service class for managing user-related operations."""

    @classmethod
    def get_users(cls, filters: Optional[Dict[str, Any]] = None) -> Tuple[Optional[List[User]], str, int]:
        """Retrieve users based on specified filters.

        Args:
            filters (Optional[Dict[str, Any]]): Optional dictionary of filter parameters.
                Supported filters:
                - role_ids (List[int]): Filter by role IDs
                - role (str): Filter by role name (case-insensitive)
                - is_active (bool): Filter by user active status

        Returns:
            Tuple[Optional[List[User]], str, int]: A tuple containing:
                - List of User objects if successful, None if error
                - Message describing the result
                - HTTP status code
        """
        try:
            # Initialize base query with eager loading of roles
            query = User.query

            if filters:
                # Handle role filter (string-based) - convert to role_ids
                role_filter = filters.get('role')
                role_ids = filters.get('role_ids')
                
                if role_filter and role_ids:
                    return None, "Cannot specify both 'role' and 'role_ids' filters", 400
                
                if role_filter:
                    # Convert role name to role_ids
                    role = Role.query.filter(func.lower(Role.name) == func.lower(role_filter)).first()
                    if not role:
                        return None, f"Role '{role_filter}' not found", 400
                    role_ids = [role.id]
                
                # Filter by role IDs
                if role_ids:
                    if not isinstance(role_ids, list):
                        return None, "Invalid role_ids format, must be a list", 400
                    # Join with roles and filter where role.id is in the provided list
                    query = query.join(User.roles).filter(Role.id.in_(role_ids))

                # Filter by active status
                is_active_filter = filters.get('is_active')
                if is_active_filter is not None:
                    is_active_bool = str(is_active_filter).lower() == 'true'
                    query = query.filter(User.is_active == is_active_bool)

            # Default sort by username ascending
            users = query.order_by(User.username.asc()).all()
            # --- Add Debugging ---
            from flask import current_app
            current_app.logger.info(f"DEBUG: UserService.get_users found {len(users)} users: {users}")
            # --- End Debugging ---
            return users, "Users retrieved successfully", 200

        except Exception as e:
            # Log the error here if you have a logger configured
            return None, f"Database error while retrieving users: {str(e)}", 500

    @classmethod
    def create_user(cls, data: Dict[str, Any]) -> Tuple[Optional[User], str, int]:
        """Create a new user.
        
        Args:
            data (Dict[str, Any]): Dictionary containing user data
                Required keys:
                - email (str): User's email address
                - password (str): User's password
                - role_ids (List[int]): List of role IDs to assign
                Optional keys:
                - name (str): User's name
                - is_active (bool): Whether user should be active (defaults to True)
                
        Returns:
            Tuple[Optional[User], str, int]: A tuple containing:
                - Created User object if successful, None if error
                - Message describing the result
                - HTTP status code
        """
        try:
            # Validate required fields
            if not all(key in data for key in ['email', 'password', 'role_ids']):
                return None, "Missing required fields: email, password, and role_ids are required", 400

            # Validate role_ids format
            role_ids = data['role_ids']
            if not isinstance(role_ids, list):
                return None, "Invalid role_ids format, must be a list", 400

            if not role_ids:  # Empty list check
                return None, "At least one role must be assigned", 400

            # Check if email already exists
            if User.query.filter_by(email=data['email']).first():
                return None, "Email already registered", 409

            # Fetch and validate roles
            roles = Role.query.filter(Role.id.in_(role_ids)).all()
            if len(roles) != len(set(role_ids)):
                found_ids = {role.id for role in roles}
                invalid_ids = set(role_ids) - found_ids
                return None, f"Invalid role IDs provided: {list(invalid_ids)}", 400

            # Create new user
            user = User(
                email=data['email'],
                username=data.get('name', data['email'].split('@')[0]),  # Default to email username
                is_active=data.get('is_active', True)  # Default to active
            )
            user.set_password(data['password'])
            user.roles = roles  # Assign roles

            db.session.add(user)
            db.session.commit()

            return user, "User created successfully", 201

        except Exception as e:
            db.session.rollback()
            # Add explicit logging
            from flask import current_app
            current_app.logger.error(f"Caught exception in create_user: {e}", exc_info=True) 
            return None, f"Error creating user: {str(e)}", 500

    @classmethod
    def update_user(cls, user_id: int, data: Dict[str, Any]) -> Tuple[Optional[User], str, int]:
        """Update an existing user.
        
        Args:
            user_id (int): ID of user to update
            data (Dict[str, Any]): Dictionary containing update data
                Supported keys:
                - name (str): User's name
                - email (str): User's email address
                - role_ids (List[int]): List of role IDs to assign
                - is_active (bool): User's active status
                - password (str): User's new password (optional)
                
        Returns:
            Tuple[Optional[User], str, int]: A tuple containing:
                - Updated User object if successful, None if error
                - Message describing the result
                - HTTP status code
        """
        try:
            user_to_update = User.query.get(user_id)
            if not user_to_update:
                return None, f"User with ID {user_id} not found", 404

            current_user = None
            if has_request_context() and hasattr(g, 'current_user'):
                current_user = g.current_user

            # Self-update prevention checks
            if current_user and current_user.id == user_to_update.id:
                if 'is_active' in data and not data['is_active']:
                    return None, "Cannot deactivate your own account.", 403
                # Prevent removing own MANAGE_USERS permission if it's the only way they have it
                if 'role_ids' in data:
                    new_role_ids = set(data['role_ids'])
                    # Check if user currently has MANAGE_USERS
                    has_manage_users_now = user_to_update.has_permission('manage_users')
                    # Simulate permissions with new roles
                    if has_manage_users_now:
                        roles_with_manage_users = Role.query.join(Role.permissions).filter(Permission.name == 'manage_users').all()
                        manage_users_role_ids = {role.id for role in roles_with_manage_users}
                        # If none of the new roles grant MANAGE_USERS, prevent update
                        if not new_role_ids.intersection(manage_users_role_ids):
                            return None, "Cannot remove your own manage_users permission.", 403

            # Update fields if provided
            if 'username' in data and data['username'] is not None:
                user_to_update.username = data['username']
            if 'name' in data and data['name'] is not None:
                user_to_update.name = data['name']
            
            # Handle email update with uniqueness check
            if 'email' in data and data['email'] != user_to_update.email:
                existing_user = User.query.filter(User.email == data['email'], User.id != user_to_update.id).first()
                if existing_user:
                    return None, f"Email '{data['email']}' is already registered to another user.", 409
                user_to_update.email = data['email']

            if 'role_ids' in data:
                role_ids = data['role_ids']
                if not isinstance(role_ids, list):
                    return None, "Invalid role_ids format, must be a list", 400

                if role_ids:  # If list is not empty
                    # Fetch and validate roles
                    roles = Role.query.filter(Role.id.in_(role_ids)).all()
                    if len(roles) != len(set(role_ids)):
                        found_ids = {role.id for role in roles}
                        invalid_ids = set(role_ids) - found_ids
                        return None, f"Invalid role IDs provided: {list(invalid_ids)}", 400
                    user_to_update.roles = roles
                else:
                    user_to_update.roles = []  # Clear all roles if empty list provided

            if 'is_active' in data:
                # Ensure this check doesn't conflict with the self-deactivation check above
                if not (current_user and current_user.id == user_to_update.id and not data['is_active']):
                     user_to_update.is_active = bool(data['is_active'])

            if 'password' in data:
                user_to_update.set_password(data['password'])

            db.session.commit()
            
            # Cache invalidation: If roles were updated, invalidate user's permission cache
            if 'role_ids' in data:
                PermissionService.invalidate_user_cache(user_to_update.id)
            
            return user_to_update, "User updated successfully", 200

        except Exception as e:
            db.session.rollback()
            # Add explicit logging if available
            # from flask import current_app
            # current_app.logger.error(f"Error updating user {user_id}: {e}", exc_info=True)
            return None, f"Error updating user: {str(e)}", 500

    @classmethod
    def delete_user(cls, user_id: int) -> Tuple[bool, str, int]:
        """Soft delete a user by setting is_active to False.
        
        Args:
            user_id (int): ID of user to delete
            
        Returns:
            Tuple[bool, str, int]: A tuple containing:
                - True if successful, False if error
                - Message describing the result
                - HTTP status code
        """
        try:
            user_to_delete = User.query.get(user_id)
            if not user_to_delete:
                return False, f"User with ID {user_id} not found", 404

            current_user = None
            if has_request_context() and hasattr(g, 'current_user'):
                current_user = g.current_user

            if current_user and current_user.id == user_to_delete.id:
                return False, "Cannot deactivate your own account using the delete operation. Use the update operation if you intend to change your active status.", 403

            user_to_delete.is_active = False
            db.session.commit()
            return True, "User deactivated successfully", 200

        except Exception as e:
            db.session.rollback()
            # Add explicit logging if available
            # from flask import current_app
            # current_app.logger.error(f"Error deactivating user {user_id}: {e}", exc_info=True)
            return False, f"Error deactivating user: {str(e)}", 500

    @classmethod
    def get_user_by_id(cls, user_id: int) -> Tuple[Optional[User], str, int]:
        """Get a user by ID.
        
        Args:
            user_id (int): ID of user to retrieve
            
        Returns:
            Tuple[Optional[User], str, int]: A tuple containing:
                - User object if found, None if not found
                - Message describing the result
                - HTTP status code
        """
        try:
            user = User.query.get(user_id)
            if not user:
                return None, f"User with ID {user_id} not found", 404
            return user, "User retrieved successfully", 200

        except Exception as e:
            return None, f"Error retrieving user: {str(e)}", 500

    @classmethod
    def create_user_with_permissions(cls, user_data: Dict, permission_groups: List[int] = None,
                                   direct_permissions: List[Dict] = None, 
                                   created_by_user_id: int = None) -> Tuple[Optional[User], str, int]:
        """
        Create a new user with permission groups and/or direct permissions.
        
        Args:
            user_data (Dict): Basic user information
            permission_groups (List[int]): List of permission group IDs to assign
            direct_permissions (List[Dict]): List of direct permission assignments
            created_by_user_id (int): ID of user creating this user
            
        Returns:
            Tuple[User, str, int]: (user_object, message, status_code)
        """
        try:
            # Validate required fields
            required_fields = ['username', 'email', 'password']
            for field in required_fields:
                if field not in user_data:
                    return None, f"Missing required field: {field}", 400
            
            # Check if username or email already exists
            existing_user = User.query.filter(
                or_(User.username == user_data['username'], 
                    User.email == user_data['email'])
            ).first()
            
            if existing_user:
                return None, "Username or email already exists", 409
            
            # Create the user
            user = User(
                username=user_data['username'],
                email=user_data['email'],
                name=user_data.get('name'),
                is_active=user_data.get('is_active', True)
            )
            user.set_password(user_data['password'])
            
            # Add LST-specific fields if provided
            lst_fields = ['employee_id', 'status', 'shift', 'certifications', 
                         'performance_rating', 'hire_date']
            for field in lst_fields:
                if field in user_data:
                    setattr(user, field, user_data[field])
            
            db.session.add(user)
            db.session.flush()  # Get user ID before committing
            
            # Assign permission groups if provided
            if permission_groups:
                groups = PermissionGroup.query.filter(
                    PermissionGroup.id.in_(permission_groups),
                    PermissionGroup.is_active == True
                ).all()
                
                if len(groups) != len(permission_groups):
                    found_ids = {g.id for g in groups}
                    missing_ids = set(permission_groups) - found_ids
                    return None, f"Some permission groups not found: {list(missing_ids)}", 400
                
                user.permission_groups = groups
            
            # Assign direct permissions if provided
            if direct_permissions:
                for perm_data in direct_permissions:
                    if 'permission_id' not in perm_data:
                        continue
                    
                    # Validate permission exists
                    permission = Permission.query.get(perm_data['permission_id'])
                    if not permission:
                        return None, f"Permission ID {perm_data['permission_id']} not found", 400
                    
                    # Create user permission assignment
                    user_perm = UserPermission(
                        user_id=user.id,
                        permission_id=perm_data['permission_id'],
                        granted_by_user_id=created_by_user_id,
                        resource_type=perm_data.get('resource_type'),
                        resource_id=perm_data.get('resource_id'),
                        reason=perm_data.get('reason', 'Initial user setup'),
                        expires_at=datetime.fromisoformat(perm_data['expires_at']) if perm_data.get('expires_at') else None
                    )
                    db.session.add(user_perm)
            
            db.session.commit()
            
            return user, "User created successfully", 201
            
        except Exception as e:
            db.session.rollback()
            from flask import current_app
            current_app.logger.error(f"Error creating user: {str(e)}")
            return None, f"Failed to create user: {str(e)}", 500

    @classmethod
    def update_user_permissions(cls, user_id: int, permission_groups: List[int] = None,
                              add_direct_permissions: List[Dict] = None,
                              remove_direct_permissions: List[Dict] = None,
                              updated_by_user_id: int = None) -> Tuple[bool, str, int]:
        """
        Update user's permission groups and direct permissions.
        
        Args:
            user_id (int): User ID to update
            permission_groups (List[int]): New permission groups (replaces existing)
            add_direct_permissions (List[Dict]): Direct permissions to add
            remove_direct_permissions (List[Dict]): Direct permissions to remove
            updated_by_user_id (int): ID of user making the changes
            
        Returns:
            Tuple[bool, str, int]: (success, message, status_code)
        """
        try:
            user = User.query.get(user_id)
            if not user:
                return False, "User not found", 404
            
            # Update permission groups if provided
            if permission_groups is not None:
                if permission_groups:
                    groups = PermissionGroup.query.filter(
                        PermissionGroup.id.in_(permission_groups),
                        PermissionGroup.is_active == True
                    ).all()
                    
                    if len(groups) != len(permission_groups):
                        found_ids = {g.id for g in groups}
                        missing_ids = set(permission_groups) - found_ids
                        return False, f"Some permission groups not found: {list(missing_ids)}", 400
                    
                    user.permission_groups = groups
                else:
                    user.permission_groups = []
            
            # Add direct permissions if provided
            if add_direct_permissions:
                for perm_data in add_direct_permissions:
                    success, message = PermissionService.grant_direct_permission(
                        user_id=user_id,
                        permission_id=perm_data['permission_id'],
                        granted_by_user_id=updated_by_user_id,
                        resource_type=perm_data.get('resource_type'),
                        resource_id=perm_data.get('resource_id'),
                        reason=perm_data.get('reason', 'Permission update'),
                        expires_at=datetime.fromisoformat(perm_data['expires_at']) if perm_data.get('expires_at') else None
                    )
                    
                    if not success:
                        return False, f"Failed to add permission: {message}", 400
            
            # Remove direct permissions if provided
            if remove_direct_permissions:
                for perm_data in remove_direct_permissions:
                    success, message = PermissionService.revoke_direct_permission(
                        user_id=user_id,
                        permission_id=perm_data['permission_id'],
                        revoked_by_user_id=updated_by_user_id,
                        resource_type=perm_data.get('resource_type'),
                        resource_id=perm_data.get('resource_id'),
                        reason=perm_data.get('reason', 'Permission update')
                    )
                    
                    if not success:
                        return False, f"Failed to remove permission: {message}", 400
            
            db.session.commit()
            
            # Clear permission cache for this user
            PermissionService._clear_user_cache(user_id)
            
            return True, "User permissions updated successfully", 200
            
        except Exception as e:
            db.session.rollback()
            from flask import current_app
            current_app.logger.error(f"Error updating user permissions: {str(e)}")
            return False, f"Failed to update user permissions: {str(e)}", 500

    @classmethod
    def get_users_by_permission(cls, permission_name: str, resource_type: str = None,
                              include_inactive: bool = False) -> List[User]:
        """
        Get all users who have a specific permission.
        
        Args:
            permission_name (str): Permission name to search for
            resource_type (str): Optional resource type filter
            include_inactive (bool): Whether to include inactive users
            
        Returns:
            List[User]: Users with the specified permission
        """
        try:
            users_with_permission = []
            
            # Get all users
            query = User.query
            if not include_inactive:
                query = query.filter(User.is_active == True)
            
            users = query.all()
            
            # Check each user for the permission
            for user in users:
                if user.has_permission(permission_name, resource_type=resource_type):
                    users_with_permission.append(user)
            
            return users_with_permission
            
        except Exception as e:
            from flask import current_app
            current_app.logger.error(f"Error getting users by permission: {str(e)}")
            return []

    @classmethod
    def get_users_in_permission_group(cls, group_id: int, include_inactive: bool = False) -> List[User]:
        """
        Get all users assigned to a specific permission group.
        
        Args:
            group_id (int): Permission group ID
            include_inactive (bool): Whether to include inactive users
            
        Returns:
            List[User]: Users in the permission group
        """
        try:
            group = PermissionGroup.query.get(group_id)
            if not group:
                return []
            
            query = group.users
            if not include_inactive:
                query = query.filter(User.is_active == True)
            
            return query.all()
            
        except Exception as e:
            from flask import current_app
            current_app.logger.error(f"Error getting users in permission group: {str(e)}")
            return []

    @classmethod
    def bulk_assign_permission_group(cls, user_ids: List[int], group_id: int,
                                   assigned_by_user_id: int = None) -> Tuple[int, List[str], int]:
        """
        Assign a permission group to multiple users.
        
        Args:
            user_ids (List[int]): List of user IDs
            group_id (int): Permission group ID to assign
            assigned_by_user_id (int): ID of user making the assignment
            
        Returns:
            Tuple[int, List[str], int]: (success_count, error_messages, status_code)
        """
        try:
            # Validate permission group exists
            group = PermissionGroup.query.get(group_id)
            if not group or not group.is_active:
                return 0, ["Permission group not found or inactive"], 404
            
            # Get valid users
            users = User.query.filter(
                User.id.in_(user_ids),
                User.is_active == True
            ).all()
            
            if not users:
                return 0, ["No valid users found"], 404
            
            success_count = 0
            error_messages = []
            
            for user in users:
                try:
                    # Check if user already has this group
                    if group not in user.permission_groups:
                        user.permission_groups.append(group)
                        success_count += 1
                        
                        # Clear permission cache for this user
                        PermissionService._clear_user_cache(user.id)
                    else:
                        error_messages.append(f"User {user.username} already has this permission group")
                        
                except Exception as e:
                    error_messages.append(f"Failed to assign group to user {user.username}: {str(e)}")
            
            if success_count > 0:
                db.session.commit()
            
            status_code = 200 if success_count > 0 else 400
            return success_count, error_messages, status_code
            
        except Exception as e:
            db.session.rollback()
            from flask import current_app
            current_app.logger.error(f"Error in bulk assign permission group: {str(e)}")
            return 0, [f"Bulk assignment failed: {str(e)}"], 500

    @classmethod
    def get_permission_matrix(cls, user_ids: List[int] = None) -> Dict[str, Dict[str, bool]]:
        """
        Generate a permission matrix showing which users have which permissions.
        
        Args:
            user_ids (List[int]): Optional list of specific user IDs
            
        Returns:
            Dict[str, Dict[str, bool]]: Matrix with user_id -> permission_name -> has_permission
        """
        try:
            # Get users
            query = User.query.filter(User.is_active == True)
            if user_ids:
                query = query.filter(User.id.in_(user_ids))
            
            users = query.all()
            
            # Get all permissions
            permissions = Permission.query.filter(Permission.is_active == True).all()
            
            # Build matrix
            matrix = {}
            for user in users:
                matrix[str(user.id)] = {
                    'username': user.username,
                    'permissions': {}
                }
                
                for permission in permissions:
                    has_perm = user.has_permission(permission.name)
                    matrix[str(user.id)]['permissions'][permission.name] = has_perm
            
            return matrix
            
        except Exception as e:
            from flask import current_app
            current_app.logger.error(f"Error generating permission matrix: {str(e)}")
            return {}

    @classmethod
    def suggest_permission_groups_for_user(cls, user_id: int) -> List[Dict[str, any]]:
        """
        Suggest permission groups for a user based on their current permissions.
        
        Args:
            user_id (int): User ID
            
        Returns:
            List[Dict]: Suggested permission groups with match scores
        """
        try:
            user = User.query.get(user_id)
            if not user:
                return []
            
            # Get user's current effective permissions
            effective_permissions = PermissionService.get_user_effective_permissions(user_id)
            user_permission_names = set(effective_permissions.keys())
            
            # Get all available permission groups
            groups = PermissionGroup.query.filter(PermissionGroup.is_active == True).all()
            
            suggestions = []
            for group in groups:
                # Skip if user already has this group
                if group in user.permission_groups:
                    continue
                
                # Get group permissions
                group_permissions = group.get_all_permissions(include_inherited=True)
                group_permission_names = {p.name for p in group_permissions}
                
                # Calculate match score
                if group_permission_names:
                    overlap = user_permission_names.intersection(group_permission_names)
                    match_score = len(overlap) / len(group_permission_names)
                    
                    # Only suggest if there's some overlap but not complete overlap
                    if 0.1 <= match_score <= 0.8:
                        suggestions.append({
                            'group': group.to_dict(),
                            'match_score': match_score,
                            'matching_permissions': list(overlap),
                            'new_permissions': list(group_permission_names - user_permission_names)
                        })
            
            # Sort by match score (descending)
            suggestions.sort(key=lambda x: x['match_score'], reverse=True)
            
            return suggestions[:5]  # Return top 5 suggestions
            
        except Exception as e:
            from flask import current_app
            current_app.logger.error(f"Error suggesting permission groups: {str(e)}")
            return []

    @classmethod
    def migrate_role_to_permissions(cls, user_id: int, migrated_by_user_id: int = None) -> Tuple[bool, str, int]:
        """
        Migrate a user's legacy role permissions to direct permission assignments.
        
        Args:
            user_id (int): User ID to migrate
            migrated_by_user_id (int): ID of user performing the migration
            
        Returns:
            Tuple[bool, str, int]: (success, message, status_code)
        """
        try:
            user = User.query.options(selectinload(User.roles)).get(user_id)
            if not user:
                return False, "User not found", 404
            
            if not user.roles:
                return True, "User has no roles to migrate", 200
            
            # Get all permissions from user's roles
            role_permissions = set()
            for role in user.roles:
                for permission in role.permissions:
                    if permission and permission.is_active:
                        role_permissions.add(permission)
            
            # Create direct permission assignments
            migration_count = 0
            for permission in role_permissions:
                # Check if user already has this direct permission
                existing = UserPermission.query.filter_by(
                    user_id=user_id,
                    permission_id=permission.id,
                    is_active=True
                ).first()
                
                if not existing:
                    success, message = PermissionService.grant_direct_permission(
                        user_id=user_id,
                        permission_id=permission.id,
                        granted_by_user_id=migrated_by_user_id,
                        reason="Legacy role migration"
                    )
                    
                    if success:
                        migration_count += 1
            
            return True, f"Successfully migrated {migration_count} permissions from roles", 200
            
        except Exception as e:
            from flask import current_app
            current_app.logger.error(f"Error migrating role to permissions: {str(e)}")
            return False, f"Migration failed: {str(e)}", 500

    @classmethod
    def update_user_preferences(cls, user_id: int, preferences: Dict[str, Any]) -> Tuple[Optional[Dict], str, int]:
        """Update a user's preferences.
        
        Args:
            user_id (int): ID of user to update preferences for
            preferences (Dict[str, Any]): Dictionary containing validated preference data
            
        Returns:
            Tuple[Optional[Dict], str, int]: A tuple containing:
                - Updated preferences dict if successful, None if error
                - Message describing the result
                - HTTP status code
        """
        try:
            user = User.query.get(user_id)
            if not user:
                return None, f"User with ID {user_id} not found", 404
            
            # Get existing preferences or initialize with defaults
            existing_preferences = user.preferences or {
                'fee_schedule_view_size': 'standard',
                'fee_schedule_sort_order': 'alphabetical',
                'highlight_overrides': True,
                'show_classification_defaults': True,
                'dismissed_tooltips': []
                # fee_schedule_column_codes intentionally omitted - undefined means show all
            }
            
            # Merge validated data into existing preferences
            updated_preferences = {**existing_preferences, **preferences}
            
            # Update user preferences in database
            user.preferences = updated_preferences
            db.session.commit()
            
            return updated_preferences, "User preferences updated successfully", 200
            
        except Exception as e:
            db.session.rollback()
            from flask import current_app
            current_app.logger.error(f"Error updating user preferences for user {user_id}: {e}")
            return None, f"Error updating user preferences: {str(e)}", 500 