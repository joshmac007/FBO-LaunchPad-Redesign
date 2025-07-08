"""refactor fee rule data model - remove classification specific base fees

Revision ID: 524f2d885d3c
Revises: c8f611b41e41
Create Date: 2025-07-08 03:26:54.284666

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '524f2d885d3c'
down_revision = 'c8f611b41e41'
branch_labels = None
depends_on = None


def upgrade():
    """
    Refactor FeeRule data model to eliminate classification-specific base fees.
    
    1. Migrate existing classification-specific FeeRule records to FeeRuleOverride records
    2. Update the original FeeRule records to be global (remove applies_to_classification_id)
    3. Drop the deprecated columns
    4. Add unique constraint to fee_code
    """
    # Create a connection to execute raw SQL
    connection = op.get_bind()
    
    # Step 1: Migrate classification-specific FeeRule records to FeeRuleOverride records
    # Get all FeeRule records that have applies_to_classification_id set
    classification_specific_rules = connection.execute(
        sa.text("""
            SELECT id, fee_name, fee_code, applies_to_classification_id, amount, 
                   has_caa_override, caa_override_amount
            FROM fee_rules 
            WHERE applies_to_classification_id IS NOT NULL
        """)
    ).fetchall()
    
    # For each classification-specific rule, create an override record
    for rule in classification_specific_rules:
        # Insert into fee_rule_overrides table
        connection.execute(
            sa.text("""
                INSERT INTO fee_rule_overrides 
                (fee_rule_id, classification_id, override_amount, override_caa_amount, created_at, updated_at)
                VALUES (:fee_rule_id, :classification_id, :override_amount, :override_caa_amount, NOW(), NOW())
            """),
            {
                'fee_rule_id': rule.id,
                'classification_id': rule.applies_to_classification_id,
                'override_amount': rule.amount,
                'override_caa_amount': rule.caa_override_amount if rule.has_caa_override else None
            }
        )
    
    # Step 2: Update the original FeeRule records to be global
    connection.execute(
        sa.text("""
            UPDATE fee_rules 
            SET applies_to_classification_id = NULL 
            WHERE applies_to_classification_id IS NOT NULL
        """)
    )
    
    # Step 3: Drop the deprecated columns
    op.drop_column('fee_rules', 'applies_to_classification_id')
    op.drop_column('fee_rules', 'is_primary_fee')
    
    # Step 4: Add unique constraint to fee_code (now that all rules are global)
    op.create_unique_constraint('uq_fee_rules_fee_code', 'fee_rules', ['fee_code'])


def downgrade():
    """
    Reverse the refactoring by recreating the deprecated columns and migrating data back.
    """
    # Create a connection to execute raw SQL
    connection = op.get_bind()
    
    # Step 1: Remove the unique constraint
    op.drop_constraint('uq_fee_rules_fee_code', 'fee_rules', type_='unique')
    
    # Step 2: Recreate the deprecated columns
    op.add_column('fee_rules', sa.Column('applies_to_classification_id', sa.INTEGER(), nullable=True))
    op.add_column('fee_rules', sa.Column('is_primary_fee', sa.BOOLEAN(), nullable=False, server_default='f'))
    
    # Recreate the foreign key constraint
    op.create_foreign_key(
        'fk_fee_rules_applies_to_classification_id', 
        'fee_rules', 
        'aircraft_classifications', 
        ['applies_to_classification_id'], 
        ['id']
    )
    
    # Step 3: Migrate FeeRuleOverride records back to classification-specific FeeRule records
    # Get all override records that have classification_id set
    classification_overrides = connection.execute(
        sa.text("""
            SELECT fee_rule_id, classification_id, override_amount, override_caa_amount
            FROM fee_rule_overrides 
            WHERE classification_id IS NOT NULL
        """)
    ).fetchall()
    
    # For each override, update the corresponding FeeRule to be classification-specific
    for override in classification_overrides:
        connection.execute(
            sa.text("""
                UPDATE fee_rules 
                SET applies_to_classification_id = :classification_id,
                    amount = :override_amount,
                    is_primary_fee = true,
                    caa_override_amount = :caa_override_amount
                WHERE id = :fee_rule_id
            """),
            {
                'classification_id': override.classification_id,
                'override_amount': override.override_amount,
                'caa_override_amount': override.override_caa_amount,
                'fee_rule_id': override.fee_rule_id
            }
        )
    
    # Step 4: Remove the migrated override records
    connection.execute(
        sa.text("""
            DELETE FROM fee_rule_overrides 
            WHERE classification_id IS NOT NULL
        """)
    )
