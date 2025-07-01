"""Remove fbo_location_id from fee_rules and update constraint

Revision ID: 1234567890ab
Revises: 4fed125929db
Create Date: 2025-06-29 14:35:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '1234567890ab'
down_revision = '4fed125929db'
branch_labels = None
depends_on = None

def upgrade():
    # Check if the constraint exists before trying to drop it
    from sqlalchemy import inspect
    connection = op.get_bind()
    inspector = inspect(connection)
    
    # Get existing constraints
    constraints = inspector.get_unique_constraints('fee_rules')
    constraint_names = [c['name'] for c in constraints]
    
    # Drop the old unique constraint if it exists
    if 'uq_fee_rule_fbo_code' in constraint_names:
        op.drop_constraint('uq_fee_rule_fbo_code', 'fee_rules', type_='unique')
    
    # Check if fbo_location_id column exists before trying to drop it
    columns = inspector.get_columns('fee_rules')
    column_names = [c['name'] for c in columns]
    
    if 'fbo_location_id' in column_names:
        op.drop_column('fee_rules', 'fbo_location_id')
    
    # Create the new unique constraint if it doesn't already exist
    if 'uq_fee_rule_code_classification' not in constraint_names:
        op.create_unique_constraint(
            'uq_fee_rule_code_classification',
            'fee_rules',
            ['fee_code', 'applies_to_classification_id']
        )

def downgrade():
    # Drop the new unique constraint
    op.drop_constraint('uq_fee_rule_code_classification', 'fee_rules', type_='unique')
    
    # Add the fbo_location_id column back
    op.add_column('fee_rules', sa.Column('fbo_location_id', sa.INTEGER(), autoincrement=False, nullable=False, server_default='1'))

    # Re-create the old unique constraint
    op.create_unique_constraint(
        'uq_fee_rule_fbo_code',
        'fee_rules',
        ['fbo_location_id', 'fee_code']
    )