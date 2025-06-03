#!/usr/bin/env python3

"""
Migration Script: Standardize Permission Names
Converts all permission names from UPPERCASE_SNAKE_CASE to snake_case in an existing database.

This script is a safety measure for existing databases that may have permission names
in the old UPPERCASE_SNAKE_CASE format. For new databases, the seeds.py script will
handle this correctly.

Usage:
    python3 standardize_permission_names.py [--dry-run]
"""

import sys
import logging
from sqlalchemy import text
from src.extensions import db
from src.models import Permission
from src.app import create_app

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Mapping from old UPPERCASE_SNAKE_CASE to new snake_case
PERMISSION_NAME_MAPPING = {
    # Fuel Orders
    'CREATE_ORDER': 'create_order',
    'VIEW_ASSIGNED_ORDERS': 'view_assigned_orders',
    'VIEW_ALL_ORDERS': 'view_all_orders',
    'UPDATE_ORDER_STATUS': 'update_order_status',
    'COMPLETE_FUEL_ORDER': 'complete_fuel_order',
    'REVIEW_ORDERS': 'review_fuel_order',  # Note: also corrected name
    'EXPORT_ORDERS_CSV': 'export_orders_csv',
    'VIEW_ORDER_STATS': 'view_order_statistics',  # Note: also corrected name
    'EDIT_FUEL_ORDER': 'edit_fuel_order',
    'ASSIGN_FUEL_ORDER': 'assign_fuel_order',
    'DELETE_FUEL_ORDER': 'delete_fuel_order',
    'PERFORM_FUELING_TASK': 'perform_fueling_task',
    
    # Users
    'VIEW_USERS': 'view_users',
    'MANAGE_USERS': 'manage_users',
    
    # Fuel Trucks
    'VIEW_FUEL_TRUCKS': 'view_fuel_trucks',
    'MANAGE_FUEL_TRUCKS': 'manage_fuel_trucks',
    
    # Aircraft
    'VIEW_AIRCRAFT': 'view_aircraft',
    'MANAGE_AIRCRAFT': 'manage_aircraft',
    
    # Customers
    'VIEW_CUSTOMERS': 'view_customers',
    'MANAGE_CUSTOMERS': 'manage_customers',
    
    # System
    'MANAGE_ROLES': 'manage_roles',
    'VIEW_PERMISSIONS': 'view_permissions',
    'VIEW_ROLE_PERMISSIONS': 'view_role_permissions',
    'VIEW_ROLES': 'view_roles',
    'MANAGE_SETTINGS': 'manage_settings',
    'ADMIN': 'admin',
    'ADMINISTRATIVE_OPERATIONS': 'administrative_operations',
    
    # Dashboard Access Permissions
    'ACCESS_ADMIN_DASHBOARD': 'access_admin_dashboard',
    'ACCESS_CSR_DASHBOARD': 'access_csr_dashboard',
    'ACCESS_FUELER_DASHBOARD': 'access_fueler_dashboard',
    'ACCESS_MEMBER_DASHBOARD': 'access_member_dashboard',
    
    # Billing/Fees Permissions
    'VIEW_BILLING_INFO': 'view_billing_info',
    'CALCULATE_FEES': 'calculate_fees',
    
    # Fuel Receipt System Permissions
    'VIEW_ALL_RECEIPTS': 'view_all_receipts',
    'VIEW_OWN_RECEIPTS': 'view_own_receipts',
    'MANAGE_RECEIPTS': 'manage_receipts',
    'EXPORT_RECEIPTS_CSV': 'export_receipts_csv',
}

def analyze_current_permissions():
    """Analyze current permission names in the database."""
    logger.info("🔍 Analyzing current permission names...")
    
    try:
        permissions = Permission.query.all()
        
        if not permissions:
            logger.info("No permissions found in database.")
            return [], []
        
        uppercase_permissions = []
        lowercase_permissions = []
        
        for perm in permissions:
            if perm.name.isupper() or '_' in perm.name and perm.name.upper() == perm.name:
                uppercase_permissions.append(perm)
            else:
                lowercase_permissions.append(perm)
        
        logger.info(f"Found {len(permissions)} total permissions:")
        logger.info(f"  - {len(uppercase_permissions)} UPPERCASE_SNAKE_CASE permissions")
        logger.info(f"  - {len(lowercase_permissions)} snake_case permissions")
        
        if uppercase_permissions:
            logger.info("UPPERCASE permissions found:")
            for perm in uppercase_permissions:
                new_name = PERMISSION_NAME_MAPPING.get(perm.name, perm.name.lower())
                logger.info(f"  - {perm.name} -> {new_name}")
        
        return uppercase_permissions, lowercase_permissions
    
    except Exception as e:
        logger.error(f"Error analyzing permissions: {e}")
        return [], []

def standardize_permission_names(dry_run=False):
    """Standardize permission names from UPPERCASE to snake_case."""
    logger.info("🚀 Starting permission name standardization...")
    
    if dry_run:
        logger.info("🔍 DRY RUN MODE - No changes will be made")
    
    try:
        uppercase_permissions, _ = analyze_current_permissions()
        
        if not uppercase_permissions:
            logger.info("✅ All permissions are already in snake_case format!")
            return True
        
        updated_count = 0
        skipped_count = 0
        
        for perm in uppercase_permissions:
            old_name = perm.name
            new_name = PERMISSION_NAME_MAPPING.get(old_name, old_name.lower())
            
            # Check if new name already exists
            existing_perm = Permission.query.filter_by(name=new_name).first()
            if existing_perm and existing_perm.id != perm.id:
                logger.warning(f"⚠️ Skipping {old_name}: {new_name} already exists")
                skipped_count += 1
                continue
            
            if not dry_run:
                logger.info(f"🔄 Updating: {old_name} -> {new_name}")
                perm.name = new_name
                updated_count += 1
            else:
                logger.info(f"🔍 Would update: {old_name} -> {new_name}")
                updated_count += 1
        
        if not dry_run and updated_count > 0:
            db.session.commit()
            logger.info(f"✅ Successfully updated {updated_count} permission names")
        elif dry_run:
            logger.info(f"🔍 Would update {updated_count} permission names")
        
        if skipped_count > 0:
            logger.warning(f"⚠️ Skipped {skipped_count} permissions due to conflicts")
        
        return True
    
    except Exception as e:
        if not dry_run:
            db.session.rollback()
        logger.error(f"❌ Error standardizing permission names: {e}")
        return False

def run_migration(dry_run=False):
    """Run the complete permission name standardization migration."""
    logger.info("=" * 60)
    logger.info("🚀 PERMISSION NAME STANDARDIZATION MIGRATION")
    logger.info("=" * 60)
    
    if dry_run:
        logger.info("🔍 DRY RUN MODE - No changes will be made")
    
    success = standardize_permission_names(dry_run)
    
    if success:
        logger.info("✅ Permission name standardization completed successfully!")
        if not dry_run:
            logger.info("🔄 Next step: Run 'flask create-permission-groups run' to refresh permission groups")
    else:
        logger.error("❌ Permission name standardization failed!")
    
    return success

def main():
    """Main entry point for the migration script."""
    import argparse
    
    parser = argparse.ArgumentParser(description='Standardize permission names from UPPERCASE to snake_case')
    parser.add_argument('--dry-run', action='store_true', 
                        help='Show what would be changed without making actual changes')
    
    args = parser.parse_args()
    
    # Create Flask app context
    app = create_app()
    with app.app_context():
        success = run_migration(dry_run=args.dry_run)
        sys.exit(0 if success else 1)

if __name__ == '__main__':
    main() 