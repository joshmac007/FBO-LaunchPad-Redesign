from ..extensions import db

class FeeRuleOverride(db.Model):
    __tablename__ = 'fee_rule_overrides'

    id = db.Column(db.Integer, primary_key=True)
    aircraft_type_id = db.Column(db.Integer, db.ForeignKey('aircraft_types.id'), nullable=False)
    fee_rule_id = db.Column(db.Integer, db.ForeignKey('fee_rules.id'), nullable=False)
    override_amount = db.Column(db.Numeric(10, 2), nullable=True)
    override_caa_amount = db.Column(db.Numeric(10, 2), nullable=True)
    created_at = db.Column(db.DateTime, default=db.func.current_timestamp())
    updated_at = db.Column(db.DateTime, default=db.func.current_timestamp(), onupdate=db.func.current_timestamp())

    __table_args__ = (db.UniqueConstraint('aircraft_type_id', 'fee_rule_id', name='_aircraft_fee_rule_uc'),)

    def to_dict(self):
        return {
            "id": self.id,
            "aircraft_type_id": self.aircraft_type_id,
            "fee_rule_id": self.fee_rule_id,
            "override_amount": str(self.override_amount) if self.override_amount is not None else None,
            "override_caa_amount": str(self.override_caa_amount) if self.override_caa_amount is not None else None,
            "created_at": self.created_at.isoformat(),
            "updated_at": self.updated_at.isoformat()
        } 