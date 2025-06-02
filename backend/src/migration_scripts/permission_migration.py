"""
Permission System Migration Script
Migrates from role-based to permission-based system while maintaining backward compatibility.
"""

from datetime import datetime
from sqlalchemy import text
from sqlalchemy.orm import sessionmaker
from src.extensions import db
from src.models import User, Role, Permission, PermissionGroup, UserPermission
from src.models.user_permission_group import UserPermissionGroup
from src.models.permission_group import permission_group_permissions
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class PermissionMigration:
    """Handles migration from role-based to permission-based system."""
    
    def __init__(self):
        self.session = db.session
        self.migration_log = []
        
    def log_action(self, action, details=None):
        """Log migration actions for audit trail."""
        log_entry = {
            'timestamp': datetime.utcnow(),
            'action': action,
            'details': details or {}
        }
        self.migration_log.append(log_entry)
        logger.info(f"Migration: {action} - {details}")
    
    def create_default_permission_groups(self):
        """Create default permission groups based on existing roles."""
        self.log_action("Starting permission group creation")
        
        # Define default permission groups with their permissions
        default_groups = [
            {
                'name': 'Administrator_Default_Permissions',
                'description': 'Full administrative access with all permissions',
                'category': 'admin',
                'permissions': [
                    'access_admin_panel', 'manage_permission_groups', 'assign_direct_permissions', 'view_audit_trail',
                    'view_user_list', 'view_user_profile', 'create_user', 'edit_user_profile', 'deactivate_user', 'assign_permissions',
                    'view_fuel_orders', 'create_fuel_order', 'edit_any_order', 'delete_fuel_order', 'review_orders',
                    'access_csr_module', 'export_order_data', 'view_order_statistics',
                    'access_fueler_module', 'start_fueling_task', 'update_fueling_status', 'complete_own_order',
                    'manage_fuel_trucks', 'manage_aircraft_data', 'manage_customer_data'
                ]
            },
            {
                'name': 'CSR_Default_Permissions',
                'description': 'Customer Service Representative permissions for order management',
                'category': 'csr',
                'permissions': [
                    'access_csr_module', 'view_fuel_orders', 'create_fuel_order', 'edit_own_order',
                    'export_order_data', 'view_order_statistics', 'review_orders'
                ]
            },
            {
                'name': 'LST_Default_Permissions',
                'description': 'Line Service Technician permissions for fueling operations',
                'category': 'fueler',
                'permissions': [
                    'access_fueler_module', 'view_fuel_orders', 'start_fueling_task',
                    'update_fueling_status', 'complete_own_order'
                ]
            },
            {
                'name': 'Member_Default_Permissions',
                'description': 'Basic member permissions for viewing own orders',
                'category': 'member',
                'permissions': [
                    'view_fuel_orders', 'create_fuel_order', 'edit_own_order'
                ]
            }
        ]
        
        created_groups = []
        
        for group_data in default_groups:
            # Check if group already exists
            existing_group = PermissionGroup.query.filter_by(name=group_data['name']).first()
            if existing_group:
                self.log_action(f"Permission group already exists: {group_data['name']}")
                continue
            
            # Create new permission group
            new_group = PermissionGroup(
                name=group_data['name'],
                description=group_data['description'],
                category=group_data['category'],
                is_system_group=True,
                created_by_migration=True
            )
            
            self.session.add(new_group)
            self.session.flush()  # Get the ID
            
            # Add permissions to the group
            for perm_name in group_data['permissions']:
                permission = Permission.query.filter_by(name=perm_name).first()
                if permission:
                    # Check if association already exists
                    existing_assoc = self.session.query(permission_group_permissions).filter_by(
                        permission_group_id=new_group.id,
                        permission_id=permission.id
                    ).first()
                    
                    if not existing_assoc:
                        # Create association
                        stmt = permission_group_permissions.insert().values(
                            permission_group_id=new_group.id,
                            permission_id=permission.id
                        )
                        self.session.execute(stmt)
                else:
                    self.log_action(f"Warning: Permission '{perm_name}' not found for group '{group_data['name']}'")
            
            created_groups.append(new_group)
            self.log_action(f"Created permission group: {group_data['name']}")
        
        self.session.commit()
        self.log_action(f"Created {len(created_groups)} permission groups")
        return created_groups
    
    def migrate_user_permissions(self):
        """Migrate users from roles to permission groups and direct permissions."""
        self.log_action("Starting user permission migration")
        
        # Get all users with roles
        users_with_roles = User.query.join(User.roles).all()
        migrated_users = 0
        
        # Role to permission group mapping
        role_to_group_mapping = {
            'System Administrator': 'Administrator_Default_Permissions',
            'Customer Service Representative': 'CSR_Default_Permissions',
            'Line Service Technician': 'LST_Default_Permissions',
            'Member': 'Member_Default_Permissions'
        }
        
        for user in users_with_roles:
            user_roles = list(user.roles)
            self.log_action(f"Migrating user: {user.username}", {
                'user_id': user.id,
                'current_roles': [role.name for role in user_roles]
            })
            
            # Assign permission groups based on roles
            for role in user_roles:
                group_name = role_to_group_mapping.get(role.name)
                if group_name:
                    permission_group = PermissionGroup.query.filter_by(name=group_name).first()
                    if permission_group:
                        # Check if user is already in this group
                        existing_assignment = UserPermissionGroup.query.filter_by(
                            user_id=user.id,
                            permission_group_id=permission_group.id
                        ).first()
                        
                        if not existing_assignment:
                            user_group_assignment = UserPermissionGroup(
                                user_id=user.id,
                                permission_group_id=permission_group.id,
                                assigned_by_migration=True,
                                assigned_at=datetime.utcnow()
                            )
                            self.session.add(user_group_assignment)
                            
                            self.log_action(f"Assigned user to permission group", {
                                'user_id': user.id,
                                'group_name': group_name,
                                'original_role': role.name
                            })
                        else:
                            self.log_action(f"User already in permission group: {group_name}")
                else:
                    self.log_action(f"Warning: No permission group mapping for role: {role.name}")
            
            migrated_users += 1
        
        self.session.commit()
        self.log_action(f"Migrated {migrated_users} users to permission groups")
        return migrated_users
    
    def create_enhanced_permissions(self):
        """Create enhanced granular permissions for the new system."""
        self.log_action("Creating enhanced granular permissions")
        
        enhanced_permissions = [
            # Enhanced Fuel Order Permissions
            {'name': 'view_own_orders', 'description': 'View own fuel orders only', 'category': 'fuel_orders', 'resource_type': 'fuel_order', 'action': 'read', 'scope': 'own'},
            {'name': 'view_all_orders', 'description': 'View all fuel orders', 'category': 'fuel_orders', 'resource_type': 'fuel_order', 'action': 'read', 'scope': 'any'},
            {'name': 'create_fuel_order', 'description': 'Create new fuel orders', 'category': 'fuel_orders', 'resource_type': 'fuel_order', 'action': 'create', 'scope': 'any'},
            {'name': 'edit_own_orders', 'description': 'Edit own fuel orders', 'category': 'fuel_orders', 'resource_type': 'fuel_order', 'action': 'update', 'scope': 'own'},
            {'name': 'edit_any_order', 'description': 'Edit any fuel order', 'category': 'fuel_orders', 'resource_type': 'fuel_order', 'action': 'update', 'scope': 'any'},
            {'name': 'delete_fuel_order', 'description': 'Delete fuel orders', 'category': 'fuel_orders', 'resource_type': 'fuel_order', 'action': 'delete', 'scope': 'any'},
            {'name': 'complete_own_order', 'description': 'Complete own assigned orders', 'category': 'fuel_orders', 'resource_type': 'fuel_order', 'action': 'complete', 'scope': 'own'},
            {'name': 'review_orders', 'description': 'Review and approve orders', 'category': 'fuel_orders', 'resource_type': 'fuel_order', 'action': 'review', 'scope': 'any'},
            
            # Enhanced User Management Permissions
            {'name': 'view_user_list', 'description': 'View list of users', 'category': 'users', 'resource_type': 'user', 'action': 'read', 'scope': 'any'},
            {'name': 'view_user_profile', 'description': 'View user profile details', 'category': 'users', 'resource_type': 'user', 'action': 'read', 'scope': 'any'},
            {'name': 'create_user', 'description': 'Create new users', 'category': 'users', 'resource_type': 'user', 'action': 'create', 'scope': 'any'},
            {'name': 'edit_user_profile', 'description': 'Edit user profile information', 'category': 'users', 'resource_type': 'user', 'action': 'update', 'scope': 'any'},
            {'name': 'deactivate_user', 'description': 'Deactivate user accounts', 'category': 'users', 'resource_type': 'user', 'action': 'deactivate', 'scope': 'any'},
            {'name': 'assign_permissions', 'description': 'Assign permissions to users', 'category': 'users', 'resource_type': 'user', 'action': 'manage_permissions', 'scope': 'any'},
            
            # Enhanced Admin Permissions
            {'name': 'access_admin_panel', 'description': 'Access administrative interface', 'category': 'admin', 'resource_type': 'global', 'action': 'access', 'scope': 'any'},
            {'name': 'manage_permission_groups', 'description': 'Create and manage permission groups', 'category': 'admin', 'resource_type': 'permission_group', 'action': 'manage', 'scope': 'any'},
            {'name': 'assign_direct_permissions', 'description': 'Assign direct permissions to users', 'category': 'admin', 'resource_type': 'user_permission', 'action': 'manage', 'scope': 'any'},
            {'name': 'view_audit_trail', 'description': 'View permission audit trail', 'category': 'admin', 'resource_type': 'audit', 'action': 'read', 'scope': 'any'},
            
            # Enhanced CSR Permissions
            {'name': 'access_csr_module', 'description': 'Access CSR dashboard and functions', 'category': 'csr', 'resource_type': 'global', 'action': 'access', 'scope': 'any'},
            {'name': 'export_order_data', 'description': 'Export order data to CSV/Excel', 'category': 'csr', 'resource_type': 'fuel_order', 'action': 'export', 'scope': 'any'},
            {'name': 'view_order_statistics', 'description': 'View order statistics and reports', 'category': 'csr', 'resource_type': 'fuel_order', 'action': 'view_stats', 'scope': 'any'},
            
            # Enhanced Fueler Permissions
            {'name': 'access_fueler_module', 'description': 'Access fueler dashboard and functions', 'category': 'fueler', 'resource_type': 'global', 'action': 'access', 'scope': 'any'},
            {'name': 'start_fueling_task', 'description': 'Start assigned fueling tasks', 'category': 'fueler', 'resource_type': 'fuel_order', 'action': 'start', 'scope': 'own'},
            {'name': 'update_fueling_status', 'description': 'Update status of fueling tasks', 'category': 'fueler', 'resource_type': 'fuel_order', 'action': 'update_status', 'scope': 'own'},
            
            # Resource Management Permissions
            {'name': 'manage_fuel_trucks', 'description': 'Manage fuel truck inventory', 'category': 'resources', 'resource_type': 'fuel_truck', 'action': 'manage', 'scope': 'any'},
            {'name': 'manage_aircraft_data', 'description': 'Manage aircraft information', 'category': 'resources', 'resource_type': 'aircraft', 'action': 'manage', 'scope': 'any'},
            {'name': 'manage_customer_data', 'description': 'Manage customer information', 'category': 'resources', 'resource_type': 'customer', 'action': 'manage', 'scope': 'any'},
        ]
        
        created_permissions = []
        
        for perm_data in enhanced_permissions:
            # Check if permission already exists
            existing_perm = Permission.query.filter_by(name=perm_data['name']).first()
            if existing_perm:
                self.log_action(f"Enhanced permission already exists: {perm_data['name']}")
                continue
            
            # Create new enhanced permission
            new_permission = Permission(
                name=perm_data['name'],
                description=perm_data['description'],
                category=perm_data['category'],
                resource_type=perm_data.get('resource_type'),
                action=perm_data.get('action'),
                scope=perm_data.get('scope'),
                is_system_permission=True,
                requires_resource_context=perm_data.get('scope') == 'own'
            )
            
            self.session.add(new_permission)
            created_permissions.append(new_permission)
            
            self.log_action(f"Created enhanced permission: {perm_data['name']}")
        
        self.session.commit()
        self.log_action(f"Created {len(created_permissions)} enhanced permissions")
        return created_permissions
    
    def validate_migration(self):
        """Validate the migration integrity."""
        self.log_action("Starting migration validation")
        
        validation_results = {
            'users_with_groups': 0,
            'users_without_groups': 0,
            'permission_groups_created': 0,
            'enhanced_permissions_created': 0,
            'validation_errors': []
        }
        
        # Check users have permission groups
        all_users = User.query.all()
        for user in all_users:
            user_groups = UserPermissionGroup.query.filter_by(user_id=user.id).count()
            if user_groups > 0:
                validation_results['users_with_groups'] += 1
            else:
                validation_results['users_without_groups'] += 1
                validation_results['validation_errors'].append(f"User {user.username} has no permission groups")
        
        # Count permission groups
        validation_results['permission_groups_created'] = PermissionGroup.query.filter_by(created_by_migration=True).count()
        
        # Count enhanced permissions
        validation_results['enhanced_permissions_created'] = Permission.query.filter_by(is_system_permission=True).count()
        
        self.log_action("Migration validation completed", validation_results)
        return validation_results
    
    def run_full_migration(self):
        """Run the complete migration process."""
        self.log_action("Starting full permission system migration")
        
        try:
            # Step 1: Create enhanced permissions
            enhanced_permissions = self.create_enhanced_permissions()
            
            # Step 2: Create default permission groups
            permission_groups = self.create_default_permission_groups()
            
            # Step 3: Migrate user permissions
            migrated_users = self.migrate_user_permissions()
            
            # Step 4: Validate migration
            validation_results = self.validate_migration()
            
            self.log_action("Migration completed successfully", {
                'enhanced_permissions': len(enhanced_permissions),
                'permission_groups': len(permission_groups),
                'migrated_users': migrated_users,
                'validation': validation_results
            })
            
            return {
                'success': True,
                'migration_log': self.migration_log,
                'validation_results': validation_results
            }
            
        except Exception as e:
            self.log_action(f"Migration failed: {str(e)}")
            self.session.rollback()
            return {
                'success': False,
                'error': str(e),
                'migration_log': self.migration_log
            }
    
    def generate_migration_report(self):
        """Generate a detailed migration report."""
        report = {
            'migration_timestamp': datetime.utcnow().isoformat(),
            'total_actions': len(self.migration_log),
            'actions': self.migration_log,
            'summary': {
                'permission_groups': PermissionGroup.query.filter_by(created_by_migration=True).count(),
                'enhanced_permissions': Permission.query.filter_by(is_system_permission=True).count(),
                'users_migrated': UserPermissionGroup.query.filter_by(assigned_by_migration=True).count()
            }
        }
        return report


def run_migration():
    """Main function to run the permission migration."""
    migration = PermissionMigration()
    result = migration.run_full_migration()
    
    if result['success']:
        print("✅ Migration completed successfully!")
        report = migration.generate_migration_report()
        print(f"📊 Migration Report:")
        print(f"   - Permission Groups Created: {report['summary']['permission_groups']}")
        print(f"   - Enhanced Permissions Created: {report['summary']['enhanced_permissions']}")
        print(f"   - Users Migrated: {report['summary']['users_migrated']}")
    else:
        print(f"❌ Migration failed: {result['error']}")
    
    return result


if __name__ == "__main__":
    run_migration() 