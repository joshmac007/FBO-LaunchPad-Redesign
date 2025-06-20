import os
import pytest
import jwt
from datetime import datetime, timedelta
from decimal import Decimal
from src import create_app, config as app_config
from src.models.user import User
from src.models.role import Role
from src.models.permission import Permission
from src.models.aircraft import Aircraft
from src.models.customer import Customer
from src.models.fuel_truck import FuelTruck
from src.models.fuel_order import FuelOrder, FuelOrderStatus
from src.extensions import db as _db

# Patch: Use SQLite in-memory DB for local testing if LOCAL_TEST=1
if os.environ.get('LOCAL_TEST') == '1':
    from src.config import TestingConfig, config as app_config_dict
    class LocalTestConfig(TestingConfig):
        SQLALCHEMY_DATABASE_URI = 'sqlite:///:memory:'
    app_config_dict['testing'] = LocalTestConfig
    print('*** Forcing SQLite in-memory DB for all test runs (LOCAL_TEST=1) ***')

@pytest.fixture(scope='session')
def app():
    """Create application for the tests."""
    # Set the testing environment
    os.environ['FLASK_ENV'] = 'testing'
    
    # Create app with testing config
    app = create_app('testing')
    
    # Create application context
    ctx = app.app_context()
    ctx.push()
    
    yield app
    
    ctx.pop()

@pytest.fixture(scope='session')
def db(app):
    """Set up the database for testing."""
    # Drop all tables first to ensure clean state
    _db.drop_all()
    # Create all tables
    _db.create_all()
    
    yield _db
    
    # Clean up
    _db.session.remove()
    _db.drop_all()

@pytest.fixture(scope='function')
def db_session(app, db):
    """Create a new database session for a test."""
    session = db.session
    yield session
    session.rollback()
    session.remove()

@pytest.fixture(scope='function')
def client(app):
    """Create test client."""
    return app.test_client()

@pytest.fixture(scope='session')
def test_permissions(app, db):
    """Create test permissions."""
    with app.app_context():
        permissions = [
            Permission(name='manage_roles', description='Can manage roles'),
            Permission(name='view_permissions', description='Can view permissions'),
            Permission(name='manage_users', description='Can manage users'),
            Permission(name='view_users', description='Can view users'),
            Permission(name='create_fuel_order', description='Can create fuel orders'),
            Permission(name='manage_fuel_orders', description='Can manage fuel orders'),
            Permission(name='view_fuel_orders', description='Can view fuel orders'),
            Permission(name='view_all_orders', description='Can view all fuel orders'),
            Permission(name='view_assigned_orders', description='Can view assigned fuel orders'),
            Permission(name='complete_fuel_order', description='Can complete fuel orders'),
            Permission(name='perform_fueling_task', description='Can perform fueling tasks'),
            Permission(name='manage_fuel_trucks', description='Can manage fuel trucks'),
            Permission(name='view_fuel_trucks', description='Can view fuel trucks'),
            Permission(name='manage_fbo_fee_schedules', description='Can manage FBO fee schedules'),
            Permission(name='create_receipt', description='Can create receipts'),
            Permission(name='update_receipt', description='Can update receipts'),
            Permission(name='calculate_receipt_fees', description='Can calculate receipt fees'),
            Permission(name='generate_receipt', description='Can generate receipts'),
            Permission(name='mark_receipt_paid', description='Can mark receipts as paid'),
            Permission(name='view_receipts', description='Can view receipts'),
            Permission(name='view_own_receipts', description='Can view own receipts'),
            Permission(name='edit_fuel_order', description='Can edit fuel orders'),
            Permission(name='update_order_status', description='Can update order status'),
            Permission(name='void_receipt', description='Can void receipts'),
            Permission(name='access_fueler_dashboard', description='Allows access to fueler dashboard'),
            Permission(name='access_csr_dashboard', description='Allows access to CSR dashboard'),
            Permission(name='access_admin_dashboard', description='Allows access to admin dashboard')
        ]
        for p in permissions:
            db.session.add(p)
        db.session.commit()

