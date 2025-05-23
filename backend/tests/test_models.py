import pytest
from datetime import datetime
from src.models.fuel_order import FuelOrder, FuelOrderStatus

def test_create_fuel_order(db_session, test_aircraft, test_customer, test_user, test_fuel_truck):
    """Test creating a new fuel order."""
    fuel_order = FuelOrder(
        tail_number=test_aircraft.tail_number,
        customer_id=test_customer.id,
        fuel_type='Jet A',
        additive_requested=False,
        requested_amount=1000.0,
        assigned_lst_user_id=test_user.id,
        assigned_truck_id=test_fuel_truck.id,
        location_on_ramp='Gate A1'
    )
    
    db_session.add(fuel_order)
    db_session.commit()
    
    assert fuel_order.id is not None
    assert fuel_order.status == FuelOrderStatus.DISPATCHED
    assert fuel_order.created_at is not None

def test_fuel_order_status_transitions(db_session, test_aircraft):
    """Test fuel order status transitions."""
    fuel_order = FuelOrder(
        tail_number=test_aircraft.tail_number,
        fuel_type='Jet A',
        requested_amount=1000.0
    )
    db_session.add(fuel_order)
    db_session.commit()
    
    # Test initial status
    assert fuel_order.status == FuelOrderStatus.DISPATCHED
    assert fuel_order.dispatch_timestamp is None
    
    # Test acknowledge transition
    fuel_order.status = FuelOrderStatus.ACKNOWLEDGED
    fuel_order.acknowledge_timestamp = datetime.utcnow()
    db_session.commit()
    assert fuel_order.status == FuelOrderStatus.ACKNOWLEDGED
    assert fuel_order.acknowledge_timestamp is not None
    
    # Test en route transition
    fuel_order.status = FuelOrderStatus.EN_ROUTE
    fuel_order.en_route_timestamp = datetime.utcnow()
    db_session.commit()
    assert fuel_order.status == FuelOrderStatus.EN_ROUTE
    assert fuel_order.en_route_timestamp is not None

def test_fuel_order_relationships(db_session, test_aircraft, test_customer, test_user, test_fuel_truck):
    """Test fuel order relationships with other models."""
    fuel_order = FuelOrder(
        tail_number=test_aircraft.tail_number,
        customer_id=test_customer.id,
        fuel_type='Jet A',
        requested_amount=1000.0,
        assigned_lst_user_id=test_user.id,
        assigned_truck_id=test_fuel_truck.id
    )
    
    db_session.add(fuel_order)
    db_session.commit()
    
    # Test relationships
    assert fuel_order.aircraft.tail_number == test_aircraft.tail_number
    assert fuel_order.customer.id == test_customer.id
    assert fuel_order.assigned_lst.id == test_user.id
    assert fuel_order.assigned_truck.id == test_fuel_truck.id

def test_fuel_order_metering(db_session, test_aircraft):
    """Test fuel order metering calculations."""
    fuel_order = FuelOrder(
        tail_number=test_aircraft.tail_number,
        fuel_type='Jet A',
        requested_amount=1000.0,
        start_meter_reading=5000.0,
        end_meter_reading=6000.0
    )
    
    db_session.add(fuel_order)
    db_session.commit()
    
    # Test metering calculations
    assert fuel_order.calculated_gallons_dispensed == 1000.0 