from datetime import datetime
from ..extensions import db

class Aircraft(db.Model):
    """Aircraft model representing an aircraft in the system."""
    __tablename__ = 'aircraft'

    # Primary key - using tail number as per MVP requirements
    tail_number = db.Column(db.String(20), primary_key=True)
    
    # New column for aircraft type
    aircraft_type = db.Column(db.String(50), nullable=False)

    # New column for fuel type
    fuel_type = db.Column(db.String(20), nullable=False)

    # Timestamps
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self):
        return {
            'tail_number': self.tail_number,
            'aircraft_type': self.aircraft_type,
            'fuel_type': self.fuel_type,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat()
        }

    def __repr__(self):
        """Return string representation of the aircraft."""
        return f'<Aircraft {self.tail_number}>' 