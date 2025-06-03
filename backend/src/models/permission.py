from src.extensions import db
from sqlalchemy import Integer, String, Text, DateTime, Boolean
from datetime import datetime

class Permission(db.Model):
    __tablename__ = 'permissions'

    id = db.Column(Integer, primary_key=True)
    name = db.Column(String(100), unique=True, nullable=False, index=True)
    description = db.Column(Text, nullable=True)
    created_at = db.Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    def get_full_name(self):
        """Get a descriptive full name for the permission."""
        return self.name

    def is_resource_specific(self):
        """Check if this permission applies to specific resources."""
        # For now, assume permissions containing 'own' or specific patterns are resource-specific
        return 'own' in self.name.lower() or any(pattern in self.name for pattern in ['fuel_order', 'user', 'aircraft'])

    def to_dict(self):
        """Convert to dictionary for API responses."""
        return {
            'id': self.id,
            'name': self.name,
            'description': self.description,
            'full_name': self.get_full_name(),
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }

    def __repr__(self):
        return f'<Permission {self.name}>'
