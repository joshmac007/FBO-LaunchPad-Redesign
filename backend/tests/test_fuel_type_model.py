import pytest
from datetime import datetime
from sqlalchemy.exc import IntegrityError
from src.models.fuel_type import FuelType
from src.extensions import db


class TestFuelTypeModel:
    """Test cases for the FuelType model."""

    def test_fuel_type_creation(self, app, db_session):
        """Test creating a new fuel type."""
        with app.app_context():
            fuel_type = FuelType(
                name="Test Jet A",
                code="TEST_JET_A",
                description="Standard aviation turbine fuel",
                is_active=True
            )
            db_session.add(fuel_type)
            db_session.commit()
            
            assert fuel_type.id is not None
            assert fuel_type.name == "Test Jet A"
            assert fuel_type.code == "TEST_JET_A"
            assert fuel_type.description == "Standard aviation turbine fuel"
            assert fuel_type.is_active is True
            assert fuel_type.created_at is not None
            assert fuel_type.updated_at is not None

    def test_fuel_type_unique_name_constraint(self, app, db_session):
        """Test that fuel type names must be unique."""
        with app.app_context():
            # Use a unique timestamp to avoid conflicts
            import time
            timestamp = str(int(time.time() * 1000))
            
            # Create first fuel type
            fuel_type1 = FuelType(
                name=f"Test Duplicate Name {timestamp}",
                code=f"TEST_DUP_NAME_{timestamp}",
                is_active=True
            )
            db_session.add(fuel_type1)
            db_session.commit()
            
            # Try to create another with same name
            fuel_type2 = FuelType(
                name=f"Test Duplicate Name {timestamp}",
                code=f"TEST_DUP_NAME_2_{timestamp}",
                is_active=True
            )
            db_session.add(fuel_type2)
            
            # This should raise an integrity error
            with pytest.raises(IntegrityError):
                db_session.commit()

    def test_fuel_type_unique_code_constraint(self, app, db_session):
        """Test that fuel type codes must be unique."""
        with app.app_context():
            # Use a unique timestamp to avoid conflicts
            import time
            timestamp = str(int(time.time() * 1000))
            
            # Create first fuel type
            fuel_type1 = FuelType(
                name=f"Test Duplicate Code {timestamp}",
                code=f"TEST_DUP_CODE_{timestamp}",
                is_active=True
            )
            db_session.add(fuel_type1)
            db_session.commit()
            
            # Try to create another with same code
            fuel_type2 = FuelType(
                name=f"Test Duplicate Code Different {timestamp}",
                code=f"TEST_DUP_CODE_{timestamp}",
                is_active=True
            )
            db_session.add(fuel_type2)
            
            # This should raise an integrity error
            with pytest.raises(IntegrityError):
                db_session.commit()

    def test_fuel_type_to_dict(self, app, db_session):
        """Test the to_dict method returns correct dictionary."""
        with app.app_context():
            fuel_type = FuelType(
                name="Test Avgas 100LL",
                code="TEST_AVGAS_100LL",
                description="Aviation gasoline for piston engines",
                is_active=True
            )
            db_session.add(fuel_type)
            db_session.commit()
            
            result = fuel_type.to_dict()
            
            assert isinstance(result, dict)
            assert result['id'] == fuel_type.id
            assert result['name'] == "Test Avgas 100LL"
            assert result['code'] == "TEST_AVGAS_100LL"
            assert result['description'] == "Aviation gasoline for piston engines"
            assert result['is_active'] is True
            assert 'created_at' in result
            assert 'updated_at' in result
            
            # Check that timestamps are ISO formatted strings
            assert isinstance(result['created_at'], str)
            assert isinstance(result['updated_at'], str)

    def test_fuel_type_repr(self, app, db_session):
        """Test the string representation of fuel type."""
        with app.app_context():
            fuel_type = FuelType(
                name="Test SAF Jet A",
                code="TEST_SAF_JET_A",
                is_active=True
            )
            db_session.add(fuel_type)
            db_session.commit()
            
            repr_str = repr(fuel_type)
            assert "FuelType" in repr_str
            assert "Test SAF Jet A" in repr_str

    def test_fuel_type_inactive_flag(self, app, db_session):
        """Test creating inactive fuel type."""
        with app.app_context():
            fuel_type = FuelType(
                name="Test Discontinued Fuel",
                code="TEST_DISCONTINUED",
                is_active=False
            )
            db_session.add(fuel_type)
            db_session.commit()
            
            assert fuel_type.is_active is False

    def test_fuel_type_optional_description(self, app, db_session):
        """Test that description field is optional."""
        with app.app_context():
            fuel_type = FuelType(
                name="Test Minimal Fuel",
                code="TEST_MINIMAL",
                is_active=True
            )
            db_session.add(fuel_type)
            db_session.commit()
            
            assert fuel_type.description is None
            
            result = fuel_type.to_dict()
            assert result['description'] is None