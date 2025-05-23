from typing import Tuple, List, Optional
from src.app import db
from src.models import Permission
from sqlalchemy.exc import SQLAlchemyError

class PermissionService:
    """
    Stub service for permission-related operations (Phase 3).
    """

    @classmethod
    def get_all_permissions(cls) -> Tuple[Optional[List[Permission]], str, int]:
        """
        Retrieve all permissions from the database, ordered by name.

        Returns:
            Tuple containing:
            - List[Permission]: List of all Permission objects if successful, None if error
            - str: Success/error message
            - int: HTTP status code (200 for success, 500 for error)
        """
        try:
            permissions = Permission.query.order_by(Permission.name.asc()).all()
            return permissions, "Permissions retrieved successfully", 200
        except SQLAlchemyError as e:
            db.session.rollback()
            error_msg = f"Database error while retrieving permissions: {str(e)}"
            # Log the error here if you have a logger configured
            print(error_msg)  # Basic logging fallback
            return None, error_msg, 500 