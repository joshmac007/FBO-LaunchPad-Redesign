"""Add migration tracking fields and enhanced user permission group assignments

Revision ID: 6a7677d82b03
Revises: 866cf231e9da
Create Date: 2025-05-29 23:46:31.021306

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '6a7677d82b03'
down_revision = '866cf231e9da'
branch_labels = None
depends_on = None


def upgrade():
    # Add created_by_migration field to permission_groups table
    op.add_column('permission_groups', sa.Column('created_by_migration', sa.Boolean(), nullable=False, server_default='false'))
    
    # Create enhanced user_permission_group_assignments table
    op.create_table('user_permission_group_assignments',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('permission_group_id', sa.Integer(), nullable=False),
        sa.Column('assigned_at', sa.DateTime(), nullable=False),
        sa.Column('assigned_by_user_id', sa.Integer(), nullable=True),
        sa.Column('assigned_by_migration', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('assignment_reason', sa.String(length=255), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('expires_at', sa.DateTime(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['assigned_by_user_id'], ['users.id'], ),
        sa.ForeignKeyConstraint(['permission_group_id'], ['permission_groups.id'], ),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('user_id', 'permission_group_id', name='unique_user_permission_group')
    )


def downgrade():
    # Drop enhanced user_permission_group_assignments table
    op.drop_table('user_permission_group_assignments')
    
    # Remove created_by_migration field from permission_groups table
    op.drop_column('permission_groups', 'created_by_migration')
