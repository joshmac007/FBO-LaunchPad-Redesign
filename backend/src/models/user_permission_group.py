from datetime import datetime
from sqlalchemy import Integer, ForeignKey, DateTime, Boolean, String
from ..extensions import db

class UserPermissionGroup(db.Model):
    """
    Enhanced junction table for user to permission group relationships.
    Provides additional metadata for tracking assignments and migrations.
    """
    __tablename__ = 'user_permission_group_assignments'

    id = db.Column(Integer, primary_key=True)
    user_id = db.Column(Integer, ForeignKey('users.id'), nullable=False)
    permission_group_id = db.Column(Integer, ForeignKey('permission_groups.id'), nullable=False)
    
    # Assignment metadata
    assigned_at = db.Column(DateTime, default=datetime.utcnow, nullable=False)
    assigned_by_user_id = db.Column(Integer, ForeignKey('users.id'), nullable=True)
    assigned_by_migration = db.Column(Boolean, default=False, nullable=False)
    
    # Assignment context
    assignment_reason = db.Column(String(255), nullable=True)  # e.g., "Role migration", "Manual assignment"
    is_active = db.Column(Boolean, default=True, nullable=False)
    
    # Expiration support (optional)
    expires_at = db.Column(DateTime, nullable=True)
    
    # Audit trail
    created_at = db.Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships with explicit foreign_keys to resolve ambiguity
    user = db.relationship('User', foreign_keys=[user_id], backref='permission_group_assignments')
    permission_group = db.relationship('PermissionGroup', backref='user_assignments')
    assigned_by = db.relationship('User', foreign_keys=[assigned_by_user_id])

    # Unique constraint to prevent duplicate assignments
    __table_args__ = (
        db.UniqueConstraint('user_id', 'permission_group_id', name='unique_user_permission_group'),
    )

    def is_expired(self):
        """Check if this assignment has expired."""
        if self.expires_at is None:
            return False
        return datetime.utcnow() > self.expires_at

    def to_dict(self):
        """Convert to dictionary for API responses."""
        return {
            'id': self.id,
            'user_id': self.user_id,
            'permission_group_id': self.permission_group_id,
            'assigned_at': self.assigned_at.isoformat() if self.assigned_at else None,
            'assigned_by_user_id': self.assigned_by_user_id,
            'assigned_by_migration': self.assigned_by_migration,
            'assignment_reason': self.assignment_reason,
            'is_active': self.is_active,
            'expires_at': self.expires_at.isoformat() if self.expires_at else None,
            'is_expired': self.is_expired()
        }

    def __repr__(self):
        return f'<UserPermissionGroup user_id={self.user_id} group_id={self.permission_group_id}>' 