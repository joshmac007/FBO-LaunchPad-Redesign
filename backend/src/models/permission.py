from src.extensions import db
from sqlalchemy import Integer, String, Text, DateTime, Boolean
from datetime import datetime

class Permission(db.Model):
    __tablename__ = 'permissions'

    id = db.Column(Integer, primary_key=True)
    name = db.Column(String(100), unique=True, nullable=False, index=True)
    description = db.Column(Text, nullable=True)
    category = db.Column(String(50), nullable=True, default='system')
    
    # Resource-specific permission fields
    resource_type = db.Column(String(50), nullable=True)  # e.g., 'fuel_order', 'user', 'aircraft', 'global'
    action = db.Column(String(50), nullable=True)         # e.g., 'create', 'read', 'update', 'delete', 'manage'
    scope = db.Column(String(50), nullable=True)          # e.g., 'own', 'any', 'department'
    
    # Permission metadata
    is_system_permission = db.Column(Boolean, default=False, nullable=False)  # System permissions cannot be deleted
    is_active = db.Column(Boolean, default=True, nullable=False)
    requires_resource_context = db.Column(Boolean, default=False, nullable=False)  # Whether this permission needs resource_id context
    
    created_at = db.Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    def get_full_name(self):
        """Get a descriptive full name for the permission."""
        parts = []
        if self.action:
            parts.append(self.action)
        if self.resource_type:
            parts.append(self.resource_type)
        if self.scope and self.scope != 'any':
            parts.append(f"({self.scope})")
        
        return "_".join(parts) if parts else self.name

    def is_resource_specific(self):
        """Check if this permission applies to specific resources."""
        return self.requires_resource_context or self.scope == 'own'

    def to_dict(self):
        """Convert to dictionary for API responses."""
        return {
            'id': self.id,
            'name': self.name,
            'description': self.description,
            'category': self.category,
            'resource_type': self.resource_type,
            'action': self.action,
            'scope': self.scope,
            'is_system_permission': self.is_system_permission,
            'is_active': self.is_active,
            'requires_resource_context': self.requires_resource_context,
            'full_name': self.get_full_name(),
            'created_at': self.created_at.isoformat() if self.created_at else None
        }

    def __repr__(self):
        return f'<Permission {self.name}>'
