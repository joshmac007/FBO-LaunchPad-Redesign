"""recreate_user_permission_groups_table

Revision ID: 3bcde5472d6b
Revises: b9f9fd5df01d
Create Date: 2025-06-03 07:20:28.712227

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '3bcde5472d6b'
down_revision = 'b9f9fd5df01d'
branch_labels = None
depends_on = None


def upgrade():
    # Recreate user_permission_groups table that was dropped in the previous migration
    op.create_table('user_permission_groups',
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('permission_group_id', sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(['permission_group_id'], ['permission_groups.id'], ),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('user_id', 'permission_group_id')
    )


def downgrade():
    # Drop the user_permission_groups table if we need to downgrade
    op.drop_table('user_permission_groups')
