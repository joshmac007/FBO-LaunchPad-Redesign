from datetime import datetime
from ..extensions import db


class AircraftTypeToAircraftClassificationMapping(db.Model):
    """Model representing the mapping between aircraft types and fee categories per FBO location.
    An aircraft type can only map to one fee category per FBO."""
    
    __tablename__ = 'aircraft_classification_mappings'
    __table_args__ = (
        db.UniqueConstraint('fbo_location_id', 'aircraft_type_id', name='uq_aircraft_type_fbo_mapping'),
    )

    id = db.Column(db.Integer, primary_key=True)
    fbo_location_id = db.Column(db.Integer, nullable=False, index=True)
    aircraft_type_id = db.Column(db.Integer, db.ForeignKey('aircraft_types.id'), nullable=False)
    classification_id = db.Column(db.Integer, db.ForeignKey('aircraft_classifications.id'), nullable=False)
    
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    aircraft_type = db.relationship('AircraftType', backref='classification_mappings')
    classification = db.relationship('AircraftClassification', backref='aircraft_type_mappings')

    def to_dict(self):
        return {
            'id': self.id,
            'fbo_location_id': self.fbo_location_id,
            'aircraft_type_id': self.aircraft_type_id,
            'classification_id': self.classification_id,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat()
        }

    def __repr__(self):
        return f'<AircraftTypeMapping {self.aircraft_type_id} -> {self.classification_id} (FBO {self.fbo_location_id})>' 