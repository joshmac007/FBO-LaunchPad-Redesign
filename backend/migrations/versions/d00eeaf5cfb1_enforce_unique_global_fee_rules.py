"""enforce_unique_global_fee_rules

Revision ID: d00eeaf5cfb1
Revises: ef1248e9d102
Create Date: 2025-07-03 23:10:56.828524

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'd00eeaf5cfb1'
down_revision = 'ef1248e9d102'
branch_labels = None
depends_on = None


def upgrade():
    # First make the column nullable
    with op.batch_alter_table('fee_rules', schema=None) as batch_op:
        batch_op.alter_column('applies_to_classification_id',
               existing_type=sa.INTEGER(),
               nullable=True)
    
    # Then update the constraints
    op.drop_constraint('uq_fee_rule_code_classification', 'fee_rules', type_='unique')
    op.create_index('uq_global_fee_code', 'fee_rules', ['fee_code'], unique=True, postgresql_where=sa.text('applies_to_classification_id IS NULL'))
    op.create_index('uq_specific_fee_rule', 'fee_rules', ['fee_code', 'applies_to_classification_id'], unique=True, postgresql_where=sa.text('applies_to_classification_id IS NOT NULL'))


def downgrade():
    op.drop_index('uq_specific_fee_rule', table_name='fee_rules')
    op.drop_index('uq_global_fee_code', table_name='fee_rules')
    op.create_unique_constraint('uq_fee_rule_code_classification', 'fee_rules', ['fee_code', 'applies_to_classification_id'])
    
    # Make the column non-nullable again
    with op.batch_alter_table('fee_rules', schema=None) as batch_op:
        batch_op.alter_column('applies_to_classification_id',
               existing_type=sa.INTEGER(),
               nullable=False)
