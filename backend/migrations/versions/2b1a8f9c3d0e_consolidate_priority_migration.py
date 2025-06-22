"""Consolidate enum creation and data update for priority

Revision ID: 2b1a8f9c3d0e
Revises: 63198927b432
Create Date: 2025-06-22 08:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '2b1a8f9c3d0e'
down_revision = '63198927b432'
branch_labels = None
depends_on = None


def upgrade():
    # --- From migration 9d574a547557 ---
    op.execute("ALTER TYPE fuelorderpriority ADD VALUE IF NOT EXISTS 'NORMAL'")
    op.execute("ALTER TYPE fuelorderpriority ADD VALUE IF NOT EXISTS 'HIGH'")
    op.execute("ALTER TYPE fuelorderpriority ADD VALUE IF NOT EXISTS 'LOW'")
    
    # Manually commit the transaction to make new enum values available
    bind = op.get_bind()
    bind.commit()

    # --- From migration 59eff068d8af ---
    op.add_column('fuel_orders', sa.Column('service_type', sa.String(length=50), nullable=False, server_default='Full Service'))
    
    op.execute("UPDATE fuel_orders SET priority = 'NORMAL' WHERE priority = 'normal'")
    op.execute("UPDATE fuel_orders SET priority = 'HIGH' WHERE priority = 'high'")
    op.execute("UPDATE fuel_orders SET priority = 'LOW' WHERE priority = 'urgent'")


def downgrade():
    # --- From migration 59eff068d8af ---
    op.execute("UPDATE fuel_orders SET priority = 'normal' WHERE priority = 'NORMAL'")
    op.execute("UPDATE fuel_orders SET priority = 'high' WHERE priority = 'HIGH'")
    op.execute("UPDATE fuel_orders SET priority = 'urgent' WHERE priority = 'LOW'")
    
    op.drop_column('fuel_orders', 'service_type')
    
    # Downgrade for enum values is complex and often skipped.
    # The new values will remain in the type.
    pass 