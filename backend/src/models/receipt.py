from datetime import datetime
from ..extensions import db
import enum


class ReceiptStatus(enum.Enum):
    DRAFT = 'DRAFT'
    GENERATED = 'GENERATED'
    PAID = 'PAID'
    VOID = 'VOID'


class Receipt(db.Model):
    """Model representing receipts generated from fuel orders.
    Stores snapshot data and calculated totals with support for CAA member pricing."""
    
    __tablename__ = 'receipts'
    __table_args__ = (
        db.UniqueConstraint('receipt_number', name='_receipt_number_uc'),
    )

    id = db.Column(db.Integer, primary_key=True)
    receipt_number = db.Column(db.String(50), nullable=True, index=True)  # Null for drafts, assigned when generated
    fuel_order_id = db.Column(db.Integer, db.ForeignKey('fuel_orders.id'), nullable=True, index=True)  # Nullable for manual receipts
    customer_id = db.Column(db.Integer, db.ForeignKey('customers.id'), nullable=False)
    
    # Snapshot data from receipt generation time
    aircraft_type_at_receipt_time = db.Column(db.String(100), nullable=True)
    fuel_type_at_receipt_time = db.Column(db.String(50), nullable=True)
    fuel_quantity_gallons_at_receipt_time = db.Column(db.Numeric(10, 2), nullable=True)
    fuel_unit_price_at_receipt_time = db.Column(db.Numeric(10, 4), nullable=True)
    
    # Calculated totals
    fuel_subtotal = db.Column(db.Numeric(10, 2), nullable=False, default=0.00)
    total_fees_amount = db.Column(db.Numeric(10, 2), nullable=False, default=0.00)
    total_waivers_amount = db.Column(db.Numeric(10, 2), nullable=False, default=0.00)  # Negative amount
    tax_amount = db.Column(db.Numeric(10, 2), nullable=False, default=0.00)
    grand_total_amount = db.Column(db.Numeric(10, 2), nullable=False, default=0.00)
    
    # Receipt status and metadata
    status = db.Column(db.Enum(ReceiptStatus), nullable=False, default=ReceiptStatus.DRAFT)
    is_caa_applied = db.Column(db.Boolean, nullable=False, default=False)
    
    # Timestamps
    generated_at = db.Column(db.DateTime, nullable=True)  # Set when status changes to GENERATED
    paid_at = db.Column(db.DateTime, nullable=True)  # Set when status changes to PAID
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # User tracking
    created_by_user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    updated_by_user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)

    # Relationships
    fuel_order = db.relationship('FuelOrder', backref='receipts')
    customer = db.relationship('Customer', backref='receipts')
    created_by_user = db.relationship('User', foreign_keys=[created_by_user_id], backref='created_receipts')
    updated_by_user = db.relationship('User', foreign_keys=[updated_by_user_id], backref='updated_receipts')
    line_items = db.relationship('ReceiptLineItem', backref='receipt', cascade='all, delete-orphan')

    def to_dict(self):
        return {
            'id': self.id,
            'receipt_number': self.receipt_number,
            'fuel_order_id': self.fuel_order_id,
            'customer_id': self.customer_id,
            'fuel_order_tail_number': self.fuel_order.tail_number if self.fuel_order else None,
            'aircraft_type_at_receipt_time': self.aircraft_type_at_receipt_time,
            'fuel_type_at_receipt_time': self.fuel_type_at_receipt_time,
            'fuel_quantity_gallons_at_receipt_time': str(self.fuel_quantity_gallons_at_receipt_time) if self.fuel_quantity_gallons_at_receipt_time else None,
            'fuel_unit_price_at_receipt_time': str(self.fuel_unit_price_at_receipt_time) if self.fuel_unit_price_at_receipt_time else None,
            'fuel_subtotal': str(self.fuel_subtotal),
            'total_fees_amount': str(self.total_fees_amount),
            'total_waivers_amount': str(self.total_waivers_amount),
            'tax_amount': str(self.tax_amount),
            'grand_total_amount': str(self.grand_total_amount),
            'status': self.status.value if self.status else None,
            'is_caa_applied': self.is_caa_applied,
            'generated_at': self.generated_at.isoformat() if self.generated_at else None,
            'paid_at': self.paid_at.isoformat() if self.paid_at else None,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat(),
            'created_by_user_id': self.created_by_user_id,
            'updated_by_user_id': self.updated_by_user_id
        }

    def __repr__(self):
        return f'<Receipt {self.receipt_number} - {self.status.value if self.status else "Unknown"}>' 