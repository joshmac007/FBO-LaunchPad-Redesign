from datetime import datetime
from ..extensions import db


class AircraftType(db.Model):
    """Model representing aircraft types for the receipt system.
    Stores base minimum fuel gallons for waiver and default fee category mappings."""
    
    __tablename__ = 'aircraft_types'

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False, unique=True, index=True)
    base_min_fuel_gallons_for_waiver = db.Column(db.Numeric(10, 2), nullable=False, server_default='0')
    classification_id = db.Column(db.Integer, db.ForeignKey('aircraft_classifications.id'), nullable=False)
    default_max_gross_weight_lbs = db.Column(db.Numeric(10, 2), nullable=True)
    
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    classification = db.relationship('AircraftClassification', backref='aircraft_types')

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'base_min_fuel_gallons_for_waiver': float(self.base_min_fuel_gallons_for_waiver),
            'classification_id': self.classification_id,
            'default_max_gross_weight_lbs': float(self.default_max_gross_weight_lbs) if self.default_max_gross_weight_lbs else None,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat()
        }

    def __repr__(self):
        return f'<AircraftType {self.name}>' 