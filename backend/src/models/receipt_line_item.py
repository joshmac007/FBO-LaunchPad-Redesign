from datetime import datetime
from ..extensions import db
import enum


class LineItemType(enum.Enum):
    FUEL = 'FUEL'
    FEE = 'FEE'
    WAIVER = 'WAIVER'
    TAX = 'TAX'
    DISCOUNT = 'DISCOUNT'


class WaiverSource(enum.Enum):
    AUTOMATIC = 'AUTOMATIC'
    MANUAL = 'MANUAL'


class ReceiptLineItem(db.Model):
    """Model representing individual line items within a receipt.
    Supports different types of charges including fuel, fees, waivers, taxes, and discounts."""
    
    __tablename__ = 'receipt_line_items'

    id = db.Column(db.Integer, primary_key=True)
    receipt_id = db.Column(db.Integer, db.ForeignKey('receipts.id'), nullable=False)
    line_item_type = db.Column(db.Enum(LineItemType), nullable=False)
    description = db.Column(db.String(200), nullable=False)
    fee_code_applied = db.Column(db.String(50), nullable=True)  # Reference to fee_rules.fee_code
    quantity = db.Column(db.Numeric(10, 2), nullable=False, default=1.0)
    unit_price = db.Column(db.Numeric(10, 4), nullable=False)
    amount = db.Column(db.Numeric(10, 2), nullable=False)  # Can be negative for waivers/discounts
    waiver_source = db.Column(db.Enum(WaiverSource), nullable=True)  # Source of waiver: AUTOMATIC or MANUAL
    
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'receipt_id': self.receipt_id,
            'line_item_type': self.line_item_type.value if self.line_item_type else None,
            'description': self.description,
            'fee_code_applied': self.fee_code_applied,
            'quantity': str(self.quantity),
            'unit_price': str(self.unit_price),
            'amount': str(self.amount),
            'waiver_source': self.waiver_source.value if self.waiver_source else None,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat()
        }

    def __repr__(self):
        return f'<ReceiptLineItem {self.line_item_type.value if self.line_item_type else "Unknown"}: {self.description} - ${self.amount}>' 