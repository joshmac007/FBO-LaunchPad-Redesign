#!/usr/bin/env python3
"""
Migration Script: Permission Groups Database Schema
Creates database tables for permission groups and initial data population.

This script is designed to run AFTER seeds.py and uses the snake_case permission 
names established by seeds.py. It creates permission groups and assigns roles to groups,
establishing permission_groups_schema.py as the source of truth for group definitions
and role-to-group assignments.

Sequence: seeds.py (permissions, roles, users) -> permission_groups_schema.py (groups, assignments)
"""

import sys
import os
import logging
from datetime import datetime
from sqlalchemy.exc import IntegrityError, OperationalError

# Add the backend directory to path
backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, backend_dir)

from src.extensions import db
from src.models.permission_group import PermissionGroup, PermissionGroupMembership, RolePermissionGroup
from src.models.permission import Permission
from src.models.role import Role

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

def create_permission_groups_schema():
    """Create the permission groups database schema."""
    try:
        logger.info("Creating permission groups database schema...")
        
        # Create tables
        db.create_all()
        
        logger.info("✅ Permission groups schema created successfully")
        return True
        
    except Exception as e:
        logger.error(f"❌ Failed to create schema: {e}")
        return False

def create_system_permission_groups():
    """Create system permission groups with hierarchical structure."""
    try:
        logger.info("Creating system permission groups...")
        
        # Define system permission groups
        system_groups = [
            {
                'name': 'fuel_operations_basic',
                'display_name': 'Fuel Operations - Basic',
                'description': 'Basic fuel operations permissions for LST staff',
                'is_system_group': True,
                'sort_order': 100,
                'permissions': ['create_fuel_order', 'view_assigned_orders', 'update_order_status', 'complete_fuel_order', 'perform_fueling_task']
            },
            {
                'name': 'fuel_operations_advanced',
                'display_name': 'Fuel Operations - Advanced',
                'description': 'Advanced fuel operations permissions for supervisors and CSR',
                'parent': 'fuel_operations_basic',
                'is_system_group': True,
                'sort_order': 110,
                'permissions': ['view_all_orders', 'edit_fuel_order', 'assign_fuel_order', 
                              'review_fuel_order', 'export_orders_csv', 'view_order_statistics']
            },
            {
                'name': 'user_management_basic',
                'display_name': 'User Management - Basic',
                'description': 'Basic user management permissions',
                'is_system_group': True,
                'sort_order': 200,
                'permissions': ['view_users']
            },
            {
                'name': 'user_management_advanced',
                'display_name': 'User Management - Advanced',
                'description': 'Advanced user management permissions for administrators',
                'parent': 'user_management_basic',
                'is_system_group': True,
                'sort_order': 210,
                'permissions': ['manage_users']
            },
            {
                'name': 'aircraft_management_basic',
                'display_name': 'Aircraft Management - Basic',
                'description': 'Basic aircraft management permissions',
                'is_system_group': True,
                'sort_order': 300,
                'permissions': ['view_aircraft']
            },
            {
                'name': 'aircraft_management_advanced',
                'display_name': 'Aircraft Management - Advanced',
                'description': 'Advanced aircraft management permissions',
                'parent': 'aircraft_management_basic',
                'is_system_group': True,
                'sort_order': 310,
                'permissions': ['manage_aircraft']
            },
            {
                'name': 'customer_management_basic',
                'display_name': 'Customer Management - Basic',
                'description': 'Basic customer management permissions',
                'is_system_group': True,
                'sort_order': 400,
                'permissions': ['view_customers']
            },
            {
                'name': 'customer_management_advanced',
                'display_name': 'Customer Management - Advanced',
                'description': 'Advanced customer management permissions',
                'parent': 'customer_management_basic',
                'is_system_group': True,
                'sort_order': 410,
                'permissions': ['manage_customers']
            },
            {
                'name': 'fleet_management_basic',
                'display_name': 'Fleet Management - Basic',
                'description': 'Basic fleet and truck management permissions',
                'is_system_group': True,
                'sort_order': 500,
                'permissions': ['view_fuel_trucks']
            },
            {
                'name': 'fleet_management_advanced',
                'display_name': 'Fleet Management - Advanced',
                'description': 'Advanced fleet and truck management permissions',
                'parent': 'fleet_management_basic',
                'is_system_group': True,
                'sort_order': 510,
                'permissions': ['manage_fuel_trucks']
            },
            {
                'name': 'receipts_management_basic',
                'display_name': 'Receipts Management - Basic',
                'description': 'Basic receipt viewing permissions',
                'is_system_group': True,
                'sort_order': 550,
                'permissions': ['view_own_receipts']
            },
            {
                'name': 'receipts_management_advanced',
                'display_name': 'Receipts Management - Advanced',
                'description': 'Advanced receipt management permissions',
                'parent': 'receipts_management_basic',
                'is_system_group': True,
                'sort_order': 560,
                'permissions': ['view_receipts', 'view_all_receipts', 'create_receipt', 'update_receipt', 
                             'calculate_receipt_fees', 'generate_receipt', 'mark_receipt_paid', 
                             'manage_receipts', 'export_receipts_csv', 'void_receipt']
            },
            {
                'name': 'billing_operations',
                'display_name': 'Billing Operations',
                'description': 'Billing and fee calculation permissions',
                'is_system_group': True,
                'sort_order': 570,
                'permissions': ['view_billing_info', 'calculate_fees', 'manage_fbo_fee_schedules', 'manage_fuel_prices']
            },
            {
                'name': 'dashboard_access_member',
                'display_name': 'Dashboard Access - Member',
                'description': 'Member dashboard access',
                'is_system_group': True,
                'sort_order': 600,
                'permissions': ['access_member_dashboard']
            },
            {
                'name': 'dashboard_access_fueler',
                'display_name': 'Dashboard Access - Fueler',
                'description': 'Fueler dashboard access',
                'is_system_group': True,
                'sort_order': 610,
                'permissions': ['access_fueler_dashboard']
            },
            {
                'name': 'dashboard_access_csr',
                'display_name': 'Dashboard Access - CSR',
                'description': 'CSR dashboard access',
                'is_system_group': True,
                'sort_order': 620,
                'permissions': ['access_csr_dashboard']
            },
            {
                'name': 'dashboard_access_admin',
                'display_name': 'Dashboard Access - Admin',
                'description': 'Admin dashboard access',
                'is_system_group': True,
                'sort_order': 630,
                'permissions': ['access_admin_dashboard']
            },
            {
                'name': 'administrative_operations',
                'display_name': 'Administrative Operations',
                'description': 'System administration and configuration permissions',
                'is_system_group': True,
                'sort_order': 700,
                'permissions': ['manage_roles', 'view_roles', 'view_permissions', 
                             'view_role_permissions', 'manage_settings', 'admin',
                             'administrative_operations']
            }
        ]
        
        # Create groups in two passes to handle parent relationships
        groups_created = {}
        
        # First pass: Create parent groups
        for group_def in system_groups:
            if 'parent' not in group_def:
                group = PermissionGroup(
                    name=group_def['name'],
                    display_name=group_def['display_name'],
                    description=group_def['description'],
                    is_system_group=group_def['is_system_group'],
                    sort_order=group_def['sort_order']
                )
                
                try:
                    db.session.add(group)
                    db.session.flush()  # Get the ID
                    groups_created[group_def['name']] = group
                    logger.info(f"✅ Created parent group: {group_def['name']}")
                except IntegrityError:
                    db.session.rollback()
                    existing_group = PermissionGroup.query.filter_by(name=group_def['name']).first()
                    if existing_group:
                        groups_created[group_def['name']] = existing_group
                        logger.info(f"📋 Group already exists: {group_def['name']}")
        
        # Second pass: Create child groups
        for group_def in system_groups:
            if 'parent' in group_def:
                parent_group = groups_created.get(group_def['parent'])
                if not parent_group:
                    logger.error(f"❌ Parent group not found: {group_def['parent']}")
                    continue
                
                group = PermissionGroup(
                    name=group_def['name'],
                    display_name=group_def['display_name'],
                    description=group_def['description'],
                    parent_id=parent_group.id,
                    is_system_group=group_def['is_system_group'],
                    sort_order=group_def['sort_order']
                )
                
                try:
                    db.session.add(group)
                    db.session.flush()
                    groups_created[group_def['name']] = group
                    logger.info(f"✅ Created child group: {group_def['name']} (parent: {group_def['parent']})")
                except IntegrityError:
                    db.session.rollback()
                    existing_group = PermissionGroup.query.filter_by(name=group_def['name']).first()
                    if existing_group:
                        groups_created[group_def['name']] = existing_group
                        logger.info(f"📋 Group already exists: {group_def['name']}")
        
        # Third pass: Add permissions to groups
        for group_def in system_groups:
            group = groups_created.get(group_def['name'])
            if not group:
                logger.error(f"❌ Group not found for permissions: {group_def['name']}")
                continue
                
            for perm_name in group_def['permissions']:
                permission = Permission.query.filter_by(name=perm_name).first()
                if not permission:
                    logger.warning(f"⚠️  Permission not found: {perm_name}")
                    continue
                
                # Check if membership already exists
                existing_membership = PermissionGroupMembership.query.filter_by(
                    group_id=group.id,
                    permission_id=permission.id
                ).first()
                
                if not existing_membership:
                    membership = PermissionGroupMembership(
                        group_id=group.id,
                        permission_id=permission.id,
                        is_active=True
                    )
                    db.session.add(membership)
                    logger.info(f"✅ Added permission '{perm_name}' to group '{group_def['name']}'")
                else:
                    logger.info(f"📋 Permission '{perm_name}' already in group '{group_def['name']}'")
        
        db.session.commit()
        logger.info(f"✅ Created {len(groups_created)} permission groups successfully")
        return True
        
    except Exception as e:
        db.session.rollback()
        logger.error(f"❌ Failed to create system permission groups: {e}")
        return False

