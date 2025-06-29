from src.extensions import db
from src.models import Permission, Role, User
from src.models.fuel_truck import FuelTruck
from src.models.fuel_type import FuelType
from src.models.aircraft_type import AircraftType
from src.models.aircraft_classification import AircraftClassification
from src.models.fee_rule import FeeRule
from src.models.aircraft_type_aircraft_classification_mapping import AircraftTypeToAircraftClassificationMapping
from src.models.fbo_aircraft_type_config import FBOAircraftTypeConfig
from datetime import datetime
from sqlalchemy import text
from sqlalchemy.exc import ProgrammingError
import click

# --- Data Definitions ---
all_permissions = [
    # Fuel Orders
    {'name': 'create_fuel_order', 'description': 'Allows creating new fuel orders', 'category': 'fuel_orders'},
    {'name': 'view_assigned_orders', 'description': 'Allows viewing orders assigned to self', 'category': 'fuel_orders'},
    {'name': 'view_all_orders', 'description': 'Allows viewing all fuel orders', 'category': 'fuel_orders'},
    {'name': 'update_order_status', 'description': 'Allows LST to update status of own orders', 'category': 'fuel_orders'},
    {'name': 'complete_fuel_order', 'description': 'Allows LST to complete own orders', 'category': 'fuel_orders'},
    {'name': 'review_fuel_order', 'description': 'Allows CSR/Admin to mark orders as reviewed', 'category': 'fuel_orders'},
    {'name': 'export_orders_csv', 'description': 'Allows exporting order data to CSV', 'category': 'fuel_orders'},
    {'name': 'view_order_statistics', 'description': 'Allows viewing order statistics', 'category': 'fuel_orders'},
    {'name': 'edit_fuel_order', 'description': 'Allows editing fuel order details', 'category': 'fuel_orders'},
    {'name': 'assign_fuel_order', 'description': 'Allows assigning fuel orders to LST staff', 'category': 'fuel_orders'},
    {'name': 'delete_fuel_order', 'description': 'Allows deleting fuel orders', 'category': 'fuel_orders'},
    {'name': 'perform_fueling_task', 'description': 'Allows performing fueling operations and task management', 'category': 'fuel_orders'},
    
    # Users
    {'name': 'view_users', 'description': 'Allows viewing user list', 'category': 'users'},
    {'name': 'manage_users', 'description': 'Allows creating, updating, deleting users and assigning roles', 'category': 'users'},
    
    # Fuel Trucks (renamed for consistency)
    {'name': 'view_fuel_trucks', 'description': 'Allows viewing fuel truck list', 'category': 'fuel_trucks'},
    {'name': 'manage_fuel_trucks', 'description': 'Allows creating, updating, deleting fuel trucks', 'category': 'fuel_trucks'},
    
    # Aircraft
    {'name': 'view_aircraft', 'description': 'Allows viewing aircraft list', 'category': 'aircraft'},
    {'name': 'manage_aircraft', 'description': 'Allows creating, updating, deleting aircraft', 'category': 'aircraft'},
    {'name': 'manage_aircraft_types', 'description': 'Allows user to create, update, and delete master aircraft types.', 'category': 'aircraft'},
    
    # Customers
    {'name': 'view_customers', 'description': 'Allows viewing customer list', 'category': 'customers'},
    {'name': 'manage_customers', 'description': 'Allows creating, updating, deleting customers', 'category': 'customers'},
    
    # System
    {'name': 'manage_roles', 'description': 'Allows managing roles and their permissions', 'category': 'system'},
    {'name': 'view_permissions', 'description': 'Allows viewing available system permissions', 'category': 'system'},
    {'name': 'view_role_permissions', 'description': 'Allows viewing permissions assigned to roles', 'category': 'system'},
    {'name': 'view_roles', 'description': 'Allows viewing all system roles', 'category': 'system'},
    {'name': 'manage_settings', 'description': 'Allows managing global application settings', 'category': 'system'},
    {'name': 'admin', 'description': 'General administrative access for specific system functions', 'category': 'system'},
    {'name': 'administrative_operations', 'description': 'Allows performing administrative operations and system configuration', 'category': 'system'},
    
    # Dashboard Access Permissions
    {'name': 'access_admin_dashboard', 'description': 'Allows access to admin dashboard', 'category': 'dashboard_access'},
    {'name': 'access_csr_dashboard', 'description': 'Allows access to CSR dashboard', 'category': 'dashboard_access'},
    {'name': 'access_fueler_dashboard', 'description': 'Allows access to fueler dashboard', 'category': 'dashboard_access'},
    {'name': 'access_member_dashboard', 'description': 'Allows access to member dashboard', 'category': 'dashboard_access'},
    
    # Billing/Fees Permissions
    {'name': 'view_billing_info', 'description': 'Allows viewing billing information and fee calculations', 'category': 'billing'},
    {'name': 'calculate_fees', 'description': 'Allows calculating fees and charges', 'category': 'billing'},
    {'name': 'manage_fbo_fee_schedules', 'description': 'Allows managing FBO fee schedules, categories, rules, and waiver tiers', 'category': 'billing'},
    {'name': 'manage_fuel_prices', 'description': 'Allows managing fuel prices for an FBO location', 'category': 'billing'},
    
    # Fuel Receipt System Permissions
    {'name': 'view_receipts', 'description': 'Allows viewing fuel receipts', 'category': 'receipts'},
    {'name': 'view_all_receipts', 'description': 'Allows viewing all fuel receipts', 'category': 'receipts'},
    {'name': 'view_own_receipts', 'description': 'Allows viewing own fuel receipts', 'category': 'receipts'},
    {'name': 'create_receipt', 'description': 'Allows creating new fuel receipts from completed orders', 'category': 'receipts'},
    {'name': 'update_receipt', 'description': 'Allows updating draft fuel receipts', 'category': 'receipts'},
    {'name': 'calculate_receipt_fees', 'description': 'Allows calculating fees for fuel receipts', 'category': 'receipts'},
    {'name': 'generate_receipt', 'description': 'Allows generating final fuel receipts', 'category': 'receipts'},
    {'name': 'mark_receipt_paid', 'description': 'Allows marking fuel receipts as paid', 'category': 'receipts'},
    {'name': 'void_receipt', 'description': 'Allows voiding generated or paid fuel receipts', 'category': 'receipts'},
    {'name': 'manage_receipts', 'description': 'Allows creating, editing, and managing fuel receipts', 'category': 'receipts'},
    {'name': 'export_receipts_csv', 'description': 'Allows exporting receipt data to CSV', 'category': 'receipts'},
]

