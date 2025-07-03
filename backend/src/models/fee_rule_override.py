from ..extensions import db

class FeeRuleOverride(db.Model):
    """
    Fee rule overrides store both classification-specific and aircraft-specific fee amounts that override 
    the base FeeRule amounts in a three-tiered hierarchy: Global -> Classification -> Aircraft-Specific.
    
    This model supports two types of overrides:
    1. Classification-level overrides (classification_id set, aircraft_type_id NULL)
    2. Aircraft-specific overrides (aircraft_type_id set, classification_id NULL)
    
    The check constraint ensures exactly one of these fields is set for each override.
    """
    __tablename__ = 'fee_rule_overrides'

    id = db.Column(db.Integer, primary_key=True)
    classification_id = db.Column(db.Integer, db.ForeignKey('aircraft_classifications.id'), nullable=True) # Now nullable
    aircraft_type_id = db.Column(db.Integer, db.ForeignKey('aircraft_types.id'), nullable=True) # New column
    fee_rule_id = db.Column(db.Integer, db.ForeignKey('fee_rules.id'), nullable=False)
    override_amount = db.Column(db.Numeric(10, 2), nullable=True)
    override_caa_amount = db.Column(db.Numeric(10, 2), nullable=True)
    created_at = db.Column(db.DateTime, default=db.func.current_timestamp())
    updated_at = db.Column(db.DateTime, default=db.func.current_timestamp(), onupdate=db.func.current_timestamp())
    
    __table_args__ = (
        db.UniqueConstraint('classification_id', 'fee_rule_id', name='_classification_fee_rule_uc'),
        db.UniqueConstraint('aircraft_type_id', 'fee_rule_id', name='_aircraft_type_fee_rule_uc'), # New constraint for aircraft overrides
        db.CheckConstraint(
            '(classification_id IS NOT NULL AND aircraft_type_id IS NULL) OR (classification_id IS NULL AND aircraft_type_id IS NOT NULL)',
            name='ck_override_target'
        ),
    )

    def to_dict(self):
        return {
            'id': self.id,
            'classification_id': self.classification_id,
            'aircraft_type_id': self.aircraft_type_id,
            'fee_rule_id': self.fee_rule_id,
            'override_amount': float(self.override_amount) if self.override_amount is not None else None,
            'override_caa_amount': float(self.override_caa_amount) if self.override_caa_amount is not None else None,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat()
        } 