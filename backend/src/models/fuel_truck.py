from datetime import datetime
from ..extensions import db


class FuelTruck(db.Model):
    """Model representing a fuel truck in the system."""
    
    __tablename__ = 'fuel_trucks'

    id = db.Column(db.Integer, primary_key=True)
    truck_number = db.Column(db.String(20), unique=True, nullable=False)
    fuel_type = db.Column(db.String(50), nullable=False)
    capacity = db.Column(db.Numeric(10, 2), nullable=False)
    current_meter_reading = db.Column(db.Numeric(12, 2), nullable=False, default=0)
    is_active = db.Column(db.Boolean, nullable=False, default=True)
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'truck_number': self.truck_number,
            'fuel_type': self.fuel_type,
            'capacity': float(self.capacity),
            'current_meter_reading': float(self.current_meter_reading),
            'is_active': self.is_active,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat()
        }

    def __repr__(self):
        return f'<FuelTruck {self.truck_number}>' 