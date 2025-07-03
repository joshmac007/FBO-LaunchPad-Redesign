from datetime import datetime
from ..extensions import db

class Aircraft(db.Model):
    """Aircraft model representing an aircraft in the system."""
    __tablename__ = 'aircraft'

    # Primary key - using tail number as per MVP requirements
    tail_number = db.Column(db.String(20), primary_key=True)
    
    # New column for aircraft type
    aircraft_type = db.Column(db.String(50), nullable=False)

    # Fuel type reference
    fuel_type_id = db.Column(db.Integer, db.ForeignKey('fuel_types.id'), nullable=False)
    
    # Optional customer association
    customer_id = db.Column(db.Integer, db.ForeignKey('customers.id'), nullable=True)

    # Relationships
    customer = db.relationship('Customer', backref=db.backref('aircraft_list', lazy='dynamic'))
    fuel_type = db.relationship('FuelType', backref=db.backref('aircraft', lazy='dynamic'))

    # Timestamps
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self):
        return {
            'tail_number': self.tail_number,
            'aircraft_type': self.aircraft_type,
            'fuel_type_id': self.fuel_type_id,
            'fuel_type_name': self.fuel_type.name if self.fuel_type else None,
            'fuel_type_code': self.fuel_type.code if self.fuel_type else None,
            'customer_id': self.customer_id,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat()
        }

    def __repr__(self):
        """Return string representation of the aircraft."""
        return f'<Aircraft {self.tail_number}>' 