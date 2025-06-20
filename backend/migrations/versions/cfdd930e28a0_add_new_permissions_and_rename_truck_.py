"""add_new_permissions_and_rename_truck_permissions

Revision ID: cfdd930e28a0
Revises: 6a7677d82b03
Create Date: 2025-05-31 05:18:45.710370

"""
from alembic import op
import sqlalchemy as sa
from datetime import datetime


# revision identifiers, used by Alembic.
revision = 'cfdd930e28a0'
down_revision = '6a7677d82b03'
branch_labels = None
depends_on = None


def upgrade():
    # Get current timestamp for consistency
    now = datetime.utcnow()
    
    # Add new dashboard access permissions
    op.execute(f"""
        INSERT INTO permissions (name, description, category, created_at, updated_at) VALUES
        ('ACCESS_ADMIN_DASHBOARD', 'Allows access to admin dashboard', 'dashboard_access', '{now}', '{now}'),
        ('ACCESS_CSR_DASHBOARD', 'Allows access to CSR dashboard', 'dashboard_access', '{now}', '{now}'),
        ('ACCESS_FUELER_DASHBOARD', 'Allows access to fueler dashboard', 'dashboard_access', '{now}', '{now}'),
        ('ACCESS_MEMBER_DASHBOARD', 'Allows access to member dashboard', 'dashboard_access', '{now}', '{now}')
    """)
    
    # Add new operational permission
    op.execute(f"""
        INSERT INTO permissions (name, description, category, created_at, updated_at) VALUES
        ('PERFORM_FUELING_TASK', 'Allows performing fueling operations and task management', 'fuel_orders', '{now}', '{now}')
    """)
    
    # Add new billing/fees permissions
    op.execute(f"""
        INSERT INTO permissions (name, description, category, created_at, updated_at) VALUES
        ('VIEW_BILLING_INFO', 'Allows viewing billing information and fee calculations', 'billing', '{now}', '{now}'),
        ('CALCULATE_FEES', 'Allows calculating fees and charges', 'billing', '{now}', '{now}')
    """)
    
    # Add new fuel receipt system permissions
    op.execute(f"""
        INSERT INTO permissions (name, description, category, created_at, updated_at) VALUES
        ('VIEW_ALL_RECEIPTS', 'Allows viewing all fuel receipts', 'receipts', '{now}', '{now}'),
        ('VIEW_OWN_RECEIPTS', 'Allows viewing own fuel receipts', 'receipts', '{now}', '{now}'),
        ('MANAGE_RECEIPTS', 'Allows creating, editing, and managing fuel receipts', 'receipts', '{now}', '{now}'),
        ('EXPORT_RECEIPTS_CSV', 'Allows exporting receipt data to CSV', 'receipts', '{now}', '{now}')
    """)
    
    # Rename existing truck permissions for consistency
    op.execute(f"""
        UPDATE permissions 
        SET name = 'VIEW_FUEL_TRUCKS', description = 'Allows viewing fuel truck list', updated_at = '{now}'
        WHERE name = 'VIEW_TRUCKS'
    """)
    
    op.execute(f"""
        UPDATE permissions 
        SET name = 'MANAGE_FUEL_TRUCKS', description = 'Allows creating, updating, deleting fuel trucks', updated_at = '{now}'
        WHERE name = 'MANAGE_TRUCKS'
    """)


def downgrade():
    # Revert truck permission name changes
    now = datetime.utcnow()
    
    op.execute(f"""
        UPDATE permissions 
        SET name = 'VIEW_TRUCKS', description = 'Allows viewing fuel truck list', updated_at = '{now}'
        WHERE name = 'VIEW_FUEL_TRUCKS'
    """)
    
    op.execute(f"""
        UPDATE permissions 
        SET name = 'MANAGE_TRUCKS', description = 'Allows creating, updating, deleting fuel trucks', updated_at = '{now}'
        WHERE name = 'MANAGE_FUEL_TRUCKS'
    """)
    
    # Remove new permissions (in reverse order)
    op.execute("DELETE FROM permissions WHERE name IN ('EXPORT_RECEIPTS_CSV', 'MANAGE_RECEIPTS', 'VIEW_OWN_RECEIPTS', 'VIEW_ALL_RECEIPTS')")
    op.execute("DELETE FROM permissions WHERE name IN ('CALCULATE_FEES', 'VIEW_BILLING_INFO')")
    op.execute("DELETE FROM permissions WHERE name = 'PERFORM_FUELING_TASK'")
    op.execute("DELETE FROM permissions WHERE name IN ('ACCESS_MEMBER_DASHBOARD', 'ACCESS_FUELER_DASHBOARD', 'ACCESS_CSR_DASHBOARD', 'ACCESS_ADMIN_DASHBOARD')")
