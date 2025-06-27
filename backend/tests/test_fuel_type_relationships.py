import pytest
from decimal import Decimal
from src.models.fuel_type import FuelType
from src.models.fuel_price import FuelPrice
from src.models.aircraft import Aircraft
from src.models.fuel_order import FuelOrder, FuelOrderStatus
from src.models.customer import Customer
from src.extensions import db


class TestFuelTypeRelationships:
    """Test relationships between FuelType and other models."""

    def test_fuel_type_fuel_price_relationship(self, app, db_session):
        """Test FuelType to FuelPrice relationship."""
        with app.app_context():
            # Create fuel type
            fuel_type = FuelType(
                name="Test Jet A Relationship",
                code="TEST_JET_A_REL",
                is_active=True
            )
            db_session.add(fuel_type)
            db_session.commit()
            
            # Create fuel price
            fuel_price = FuelPrice(
                fbo_location_id=1,
                fuel_type_id=fuel_type.id,
                price=Decimal('5.50'),
                currency='USD'
            )
            db_session.add(fuel_price)
            db_session.commit()
            
            # Test relationship from fuel_price to fuel_type
            assert fuel_price.fuel_type is not None
            assert fuel_price.fuel_type.id == fuel_type.id
            assert fuel_price.fuel_type.name == "Test Jet A Relationship"
            
            # Test relationship from fuel_type to fuel_prices
            assert fuel_type.fuel_prices.count() == 1
            assert fuel_type.fuel_prices.first().id == fuel_price.id

    def test_fuel_type_aircraft_relationship(self, app, db_session):
        """Test FuelType to Aircraft relationship."""
        with app.app_context():
            # Create fuel type
            fuel_type = FuelType(
                name="Test Avgas Relationship",
                code="TEST_AVGAS_REL",
                is_active=True
            )
            db_session.add(fuel_type)
            db_session.commit()
            
            # Create aircraft
            aircraft = Aircraft(
                tail_number="N999TEST",
                aircraft_type="Piston",
                fuel_type_id=fuel_type.id
            )
            db_session.add(aircraft)
            db_session.commit()
            
            # Test relationship from aircraft to fuel_type
            assert aircraft.fuel_type is not None
            assert aircraft.fuel_type.id == fuel_type.id
            assert aircraft.fuel_type.name == "Test Avgas Relationship"
            
            # Test relationship from fuel_type to aircraft
            assert fuel_type.aircraft.count() == 1
            assert fuel_type.aircraft.first().tail_number == "N999TEST"

    def test_fuel_type_fuel_order_relationship(self, app, db_session):
        """Test FuelType to FuelOrder relationship."""
        with app.app_context():
            # Create fuel type
            fuel_type = FuelType(
                name="Test SAF Relationship",
                code="TEST_SAF_REL",
                is_active=True
            )
            db_session.add(fuel_type)
            db_session.commit()
            
            # Create aircraft first
            aircraft = Aircraft(
                tail_number="N888TEST",
                aircraft_type="Jet",
                fuel_type_id=fuel_type.id
            )
            db_session.add(aircraft)
            db_session.commit()
            
            # Create fuel order
            fuel_order = FuelOrder(
                tail_number=aircraft.tail_number,
                fuel_type_id=fuel_type.id,
                requested_amount=Decimal('500.0'),
                status=FuelOrderStatus.DISPATCHED
            )
            db_session.add(fuel_order)
            db_session.commit()
            
            # Test relationship from fuel_order to fuel_type
            assert fuel_order.fuel_type is not None
            assert fuel_order.fuel_type.id == fuel_type.id
            assert fuel_order.fuel_type.name == "Test SAF Relationship"
            
            # Test relationship from fuel_type to fuel_orders
            assert fuel_type.fuel_orders.count() == 1
            assert fuel_type.fuel_orders.first().id == fuel_order.id

    def test_model_to_dict_with_fuel_type(self, app, db_session):
        """Test that to_dict methods work with fuel type relationships."""
        with app.app_context():
            # Create fuel type
            fuel_type = FuelType(
                name="Test Dict Fuel",
                code="TEST_DICT_FUEL",
                description="For testing dict methods",
                is_active=True
            )
            db_session.add(fuel_type)
            db_session.commit()
            
            # Test FuelPrice to_dict
            fuel_price = FuelPrice(
                fbo_location_id=1,
                fuel_type_id=fuel_type.id,
                price=Decimal('6.00'),
                currency='USD'
            )
            db_session.add(fuel_price)
            db_session.commit()
            
            price_dict = fuel_price.to_dict()
            assert price_dict['fuel_type_id'] == fuel_type.id
            assert price_dict['fuel_type_name'] == "Test Dict Fuel"
            assert price_dict['fuel_type_code'] == "TEST_DICT_FUEL"
            
            # Test Aircraft to_dict
            aircraft = Aircraft(
                tail_number="N777DICT",
                aircraft_type="Turboprop",
                fuel_type_id=fuel_type.id
            )
            db_session.add(aircraft)
            db_session.commit()
            
            aircraft_dict = aircraft.to_dict()
            assert aircraft_dict['fuel_type_id'] == fuel_type.id
            assert aircraft_dict['fuel_type_name'] == "Test Dict Fuel"
            assert aircraft_dict['fuel_type_code'] == "TEST_DICT_FUEL"
            
            # Test FuelOrder to_dict
            fuel_order = FuelOrder(
                tail_number=aircraft.tail_number,
                fuel_type_id=fuel_type.id,
                requested_amount=Decimal('300.0'),
                status=FuelOrderStatus.DISPATCHED
            )
            db_session.add(fuel_order)
            db_session.commit()
            
            order_dict = fuel_order.to_dict()
            assert order_dict['fuel_type_id'] == fuel_type.id
            assert order_dict['fuel_type_name'] == "Test Dict Fuel"
            assert order_dict['fuel_type_code'] == "TEST_DICT_FUEL"