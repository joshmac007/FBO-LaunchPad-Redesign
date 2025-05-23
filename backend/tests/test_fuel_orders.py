import pytest
import json
from decimal import Decimal
from src.models import FuelOrder, FuelOrderStatus
from src.extensions import db

# === Fuel Order Creation Tests (POST /api/fuel-orders) ===

def test_create_fuel_order_success_csr(client, db_session, auth_headers, test_users, test_fuel_truck, test_aircraft):
    """ Test successful fuel order creation by a user with CREATE_ORDER permission """
    csr_headers = auth_headers['csr']  # CSR has CREATE_ORDER permission
    lst_user_id = test_users['lst'].id
    truck_id = test_fuel_truck.id
    tail_number = test_aircraft.tail_number

    payload = {
        "tail_number": tail_number,
        "fuel_type": "Jet A",
        "assigned_lst_user_id": lst_user_id,
        "assigned_truck_id": truck_id,
        "location_on_ramp": "Hangar 1",
        "requested_amount": "100.50",  # Send as string, backend handles Decimal
        "additive_requested": True,
        "csr_notes": "Test order notes"
        # customer_id is optional
    }
    response = client.post('/api/fuel-orders', headers=csr_headers, json=payload)

    assert response.status_code == 201
    data = response.get_json()
    assert data['message'] == 'Fuel order created successfully'
    assert 'fuel_order' in data
    order_data = data['fuel_order']
    assert order_data['status'] == FuelOrderStatus.DISPATCHED.value
    assert order_data['tail_number'] == tail_number
    assert order_data['assigned_lst_user_id'] == lst_user_id
    assert order_data['assigned_truck_id'] == truck_id
    assert order_data['requested_amount'] == "100.50"  # Check string representation
    assert order_data['additive_requested'] is True
    assert order_data['csr_notes'] == "Test order notes"
    assert order_data['dispatch_timestamp'] is not None

    # Verify DB state
    order_in_db = FuelOrder.query.get(order_data['id'])
    assert order_in_db is not None
    assert order_in_db.status == FuelOrderStatus.DISPATCHED
    assert order_in_db.requested_amount == Decimal("100.50")  # Check Decimal in DB

def test_create_fuel_order_success_admin(client, db_session, auth_headers, test_users, test_fuel_truck, test_aircraft):
    """ Test successful fuel order creation by an admin (who has CREATE_ORDER permission) """
    admin_headers = auth_headers['admin']  # Admin has all permissions including CREATE_ORDER
    lst_user_id = test_users['lst'].id
    truck_id = test_fuel_truck.id
    tail_number = test_aircraft.tail_number

    payload = {  # Minimal required payload
        "tail_number": tail_number,
        "fuel_type": "100LL",
        "assigned_lst_user_id": lst_user_id,
        "assigned_truck_id": truck_id,
    }
    response = client.post('/api/fuel-orders', headers=admin_headers, json=payload)
    assert response.status_code == 201
    data = response.get_json()
    assert data['message'] == 'Fuel order created successfully'
    assert 'fuel_order' in data
    order_data = data['fuel_order']
    assert order_data['status'] == FuelOrderStatus.DISPATCHED.value
    assert order_data['tail_number'] == tail_number
    assert order_data['assigned_lst_user_id'] == lst_user_id
    assert order_data['assigned_truck_id'] == truck_id

def test_create_fuel_order_success_lst(client, db_session, auth_headers, test_users, test_fuel_truck, test_aircraft):
    """ Test successful fuel order creation by an LST (who now has CREATE_ORDER permission) """
    lst_headers = auth_headers['lst']  # LST now has CREATE_ORDER permission
    lst_user_id = test_users['lst'].id
    truck_id = test_fuel_truck.id
    tail_number = test_aircraft.tail_number

    payload = {
        "tail_number": tail_number,
        "fuel_type": "Jet A",
        "assigned_lst_user_id": lst_user_id,
        "assigned_truck_id": truck_id,
    }
    response = client.post('/api/fuel-orders', headers=lst_headers, json=payload)
    assert response.status_code == 201
    data = response.get_json()
    assert 'fuel_order' in data
    assert data['message'] == 'Fuel order created successfully'

def test_create_fuel_order_unauthenticated(client, db_session, test_users, test_fuel_truck, test_aircraft):
    """ Test creating a fuel order without authentication """
    lst_user_id = test_users['lst'].id
    truck_id = test_fuel_truck.id
    tail_number = test_aircraft.tail_number
    payload = {
        "tail_number": tail_number,
        "fuel_type": "Jet A",
        "assigned_lst_user_id": lst_user_id,
        "assigned_truck_id": truck_id,
    }
    response = client.post('/api/fuel-orders', json=payload)  # No headers
    assert response.status_code == 401  # Unauthorized
    data = response.get_json()
    assert 'error' in data
    assert "Authentication token is missing" in data['error']

