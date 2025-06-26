from src.extensions import db
from src.models import Permission, Role, User
from src.models.fuel_truck import FuelTruck
from src.models.aircraft_type import AircraftType
from datetime import datetime
from sqlalchemy import text

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

default_aircraft_types = [
    {"name": "Citation CJ3", "base_min_fuel_gallons_for_waiver": 100.00},
    {"name": "Citation Mustang", "base_min_fuel_gallons_for_waiver": 80.00},
    {"name": "Gulfstream G650", "base_min_fuel_gallons_for_waiver": 200.00},
    {"name": "King Air 350", "base_min_fuel_gallons_for_waiver": 120.00},
    {"name": "Pilatus PC-12", "base_min_fuel_gallons_for_waiver": 90.00},
    {"name": "Cessna 172", "base_min_fuel_gallons_for_waiver": 30.00},
    {"name": "Cessna 182", "base_min_fuel_gallons_for_waiver": 35.00},
    {"name": "Piper Archer", "base_min_fuel_gallons_for_waiver": 32.00},
    {"name": "Beechcraft Bonanza", "base_min_fuel_gallons_for_waiver": 40.00},
]

def seed_data():
    """Seeds the database with initial permissions, roles, and default users.
    
    Note: Direct role-permission assignments have been removed. Roles will receive 
    permissions via permission groups managed by permission_groups_schema.py.
    """
    print("Starting database seeding...")
    try:
        # Clear existing data respecting FK constraints (in correct order)
        print("Clearing existing PBAC data (if any)...")
        
        # Clear all dependent tables first (in order of dependencies)
        # Only delete from tables that definitely exist
        tables_to_clear = [
            'user_permission_group_assignments',
            'permission_group_memberships',
            'role_permission_groups',
            'user_permissions',
            'user_roles',
            'fuel_orders',
            'aircraft',
            'customers',
            'fuel_trucks',
            'users',
            'permission_groups',
            'roles',
            'permissions',
        ]
        
        for table in tables_to_clear:
            try:
                db.session.execute(text(f'DELETE FROM {table}'))
                print(f"Cleared table: {table}")
            except Exception as e:
                print(f"Table {table} doesn't exist or couldn't be cleared, skipping... ({e})")
                db.session.rollback()  # Rollback and continue
        
        db.session.commit()

        # Seed Permissions
        print("Seeding Permissions...")
        # Ensure all_permissions uses snake_case
        for p_def in all_permissions:
            if not p_def['name'].islower() or '_' not in p_def['name']:
                print(f"Warning: Permission name '{p_def['name']}' might not be snake_case.")

        permission_objects = [Permission(name=p['name'], description=p.get('description')) for p in all_permissions]
        db.session.bulk_save_objects(permission_objects)
        db.session.commit()
        print(f"Seeded {len(permission_objects)} permissions.")

        # Seed Roles
        print("Seeding Roles...")
        role_objects = [Role(name=r['name'], description=r.get('description')) for r in default_roles]
        db.session.add_all(role_objects)
        db.session.commit()
        print(f"Seeded {len(role_objects)} roles.")

        # --- Role-Permission Assignment Section Removed ---
        # Direct role-permission assignments have been removed.
        # Roles will receive permissions via permission groups defined in permission_groups_schema.py.
        # This must be run after seeds.py via the 'flask create-permission-groups run' command.
        print("Role-permission assignments will be handled by permission_groups_schema.py.")

        # Create Default Users
        print("Creating Default Users...")
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
                    print(f"Default User '{user_data['email']}' with role '{user_data['role']}' created.")
                else:
                    print(f"ERROR: '{user_data['role']}' role not found. Cannot create user '{user_data['email']}'.")
            else:
                print(f"User '{user_data['email']}' already exists.")

        if users_created > 0:
            db.session.commit()
            print(f"Successfully assigned roles to {users_created} default users.")

        # Create Default Fuel Trucks
        print("Creating Default Fuel Trucks...")
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
                print(f"Default Fuel Truck '{truck_data['truck_number']}' ({truck_data['fuel_type']}, {truck_data['capacity']}L, {status}) created.")
            else:
                print(f"Fuel Truck '{truck_data['truck_number']}' already exists.")

        if trucks_created > 0:
            db.session.commit()
            print(f"Successfully created {trucks_created} default fuel trucks.")

        # Create Default Aircraft Types
        print("Creating Default Aircraft Types...")
        aircraft_types_created = 0
        for aircraft_type_data in default_aircraft_types:
            existing_type = AircraftType.query.filter_by(name=aircraft_type_data['name']).first()
            if not existing_type:
                aircraft_type = AircraftType(
                    name=aircraft_type_data['name'],
                    base_min_fuel_gallons_for_waiver=aircraft_type_data['base_min_fuel_gallons_for_waiver']
                )
                db.session.add(aircraft_type)
                aircraft_types_created += 1
                print(f"Default Aircraft Type '{aircraft_type_data['name']}' created.")
            else:
                print(f"Aircraft Type '{aircraft_type_data['name']}' already exists.")

        if aircraft_types_created > 0:
            db.session.commit()
            print(f"Successfully created {aircraft_types_created} default aircraft types.")

        print("Database seeding completed successfully.")
        print("Next step: Run 'flask create-permission-groups run' to configure permission groups and role assignments.")
    except Exception as e:
        db.session.rollback()
        print(f"An error occurred during seeding: {str(e)}")
        raise