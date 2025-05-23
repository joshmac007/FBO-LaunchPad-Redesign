from src.extensions import db
from src.models import Permission, Role, User
from datetime import datetime
from sqlalchemy import text

# --- Data Definitions ---
all_permissions = [
    {'name': 'CREATE_ORDER', 'description': 'Allows creating new fuel orders'},
    {'name': 'VIEW_ASSIGNED_ORDERS', 'description': 'Allows viewing orders assigned to self'},
    {'name': 'VIEW_ALL_ORDERS', 'description': 'Allows viewing all fuel orders'},
    {'name': 'UPDATE_OWN_ORDER_STATUS', 'description': 'Allows LST to update status of own orders'},
    {'name': 'COMPLETE_OWN_ORDER', 'description': 'Allows LST to complete own orders'},
    {'name': 'REVIEW_ORDERS', 'description': 'Allows CSR/Admin to mark orders as reviewed'},
    {'name': 'EXPORT_ORDERS_CSV', 'description': 'Allows exporting order data to CSV'},
    {'name': 'VIEW_ORDER_STATS', 'description': 'Allows viewing order statistics'},
    {'name': 'EDIT_FUEL_ORDER', 'description': 'Allows editing fuel order details'},
    {'name': 'DELETE_FUEL_ORDER', 'description': 'Allows deleting fuel orders'},
    {'name': 'VIEW_USERS', 'description': 'Allows viewing user list'},
    {'name': 'MANAGE_USERS', 'description': 'Allows creating, updating, deleting users and assigning roles'},
    {'name': 'VIEW_TRUCKS', 'description': 'Allows viewing fuel truck list'},
    {'name': 'MANAGE_TRUCKS', 'description': 'Allows creating, updating, deleting fuel trucks'},
    {'name': 'VIEW_AIRCRAFT', 'description': 'Allows viewing aircraft list'},
    {'name': 'MANAGE_AIRCRAFT', 'description': 'Allows creating, updating, deleting aircraft'},
    {'name': 'VIEW_CUSTOMERS', 'description': 'Allows viewing customer list'},
    {'name': 'MANAGE_CUSTOMERS', 'description': 'Allows creating, updating, deleting customers'},
    {'name': 'MANAGE_ROLES', 'description': 'Allows managing roles and their permissions'},
    {'name': 'VIEW_PERMISSIONS', 'description': 'Allows viewing available system permissions'},
    {'name': 'MANAGE_SETTINGS', 'description': 'Allows managing global application settings'},
]

default_roles = [
    {"name": "System Administrator", "description": "Full system access"},
    {"name": "Customer Service Representative", "description": "Handles customer orders and assignments"},
    {"name": "Line Service Technician", "description": "Executes fuel orders and updates status"},
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
        permission_objects = [Permission(name=p['name'], description=p.get('description')) for p in all_permissions]
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

        # Create Default Admin User
        print("Creating Default Admin User...")
        admin_email = 'admin@fbolaunchpad.com'
        admin_pass = 'Admin123!'
        if not User.query.filter_by(email=admin_email).first():
            admin_role = role_map.get('System Administrator')
            if admin_role:
                admin_user = User(
                    email=admin_email,
                    username='admin',
                    name='Admin User',
                    is_active=True
                )
                admin_user.set_password(admin_pass)
                admin_user.roles.append(admin_role)
                db.session.add(admin_user)
                db.session.commit()
                print(f"Default Admin User '{admin_email}' created.")
            else:
                print("ERROR: 'System Administrator' role not found. Cannot create admin user.")
        else:
            print(f"Admin user '{admin_email}' already exists.")

        print("Database seeding completed successfully.")
    except Exception as e:
        db.session.rollback()
        print(f"An error occurred during seeding: {str(e)}") 