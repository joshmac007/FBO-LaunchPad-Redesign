"""consolidate minimum fuel for waiver data - remove aircraft_type_configs table

Revision ID: c8f611b41e41
Revises: fb536a339d34
Create Date: 2025-07-08 03:12:51.995488

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'c8f611b41e41'
down_revision = 'fb536a339d34'
branch_labels = None
depends_on = None


def upgrade():
    """
    Since aircraft_type_configs table is empty (verified), we can safely drop it.
    The aircraft_types table already contains the base_min_fuel_gallons_for_waiver column
    which is the single source of truth going forward.
    """
    # Drop the aircraft_type_configs table
    op.drop_table('aircraft_type_configs')


def downgrade():
    """
    Recreate the aircraft_type_configs table if needed for rollback.
    """
    op.create_table('aircraft_type_configs',
        sa.Column('id', sa.INTEGER(), autoincrement=True, nullable=False),
        sa.Column('aircraft_type_id', sa.INTEGER(), autoincrement=False, nullable=False),
        sa.Column('base_min_fuel_gallons_for_waiver', sa.NUMERIC(precision=10, scale=2), autoincrement=False, nullable=False),
        sa.Column('created_at', sa.TIMESTAMP(), autoincrement=False, nullable=False),
        sa.Column('updated_at', sa.TIMESTAMP(), autoincrement=False, nullable=False),
        sa.ForeignKeyConstraint(['aircraft_type_id'], ['aircraft_types.id'], ),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('aircraft_type_id', name='uq_aircraft_type_config')
    )
    op.create_index(op.f('ix_aircraft_type_configs_aircraft_type_id'), 'aircraft_type_configs', ['aircraft_type_id'], unique=False)
