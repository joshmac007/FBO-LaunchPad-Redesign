"""refactor_feeruleoverride_to_link_to_classifications

Revision ID: bf97b1a1dd1d
Revises: ed8e8132c48d
Create Date: 2025-06-30 03:05:18.369716

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'bf97b1a1dd1d'
down_revision = 'ed8e8132c48d'
branch_labels = None
depends_on = None


def upgrade():
    # ### commands auto generated by Alembic - please adjust! ###
    op.add_column('fee_rule_overrides', sa.Column('classification_id', sa.Integer(), nullable=True))
    
    # --- Data Migration Step ---
    # In a real-world scenario with live data, we would write a script here to migrate
    # existing overrides. For our development case, we will start fresh.
    # This is a good place to note that production migrations require more care.
    
    op.drop_constraint('_aircraft_fee_rule_uc', 'fee_rule_overrides', type_='unique')
    op.create_unique_constraint('_classification_fee_rule_uc', 'fee_rule_overrides', ['classification_id', 'fee_rule_id'])
    op.create_foreign_key(None, 'fee_rule_overrides', 'aircraft_classifications', ['classification_id'], ['id'])
    op.drop_column('fee_rule_overrides', 'aircraft_type_id')
    # ### end Alembic commands ###


def downgrade():
    # ### commands auto generated by Alembic - please adjust! ###
    op.add_column('fee_rule_overrides', sa.Column('aircraft_type_id', sa.INTEGER(), autoincrement=False, nullable=True))
    op.drop_constraint('_classification_fee_rule_uc', 'fee_rule_overrides', type_='unique')
    op.create_unique_constraint('_aircraft_fee_rule_uc', 'fee_rule_overrides', ['aircraft_type_id', 'fee_rule_id'])
    op.drop_constraint('fee_rule_overrides_classification_id_fkey', 'fee_rule_overrides', type_='foreignkey')
    op.drop_column('fee_rule_overrides', 'classification_id')
    # ### end Alembic commands ###
