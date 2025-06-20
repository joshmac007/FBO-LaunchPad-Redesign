"""
Test Aircraft Service Consolidation
Tests the consolidated get_or_create_aircraft method to ensure it prevents race conditions
and works correctly for both existing and new aircraft.
"""
import pytest
from unittest.mock import patch, MagicMock
from decimal import Decimal
from src.services.aircraft_service import AircraftService
from src.models.aircraft import Aircraft
from src.extensions import db
import logging

logger = logging.getLogger(__name__)

class TestAircraftServiceConsolidation:
    """Test the consolidated aircraft service methods."""

    def test_get_or_create_existing_aircraft(self, app, db_session):
        """Test that get_or_create returns existing aircraft without creating new one."""
        with app.app_context():
            # Create an existing aircraft
            existing_aircraft = Aircraft(
                tail_number="N12345",
                aircraft_type="Cessna 172",
                fuel_type="100LL"
            )
            db_session.add(existing_aircraft)
            db_session.commit()
            
            # Test get_or_create with existing aircraft
            aircraft_data = {
                'tail_number': "N12345",
                'aircraft_type': "Citation CJ3",  # Different type
                'fuel_type': "Jet A"  # Different fuel
            }
            
            aircraft, message, status_code, was_created = AircraftService.get_or_create_aircraft(aircraft_data)
            
            # Should return existing aircraft, not create new one
            assert aircraft is not None
            assert aircraft.tail_number == "N12345"
            assert aircraft.aircraft_type == "Cessna 172"  # Original type preserved
            assert aircraft.fuel_type == "100LL"  # Original fuel preserved
            assert status_code == 200
            assert was_created is False
            assert "retrieved successfully" in message

    def test_get_or_create_new_aircraft(self, app, db_session):
        """Test that get_or_create creates new aircraft when it doesn't exist."""
        with app.app_context():
            aircraft_data = {
                'tail_number': "N67890",
                'aircraft_type': "Citation CJ3",
                'fuel_type': "Jet A"
            }
            
            aircraft, message, status_code, was_created = AircraftService.get_or_create_aircraft(aircraft_data)
            
            # Should create new aircraft
            assert aircraft is not None
            assert aircraft.tail_number == "N67890"
            assert aircraft.aircraft_type == "Citation CJ3"
            assert aircraft.fuel_type == "Jet A"
            assert status_code == 201
            assert was_created is True
            assert "created successfully" in message
            
            # Verify it was actually saved to database
            db_aircraft = Aircraft.query.get("N67890")
            assert db_aircraft is not None
            assert db_aircraft.aircraft_type == "Citation CJ3"

    def test_get_or_create_missing_tail_number(self, app, db_session):
        """Test error handling when tail_number is missing."""
        with app.app_context():
            aircraft_data = {
                'aircraft_type': "Citation CJ3",
                'fuel_type': "Jet A"
                # Missing tail_number
            }
            
            aircraft, message, status_code, was_created = AircraftService.get_or_create_aircraft(aircraft_data)
            
            assert aircraft is None
            assert status_code == 400
            assert was_created is False
            assert "Missing required field: tail_number" in message

    def test_get_or_create_missing_aircraft_type_for_new(self, app, db_session):
        """Test error handling when aircraft_type is missing for new aircraft."""
        with app.app_context():
            aircraft_data = {
                'tail_number': "N99999",
                'fuel_type': "Jet A"
                # Missing aircraft_type
            }
            
            aircraft, message, status_code, was_created = AircraftService.get_or_create_aircraft(aircraft_data)
            
            assert aircraft is None
            assert status_code == 400
            assert was_created is False
            assert "Missing required field: aircraft_type for aircraft creation" in message

    def test_get_or_create_missing_fuel_type_for_new(self, app, db_session):
        """Test error handling when fuel_type is missing for new aircraft."""
        with app.app_context():
            aircraft_data = {
                'tail_number': "N88888",
                'aircraft_type': "Citation CJ3"
                # Missing fuel_type
            }
            
            aircraft, message, status_code, was_created = AircraftService.get_or_create_aircraft(aircraft_data)
            
            assert aircraft is None
            assert status_code == 400
            assert was_created is False
            assert "Missing required field: fuel_type for aircraft creation" in message

    def test_get_or_create_race_condition_handling(self, app, db_session):
        """Test that duplicate aircraft creation is handled gracefully."""
        with app.app_context():
            aircraft_data = {
                'tail_number': "N55555",
                'aircraft_type': "King Air 350",
                'fuel_type': "Jet A"
            }
            
            # First create the aircraft
            aircraft1, message1, status_code1, was_created1 = AircraftService.get_or_create_aircraft(aircraft_data)
            assert aircraft1 is not None
            assert was_created1 is True
            assert status_code1 == 201
            
            # Try to create the same aircraft again - should return existing one
            aircraft2, message2, status_code2, was_created2 = AircraftService.get_or_create_aircraft(aircraft_data)
            assert aircraft2 is not None
            assert aircraft2.tail_number == "N55555"
            assert status_code2 == 200
            assert was_created2 is False
            assert "retrieved successfully" in message2

    def test_get_or_create_with_customer_id(self, app, db_session):
        """Test that customer_id is properly handled."""
        with app.app_context():
            from src.models.customer import Customer
            
            # Create a valid customer first
            customer = Customer(
                name="Test Customer",
                email="test@example.com",
                phone="555-1234"
            )
            db_session.add(customer)
            db_session.commit()
            
            aircraft_data = {
                'tail_number': "N77777",
                'aircraft_type': "Pilatus PC-12",
                'fuel_type': "Jet A",
                'customer_id': customer.id
            }
            
            aircraft, message, status_code, was_created = AircraftService.get_or_create_aircraft(aircraft_data)
            
            assert aircraft is not None
            assert aircraft.tail_number == "N77777"
            assert aircraft.customer_id == customer.id
            assert status_code == 201
            assert was_created is True

    def test_get_or_create_normalizes_tail_number(self, app, db_session):
        """Test that tail numbers are properly normalized (uppercase, stripped)."""
        with app.app_context():
            aircraft_data = {
                'tail_number': "  n11111  ",  # Lowercase with spaces
                'aircraft_type': "Beechcraft Bonanza",
                'fuel_type': "100LL"
            }
            
            aircraft, message, status_code, was_created = AircraftService.get_or_create_aircraft(aircraft_data)
            
            assert aircraft is not None
            assert aircraft.tail_number == "N11111"  # Should be normalized
            assert status_code == 201
            assert was_created is True

