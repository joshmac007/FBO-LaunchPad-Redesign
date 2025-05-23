"""Tests for user management endpoints."""

import pytest
import json
from src.models.user import User
from src.models.role import Role

def test_get_users_list(client, auth_headers, test_users):
    """Test GET /api/users endpoint."""
    # Test unauthorized access
    response = client.get('/api/users/')
    assert response.status_code == 401

    # Test access with CSR role (should have VIEW_USERS permission)
    response = client.get('/api/users/', headers=auth_headers['csr'])
    assert response.status_code == 200
    data = json.loads(response.data)
    assert isinstance(data['users'], list)
    assert len(data['users']) > 0
    for user in data['users']:
        assert 'id' in user
        assert 'email' in user
        assert 'name' in user
        assert 'roles' in user
        assert isinstance(user['roles'], list)

    # Test access with LST role (should have VIEW_USERS permission)
    response = client.get('/api/users/', headers=auth_headers['lst'])
    assert response.status_code == 200

    # Test access with admin role
    response = client.get('/api/users/', headers=auth_headers['admin'])
    assert response.status_code == 200
    data = json.loads(response.data)
    assert isinstance(data['users'], list)
    assert len(data['users']) > 0

def test_get_user_detail(client, auth_headers, test_users):
    """Test GET /api/users/<id> endpoint."""
    user_id = test_users['csr'].id

    # Test unauthorized access
    response = client.get(f'/api/users/{user_id}')
    assert response.status_code == 401

    # Test access with CSR role (should have VIEW_USERS permission)
    response = client.get(f'/api/users/{user_id}', headers=auth_headers['csr'])
    assert response.status_code == 200
    data = json.loads(response.data)
    assert data['id'] == user_id
    assert 'email' in data
    assert 'name' in data
    assert 'roles' in data
    assert isinstance(data['roles'], list)

    # Test access with LST role (should have VIEW_USERS permission)
    response = client.get(f'/api/users/{user_id}', headers=auth_headers['lst'])
    assert response.status_code == 200

    # Test access with admin role
    response = client.get(f'/api/users/{user_id}', headers=auth_headers['admin'])
    assert response.status_code == 200

    # Test non-existent user
    response = client.get('/api/users/999999', headers=auth_headers['admin'])
    assert response.status_code == 404

def test_create_user(client, auth_headers, test_roles):
    """Test POST /api/admin/users endpoint."""
    new_user_data = {
        'name': 'New Test User',
        'email': 'newtest@test.com',
        'password': 'testpass123',
        'roles': ['Customer Service Representative']
    }

    # Test unauthorized access
    response = client.post('/api/admin/users/', json=new_user_data)
    assert response.status_code == 401

    # Test access with CSR role (should not have MANAGE_USERS permission)
    response = client.post('/api/admin/users/', json=new_user_data, headers=auth_headers['csr'])
    assert response.status_code == 403

    # Test access with LST role (should not have MANAGE_USERS permission)
    response = client.post('/api/admin/users/', json=new_user_data, headers=auth_headers['lst'])
    assert response.status_code == 403

    # Test successful creation with admin role
    response = client.post('/api/admin/users/', json=new_user_data, headers=auth_headers['admin'])
    assert response.status_code == 201
    data = json.loads(response.data)
    assert data['email'] == new_user_data['email']
    assert data['name'] == new_user_data['name']
    assert len(data['roles']) == 1
    assert data['roles'][0]['name'] == 'Customer Service Representative'

    # Verify user exists in database with correct roles
    user = User.query.filter_by(email=new_user_data['email']).first()
    assert user is not None
    assert user.name == new_user_data['name']
    assert len(user.roles) == 1
    assert user.roles[0].name == 'Customer Service Representative'

    # Test duplicate email
    response = client.post('/api/admin/users/', json=new_user_data, headers=auth_headers['admin'])
    assert response.status_code == 409

def test_update_user(client, auth_headers, test_users, test_roles):
    """Test PUT /api/admin/users/<id> endpoint."""
    user_id = test_users['csr'].id
    update_data = {
        'name': 'Updated Name',
        'email': 'updated@test.com',
        'roles': ['Line Service Technician']
    }

    # Test unauthorized access
    response = client.put(f'/api/admin/users/{user_id}')
    assert response.status_code == 401

    # Test access with CSR role (should not have MANAGE_USERS permission)
    response = client.put(f'/api/admin/users/{user_id}', headers=auth_headers['csr'])
    assert response.status_code == 403

    # Test access with LST role (should not have MANAGE_USERS permission)
    response = client.put(f'/api/admin/users/{user_id}', headers=auth_headers['lst'])
    assert response.status_code == 403

    # Test successful update with admin role
    response = client.put(f'/api/admin/users/{user_id}', json=update_data, headers=auth_headers['admin'])
    assert response.status_code == 200
    data = json.loads(response.data)
    assert data['email'] == update_data['email']
    assert data['name'] == update_data['name']
    assert len(data['roles']) == 1
    assert data['roles'][0]['name'] == 'Line Service Technician'

    # Verify changes in database
    user = User.query.get(user_id)
    assert user.email == update_data['email']
    assert user.name == update_data['name']
    assert len(user.roles) == 1
    assert user.roles[0].name == 'Line Service Technician'

    # Test non-existent user
    response = client.put('/api/admin/users/999999', json=update_data, headers=auth_headers['admin'])
    assert response.status_code == 404

