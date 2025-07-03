"""remove legacy role permissions table

Revision ID: 42323865a0dc
Revises: 2b1a8f9c3d0e
Create Date: 2024-07-28 20:53:52.559317

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '42323865a0dc'
down_revision = '2b1a8f9c3d0e'
branch_labels = None
depends_on = None


def upgrade():
    # Drop the legacy role_permissions junction table
    # This table is no longer needed as we're using the permission groups system
    op.drop_table('role_permissions')


def downgrade():
    # Recreate the role_permissions table if we need to rollback
    op.create_table('role_permissions',
        sa.Column('role_id', sa.Integer(), nullable=False),
        sa.Column('permission_id', sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(['permission_id'], ['permissions.id'], ),
        sa.ForeignKeyConstraint(['role_id'], ['roles.id'], ),
        sa.PrimaryKeyConstraint('role_id', 'permission_id')
    )
