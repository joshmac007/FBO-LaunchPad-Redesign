"""Tests for authentication endpoints."""

import pytest
import json
from src.models.user import User
from flask import g
from src.models.role import Role
from src.models.permission import Permission
from src.routes.auth_routes import reset_rate_limits

@pytest.fixture(autouse=True)
def reset_rate_limiting():
    """Reset rate limiting between tests."""
    reset_rate_limits()
    yield

# === Registration Tests (/auth/register) ===

def test_register_success(client, db_session, test_roles):
    """ Test successful user registration """
    response = client.post('/api/auth/register', json={
        'username': 'newuser',
        'name': 'New User',
        'email': 'newuser@test.com',
        'password': 'password123'
    })
    assert response.status_code == 201
    data = json.loads(response.data)
    assert data['message'] == 'User registered successfully'
    assert 'user' in data
    assert data['user']['email'] == 'newuser@test.com'
    assert data['user']['name'] == 'New User'
    
    # Verify user exists in DB with CSR role
    user = User.query.filter_by(email='newuser@test.com').first()
    assert user is not None
    assert user.name == 'New User'
    assert user.check_password('password123')  # Verify password hashing
    
    # Verify user has CSR role
    assert len(user.roles) == 1
    assert user.roles[0].name == 'Customer Service Representative'
    
    # Verify CSR permissions
    assert user.has_permission('CREATE_ORDER')
    assert user.has_permission('VIEW_ORDERS')
    assert user.has_permission('MANAGE_ORDERS')
    assert user.has_permission('VIEW_USERS')
    assert user.has_permission('VIEW_AIRCRAFT')
    assert user.has_permission('VIEW_CUSTOMERS')
    assert user.has_permission('VIEW_TRUCKS')
    assert not user.has_permission('MANAGE_ROLES')
    assert not user.has_permission('MANAGE_USERS')

def test_register_invalid_data(client):
    """ Test registration with invalid data """
    # Missing required fields
    response = client.post('/api/auth/register', json={
        'name': 'Invalid User'
    })
    assert response.status_code == 400
    assert json.loads(response.data)['error'] == 'Invalid request data'

def test_register_duplicate_email(client, test_users):
    """ Test registration with duplicate email """
    response = client.post('/api/auth/register', json={
        'username': 'duplicate',
        'name': 'Duplicate User',
        'email': 'admin@test.com',  # Using existing email from test_users
        'password': 'password123'
    })
    assert response.status_code == 409
    assert json.loads(response.data)['error'] == 'Email already registered'

# === Login Tests (/auth/login) ===

def test_login_success(client, test_users):
    """ Test successful login """
    response = client.post('/api/auth/login', json={
        'email': 'admin@test.com',
        'password': 'adminpass'
    })
    assert response.status_code == 200
    data = json.loads(response.data)
    assert 'access_token' in data
    assert data['token_type'] == 'Bearer'
    
    # Verify user permissions after login
    user = User.query.filter_by(email='admin@test.com').first()
    assert user.has_permission('CREATE_ORDER')
    assert user.has_permission('VIEW_ORDERS')
    assert user.has_permission('MANAGE_ORDERS')
    assert user.has_permission('VIEW_USERS')
    assert user.has_permission('VIEW_AIRCRAFT')
    assert user.has_permission('VIEW_CUSTOMERS')
    assert user.has_permission('VIEW_TRUCKS')
    assert not user.has_permission('MANAGE_ROLES')
    assert not user.has_permission('MANAGE_USERS')

def test_login_invalid_credentials(client, test_users):
    """ Test login with invalid credentials """
    response = client.post('/api/auth/login', json={
        'email': 'admin@test.com',
        'password': 'wrongpass'
    })
    assert response.status_code == 401
    assert json.loads(response.data)['error'] == 'Invalid credentials'

def test_login_inactive_user(client, test_users):
    """ Test login with inactive user """
    response = client.post('/api/auth/login', json={
        'email': 'inactive@test.com',
        'password': 'inactivepass'
    })
    assert response.status_code == 403
    assert json.loads(response.data)['error'] == 'Account is inactive'

def test_login_rate_limiting(client, test_users):
    """ Test login rate limiting """
    # Make 6 login attempts (exceeding the limit of 5)
    for i in range(6):
        response = client.post('/api/auth/login', json={
            'email': 'admin@test.com',
            'password': 'wrongpass'
        })
        if i < 5:
            assert response.status_code in [401, 403]  # Either invalid credentials or rate limit
        else:
            assert response.status_code == 429
            data = json.loads(response.data)
            assert 'error' in data
            assert 'retry_after_seconds' in data

