"""Add aircraft_type_id to FeeRuleOverride for specific overrides

Revision ID: bf28e443a1dd
Revises: dbad4c1a56eb
Create Date: 2025-06-30 18:17:59.880845

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'bf28e443a1dd'
down_revision = 'dbad4c1a56eb'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('fee_rule_overrides', sa.Column('aircraft_type_id', sa.Integer(), nullable=True))
    op.create_foreign_key(
        'fk_fee_rule_overrides_aircraft_type_id', 'fee_rule_overrides', 
        'aircraft_types', ['aircraft_type_id'], ['id']
    )
    # Add a check constraint to ensure only one of classification_id or aircraft_type_id is set
    op.create_check_constraint(
        'ck_override_target', 'fee_rule_overrides',
        '(classification_id IS NOT NULL AND aircraft_type_id IS NULL) OR (classification_id IS NULL AND aircraft_type_id IS NOT NULL)'
    )


def downgrade():
    op.drop_constraint('ck_override_target', 'fee_rule_overrides', type_='check')
    op.drop_constraint('fk_fee_rule_overrides_aircraft_type_id', 'fee_rule_overrides', type_='foreignkey')
    op.drop_column('fee_rule_overrides', 'aircraft_type_id')
