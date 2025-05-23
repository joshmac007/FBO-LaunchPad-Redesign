"""Tests for the role management API endpoints."""

import pytest
from flask import json
from src.models.role import Role
from src.models.permission import Permission

def test_get_roles(client, auth_headers, test_roles):
    """Test GET /api/admin/roles endpoint."""
    # Test unauthorized access
    response = client.get('/api/admin/roles')
    assert response.status_code == 401, "Unauthorized request should be rejected"

    # Test forbidden access (LST)
    response = client.get('/api/admin/roles', headers=auth_headers['lst'])
    assert response.status_code == 403, "LST should be denied access"

    # Test successful retrieval (Admin)
    response = client.get('/api/admin/roles', headers=auth_headers['admin'])
    assert response.status_code == 200, "Admin should have access"
    data = json.loads(response.data)
    assert 'roles' in data, "Response should contain roles"
    
    # Verify role list format
    roles = data['roles']
    for role in roles:
        assert 'id' in role
        assert 'name' in role
        assert 'description' in role
        assert 'created_at' in role

    # Verify all test roles are present
    role_names = [role['name'] for role in roles]
    assert 'System Administrator' in role_names
    assert 'Customer Service Representative' in role_names
    assert 'Line Service Technician' in role_names

def test_create_role(client, auth_headers, test_permissions):
    """Test POST /api/admin/roles endpoint."""
    new_role_data = {
        'name': 'Test Role',
        'description': 'A test role'
    }

    # Test unauthorized
    response = client.post('/api/admin/roles',
                          json=new_role_data)
    assert response.status_code == 401

    # Test forbidden (CSR)
    response = client.post('/api/admin/roles',
                          headers=auth_headers['csr'],
                          json=new_role_data)
    assert response.status_code == 403

    # Test successful creation (Admin)
    response = client.post('/api/admin/roles',
                          headers=auth_headers['admin'],
                          json=new_role_data)
    assert response.status_code == 201
    data = json.loads(response.data)
    assert data['role']['name'] == 'Test Role'
    assert data['role']['description'] == 'A test role'

    # Test duplicate name
    response = client.post('/api/admin/roles',
                          headers=auth_headers['admin'],
                          json=new_role_data)
    assert response.status_code == 409

def test_get_role(client, auth_headers, test_roles):
    """Test GET /api/admin/roles/<id> endpoint."""
    role_id = test_roles['csr'].id

    # Test unauthorized
    response = client.get(f'/api/admin/roles/{role_id}')
    assert response.status_code == 401

    # Test forbidden (LST)
    response = client.get(f'/api/admin/roles/{role_id}',
                         headers=auth_headers['lst'])
    assert response.status_code == 403

    # Test successful retrieval (Admin)
    response = client.get(f'/api/admin/roles/{role_id}',
                         headers=auth_headers['admin'])
    assert response.status_code == 200
    data = json.loads(response.data)
    assert data['role']['name'] == 'Customer Service Representative'

    # Test non-existent role
    response = client.get('/api/admin/roles/99999',
                         headers=auth_headers['admin'])
    assert response.status_code == 404

def test_update_role(client, auth_headers, db_session):
    """Test PATCH /api/admin/roles/<id> endpoint."""
    # Create a role to update
    role = Role(name='Role To Update')
    db_session.add(role)
    db_session.commit()
    role_id = role.id

    update_data = {
        'name': 'Updated Role',
        'description': 'Updated description'
    }

    # Test unauthorized
    response = client.patch(f'/api/admin/roles/{role_id}',
                          json=update_data)
    assert response.status_code == 401

    # Test forbidden (CSR)
    response = client.patch(f'/api/admin/roles/{role_id}',
                          headers=auth_headers['csr'],
                          json=update_data)
    assert response.status_code == 403

    # Test successful update (Admin)
    response = client.patch(f'/api/admin/roles/{role_id}',
                          headers=auth_headers['admin'],
                          json=update_data)
    assert response.status_code == 200
    data = json.loads(response.data)
    assert data['role']['name'] == 'Updated Role'
    assert data['role']['description'] == 'Updated description'

def test_delete_role(client, auth_headers, db_session, test_users):
    """Test DELETE /api/admin/roles/<id> endpoint."""
    # Create a role to delete
    role = Role(name='Role To Delete')
    db_session.add(role)
    db_session.commit()
    role_id = role.id

    # Test unauthorized
    response = client.delete(f'/api/admin/roles/{role_id}')
    assert response.status_code == 401

    # Test forbidden (CSR)
    response = client.delete(f'/api/admin/roles/{role_id}',
                           headers=auth_headers['csr'])
    assert response.status_code == 403

    # Test successful deletion (Admin)
    response = client.delete(f'/api/admin/roles/{role_id}',
                           headers=auth_headers['admin'])
    assert response.status_code == 200

    # Test deleting non-existent role
    response = client.delete('/api/admin/roles/99999',
                           headers=auth_headers['admin'])
    assert response.status_code == 404

    # Test deleting role assigned to users
    admin_role_id = test_users['admin'].roles[0].id
    response = client.delete(f'/api/admin/roles/{admin_role_id}',
                           headers=auth_headers['admin'])
    assert response.status_code == 409

def test_role_permissions(client, auth_headers, db_session, test_permissions):
    """Test role permission assignment endpoints."""
    # Create a test role
    role = Role(name='Permission Test Role')
    db_session.add(role)
    db_session.commit()
    role_id = role.id

    # Get initial permissions
    response = client.get(f'/api/admin/roles/{role_id}/permissions',
                         headers=auth_headers['admin'])
    assert response.status_code == 200
    data = json.loads(response.data)
    assert len(data['permissions']) == 0

    # Assign a permission
    perm = Permission.query.filter_by(name='CREATE_ORDER').first()
    response = client.post(f'/api/admin/roles/{role_id}/permissions',
                         headers=auth_headers['admin'],
                         json={'permission_id': perm.id})
    assert response.status_code == 200

    # Verify permission was assigned
    response = client.get(f'/api/admin/roles/{role_id}/permissions',
                         headers=auth_headers['admin'])
    assert response.status_code == 200
    data = json.loads(response.data)
    assert len(data['permissions']) == 1
    assert data['permissions'][0]['name'] == 'CREATE_ORDER'

    # Remove the permission
    response = client.delete(f'/api/admin/roles/{role_id}/permissions/{perm.id}',
                           headers=auth_headers['admin'])
    assert response.status_code == 200

    # Verify permission was removed
    response = client.get(f'/api/admin/roles/{role_id}/permissions',
                         headers=auth_headers['admin'])
    assert response.status_code == 200
    data = json.loads(response.data)
    assert len(data['permissions']) == 0

    # Test assigning invalid permission ID
    response = client.post(f'/api/admin/roles/{role_id}/permissions',
                         headers=auth_headers['admin'],
                         json={'permission_id': 99999})
    assert response.status_code == 400 