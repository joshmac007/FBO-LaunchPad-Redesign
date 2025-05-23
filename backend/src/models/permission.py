from src.extensions import db
from sqlalchemy import Integer, String, Text, DateTime
from datetime import datetime

class Permission(db.Model):
    __tablename__ = 'permissions'

    id = db.Column(Integer, primary_key=True)
    name = db.Column(String(100), unique=True, nullable=False, index=True)
    description = db.Column(Text, nullable=True)
    created_at = db.Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    def __repr__(self):
        return f'<Permission {self.name}>'
