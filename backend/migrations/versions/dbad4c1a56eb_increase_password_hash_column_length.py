"""Increase password_hash column length

Revision ID: dbad4c1a56eb
Revises: bf97b1a1dd1d
Create Date: 2025-06-30 05:28:50.103629

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'dbad4c1a56eb'
down_revision = 'bf97b1a1dd1d'
branch_labels = None
depends_on = None


def upgrade():
    # Increase password_hash column length from VARCHAR(128) to VARCHAR(255)
    op.alter_column('users', 'password_hash',
                    existing_type=sa.VARCHAR(length=128),
                    type_=sa.VARCHAR(length=255),
                    existing_nullable=True)


def downgrade():
    # Revert password_hash column length back to VARCHAR(128)
    op.alter_column('users', 'password_hash',
                    existing_type=sa.VARCHAR(length=255),
                    type_=sa.VARCHAR(length=128),
                    existing_nullable=True)
