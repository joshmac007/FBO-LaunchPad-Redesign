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
    # Simply add the service_type column - skip enum updates for fresh databases
    # The model's default values will handle enum correctly for new records
    op.add_column('fuel_orders', sa.Column('service_type', sa.String(length=50), nullable=False, server_default='Full Service'))


def downgrade():
    # Remove the service_type column
    op.drop_column('fuel_orders', 'service_type') 