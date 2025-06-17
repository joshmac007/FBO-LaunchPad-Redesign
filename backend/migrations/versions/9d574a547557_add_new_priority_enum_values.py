"""add_new_priority_enum_values

Revision ID: 9d574a547557
Revises: 63198927b432
Create Date: 2025-06-14 14:19:47.671886

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '9d574a547557'
down_revision = '63198927b432'
branch_labels = None
depends_on = None


def upgrade():
    # Add new enum values to the existing enum type
    # These will be committed separately from data updates
    op.execute("ALTER TYPE fuelorderpriority ADD VALUE IF NOT EXISTS 'NORMAL'")
    op.execute("ALTER TYPE fuelorderpriority ADD VALUE IF NOT EXISTS 'HIGH'")
    op.execute("ALTER TYPE fuelorderpriority ADD VALUE IF NOT EXISTS 'LOW'")


def downgrade():
    # Note: PostgreSQL doesn't support removing enum values easily
    # We would need to recreate the enum type to remove values
    # For now, we'll leave the old values in place
    pass
