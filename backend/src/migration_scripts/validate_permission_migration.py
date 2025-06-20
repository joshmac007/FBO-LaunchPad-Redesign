#!/usr/bin/env python3

"""
Permission Migration Validation Script
Validates that all components have been properly migrated to snake_case permissions.

This script performs comprehensive checks on:
- Backend route decorators
- Permission definitions in seeds.py
- Permission groups schema
- Frontend permission strings
- CLI commands
- Database schema consistency

Usage:
    python3 validate_permission_migration.py [--verbose]
"""

import os
import re
import sys
import json
import logging
from pathlib import Path
from typing import List, Dict, Set, Tuple

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class PermissionMigrationValidator:
    """Validates the permission migration across all components."""
    
    def __init__(self, project_root: str, verbose: bool = False):
        self.project_root = Path(project_root)
        self.verbose = verbose
        self.errors = []
        self.warnings = []
        
        # Expected snake_case permissions from seeds.py
        self.expected_permissions = {
            # Fuel Orders
            'create_order', 'view_assigned_orders', 'view_all_orders', 'update_order_status',
            'complete_fuel_order', 'review_fuel_order', 'export_orders_csv', 'view_order_statistics',
            'edit_fuel_order', 'assign_fuel_order', 'delete_fuel_order', 'perform_fueling_task',
            
            # Users
            'view_users', 'manage_users',
            
            # Fuel Trucks
            'view_fuel_trucks', 'manage_fuel_trucks',
            
            # Aircraft
            'view_aircraft', 'manage_aircraft',
            
            # Customers
            'view_customers', 'manage_customers',
            
            # System
            'manage_roles', 'view_permissions', 'view_role_permissions', 'view_roles',
            'manage_settings', 'admin', 'administrative_operations',
            
            # Dashboard Access
            'access_admin_dashboard', 'access_csr_dashboard', 'access_fueler_dashboard', 'access_member_dashboard',
            
            # Billing/Fees
            'view_billing_info', 'calculate_fees',
            
            # Receipts
            'view_all_receipts', 'view_own_receipts', 'manage_receipts', 'export_receipts_csv'
        }
    
    def log_error(self, message: str):
        """Log an error message."""
        self.errors.append(message)
        logger.error(f"❌ {message}")
    
    def log_warning(self, message: str):
        """Log a warning message."""
        self.warnings.append(message)
        logger.warning(f"⚠️ {message}")
    
    def log_info(self, message: str):
        """Log an info message."""
        if self.verbose:
            logger.info(f"ℹ️ {message}")
    
    def validate_seeds_permissions(self) -> bool:
        """Validate that seeds.py has all snake_case permissions."""
        logger.info("🔍 Validating seeds.py permissions...")
        
        seeds_file = self.project_root / "backend" / "src" / "seeds.py"
        if not seeds_file.exists():
            self.log_error(f"seeds.py not found at {seeds_file}")
            return False
        
        try:
            with open(seeds_file, 'r') as f:
                content = f.read()
            
            # Extract permission names from all_permissions list
            permission_pattern = r"'name':\s*'([^']+)'"
            found_permissions = set(re.findall(permission_pattern, content))
            
            # Check for uppercase permissions
            uppercase_permissions = {perm for perm in found_permissions if perm.isupper() or perm != perm.lower()}
            if uppercase_permissions:
                self.log_error(f"Found UPPERCASE permissions in seeds.py: {uppercase_permissions}")
                return False
            
            # Check that all expected permissions are present
            missing_permissions = self.expected_permissions - found_permissions
            if missing_permissions:
                self.log_warning(f"Missing expected permissions in seeds.py: {missing_permissions}")
            
            extra_permissions = found_permissions - self.expected_permissions
            if extra_permissions:
                self.log_info(f"Extra permissions in seeds.py: {extra_permissions}")
            
            logger.info(f"✅ Found {len(found_permissions)} snake_case permissions in seeds.py")
            return True
            
        except Exception as e:
            self.log_error(f"Error reading seeds.py: {e}")
            return False
    
    def validate_backend_routes(self) -> bool:
        """Validate that all backend routes use snake_case permissions."""
        logger.info("🔍 Validating backend route permissions...")
        
        routes_dir = self.project_root / "backend" / "src" / "routes"
        if not routes_dir.exists():
            self.log_error(f"Routes directory not found at {routes_dir}")
            return False
        
        success = True
        total_files = 0
        total_decorators = 0
        
        for route_file in routes_dir.rglob("*.py"):
            if route_file.name.startswith("__"):
                continue
            
            total_files += 1
            
            try:
                with open(route_file, 'r') as f:
                    content = f.read()
                
                # Find all @require_permission_v2 decorators
                permission_pattern = r"@require_permission_v2\(['\"]([^'\"]+)['\"]"
                permission_matches = re.findall(permission_pattern, content)
                
                for perm in permission_matches:
                    total_decorators += 1
                    
                    # Check if permission is uppercase
                    if perm.isupper() or perm != perm.lower():
                        self.log_error(f"UPPERCASE permission '{perm}' found in {route_file}")
                        success = False
                    
                    # Check if permission is in expected set
                    if perm not in self.expected_permissions:
                        self.log_warning(f"Unknown permission '{perm}' in {route_file}")
                
                self.log_info(f"Checked {len(permission_matches)} decorators in {route_file.name}")
                
            except Exception as e:
                self.log_error(f"Error reading {route_file}: {e}")
                success = False
        
        logger.info(f"✅ Validated {total_decorators} decorators across {total_files} route files")
        return success
    
    def validate_frontend_permissions(self) -> bool:
        """Validate that frontend files use snake_case permissions."""
        logger.info("🔍 Validating frontend permission strings...")
        
        frontend_dir = self.project_root / "frontend"
        if not frontend_dir.exists():
            self.log_error(f"Frontend directory not found at {frontend_dir}")
            return False
        
        success = True
        total_files = 0
        
        # Check TypeScript/JavaScript files
        for frontend_file in frontend_dir.rglob("*.ts*"):
            if ".next" in str(frontend_file) or "node_modules" in str(frontend_file):
                continue
            
            total_files += 1
            
            try:
                with open(frontend_file, 'r') as f:
                    content = f.read()
                
                # Look for uppercase permission strings
                uppercase_pattern = r"['\"]([A-Z][A-Z_]+[A-Z])['\"]"
                uppercase_matches = re.findall(uppercase_pattern, content)
                
                # Filter out non-permission strings (constants, etc.)
                permission_like = []
                for match in uppercase_matches:
                    # Skip obvious constants like API_BASE_URL, but catch permission-like strings
                    if ("ACCESS_" in match or "MANAGE_" in match or "VIEW_" in match or 
                        "CREATE_" in match or "UPDATE_" in match or "DELETE_" in match or
                        "ADMIN" in match or "CSR" in match or "FUELER" in match):
                        permission_like.append(match)
                
                if permission_like:
                    self.log_error(f"Possible UPPERCASE permissions in {frontend_file}: {permission_like}")
                    success = False
                
                self.log_info(f"Checked {frontend_file.name}")
                
            except Exception as e:
                self.log_error(f"Error reading {frontend_file}: {e}")
                success = False
        
        logger.info(f"✅ Validated {total_files} frontend files")
        return success
    
    def validate_permission_groups_schema(self) -> bool:
        """Validate permission groups schema uses snake_case permissions."""
        logger.info("🔍 Validating permission groups schema...")
        
        schema_file = self.project_root / "backend" / "src" / "migration_scripts" / "permission_groups_schema.py"
        if not schema_file.exists():
            self.log_error(f"Permission groups schema not found at {schema_file}")
            return False
        
        try:
            with open(schema_file, 'r') as f:
                content = f.read()
            
            # Find all permission names in the groups
            permission_pattern = r"'permissions':\s*\[[^\]]*'([^']+)'[^\]]*\]"
            groups_section = re.search(r"system_groups\s*=\s*\[(.*?)\]", content, re.DOTALL)
            
            if not groups_section:
                self.log_error("Could not find system_groups in permission_groups_schema.py")
                return False
            
            groups_content = groups_section.group(1)
            permission_matches = re.findall(r"'([a-z_]+)'", groups_content)
            
            # Check for uppercase permissions
            uppercase_perms = [perm for perm in permission_matches if perm.isupper()]
            if uppercase_perms:
                self.log_error(f"UPPERCASE permissions in groups schema: {uppercase_perms}")
                return False
            
            # Validate permissions exist in expected set
            unknown_perms = [perm for perm in permission_matches if perm not in self.expected_permissions]
            if unknown_perms:
                self.log_warning(f"Unknown permissions in groups schema: {unknown_perms}")
            
            logger.info(f"✅ Validated {len(permission_matches)} permissions in groups schema")
            return True
            
        except Exception as e:
            self.log_error(f"Error reading permission groups schema: {e}")
            return False
    
    def validate_cli_commands(self) -> bool:
        """Validate CLI commands are properly set up."""
        logger.info("🔍 Validating CLI commands...")
        
        cli_file = self.project_root / "backend" / "src" / "cli.py"
        if not cli_file.exists():
            self.log_error(f"CLI file not found at {cli_file}")
            return False
        
        try:
            with open(cli_file, 'r') as f:
                content = f.read()
            
            # Check for required CLI commands
            required_commands = [
                'create-permission-groups',
                'standardize-permissions'
            ]
            
            for command in required_commands:
                if command not in content:
                    self.log_error(f"Missing CLI command: {command}")
                    return False
            
            logger.info("✅ All required CLI commands found")
            return True
            
        except Exception as e:
            self.log_error(f"Error reading CLI file: {e}")
            return False
    
    def validate_database_scripts(self) -> bool:
        """Validate database initialization scripts."""
        logger.info("🔍 Validating database scripts...")
        
        success = True
        
        # Check entrypoint.sh
        entrypoint_file = self.project_root / "backend" / "entrypoint.sh"
        if entrypoint_file.exists():
            try:
                with open(entrypoint_file, 'r') as f:
                    content = f.read()
                
                if "create-permission-groups run" not in content:
                    self.log_error("entrypoint.sh missing 'create-permission-groups run' command")
                    success = False
                else:
                    logger.info("✅ entrypoint.sh includes permission groups setup")
                    
            except Exception as e:
                self.log_error(f"Error reading entrypoint.sh: {e}")
                success = False
        
        # Check reseed_database.sh
        reseed_file = self.project_root / "backend" / "reseed_database.sh"
        if reseed_file.exists():
            try:
                with open(reseed_file, 'r') as f:
                    content = f.read()
                
                if "create-permission-groups run" not in content:
                    self.log_error("reseed_database.sh missing 'create-permission-groups run' command")
                    success = False
                else:
                    logger.info("✅ reseed_database.sh includes permission groups setup")
                    
            except Exception as e:
                self.log_error(f"Error reading reseed_database.sh: {e}")
                success = False
        
        return success
    
    def run_full_validation(self) -> bool:
        """Run all validation checks."""
        logger.info("🚀 Starting comprehensive permission migration validation...")
        logger.info("=" * 60)
        
        validations = [
            ("Backend Seeds Permissions", self.validate_seeds_permissions),
            ("Backend Route Decorators", self.validate_backend_routes),
            ("Frontend Permission Strings", self.validate_frontend_permissions),
            ("Permission Groups Schema", self.validate_permission_groups_schema),
            ("CLI Commands", self.validate_cli_commands),
            ("Database Scripts", self.validate_database_scripts),
        ]
        
        all_passed = True
        for name, validation_func in validations:
            logger.info(f"\n📋 Running: {name}")
            try:
                passed = validation_func()
                if not passed:
                    all_passed = False
                    logger.error(f"❌ {name} validation FAILED")
                else:
                    logger.info(f"✅ {name} validation PASSED")
            except Exception as e:
                self.log_error(f"Exception in {name} validation: {e}")
                all_passed = False
        
        # Summary
        logger.info("\n" + "=" * 60)
        logger.info("🏁 VALIDATION SUMMARY")
        logger.info("=" * 60)
        
        if all_passed:
            logger.info("🎉 ALL VALIDATIONS PASSED!")
            logger.info("The permission migration has been completed successfully.")
        else:
            logger.error("❌ SOME VALIDATIONS FAILED!")
            logger.error(f"Total errors: {len(self.errors)}")
            logger.warning(f"Total warnings: {len(self.warnings)}")
        
        if self.errors:
            logger.error("\nErrors found:")
            for error in self.errors:
                logger.error(f"  - {error}")
        
        if self.warnings:
            logger.warning("\nWarnings:")
            for warning in self.warnings:
                logger.warning(f"  - {warning}")
        
        return all_passed

def main():
    """Main entry point for the validation script."""
    import argparse
    
    parser = argparse.ArgumentParser(description='Validate permission migration completeness')
    parser.add_argument('--verbose', action='store_true', help='Enable verbose output')
    parser.add_argument('--project-root', default='.', help='Path to project root directory')
    
    args = parser.parse_args()
    
    validator = PermissionMigrationValidator(args.project_root, args.verbose)
    success = validator.run_full_validation()
    
    sys.exit(0 if success else 1)

if __name__ == '__main__':
    main() 