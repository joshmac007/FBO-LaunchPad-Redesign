from typing import Tuple, Any, List, Optional
from sqlalchemy.exc import SQLAlchemyError, IntegrityError
from src.app import db
from src.models import Role, Permission

class RoleService:
    """Service class for managing roles and their permissions."""

    @classmethod
    def get_all_roles(cls) -> Tuple[List[Role], str, int]:
        """Retrieve all roles ordered by name."""
        try:
            roles = Role.query.order_by(Role.name.asc()).all()
            return roles, "Roles retrieved successfully", 200
        except SQLAlchemyError as e:
            db.session.rollback()
            return [], f"Database error: {str(e)}", 500

    @classmethod
    def create_role(cls, data: dict) -> Tuple[Optional[Role], str, int]:
        """Create a new role with the provided data."""
        if not data.get('name'):
            return None, "Role name is required", 400

        try:
            # Check for existing role with same name
            existing_role = Role.query.filter_by(name=data['name']).first()
            if existing_role:
                return None, f"Role with name '{data['name']}' already exists", 409

            new_role = Role(
                name=data['name'],
                description=data.get('description')
            )
            db.session.add(new_role)
            db.session.commit()
            return new_role, "Role created successfully", 201
        except IntegrityError:
            db.session.rollback()
            return None, "Role name must be unique", 409
        except SQLAlchemyError as e:
            db.session.rollback()
            return None, f"Database error: {str(e)}", 500

    @classmethod
    def get_role_by_id(cls, role_id: int) -> Tuple[Optional[Role], str, int]:
        """Retrieve a role by its ID."""
        try:
            role = Role.query.get(role_id)
            if not role:
                return None, f"Role with ID {role_id} not found", 404
            return role, "Role retrieved successfully", 200
        except SQLAlchemyError as e:
            return None, f"Database error: {str(e)}", 500

    @classmethod
    def update_role(cls, role_id: int, data: dict) -> Tuple[Optional[Role], str, int]:
        """Update an existing role's information."""
        try:
            role = Role.query.get(role_id)
            if not role:
                return None, f"Role with ID {role_id} not found", 404

            if 'name' in data:
                # Check for duplicate name, excluding current role
                existing_role = Role.query.filter(
                    Role.name == data['name'],
                    Role.id != role_id
                ).first()
                if existing_role:
                    return None, f"Role with name '{data['name']}' already exists", 409
                role.name = data['name']

            if 'description' in data:
                role.description = data['description']

            db.session.commit()
            return role, "Role updated successfully", 200
        except IntegrityError:
            db.session.rollback()
            return None, "Role name must be unique", 409
        except SQLAlchemyError as e:
            db.session.rollback()
            return None, f"Database error: {str(e)}", 500

    @classmethod
    def delete_role(cls, role_id: int) -> Tuple[bool, str, int]:
        """Delete a role and its permission assignments."""
        try:
            role = Role.query.get(role_id)
            if not role:
                return False, f"Role with ID {role_id} not found", 404

            # Check if any users are assigned this role
            if role.users.first():
                return False, "Cannot delete role: Users are currently assigned to this role", 409

            # Clear permission assignments
            role.permissions = []
            db.session.delete(role)
            db.session.commit()
            return True, "Role deleted successfully", 200
        except SQLAlchemyError as e:
            db.session.rollback()
            return False, f"Database error: {str(e)}", 500

    @classmethod
    def get_role_permissions(cls, role_id: int) -> Tuple[List[Permission], str, int]:
        """Get all permissions assigned to a role."""
        try:
            role = Role.query.options(db.joinedload(Role.permissions)).get(role_id)
            if not role:
                return [], f"Role with ID {role_id} not found", 404
            
            permissions = list(role.permissions)
            return permissions, "Permissions retrieved successfully", 200
        except SQLAlchemyError as e:
            return [], f"Database error: {str(e)}", 500

    @classmethod
    def assign_permission_to_role(cls, role_id: int, permission_id: int) -> Tuple[Optional[Role], str, int]:
        """Assign a permission to a role."""
        try:
            role = Role.query.get(role_id)
            if not role:
                return None, f"Role with ID {role_id} not found", 404

            permission = Permission.query.get(permission_id)
            if not permission:
                return None, f"Permission with ID {permission_id} not found", 404

            # Check if permission is already assigned
            if permission in role.permissions:
                return role, "Permission already assigned to role", 200

            role.permissions.append(permission)
            db.session.commit()
            return role, "Permission assigned successfully", 200
        except SQLAlchemyError as e:
            db.session.rollback()
            return None, f"Database error: {str(e)}", 500

    @classmethod
    def remove_permission_from_role(cls, role_id: int, permission_id: int) -> Tuple[Optional[Role], str, int]:
        """Remove a permission from a role."""
        try:
            role = Role.query.get(role_id)
            if not role:
                return None, f"Role with ID {role_id} not found", 404

            permission = Permission.query.get(permission_id)
            if not permission:
                return None, f"Permission with ID {permission_id} not found", 404

            # Check if permission is actually assigned
            if permission not in role.permissions:
                return role, "Permission not assigned to role", 200

            role.permissions.remove(permission)
            db.session.commit()
            return role, "Permission removed successfully", 200
        except SQLAlchemyError as e:
            db.session.rollback()
            return None, f"Database error: {str(e)}", 500 