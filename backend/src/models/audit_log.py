from datetime import datetime
from sqlalchemy import Integer, String, DateTime, ForeignKey, JSON, Text
from ..extensions import db


class AuditLog(db.Model):
    """
    Generic audit log model for tracking manual changes and other auditable actions.
    This model is designed to be reusable for various entity types.
    """
    __tablename__ = 'audit_logs'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, index=True)
    entity_type = db.Column(db.String(50), nullable=False, index=True)  # e.g., 'FuelOrder'
    entity_id = db.Column(db.Integer, nullable=False, index=True)
    action = db.Column(db.String(100), nullable=False)  # e.g., 'MANUAL_STATUS_UPDATE'
    details = db.Column(db.JSON, nullable=True)  # Flexible JSON field for action-specific data
    timestamp = db.Column(db.DateTime, nullable=False, default=datetime.utcnow, index=True)

    # Relationships
    user = db.relationship('User', backref=db.backref('audit_logs', lazy='dynamic'))

    def __init__(self, user_id, entity_type, entity_id, action, details=None):
        self.user_id = user_id
        self.entity_type = entity_type
        self.entity_id = entity_id
        self.action = action
        self.details = details

    def to_dict(self):
        """Convert audit log object to dictionary for JSON serialization."""
        return {
            'id': self.id,
            'user_id': self.user_id,
            'entity_type': self.entity_type,
            'entity_id': self.entity_id,
            'action': self.action,
            'details': self.details,
            'timestamp': self.timestamp.isoformat() if self.timestamp else None
        }

    def __repr__(self):
        return f'<AuditLog {self.id} - {self.action} on {self.entity_type}:{self.entity_id}>' 