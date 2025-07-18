"""Add is_active column to permissions table

Revision ID: 3fc8569229ce
Revises: b131b20b6f0b
Create Date: 2025-06-06 05:22:45.731815

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '3fc8569229ce'
down_revision = 'b131b20b6f0b'
branch_labels = None
depends_on = None


def upgrade():
    # ### commands auto generated by Alembic - please adjust! ###
    with op.batch_alter_table('permissions', schema=None) as batch_op:
        batch_op.add_column(sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'))
    # ### end Alembic commands ###


def downgrade():
    # ### commands auto generated by Alembic - please adjust! ###
    with op.batch_alter_table('permissions', schema=None) as batch_op:
        batch_op.drop_column('is_active')
    # ### end Alembic commands ###
