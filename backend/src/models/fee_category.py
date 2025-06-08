from datetime import datetime
from ..extensions import db


class FeeCategory(db.Model):
    """Model representing fee categories for different aircraft types per FBO location.
    Used to group aircraft types for fee calculation purposes."""
    
    __tablename__ = 'fee_categories'
    __table_args__ = (
        db.UniqueConstraint('fbo_location_id', 'name', name='uq_fee_category_fbo_name'),
    )

    id = db.Column(db.Integer, primary_key=True)
    fbo_location_id = db.Column(db.Integer, nullable=False, index=True)
    name = db.Column(db.String(100), nullable=False)
    
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'fbo_location_id': self.fbo_location_id,
            'name': self.name,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat()
        }

    def __repr__(self):
        return f'<FeeCategory {self.name} (FBO {self.fbo_location_id})>' 