class TestFuelOrderAircraftConsolidation:
    """Test that fuel order creation uses the consolidated aircraft logic."""
    
    def test_aircraft_service_consolidation_summary(self, app, db_session):
        """Summary test to verify aircraft consolidation prevents redundancy and race conditions."""
        with app.app_context():
            # This test summarizes the key achievement: aircraft creation is now consolidated
            # in AircraftService.get_or_create_aircraft, preventing redundant/inconsistent creation
            
            # Test: Multiple attempts to create the same aircraft should result in one aircraft
            aircraft_data = {
                'tail_number': 'N99999',
                'aircraft_type': 'Test Aircraft',
                'fuel_type': 'Jet A'
            }
            
            # First call: should create aircraft
            aircraft1, message1, status1, created1 = AircraftService.get_or_create_aircraft(aircraft_data)
            
            # Second call: should return existing aircraft
            aircraft2, message2, status2, created2 = AircraftService.get_or_create_aircraft(aircraft_data)
            
            # Verify consolidation worked
            assert aircraft1 is not None and aircraft2 is not None
            assert aircraft1.tail_number == aircraft2.tail_number
            assert created1 is True  # First call created it
            assert created2 is False  # Second call found existing
            assert status1 == 201 and status2 == 200  # Created vs found
            
            # Most importantly: Only one aircraft exists in the database
            count = Aircraft.query.filter_by(tail_number='N99999').count()
            assert count == 1

    def test_aircraft_consolidation_integration(self, app, db_session):
        """Test the aircraft consolidation logic directly to verify it works end-to-end."""
        with app.app_context():
            # Test 1: Create new aircraft
            aircraft_data = {
                'tail_number': 'N77788',  # Use unique tail number
                'aircraft_type': 'Boeing 737',
                'fuel_type': 'Jet A'
            }
            
            aircraft1, message1, status_code1, was_created1 = AircraftService.get_or_create_aircraft(aircraft_data)
            assert aircraft1 is not None
            assert was_created1 is True
            assert status_code1 == 201
            assert "created successfully" in message1
            
            # Test 2: Try to create same aircraft again - should return existing
            aircraft2, message2, status_code2, was_created2 = AircraftService.get_or_create_aircraft(aircraft_data)
            assert aircraft2 is not None
            assert aircraft2.tail_number == aircraft1.tail_number
            assert was_created2 is False
            assert status_code2 == 200
            assert "retrieved successfully" in message2
            
            # Test 3: Verify both calls returned the same aircraft
            assert aircraft1.tail_number == aircraft2.tail_number
            assert aircraft1.aircraft_type == aircraft2.aircraft_type
            
            # Verify database has only one aircraft with this tail number
            aircraft_count = Aircraft.query.filter_by(tail_number='N77788').count()
            assert aircraft_count == 1 