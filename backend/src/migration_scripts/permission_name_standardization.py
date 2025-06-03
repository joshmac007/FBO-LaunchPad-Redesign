#!/usr/bin/env python3
"""
Permission Name Standardization Migration Script
Phase 3 of Authorization System Consolidation

This script updates permission names from UPPERCASE to snake_case convention
to align with the enhanced authorization system implemented in Phase 2.

Usage:
    python permission_name_standardization.py [--dry-run] [--rollback]
    
Options:
    --dry-run: Show what would be changed without making actual changes
    --rollback: Revert changes back to UPPERCASE naming
"""

import sys
import os
import argparse
from datetime import datetime

# Add the backend directory to path so we can import modules correctly
backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, backend_dir)

# Now we can import Flask and create app to get proper context
from flask import Flask
import logging

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Permission name mapping: OLD_NAME -> new_name
PERMISSION_NAME_MAPPING = {
    # Fuel Orders
    'CREATE_ORDER': 'create_fuel_order',
    'VIEW_ASSIGNED_ORDERS': 'view_assigned_orders',
    'VIEW_ALL_ORDERS': 'view_any_fuel_order',  # More descriptive
    'UPDATE_OWN_ORDER_STATUS': 'update_order_status',
    'COMPLETE_OWN_ORDER': 'complete_fuel_order',
    'REVIEW_ORDERS': 'review_orders',
    'EXPORT_ORDERS_CSV': 'export_orders_csv',
    'VIEW_ORDER_STATS': 'view_order_statistics',
    'EDIT_FUEL_ORDER': 'edit_fuel_order',
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
    
    # System/Admin
    'MANAGE_ROLES': 'manage_roles',
    'VIEW_PERMISSIONS': 'view_permissions',
    'MANAGE_SETTINGS': 'manage_settings',
    
    # Dashboard Access
    'ACCESS_ADMIN_DASHBOARD': 'access_admin_dashboard',
    'ACCESS_CSR_DASHBOARD': 'access_csr_dashboard',
    'ACCESS_FUELER_DASHBOARD': 'access_fueler_dashboard',
    'ACCESS_MEMBER_DASHBOARD': 'access_member_dashboard',
    
    # Billing/Fees
    'VIEW_BILLING_INFO': 'view_billing_info',
    'CALCULATE_FEES': 'calculate_fees',
    
    # Receipts
    'VIEW_ALL_RECEIPTS': 'view_all_receipts',
    'VIEW_OWN_RECEIPTS': 'view_own_receipts',
    'MANAGE_RECEIPTS': 'manage_receipts',
    'EXPORT_RECEIPTS_CSV': 'export_receipts_csv',
}

# Additional permissions that may need to be added for enhanced functionality
NEW_PERMISSIONS = [
    {
        'name': 'view_roles',
        'description': 'Allows viewing role list and details',
        'category': 'system'
    },
    {
        'name': 'view_role_permissions',
        'description': 'Allows viewing permissions assigned to roles',
        'category': 'system'
    },
    {
        'name': 'admin',
        'description': 'Administrative access for deprecated endpoints',
        'category': 'system'
    }
]

def create_app():
    """Create and configure Flask application for migration."""
    app = Flask(__name__)
    
    # Load configuration
    app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get('DATABASE_URL', 'postgresql://localhost/fbo_launchpad_dev')
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    
    # Initialize extensions
    from src.extensions import db
    db.init_app(app)
    
    return app, db

def get_permission_stats(db):
    """Get current permission statistics."""
    from src.models.permission import Permission
    all_permissions = Permission.query.all()
    uppercase_count = len([p for p in all_permissions if p.name.isupper()])
    snake_case_count = len([p for p in all_permissions if '_' in p.name and p.name.islower()])
    
    return {
        'total': len(all_permissions),
        'uppercase': uppercase_count,
        'snake_case': snake_case_count,
        'mixed': len(all_permissions) - uppercase_count - snake_case_count
    }

def dry_run_migration(db):
    """Show what would be changed without making actual changes."""
    logger.info("=== DRY RUN MODE - No changes will be made ===")
    
    from src.models.permission import Permission
    
    stats = get_permission_stats(db)
    logger.info(f"Current permission stats: {stats}")
    
    # Check existing permissions
    existing_permissions = {p.name: p for p in Permission.query.all()}
    
    logger.info("\n--- Permission Name Changes ---")
    changes_planned = 0
    for old_name, new_name in PERMISSION_NAME_MAPPING.items():
        if old_name in existing_permissions:
            logger.info(f"  RENAME: '{old_name}' -> '{new_name}'")
            changes_planned += 1
        else:
            logger.warning(f"  MISSING: '{old_name}' not found in database")
    
    logger.info(f"\n--- New Permissions to Add ---")
    for perm in NEW_PERMISSIONS:
        if perm['name'] not in existing_permissions:
            logger.info(f"  ADD: '{perm['name']}' - {perm['description']}")
        else:
            logger.info(f"  EXISTS: '{perm['name']}' already exists")
    
    logger.info(f"\nSummary: {changes_planned} permission renames planned")
    return changes_planned > 0

