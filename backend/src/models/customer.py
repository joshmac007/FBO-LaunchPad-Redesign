from datetime import datetime
from ..extensions import db


class Customer(db.Model):
    """Model representing a customer in the system (MVP version).
    Note: This is a simplified version for MVP and will be expanded significantly in the CRM module."""
    
    __tablename__ = 'customers'

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False, index=True)
    phone = db.Column(db.String(20))
    
    # Receipt system fields
    is_placeholder = db.Column(db.Boolean, nullable=False, default=False)
    is_caa_member = db.Column(db.Boolean, nullable=False, default=False)
    caa_member_id = db.Column(db.String(50), unique=True, nullable=True)
    
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'email': self.email,
            'phone': self.phone,
            'is_placeholder': self.is_placeholder,
            'is_caa_member': self.is_caa_member,
            'caa_member_id': self.caa_member_id,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat()
        }

    def __repr__(self):
        return f'<Customer {self.name}>' 