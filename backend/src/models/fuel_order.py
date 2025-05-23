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

    def __repr__(self):
        return f'<FuelOrder {self.id} - {self.tail_number}>' 