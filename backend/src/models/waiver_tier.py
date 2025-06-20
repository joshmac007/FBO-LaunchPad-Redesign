from datetime import datetime
from ..extensions import db
from sqlalchemy.dialects.postgresql import JSON


class WaiverTier(db.Model):
    """Model representing waiver tiers that define which fees are waived based on fuel uplift multipliers.
    Supports both standard and CAA-specific tier configurations."""
    
    __tablename__ = 'waiver_tiers'

    id = db.Column(db.Integer, primary_key=True)
    fbo_location_id = db.Column(db.Integer, nullable=False, index=True)
    name = db.Column(db.String(100), nullable=False)
    fuel_uplift_multiplier = db.Column(db.Numeric(5, 2), nullable=False)
    fees_waived_codes = db.Column(JSON, nullable=False)  # Array of fee_code strings
    tier_priority = db.Column(db.Integer, nullable=False)  # Higher number = higher priority
    is_caa_specific_tier = db.Column(db.Boolean, nullable=False, default=False)
    
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'fbo_location_id': self.fbo_location_id,
            'name': self.name,
            'fuel_uplift_multiplier': str(self.fuel_uplift_multiplier),
            'fees_waived_codes': self.fees_waived_codes,
            'tier_priority': self.tier_priority,
            'is_caa_specific_tier': self.is_caa_specific_tier,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat()
        }

    def __repr__(self):
        return f'<WaiverTier {self.name} (FBO {self.fbo_location_id}) - Priority {self.tier_priority}>' 