import os
import pytest
import jwt
from datetime import datetime, timedelta
from src import create_app, config as app_config
from src.models.user import User
from src.models.role import Role
from src.models.permission import Permission
from src.models.aircraft import Aircraft
from src.models.customer import Customer
from src.models.fuel_truck import FuelTruck
from src.models.fuel_order import FuelOrder
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
            Permission(name='MANAGE_ROLES', description='Can manage roles'),
            Permission(name='VIEW_PERMISSIONS', description='Can view permissions'),
            Permission(name='MANAGE_USERS', description='Can manage users'),
            Permission(name='VIEW_USERS', description='Can view users'),
            Permission(name='CREATE_ORDER', description='Can create fuel orders'),
            Permission(name='MANAGE_ORDERS', description='Can manage fuel orders'),
            Permission(name='VIEW_ORDERS', description='Can view fuel orders'),
            Permission(name='COMPLETE_ORDER', description='Can complete fuel orders'),
            Permission(name='MANAGE_TRUCKS', description='Can manage fuel trucks'),
            Permission(name='VIEW_TRUCKS', description='Can view fuel trucks')
        ]
        for p in permissions:
            db.session.add(p)
        db.session.commit()

@pytest.fixture(scope='session')
def test_roles(app, db, test_permissions):
    """Create test roles."""
    with app.app_context():
        # Query permissions from the database to ensure they are attached to the session
        all_permissions = Permission.query.all()
        perm_dict = {p.name: p for p in all_permissions}
        # Admin role gets all permissions
        admin_role = Role(name='Administrator', description='Full system access')
        admin_role.permissions.extend(all_permissions)
        # CSR role gets customer service permissions
        csr_role = Role(name='Customer Service Representative', description='Customer service access')
        csr_permissions = [perm_dict[n] for n in [
            'CREATE_ORDER', 'MANAGE_ORDERS', 'VIEW_ORDERS', 'VIEW_USERS'
        ] if n in perm_dict]
        csr_role.permissions.extend(csr_permissions)
        # LST role gets limited permissions
        lst_role = Role(name='Line Service Technician', description='Line service access')
        lst_permissions = [perm_dict[n] for n in [
            'VIEW_ORDERS', 'COMPLETE_ORDER', 'VIEW_TRUCKS'
        ] if n in perm_dict]
        lst_role.permissions.extend(lst_permissions)
        roles = [admin_role, csr_role, lst_role]
        for role in roles:
            db.session.add(role)
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
            email='admin@test.com',
            name='Admin User',
            is_active=True
        )
        admin_user.set_password('adminpass')
        admin_user.roles.append(admin_role)
        csr_user = User(
            username='csr',
            email='csr@test.com',
            name='CSR User',
            is_active=True
        )
        csr_user.set_password('csrpass')
        csr_user.roles.append(csr_role)
        lst_user = User(
            username='lst',
            email='lst@test.com',
            name='LST User',
            is_active=True
        )
        lst_user.set_password('lstpass')
        lst_user.roles.append(lst_role)
        inactive_user = User(
            username='inactive',
            email='inactive@test.com',
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
        email='customer@test.com',
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
    order = FuelOrder(
        aircraft_id=test_aircraft.id,
        fuel_truck_id=test_fuel_truck.id,
        lst_id=test_lst_user.id,
        fuel_type='Jet-A',
        amount_requested=1000.0,
        status='pending'
    )
    db.session.add(order)
    db.session.commit()
    return order

@pytest.fixture(scope='function')
def runner(app):
    """Create a test CLI runner."""
    return app.test_cli_runner() 