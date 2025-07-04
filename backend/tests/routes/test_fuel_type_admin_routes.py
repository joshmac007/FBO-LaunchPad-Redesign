"""
Tests for fuel type admin routes.

This module contains comprehensive tests for the fuel type admin API endpoints,
testing the full HTTP request/response cycle with proper authentication and
authorization.
"""

import pytest
import json
from unittest.mock import patch, Mock

from src.models.fuel_type import FuelType


class TestFuelTypeAdminRoutes:
    """Test suite for fuel type admin routes."""
    
    def test_get_admin_fuel_types_success(self, client, auth_headers):
        """Test successful retrieval of fuel types."""
        # Given valid authentication
        headers = auth_headers('manage_fuel_types')
        
        # When making GET request
        response = client.get('/admin/fuel-types', headers=headers)
        
        # Then fuel types are returned
        assert response.status_code == 200
        data = json.loads(response.data)
        assert 'fuel_types' in data
        assert 'message' in data
        assert isinstance(data['fuel_types'], list)
    
    def test_get_admin_fuel_types_with_inactive(self, client, auth_headers):
        """Test retrieval of fuel types including inactive ones."""
        # Given valid authentication
        headers = auth_headers('manage_fuel_types')
        
        # When making GET request with include_inactive parameter
        response = client.get('/admin/fuel-types?include_inactive=true', headers=headers)
        
        # Then all fuel types are returned
        assert response.status_code == 200
        data = json.loads(response.data)
        assert 'fuel_types' in data
    
    def test_get_admin_fuel_types_unauthorized(self, client):
        """Test unauthorized access to fuel types endpoint."""
        # Given no authentication
        
        # When making GET request
        response = client.get('/admin/fuel-types')
        
        # Then unauthorized error is returned
        assert response.status_code == 401
    
    def test_get_admin_fuel_types_forbidden(self, client, auth_headers):
        """Test forbidden access without required permission."""
        # Given authentication without required permission
        headers = auth_headers('wrong_permission')
        
        # When making GET request
        response = client.get('/admin/fuel-types', headers=headers)
        
        # Then forbidden error is returned
        assert response.status_code == 403
    
    def test_get_admin_fuel_type_by_id_success(self, client, auth_headers, sample_fuel_type):
        """Test successful retrieval of a specific fuel type."""
        # Given valid authentication and existing fuel type
        headers = auth_headers('manage_fuel_types')
        fuel_type = sample_fuel_type
        
        # When making GET request
        response = client.get(f'/admin/fuel-types/{fuel_type.id}', headers=headers)
        
        # Then fuel type is returned
        assert response.status_code == 200
        data = json.loads(response.data)
        assert 'fuel_type' in data
        assert data['fuel_type']['id'] == fuel_type.id
        assert data['fuel_type']['name'] == fuel_type.name
    
    def test_get_admin_fuel_type_by_id_not_found(self, client, auth_headers):
        """Test retrieval of non-existent fuel type."""
        # Given valid authentication
        headers = auth_headers('manage_fuel_types')
        
        # When making GET request for non-existent fuel type
        response = client.get('/admin/fuel-types/99999', headers=headers)
        
        # Then not found error is returned
        assert response.status_code == 404
        data = json.loads(response.data)
        assert 'error' in data
    
    def test_create_admin_fuel_type_success(self, client, auth_headers, db_session):
        """Test successful creation of a fuel type."""
        # Given valid authentication and fuel type data
        headers = auth_headers('manage_fuel_types')
        fuel_type_data = {
            'name': 'Test Fuel',
            'code': 'TEST_FUEL',
            'description': 'Test fuel type',
            'is_active': True
        }
        
        # When making POST request
        response = client.post(
            '/admin/fuel-types',
            headers=headers,
            data=json.dumps(fuel_type_data),
            content_type='application/json'
        )
        
        # Then fuel type is created
        assert response.status_code == 201
        data = json.loads(response.data)
        assert 'fuel_type' in data
        assert data['fuel_type']['name'] == fuel_type_data['name']
        assert data['fuel_type']['code'] == fuel_type_data['code']
    
    def test_create_admin_fuel_type_validation_error(self, client, auth_headers):
        """Test creation with invalid data."""
        # Given valid authentication and invalid fuel type data
        headers = auth_headers('manage_fuel_types')
        fuel_type_data = {
            'name': '',  # Invalid: empty name
            'code': 'TEST_FUEL'
        }
        
        # When making POST request
        response = client.post(
            '/admin/fuel-types',
            headers=headers,
            data=json.dumps(fuel_type_data),
            content_type='application/json'
        )
        
        # Then validation error is returned
        assert response.status_code == 400
        data = json.loads(response.data)
        assert 'error' in data
        assert 'Validation error' in data['error']
    
    def test_create_admin_fuel_type_duplicate_name(self, client, auth_headers, sample_fuel_type):
        """Test creation with duplicate name."""
        # Given valid authentication and existing fuel type
        headers = auth_headers('manage_fuel_types')
        existing_fuel_type = sample_fuel_type
        
        fuel_type_data = {
            'name': existing_fuel_type.name,  # Duplicate name
            'code': 'DIFFERENT_CODE'
        }
        
        # When making POST request
        response = client.post(
            '/admin/fuel-types',
            headers=headers,
            data=json.dumps(fuel_type_data),
            content_type='application/json'
        )
        
        # Then conflict error is returned
        assert response.status_code == 409
        data = json.loads(response.data)
        assert 'error' in data
        assert 'already exists' in data['error']
    
    def test_create_admin_fuel_type_empty_body(self, client, auth_headers):
        """Test creation with empty request body."""
        # Given valid authentication
        headers = auth_headers('manage_fuel_types')
        
        # When making POST request with empty body
        response = client.post(
            '/admin/fuel-types',
            headers=headers,
            content_type='application/json'
        )
        
        # Then bad request error is returned
        assert response.status_code == 400
        data = json.loads(response.data)
        assert 'error' in data
        assert 'empty' in data['error']
    
    def test_update_admin_fuel_type_success(self, client, auth_headers, sample_fuel_type):
        """Test successful update of a fuel type."""
        # Given valid authentication and existing fuel type
        headers = auth_headers('manage_fuel_types')
        fuel_type = sample_fuel_type
        
        update_data = {
            'name': 'Updated Name',
            'description': 'Updated description'
        }
        
        # When making PUT request
        response = client.put(
            f'/admin/fuel-types/{fuel_type.id}',
            headers=headers,
            data=json.dumps(update_data),
            content_type='application/json'
        )
        
        # Then fuel type is updated
        assert response.status_code == 200
        data = json.loads(response.data)
        assert 'fuel_type' in data
        assert data['fuel_type']['name'] == update_data['name']
        assert data['fuel_type']['description'] == update_data['description']
    
    def test_update_admin_fuel_type_not_found(self, client, auth_headers):
        """Test update of non-existent fuel type."""
        # Given valid authentication
        headers = auth_headers('manage_fuel_types')
        
        update_data = {'name': 'Updated Name'}
        
        # When making PUT request for non-existent fuel type
        response = client.put(
            '/admin/fuel-types/99999',
            headers=headers,
            data=json.dumps(update_data),
            content_type='application/json'
        )
        
        # Then not found error is returned
        assert response.status_code == 404
        data = json.loads(response.data)
        assert 'error' in data
    
    def test_update_admin_fuel_type_validation_error(self, client, auth_headers, sample_fuel_type):
        """Test update with invalid data."""
        # Given valid authentication and existing fuel type
        headers = auth_headers('manage_fuel_types')
        fuel_type = sample_fuel_type
        
        update_data = {
            'name': '',  # Invalid: empty name
        }
        
        # When making PUT request
        response = client.put(
            f'/admin/fuel-types/{fuel_type.id}',
            headers=headers,
            data=json.dumps(update_data),
            content_type='application/json'
        )
        
        # Then validation error is returned
        assert response.status_code == 400
        data = json.loads(response.data)
        assert 'error' in data
        assert 'Validation error' in data['error']
    
    def test_delete_admin_fuel_type_success(self, client, auth_headers, sample_fuel_type):
        """Test successful deletion of a fuel type."""
        # Given valid authentication and existing fuel type
        headers = auth_headers('manage_fuel_types')
        fuel_type = sample_fuel_type
        
        # When making DELETE request
        response = client.delete(f'/admin/fuel-types/{fuel_type.id}', headers=headers)
        
        # Then fuel type is deleted
        assert response.status_code == 200
        data = json.loads(response.data)
        assert 'message' in data
        assert 'successfully' in data['message']
    
    def test_delete_admin_fuel_type_not_found(self, client, auth_headers):
        """Test deletion of non-existent fuel type."""
        # Given valid authentication
        headers = auth_headers('manage_fuel_types')
        
        # When making DELETE request for non-existent fuel type
        response = client.delete('/admin/fuel-types/99999', headers=headers)
        
        # Then not found error is returned
        assert response.status_code == 404
        data = json.loads(response.data)
        assert 'error' in data
    
    def test_get_fuel_type_usage_stats_success(self, client, auth_headers, sample_fuel_type):
        """Test successful retrieval of fuel type usage statistics."""
        # Given valid authentication and existing fuel type
        headers = auth_headers('manage_fuel_types')
        fuel_type = sample_fuel_type
        
        # When making GET request
        response = client.get(f'/admin/fuel-types/{fuel_type.id}/usage-stats', headers=headers)
        
        # Then usage statistics are returned
        assert response.status_code == 200
        data = json.loads(response.data)
        assert 'stats' in data
        assert 'fuel_type_id' in data['stats']
        assert 'fuel_type_name' in data['stats']
        assert 'orders_count' in data['stats']
        assert 'price_history_count' in data['stats']
        assert 'can_be_deleted' in data['stats']
    
    def test_get_fuel_type_usage_stats_not_found(self, client, auth_headers):
        """Test usage statistics for non-existent fuel type."""
        # Given valid authentication
        headers = auth_headers('manage_fuel_types')
        
        # When making GET request for non-existent fuel type
        response = client.get('/admin/fuel-types/99999/usage-stats', headers=headers)
        
        # Then not found error is returned
        assert response.status_code == 404
        data = json.loads(response.data)
        assert 'error' in data


# Test fixtures
@pytest.fixture
def sample_fuel_type(app_context, db_session):
    """Create a sample fuel type for testing."""
    fuel_type = FuelType(
        name='Test Fuel Type',
        code='TEST_FUEL',
        description='Test fuel type for unit tests',
        is_active=True
    )
    
    db_session.add(fuel_type)
    db_session.commit()
    
    return fuel_type


@pytest.fixture
def auth_headers():
    """Create authentication headers for testing."""
    def _create_auth_headers(permission):
        # Mock JWT token with required permission
        # In real implementation, this would be a proper JWT token
        return {
            'Authorization': f'Bearer mock_token_with_{permission}',
            'Content-Type': 'application/json'
        }
    
    return _create_auth_headers