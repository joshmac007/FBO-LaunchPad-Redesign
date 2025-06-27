from datetime import datetime
from ..extensions import db


class FuelType(db.Model):
    """
    Model for storing fuel types.
    
    This model acts as the single source of truth for available fuel types,
    replacing the hardcoded FuelTypeEnum. It allows for dynamic management
    of fuel types through the admin interface.
    """
    __tablename__ = 'fuel_types'

    # Primary Key
    id = db.Column(db.Integer, primary_key=True)

    # Core Fields
    name = db.Column(db.String(100), nullable=False, unique=True, index=True)
    code = db.Column(db.String(50), nullable=False, unique=True, index=True)
    description = db.Column(db.Text, nullable=True)
    is_active = db.Column(db.Boolean, nullable=False, default=True, index=True)

    # Timestamps
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self):
        """Convert fuel type object to dictionary for JSON serialization."""
        return {
            'id': self.id,
            'name': self.name,
            'code': self.code,
            'description': self.description,
            'is_active': self.is_active,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat()
        }

    def __repr__(self):
        return f'<FuelType {self.name}>'