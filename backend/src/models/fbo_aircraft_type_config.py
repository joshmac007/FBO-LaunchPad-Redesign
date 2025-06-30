from datetime import datetime
from ..extensions import db


class AircraftTypeConfig(db.Model):
    """Model representing aircraft type configurations.
    Stores aircraft type settings like base minimum fuel gallons for waivers."""
    
    __tablename__ = 'aircraft_type_configs'
    __table_args__ = (
        db.UniqueConstraint('aircraft_type_id', name='uq_aircraft_type_config'),
    )

    id = db.Column(db.Integer, primary_key=True)
    aircraft_type_id = db.Column(db.Integer, db.ForeignKey('aircraft_types.id'), nullable=False, index=True)
    base_min_fuel_gallons_for_waiver = db.Column(db.Numeric(10, 2), nullable=False)
    
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    aircraft_type = db.relationship('AircraftType', backref='type_configs')

    def to_dict(self):
        return {
            'id': self.id,
            'aircraft_type_id': self.aircraft_type_id,
            'aircraft_type_name': self.aircraft_type.name if self.aircraft_type else None,
            'base_min_fuel_gallons_for_waiver': str(self.base_min_fuel_gallons_for_waiver),
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat()
        }

    def __repr__(self):
        return f'<AircraftTypeConfig Aircraft:{self.aircraft_type_id} MinFuel:{self.base_min_fuel_gallons_for_waiver}>' 