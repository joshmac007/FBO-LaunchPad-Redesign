import pytest
import json
from datetime import datetime
from src.models.fuel_order import FuelOrderStatus

def test_create_fuel_order(client, test_aircraft, test_customer, test_user, test_fuel_truck):
    """Test creating a fuel order via API."""
    # Login first
    login_response = client.post('/auth/login', json={
        'email': 'testcsr@example.com',
        'password': 'csrpass'
    })
    assert login_response.status_code == 200
    response_data = json.loads(login_response.data)
    print(f"Login response: {response_data}")
    token = response_data['token']
    
    # Create fuel order
    headers = {'Authorization': f'Bearer {token}'}
    data = {
        'tail_number': test_aircraft.tail_number,
        'customer_id': test_customer.id,
        'fuel_type': 'Jet A',
        'additive_requested': False,
        'requested_amount': 1000.0,
        'assigned_lst_user_id': test_user.id,
        'assigned_truck_id': test_fuel_truck.id,
        'location_on_ramp': 'Gate A1',
        'csr_notes': 'Test order'
    }
    
    response = client.post('/fuel-orders/', 
                         json=data,
                         headers=headers)
    print(f"Create response: {response.data.decode()}")
    assert response.status_code == 201
    
    response_data = json.loads(response.data)
    assert response_data['tail_number'] == test_aircraft.tail_number
    assert response_data['status'] == FuelOrderStatus.DISPATCHED.value

def test_get_fuel_orders(client, db_session, test_aircraft, test_user):
    """Test getting list of fuel orders."""
    # Login
    login_response = client.post('/auth/login', json={
        'email': 'testcsr@example.com',
        'password': 'csrpass'
    })
    assert login_response.status_code == 200
    token = json.loads(login_response.data)['token']
    headers = {'Authorization': f'Bearer {token}'}
    
    # Get fuel orders
    response = client.get('/fuel-orders/', headers=headers)
    assert response.status_code == 200
    
    data = json.loads(response.data)
    assert 'fuel_orders' in data
    assert isinstance(data['fuel_orders'], list)
    assert 'pagination' in data

def test_update_fuel_order_status(client, db_session, test_aircraft, test_csr_user, test_lst_user, test_fuel_truck):
    """Test updating fuel order status."""
    # Login as CSR
    login_response = client.post('/auth/login', json={
        'email': 'testcsr@example.com',
        'password': 'csrpass'
    })
    assert login_response.status_code == 200
    token = json.loads(login_response.data)['token']
    headers = {'Authorization': f'Bearer {token}'}
    
    # Create a fuel order first
    create_data = {
        'tail_number': test_aircraft.tail_number,
        'fuel_type': 'Jet A',
        'additive_requested': False,
        'requested_amount': 1000.0,
        'assigned_lst_user_id': test_lst_user.id,
        'assigned_truck_id': test_fuel_truck.id,
        'location_on_ramp': 'Gate A1',
        'csr_notes': 'Test order'
    }
    create_response = client.post('/fuel-orders/', 
                                json=create_data,
                                headers=headers)
    print(f"Create response: {create_response.data.decode()}")
    assert create_response.status_code == 201
    fuel_order_id = json.loads(create_response.data)['id']
    
    # Update status
    update_data = {
        'status': 'Acknowledged',
        'assigned_truck_id': test_fuel_truck.id
    }
    response = client.put(f'/fuel-orders/{fuel_order_id}/',
                         json=update_data,
                         headers=headers)
    assert response.status_code == 200
    
    updated_data = json.loads(response.data)
    assert updated_data['status'] == FuelOrderStatus.ACKNOWLEDGED.value
    assert updated_data['assigned_truck_id'] == test_fuel_truck.id

def test_complete_fuel_order(client, test_aircraft, test_csr_user, test_lst_user, test_fuel_truck):
    # Login as CSR
    login_response = client.post('/auth/login', json={
        'email': 'testcsr@example.com',
        'password': 'csrpass'
    })
    assert login_response.status_code == 200
    csr_token = json.loads(login_response.data)['token']
    auth_headers_csr = {'Authorization': f'Bearer {csr_token}'}
    
    # Login as LST
    login_response = client.post('/auth/login', json={
        'email': 'testlst@example.com',
        'password': 'csrpass'  # LST users also use csrpass in tests
    })
    assert login_response.status_code == 200
    lst_token = json.loads(login_response.data)['token']
    auth_headers_lst = {'Authorization': f'Bearer {lst_token}'}

    # Create a fuel order as CSR
    response = client.post('/fuel-orders/', json={
        'tail_number': test_aircraft.tail_number,
        'fuel_type': 'Jet A',
        'requested_amount': 1000.0,
        'location_on_ramp': 'Gate A1',
        'csr_notes': 'Test order',
        'assigned_truck_id': test_fuel_truck.id,
        'assigned_lst_user_id': test_lst_user.id,
        'additive_requested': False
    }, headers=auth_headers_csr)
    assert response.status_code == 201
    order_data = json.loads(response.data)

    # LST acknowledges the order
    response = client.put(f'/fuel-orders/{order_data["id"]}/', json={
        'status': 'ACKNOWLEDGED',
        'assigned_truck_id': test_fuel_truck.id
    }, headers=auth_headers_lst)
    assert response.status_code == 200

    # LST marks en route
    response = client.put(f'/fuel-orders/{order_data["id"]}/', json={
        'status': 'EN_ROUTE',
        'assigned_truck_id': test_fuel_truck.id
    }, headers=auth_headers_lst)
    assert response.status_code == 200

    # LST marks fueling
    response = client.put(f'/fuel-orders/{order_data["id"]}/', json={
        'status': 'FUELING',
        'assigned_truck_id': test_fuel_truck.id
    }, headers=auth_headers_lst)
    print(f"Fueling response: {response.data.decode()}")
    assert response.status_code == 200

    # LST completes the order with meter readings
    response = client.put(f'/fuel-orders/{order_data["id"]}/submit-data', json={
        'start_meter_reading': 1000.0,
        'end_meter_reading': 1950.0,
        'lst_notes': 'Completed fueling'
    }, headers=auth_headers_lst)
    print(f"Complete response: {response.data.decode()}")
    assert response.status_code == 200

    # CSR reviews the order
    response = client.put(f'/fuel-orders/{order_data["id"]}/', json={
        'status': 'REVIEWED',
        'assigned_truck_id': test_fuel_truck.id
    }, headers=auth_headers_csr)
    print(f"Review response: {response.data.decode()}")
    assert response.status_code == 200 