@pytest.fixture(scope='session')
def test_permission_groups(app, db, test_permissions):
    """Create test permission groups for Golden Path architecture."""
    with app.app_context():
        from src.models.permission_group import PermissionGroup, PermissionGroupMembership, RolePermissionGroup
        
        # Create simplified permission groups for testing
        # Admin group gets all permissions
        admin_group = PermissionGroup(
            name='test_admin_group',
            display_name='Test Admin Group',
            description='All permissions for testing',
            is_system_group=True,
            sort_order=100
        )
        db.session.add(admin_group)
        db.session.flush()
        
        # Assign all permissions to admin group
        all_permissions = Permission.query.all()
        for permission in all_permissions:
            membership = PermissionGroupMembership(
                group_id=admin_group.id,
                permission_id=permission.id,
                is_active=True
            )
            db.session.add(membership)
        
        # CSR group gets customer service permissions
        csr_group = PermissionGroup(
            name='test_csr_group',
            display_name='Test CSR Group',
            description='CSR permissions for testing',
            is_system_group=True,
            sort_order=200
        )
        db.session.add(csr_group)
        db.session.flush()
        
        csr_permission_names = [
            'create_fuel_order', 'manage_fuel_orders', 'view_fuel_orders', 'view_all_orders', 'view_users',
            'create_receipt', 'update_receipt', 'calculate_receipt_fees', 'generate_receipt', 
            'mark_receipt_paid', 'view_receipts', 'edit_fuel_order', 'update_order_status', 'void_receipt',
            'access_csr_dashboard'
        ]
        for perm_name in csr_permission_names:
            permission = Permission.query.filter_by(name=perm_name).first()
            if permission:
                membership = PermissionGroupMembership(
                    group_id=csr_group.id,
                    permission_id=permission.id,
                    is_active=True
                )
                db.session.add(membership)
        
        # LST group gets line service permissions
        lst_group = PermissionGroup(
            name='test_lst_group',
            display_name='Test LST Group',
            description='LST permissions for testing',
            is_system_group=True,
            sort_order=300
        )
        db.session.add(lst_group)
        db.session.flush()
        
        lst_permission_names = [
            'create_fuel_order', 'view_assigned_orders', 'update_order_status', 
            'complete_fuel_order', 'perform_fueling_task', 'view_fuel_trucks',
            'view_own_receipts', 'access_fueler_dashboard'
        ]
        for perm_name in lst_permission_names:
            permission = Permission.query.filter_by(name=perm_name).first()
            if permission:
                membership = PermissionGroupMembership(
                    group_id=lst_group.id,
                    permission_id=permission.id,
                    is_active=True
                )
                db.session.add(membership)
        
        db.session.commit()
        return [admin_group, csr_group, lst_group]

@pytest.fixture(scope='session')
def test_roles(app, db, test_permissions, test_permission_groups):
    """Create test roles with permission groups (Golden Path architecture)."""
    with app.app_context():
        from src.models.permission_group import RolePermissionGroup, PermissionGroup
        
        # Re-query permission groups to avoid detached instance issues
        admin_group = PermissionGroup.query.filter_by(name='test_admin_group').first()
        csr_group = PermissionGroup.query.filter_by(name='test_csr_group').first()
        lst_group = PermissionGroup.query.filter_by(name='test_lst_group').first()
        
        # Create roles WITHOUT direct permissions (Golden Path enforcement)
        admin_role = Role(name='Administrator', description='Full system access')
        csr_role = Role(name='Customer Service Representative', description='Customer service access')
        lst_role = Role(name='Line Service Technician', description='Line service access')
        
        roles = [admin_role, csr_role, lst_role]
        for role in roles:
            db.session.add(role)
        db.session.flush()
        
        # Assign permission groups to roles (Golden Path)
        role_group_assignments = [
            RolePermissionGroup(role_id=admin_role.id, group_id=admin_group.id, is_active=True),
            RolePermissionGroup(role_id=csr_role.id, group_id=csr_group.id, is_active=True),
            RolePermissionGroup(role_id=lst_role.id, group_id=lst_group.id, is_active=True)
        ]
        
        for assignment in role_group_assignments:
            db.session.add(assignment)
        
        db.session.commit()
        return roles

