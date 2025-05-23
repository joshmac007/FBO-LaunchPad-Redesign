from typing import Tuple, List, Optional, Dict, Any, Set
from flask import g, has_request_context # Import g and has_request_context

from ..models.user import User
from ..models.role import Role
from ..models.permission import Permission
from ..extensions import db


class UserService:
    """Service class for managing user-related operations."""

    @classmethod
    def get_users(cls, filters: Optional[Dict[str, Any]] = None) -> Tuple[Optional[List[User]], str, int]:
        """Retrieve users based on specified filters.

        Args:
            filters (Optional[Dict[str, Any]]): Optional dictionary of filter parameters.
                Supported filters:
                - role_ids (List[int]): Filter by role IDs
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
                # Filter by role IDs
                role_ids = filters.get('role_ids')
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
                    has_manage_users_now = user_to_update.has_permission('MANAGE_USERS')
                    # Simulate permissions with new roles
                    if has_manage_users_now:
                        roles_with_manage_users = Role.query.join(Role.permissions).filter(Permission.name == 'MANAGE_USERS').all()
                        manage_users_role_ids = {role.id for role in roles_with_manage_users}
                        # If none of the new roles grant MANAGE_USERS, prevent update
                        if not new_role_ids.intersection(manage_users_role_ids):
                            return None, "Cannot remove your own MANAGE_USERS permission.", 403

            # Update fields if provided
            if 'name' in data:
                user_to_update.username = data['name']
            
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