def test_create_fuel_order_missing_required_fields(client, db_session, auth_headers, test_aircraft):
    """ Test creating order with missing required fields """
    csr_headers = auth_headers['csr']
    payload = {
        "tail_number": test_aircraft.tail_number
        # Missing fuel_type, assigned_lst_user_id, assigned_truck_id
    }
    response = client.post('/api/fuel-orders', headers=csr_headers, json=payload)
    assert response.status_code == 400  # Bad Request
    data = response.get_json()
    assert 'error' in data
    assert "Missing required fields" in data['error']

def test_create_fuel_order_invalid_lst_id(client, db_session, auth_headers, test_fuel_truck, test_aircraft):
    """ Test creating order with a non-existent LST user ID """
    csr_headers = auth_headers['csr']
    truck_id = test_fuel_truck.id
    tail_number = test_aircraft.tail_number
    payload = {
        "tail_number": tail_number,
        "fuel_type": "Jet A",
        "assigned_lst_user_id": 99999,  # Non-existent ID
        "assigned_truck_id": truck_id,
    }
    response = client.post('/api/fuel-orders', headers=csr_headers, json=payload)
    assert response.status_code == 400  # Bad Request (Service validation)
    data = response.get_json()
    assert 'error' in data
    assert "Invalid or inactive LST user ID" in data['error']

def test_create_fuel_order_invalid_truck_id(client, db_session, auth_headers, test_users, test_aircraft):
    """ Test creating order with a non-existent Truck ID """
    csr_headers = auth_headers['csr']
    lst_user_id = test_users['lst'].id
    tail_number = test_aircraft.tail_number
    payload = {
        "tail_number": tail_number,
        "fuel_type": "Jet A",
        "assigned_lst_user_id": lst_user_id,
        "assigned_truck_id": 99999,  # Non-existent ID
    }
    response = client.post('/api/fuel-orders', headers=csr_headers, json=payload)
    assert response.status_code == 400  # Bad Request
    data = response.get_json()
    assert 'error' in data
    assert "Invalid or inactive Fuel Truck ID" in data['error']

def test_create_fuel_order_invalid_aircraft_id(client, db_session, auth_headers, test_users, test_fuel_truck):
    """ Test creating order with a non-existent Aircraft tail number """
    csr_headers = auth_headers['csr']
    lst_user_id = test_users['lst'].id
    truck_id = test_fuel_truck.id
    payload = {
        "tail_number": "N999XX",  # Non-existent tail number
        "fuel_type": "Jet A",
        "assigned_lst_user_id": lst_user_id,
        "assigned_truck_id": truck_id,
    }
    response = client.post('/api/fuel-orders', headers=csr_headers, json=payload)
    assert response.status_code == 400  # Bad Request
    data = response.get_json()
    assert 'error' in data
    assert "Aircraft with tail number N999XX not found" in data['error']

def test_create_fuel_order_invalid_amount(client, db_session, auth_headers, test_users, test_fuel_truck, test_aircraft):
    """ Test creating order with invalid requested amount """
    csr_headers = auth_headers['csr']
    lst_user_id = test_users['lst'].id
    truck_id = test_fuel_truck.id
    tail_number = test_aircraft.tail_number
    payload = {
        "tail_number": tail_number,
        "fuel_type": "Jet A",
        "assigned_lst_user_id": lst_user_id,
        "assigned_truck_id": truck_id,
        "requested_amount": "invalid",  # Invalid amount
    }
    response = client.post('/api/fuel-orders', headers=csr_headers, json=payload)
    assert response.status_code == 400  # Bad Request
    data = response.get_json()
    assert 'error' in data
    assert "Invalid requested amount" in data['error']

def test_order_status_update_permissions(client, db_session, auth_headers, test_users, test_fuel_truck, test_aircraft):
    """Test order status updates with different user permissions."""
    # Create an order first
    csr_headers = auth_headers['csr']
    lst_user_id = test_users['lst'].id
    truck_id = test_fuel_truck.id
    tail_number = test_aircraft.tail_number
    
    # Create order
    payload = {
        "tail_number": tail_number,
        "fuel_type": "Jet A",
        "assigned_lst_user_id": lst_user_id,
        "assigned_truck_id": truck_id,
    }
    response = client.post('/api/fuel-orders', headers=csr_headers, json=payload)
    assert response.status_code == 201
    order_id = response.get_json()['fuel_order']['id']
    
    # Test LST can update status (has MANAGE_ORDERS permission)
    lst_headers = auth_headers['lst']
    update_payload = {"status": "IN_PROGRESS"}
    response = client.patch(f'/api/fuel-orders/{order_id}/status',
                          headers=lst_headers,
                          json=update_payload)
    assert response.status_code == 200
    
    # Test CSR can update status (has MANAGE_ORDERS permission)
    update_payload = {"status": "COMPLETED"}
    response = client.patch(f'/api/fuel-orders/{order_id}/status',
                          headers=csr_headers,
                          json=update_payload)
    assert response.status_code == 200
    
    # Test Admin can update status (has all permissions)
    admin_headers = auth_headers['admin']
    update_payload = {"status": "CANCELLED"}
    response = client.patch(f'/api/fuel-orders/{order_id}/status',
                          headers=admin_headers,
                          json=update_payload)
    assert response.status_code == 200 