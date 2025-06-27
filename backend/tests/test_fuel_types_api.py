import pytest
from src.models.fuel_type import FuelType
from src.extensions import db


class TestFuelTypesAPI:
    """Test cases for the fuel types API endpoint."""

    def test_get_fuel_types_success(self, app, db_session, auth_headers):
        """Test successful retrieval of active fuel types."""
        with app.app_context():
            # Create test fuel types since test DB doesn't have migration data
            test_fuel_types = [
                FuelType(name="Jet A", code="JET_A", description="Standard aviation turbine fuel", is_active=True),
                FuelType(name="Avgas 100LL", code="AVGAS_100LL", description="Aviation gasoline for piston engines", is_active=True),
                FuelType(name="Sustainable Aviation Fuel (Jet A)", code="SAF_JET_A", description="Sustainable aviation fuel", is_active=True)
            ]
            
            for ft in test_fuel_types:
                db_session.add(ft)
            db_session.commit()
            
            with app.test_client() as client:
                response = client.get(
                    '/api/admin/fbo/fuel-types',
                    headers=auth_headers['administrator']
                )
                
                assert response.status_code == 200
                data = response.get_json()
                
                assert 'fuel_types' in data
                fuel_types = data['fuel_types']
                
                # Should have the 3 test fuel types
                assert len(fuel_types) == 3
                
                # Check that all returned fuel types are active
                for fuel_type in fuel_types:
                    assert fuel_type['is_active'] is True
                    assert 'id' in fuel_type
                    assert 'name' in fuel_type
                    assert 'code' in fuel_type
                    assert 'created_at' in fuel_type
                    assert 'updated_at' in fuel_type
                
                # Check for expected test fuel types
                fuel_type_names = [ft['name'] for ft in fuel_types]
                assert 'Jet A' in fuel_type_names
                assert 'Avgas 100LL' in fuel_type_names
                assert 'Sustainable Aviation Fuel (Jet A)' in fuel_type_names

    def test_get_fuel_types_only_returns_active(self, app, db_session, auth_headers):
        """Test that only active fuel types are returned."""
        with app.app_context():
            # Create an inactive fuel type
            inactive_fuel_type = FuelType(
                name="Inactive Test Fuel",
                code="INACTIVE_TEST",
                description="This fuel type is inactive",
                is_active=False
            )
            db_session.add(inactive_fuel_type)
            db_session.commit()
            
            with app.test_client() as client:
                response = client.get(
                    '/api/admin/fbo/fuel-types',
                    headers=auth_headers['administrator']
                )
                
                assert response.status_code == 200
                data = response.get_json()
                
                fuel_types = data['fuel_types']
                fuel_type_names = [ft['name'] for ft in fuel_types]
                
                # Inactive fuel type should not be included
                assert 'Inactive Test Fuel' not in fuel_type_names
                
                # All returned fuel types should be active
                for fuel_type in fuel_types:
                    assert fuel_type['is_active'] is True

    def test_get_fuel_types_requires_permission(self, app, auth_headers):
        """Test that the endpoint requires proper permissions."""
        with app.test_client() as client:
            # Test without authentication
            response = client.get('/api/admin/fbo/fuel-types')
            assert response.status_code == 401
            
            # Test with insufficient permissions - using LST user
            # (assuming LST doesn't have manage_fbo_fee_schedules permission)
            if 'line' in auth_headers:
                response = client.get(
                    '/api/admin/fbo/fuel-types',
                    headers=auth_headers['line']
                )
                assert response.status_code == 403

    def test_get_fuel_types_ordered_by_name(self, app, db_session, auth_headers):
        """Test that fuel types are returned ordered by name."""
        with app.app_context():
            # Create additional fuel types with names that will sort differently
            test_fuel_types = [
                FuelType(name="Zebra Fuel", code="ZEBRA_FUEL", is_active=True),
                FuelType(name="Alpha Fuel", code="ALPHA_FUEL", is_active=True),
                FuelType(name="Beta Fuel", code="BETA_FUEL", is_active=True)
            ]
            
            for ft in test_fuel_types:
                db_session.add(ft)
            db_session.commit()
            
            with app.test_client() as client:
                response = client.get(
                    '/api/admin/fbo/fuel-types',
                    headers=auth_headers['administrator']
                )
                
                assert response.status_code == 200
                data = response.get_json()
                
                fuel_types = data['fuel_types']
                fuel_type_names = [ft['name'] for ft in fuel_types]
                
                # Check that names are sorted alphabetically
                sorted_names = sorted(fuel_type_names)
                assert fuel_type_names == sorted_names

    def test_get_fuel_types_empty_response_when_no_active_types(self, app, db_session, auth_headers):
        """Test response when no active fuel types exist."""
        with app.app_context():
            # Deactivate all existing fuel types
            FuelType.query.update({'is_active': False})
            db_session.commit()
            
            with app.test_client() as client:
                response = client.get(
                    '/api/admin/fbo/fuel-types',
                    headers=auth_headers['administrator']
                )
                
                assert response.status_code == 200
                data = response.get_json()
                
                assert 'fuel_types' in data
                assert data['fuel_types'] == []