default_roles = [
    {"name": "System Administrator", "description": "Full system access"},
    {"name": "Customer Service Representative", "description": "Handles customer orders and assignments"},
    {"name": "Line Service Technician", "description": "Executes fuel orders and updates status"},
    {"name": "Member", "description": "Basic member with limited view access"},
]

default_fuel_trucks = [
    {
        "truck_number": "FT-001",
        "fuel_type": "Jet A",
        "capacity": 5000.00,
        "current_meter_reading": 12345.67,
        "is_active": True
    },
    {
        "truck_number": "FT-002",
        "fuel_type": "Jet A",
        "capacity": 5000.00,
        "current_meter_reading": 0.00,
        "is_active": False  # Inactive truck for testing
    }
]

# Default global aircraft classifications
default_classifications = [
    "Piston Single Engine",
    "Piston Multi Engine",
    "Turboprop Single Engine",
    "Turboprop Multi Engine",
    "Light Jet",
    "Medium Jet",
    "Super-Mid Jet",
    "Large Jet",
    "Heavy Jet",
    "Super Heavy Jet",
    "Helicopter",
    "Military"
]

default_aircraft_types = [
    {"name": "Bell 206", "base_min_fuel_gallons_for_waiver": 30.00, "classification": "Helicopter"},
    {"name": "Cessna 172", "base_min_fuel_gallons_for_waiver": 30.00, "classification": "Piston Single Engine"},
    {"name": "Piper Archer", "base_min_fuel_gallons_for_waiver": 30.00, "classification": "Piston Single Engine"},
    {"name": "Beechcraft Baron", "base_min_fuel_gallons_for_waiver": 40.00, "classification": "Piston Multi Engine"},
    {"name": "King Air 350", "base_min_fuel_gallons_for_waiver": 120.00, "classification": "Turboprop Multi Engine"},
    {"name": "Pilatus PC-12", "base_min_fuel_gallons_for_waiver": 80.00, "classification": "Turboprop Single Engine"},
    {"name": "Citation Jet (CJ2, CJ3, CJ4)", "base_min_fuel_gallons_for_waiver": 180.00, "classification": "Light Jet"},
    {"name": "Hawker 400", "base_min_fuel_gallons_for_waiver": 200.00, "classification": "Light Jet"},
    {"name": "Phenom 300", "base_min_fuel_gallons_for_waiver": 275.00, "classification": "Medium Jet"},
    {"name": "Learjet 60", "base_min_fuel_gallons_for_waiver": 275.00, "classification": "Medium Jet"},
    {"name": "Citation XLS", "base_min_fuel_gallons_for_waiver": 275.00, "classification": "Medium Jet"},
    {"name": "Citation X", "base_min_fuel_gallons_for_waiver": 450.00, "classification": "Super-Mid Jet"},
    {"name": "Challenger 300", "base_min_fuel_gallons_for_waiver": 500.00, "classification": "Super-Mid Jet"},
    {"name": "Gulfstream G200", "base_min_fuel_gallons_for_waiver": 500.00, "classification": "Super-Mid Jet"},
    {"name": "Challenger 600", "base_min_fuel_gallons_for_waiver": 600.00, "classification": "Large Jet"},
    {"name": "Falcon 900", "base_min_fuel_gallons_for_waiver": 600.00, "classification": "Large Jet"},
    {"name": "Gulfstream G650", "base_min_fuel_gallons_for_waiver": 900.00, "classification": "Heavy Jet"},
    {"name": "Global Express 5000", "base_min_fuel_gallons_for_waiver": 1000.00, "classification": "Heavy Jet"},
    {"name": "Embraer 145", "base_min_fuel_gallons_for_waiver": 850.00, "classification": "Super Heavy Jet"},
    {"name": "Airbus A320", "base_min_fuel_gallons_for_waiver": 1500.00, "classification": "Super Heavy Jet"},
    {"name": "C130 Hercules", "base_min_fuel_gallons_for_waiver": 1750.00, "classification": "Military"},
    {"name": "C17 Globemaster", "base_min_fuel_gallons_for_waiver": 2000.00, "classification": "Military"}
]

