"""
Tests for fuel type admin service.

This module contains comprehensive tests for the FuelTypeAdminService,
following the project's TDD approach and testing the service layer
business logic in isolation.
"""

import pytest
from unittest.mock import Mock, patch
from decimal import Decimal
from datetime import datetime

from src.services.fuel_type_admin_service import FuelTypeAdminService
from src.models.fuel_type import FuelType
from src.models.fuel_order import FuelOrder
from src.models.fuel_price import FuelPrice


class TestFuelTypeAdminService:
    """Test suite for FuelTypeAdminService."""
    
    def test_get_all_fuel_types_active_only(self, app_context, sample_fuel_types):
        """Test getting all active fuel types."""
        # Given active and inactive fuel types exist
        active_fuel_types, inactive_fuel_types = sample_fuel_types
        
        # When retrieving active fuel types only
        fuel_types, message, status_code = FuelTypeAdminService.get_all_fuel_types(include_inactive=False)
        
        # Then only active fuel types are returned
        assert status_code == 200
        assert len(fuel_types) == len(active_fuel_types)
        assert all(ft['is_active'] for ft in fuel_types)
        assert "Retrieved 2 fuel types successfully" in message
    
    def test_get_all_fuel_types_include_inactive(self, app_context, sample_fuel_types):
        """Test getting all fuel types including inactive ones."""
        # Given active and inactive fuel types exist
        active_fuel_types, inactive_fuel_types = sample_fuel_types
        
        # When retrieving all fuel types
        fuel_types, message, status_code = FuelTypeAdminService.get_all_fuel_types(include_inactive=True)
        
        # Then all fuel types are returned
        assert status_code == 200
        assert len(fuel_types) == len(active_fuel_types) + len(inactive_fuel_types)
        assert "Retrieved 3 fuel types successfully" in message
    
    def test_get_fuel_type_by_id_exists(self, app_context, sample_fuel_types):
        """Test getting a fuel type by ID when it exists."""
        # Given a fuel type exists
        active_fuel_types, _ = sample_fuel_types
        fuel_type = active_fuel_types[0]
        
        # When retrieving by ID
        result_fuel_type, message, status_code = FuelTypeAdminService.get_fuel_type_by_id(fuel_type.id)
        
        # Then the fuel type is returned
        assert status_code == 200
        assert result_fuel_type.id == fuel_type.id
        assert result_fuel_type.name == fuel_type.name
        assert message == "Fuel type retrieved successfully"
    
    def test_get_fuel_type_by_id_not_found(self, app_context):
        """Test getting a fuel type by ID when it doesn't exist."""
        # Given a non-existent fuel type ID
        non_existent_id = 99999
        
        # When retrieving by ID
        result_fuel_type, message, status_code = FuelTypeAdminService.get_fuel_type_by_id(non_existent_id)
        
        # Then a 404 error is returned
        assert status_code == 404
        assert result_fuel_type is None
        assert f"Fuel type with ID {non_existent_id} not found" in message
    
    def test_create_fuel_type_success(self, app_context, db_session):
        """Test successful creation of a fuel type."""
        # Given valid fuel type data
        data = {
            'name': 'Test Fuel',
            'code': 'TEST_FUEL',
            'description': 'Test fuel type for unit tests',
            'is_active': True
        }
        
        # When creating the fuel type
        fuel_type, message, status_code = FuelTypeAdminService.create_fuel_type(data)
        
        # Then the fuel type is created successfully
        assert status_code == 201
        assert fuel_type.name == data['name']
        assert fuel_type.code == data['code']
        assert fuel_type.description == data['description']
        assert fuel_type.is_active == data['is_active']
        assert "created successfully" in message
    
    def test_create_fuel_type_duplicate_name(self, app_context, sample_fuel_types):
        """Test creating a fuel type with a duplicate name."""
        # Given existing fuel types
        active_fuel_types, _ = sample_fuel_types
        existing_fuel_type = active_fuel_types[0]
        
        # When creating with duplicate name
        data = {
            'name': existing_fuel_type.name,
            'code': 'DIFFERENT_CODE',
            'description': 'Different description',
            'is_active': True
        }
        
        fuel_type, message, status_code = FuelTypeAdminService.create_fuel_type(data)
        
        # Then a conflict error is returned
        assert status_code == 409
        assert fuel_type is None
        assert "already exists" in message
    
    def test_create_fuel_type_duplicate_code(self, app_context, sample_fuel_types):
        """Test creating a fuel type with a duplicate code."""
        # Given existing fuel types
        active_fuel_types, _ = sample_fuel_types
        existing_fuel_type = active_fuel_types[0]
        
        # When creating with duplicate code
        data = {
            'name': 'Different Name',
            'code': existing_fuel_type.code,
            'description': 'Different description',
            'is_active': True
        }
        
        fuel_type, message, status_code = FuelTypeAdminService.create_fuel_type(data)
        
        # Then a conflict error is returned
        assert status_code == 409
        assert fuel_type is None
        assert "already exists" in message
    
    def test_update_fuel_type_success(self, app_context, sample_fuel_types):
        """Test successful update of a fuel type."""
        # Given an existing fuel type
        active_fuel_types, _ = sample_fuel_types
        fuel_type = active_fuel_types[0]
        
        # When updating the fuel type
        update_data = {
            'name': 'Updated Name',
            'description': 'Updated description'
        }
        
        updated_fuel_type, message, status_code = FuelTypeAdminService.update_fuel_type(fuel_type.id, update_data)
        
        # Then the fuel type is updated successfully
        assert status_code == 200
        assert updated_fuel_type.name == update_data['name']
        assert updated_fuel_type.description == update_data['description']
        assert updated_fuel_type.code == fuel_type.code  # Unchanged
        assert "updated successfully" in message
    
    def test_update_fuel_type_not_found(self, app_context):
        """Test updating a fuel type that doesn't exist."""
        # Given a non-existent fuel type ID
        non_existent_id = 99999
        
        # When updating
        update_data = {'name': 'Updated Name'}
        
        fuel_type, message, status_code = FuelTypeAdminService.update_fuel_type(non_existent_id, update_data)
        
        # Then a 404 error is returned
        assert status_code == 404
        assert fuel_type is None
        assert "not found" in message
    
    def test_update_fuel_type_duplicate_name(self, app_context, sample_fuel_types):
        """Test updating a fuel type with a duplicate name."""
        # Given existing fuel types
        active_fuel_types, _ = sample_fuel_types
        fuel_type1, fuel_type2 = active_fuel_types[:2]
        
        # When updating with duplicate name
        update_data = {'name': fuel_type2.name}
        
        updated_fuel_type, message, status_code = FuelTypeAdminService.update_fuel_type(fuel_type1.id, update_data)
        
        # Then a conflict error is returned
        assert status_code == 409
        assert updated_fuel_type is None
        assert "already exists" in message
    
    def test_delete_fuel_type_hard_delete(self, app_context, sample_fuel_types):
        """Test hard delete of a fuel type with no references."""
        # Given a fuel type with no references
        active_fuel_types, _ = sample_fuel_types
        fuel_type = active_fuel_types[0]
        
        # When deleting the fuel type
        success, message, status_code = FuelTypeAdminService.delete_fuel_type(fuel_type.id)
        
        # Then the fuel type is hard deleted
        assert status_code == 200
        assert success is True
        assert "deleted successfully" in message
    
    def test_delete_fuel_type_soft_delete_with_orders(self, app_context, sample_fuel_types, sample_fuel_orders):
        """Test soft delete of a fuel type with associated orders."""
        # Given a fuel type with associated orders
        active_fuel_types, _ = sample_fuel_types
        fuel_type = active_fuel_types[0]
        
        # When deleting the fuel type
        success, message, status_code = FuelTypeAdminService.delete_fuel_type(fuel_type.id)
        
        # Then the fuel type is soft deleted
        assert status_code == 200
        assert success is True
        assert "deactivated successfully" in message
        assert "used in" in message
    
    def test_delete_fuel_type_soft_delete_with_prices(self, app_context, sample_fuel_types, sample_fuel_prices):
        """Test soft delete of a fuel type with price history."""
        # Given a fuel type with price history
        active_fuel_types, _ = sample_fuel_types
        fuel_type = active_fuel_types[0]
        
        # When deleting the fuel type
        success, message, status_code = FuelTypeAdminService.delete_fuel_type(fuel_type.id)
        
        # Then the fuel type is soft deleted
        assert status_code == 200
        assert success is True
        assert "deactivated successfully" in message
        assert "price history" in message
    
    def test_delete_fuel_type_not_found(self, app_context):
        """Test deleting a fuel type that doesn't exist."""
        # Given a non-existent fuel type ID
        non_existent_id = 99999
        
        # When deleting
        success, message, status_code = FuelTypeAdminService.delete_fuel_type(non_existent_id)
        
        # Then a 404 error is returned
        assert status_code == 404
        assert success is False
        assert "not found" in message
    
    def test_get_fuel_type_usage_stats_success(self, app_context, sample_fuel_types, sample_fuel_orders, sample_fuel_prices):
        """Test getting usage statistics for a fuel type."""
        # Given a fuel type with orders and prices
        active_fuel_types, _ = sample_fuel_types
        fuel_type = active_fuel_types[0]
        
        # When getting usage stats
        stats, message, status_code = FuelTypeAdminService.get_fuel_type_usage_stats(fuel_type.id)
        
        # Then the stats are returned
        assert status_code == 200
        assert stats['fuel_type_id'] == fuel_type.id
        assert stats['fuel_type_name'] == fuel_type.name
        assert stats['fuel_type_code'] == fuel_type.code
        assert stats['is_active'] == fuel_type.is_active
        assert stats['orders_count'] >= 0
        assert stats['price_history_count'] >= 0
        assert 'latest_price' in stats
        assert 'latest_price_date' in stats
        assert 'can_be_deleted' in stats
        assert message == "Usage statistics retrieved successfully"
    
    def test_get_fuel_type_usage_stats_not_found(self, app_context):
        """Test getting usage statistics for a non-existent fuel type."""
        # Given a non-existent fuel type ID
        non_existent_id = 99999
        
        # When getting usage stats
        stats, message, status_code = FuelTypeAdminService.get_fuel_type_usage_stats(non_existent_id)
        
        # Then a 404 error is returned
        assert status_code == 404
        assert stats is None
        assert "not found" in message


