"""Tests for the permission listing API endpoint."""

import pytest
from flask import json
from src.models.permission import Permission

def test_get_permissions(client, auth_headers, test_permissions):
    """Test GET /api/admin/permissions endpoint."""
    # Test unauthorized access
    response = client.get('/api/admin/permissions')
    assert response.status_code == 401, "Unauthorized request should be rejected"

    # Test forbidden access (LST)
    response = client.get('/api/admin/permissions', headers=auth_headers['lst'])
    assert response.status_code == 403, "LST should be denied access"

    # Test successful retrieval (Admin)
    response = client.get('/api/admin/permissions', headers=auth_headers['admin'])
    assert response.status_code == 200, "Admin should have access"
    data = json.loads(response.data)
    assert 'permissions' in data, "Response should contain permissions"
    
    # Verify permission list format
    permissions = data['permissions']
    for permission in permissions:
        assert 'id' in permission
        assert 'name' in permission
        assert 'description' in permission

    # Verify all test permissions are present
    permission_names = [perm['name'] for perm in permissions]
    for perm_name in test_permissions:
        assert perm_name in permission_names, f"Permission {perm_name} should be present"

    # Test access with CSR role (should be denied if VIEW_PERMISSIONS is admin-only)
    response = client.get('/api/admin/permissions', headers=auth_headers['csr'])
    assert response.status_code == 403, "CSR should be denied access to permissions list"

def test_get_permissions_csr_access(client, auth_headers):
    """Test CSR access to permissions endpoint (should be allowed VIEW_PERMISSIONS)."""
    response = client.get('/api/admin/permissions', headers=auth_headers['csr'])
    assert response.status_code == 200, "CSR should have access with VIEW_PERMISSIONS"

def test_get_permissions_response_format(client, auth_headers):
    """Test the format of the permissions response."""
    response = client.get('/api/admin/permissions', headers=auth_headers['admin'])
    assert response.status_code == 200
    data = json.loads(response.data)
    
    # Check response structure
    assert 'permissions' in data
    assert isinstance(data['permissions'], list)
    
    # Check permission object structure
    for permission in data['permissions']:
        assert 'id' in permission
        assert 'name' in permission
        assert isinstance(permission['id'], int)
        assert isinstance(permission['name'], str)

def test_get_permissions_empty_db(client, auth_headers, db_session):
    """Test permissions endpoint with empty database."""
    # Delete all permissions
    Permission.query.delete()
    db_session.commit()
    
    response = client.get('/api/admin/permissions', headers=auth_headers['admin'])
    assert response.status_code == 200
    data = json.loads(response.data)
    assert len(data['permissions']) == 0, "Empty database should return empty list" 