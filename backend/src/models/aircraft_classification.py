from datetime import datetime
from ..extensions import db


class AircraftClassification(db.Model):
    """Model representing global aircraft classifications.
    Used to group aircraft types for fee calculation purposes across all FBOs."""
    
    __tablename__ = 'aircraft_classifications'
    __table_args__ = (
        db.UniqueConstraint('name', name='_classification_name_uc'),
    )

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat()
        }

    def __repr__(self):
        return f'<AircraftClassification {self.name}>' 