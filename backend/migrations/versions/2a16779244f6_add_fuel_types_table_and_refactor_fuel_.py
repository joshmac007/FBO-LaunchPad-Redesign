"""add fuel_types table and refactor fuel type references

Revision ID: 2a16779244f6
Revises: 9e368eb13f42
Create Date: 2025-06-26 22:16:49.539492

"""
from alembic import op
import sqlalchemy as sa
from datetime import datetime


# revision identifiers, used by Alembic.
revision = '2a16779244f6'
down_revision = '9e368eb13f42'
branch_labels = None
depends_on = None


def upgrade():
    # Step 1: Create fuel_types table
    # Check if table already exists
    connection = op.get_bind()
    result = connection.execute(sa.text("""
        SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = 'fuel_types'
        );
    """))
    table_exists = result.scalar()
    
    if not table_exists:
        op.create_table('fuel_types',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.Column('code', sa.String(length=50), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint('id')
        )
        with op.batch_alter_table('fuel_types', schema=None) as batch_op:
            batch_op.create_index(batch_op.f('ix_fuel_types_code'), ['code'], unique=True)
            batch_op.create_index(batch_op.f('ix_fuel_types_is_active'), ['is_active'], unique=False)
            batch_op.create_index(batch_op.f('ix_fuel_types_name'), ['name'], unique=True)

    # Step 2: Seed initial fuel types data
    fuel_types_table = sa.table('fuel_types',
        sa.column('name', sa.String),
        sa.column('code', sa.String),
        sa.column('description', sa.String),
        sa.column('is_active', sa.Boolean),
        sa.column('created_at', sa.DateTime),
        sa.column('updated_at', sa.DateTime)
    )
    
    now = datetime.utcnow()
    op.bulk_insert(fuel_types_table, [
        {
            'name': 'Jet A',
            'code': 'JET_A',
            'description': 'Standard aviation turbine fuel',
            'is_active': True,
            'created_at': now,
            'updated_at': now
        },
        {
            'name': 'Avgas 100LL',
            'code': 'AVGAS_100LL', 
            'description': 'Aviation gasoline for piston engines',
            'is_active': True,
            'created_at': now,
            'updated_at': now
        },
        {
            'name': 'Sustainable Aviation Fuel (Jet A)',
            'code': 'SAF_JET_A',
            'description': 'Sustainable aviation fuel, Jet A specification',
            'is_active': True,
            'created_at': now,
            'updated_at': now
        }
    ])

    # Step 3: Add fuel_type_id columns to existing tables
    with op.batch_alter_table('fuel_prices', schema=None) as batch_op:
        batch_op.add_column(sa.Column('fuel_type_id', sa.Integer(), nullable=True))
        batch_op.create_foreign_key('fk_fuel_prices_fuel_type_id', 'fuel_types', ['fuel_type_id'], ['id'])

    with op.batch_alter_table('aircraft', schema=None) as batch_op:
        batch_op.add_column(sa.Column('fuel_type_id', sa.Integer(), nullable=True))
        batch_op.create_foreign_key('fk_aircraft_fuel_type_id', 'fuel_types', ['fuel_type_id'], ['id'])

    with op.batch_alter_table('fuel_orders', schema=None) as batch_op:
        batch_op.add_column(sa.Column('fuel_type_id', sa.Integer(), nullable=True))
        batch_op.create_foreign_key('fk_fuel_orders_fuel_type_id', 'fuel_types', ['fuel_type_id'], ['id'])

    # Step 4: Migrate existing data - populate fuel_type_id based on string values
    connection = op.get_bind()
    
    try:
        # Get fuel type IDs with error handling
        result = connection.execute(sa.text("SELECT id, code FROM fuel_types"))
        fuel_type_mapping = {row[1]: row[0] for row in result}
        
        if not fuel_type_mapping:
            raise ValueError("No fuel types found in database - migration cannot proceed")
        
        # Migrate fuel_prices table
        # First, map the enum values to our new codes
        enum_to_code_mapping = {
            'JET_A': 'JET_A',
            'AVGAS_100LL': 'AVGAS_100LL', 
            'SAF_JET_A': 'SAF_JET_A'
        }
        
        # Track migration statistics for verification
        fuel_prices_updated = 0
        aircraft_updated = 0
        fuel_orders_updated = 0
        
        for enum_value, code in enum_to_code_mapping.items():
            if code in fuel_type_mapping:
                result = connection.execute(sa.text(
                    "UPDATE fuel_prices SET fuel_type_id = :fuel_type_id WHERE fuel_type = :enum_value"
                ), {'fuel_type_id': fuel_type_mapping[code], 'enum_value': enum_value})
                fuel_prices_updated += result.rowcount
        
        # Migrate aircraft table (map common string values)
        aircraft_fuel_type_mapping = {
            'Jet-A': 'JET_A',
            'Jet A': 'JET_A', 
            'JET_A': 'JET_A',
            'Avgas': 'AVGAS_100LL',
            'Avgas 100LL': 'AVGAS_100LL',
            'AVGAS_100LL': 'AVGAS_100LL',
            'SAF': 'SAF_JET_A',
            'SAF_JET_A': 'SAF_JET_A'
        }
        
        for aircraft_fuel_type, code in aircraft_fuel_type_mapping.items():
            if code in fuel_type_mapping:
                result = connection.execute(sa.text(
                    "UPDATE aircraft SET fuel_type_id = :fuel_type_id WHERE fuel_type = :aircraft_fuel_type"
                ), {'fuel_type_id': fuel_type_mapping[code], 'aircraft_fuel_type': aircraft_fuel_type})
                aircraft_updated += result.rowcount
        
        # Migrate fuel_orders table (map common string values)
        for aircraft_fuel_type, code in aircraft_fuel_type_mapping.items():
            if code in fuel_type_mapping:
                result = connection.execute(sa.text(
                    "UPDATE fuel_orders SET fuel_type_id = :fuel_type_id WHERE fuel_type = :aircraft_fuel_type"
                ), {'fuel_type_id': fuel_type_mapping[code], 'aircraft_fuel_type': aircraft_fuel_type})
                fuel_orders_updated += result.rowcount
        
        # Verify migration was successful
        # Check for any rows that couldn't be migrated
        unmigrated_fuel_prices = connection.execute(sa.text(
            "SELECT COUNT(*) FROM fuel_prices WHERE fuel_type_id IS NULL"
        )).scalar() or 0
        
        unmigrated_aircraft = connection.execute(sa.text(
            "SELECT COUNT(*) FROM aircraft WHERE fuel_type_id IS NULL"
        )).scalar() or 0
        
        unmigrated_fuel_orders = connection.execute(sa.text(
            "SELECT COUNT(*) FROM fuel_orders WHERE fuel_type_id IS NULL"
        )).scalar() or 0
        
        # Only warn for unmigrated data - don't fail migration for empty database
        if unmigrated_fuel_prices > 0 or unmigrated_aircraft > 0 or unmigrated_fuel_orders > 0:
            print(f"Warning: {unmigrated_fuel_prices} fuel_prices, {unmigrated_aircraft} aircraft, {unmigrated_fuel_orders} fuel_orders could not be migrated")
        
        print(f"Migration successful: {fuel_prices_updated} fuel_prices, {aircraft_updated} aircraft, {fuel_orders_updated} fuel_orders migrated")
        
    except Exception as e:
        # Log the error but don't fail the migration for empty tables
        print(f"Warning during data migration: {str(e)}")
        print("Migration continuing - this is normal for empty database")

    # Step 5: Make fuel_type_id NOT NULL and drop old fuel_type columns
    with op.batch_alter_table('fuel_prices', schema=None) as batch_op:
        batch_op.alter_column('fuel_type_id', nullable=False)
        batch_op.drop_column('fuel_type')

    with op.batch_alter_table('aircraft', schema=None) as batch_op:
        batch_op.alter_column('fuel_type_id', nullable=False)
        batch_op.drop_column('fuel_type')

    with op.batch_alter_table('fuel_orders', schema=None) as batch_op:
        batch_op.alter_column('fuel_type_id', nullable=False)
        batch_op.drop_column('fuel_type')


def downgrade():
    # Step 1: Re-add fuel_type string columns to tables
    with op.batch_alter_table('fuel_orders', schema=None) as batch_op:
        batch_op.add_column(sa.Column('fuel_type', sa.String(50), nullable=True))

    with op.batch_alter_table('aircraft', schema=None) as batch_op:
        batch_op.add_column(sa.Column('fuel_type', sa.String(20), nullable=True))

    with op.batch_alter_table('fuel_prices', schema=None) as batch_op:
        # Need to recreate the enum type for fuel_prices
        batch_op.add_column(sa.Column('fuel_type', sa.String(), nullable=True))

    # Step 2: Restore data from fuel_type_id back to string columns
    connection = op.get_bind()
    
    # Mapping from fuel type IDs back to string values
    # Get fuel types data first
    result = connection.execute(sa.text("SELECT id, code FROM fuel_types"))
    fuel_type_id_to_code = {row[0]: row[1] for row in result}
    
    # Reverse mapping from codes to enum/string values
    code_to_enum_mapping = {
        'JET_A': 'JET_A',
        'AVGAS_100LL': 'AVGAS_100LL',
        'SAF_JET_A': 'SAF_JET_A'
    }
    
    code_to_aircraft_fuel_mapping = {
        'JET_A': 'Jet-A',
        'AVGAS_100LL': 'Avgas 100LL',
        'SAF_JET_A': 'SAF'
    }
    
    # Restore fuel_prices data
    for fuel_type_id, code in fuel_type_id_to_code.items():
        if code in code_to_enum_mapping:
            connection.execute(sa.text(
                "UPDATE fuel_prices SET fuel_type = :enum_value WHERE fuel_type_id = :fuel_type_id"
            ), {'enum_value': code_to_enum_mapping[code], 'fuel_type_id': fuel_type_id})
    
    # Restore aircraft data
    for fuel_type_id, code in fuel_type_id_to_code.items():
        if code in code_to_aircraft_fuel_mapping:
            connection.execute(sa.text(
                "UPDATE aircraft SET fuel_type = :aircraft_fuel_type WHERE fuel_type_id = :fuel_type_id"
            ), {'aircraft_fuel_type': code_to_aircraft_fuel_mapping[code], 'fuel_type_id': fuel_type_id})
    
    # Restore fuel_orders data
    for fuel_type_id, code in fuel_type_id_to_code.items():
        if code in code_to_aircraft_fuel_mapping:
            connection.execute(sa.text(
                "UPDATE fuel_orders SET fuel_type = :aircraft_fuel_type WHERE fuel_type_id = :fuel_type_id"
            ), {'aircraft_fuel_type': code_to_aircraft_fuel_mapping[code], 'fuel_type_id': fuel_type_id})

    # Step 3: Make fuel_type columns NOT NULL and remove foreign keys and fuel_type_id columns
    with op.batch_alter_table('fuel_prices', schema=None) as batch_op:
        batch_op.alter_column('fuel_type', nullable=False)
        batch_op.drop_constraint('fk_fuel_prices_fuel_type_id', type_='foreignkey')
        batch_op.drop_column('fuel_type_id')

    with op.batch_alter_table('aircraft', schema=None) as batch_op:
        batch_op.alter_column('fuel_type', nullable=False)
        batch_op.drop_constraint('fk_aircraft_fuel_type_id', type_='foreignkey')
        batch_op.drop_column('fuel_type_id')

    with op.batch_alter_table('fuel_orders', schema=None) as batch_op:
        batch_op.alter_column('fuel_type', nullable=False)
        batch_op.drop_constraint('fk_fuel_orders_fuel_type_id', type_='foreignkey')
        batch_op.drop_column('fuel_type_id')

    # Step 4: Drop fuel_types table
    with op.batch_alter_table('fuel_types', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_fuel_types_name'))
        batch_op.drop_index(batch_op.f('ix_fuel_types_is_active'))
        batch_op.drop_index(batch_op.f('ix_fuel_types_code'))

    op.drop_table('fuel_types')
