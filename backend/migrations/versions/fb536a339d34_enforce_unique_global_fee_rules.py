"""enforce_unique_global_fee_rules

Revision ID: fb536a339d34
Revises: d00eeaf5cfb1
Create Date: 2025-07-04 06:01:42.814795

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'fb536a339d34'
down_revision = 'd00eeaf5cfb1'
branch_labels = None
depends_on = None


def upgrade():
    # Constraints already exist in database - no changes needed
    pass


def downgrade():
    # Constraints were not modified in upgrade - no changes needed
    pass