# Test fixtures
@pytest.fixture
def sample_fuel_types(app_context, db_session):
    """Create sample fuel types for testing."""
    from src.models.fuel_type import FuelType
    
    # Create active fuel types
    active_fuel_types = [
        FuelType(
            name='Jet A',
            code='JET_A',
            description='Standard aviation turbine fuel',
            is_active=True
        ),
        FuelType(
            name='Avgas 100LL',
            code='AVGAS_100LL',
            description='Aviation gasoline with lead',
            is_active=True
        )
    ]
    
    # Create inactive fuel type
    inactive_fuel_types = [
        FuelType(
            name='Jet B',
            code='JET_B',
            description='Legacy aviation fuel',
            is_active=False
        )
    ]
    
    all_fuel_types = active_fuel_types + inactive_fuel_types
    for fuel_type in all_fuel_types:
        db_session.add(fuel_type)
    
    db_session.commit()
    
    return active_fuel_types, inactive_fuel_types


@pytest.fixture
def sample_fuel_orders(app_context, db_session, sample_fuel_types):
    """Create sample fuel orders for testing."""
    from src.models.fuel_order import FuelOrder
    
    active_fuel_types, _ = sample_fuel_types
    fuel_type = active_fuel_types[0]
    
    fuel_order = FuelOrder(
        tail_number='N12345',
        fuel_type_id=fuel_type.id,
        gallons_requested=100,
        status='Created'
    )
    
    db_session.add(fuel_order)
    db_session.commit()
    
    return [fuel_order]


@pytest.fixture
def sample_fuel_prices(app_context, db_session, sample_fuel_types):
    """Create sample fuel prices for testing."""
    from src.models.fuel_price import FuelPrice
    
    active_fuel_types, _ = sample_fuel_types
    fuel_type = active_fuel_types[0]
    
    fuel_price = FuelPrice(
        fuel_type_id=fuel_type.id,
        price=Decimal('5.50'),
        currency='USD',
        effective_date=datetime.utcnow()
    )
    
    db_session.add(fuel_price)
    db_session.commit()
    
    return [fuel_price]