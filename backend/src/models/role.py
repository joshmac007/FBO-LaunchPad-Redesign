from datetime import datetime
from sqlalchemy import Integer, String, Text, DateTime
from ..extensions import db
from .role_permission import role_permissions

class Role(db.Model):
    __tablename__ = 'roles'

    id = db.Column(Integer, primary_key=True)
    name = db.Column(String(80), unique=True, nullable=False, index=True)
    description = db.Column(Text, nullable=True)
    created_at = db.Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    permissions = db.relationship(
        'Permission',
        secondary=role_permissions,
        backref=db.backref('roles', lazy='dynamic'),
        lazy='dynamic'
    )

    def __repr__(self):
        return f'<Role {self.name}>'
