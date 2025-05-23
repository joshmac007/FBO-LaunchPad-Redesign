from typing import Union, Tuple
from ..models.user import User, UserRole
from ..extensions import db
from datetime import datetime, timedelta
import jwt
from flask import current_app

class AuthService:
    @classmethod
    def register_user(cls, email: str, password: str) -> User:
        """
        Register a new user if the email is not already taken.
        
        Args:
            email (str): The user's email address
            password (str): The user's password (will be hashed before storage)
            
        Returns:
            User: The newly created user object
            
        Raises:
            ValueError: If email already exists
        """
        print(f"Registering user with email: {email}")
        
        # Check if user already exists with this email
        existing_user = User.query.filter_by(email=email).first()
        if existing_user:
            print(f"User with email {email} already exists")
            raise ValueError("Email already registered")
            
        # Generate username from email (part before @)
        username = email.split('@')[0]
        print(f"Generated username: {username}")
        
        # If username exists, append a number
        base_username = username
        counter = 1
        while User.query.filter_by(username=username).first():
            username = f"{base_username}{counter}"
            counter += 1
            print(f"Username {base_username} exists, trying {username}")
            
        try:
            # Create new user instance with default role LST
            new_user = User(
                username=username,
                email=email,
                role=UserRole.LST,
                is_active=True
            )
            print(f"Created user object: {new_user}")
            
            # Set password (will be automatically hashed by the User model)
            new_user.set_password(password)
            print("Set password hash")
            
            # Add user to database and commit transaction
            db.session.add(new_user)
            print("Added user to session")
            db.session.commit()
            print("Committed transaction")
            return new_user
        except Exception as e:
            db.session.rollback()
            print(f"Error registering user: {str(e)}")
            # In a production environment, you would want to log the error here
            raise Exception(f"Database error: {str(e)}")

    @classmethod
    def authenticate_user(cls, email: str, password: str) -> str:
        """
        Authenticate a user with their email and password.
        
        Args:
            email (str): The user's email
            password (str): The user's password
            
        Returns:
            str: JWT token string if authentication successful
            
        Raises:
            ValueError: If credentials are invalid or account is inactive
            Exception: If there's a server error
        """
        # Find user by email
        user = User.query.filter_by(email=email).first()
        print(f"Authenticating user with email: {email}")
        print(f"Found user: {user}")
        
        # Check if user exists and password is correct
        if not user:
            print("User not found")
            raise ValueError("Invalid email or password")
            
        if not user.check_password(password):
            print("Password check failed")
            raise ValueError("Invalid email or password")
            
        # Check if user account is active
        if not user.is_active:
            print("User account is inactive")
            raise ValueError("User account is inactive")
            
        # Return user object for token creation in route
        return user

    @staticmethod
    def get_user_effective_permissions(user):
        """
        Retrieves a unique list of all permission names assigned to the user through their roles.
        Returns (permissions_list, message, status_code)
        """
        if not user or not hasattr(user, 'roles') or user.roles.count() == 0:
            return [], "User has no assigned roles or permissions.", 200

        effective_permissions = set()
        try:
            for role in user.roles.all():  # Efficiently fetch all roles
                if hasattr(role, 'permissions'):
                    for permission in role.permissions.all():  # Efficiently fetch all permissions
                        effective_permissions.add(permission.name)
            sorted_permissions = sorted(list(effective_permissions))
            return sorted_permissions, "Effective permissions retrieved successfully.", 200
        except Exception as e:
            print(f"Error calculating effective permissions for user {getattr(user, 'id', None)}: {str(e)}")
            return None, f"Error calculating effective permissions: {str(e)}", 500