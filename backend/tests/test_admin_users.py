"""Tests for the user management API endpoints."""

import pytest
from flask import json
from src.models.user import User

def test_get_users(client, auth_headers, test_users, test_roles):
    """Test GET /api/admin/users endpoint."""
    # Test unauthorized access
    response = client.get('/api/admin/users/')
    assert response.status_code == 401, "Unauthorized request should be rejected"

    # Test forbidden access (LST)
    response = client.get('/api/admin/users/', headers=auth_headers['lst'])
    assert response.status_code == 403, "LST should be denied access"

    # Test successful retrieval with VIEW_USERS (CSR)
    response = client.get('/api/admin/users/', headers=auth_headers['csr'])
    assert response.status_code == 200, "CSR should have access with VIEW_USERS"
    data = json.loads(response.data)
    assert 'users' in data, "Response should contain users"
    
    # Verify user list format
    users = data['users']
    for user in users:
        assert 'id' in user
        assert 'username' in user
        assert 'email' in user
        assert 'roles' in user
        assert isinstance(user['roles'], list)
        for role in user['roles']:
            assert 'id' in role
            assert 'name' in role

    # Verify all test users are present
    usernames = [user['username'] for user in users]
    assert 'testadmin' in usernames
    assert 'testcsr' in usernames
    assert 'testlst' in usernames

def test_create_user(client, auth_headers, test_roles):
    """Test POST /api/admin/users endpoint."""
    new_user_data = {
        'username': 'newuser',
        'email': 'newuser@test.com',
        'password': 'testpass123',
        'name': 'New User',
        'role_ids': [test_roles['csr'].id]
    }

    # Test unauthorized
    response = client.post('/api/admin/users/',
                          json=new_user_data)
    assert response.status_code == 401

    # Test forbidden (CSR - has VIEW_USERS but not MANAGE_USERS)
    response = client.post('/api/admin/users/',
                          headers=auth_headers['csr'],
                          json=new_user_data)
    assert response.status_code == 403

    # Test successful creation (Admin)
    response = client.post('/api/admin/users/',
                          headers=auth_headers['admin'],
                          json=new_user_data)
    assert response.status_code == 201
    data = json.loads(response.data)
    assert data['user']['username'] == 'newuser'
    assert data['user']['email'] == 'newuser@test.com'
    assert len(data['user']['roles']) == 1
    assert data['user']['roles'][0]['name'] == 'Customer Service Representative'

    # Test duplicate username
    response = client.post('/api/admin/users/',
                          headers=auth_headers['admin'],
                          json=new_user_data)
    assert response.status_code == 409

    # Test invalid role ID
    invalid_user = new_user_data.copy()
    invalid_user['username'] = 'invaliduser'
    invalid_user['email'] = 'invalid@test.com'
    invalid_user['role_ids'] = [99999]
    response = client.post('/api/admin/users/',
                          headers=auth_headers['admin'],
                          json=invalid_user)
    assert response.status_code == 400

def test_get_user(client, auth_headers, test_users):
    """Test GET /api/admin/users/<id> endpoint."""
    user_id = test_users['csr'].id

    # Test unauthorized
    response = client.get(f'/api/admin/users/{user_id}')
    assert response.status_code == 401

    # Test successful retrieval with VIEW_USERS (CSR)
    response = client.get(f'/api/admin/users/{user_id}',
                         headers=auth_headers['csr'])
    assert response.status_code == 200
    data = json.loads(response.data)
    assert data['user']['username'] == 'testcsr'
    assert 'roles' in data['user']
    assert len(data['user']['roles']) == 1
    assert data['user']['roles'][0]['name'] == 'Customer Service Representative'

    # Test non-existent user
    response = client.get('/api/admin/users/99999',
                         headers=auth_headers['admin'])
    assert response.status_code == 404

def test_update_user(client, auth_headers, test_users, test_roles):
    """Test PATCH /api/admin/users/<id> endpoint."""
    user = User(username='updateuser', email='update@test.com', name='Update User')
    user.set_password('testpass')
    user.roles.append(test_roles['lst'])
    db_session = test_roles['lst'].query.session
    db_session.add(user)
    db_session.commit()
    user_id = user.id

    update_data = {
        'name': 'Updated Name',
        'role_ids': [test_roles['csr'].id]
    }

    # Test unauthorized
    response = client.patch(f'/api/admin/users/{user_id}',
                          json=update_data)
    assert response.status_code == 401

    # Test forbidden (CSR - has VIEW_USERS but not MANAGE_USERS)
    response = client.patch(f'/api/admin/users/{user_id}',
                          headers=auth_headers['csr'],
                          json=update_data)
    assert response.status_code == 403

    # Test successful update (Admin)
    response = client.patch(f'/api/admin/users/{user_id}',
                          headers=auth_headers['admin'],
                          json=update_data)
    assert response.status_code == 200
    data = json.loads(response.data)
    assert data['user']['name'] == 'Updated Name'
    assert len(data['user']['roles']) == 1
    assert data['user']['roles'][0]['name'] == 'Customer Service Representative'

    # Test invalid role ID
    invalid_update = {'role_ids': [99999]}
    response = client.patch(f'/api/admin/users/{user_id}',
                          headers=auth_headers['admin'],
                          json=invalid_update)
    assert response.status_code == 400

def test_delete_user(client, auth_headers, test_users, db_session):
    """Test DELETE /api/admin/users/<id> endpoint."""
    # Create a user to delete
    user = User(username='deleteuser', email='delete@test.com', name='Delete User')
    user.set_password('testpass')
    db_session.add(user)
    db_session.commit()
    user_id = user.id

    # Test unauthorized
    response = client.delete(f'/api/admin/users/{user_id}')
    assert response.status_code == 401

    # Test forbidden (CSR - has VIEW_USERS but not MANAGE_USERS)
    response = client.delete(f'/api/admin/users/{user_id}',
                           headers=auth_headers['csr'])
    assert response.status_code == 403

    # Test successful deletion (Admin)
    response = client.delete(f'/api/admin/users/{user_id}',
                           headers=auth_headers['admin'])
    assert response.status_code == 200

    # Verify user is soft deleted
    user = User.query.get(user_id)
    assert user is not None, "User should still exist (soft delete)"
    assert not user.is_active, "User should be inactive"

    # Test deleting non-existent user
    response = client.delete('/api/admin/users/99999',
                           headers=auth_headers['admin'])
    assert response.status_code == 404 