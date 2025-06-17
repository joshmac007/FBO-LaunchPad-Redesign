from datetime import datetime
from ..extensions import db


class FBOAircraftTypeConfig(db.Model):
    """Model representing FBO-specific aircraft type configurations.
    Stores per-FBO overrides for aircraft type settings like base minimum fuel gallons for waivers."""
    
    __tablename__ = 'fbo_aircraft_type_configs'
    __table_args__ = (
        db.UniqueConstraint('fbo_location_id', 'aircraft_type_id', name='uq_fbo_aircraft_config'),
    )

    id = db.Column(db.Integer, primary_key=True)
    fbo_location_id = db.Column(db.Integer, nullable=False, index=True)
    aircraft_type_id = db.Column(db.Integer, db.ForeignKey('aircraft_types.id'), nullable=False, index=True)
    base_min_fuel_gallons_for_waiver = db.Column(db.Numeric(10, 2), nullable=False)
    
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    aircraft_type = db.relationship('AircraftType', backref='fbo_configs')

    def to_dict(self):
        return {
            'id': self.id,
            'fbo_location_id': self.fbo_location_id,
            'aircraft_type_id': self.aircraft_type_id,
            'aircraft_type_name': self.aircraft_type.name if self.aircraft_type else None,
            'base_min_fuel_gallons_for_waiver': str(self.base_min_fuel_gallons_for_waiver),
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat()
        }

    def __repr__(self):
        return f'<FBOAircraftTypeConfig FBO:{self.fbo_location_id} Aircraft:{self.aircraft_type_id} MinFuel:{self.base_min_fuel_gallons_for_waiver}>' 