def assign_groups_to_roles():
    """Assign permission groups to existing roles."""
    try:
        logger.info("Assigning permission groups to roles...")
        
        # Define role-group assignments
        role_group_assignments = [
            {
                'role_name': 'System Administrator',
                'groups': ['fuel_operations_advanced', 'user_management_advanced', 
                          'aircraft_management_advanced', 'customer_management_advanced',
                          'fleet_management_advanced', 'receipts_management_advanced',
                          'billing_operations', 'dashboard_access_admin', 'dashboard_access_csr', 
                          'administrative_operations']
            },
            {
                'role_name': 'Customer Service Representative',
                'groups': ['fuel_operations_advanced', 'aircraft_management_advanced',
                          'customer_management_advanced', 'user_management_basic',
                          'fleet_management_basic', 'receipts_management_advanced', 
                          'billing_operations', 'dashboard_access_csr']
            },
            {
                'role_name': 'Line Service Technician',
                'groups': ['fuel_operations_basic', 'receipts_management_basic', 'dashboard_access_fueler']
            },
            {
                'role_name': 'Member',
                'groups': ['dashboard_access_member', 'receipts_management_basic']
            }
        ]
        
        assignments_created = 0
        
        for assignment in role_group_assignments:
            role = Role.query.filter_by(name=assignment['role_name']).first()
            if not role:
                logger.warning(f"⚠️  Role not found: {assignment['role_name']}")
                continue
            
            for group_name in assignment['groups']:
                group = PermissionGroup.query.filter_by(name=group_name).first()
                if not group:
                    logger.warning(f"⚠️  Group not found: {group_name}")
                    continue
                
                # Check if assignment already exists
                existing_assignment = RolePermissionGroup.query.filter_by(
                    role_id=role.id,
                    group_id=group.id
                ).first()
                
                if not existing_assignment:
                    role_group = RolePermissionGroup(
                        role_id=role.id,
                        group_id=group.id,
                        is_active=True
                    )
                    db.session.add(role_group)
                    assignments_created += 1
                    logger.info(f"✅ Assigned group '{group_name}' to role '{assignment['role_name']}'")
                else:
                    logger.info(f"📋 Group '{group_name}' already assigned to role '{assignment['role_name']}'")
        
        db.session.commit()
        logger.info(f"✅ Created {assignments_created} new role-group assignments")
        return True
        
    except Exception as e:
        db.session.rollback()
        logger.error(f"❌ Failed to assign groups to roles: {e}")
        return False

