"""add_search_performance_indexes

Revision ID: 704f21a0871d
Revises: 7f975c9dedcf
Create Date: 2025-07-12 07:48:09.978886

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '704f21a0871d'
down_revision = '7f975c9dedcf'
branch_labels = None
depends_on = None


def upgrade():
    # Create pg_trgm extension if it doesn't exist
    op.execute("CREATE EXTENSION IF NOT EXISTS pg_trgm;")
    
    # Create GIN indexes for fast text search performance
    op.execute("CREATE INDEX idx_customers_name_trgm ON customers USING gin (name gin_trgm_ops);")
    op.execute("CREATE INDEX idx_customers_company_name_trgm ON customers USING gin (company_name gin_trgm_ops);")
    op.execute("CREATE INDEX idx_aircraft_tail_number_trgm ON aircraft USING gin (tail_number gin_trgm_ops);")


def downgrade():
    # Drop the GIN indexes
    op.execute("DROP INDEX IF EXISTS idx_aircraft_tail_number_trgm;")
    op.execute("DROP INDEX IF EXISTS idx_customers_company_name_trgm;")
    op.execute("DROP INDEX IF EXISTS idx_customers_name_trgm;")
    
    # Note: We don't drop the pg_trgm extension as other parts of the system might be using it
