import enum
from datetime import datetime
from sqlalchemy import UniqueConstraint
from ..extensions import db


class FuelTypeEnum(enum.Enum):
    """
    Legacy enumeration of fuel types - DEPRECATED.
    Use FuelType model instead for dynamic fuel type management.
    This enum is kept for backward compatibility during migration.
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
    fuel_type_id = db.Column(db.Integer, db.ForeignKey('fuel_types.id'), nullable=False, index=True)
    price = db.Column(db.Numeric(10, 4), nullable=False)
    currency = db.Column(db.String(3), nullable=False, default='USD')
    effective_date = db.Column(db.DateTime, nullable=False, default=datetime.utcnow, index=True)

    # Relationships
    fuel_type = db.relationship('FuelType', backref=db.backref('fuel_prices', lazy='dynamic'))

    # Timestamps
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Constraints
    __table_args__ = (
        UniqueConstraint('fuel_type_id', 'effective_date', 
                        name='_fuel_price_uc'),
    )

    def to_dict(self):
        """Convert fuel price object to dictionary for JSON serialization."""
        return {
            'id': self.id,
            'fuel_type_id': self.fuel_type_id,
            'fuel_type_name': self.fuel_type.name if self.fuel_type else None,
            'fuel_type_code': self.fuel_type.code if self.fuel_type else None,
            'price': str(self.price),
            'currency': self.currency,
            'effective_date': self.effective_date.isoformat(),
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat()
        }

    def __repr__(self):
        fuel_type_name = self.fuel_type.name if self.fuel_type else f'ID:{self.fuel_type_id}'
        return f'<FuelPrice {fuel_type_name} @ {self.price}>'