def perform_migration(db):
    """Perform the actual migration from UPPERCASE to snake_case permissions."""
    logger.info("=== STARTING PERMISSION NAME STANDARDIZATION MIGRATION ===")
    
    from src.models.permission import Permission
    
    try:
        # Get initial stats
        initial_stats = get_permission_stats(db)
        logger.info(f"Initial permission stats: {initial_stats}")
        
        changes_made = 0
        errors = []
        
        # Step 1: Rename existing permissions
        logger.info("\n--- Step 1: Renaming existing permissions ---")
        for old_name, new_name in PERMISSION_NAME_MAPPING.items():
            try:
                permission = Permission.query.filter_by(name=old_name).first()
                if permission:
                    # Check if new name already exists
                    existing_new = Permission.query.filter_by(name=new_name).first()
                    if existing_new:
                        logger.warning(f"  SKIP: '{new_name}' already exists, skipping rename of '{old_name}'")
                        continue
                    
                    logger.info(f"  RENAMING: '{old_name}' -> '{new_name}'")
                    permission.name = new_name
                    changes_made += 1
                else:
                    logger.warning(f"  NOT FOUND: '{old_name}' not found in database")
            except Exception as e:
                error_msg = f"Error renaming '{old_name}': {str(e)}"
                logger.error(f"  ERROR: {error_msg}")
                errors.append(error_msg)
        
        # Step 2: Add new permissions for enhanced functionality
        logger.info("\n--- Step 2: Adding new permissions for enhanced functionality ---")
        for perm_data in NEW_PERMISSIONS:
            try:
                existing = Permission.query.filter_by(name=perm_data['name']).first()
                if not existing:
                    logger.info(f"  ADDING: '{perm_data['name']}' - {perm_data['description']}")
                    new_permission = Permission(
                        name=perm_data['name'],
                        description=perm_data['description'],
                        category=perm_data['category']
                    )
                    db.session.add(new_permission)
                    changes_made += 1
                else:
                    logger.info(f"  EXISTS: '{perm_data['name']}' already exists")
            except Exception as e:
                error_msg = f"Error adding permission '{perm_data['name']}': {str(e)}"
                logger.error(f"  ERROR: {error_msg}")
                errors.append(error_msg)
        
        # Commit all changes
        if changes_made > 0:
            logger.info(f"\n--- Committing {changes_made} changes ---")
            db.session.commit()
            logger.info("✅ Migration completed successfully!")
        else:
            logger.info("\n--- No changes needed ---")
        
        # Get final stats
        final_stats = get_permission_stats(db)
        logger.info(f"Final permission stats: {final_stats}")
        
        # Summary
        logger.info(f"\n=== MIGRATION SUMMARY ===")
        logger.info(f"Changes made: {changes_made}")
        logger.info(f"Errors encountered: {len(errors)}")
        if errors:
            logger.error("Errors:")
            for error in errors:
                logger.error(f"  - {error}")
        
        return len(errors) == 0
        
    except Exception as e:
        logger.error(f"Critical error during migration: {str(e)}")
        db.session.rollback()
        return False

def perform_rollback(db):
    """Rollback changes - convert snake_case back to UPPERCASE."""
    logger.info("=== STARTING PERMISSION NAME ROLLBACK ===")
    
    from src.models.permission import Permission
    
    try:
        # Create reverse mapping
        reverse_mapping = {v: k for k, v in PERMISSION_NAME_MAPPING.items()}
        
        changes_made = 0
        errors = []
        
        logger.info("\n--- Rolling back permission names ---")
        for snake_case_name, uppercase_name in reverse_mapping.items():
            try:
                permission = Permission.query.filter_by(name=snake_case_name).first()
                if permission:
                    logger.info(f"  REVERTING: '{snake_case_name}' -> '{uppercase_name}'")
                    permission.name = uppercase_name
                    changes_made += 1
                else:
                    logger.warning(f"  NOT FOUND: '{snake_case_name}' not found in database")
            except Exception as e:
                error_msg = f"Error reverting '{snake_case_name}': {str(e)}"
                logger.error(f"  ERROR: {error_msg}")
                errors.append(error_msg)
        
        # Remove new permissions that were added
        logger.info("\n--- Removing new permissions ---")
        for perm_data in NEW_PERMISSIONS:
            try:
                permission = Permission.query.filter_by(name=perm_data['name']).first()
                if permission:
                    logger.info(f"  REMOVING: '{perm_data['name']}'")
                    db.session.delete(permission)
                    changes_made += 1
            except Exception as e:
                error_msg = f"Error removing permission '{perm_data['name']}': {str(e)}"
                logger.error(f"  ERROR: {error_msg}")
                errors.append(error_msg)
        
        # Commit changes
        if changes_made > 0:
            logger.info(f"\n--- Committing {changes_made} rollback changes ---")
            db.session.commit()
            logger.info("✅ Rollback completed successfully!")
        else:
            logger.info("\n--- No rollback changes needed ---")
        
        logger.info(f"\n=== ROLLBACK SUMMARY ===")
        logger.info(f"Changes made: {changes_made}")
        logger.info(f"Errors encountered: {len(errors)}")
        
        return len(errors) == 0
        
    except Exception as e:
        logger.error(f"Critical error during rollback: {str(e)}")
        db.session.rollback()
        return False

def main():
    """Main execution function."""
    parser = argparse.ArgumentParser(description="Permission Name Standardization Migration")
    parser.add_argument('--dry-run', action='store_true', help='Show changes without applying them')
    parser.add_argument('--rollback', action='store_true', help='Rollback changes to UPPERCASE naming')
    
    args = parser.parse_args()
    
    # Initialize Flask app context
    try:
        app, db = create_app()
        
        with app.app_context():
            if args.dry_run:
                dry_run_migration(db)
            elif args.rollback:
                success = perform_rollback(db)
                sys.exit(0 if success else 1)
            else:
                success = perform_migration(db)
                sys.exit(0 if success else 1)
                
    except Exception as e:
        logger.error(f"Failed to initialize application: {str(e)}")
        sys.exit(1)

if __name__ == '__main__':
    main() 