def test_rate_limit_window_expiration(client, test_users):
    """ Test rate limit window expiration """
    # This test might need to be adjusted or skipped in CI environments
    # where time manipulation is not possible
    pass

def test_rate_limit_per_ip(client, test_users):
    """ Test rate limiting is per IP address """
    # This test might need to be adjusted based on how you simulate different IPs
    pass

def test_login_role_permissions(client, test_users, auth_headers):
    """ Test that login response includes correct role permissions """
    response = client.post('/api/auth/login', json={
        'email': 'admin@test.com',
        'password': 'adminpass'
    })
    assert response.status_code == 200
    data = json.loads(response.data)
    assert 'access_token' in data
    
    # Verify token contains role information
    import jwt
    token = data['access_token']
    decoded = jwt.decode(token, verify=False)  # We're not verifying the signature here
    assert 'roles' in decoded
    assert 'Administrator' in decoded['roles']

def test_permission_inheritance(client, db_session, test_users):
    """Test that admin role inherits all permissions."""
    admin = test_users['admin']
    csr = test_users['csr']
    lst = test_users['lst']
    
    # Admin should have all permissions
    assert admin.has_permission('MANAGE_ROLES')
    assert admin.has_permission('MANAGE_USERS')
    assert admin.has_permission('MANAGE_ORDERS')
    assert admin.has_permission('MANAGE_AIRCRAFT')
    assert admin.has_permission('MANAGE_CUSTOMERS')
    assert admin.has_permission('MANAGE_TRUCKS')
    
    # CSR should have subset of permissions
    assert csr.has_permission('CREATE_ORDER')
    assert csr.has_permission('MANAGE_ORDERS')
    assert csr.has_permission('VIEW_USERS')
    assert not csr.has_permission('MANAGE_ROLES')
    assert not csr.has_permission('MANAGE_USERS')
    
    # LST should have minimal permissions
    assert lst.has_permission('VIEW_ORDERS')
    assert lst.has_permission('CREATE_ORDER')
    assert lst.has_permission('VIEW_AIRCRAFT')
    assert lst.has_permission('VIEW_TRUCKS')
    assert not lst.has_permission('MANAGE_ORDERS')
    assert not lst.has_permission('MANAGE_ROLES')
    assert not lst.has_permission('MANAGE_USERS')

def test_permission_caching(client, db_session, test_users, app):
    """Test that permission checks are properly cached within a request."""
    from flask import g
    
    with app.test_request_context():
        user = test_users['csr']
        
        # First check should cache the result
        assert user.has_permission('CREATE_ORDER')
        cache_key = f'user_{user.id}_perm_CREATE_ORDER'
        assert hasattr(g, '_permission_cache')
        assert cache_key in g._permission_cache
        assert g._permission_cache[cache_key] is True

def test_permission_cache_invalidation(client, db_session, test_users, app):
    """Test that permission cache is request-scoped."""
    from flask import g
    
    user = test_users['csr']
    
    # Check permission in first request
    with app.test_request_context():
        assert not hasattr(g, '_permission_cache')  # Should not exist yet
        assert user.has_permission('CREATE_ORDER')
        cache_key = f'user_{user.id}_perm_CREATE_ORDER'
        assert hasattr(g, '_permission_cache')
        assert cache_key in g._permission_cache
        assert g._permission_cache[cache_key] is True
        
    # Check permission in new request (should not have cached value)
    with app.test_request_context():
        assert not hasattr(g, '_permission_cache')  # New request, no cache
        assert user.has_permission('CREATE_ORDER')  # Should recalculate
        assert hasattr(g, '_permission_cache')  # Cache should be created
        cache_key = f'user_{user.id}_perm_CREATE_ORDER'
        assert cache_key in g._permission_cache  # Permission should be cached

def test_inactive_user_permissions(client, db_session, test_inactive_user):
    """Test that inactive users have no permissions regardless of roles."""
    user = test_inactive_user
    assert not user.is_active
    assert not user.has_permission('VIEW_ORDERS')
    assert not user.has_permission('CREATE_ORDER')

def test_permission_check_performance(client, db_session, test_users, benchmark):
    """Test the performance of permission checking with caching."""
    user = test_users['csr']
    
    def check_permission():
        return user.has_permission('CREATE_ORDER')
    
    # Benchmark permission check
    result = benchmark(check_permission)
    assert result is True 