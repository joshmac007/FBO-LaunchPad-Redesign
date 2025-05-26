from src.extensions import db
from src.models import Permission, Role, User
from datetime import datetime
from sqlalchemy import text

# --- Data Definitions ---
all_permissions = [
    # Fuel Orders
    {'name': 'CREATE_ORDER', 'description': 'Allows creating new fuel orders', 'category': 'fuel_orders'},
    {'name': 'VIEW_ASSIGNED_ORDERS', 'description': 'Allows viewing orders assigned to self', 'category': 'fuel_orders'},
    {'name': 'VIEW_ALL_ORDERS', 'description': 'Allows viewing all fuel orders', 'category': 'fuel_orders'},
    {'name': 'UPDATE_OWN_ORDER_STATUS', 'description': 'Allows LST to update status of own orders', 'category': 'fuel_orders'},
    {'name': 'COMPLETE_OWN_ORDER', 'description': 'Allows LST to complete own orders', 'category': 'fuel_orders'},
    {'name': 'REVIEW_ORDERS', 'description': 'Allows CSR/Admin to mark orders as reviewed', 'category': 'fuel_orders'},
    {'name': 'EXPORT_ORDERS_CSV', 'description': 'Allows exporting order data to CSV', 'category': 'fuel_orders'},
    {'name': 'VIEW_ORDER_STATS', 'description': 'Allows viewing order statistics', 'category': 'fuel_orders'},
    {'name': 'EDIT_FUEL_ORDER', 'description': 'Allows editing fuel order details', 'category': 'fuel_orders'},
    {'name': 'DELETE_FUEL_ORDER', 'description': 'Allows deleting fuel orders', 'category': 'fuel_orders'},
    
    # Users
    {'name': 'VIEW_USERS', 'description': 'Allows viewing user list', 'category': 'users'},
    {'name': 'MANAGE_USERS', 'description': 'Allows creating, updating, deleting users and assigning roles', 'category': 'users'},
    
    # Fuel Trucks
    {'name': 'VIEW_TRUCKS', 'description': 'Allows viewing fuel truck list', 'category': 'fuel_trucks'},
    {'name': 'MANAGE_TRUCKS', 'description': 'Allows creating, updating, deleting fuel trucks', 'category': 'fuel_trucks'},
    
    # Aircraft
    {'name': 'VIEW_AIRCRAFT', 'description': 'Allows viewing aircraft list', 'category': 'aircraft'},
    {'name': 'MANAGE_AIRCRAFT', 'description': 'Allows creating, updating, deleting aircraft', 'category': 'aircraft'},
    
    # Customers
    {'name': 'VIEW_CUSTOMERS', 'description': 'Allows viewing customer list', 'category': 'customers'},
    {'name': 'MANAGE_CUSTOMERS', 'description': 'Allows creating, updating, deleting customers', 'category': 'customers'},
    
    # System
    {'name': 'MANAGE_ROLES', 'description': 'Allows managing roles and their permissions', 'category': 'system'},
    {'name': 'VIEW_PERMISSIONS', 'description': 'Allows viewing available system permissions', 'category': 'system'},
    {'name': 'MANAGE_SETTINGS', 'description': 'Allows managing global application settings', 'category': 'system'},
]

default_roles = [
    {"name": "System Administrator", "description": "Full system access"},
    {"name": "Customer Service Representative", "description": "Handles customer orders and assignments"},
    {"name": "Line Service Technician", "description": "Executes fuel orders and updates status"},
    {"name": "Member", "description": "Basic member with limited view access"},
]

role_permission_mapping = {
    'System Administrator': [p['name'] for p in all_permissions],
    'Customer Service Representative': [
        'CREATE_ORDER', 'VIEW_ALL_ORDERS', 'REVIEW_ORDERS', 'EXPORT_ORDERS_CSV',
        'VIEW_ORDER_STATS', 'EDIT_FUEL_ORDER',
        'VIEW_USERS', 'VIEW_TRUCKS', 'VIEW_AIRCRAFT', 'VIEW_CUSTOMERS',
        'MANAGE_AIRCRAFT', 'MANAGE_CUSTOMERS',
        'VIEW_PERMISSIONS'
    ],
    'Line Service Technician': [
        'CREATE_ORDER',
        'VIEW_ASSIGNED_ORDERS', 'UPDATE_OWN_ORDER_STATUS', 'COMPLETE_OWN_ORDER',
        'VIEW_ORDER_STATS'
    ],
    'Member': [
        'VIEW_ORDER_STATS', 'VIEW_CUSTOMERS', 'VIEW_AIRCRAFT'
    ]
}

def seed_data():
    """Seeds the database with initial permissions, roles, assignments, and admin user."""
    print("Starting database seeding...")
    try:
        # Optional: Clear existing data respecting FK constraints
        print("Clearing existing PBAC data (if any)...")
        db.session.execute(text('DELETE FROM user_roles'))
        db.session.execute(text('DELETE FROM role_permissions'))
        db.session.execute(text('DELETE FROM fuel_orders'))
        db.session.execute(text('DELETE FROM users'))
        db.session.execute(text('DELETE FROM roles'))
        db.session.execute(text('DELETE FROM permissions'))
        db.session.commit()

        # Seed Permissions
        print("Seeding Permissions...")
        permission_objects = [Permission(name=p['name'], description=p.get('description'), category=p.get('category', 'system')) for p in all_permissions]
        db.session.add_all(permission_objects)
        db.session.commit()
        print(f"Seeded {len(permission_objects)} permissions.")

        # Seed Roles
        print("Seeding Roles...")
        role_objects = [Role(name=r['name'], description=r.get('description')) for r in default_roles]
        db.session.add_all(role_objects)
        db.session.commit()
        print(f"Seeded {len(role_objects)} roles.")

        # Assign Permissions to Roles
        print("Assigning Permissions to Roles...")
        permission_map = {p.name: p for p in Permission.query.all()}
        role_map = {r.name: r for r in Role.query.all()}
        assignments_count = 0
        for role_name, permission_names in role_permission_mapping.items():
            role = role_map.get(role_name)
            if role:
                for perm_name in permission_names:
                    permission = permission_map.get(perm_name)
                    if permission and permission not in role.permissions:
                        role.permissions.append(permission)
                        assignments_count += 1
        db.session.commit()
        print(f"Assigned {assignments_count} permissions to roles.")

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
            print(f"Successfully created {users_created} default users.")

        print("Database seeding completed successfully.")
    except Exception as e:
        db.session.rollback()
        print(f"An error occurred during seeding: {str(e)}") 