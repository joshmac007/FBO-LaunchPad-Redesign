"""
Test configuration and fixtures for the FBO LaunchPad backend tests.

This module provides standardized test fixtures including database sessions,
authenticated clients, and sample data factories for consistent testing.
"""

import pytest
import os
import tempfile
from unittest.mock import Mock
from flask import Flask
from typing import Dict, Any, Callable

# Import the application factory and database
from src import create_app
from src.extensions import db as _db
from src.models.user import User
from src.models.role import Role
from src.models.permission import Permission
from src.models.fuel_type import FuelType
from src.models.aircraft_classification import AircraftClassification
from src.models.aircraft_type import AircraftType
from src.models.fee_rule import FeeRule, CalculationBasis, WaiverStrategy
from src.models.waiver_tier import WaiverTier


@pytest.fixture(scope='session')
def app():
    """Create and configure a new app instance for each test session."""
    # Create a temporary file for the test database
    db_fd, db_path = tempfile.mkstemp()
    
    # Set environment variable for test database
    os.environ['SQLALCHEMY_DATABASE_URI'] = f'sqlite:///{db_path}'
    
    # Create app with testing configuration
    app = create_app('testing')
    
    # Establish an application context
    with app.app_context():
        # Create all database tables
        _db.create_all()
        yield app
        
        # Clean up
        _db.drop_all()
    
    # Clean up environment variable
    if 'SQLALCHEMY_DATABASE_URI' in os.environ:
        del os.environ['SQLALCHEMY_DATABASE_URI']
    
    # Close and remove the temporary database file
    os.close(db_fd)
    os.unlink(db_path)


@pytest.fixture
def client(app):
    """Create a test client for the Flask application."""
    return app.test_client()


@pytest.fixture
def db_session(app):
    """
    Create a database session for testing with automatic rollback.
    
    This fixture ensures that each test gets a clean database state
    and that changes made during tests don't persist.
    """
    with app.app_context():
        # Begin a transaction
        connection = _db.engine.connect()
        transaction = connection.begin()
        
        # Configure the session to use this transaction
        _db.session.configure(bind=connection)
        
        yield _db.session
        
        # Rollback the transaction after the test
        transaction.rollback()
        connection.close()
        _db.session.remove()


@pytest.fixture
def auth_headers(db_session) -> Callable[[str], Dict[str, str]]:
    """
    Factory fixture for creating authenticated request headers.
    
    Returns a function that takes a permission name and returns
    headers with a mock JWT token for that permission.
    
    Usage:
        headers = auth_headers('manage_fbo_fee_schedules')
        response = client.get('/api/endpoint', headers=headers)
    """
    def _make_auth_headers(permission_name: str) -> Dict[str, str]:
        """Create authentication headers for a user with the given permission."""
        # Create a test user with the required permission
        user = User()
        user.username = f'test_user_{permission_name}'
        user.email = f'test_{permission_name}@example.com'
        user.password_hash = 'test_hash'  # In real app this would be properly hashed
        
        # Create role and permission if they don't exist
        permission = Permission.query.filter_by(name=permission_name).first()
        if not permission:
            permission = Permission()
            permission.name = permission_name
            permission.description = f'Test permission for {permission_name}'
            db_session.add(permission)
        
        role = Role.query.filter_by(name=f'test_role_{permission_name}').first()
        if not role:
            role = Role()
            role.name = f'test_role_{permission_name}'
            role.description = f'Test role for {permission_name}'
            role.permissions.append(permission)
            db_session.add(role)
        
        user.roles.append(role)
        db_session.add(user)
        db_session.commit()
        
        # Create mock JWT token (in real implementation this would be properly signed)
        mock_token = f'Bearer mock_jwt_token_{user.id}_{permission_name}'
        
        return {
            'Authorization': mock_token,
            'Content-Type': 'application/json'
        }
    
    return _make_auth_headers


@pytest.fixture
def sample_fuel_type(db_session):
    """Create a sample fuel type for testing."""
    fuel_type = FuelType()
    fuel_type.name = 'Test Jet A'
    fuel_type.code = 'TEST_JET_A'
    fuel_type.description = 'Test fuel type for unit tests'
    fuel_type.is_active = True
    
    db_session.add(fuel_type)
    db_session.commit()
    
    return fuel_type


@pytest.fixture
def sample_aircraft_classification(db_session):
    """Create a sample aircraft classification for testing."""
    classification = AircraftClassification()
    classification.name = 'Test Light Jet'
    
    db_session.add(classification)
    db_session.commit()
    
    return classification


@pytest.fixture
def sample_aircraft_type(db_session, sample_aircraft_classification):
    """Create a sample aircraft type for testing."""
    aircraft_type = AircraftType()
    aircraft_type.name = 'Test Citation CJ3'
    aircraft_type.base_min_fuel_gallons_for_waiver = 200.0
    aircraft_type.classification_id = sample_aircraft_classification.id
    aircraft_type.default_max_gross_weight_lbs = 13870.0
    
    db_session.add(aircraft_type)
    db_session.commit()
    
    return aircraft_type


@pytest.fixture
def sample_fee_rule(db_session):
    """Create a sample global fee rule for testing."""
    fee_rule = FeeRule()
    fee_rule.fee_name = 'Test Ramp Fee'
    fee_rule.fee_code = 'TEST_RAMP'
    fee_rule.amount = 75.0
    fee_rule.currency = 'USD'
    fee_rule.is_taxable = True
    fee_rule.is_manually_waivable = True
    fee_rule.calculation_basis = CalculationBasis.FIXED_PRICE
    fee_rule.waiver_strategy = WaiverStrategy.SIMPLE_MULTIPLIER
    fee_rule.simple_waiver_multiplier = 1.0
    fee_rule.has_caa_override = False
    
    db_session.add(fee_rule)
    db_session.commit()
    
    return fee_rule


@pytest.fixture
def sample_waiver_tier(db_session):
    """Create a sample waiver tier for testing."""
    waiver_tier = WaiverTier()
    waiver_tier.name = 'Test Standard Waiver'
    waiver_tier.fuel_uplift_multiplier = 1.5
    waiver_tier.fees_waived_codes = ['TEST_RAMP']
    waiver_tier.tier_priority = 1
    waiver_tier.is_caa_specific_tier = False
    
    db_session.add(waiver_tier)
    db_session.commit()
    
    return waiver_tier


# Mock Flask-Login for tests that need user context
@pytest.fixture
def mock_current_user():
    """Create a mock current user for Flask-Login dependent tests."""
    user = Mock()
    user.id = 1
    user.username = 'test_user'
    user.email = 'test@example.com'
    user.is_authenticated = True
    user.is_active = True
    user.is_anonymous = False
    
    return user


@pytest.fixture
def app_context(app):
    """Provide an application context for tests that need it."""
    with app.app_context():
        yield app