default_fuel_types = [
    {
        "name": "Jet A",
        "code": "JET_A",
        "description": "Standard aviation turbine fuel",
        "is_active": True
    },
    {
        "name": "Avgas 100LL",
        "code": "AVGAS_100LL",
        "description": "Aviation gasoline for piston engines",
        "is_active": True
    },
    {
        "name": "Sustainable Aviation Fuel (Jet A)",
        "code": "SAF_JET_A",
        "description": "Sustainable aviation fuel, Jet A specification",
        "is_active": True
    }
]

def seed_data():
    """Seeds the database with initial permissions, roles, and default users.
    
    Note: Direct role-permission assignments have been removed. Roles will receive 
    permissions via permission groups managed by permission_groups_schema.py.
    """
    click.echo("Starting database seeding...")
    try:
        # Clear existing data respecting FK constraints (in correct order)
        click.echo("Clearing existing data...")
        
        # **CORRECTED DELETION ORDER**
        # Clear junction/dependent tables FIRST, then primary tables.
        tables_to_clear = [
            # Junction tables for many-to-many relationships
            'user_roles',
            'role_permissions',  # Legacy, may not exist
            'user_permissions',
            'user_permission_group_assignments',
            'permission_group_memberships',
            'role_permission_groups',

            # Tables with foreign keys to primary tables
            'audit_logs',
            'receipt_line_items',
            'receipts',
            'fuel_orders',
            'fee_rule_overrides',
            'fbo_aircraft_type_configs',
            'aircraft_classification_mappings',
            'fee_rules',
            'aircraft',

            # Primary tables (fewest dependencies)
            'customers',
            'fuel_trucks',
            'permission_groups',
            'permissions',
            'roles',
            'users',

            # Fee system primary tables
            'aircraft_types',
            'aircraft_classifications',
            'fuel_types'
        ]
        
        # Use TRUNCATE CASCADE for more reliable table clearing
        # This approach handles foreign key constraints automatically
        for table in tables_to_clear:
            try:
                # Use TRUNCATE CASCADE for complete table clearing
                db.session.execute(text(f'TRUNCATE TABLE {table} RESTART IDENTITY CASCADE;'))
                click.echo(f"Truncated table: {table}")
            except ProgrammingError as e:
                db.session.rollback()
                # If TRUNCATE fails, table probably doesn't exist
                if "does not exist" in str(e):
                    click.echo(f"Table {table} not found, skipping.")
                else:
                    click.echo(f"Error truncating table {table}: {e}")
            except Exception as e:
                db.session.rollback()
                click.echo(f"Error truncating table {table}: {e}")
        
        try:
            db.session.commit()
            click.echo("Successfully cleared all existing data.")
        except Exception as e:
            db.session.rollback()
            click.echo(f"Error committing table clearing: {e}")
            raise

        # Seed Permissions
        click.echo("Seeding permissions...")
        
        # --- START: REVISED IDEMPOTENT LOGIC ---
        # Get all permission names that already exist in the database.
        existing_permissions_query = db.session.query(Permission.name).all()
        existing_permissions = {name for (name,) in existing_permissions_query}
        
        permissions_to_add = []
        
        # Create a set of names from the definitions to check for duplicates within the list itself
        defined_permission_names = set()

        for p_def in all_permissions:
            perm_name = p_def['name']
            
            # Internal check for duplicates in the all_permissions list
            if perm_name in defined_permission_names:
                click.echo(f"Warning: Duplicate permission name '{perm_name}' found in definitions. Skipping.")
                continue
            defined_permission_names.add(perm_name)

            # Check if the permission already exists in the database
            if perm_name not in existing_permissions:
                permissions_to_add.append(
                    Permission(name=perm_name, description=p_def.get('description'))
                )
        
        if permissions_to_add:
            db.session.bulk_save_objects(permissions_to_add)
            click.echo(f"Seeded {len(permissions_to_add)} new permissions.")
        else:
            click.echo("All permissions already exist in the database. No new permissions were added.")
        # --- END: REVISED IDEMPOTENT LOGIC ---

        # Commit the changes before proceeding
        db.session.commit()

        # Seed Roles
        click.echo("Seeding roles...")
        
        # Get all role names that already exist in the database
        existing_roles_query = db.session.query(Role.name).all()
        existing_roles = {name for (name,) in existing_roles_query}
        
        roles_to_add = []
        
        for role_def in default_roles:
            role_name = role_def['name']
            
            # Check if the role already exists in the database
            if role_name not in existing_roles:
                roles_to_add.append(
                    Role(name=role_name, description=role_def.get('description'))
                )
        
        if roles_to_add:
            db.session.add_all(roles_to_add)
            db.session.commit()
            click.echo(f"Seeded {len(roles_to_add)} new roles.")
        else:
            click.echo("All roles already exist in the database. No new roles were added.")
        
        # Commit the changes before proceeding
        db.session.commit()

        # Seed Aircraft Classifications
        click.echo("Seeding aircraft classifications...")
        
        # Get all classification names that already exist in the database
        existing_classifications_query = db.session.query(AircraftClassification.name).all()
        existing_classifications = {name for (name,) in existing_classifications_query}
        
        classifications_to_add = []
        
        for classification_name in default_classifications:
            # Check if the classification already exists in the database
            if classification_name not in existing_classifications:
                classifications_to_add.append(
                    AircraftClassification(name=classification_name)
                )
        
        if classifications_to_add:
            db.session.add_all(classifications_to_add)
            db.session.commit()
            click.echo(f"Seeded {len(classifications_to_add)} new aircraft classifications.")
        else:
            click.echo("All aircraft classifications already exist in the database. No new classifications were added.")
        
        # Commit the changes before proceeding
        db.session.commit()

        # --- Role-Permission Assignment Section Removed ---
        # Direct role-permission assignments have been removed.
        # Roles will receive permissions via permission groups defined in permission_groups_schema.py.
        # This must be run after seeds.py via the 'flask create-permission-groups run' command.
        click.echo("Role-permission assignments will be handled by permission_groups_schema.py.")

        # Create Default Users
        click.echo("Creating default users...")
        default_users = [
            {
                'email': 'admin@fbolaunchpad.com',
                'username': 'admin',
                'name': 'Admin User',
                'password': 'Admin123!',
                'role': 'System Administrator'
            },
            {
                'email': 'csr@fbolaunchpad.com',
                'username': 'csr',
                'name': 'CSR User',
                'password': 'CSR123!',
                'role': 'Customer Service Representative'
            },
            {
                'email': 'fueler@fbolaunchpad.com',
                'username': 'fueler',
                'name': 'Fueler User',
                'password': 'Fueler123!',
                'role': 'Line Service Technician'
            },
            {
                'email': 'member@fbolaunchpad.com',
                'username': 'member',
                'name': 'Member User',
                'password': 'Member123!',
                'role': 'Member'
            }
        ]

        # Create a role map for user assignment
        role_map = {r.name: r for r in Role.query.all()}
        users_created = 0
        for user_data in default_users:
            if not User.query.filter_by(email=user_data['email']).first():
                user_role = role_map.get(user_data['role'])
                if user_role:
                    user = User(
                        email=user_data['email'],
                        username=user_data['username'],
                        name=user_data['name'],
                        is_active=True
                    )
                    user.fbo_location_id = 1
                    user.set_password(user_data['password'])
                    user.roles.append(user_role)
                    db.session.add(user)
                    users_created += 1
                    click.echo(f"Default User '{user_data['email']}' with role '{user_data['role']}' created.")
                else:
                    click.echo(f"ERROR: '{user_data['role']}' role not found. Cannot create user '{user_data['email']}'.")
            else:
                click.echo(f"User '{user_data['email']}' already exists.")

        if users_created > 0:
            db.session.commit()
            click.echo(f"Successfully assigned roles to {users_created} default users.")

        # Create Default Fuel Trucks
        click.echo("Creating default fuel trucks...")
        trucks_created = 0
        for truck_data in default_fuel_trucks:
            if not FuelTruck.query.filter_by(truck_number=truck_data['truck_number']).first():
                truck = FuelTruck(
                    truck_number=truck_data['truck_number'],
                    fuel_type=truck_data['fuel_type'],
                    capacity=truck_data['capacity'],
                    current_meter_reading=truck_data['current_meter_reading'],
                    is_active=truck_data['is_active']
                )
                db.session.add(truck)
                trucks_created += 1
                status = "active" if truck_data['is_active'] else "inactive"
                click.echo(f"Default Fuel Truck '{truck_data['truck_number']}' ({truck_data['fuel_type']}, {truck_data['capacity']}L, {status}) created.")
            else:
                click.echo(f"Fuel Truck '{truck_data['truck_number']}' already exists.")

        if trucks_created > 0:
            db.session.commit()
            click.echo(f"Successfully created {trucks_created} default fuel trucks.")

        # Create Default Aircraft Types
        click.echo("Creating default aircraft types...")
        
        # Create a map of classification names to their IDs
        classification_map = {c.name: c.id for c in AircraftClassification.query.all()}
        
        aircraft_types_created = 0
        for aircraft_type_data in default_aircraft_types:
            existing_type = AircraftType.query.filter_by(name=aircraft_type_data['name']).first()
            if not existing_type:
                # Look up the classification_id from the seeded classifications
                classification_name = aircraft_type_data.get('classification', 'Unclassified')
                classification_id = classification_map.get(classification_name)
                
                if not classification_id:
                    click.echo(f"Warning: Classification '{classification_name}' not found for aircraft type '{aircraft_type_data['name']}'. Using 'Unclassified'.")
                    classification_id = classification_map.get('Unclassified')
                
                aircraft_type = AircraftType(
                    name=aircraft_type_data['name'],
                    base_min_fuel_gallons_for_waiver=aircraft_type_data['base_min_fuel_gallons_for_waiver'],
                    classification_id=classification_id
                )
                db.session.add(aircraft_type)
                aircraft_types_created += 1
                click.echo(f"Default Aircraft Type '{aircraft_type_data['name']}' created with classification '{classification_name}'.")
            else:
                click.echo(f"Aircraft Type '{aircraft_type_data['name']}' already exists.")

        if aircraft_types_created > 0:
            db.session.commit()
            click.echo(f"Successfully created {aircraft_types_created} default aircraft types.")

        # Create Default Fuel Types
        click.echo("Creating default fuel types...")
        fuel_types_created = 0
        for fuel_type_data in default_fuel_types:
            existing_fuel_type = FuelType.query.filter_by(name=fuel_type_data['name']).first()
            if not existing_fuel_type:
                fuel_type = FuelType(
                    name=fuel_type_data['name'],
                    code=fuel_type_data['code'],
                    description=fuel_type_data['description'],
                    is_active=fuel_type_data['is_active']
                )
                db.session.add(fuel_type)
                fuel_types_created += 1
                click.echo(f"Default Fuel Type '{fuel_type_data['name']}' created.")
            else:
                click.echo(f"Fuel Type '{fuel_type_data['name']}' already exists.")

        if fuel_types_created > 0:
            db.session.commit()
            click.echo(f"Successfully created {fuel_types_created} default fuel types.")

        # Seed Default Fee Rules for FBO 1 using global classifications
        click.echo("Seeding default fee setup for FBO 1...")
        try:
            fbo_id = 1
            
            # Get the 'Unclassified' classification to use for default fee rules
            default_classification = AircraftClassification.query.filter_by(name="Unclassified").first()
            if not default_classification:
                click.echo("Warning: 'Unclassified' classification not found. Creating it.")
                default_classification = AircraftClassification(name="Unclassified")
                db.session.add(default_classification)
                db.session.flush()

            # Check if fee rules already exist for this FBO
            existing_rules = FeeRule.query.filter_by(fbo_location_id=fbo_id).first()
            if not existing_rules:
                # Create Default Primary Fee Rules
                default_rules = [
                    {'fee_name': 'Hangar O/N', 'fee_code': 'HGR-OVN', 'amount': 0.00, 'is_primary_fee': True},
                    {'fee_name': 'Overnight', 'fee_code': 'OVN', 'amount': 0.00, 'is_primary_fee': True},
                    {'fee_name': 'Ramp', 'fee_code': 'RAMP', 'amount': 0.00, 'is_primary_fee': True},
                ]

                rules_created = 0
                for rule_data in default_rules:
                    new_rule = FeeRule(
                        fbo_location_id=fbo_id,
                        applies_to_classification_id=default_classification.id,
                        fee_name=rule_data['fee_name'],
                        fee_code=rule_data['fee_code'],
                        amount=rule_data['amount'],
                        is_primary_fee=rule_data['is_primary_fee']
                    )
                    db.session.add(new_rule)
                    rules_created += 1
                click.echo(f"Created {rules_created} primary fee rules for FBO {fbo_id} using 'Unclassified' classification.")

                # Create FBOAircraftTypeConfig for all aircraft types
                all_aircraft_types = AircraftType.query.all()
                configs_created = 0
                for aircraft_type in all_aircraft_types:
                    fbo_config = FBOAircraftTypeConfig.query.filter_by(
                        fbo_location_id=fbo_id,
                        aircraft_type_id=aircraft_type.id
                    ).first()
                    if not fbo_config:
                        # Use the default value from the aircraft type as the initial FBO-specific value
                        config = FBOAircraftTypeConfig(
                            fbo_location_id=fbo_id,
                            aircraft_type_id=aircraft_type.id,
                            base_min_fuel_gallons_for_waiver=aircraft_type.base_min_fuel_gallons_for_waiver
                        )
                        db.session.add(config)
                        configs_created += 1

                click.echo(f"Created {configs_created} FBO aircraft type configurations.")
            else:
                click.echo(f"Default fee setup for FBO {fbo_id} already exists, skipping.")
        except Exception as e:
            db.session.rollback()
            click.echo(f"Error seeding fee setup: {e}")

        # Commit all changes
        db.session.commit()
        click.echo("Database seeding complete!")
    except Exception as e:
        db.session.rollback()
        click.echo(f"An error occurred during seeding: {str(e)}")
        raise