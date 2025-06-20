"""Add permission groups and user permissions for granular permission system

Revision ID: 866cf231e9da
Revises: d8897d7b926b
Create Date: 2025-05-26 22:54:21.172917

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '866cf231e9da'
down_revision = 'd8897d7b926b'
branch_labels = None
depends_on = None


def upgrade():
    # Add new columns to permissions table for resource-specific permissions
    op.add_column('permissions', sa.Column('resource_type', sa.String(length=50), nullable=True))
    op.add_column('permissions', sa.Column('action', sa.String(length=50), nullable=True))
    op.add_column('permissions', sa.Column('scope', sa.String(length=50), nullable=True))
    op.add_column('permissions', sa.Column('is_system_permission', sa.Boolean(), nullable=False, server_default='false'))
    op.add_column('permissions', sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'))
    op.add_column('permissions', sa.Column('requires_resource_context', sa.Boolean(), nullable=False, server_default='false'))

    # Create permission_groups table
    op.create_table('permission_groups',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('category', sa.String(length=50), nullable=True, default='custom'),
        sa.Column('parent_group_id', sa.Integer(), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('is_system_group', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('sort_order', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('created_by_user_id', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['created_by_user_id'], ['users.id'], ),
        sa.ForeignKeyConstraint(['parent_group_id'], ['permission_groups.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_permission_groups_name'), 'permission_groups', ['name'], unique=True)

    # Create permission_group_permissions junction table
    op.create_table('permission_group_permissions',
        sa.Column('permission_group_id', sa.Integer(), nullable=False),
        sa.Column('permission_id', sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(['permission_group_id'], ['permission_groups.id'], ),
        sa.ForeignKeyConstraint(['permission_id'], ['permissions.id'], ),
        sa.PrimaryKeyConstraint('permission_group_id', 'permission_id')
    )

    # Create user_permission_groups junction table
    op.create_table('user_permission_groups',
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('permission_group_id', sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(['permission_group_id'], ['permission_groups.id'], ),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('user_id', 'permission_group_id')
    )

    # Create user_permissions table for direct user-permission assignments
    op.create_table('user_permissions',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('permission_id', sa.Integer(), nullable=False),
        sa.Column('granted_by_user_id', sa.Integer(), nullable=True),
        sa.Column('granted_at', sa.DateTime(), nullable=False),
        sa.Column('resource_type', sa.String(length=50), nullable=True),
        sa.Column('resource_id', sa.String(length=100), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('expires_at', sa.DateTime(), nullable=True),
        sa.Column('reason', sa.Text(), nullable=True),
        sa.Column('revoked_at', sa.DateTime(), nullable=True),
        sa.Column('revoked_by_user_id', sa.Integer(), nullable=True),
        sa.Column('revoked_reason', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['granted_by_user_id'], ['users.id'], ),
        sa.ForeignKeyConstraint(['permission_id'], ['permissions.id'], ),
        sa.ForeignKeyConstraint(['revoked_by_user_id'], ['users.id'], ),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('user_id', 'permission_id', 'resource_type', 'resource_id', name='unique_user_permission_resource')
    )
    op.create_index(op.f('ix_user_permissions_permission_id'), 'user_permissions', ['permission_id'])
    op.create_index(op.f('ix_user_permissions_user_id'), 'user_permissions', ['user_id'])


def downgrade():
    # Drop user_permissions table
    op.drop_index(op.f('ix_user_permissions_user_id'), table_name='user_permissions')
    op.drop_index(op.f('ix_user_permissions_permission_id'), table_name='user_permissions')
    op.drop_table('user_permissions')
    
    # Drop junction tables
    op.drop_table('user_permission_groups')
    op.drop_table('permission_group_permissions')
    
    # Drop permission_groups table
    op.drop_index(op.f('ix_permission_groups_name'), table_name='permission_groups')
    op.drop_table('permission_groups')
    
    # Remove new columns from permissions table
    op.drop_column('permissions', 'requires_resource_context')
    op.drop_column('permissions', 'is_active')
    op.drop_column('permissions', 'is_system_permission')
    op.drop_column('permissions', 'scope')
    op.drop_column('permissions', 'action')
    op.drop_column('permissions', 'resource_type')
