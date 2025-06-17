"""add_service_type_and_update_priority_enum

Revision ID: 59eff068d8af
Revises: 9d574a547557
Create Date: 2025-06-14 07:07:25.480205

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '59eff068d8af'
down_revision = '9d574a547557'
branch_labels = None
depends_on = None


def upgrade():
    # Add the service_type column to fuel_orders table
    op.add_column('fuel_orders', sa.Column('service_type', sa.String(length=50), nullable=False, server_default='Full Service'))
    
    # Update existing data to use new enum values
    # Note: The new enum values (NORMAL, HIGH, LOW) must be added in a separate migration first
    op.execute("UPDATE fuel_orders SET priority = 'NORMAL' WHERE priority = 'normal'")
    op.execute("UPDATE fuel_orders SET priority = 'HIGH' WHERE priority = 'high'")
    op.execute("UPDATE fuel_orders SET priority = 'LOW' WHERE priority = 'urgent'")  # Map urgent to LOW for consistency


def downgrade():
    # Revert priority enum values to old format
    op.execute("UPDATE fuel_orders SET priority = 'normal' WHERE priority = 'NORMAL'")
    op.execute("UPDATE fuel_orders SET priority = 'high' WHERE priority = 'HIGH'")
    op.execute("UPDATE fuel_orders SET priority = 'urgent' WHERE priority = 'LOW'")
    
    # Remove the service_type column
    op.drop_column('fuel_orders', 'service_type')
