from datetime import datetime, timedelta
from enum import Enum
from flask import current_app, g, has_request_context
from sqlalchemy import exists
from sqlalchemy.orm import joinedload
from werkzeug.security import generate_password_hash, check_password_hash
import jwt

from ..extensions import db
from ..models.permission import Permission
from ..models.role import Role
from ..models.role_permission import role_permissions, user_roles

class UserRole(Enum):
    """
    Enumeration of user roles for backward compatibility with role-based decorators.
    """
    ADMIN = "ADMIN"
    CSR = "CSR"
    LST = "LST"

class User(db.Model):
    __tablename__ = 'users'

    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(64), unique=True, nullable=False, index=True)
    email = db.Column(db.String(120), unique=True, nullable=False, index=True)
    name = db.Column(db.String(120), nullable=True)
    password_hash = db.Column(db.String(128))
    is_active = db.Column(db.Boolean, nullable=False, default=True)
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)
    roles = db.relationship(
        'Role',
        secondary=user_roles,
        backref=db.backref('users', lazy='dynamic'),
        lazy='dynamic'
    )

    def set_password(self, password):
        self.password_hash = generate_password_hash(password, method='pbkdf2:sha256')

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

    def to_dict(self):
        """Convert user object to dictionary."""
        return {
            'id': self.id,
            'username': self.username,
            'email': self.email,
            'name': self.name,
            'roles': [role.name for role in self.roles.all()],
            'is_active': self.is_active,
            'created_at': self.created_at.isoformat()
        }

    @property
    def role_list(self):
        """Get list of roles for this user."""
        return self.roles.all()

    def __repr__(self):
        return f'<User {self.username}>'

    def has_permission(self, permission_name: str) -> bool:
        """
        Check if the user has a specific permission through any of their assigned roles.
        
        Args:
            permission_name (str): The name of the permission to check for.
            
        Returns:
            bool: True if the user has the permission through any role, False otherwise.
            
        Note:
            This method uses SQLAlchemy's EXISTS subquery for efficient permission checking
            and caches results for the duration of the request.
        """
        if not self.is_active:
            return False
            
        # Use request-level caching if available
        if has_request_context():
            # Initialize permission cache if it doesn't exist
            if not hasattr(g, '_permission_cache'):
                g._permission_cache = {}
            
            cache_key = f'user_{self.id}_perm_{permission_name}'
            if cache_key in g._permission_cache:
                return g._permission_cache[cache_key]
            
            # Check permission and cache result
            result = db.session.query(exists().where(
                db.and_(
                    User.id == self.id,
                    User.roles.any(Role.permissions.any(Permission.name == permission_name))
                )
            )).scalar()
            
            g._permission_cache[cache_key] = result
            return result
            
        # If no request context, perform check without caching
        return db.session.query(exists().where(
            db.and_(
                User.id == self.id,
                User.roles.any(Role.permissions.any(Permission.name == permission_name))
            )
        )).scalar()

    def generate_token(self, expires_in=3600):
        """
        Generate a JWT token for the user.
        
        Args:
            expires_in (int): Token expiration time in seconds (default: 1 hour)
            
        Returns:
            str: The generated JWT token
            
        Note:
            The token includes user ID, roles, and expiration time.
            Uses the app's JWT_SECRET_KEY for signing.
        """
        now = datetime.utcnow()
        payload = {
            'user_id': self.id,
            'username': self.username,
            'roles': [role.name for role in self.roles],
            'is_active': self.is_active,
            'exp': now + timedelta(seconds=expires_in),
            'iat': now
        }
        return jwt.encode(
            payload,
            current_app.config['JWT_SECRET_KEY'],
            algorithm='HS256'
        )

    @staticmethod
    def verify_token(token):
        """Verify a JWT token and return the user."""
        try:
            payload = jwt.decode(
                token,
                current_app.config['JWT_SECRET_KEY'],
                algorithms=['HS256']
            )
            user_id = payload['user_id']
            return User.query.get(user_id)
        except jwt.ExpiredSignatureError:
            return None
        except jwt.InvalidTokenError:
            return None 