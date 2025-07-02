from datetime import datetime
from ..extensions import db

class FeeScheduleVersion(db.Model):
    __tablename__ = 'fee_schedule_versions'

    id = db.Column(db.Integer, primary_key=True)
    version_name = db.Column(db.String(255), nullable=False)
    description = db.Column(db.Text, nullable=True)
    configuration_data = db.Column(db.JSON, nullable=False)
    version_type = db.Column(db.String(50), nullable=False, default='manual')  # 'manual', 'pre_import_backup'
    created_by_user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    expires_at = db.Column(db.DateTime, nullable=True)  # For temporary backups
    
    # Relationships
    created_by = db.relationship('User', backref='fee_schedule_versions')
    
    def to_dict(self):
        """Convert version object to dictionary."""
        return {
            'id': self.id,
            'version_name': self.version_name,
            'description': self.description,
            'version_type': self.version_type,
            'created_by_user_id': self.created_by_user_id,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'expires_at': self.expires_at.isoformat() if self.expires_at else None,
            'created_by_username': self.created_by.username if self.created_by else None
        }
    
    def __repr__(self):
        return f'<FeeScheduleVersion {self.id}: {self.version_name}>'