def test_delete_user(client, auth_headers, test_users):
    """Test DELETE /api/admin/users/<id> endpoint."""
    user_to_delete = test_users['lst']
    user_id = user_to_delete.id

    # Test unauthorized access
    response = client.delete(f'/api/admin/users/{user_id}')
    assert response.status_code == 401

    # Test access with CSR role (should not have MANAGE_USERS permission)
    response = client.delete(f'/api/admin/users/{user_id}', headers=auth_headers['csr'])
    assert response.status_code == 403

    # Test access with LST role (should not have MANAGE_USERS permission)
    response = client.delete(f'/api/admin/users/{user_id}', headers=auth_headers['lst'])
    assert response.status_code == 403

    # Test successful deletion with admin role
    response = client.delete(f'/api/admin/users/{user_id}', headers=auth_headers['admin'])
    assert response.status_code == 200

    # Verify user is deleted
    assert User.query.get(user_id) is None

    # Test non-existent user
    response = client.delete('/api/admin/users/999999', headers=auth_headers['admin'])
    assert response.status_code == 404

def test_user_role_assignment(client, auth_headers, test_users, test_roles):
    """Test role assignment functionality."""
    user = test_users['csr']
    lst_role = Role.query.filter_by(name='Line Service Technician').first()

    # Add LST role to CSR user
    update_data = {
        'name': user.name,
        'email': user.email,
        'roles': ['Customer Service Representative', 'Line Service Technician']
    }

    response = client.put(f'/api/admin/users/{user.id}', 
                         json=update_data, 
                         headers=auth_headers['admin'])
    assert response.status_code == 200
    data = json.loads(response.data)
    
    # Verify user has both roles
    assert len(data['roles']) == 2
    role_names = [role['name'] for role in data['roles']]
    assert 'Customer Service Representative' in role_names
    assert 'Line Service Technician' in role_names

    # Verify permissions from both roles
    user = User.query.get(user.id)
    assert user.has_permission('CREATE_ORDER')  # CSR permission
    assert user.has_permission('VIEW_ORDERS')   # LST permission
    assert user.has_permission('MANAGE_ORDERS') # CSR permission
    assert user.has_permission('VIEW_AIRCRAFT') # Both roles
    assert user.has_permission('VIEW_TRUCKS')   # Both roles

def test_user_role_removal(client, auth_headers, test_users, test_roles):
    """Test role removal functionality."""
    user = test_users['csr']
    
    # First add LST role
    update_data = {
        'name': user.name,
        'email': user.email,
        'roles': ['Customer Service Representative', 'Line Service Technician']
    }
    
    response = client.put(f'/api/admin/users/{user.id}', 
                         json=update_data, 
                         headers=auth_headers['admin'])
    assert response.status_code == 200
    
    # Then remove CSR role
    update_data['roles'] = ['Line Service Technician']
    response = client.put(f'/api/admin/users/{user.id}', 
                         json=update_data, 
                         headers=auth_headers['admin'])
    assert response.status_code == 200
    data = json.loads(response.data)
    
    # Verify user only has LST role
    assert len(data['roles']) == 1
    assert data['roles'][0]['name'] == 'Line Service Technician'
    
    # Verify permissions reflect only LST role
    user = User.query.get(user.id)
    assert user.has_permission('VIEW_ORDERS')     # LST permission
    assert user.has_permission('VIEW_AIRCRAFT')   # LST permission
    assert user.has_permission('VIEW_TRUCKS')     # LST permission
    assert not user.has_permission('MANAGE_ORDERS') # Lost CSR permission

def test_user_deactivation(client, auth_headers, test_users):
    """Test user deactivation functionality."""
    user = test_users['csr']
    
    # Deactivate user
    update_data = {
        'name': user.name,
        'email': user.email,
        'roles': ['Customer Service Representative'],
        'is_active': False
    }
    
    response = client.put(f'/api/admin/users/{user.id}', 
                         json=update_data, 
                         headers=auth_headers['admin'])
    assert response.status_code == 200
    data = json.loads(response.data)
    
    # Verify user is inactive
    assert not data['is_active']
    
    # Verify user cannot log in
    response = client.post('/api/auth/login', json={
        'email': user.email,
        'password': 'testpass'
    })
    assert response.status_code == 401
    data = json.loads(response.data)
    assert 'Account is inactive' in data['error']

def test_user_reactivation(client, auth_headers, test_users):
    """Test user reactivation functionality."""
    user = test_users['inactive']
    
    # Reactivate user
    update_data = {
        'name': user.name,
        'email': user.email,
        'roles': ['Customer Service Representative'],
        'is_active': True
    }
    
    response = client.put(f'/api/admin/users/{user.id}', 
                         json=update_data, 
                         headers=auth_headers['admin'])
    assert response.status_code == 200
    data = json.loads(response.data)
    
    # Verify user is active
    assert data['is_active']
    
    # Verify user can log in
    response = client.post('/api/auth/login', json={
        'email': user.email,
        'password': 'testpass'
    })
    assert response.status_code == 200
    assert 'token' in json.loads(response.data) 