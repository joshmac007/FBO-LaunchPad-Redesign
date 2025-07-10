"""refactor_fee_rule_waiver_logic

Revision ID: 62aa550028fb
Revises: 524f2d885d3c
Create Date: 2025-07-10 20:14:13.616216

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '62aa550028fb'
down_revision = '524f2d885d3c'
branch_labels = None
depends_on = None


def upgrade():
    # Step 1: Add the new is_manually_waivable column (nullable initially)
    with op.batch_alter_table('fee_rules', schema=None) as batch_op:
        batch_op.add_column(sa.Column('is_manually_waivable', sa.Boolean(), nullable=True))
    
    # Step 2: Copy data from old column to new column to preserve existing configuration
    op.execute("""
        UPDATE fee_rules 
        SET is_manually_waivable = is_potentially_waivable_by_fuel_uplift
    """)
    
    # Step 3: Make the new column not nullable and drop the old column
    with op.batch_alter_table('fee_rules', schema=None) as batch_op:
        batch_op.alter_column('is_manually_waivable', nullable=False)
        batch_op.drop_column('is_potentially_waivable_by_fuel_uplift')


def downgrade():
    # Step 1: Add back the old column (nullable initially)
    with op.batch_alter_table('fee_rules', schema=None) as batch_op:
        batch_op.add_column(sa.Column('is_potentially_waivable_by_fuel_uplift', sa.Boolean(), nullable=True))
    
    # Step 2: Copy data from new column back to old column
    op.execute("""
        UPDATE fee_rules 
        SET is_potentially_waivable_by_fuel_uplift = is_manually_waivable
    """)
    
    # Step 3: Make the old column not nullable and drop the new column
    with op.batch_alter_table('fee_rules', schema=None) as batch_op:
        batch_op.alter_column('is_potentially_waivable_by_fuel_uplift', nullable=False)
        batch_op.drop_column('is_manually_waivable')
