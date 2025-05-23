import os
os.environ.pop('DATABASE_URL', None)
os.environ.pop('TEST_DATABASE_URL', None)

import pytest
from flask import Flask
from src import create_app, db

@pytest.fixture
def app():
    app = create_app('testing')
    with app.app_context():
        db.create_all()
        yield app
        db.session.remove()
        db.drop_all()

@pytest.fixture
def client(app):
    return app.test_client()

def test_create_and_get_fuel_order(app):
    with app.app_context():
        client = app.test_client()
        # Register a test user
        client.post('/api/auth/register', json={
            'email': 'testuser@example.com',
            'password': 'testpassword'
        })
        # Set correct role
        from src.models.user import User, UserRole
        from src.extensions import db
        user = User.query.filter_by(email='testuser@example.com').first()
        assert user is not None, 'User should exist after registration.'
        user.role = UserRole.CSR
        db.session.add(user)
        db.session.commit()
        # Log in to get token
        resp = client.post('/auth/login', json={
            'email': 'testuser@example.com',
            'password': 'testpassword'
        })
        print('JWT_SECRET_KEY during login:', app.config.get('JWT_SECRET_KEY'))
        token = resp.get_json()['token']

        # Debug: print JWT secret from app config before making API call
        print('JWT_SECRET_KEY during protected endpoint:', app.config.get('JWT_SECRET_KEY'))
        # Create a fuel order
        resp = client.post('/fuel-orders/', json={
            'tail_number': 'N12345',
            'fuel_type': 'Jet-A',
            'assigned_lst_user_id': 1,
            'assigned_truck_id': 1,
            'requested_amount': 100.0,
            'location_on_ramp': 'Ramp A'
        }, headers={'Authorization': f'Bearer {token}'})
        assert resp.status_code == 201

        # Get fuel orders (if implemented)
        # resp = client.get('/fuel-orders/', headers={'Authorization': f'Bearer {token}'})
        # data = resp.get_json()
        # assert any(order['requested_amount'] == 100.0 for order in data.get('orders', []))

def test_create_fuel_order_unauthorized(client):
    resp = client.post('/api/fuel-orders/', json={
        'tail_number': 'N12345',
        'fuel_type': 'Jet-A',
        'assigned_lst_user_id': 1,
        'assigned_truck_id': 1,
        'requested_amount': 100.0,
        'location_on_ramp': 'Ramp A'
    })
    assert resp.status_code == 401
