from datetime import datetime
from ..extensions import db
import enum


class CalculationBasis(enum.Enum):
    FIXED_PRICE = 'FIXED_PRICE'
    PER_UNIT_SERVICE = 'PER_UNIT_SERVICE'
    NOT_APPLICABLE = 'NOT_APPLICABLE'


class WaiverStrategy(enum.Enum):
    NONE = 'NONE'
    SIMPLE_MULTIPLIER = 'SIMPLE_MULTIPLIER'
    TIERED_MULTIPLIER = 'TIERED_MULTIPLIER'


class FeeRule(db.Model):
    """Model representing fee rules that apply to fee categories.
    Now operates in a single-tenant context per database."""
    
    __tablename__ = 'fee_rules'
    __table_args__ = (
        db.UniqueConstraint('fee_code', 'applies_to_classification_id', name='uq_fee_rule_code_classification'),
    )

    id = db.Column(db.Integer, primary_key=True)
    fee_name = db.Column(db.String(100), nullable=False)
    fee_code = db.Column(db.String(50), nullable=False, index=True)
    applies_to_classification_id = db.Column(db.Integer, db.ForeignKey('aircraft_classifications.id'), nullable=False)
    
    # Fee amount and calculation
    amount = db.Column(db.Numeric(10, 2), nullable=False)
    currency = db.Column(db.String(3), nullable=False, default='USD')
    is_taxable = db.Column(db.Boolean, nullable=False, default=True)
    is_potentially_waivable_by_fuel_uplift = db.Column(db.Boolean, nullable=False, default=False)
    calculation_basis = db.Column(db.Enum(CalculationBasis), nullable=False, default=CalculationBasis.NOT_APPLICABLE)
    
    # Waiver strategy
    waiver_strategy = db.Column(db.Enum(WaiverStrategy), nullable=False, default=WaiverStrategy.NONE)
    simple_waiver_multiplier = db.Column(db.Numeric(5, 2), nullable=True, default=1.0)
    
    # CAA overrides
    has_caa_override = db.Column(db.Boolean, nullable=False, default=False)
    caa_override_amount = db.Column(db.Numeric(10, 2), nullable=True)
    caa_waiver_strategy_override = db.Column(db.Enum(WaiverStrategy), nullable=True)
    caa_simple_waiver_multiplier_override = db.Column(db.Numeric(5, 2), nullable=True)
    
    # Primary fee flag for UI display
    # NOTE: This column is deprecated. With the new override system using FeeRuleOverride,
    # classification-specific defaults are stored as overrides rather than duplicate FeeRule records.
    # This column can be removed in a future migration.
    is_primary_fee = db.Column(db.Boolean, nullable=False, default=False, server_default='f')
    
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    classification = db.relationship('AircraftClassification', backref='fee_rules')

    def to_dict(self):
        return {
            'id': self.id,
            'fee_name': self.fee_name,
            'fee_code': self.fee_code,
            'applies_to_aircraft_classification_id': self.applies_to_classification_id,
            'amount': str(self.amount),
            'currency': self.currency,
            'is_taxable': self.is_taxable,
            'is_potentially_waivable_by_fuel_uplift': self.is_potentially_waivable_by_fuel_uplift,
            'calculation_basis': self.calculation_basis.value if self.calculation_basis else None,
            'waiver_strategy': self.waiver_strategy.value if self.waiver_strategy else None,
            'simple_waiver_multiplier': str(self.simple_waiver_multiplier) if self.simple_waiver_multiplier else None,
            'has_caa_override': self.has_caa_override,
            'caa_override_amount': str(self.caa_override_amount) if self.caa_override_amount else None,
            'caa_waiver_strategy_override': self.caa_waiver_strategy_override.value if self.caa_waiver_strategy_override else None,
            'caa_simple_waiver_multiplier_override': str(self.caa_simple_waiver_multiplier_override) if self.caa_simple_waiver_multiplier_override else None,
            'is_primary_fee': self.is_primary_fee,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat()
        }

    def __repr__(self):
        return f'<FeeRule {self.fee_code} - {self.fee_name}>' 