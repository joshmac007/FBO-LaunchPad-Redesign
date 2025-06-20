from datetime import datetime
from sqlalchemy import Integer, String, Text, DateTime
from ..extensions import db

class Role(db.Model):
    __tablename__ = 'roles'

    id = db.Column(Integer, primary_key=True)
    name = db.Column(String(80), unique=True, nullable=False, index=True)
    description = db.Column(Text, nullable=True)
    created_at = db.Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Legacy role-permission relationship removed - using permission groups system
    
    # New role-permission group relationships
    role_permission_groups = db.relationship('RolePermissionGroup', back_populates='role', cascade='all, delete-orphan')
    
    def get_permission_groups(self):
        """Get all active permission groups assigned to this role."""
        return [rpg.group for rpg in self.role_permission_groups if rpg.is_active and rpg.group.is_active]
    
    def get_all_permissions(self):
        """Get all permissions from permission groups."""
        all_permissions = set()
        
        # Get permissions from permission groups (Golden Path architecture)
        for group in self.get_permission_groups():
            group_permissions = group.get_all_permissions()
            all_permissions.update(group_permissions)
        
        return list(all_permissions)
    
    def has_permission(self, permission_name):
        """Check if this role has a specific permission (from groups or direct assignment)."""
        return permission_name in self.get_all_permissions()

    def __repr__(self):
        return f'<Role {self.name}>'
