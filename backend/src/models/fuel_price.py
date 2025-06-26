import enum
from datetime import datetime
from sqlalchemy import UniqueConstraint
from ..extensions import db


class FuelTypeEnum(enum.Enum):
    """
    Enumeration of fuel types available for pricing.
    This ensures type safety and prevents data inconsistencies from string typos.
    """
    JET_A = "JET_A"
    AVGAS_100LL = "AVGAS_100LL"
    SAF_JET_A = "SAF_JET_A"


class FuelPrice(db.Model):
    """
    Model for storing fuel price history.
    
    This model maintains a complete history of fuel prices by creating new records
    for each price change rather than updating existing ones. This provides an
    immutable audit trail for pricing decisions.
    """
    __tablename__ = 'fuel_prices'

    # Primary Key
    id = db.Column(db.Integer, primary_key=True)

    # Core Fields
    fbo_location_id = db.Column(db.Integer, nullable=False, index=True)
    fuel_type = db.Column(db.Enum(FuelTypeEnum), nullable=False, index=True)
    price = db.Column(db.Numeric(10, 4), nullable=False)
    currency = db.Column(db.String(3), nullable=False, default='USD')
    effective_date = db.Column(db.DateTime, nullable=False, default=datetime.utcnow, index=True)

    # Timestamps
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Constraints
    __table_args__ = (
        UniqueConstraint('fbo_location_id', 'fuel_type', 'effective_date', 
                        name='uq_fuel_price_fbo_fuel_date'),
    )

    def to_dict(self):
        """Convert fuel price object to dictionary for JSON serialization."""
        return {
            'id': self.id,
            'fbo_location_id': self.fbo_location_id,
            'fuel_type': self.fuel_type.value,
            'price': str(self.price),
            'currency': self.currency,
            'effective_date': self.effective_date.isoformat(),
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat()
        }

    def __repr__(self):
        return f'<FuelPrice {self.fuel_type.value} @ {self.price} for FBO {self.fbo_location_id}>'