import enum
from datetime import datetime
from sqlalchemy import Integer, String, Boolean, DateTime, Enum, Text, Numeric, ForeignKey
from sqlalchemy.ext.hybrid import hybrid_property
from ..extensions import db

class FuelOrderStatus(enum.Enum):
    DISPATCHED = 'Dispatched'
    ACKNOWLEDGED = 'Acknowledged'
    EN_ROUTE = 'En Route'
    FUELING = 'Fueling'
    COMPLETED = 'Completed'
    REVIEWED = 'Reviewed'
    CANCELLED = 'Cancelled'

class FuelOrder(db.Model):
    __tablename__ = 'fuel_orders'

    # Primary Key
    id = db.Column(db.Integer, primary_key=True)

    # Status and Core Fields
    status = db.Column(db.Enum(FuelOrderStatus), nullable=False, default=FuelOrderStatus.DISPATCHED, index=True)
    tail_number = db.Column(db.String(20), db.ForeignKey('aircraft.tail_number'), nullable=False, index=True)
    customer_id = db.Column(db.Integer, db.ForeignKey('customers.id'), nullable=True)
    fuel_type = db.Column(db.String(50), nullable=False)
    additive_requested = db.Column(db.Boolean, default=False)
    requested_amount = db.Column(db.Numeric(10, 2), nullable=True)

    # Assignment Fields
    assigned_lst_user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True, index=True)
    assigned_truck_id = db.Column(db.Integer, db.ForeignKey('fuel_trucks.id'), nullable=True, index=True)
    location_on_ramp = db.Column(db.String(100), nullable=True)
    
    # Notes Fields
    csr_notes = db.Column(db.Text, nullable=True)
    lst_notes = db.Column(db.Text, nullable=True)

    # Metering Fields
    start_meter_reading = db.Column(db.Numeric(12, 2), nullable=True)
    end_meter_reading = db.Column(db.Numeric(12, 2), nullable=True)
    
    # Change Tracking & Final Amounts
    change_version = db.Column(db.Integer, nullable=False, default=0, server_default='0')
    acknowledged_change_version = db.Column(db.Integer, nullable=False, default=0, server_default='0')
    gallons_dispensed = db.Column(db.Numeric(10, 2), nullable=True)

    # Timestamps
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)
    dispatch_timestamp = db.Column(db.DateTime, nullable=True)
    acknowledge_timestamp = db.Column(db.DateTime, nullable=True)
    en_route_timestamp = db.Column(db.DateTime, nullable=True)
    fueling_start_timestamp = db.Column(db.DateTime, nullable=True)
    completion_timestamp = db.Column(db.DateTime, nullable=True)
    reviewed_timestamp = db.Column(db.DateTime, nullable=True)
    
    # Review Fields
    reviewed_by_csr_user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)

    # Relationships
    aircraft = db.relationship('Aircraft', backref=db.backref('fuel_orders', lazy='dynamic'))
    customer = db.relationship('Customer', backref=db.backref('fuel_orders', lazy='dynamic'))
    assigned_lst = db.relationship('User', foreign_keys=[assigned_lst_user_id], 
                                 backref=db.backref('assigned_fuel_orders', lazy='dynamic'))
    assigned_truck = db.relationship('FuelTruck', backref=db.backref('fuel_orders', lazy='dynamic'))
    reviewed_by_csr = db.relationship('User', foreign_keys=[reviewed_by_csr_user_id], 
                                    backref=db.backref('reviewed_fuel_orders', lazy='dynamic'))

    @hybrid_property
    def calculated_gallons_dispensed(self):
        if self.start_meter_reading is not None and self.end_meter_reading is not None:
            return float(self.end_meter_reading - self.start_meter_reading)
        return None

    @hybrid_property
    def has_pending_changes(self):
        """Check if there are unacknowledged CSR changes."""
        return self.change_version > self.acknowledged_change_version

    def to_dict(self):
        """Convert fuel order object to dictionary for JSON serialization."""
        return {
            'id': self.id,
            'tail_number': self.tail_number,
            'aircraft_registration': self.tail_number,  # Frontend expects this field name
            'customer_id': self.customer_id,
            'customer_name': self.customer.name if self.customer else None,  # Add customer name for frontend
            'fuel_type': self.fuel_type,
            'additive_requested': self.additive_requested,
            'requested_amount': str(self.requested_amount) if self.requested_amount else None,
            'gallons_requested': float(self.requested_amount) if self.requested_amount else None,  # Frontend expects this
            'assigned_lst_user_id': self.assigned_lst_user_id,
            'assigned_to_id': self.assigned_lst_user_id,  # Frontend field mapping
            'assigned_truck_id': self.assigned_truck_id,
            'location_on_ramp': self.location_on_ramp,
            'csr_notes': self.csr_notes,
            'lst_notes': self.lst_notes,
            'notes': self.lst_notes or self.csr_notes,  # Frontend expects generic notes field
            'status': self.status.value,
            'service_type': 'Fuel Service',  # Default service type for frontend
            'priority': 'NORMAL',  # Default priority for frontend
            'fuel_delivered': str(self.fuel_delivered) if hasattr(self, 'fuel_delivered') and self.fuel_delivered else None,
            'start_meter_reading': str(self.start_meter_reading) if self.start_meter_reading else None,
            'end_meter_reading': str(self.end_meter_reading) if self.end_meter_reading else None,
            'calculated_gallons_dispensed': str(self.calculated_gallons_dispensed) if self.calculated_gallons_dispensed else None,
            'change_version': self.change_version,
            'gallons_dispensed': str(self.gallons_dispensed) if self.gallons_dispensed else None,
            'dispatch_timestamp': self.dispatch_timestamp.isoformat() if self.dispatch_timestamp else None,
            'acknowledge_timestamp': self.acknowledge_timestamp.isoformat() if self.acknowledge_timestamp else None,
            'en_route_timestamp': self.en_route_timestamp.isoformat() if self.en_route_timestamp else None,
            'fueling_start_timestamp': self.fueling_start_timestamp.isoformat() if self.fueling_start_timestamp else None,
            'completion_timestamp': self.completion_timestamp.isoformat() if self.completion_timestamp else None,
            'review_timestamp': self.reviewed_timestamp.isoformat() if self.reviewed_timestamp else None,
            'reviewed_by_csr_user_id': self.reviewed_by_csr_user_id,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }

    def __repr__(self):
        return f'<FuelOrder {self.id} - {self.tail_number}>' 