def verify_permission_groups_setup():
    """Verify the permission groups setup."""
    try:
        logger.info("Verifying permission groups setup...")
        
        # Count groups
        total_groups = PermissionGroup.query.count()
        system_groups = PermissionGroup.query.filter_by(is_system_group=True).count()
        active_groups = PermissionGroup.query.filter_by(is_active=True).count()
        
        # Count memberships
        total_memberships = PermissionGroupMembership.query.count()
        active_memberships = PermissionGroupMembership.query.filter_by(is_active=True).count()
        
        # Count role assignments
        total_assignments = RolePermissionGroup.query.count()
        active_assignments = RolePermissionGroup.query.filter_by(is_active=True).count()
        
        # Check hierarchical structure
        parent_groups = PermissionGroup.query.filter(PermissionGroup.parent_id.is_(None)).count()
        child_groups = PermissionGroup.query.filter(PermissionGroup.parent_id.isnot(None)).count()
        
        logger.info(f"📊 Permission Groups Summary:")
        logger.info(f"   Total groups: {total_groups}")
        logger.info(f"   System groups: {system_groups}")
        logger.info(f"   Active groups: {active_groups}")
        logger.info(f"   Parent groups: {parent_groups}")
        logger.info(f"   Child groups: {child_groups}")
        logger.info(f"   Permission memberships: {active_memberships}/{total_memberships}")
        logger.info(f"   Role assignments: {active_assignments}/{total_assignments}")
        
        # Test hierarchical permission resolution
        advanced_fuel_group = PermissionGroup.query.filter_by(name='fuel_operations_advanced').first()
        if advanced_fuel_group:
            all_permissions = advanced_fuel_group.get_all_permissions()
            direct_permissions = [gp.permission.name for gp in advanced_fuel_group.group_permissions if gp.is_active]
            logger.info(f"   Advanced fuel operations group:")
            logger.info(f"     Direct permissions: {len(direct_permissions)}")
            logger.info(f"     Total permissions (with inheritance): {len(all_permissions)}")
        
        return True
        
    except Exception as e:
        logger.error(f"❌ Failed to verify setup: {e}")
        return False

