"""add role_permission_groups table

Revision ID: 1a9190ba9a25
Revises: 888aa11223bc
Create Date: 2025-06-29 01:52:20.070490

"""
from alembic import op
import sqlalchemy as sa
from datetime import datetime


# revision identifiers, used by Alembic.
revision = '1a9190ba9a25'
down_revision = '888aa11223bc'
branch_labels = None
depends_on = None


def upgrade():
    # Create role_permission_groups table
    op.create_table('role_permission_groups',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('role_id', sa.Integer(), nullable=False),
        sa.Column('group_id', sa.Integer(), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('assigned_at', sa.DateTime(), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.Column('assigned_by_id', sa.Integer(), nullable=True),
        sa.ForeignKeyConstraint(['assigned_by_id'], ['users.id'], ),
        sa.ForeignKeyConstraint(['group_id'], ['permission_groups.id'], ),
        sa.ForeignKeyConstraint(['role_id'], ['roles.id'], ),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('role_id', 'group_id', name='uq_role_group')
    )


def downgrade():
    # Drop role_permission_groups table
    op.drop_table('role_permission_groups')
