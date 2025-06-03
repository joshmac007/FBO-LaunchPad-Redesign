"""
Permission Group Model for Enhanced Authorization System
Supports hierarchical permission groups with parent-child relationships.
"""

from ..extensions import db
from sqlalchemy.orm import validates
from datetime import datetime

class PermissionGroup(db.Model):
    """
    Permission groups for organizing and managing related permissions.
    Supports hierarchical structure with parent-child relationships.
    """
    
    __tablename__ = 'permission_groups'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(50), unique=True, nullable=False, index=True)
    display_name = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text)
    
    # Hierarchical structure
    parent_id = db.Column(db.Integer, db.ForeignKey('permission_groups.id'), nullable=True)
    parent = db.relationship('PermissionGroup', remote_side=[id], backref='children')
    
    # Group properties
    is_active = db.Column(db.Boolean, default=True, nullable=False)
    is_system_group = db.Column(db.Boolean, default=False, nullable=False)  # System groups cannot be deleted
    sort_order = db.Column(db.Integer, default=0, nullable=False)
    
    # Timestamps
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    
    # Relationships
    group_permissions = db.relationship('PermissionGroupMembership', back_populates='group', cascade='all, delete-orphan')
    role_groups = db.relationship('RolePermissionGroup', back_populates='group', cascade='all, delete-orphan')
    
    @validates('name')
    def validate_name(self, key, name):
        """Validate group name format."""
        if not name:
            raise ValueError("Group name is required")
        if not name.replace('_', '').replace('-', '').isalnum():
            raise ValueError("Group name must contain only letters, numbers, underscores, and hyphens")
        return name.lower()
    
    def get_all_permissions(self):
        """Get all permissions for this group including inherited from parent groups."""
        permissions = set()
        
        # Get direct permissions
        for group_perm in self.group_permissions:
            if group_perm.is_active:
                permissions.add(group_perm.permission.name)
        
        # Get inherited permissions from parent
        if self.parent:
            permissions.update(self.parent.get_all_permissions())
            
        return list(permissions)
    
    def get_permission_ids(self):
        """Get all permission IDs for this group including inherited."""
        permission_ids = set()
        
        # Get direct permission IDs
        for group_perm in self.group_permissions:
            if group_perm.is_active:
                permission_ids.add(group_perm.permission_id)
        
        # Get inherited permission IDs from parent
        if self.parent:
            permission_ids.update(self.parent.get_permission_ids())
            
        return list(permission_ids)
    
    def has_permission(self, permission_name):
        """Check if this group has a specific permission (including inherited)."""
        return permission_name in self.get_all_permissions()
    
    def get_hierarchy_path(self):
        """Get the full hierarchy path from root to this group."""
        path = [self.name]
        current = self.parent
        while current:
            path.insert(0, current.name)
            current = current.parent
        return ' > '.join(path)
    
    def get_descendant_groups(self):
        """Get all descendant groups (children, grandchildren, etc.)."""
        descendants = []
        for child in self.children:
            descendants.append(child)
            descendants.extend(child.get_descendant_groups())
        return descendants
    
    def is_ancestor_of(self, other_group):
        """Check if this group is an ancestor of another group."""
        current = other_group.parent
        while current:
            if current.id == self.id:
                return True
            current = current.parent
        return False
    
    def can_delete(self):
        """Check if this group can be deleted."""
        if self.is_system_group:
            return False, "System groups cannot be deleted"
        
        if self.children:
            return False, "Cannot delete group with child groups"
            
        if self.role_groups:
            return False, "Cannot delete group assigned to roles"
            
        return True, "Group can be deleted"
    
    def to_dict(self, include_permissions=False, include_children=False):
        """Convert group to dictionary representation."""
        data = {
            'id': self.id,
            'name': self.name,
            'display_name': self.display_name,
            'description': self.description,
            'parent_id': self.parent_id,
            'parent_name': self.parent.name if self.parent else None,
            'is_active': self.is_active,
            'is_system_group': self.is_system_group,
            'sort_order': self.sort_order,
            'hierarchy_path': self.get_hierarchy_path(),
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }
        
        if include_permissions:
            data['permissions'] = self.get_all_permissions()
            data['direct_permissions'] = [gp.permission.name for gp in self.group_permissions if gp.is_active]
        
        if include_children:
            data['children'] = [child.to_dict() for child in self.children if child.is_active]
            
        return data
    
    def __repr__(self):
        return f'<PermissionGroup {self.name}>'

class PermissionGroupMembership(db.Model):
    """
    Junction table for permission groups and permissions.
    Allows fine-grained control over permission-group relationships.
    """
    
    __tablename__ = 'permission_group_memberships'
    
    id = db.Column(db.Integer, primary_key=True)
    group_id = db.Column(db.Integer, db.ForeignKey('permission_groups.id'), nullable=False)
    permission_id = db.Column(db.Integer, db.ForeignKey('permissions.id'), nullable=False)
    
    # Membership properties
    is_active = db.Column(db.Boolean, default=True, nullable=False)
    granted_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    granted_by_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    
    # Relationships
    group = db.relationship('PermissionGroup', back_populates='group_permissions')
    permission = db.relationship('Permission')
    granted_by = db.relationship('User')
    
    # Unique constraint
    __table_args__ = (
        db.UniqueConstraint('group_id', 'permission_id', name='uq_group_permission'),
    )
    
    def to_dict(self):
        """Convert membership to dictionary representation."""
        return {
            'id': self.id,
            'group_id': self.group_id,
            'group_name': self.group.name,
            'permission_id': self.permission_id,
            'permission_name': self.permission.name,
            'is_active': self.is_active,
            'granted_at': self.granted_at.isoformat() if self.granted_at else None,
            'granted_by': self.granted_by.username if self.granted_by else None
        }
    
    def __repr__(self):
        return f'<PermissionGroupMembership {self.group.name}:{self.permission.name}>'

class RolePermissionGroup(db.Model):
    """
    Junction table for roles and permission groups.
    Allows roles to be assigned permission groups for simplified management.
    """
    
    __tablename__ = 'role_permission_groups'
    
    id = db.Column(db.Integer, primary_key=True)
    role_id = db.Column(db.Integer, db.ForeignKey('roles.id'), nullable=False)
    group_id = db.Column(db.Integer, db.ForeignKey('permission_groups.id'), nullable=False)
    
    # Assignment properties
    is_active = db.Column(db.Boolean, default=True, nullable=False)
    assigned_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    assigned_by_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    
    # Relationships
    role = db.relationship('Role')
    group = db.relationship('PermissionGroup', back_populates='role_groups')
    assigned_by = db.relationship('User')
    
    # Unique constraint
    __table_args__ = (
        db.UniqueConstraint('role_id', 'group_id', name='uq_role_group'),
    )
    
    def to_dict(self):
        """Convert role-group assignment to dictionary representation."""
        return {
            'id': self.id,
            'role_id': self.role_id,
            'role_name': self.role.name,
            'group_id': self.group_id,
            'group_name': self.group.name,
            'is_active': self.is_active,
            'assigned_at': self.assigned_at.isoformat() if self.assigned_at else None,
            'assigned_by': self.assigned_by.username if self.assigned_by else None
        }
    
    def __repr__(self):
        return f'<RolePermissionGroup {self.role.name}:{self.group.name}>' 