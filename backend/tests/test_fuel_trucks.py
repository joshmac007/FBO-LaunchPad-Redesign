import pytest
from decimal import Decimal
from src.models import FuelTruck

def test_create_fuel_truck_success_admin(client, db_session, auth_headers):
    """Test successful fuel truck creation by an authenticated Admin"""
    admin_headers = auth_headers['admin']
    payload = {
        "truck_number": "TRUCK002",
        "fuel_type": "Jet A",
        "capacity": "5000.00",
        "current_meter_reading": "100.00"
    }
    response = client.post('/api/fuel-trucks/', headers=admin_headers, json=payload)
    assert response.status_code == 201
    data = response.get_json()
    assert data['message'] == 'Fuel truck created successfully'
    assert 'fuel_truck' in data
    truck_data = data['fuel_truck']
    assert truck_data['truck_number'] == "TRUCK002"
    assert truck_data['fuel_type'] == "Jet A"
    assert float(truck_data['capacity']) == 5000.00
    assert float(truck_data['current_meter_reading']) == 100.00
    assert truck_data['is_active'] is True

def test_create_fuel_truck_forbidden_csr(client, db_session, auth_headers):
    """Test that a CSR cannot create a fuel truck"""
    csr_headers = auth_headers['csr']
    payload = {
        "truck_number": "TRUCK003",
        "fuel_type": "Jet A",
        "capacity": "5000.00"
    }
    response = client.post('/api/fuel-trucks/', headers=csr_headers, json=payload)
    assert response.status_code == 403  # Forbidden
    data = response.get_json()
    assert 'error' in data
    assert "Insufficient permissions" in data['error']

def test_create_fuel_truck_duplicate_number(client, db_session, auth_headers, test_fuel_truck):
    """Test creating a truck with a duplicate truck number"""
    admin_headers = auth_headers['admin']
    payload = {
        "truck_number": test_fuel_truck.truck_number,  # Using existing truck number
        "fuel_type": "Jet A",
        "capacity": "5000.00"
    }
    response = client.post('/api/fuel-trucks/', headers=admin_headers, json=payload)
    assert response.status_code == 400  # Bad Request
    data = response.get_json()
    assert 'error' in data
    assert "already exists" in data['error']

def test_create_fuel_truck_invalid_data(client, db_session, auth_headers):
    """Test creating a truck with invalid data"""
    admin_headers = auth_headers['admin']
    # Missing required fields
    payload = {
        "truck_number": "TRUCK004"
        # Missing fuel_type and capacity
    }
    response = client.post('/api/fuel-trucks/', headers=admin_headers, json=payload)
    assert response.status_code == 400  # Bad Request
    data = response.get_json()
    assert 'error' in data

def test_get_fuel_trucks_success(client, db_session, auth_headers, test_fuel_truck):
    """Test successful retrieval of fuel trucks"""
    csr_headers = auth_headers['csr']
    response = client.get('/api/fuel-trucks/', headers=csr_headers)
    assert response.status_code == 200
    data = response.get_json()
    assert 'fuel_trucks' in data
    assert len(data['fuel_trucks']) >= 1
    assert any(truck['truck_number'] == test_fuel_truck.truck_number for truck in data['fuel_trucks'])

def test_get_fuel_trucks_filter_active(client, db_session, auth_headers, test_fuel_truck):
    """Test filtering fuel trucks by active status"""
    csr_headers = auth_headers['csr']
    # Create an inactive truck
    inactive_truck = FuelTruck(
        truck_number='INACTIVE001',
        fuel_type='Jet A',
        capacity=5000.0,
        is_active=False
    )
    db_session.add(inactive_truck)
    db_session.commit()

    # Test filtering active trucks
    response = client.get('/api/fuel-trucks/?is_active=true', headers=csr_headers)
    assert response.status_code == 200
    data = response.get_json()
    assert all(truck['is_active'] for truck in data['fuel_trucks'])

    # Test filtering inactive trucks
    response = client.get('/api/fuel-trucks/?is_active=false', headers=csr_headers)
    assert response.status_code == 200
    data = response.get_json()
    assert all(not truck['is_active'] for truck in data['fuel_trucks']) 