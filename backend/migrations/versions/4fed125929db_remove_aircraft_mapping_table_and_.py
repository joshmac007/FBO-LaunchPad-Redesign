"""Remove aircraft_mapping table and update fee_rule constraint

Revision ID: 4fed125929db
Revises: f123456789ab
Create Date: 2024-01-15 10:30:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '4fed125929db'
down_revision = '1a9190ba9a25'
branch_labels = None
depends_on = None


def upgrade():
    # Drop old constraint
    op.drop_constraint('uq_fee_rule_fbo_code', 'fee_rules', type_='unique')
    
    # Add new constraint that includes classification_id
    op.create_unique_constraint(
        'uq_fee_rule_fbo_classification_code',
        'fee_rules',
        ['fbo_location_id', 'applies_to_classification_id', 'fee_code']
    )


def downgrade():
    # Drop new constraint
    op.drop_constraint('uq_fee_rule_fbo_classification_code', 'fee_rules', type_='unique')
    
    # Restore old constraint
    op.create_unique_constraint(
        'uq_fee_rule_fbo_code',
        'fee_rules', 
        ['fbo_location_id', 'fee_code']
    )