def run_migration(dry_run=False):
    """Run the complete permission groups migration."""
    logger.info("🚀 PERMISSION GROUPS MIGRATION - Integration with seeds.py")
    logger.info("📝 Using snake_case permission names from seeds.py")
    logger.info("=" * 60)
    
    if dry_run:
        logger.info("🔍 DRY RUN MODE - No changes will be made")
        return True
    
    success_steps = 0
    total_steps = 4
    
    try:
        # Step 1: Create schema
        logger.info("\n📋 Step 1: Creating database schema...")
        if create_permission_groups_schema():
            success_steps += 1
        
        # Step 2: Create system groups
        logger.info("\n📋 Step 2: Creating system permission groups...")
        if create_system_permission_groups():
            success_steps += 1
        
        # Step 3: Assign groups to roles
        logger.info("\n📋 Step 3: Assigning groups to roles...")
        if assign_groups_to_roles():
            success_steps += 1
        
        # Step 4: Verify setup
        logger.info("\n📋 Step 4: Verifying setup...")
        if verify_permission_groups_setup():
            success_steps += 1
        
        # Summary
        logger.info(f"\n" + "=" * 60)
        logger.info(f"📊 MIGRATION SUMMARY: {success_steps}/{total_steps} steps completed")
        
        if success_steps == total_steps:
            logger.info("🎉 PERMISSION GROUPS MIGRATION COMPLETED SUCCESSFULLY!")
            logger.info("✨ Features now available:")
            logger.info("   • Hierarchical permission groups")
            logger.info("   • Role-group assignments")
            logger.info("   • Permission inheritance")
            logger.info("   • Database-backed group management")
            return True
        else:
            logger.error("❌ Migration completed with errors")
            return False
            
    except Exception as e:
        logger.error(f"❌ Migration failed: {e}")
        return False

if __name__ == '__main__':
    import argparse
    
    parser = argparse.ArgumentParser(description='Permission Groups Migration Script')
    parser.add_argument('--dry-run', action='store_true', 
                       help='Run in dry-run mode (no changes made)')
    parser.add_argument('--verify-only', action='store_true',
                       help='Only verify existing setup')
    
    args = parser.parse_args()
    
    if args.verify_only:
        success = verify_permission_groups_setup()
    else:
        success = run_migration(dry_run=args.dry_run)
    
    exit(0 if success else 1) 