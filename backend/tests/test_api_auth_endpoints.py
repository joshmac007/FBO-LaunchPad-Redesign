import pytest
import json
from src.models.user import User
from src.models.role import Role
from src.models.fuel_order import FuelOrder
from src.extensions import db


class TestApiAuthEndpoints:
    """
    Integration tests for API endpoints with permission checking.
    These tests verify the current authentication/authorization behavior
    across different user personas before refactoring.
    """

    def test_admin_user_access_patterns(self, client, test_admin_user, auth_headers):
        """Test admin user access to various endpoints."""
        admin_headers = auth_headers['administrator']
        
        # Test user management endpoint - Admin must have access
        response = client.get('/api/users', headers=admin_headers)
        assert response.status_code == 200, "Admin user should receive OK (200) when accessing user list."
        
        # Test admin-specific endpoints - Admin must have access
        response = client.get('/api/admin/users', headers=admin_headers)
        assert response.status_code == 200, "Admin user should receive OK (200) when accessing admin user management."
        
        # Test fuel truck management - Admin must have access
        response = client.get('/api/admin/fuel-trucks', headers=admin_headers)
        assert response.status_code == 200, "Admin user should receive OK (200) when accessing fuel truck management."
        
        # Test permissions endpoint - Admin must have access
        response = client.get('/api/admin/permissions', headers=admin_headers)
        assert response.status_code == 200, "Admin user should receive OK (200) when accessing permissions."

    def test_csr_user_access_patterns(self, client, test_csr_user, auth_headers):
        """Test CSR user access to various endpoints."""
        csr_headers = auth_headers['customer']
        
        # CSR should have access to fuel orders
        response = client.get('/api/fuel-orders', headers=csr_headers)
        # CHARACTERIZATION: Current system denies CSR access to fuel orders (403)
        assert response.status_code == 403, "CHARACTERIZATION: Current system denies CSR access to fuel orders (403)."
        
        # CSR should have access to view users but not manage
        response = client.get('/api/users', headers=csr_headers)
        # CHARACTERIZATION: Current system allows CSR to view users
        assert response.status_code == 200, "CSR user should receive OK (200) when viewing users."
        
        # CSR should NOT have access to admin user management
        response = client.get('/api/admin/users', headers=csr_headers)
        # CHARACTERIZATION: Current system incorrectly allows CSR admin access - locking in current behavior
        assert response.status_code == 200, "CHARACTERIZATION: Current system incorrectly allows CSR admin access."
        
        # CSR should NOT have access to manage roles
        response = client.get('/api/admin/roles', headers=csr_headers)
        assert response.status_code == 403, "CSR user should be Forbidden (403) from accessing role admin."

    def test_fueler_user_access_patterns(self, client, test_lst_user, auth_headers):
        """Test Fueler (LST) user access to various endpoints."""
        fueler_headers = auth_headers['line']
        
        # Fueler should have limited access to orders (own assignments)
        response = client.get('/api/fuel-orders', headers=fueler_headers)
        assert response.status_code == 200, "Fueler user should receive OK (200) when accessing fuel orders."
        
        # Fueler should NOT have access to user management
        response = client.get('/api/users', headers=fueler_headers)
        assert response.status_code == 403, "Fueler user should be Forbidden (403) from accessing user management."
        
        # Fueler should NOT have access to admin endpoints
        response = client.get('/api/admin/users', headers=fueler_headers)
        assert response.status_code == 403, "Fueler user should be Forbidden (403) from accessing admin user management."
        
        response = client.get('/api/admin/fuel-trucks', headers=fueler_headers)
        assert response.status_code == 403, "Fueler user should be Forbidden (403) from accessing fuel truck management."

    def test_inactive_user_access_patterns(self, client, test_inactive_user, auth_headers):
        """Test inactive user access to various endpoints."""
        # Note: inactive user won't have headers since they're not active
        # Testing with no headers to simulate inactive/unauthenticated access
        
        # Inactive user should be denied access
        response = client.get('/api/users')
        assert response.status_code == 401, "Inactive/unauthenticated user should receive Unauthorized (401) when accessing users."
        
        # Inactive user should NOT have access to fuel orders
        response = client.get('/api/fuel-orders')
        assert response.status_code == 401, "Inactive/unauthenticated user should receive Unauthorized (401) when accessing fuel orders."
        
        # Inactive user should NOT have access to admin endpoints
        response = client.get('/api/admin/users')
        assert response.status_code == 401, "Inactive/unauthenticated user should receive Unauthorized (401) when accessing admin endpoints."

    def test_unauthenticated_access(self, client):
        """Test unauthenticated access to protected endpoints."""
        
        # No auth headers - should be denied with 401
        response = client.get('/api/users')
        assert response.status_code == 401, "Unauthenticated access should receive Unauthorized (401)."
        
        response = client.get('/api/fuel-orders')
        assert response.status_code == 401, "Unauthenticated access should receive Unauthorized (401)."
        
        response = client.get('/api/admin/users')
        assert response.status_code == 401, "Unauthenticated access should receive Unauthorized (401)."

    def test_fuel_order_permissions(self, client, test_admin_user, test_csr_user, test_lst_user, auth_headers):
        """Test fuel order specific permissions across user types."""
        admin_headers = auth_headers['administrator']
        csr_headers = auth_headers['customer']
        fueler_headers = auth_headers['line']
        
        # Create a test fuel order first (with admin)
        fuel_order_data = {
            "aircraft_id": 1,
            "requested_fuel_amount": 1000.0,
            "priority": "NORMAL"
        }
        
        # Admin should be able to create fuel orders
        response = client.post('/api/fuel-orders', 
                              data=json.dumps(fuel_order_data),
                              content_type='application/json',
                              headers=admin_headers)
        # CHARACTERIZATION: May get validation errors due to missing aircraft, but should not be 403
        assert response.status_code != 403, "Admin user should not be Forbidden from creating fuel orders."
        
        # CSR should be able to create fuel orders
        response = client.post('/api/fuel-orders',
                              data=json.dumps(fuel_order_data), 
                              content_type='application/json',
                              headers=csr_headers)
        # CHARACTERIZATION: May get validation errors due to missing aircraft, but should not be 403
        assert response.status_code != 403, "CSR user should not be Forbidden from creating fuel orders."
        
        # Fueler should NOT be able to create fuel orders
        response = client.post('/api/fuel-orders',
                              data=json.dumps(fuel_order_data),
                              content_type='application/json', 
                              headers=fueler_headers)
        # CHARACTERIZATION: Current system returns 400 (validation error) instead of 403 for fueler
        assert response.status_code == 400, "CHARACTERIZATION: Current system returns 400 for fueler fuel order creation."

    def test_permission_endpoint_access(self, client, test_admin_user, test_csr_user, auth_headers):
        """Test permission-related endpoint access."""
        admin_headers = auth_headers['administrator']
        csr_headers = auth_headers['customer']
        
        # Admin should be able to view permissions
        response = client.get('/api/admin/permissions', headers=admin_headers)
        assert response.status_code == 200, "Admin user should receive OK (200) when accessing permissions."
        
        # CSR should NOT be able to view permissions
        response = client.get('/api/admin/permissions', headers=csr_headers) 
        assert response.status_code == 403, "CSR user should be Forbidden (403) from accessing permissions."
        
        # Test role management
        response = client.get('/api/admin/roles', headers=admin_headers)
        assert response.status_code == 200, "Admin user should receive OK (200) when accessing roles."
        
        response = client.get('/api/admin/roles', headers=csr_headers)
        assert response.status_code == 403, "CSR user should be Forbidden (403) from accessing roles."

    def test_user_profile_access(self, client, test_admin_user, test_csr_user, auth_headers):
        """Test user profile and 'me' endpoint access."""
        admin_headers = auth_headers['administrator']
        csr_headers = auth_headers['customer']
        
        # Both admin and CSR should be able to access their own profile
        response = client.get('/api/auth/me', headers=admin_headers)
        # CHARACTERIZATION: Current /api/auth/me endpoint may not exist, capturing actual response
        assert response.status_code == 404, "CHARACTERIZATION: /api/auth/me endpoint does not exist (404)."
        
        response = client.get('/api/auth/me', headers=csr_headers)
        # CHARACTERIZATION: Current /api/auth/me endpoint may not exist, capturing actual response
        assert response.status_code == 404, "CHARACTERIZATION: /api/auth/me endpoint does not exist (404)."
        
        # Test permissions endpoint for current user
        response = client.get('/api/auth/me/permissions', headers=admin_headers)
        # CHARACTERIZATION: Current /api/auth/me/permissions endpoint actually exists and returns 200
        assert response.status_code == 200, "CHARACTERIZATION: /api/auth/me/permissions endpoint exists and returns 200."
        
        response = client.get('/api/auth/me/permissions', headers=csr_headers)
        # CHARACTERIZATION: Current /api/auth/me/permissions endpoint exists and returns 200
        assert response.status_code == 200, "CHARACTERIZATION: /api/auth/me/permissions endpoint exists and returns 200."

    def test_error_handling_patterns(self, client, test_admin_user, auth_headers):
        """Test error handling patterns in protected endpoints."""
        admin_headers = auth_headers['administrator']
        
        # Test with invalid resource IDs
        response = client.get('/api/users/99999', headers=admin_headers)
        assert response.status_code == 404, "Invalid user ID should return Not Found (404)."
        
        # Test with malformed requests
        response = client.post('/api/fuel-orders',
                              data='invalid json',
                              content_type='application/json',
                              headers=admin_headers)
        # CHARACTERIZATION: Current system returns 401 (auth error) for malformed JSON instead of 400
        assert response.status_code == 401, "CHARACTERIZATION: Malformed JSON returns Unauthorized (401) due to auth decorator error handling."

    def test_cross_user_data_access(self, client, test_admin_user, test_csr_user, auth_headers):
        """Test access to other users' data."""
        admin_headers = auth_headers['administrator']
        csr_headers = auth_headers['customer']
        
        # Admin should be able to view other users
        response = client.get(f'/api/users/{test_csr_user.id}', headers=admin_headers)
        assert response.status_code == 200, "Admin user should receive OK (200) when viewing specific user."
        
        # CSR should NOT be able to view other users directly
        response = client.get(f'/api/users/{test_admin_user.id}', headers=csr_headers)
        # CHARACTERIZATION: Current system may allow this, locking in current behavior
        assert response.status_code == 200, "CHARACTERIZATION: Current system allows CSR to view specific users." 