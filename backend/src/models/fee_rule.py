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
    """Model representing global fee rules.
    After refactoring, all FeeRule records are global with a unique fee_code.
    Classification-specific and aircraft-specific fees are handled via FeeRuleOverride."""
    
    __tablename__ = 'fee_rules'
    __table_args__ = (
        db.UniqueConstraint('fee_code', name='uq_fee_rules_fee_code'),
    )

    id = db.Column(db.Integer, primary_key=True)
    fee_name = db.Column(db.String(100), nullable=False)
    fee_code = db.Column(db.String(50), nullable=False, index=True)
    
    # Fee amount and calculation
    amount = db.Column(db.Numeric(10, 2), nullable=False)
    currency = db.Column(db.String(3), nullable=False, default='USD')
    is_taxable = db.Column(db.Boolean, nullable=False, default=True)
    is_manually_waivable = db.Column(db.Boolean, nullable=False, default=False)
    calculation_basis = db.Column(db.Enum(CalculationBasis), nullable=False, default=CalculationBasis.NOT_APPLICABLE)
    
    # Waiver strategy
    waiver_strategy = db.Column(db.Enum(WaiverStrategy), nullable=False, default=WaiverStrategy.NONE)
    simple_waiver_multiplier = db.Column(db.Numeric(5, 2), nullable=True, default=1.0)
    
    # CAA overrides
    has_caa_override = db.Column(db.Boolean, nullable=False, default=False)
    caa_override_amount = db.Column(db.Numeric(10, 2), nullable=True)
    caa_waiver_strategy_override = db.Column(db.Enum(WaiverStrategy), nullable=True)
    caa_simple_waiver_multiplier_override = db.Column(db.Numeric(5, 2), nullable=True)
    
    
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships - none needed for global rules

    def to_dict(self):
        return {
            'id': self.id,
            'fee_name': self.fee_name,
            'fee_code': self.fee_code,
            'amount': float(self.amount),
            'currency': self.currency,
            'is_taxable': self.is_taxable,
            'is_manually_waivable': self.is_manually_waivable,
            'calculation_basis': self.calculation_basis.value if self.calculation_basis else None,
            'waiver_strategy': self.waiver_strategy.value if self.waiver_strategy else None,
            'simple_waiver_multiplier': float(self.simple_waiver_multiplier) if self.simple_waiver_multiplier else None,
            'has_caa_override': self.has_caa_override,
            'caa_override_amount': float(self.caa_override_amount) if self.caa_override_amount else None,
            'caa_waiver_strategy_override': self.caa_waiver_strategy_override.value if self.caa_waiver_strategy_override else None,
            'caa_simple_waiver_multiplier_override': float(self.caa_simple_waiver_multiplier_override) if self.caa_simple_waiver_multiplier_override else None,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat()
        }

    def __repr__(self):
        return f'<FeeRule {self.fee_code} - {self.fee_name}>' 