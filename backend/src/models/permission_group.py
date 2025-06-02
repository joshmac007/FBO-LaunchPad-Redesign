from datetime import datetime
from sqlalchemy import Integer, String, Text, DateTime, Boolean, ForeignKey
from ..extensions import db

# Junction table for permission group to permission relationships
permission_group_permissions = db.Table('permission_group_permissions',
    db.Column('permission_group_id', Integer, ForeignKey('permission_groups.id'), primary_key=True),
    db.Column('permission_id', Integer, ForeignKey('permissions.id'), primary_key=True)
)

# Junction table for user to permission group relationships
user_permission_groups = db.Table('user_permission_groups',
    db.Column('user_id', Integer, ForeignKey('users.id'), primary_key=True),
    db.Column('permission_group_id', Integer, ForeignKey('permission_groups.id'), primary_key=True)
)

class PermissionGroup(db.Model):
    """
    Permission groups provide template functionality for organizing permissions.
    They replace the rigid role system with flexible, composable permission sets.
    """
    __tablename__ = 'permission_groups'

    id = db.Column(Integer, primary_key=True)
    name = db.Column(String(100), unique=True, nullable=False, index=True)
    description = db.Column(Text, nullable=True)
    
    # Group categorization and hierarchy
    category = db.Column(String(50), nullable=True, default='custom')  # e.g., 'system', 'department', 'custom'
    parent_group_id = db.Column(Integer, ForeignKey('permission_groups.id'), nullable=True)
    
    # Group status and metadata
    is_active = db.Column(Boolean, default=True, nullable=False)
    is_system_group = db.Column(Boolean, default=False, nullable=False)  # System groups cannot be deleted
    sort_order = db.Column(Integer, default=0, nullable=False)  # For UI ordering
    created_by_migration = db.Column(Boolean, default=False, nullable=False)  # Track migration-created groups
    
    # Audit fields
    created_by_user_id = db.Column(Integer, ForeignKey('users.id'), nullable=True)
    created_at = db.Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    permissions = db.relationship(
        'Permission',
        secondary=permission_group_permissions,
        backref=db.backref('permission_groups', lazy='dynamic'),
        lazy='dynamic'
    )
    
    users = db.relationship(
        'User',
        secondary=user_permission_groups,
        backref=db.backref('permission_groups', lazy='dynamic'),
        lazy='dynamic'
    )
    
    # Self-referential relationship for hierarchy
    parent_group = db.relationship('PermissionGroup', remote_side=[id], backref='child_groups')
    created_by = db.relationship('User', foreign_keys=[created_by_user_id])

    def get_all_permissions(self, include_inherited=True):
        """
        Get all permissions for this group, optionally including inherited permissions.
        
        Args:
            include_inherited (bool): Whether to include permissions from parent groups
            
        Returns:
            list: List of Permission objects
        """
        permissions = list(self.permissions.all())
        
        if include_inherited and self.parent_group:
            parent_permissions = self.parent_group.get_all_permissions(include_inherited=True)
            # Combine and deduplicate
            permission_ids = {p.id for p in permissions}
            for perm in parent_permissions:
                if perm.id not in permission_ids:
                    permissions.append(perm)
                    permission_ids.add(perm.id)
        
        return permissions

    def has_permission(self, permission_name, include_inherited=True):
        """
        Check if this group has a specific permission.
        
        Args:
            permission_name (str): Name of the permission to check
            include_inherited (bool): Whether to check parent groups
            
        Returns:
            bool: True if the group has the permission
        """
        # Check direct permissions
        if self.permissions.filter_by(name=permission_name).first():
            return True
        
        # Check inherited permissions
        if include_inherited and self.parent_group:
            return self.parent_group.has_permission(permission_name, include_inherited=True)
        
        return False

    def add_permission(self, permission):
        """Add a permission to this group."""
        if not self.permissions.filter_by(id=permission.id).first():
            self.permissions.append(permission)

    def remove_permission(self, permission):
        """Remove a permission from this group."""
        if self.permissions.filter_by(id=permission.id).first():
            self.permissions.remove(permission)

    def get_user_count(self):
        """Get the number of users assigned to this group."""
        return self.users.count()

    def to_dict(self, include_permissions=False, include_users=False):
        """Convert to dictionary for API responses."""
        result = {
            'id': self.id,
            'name': self.name,
            'description': self.description,
            'category': self.category,
            'parent_group_id': self.parent_group_id,
            'is_active': self.is_active,
            'is_system_group': self.is_system_group,
            'sort_order': self.sort_order,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'user_count': self.get_user_count()
        }
        
        if include_permissions:
            result['permissions'] = [
                {
                    'id': p.id,
                    'name': p.name,
                    'description': p.description,
                    'category': p.category
                }
                for p in self.get_all_permissions()
            ]
            result['direct_permissions'] = [
                {
                    'id': p.id,
                    'name': p.name,
                    'description': p.description,
                    'category': p.category
                }
                for p in self.permissions.all()
            ]
        
        if include_users:
            result['users'] = [
                {
                    'id': u.id,
                    'username': u.username,
                    'email': u.email,
                    'name': u.name
                }
                for u in self.users.all()
            ]
        
        return result

    def __repr__(self):
        return f'<PermissionGroup {self.name}>' 