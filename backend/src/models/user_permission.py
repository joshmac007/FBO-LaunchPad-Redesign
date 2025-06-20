from datetime import datetime
from sqlalchemy import Integer, String, ForeignKey, DateTime, Boolean, Text
from ..extensions import db

class UserPermission(db.Model):
    """
    Direct user-to-permission assignments for granular permission control.
    This allows users to have permissions beyond their role-based permissions.
    """
    __tablename__ = 'user_permissions'

    id = db.Column(Integer, primary_key=True)
    user_id = db.Column(Integer, ForeignKey('users.id'), nullable=False, index=True)
    permission_id = db.Column(Integer, ForeignKey('permissions.id'), nullable=False, index=True)
    
    # Permission source tracking
    granted_by_user_id = db.Column(Integer, ForeignKey('users.id'), nullable=True)
    granted_at = db.Column(DateTime, default=datetime.utcnow, nullable=False)
    
    # Permission scope and context
    resource_type = db.Column(String(50), nullable=True)  # e.g., 'fuel_order', 'user', 'aircraft'
    resource_id = db.Column(String(100), nullable=True)   # specific resource ID or 'own' for user's own resources
    
    # Permission status
    is_active = db.Column(Boolean, default=True, nullable=False)
    expires_at = db.Column(DateTime, nullable=True)  # Optional expiration for temporary permissions
    
    # Audit trail
    reason = db.Column(Text, nullable=True)  # Reason for granting this permission
    revoked_at = db.Column(DateTime, nullable=True)
    revoked_by_user_id = db.Column(Integer, ForeignKey('users.id'), nullable=True)
    revoked_reason = db.Column(Text, nullable=True)
    
    created_at = db.Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    user = db.relationship('User', foreign_keys=[user_id], backref='direct_permissions')
    permission = db.relationship('Permission', backref='user_assignments')
    granted_by = db.relationship('User', foreign_keys=[granted_by_user_id])
    revoked_by = db.relationship('User', foreign_keys=[revoked_by_user_id])

    # Unique constraint to prevent duplicate assignments
    __table_args__ = (
        db.UniqueConstraint('user_id', 'permission_id', 'resource_type', 'resource_id', 
                          name='unique_user_permission_resource'),
    )

    def is_valid(self):
        """Check if this permission assignment is currently valid."""
        if not self.is_active:
            return False
        if self.revoked_at:
            return False
        if self.expires_at and self.expires_at < datetime.utcnow():
            return False
        return True

    def revoke(self, revoked_by_user_id, reason=None):
        """Revoke this permission assignment."""
        self.is_active = False
        self.revoked_at = datetime.utcnow()
        self.revoked_by_user_id = revoked_by_user_id
        self.revoked_reason = reason

    def to_dict(self):
        """Convert to dictionary for API responses."""
        return {
            'id': self.id,
            'user_id': self.user_id,
            'permission_id': self.permission_id,
            'permission_name': self.permission.name if self.permission else None,
            'resource_type': self.resource_type,
            'resource_id': self.resource_id,
            'is_active': self.is_active,
            'granted_at': self.granted_at.isoformat() if self.granted_at else None,
            'expires_at': self.expires_at.isoformat() if self.expires_at else None,
            'granted_by_user_id': self.granted_by_user_id,
            'reason': self.reason,
            'is_valid': self.is_valid()
        }

    def __repr__(self):
        return f'<UserPermission user_id={self.user_id} permission={self.permission.name if self.permission else self.permission_id}>' 