@pytest.fixture(scope='session')
def test_users(app, db, test_roles):
    """Create test users."""
    with app.app_context():
        admin_role = Role.query.filter_by(name='Administrator').first()
        csr_role = Role.query.filter_by(name='Customer Service Representative').first()
        lst_role = Role.query.filter_by(name='Line Service Technician').first()
        admin_user = User(
            username='admin',
            email='admin@fbolaunchpad.com',
            name='Admin User',
            is_active=True
        )
        admin_user.set_password('adminpass')
        admin_user.roles.append(admin_role)
        csr_user = User(
            username='csr',
            email='csr@fbolaunchpad.com',
            name='CSR User',
            is_active=True
        )
        csr_user.set_password('csrpass')
        csr_user.roles.append(csr_role)
        lst_user = User(
            username='lst',
            email='lst@fbolaunchpad.com',
            name='LST User',
            is_active=True
        )
        lst_user.set_password('lstpass')
        lst_user.roles.append(lst_role)
        inactive_user = User(
            username='inactive',
            email='inactive@fbolaunchpad.com',
            name='Inactive User',
            is_active=False
        )
        inactive_user.set_password('inactivepass')
        inactive_user.roles.append(lst_role)
        users = [admin_user, csr_user, lst_user, inactive_user]
        for user in users:
            db.session.add(user)
        db.session.commit()
        # Do not return the list

@pytest.fixture(scope='session')
def test_admin_user(app, test_users):
    with app.app_context():
        return User.query.filter_by(username='admin').first()

@pytest.fixture(scope='session')
def test_csr_user(app, test_users):
    with app.app_context():
        return User.query.filter_by(username='csr').first()

@pytest.fixture(scope='session')
def test_lst_user(app, test_users):
    with app.app_context():
        return User.query.filter_by(username='lst').first()

@pytest.fixture(scope='session')
def test_inactive_user(app, test_users):
    with app.app_context():
        return User.query.filter_by(username='inactive').first()

@pytest.fixture(scope='session')
def auth_headers(app, test_users):
    headers = {}
    with app.app_context():
        users = User.query.all()
        for user in users:
            if user.is_active:
                token = jwt.encode(
                    {
                        'sub': str(user.id),
                        'exp': datetime.utcnow() + timedelta(days=1),
                        'iat': datetime.utcnow()
                    },
                    app.config['JWT_SECRET_KEY'],
                    algorithm='HS256'
                )
                role_key = user.roles[0].name.lower().split()[0]
                headers[role_key] = {'Authorization': f'Bearer {token}'}
    return headers

@pytest.fixture(scope='session')
def test_customer(db):
    """Create a test customer."""
    customer = Customer(
        name='Test Customer',
        email='customer@fbolaunchpad.com',
        phone='1234567890'
    )
    db.session.add(customer)
    db.session.commit()
    return customer

@pytest.fixture(scope='session')
def test_aircraft(db, test_customer):
    """Create a test aircraft."""
    aircraft = Aircraft(
        tail_number='N12345',
        aircraft_type='Jet',
        fuel_type='Jet-A'
    )
    db.session.add(aircraft)
    db.session.commit()
    return aircraft

@pytest.fixture(scope='session')
def test_fuel_truck(db):
    """Create a test fuel truck."""
    truck = FuelTruck(
        truck_number='FT001',
        fuel_type='Jet-A',
        capacity=5000.0,
        current_meter_reading=0.0,
        is_active=True
    )
    db.session.add(truck)
    db.session.commit()
    return truck

@pytest.fixture
def test_fuel_order(db, test_aircraft, test_fuel_truck, test_lst_user):
    """Create a test fuel order."""
    # 1. CREATE AND SAVE THE AIRCRAFT FIRST (already done via test_aircraft fixture)
    # This ensures it has a primary key and exists in the database.
    
    # 2. NOW, CREATE THE FUEL ORDER USING THE COMMITTED AIRCRAFT'S tail_number
    order = FuelOrder(
        tail_number=test_aircraft.tail_number,  # Use the exact same tail_number
        fuel_type='Jet-A',
        requested_amount=Decimal('1000.0'),
        assigned_lst_user_id=test_lst_user.id,
        status=FuelOrderStatus.PENDING
    )
    db.session.add(order)
    db.session.commit()
    return order

@pytest.fixture(scope='function')
def runner(app):
    """Create a test CLI runner."""
    return app.test_cli_runner() 