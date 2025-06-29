import pytest
import json
import io
from decimal import Decimal
from datetime import datetime
from sqlalchemy.exc import IntegrityError

from src.models.aircraft_classification import AircraftClassification
from src.models.fee_rule import FeeRule, CalculationBasis, WaiverStrategy
from src.models.aircraft_type import AircraftType
# from src.models.aircraft_type_aircraft_classification_mapping import AircraftTypeToAircraftClassificationMapping
from src.models.waiver_tier import WaiverTier
from src.services.admin_fee_config_service import AdminFeeConfigService
from src.extensions import db


@pytest.fixture(scope='function', autouse=True)
def clean_fee_config_tables(db_session):
    """Clean fee configuration tables before each test."""
    # Delete all fee configuration data to ensure clean test state
    # Order matters due to foreign key constraints
    # from src.models.aircraft_type_aircraft_classification_mapping import AircraftTypeToAircraftClassificationMapping
    
    db_session.query(FeeRule).delete()
    # db_session.query(AircraftTypeToAircraftClassificationMapping).delete() 
    db_session.query(WaiverTier).delete()
    db_session.query(AircraftType).delete()  # Delete aircraft types first (they reference classifications)
    db_session.query(AircraftClassification).delete()  # Then delete classifications
    db_session.commit()


@pytest.fixture(scope='function')
def test_fbo_id():
    """Default FBO ID for testing"""
    return 1


@pytest.fixture(scope='function')
def test_aircraft_classifications(db_session):
    """Create test aircraft classifications (global)"""
    import uuid
    test_id = str(uuid.uuid4())[:8]  # Use a unique identifier
    classifications = [
        AircraftClassification(name=f'Test Piston {test_id}'),
        AircraftClassification(name=f'Test Light Jet {test_id}'),
        AircraftClassification(name=f'Test Heavy Jet {test_id}'),
        AircraftClassification(name=f'Test Helicopter {test_id}')
    ]
    for classification in classifications:
        db_session.add(classification)
    db_session.commit()
    return classifications


@pytest.fixture(scope='function')
def test_aircraft_types(db_session, test_aircraft_classifications):
    """Create test aircraft types with classifications"""
    aircraft_types = [
        AircraftType(
            name='Test Cessna 172',
            base_min_fuel_gallons_for_waiver=50.0,
            classification_id=test_aircraft_classifications[0].id  # Piston
        ),
        AircraftType(
            name='Test Gulfstream G650',
            base_min_fuel_gallons_for_waiver=500.0,
            classification_id=test_aircraft_classifications[2].id  # Heavy Jet
        ),
        AircraftType(
            name='Test Boeing 737',
            base_min_fuel_gallons_for_waiver=1000.0,
            classification_id=test_aircraft_classifications[2].id  # Heavy Jet
        )
    ]
    for aircraft_type in aircraft_types:
        db_session.add(aircraft_type)
    db_session.commit()
    return aircraft_types


# Legacy fixture - deprecated, use test_aircraft_classifications instead
@pytest.fixture(scope='function')
def test_fee_categories(test_aircraft_classifications):
    """Create test fee categories (deprecated - use test_aircraft_classifications)"""
    return test_aircraft_classifications


@pytest.fixture(scope='function')
def test_fee_rules(db_session, test_fbo_id, test_fee_categories):
    """Create test fee rules"""
    fee_rules = [
        FeeRule(
            fbo_location_id=test_fbo_id,
            fee_name='Ramp Fee',
            fee_code='RAMP',
            applies_to_aircraft_classification_id=test_fee_categories[0].id,
            amount=50.00,
            is_potentially_waivable_by_fuel_uplift=True,
            waiver_strategy=WaiverStrategy.SIMPLE_MULTIPLIER,
            simple_waiver_multiplier=2.0
        ),
        FeeRule(
            fbo_location_id=test_fbo_id,
            fee_name='Overnight Fee',
            fee_code='OVERNIGHT',
            applies_to_aircraft_classification_id=test_fee_categories[1].id,
            amount=100.00,
            is_potentially_waivable_by_fuel_uplift=False
        )
    ]
    for rule in fee_rules:
        db_session.add(rule)
    db_session.commit()
    return fee_rules


@pytest.fixture(scope='function')
def test_waiver_tiers(db_session, test_fbo_id):
    """Create test waiver tiers"""
    waiver_tiers = [
        WaiverTier(
            fbo_location_id=test_fbo_id,
            name='Bronze Tier',
            fuel_uplift_multiplier=1.5,
            fees_waived_codes=['RAMP'],
            tier_priority=1
        ),
        WaiverTier(
            fbo_location_id=test_fbo_id,
            name='Gold Tier',
            fuel_uplift_multiplier=3.0,
            fees_waived_codes=['RAMP', 'OVERNIGHT'],
            tier_priority=2
        )
    ]
    for tier in waiver_tiers:
        db_session.add(tier)
    db_session.commit()
    return waiver_tiers


class TestAircraftTypesAPI:
    """Test Aircraft Types API endpoints"""
    
    def test_get_aircraft_types_list_success(self, client, auth_headers, test_fbo_id, test_aircraft_types):
        """Test successful retrieval of aircraft types list"""
        response = client.get(
            f'/api/admin/fbo/{test_fbo_id}/aircraft-types',
            headers=auth_headers['administrator']
        )
        
        assert response.status_code == 200
        data = response.get_json()
        assert 'aircraft_types' in data
        assert len(data['aircraft_types']) == len(test_aircraft_types)
        
        # Verify structure
        for aircraft_type in data['aircraft_types']:
            assert 'id' in aircraft_type
            assert 'name' in aircraft_type
            assert 'base_min_fuel_gallons_for_waiver' in aircraft_type
    
    def test_get_aircraft_types_list_unauthorized(self, client, test_fbo_id):
        """Test unauthorized access to aircraft types list"""
        response = client.get(f'/api/admin/fbo/{test_fbo_id}/aircraft-types')
        assert response.status_code == 401
    
    def test_update_aircraft_type_success(self, client, auth_headers, test_fbo_id, test_aircraft_types):
        """Test successful aircraft type update"""
        aircraft_type_id = test_aircraft_types[0].id
        update_data = {
            'base_min_fuel_gallons_for_waiver': 75.0
        }
        
        response = client.put(
            f'/api/admin/fbo/{test_fbo_id}/aircraft-types/{aircraft_type_id}',
            headers=auth_headers['administrator'],
            json=update_data
        )
        
        assert response.status_code == 200
        data = response.get_json()
        assert 'aircraft_type' in data
        assert data['aircraft_type']['base_min_fuel_gallons_for_waiver'] == 75.0
    
    def test_update_aircraft_type_not_found(self, client, auth_headers, test_fbo_id):
        """Test updating non-existent aircraft type"""
        response = client.put(
            f'/api/admin/fbo/{test_fbo_id}/aircraft-types/99999',
            headers=auth_headers['administrator'],
            json={'base_min_fuel_gallons_for_waiver': 75.0}
        )
        
        assert response.status_code == 404
    
    def test_update_aircraft_type_invalid_data(self, client, auth_headers, test_fbo_id, test_aircraft_types):
        """Test updating aircraft type with invalid data"""
        aircraft_type_id = test_aircraft_types[0].id
        
        response = client.put(
            f'/api/admin/fbo/{test_fbo_id}/aircraft-types/{aircraft_type_id}',
            headers=auth_headers['administrator'],
            json={'base_min_fuel_gallons_for_waiver': 'invalid'}
        )
        
        assert response.status_code == 400


class TestFeeCategoriesAPI:
    """Test Fee Categories API endpoints"""
    
    def test_create_aircraft_classification_success(self, client, auth_headers, test_fbo_id):
        """Test successful fee category creation"""
        category_data = {
            'name': 'Test Category'
        }
        
        response = client.post(
            f'/api/admin/fbo/{test_fbo_id}/fee-categories',
            headers=auth_headers['administrator'],
            json=category_data
        )
        
        assert response.status_code == 201
        data = response.get_json()
        assert data['name'] == 'Test Category'
        assert data['fbo_location_id'] == test_fbo_id
        assert 'id' in data
        assert 'created_at' in data
        assert 'updated_at' in data
    
    def test_create_aircraft_classification_missing_name(self, client, auth_headers, test_fbo_id):
        """Test fee category creation with missing name"""
        response = client.post(
            f'/api/admin/fbo/{test_fbo_id}/fee-categories',
            headers=auth_headers['administrator'],
            json={}
        )
        
        assert response.status_code == 400
    
    def test_create_aircraft_classification_duplicate_name(self, client, auth_headers, test_fbo_id, test_fee_categories):
        """Test fee category creation with duplicate name for same FBO"""
        category_data = {
            'name': test_fee_categories[0].name
        }
        
        response = client.post(
            f'/api/admin/fbo/{test_fbo_id}/fee-categories',
            headers=auth_headers['administrator'],
            json=category_data
        )
        
        assert response.status_code == 409
    
    def test_create_aircraft_classification_unauthorized(self, client, test_fbo_id):
        """Test unauthorized fee category creation"""
        response = client.post(
            f'/api/admin/fbo/{test_fbo_id}/fee-categories',
            json={'name': 'Test Category'}
        )
        
        assert response.status_code == 401
    
    def test_get_fee_categories_list_success(self, client, auth_headers, test_fbo_id, test_fee_categories):
        """Test successful retrieval of fee categories list"""
        response = client.get(
            f'/api/admin/fbo/{test_fbo_id}/fee-categories',
            headers=auth_headers['administrator']
        )
        
        assert response.status_code == 200
        data = response.get_json()
        assert 'fee_categories' in data
        assert len(data['fee_categories']) == len(test_fee_categories)
    
    def test_get_fee_categories_empty_list(self, client, auth_headers, test_fbo_id):
        """Test retrieval of empty fee categories list"""
        response = client.get(
            f'/api/admin/fbo/{test_fbo_id}/fee-categories',
            headers=auth_headers['administrator']
        )
        
        assert response.status_code == 200
        data = response.get_json()
        assert 'fee_categories' in data
        assert len(data['fee_categories']) == 0
    
    def test_get_fee_categories_scoped_by_fbo(self, client, auth_headers, db_session, test_fee_categories):
        """Test that fee categories are properly scoped by FBO"""
        # Create category for different FBO
        other_fbo_category = AircraftClassification(fbo_location_id=2, name='Other FBO Category')
        db_session.add(other_fbo_category)
        db_session.commit()
        
        response = client.get(
            f'/api/admin/fbo/1/fee-categories',
            headers=auth_headers['administrator']
        )
        
        assert response.status_code == 200
        data = response.get_json()
        # Should only return categories for FBO 1
        for category in data['fee_categories']:
            assert category['fbo_location_id'] == 1
    
    def test_get_aircraft_classification_single_success(self, client, auth_headers, test_fbo_id, test_fee_categories):
        """Test successful retrieval of single fee category"""
        category_id = test_fee_categories[0].id
        
        response = client.get(
            f'/api/admin/fbo/{test_fbo_id}/fee-categories/{category_id}',
            headers=auth_headers['administrator']
        )
        
        assert response.status_code == 200
        data = response.get_json()
        assert 'aircraft_classification' in data
        assert data['aircraft_classification']['id'] == category_id
    
    def test_get_aircraft_classification_not_found(self, client, auth_headers, test_fbo_id):
        """Test retrieval of non-existent fee category"""
        response = client.get(
            f'/api/admin/fbo/{test_fbo_id}/fee-categories/99999',
            headers=auth_headers['administrator']
        )
        
        assert response.status_code == 404
    
    def test_update_aircraft_classification_success(self, client, auth_headers, test_fbo_id, test_fee_categories):
        """Test successful fee category update"""
        category_id = test_fee_categories[0].id
        update_data = {
            'name': 'Updated Category Name'
        }
        
        response = client.put(
            f'/api/admin/fbo/{test_fbo_id}/fee-categories/{category_id}',
            headers=auth_headers['administrator'],
            json=update_data
        )
        
        assert response.status_code == 200
        data = response.get_json()
        assert data['aircraft_classification']['name'] == 'Updated Category Name'
    
    def test_update_aircraft_classification_duplicate_name(self, client, auth_headers, test_fbo_id, test_fee_categories):
        """Test updating fee category with duplicate name"""
        category_id = test_fee_categories[0].id
        update_data = {
            'name': test_fee_categories[1].name  # Use name of another category
        }
        
        response = client.put(
            f'/api/admin/fbo/{test_fbo_id}/fee-categories/{category_id}',
            headers=auth_headers['administrator'],
            json=update_data
        )
        
        assert response.status_code == 409
    
    def test_delete_aircraft_classification_success(self, client, auth_headers, test_fbo_id, db_session):
        """Test successful fee category deletion"""
        # Create a category without dependencies
        category = AircraftClassification(fbo_location_id=test_fbo_id, name='Delete Me')
        db_session.add(category)
        db_session.commit()
        
        response = client.delete(
            f'/api/admin/fbo/{test_fbo_id}/fee-categories/{category.id}',
            headers=auth_headers['administrator']
        )
        
        assert response.status_code == 204
    
    def test_delete_aircraft_classification_with_dependencies(self, client, auth_headers, test_fbo_id, test_fee_categories, test_fee_rules):
        """Test deletion of fee category with dependent fee rules"""
        category_id = test_fee_categories[0].id
        
        response = client.delete(
            f'/api/admin/fbo/{test_fbo_id}/fee-categories/{category_id}',
            headers=auth_headers['administrator']
        )
        
        assert response.status_code == 409
    
    def test_delete_aircraft_classification_not_found(self, client, auth_headers, test_fbo_id):
        """Test deletion of non-existent fee category"""
        response = client.delete(
            f'/api/admin/fbo/{test_fbo_id}/fee-categories/99999',
            headers=auth_headers['administrator']
        )
        
        assert response.status_code == 404


class TestFeeRulesAPI:
    """Test Fee Rules API endpoints"""
    
    def test_create_fee_rule_success(self, client, auth_headers, test_fbo_id, test_fee_categories):
        """Test successful fee rule creation"""
        rule_data = {
            'fee_name': 'Test Fee',
            'fee_code': 'TEST',
            'applies_to_aircraft_classification_id': test_fee_categories[0].id,
            'amount': 25.50,
            'is_potentially_waivable_by_fuel_uplift': True,
            'calculation_basis': 'FIXED_PRICE',
            'waiver_strategy': 'SIMPLE_MULTIPLIER',
            'simple_waiver_multiplier': 1.5
        }
        
        response = client.post(
            f'/api/admin/fbo/{test_fbo_id}/fee-rules',
            headers=auth_headers['administrator'],
            json=rule_data
        )
        
        assert response.status_code == 201
        data = response.get_json()
        assert 'fee_rule' in data
        assert data['fee_rule']['fee_name'] == 'Test Fee'
        assert data['fee_rule']['fee_code'] == 'TEST'
        assert data['fee_rule']['fbo_location_id'] == test_fbo_id
    
    def test_create_fee_rule_with_caa_overrides(self, client, auth_headers, test_fbo_id, test_fee_categories):
        """Test fee rule creation with CAA overrides"""
        rule_data = {
            'fee_name': 'CAA Test Fee',
            'fee_code': 'CAA_TEST',
            'applies_to_aircraft_classification_id': test_fee_categories[0].id,
            'amount': 50.00,
            'has_caa_override': True,
            'caa_override_amount': 30.00,
            'caa_waiver_strategy_override': 'SIMPLE_MULTIPLIER',
            'caa_simple_waiver_multiplier_override': 2.0
        }
        
        response = client.post(
            f'/api/admin/fbo/{test_fbo_id}/fee-rules',
            headers=auth_headers['administrator'],
            json=rule_data
        )
        
        assert response.status_code == 201
        data = response.get_json()
        assert data['fee_rule']['has_caa_override'] == True
        assert data['fee_rule']['caa_override_amount'] == 30.0
    
    def test_create_fee_rule_missing_required_fields(self, client, auth_headers, test_fbo_id):
        """Test fee rule creation with missing required fields"""
        response = client.post(
            f'/api/admin/fbo/{test_fbo_id}/fee-rules',
            headers=auth_headers['administrator'],
            json={'fee_name': 'Incomplete Rule'}
        )
        
        assert response.status_code == 400
    
    def test_create_fee_rule_duplicate_fee_code(self, client, auth_headers, test_fbo_id, test_fee_rules, test_fee_categories):
        """Test fee rule creation with duplicate fee code for same FBO"""
        rule_data = {
            'fee_name': 'Duplicate Code Rule',
            'fee_code': test_fee_rules[0].fee_code,
            'applies_to_aircraft_classification_id': test_fee_categories[0].id,
            'amount': 25.00
        }
        
        response = client.post(
            f'/api/admin/fbo/{test_fbo_id}/fee-rules',
            headers=auth_headers['administrator'],
            json=rule_data
        )
        
        assert response.status_code == 409
    
    def test_create_fee_rule_invalid_aircraft_classification(self, client, auth_headers, test_fbo_id):
        """Test fee rule creation with non-existent fee category"""
        rule_data = {
            'fee_name': 'Invalid Category Rule',
            'fee_code': 'INVALID',
            'applies_to_aircraft_classification_id': 99999,
            'amount': 25.00
        }
        
        response = client.post(
            f'/api/admin/fbo/{test_fbo_id}/fee-rules',
            headers=auth_headers['administrator'],
            json=rule_data
        )

        # Should be 409 because it's a business logic error (invalid fee category)
        assert response.status_code == 409
    
    def test_get_fee_rules_list_success(self, client, auth_headers, test_fbo_id, test_fee_rules):
        """Test successful retrieval of fee rules list"""
        response = client.get(
            f'/api/admin/fbo/{test_fbo_id}/fee-rules',
            headers=auth_headers['administrator']
        )
        
        assert response.status_code == 200
        data = response.get_json()
        assert 'fee_rules' in data
        assert len(data['fee_rules']) == len(test_fee_rules)
    
    def test_get_fee_rule_single_success(self, client, auth_headers, test_fbo_id, test_fee_rules):
        """Test successful retrieval of single fee rule"""
        rule_id = test_fee_rules[0].id
        
        response = client.get(
            f'/api/admin/fbo/{test_fbo_id}/fee-rules/{rule_id}',
            headers=auth_headers['administrator']
        )
        
        assert response.status_code == 200
        data = response.get_json()
        assert 'fee_rule' in data
        assert data['fee_rule']['id'] == rule_id
    
    def test_update_fee_rule_success(self, client, auth_headers, test_fbo_id, test_fee_rules):
        """Test successful fee rule update"""
        rule_id = test_fee_rules[0].id
        update_data = {
            'fee_name': 'Updated Fee Name',
            'amount': 75.00
        }
        
        response = client.put(
            f'/api/admin/fbo/{test_fbo_id}/fee-rules/{rule_id}',
            headers=auth_headers['administrator'],
            json=update_data
        )
        
        assert response.status_code == 200
        data = response.get_json()
        assert data['fee_rule']['fee_name'] == 'Updated Fee Name'
        assert data['fee_rule']['amount'] == 75.0
    
    def test_delete_fee_rule_success(self, client, auth_headers, test_fbo_id, test_fee_rules):
        """Test successful fee rule deletion"""
        rule_id = test_fee_rules[0].id
        
        response = client.delete(
            f'/api/admin/fbo/{test_fbo_id}/fee-rules/{rule_id}',
            headers=auth_headers['administrator']
        )
        
        assert response.status_code == 204


class TestAircraftTypeMappingsAPI:
    """Test Aircraft Type to Fee Category Mappings API endpoints"""
    
    def test_create_mapping_success(self, client, auth_headers, test_fbo_id, test_aircraft_types, test_fee_categories):
        """Test successful aircraft type mapping creation"""
        mapping_data = {
            'aircraft_type_id': test_aircraft_types[0].id,
            'aircraft_classification_id': test_fee_categories[0].id
        }
        
        response = client.post(
            f'/api/admin/fbo/{test_fbo_id}/aircraft-type-mappings',
            headers=auth_headers['administrator'],
            json=mapping_data
        )
        
        assert response.status_code == 201
        data = response.get_json()
        # Response contains the mapping data directly
        assert data['aircraft_type_id'] == test_aircraft_types[0].id
        assert data['aircraft_classification_id'] == test_fee_categories[0].id
    
    def test_create_mapping_duplicate(self, client, auth_headers, test_fbo_id, test_aircraft_types, test_fee_categories, db_session):
        """Test creation of duplicate aircraft type mapping for same FBO"""
        # Create initial mapping
        mapping = AircraftTypeToAircraftClassificationMapping(
            fbo_location_id=test_fbo_id,
            aircraft_type_id=test_aircraft_types[0].id,
            aircraft_classification_id=test_fee_categories[0].id
        )
        db_session.add(mapping)
        db_session.commit()
        
        # Try to create duplicate
        mapping_data = {
            'aircraft_type_id': test_aircraft_types[0].id,
            'aircraft_classification_id': test_fee_categories[1].id
        }
        
        response = client.post(
            f'/api/admin/fbo/{test_fbo_id}/aircraft-type-mappings',
            headers=auth_headers['administrator'],
            json=mapping_data
        )
        
        assert response.status_code == 409
    
    def test_csv_upload_success(self, client, auth_headers, test_fbo_id, test_aircraft_types, test_fee_categories):
        """Test successful CSV upload for aircraft type mappings"""
        csv_content = (
            "AircraftModel,AircraftManufacturer,AircraftClassificationName\n"
            f"{test_aircraft_types[0].name},Cessna,{test_fee_categories[0].name}\n"
            f"{test_aircraft_types[1].name},Gulfstream,{test_fee_categories[1].name}\n"
        )
        
        csv_file = io.BytesIO(csv_content.encode('utf-8'))
        csv_file.name = 'mappings.csv'
        
        response = client.post(
            f'/api/admin/fbo/{test_fbo_id}/aircraft-type-mappings/upload-csv',
            headers=auth_headers['administrator'],
            data={'file': (csv_file, 'mappings.csv')},
            content_type='multipart/form-data'
        )
        
        assert response.status_code == 200
        data = response.get_json()
        # Service returns {created: X, updated: X, errors: []}
        assert data['created'] == 2
        assert data['updated'] == 0  
        assert len(data['errors']) == 0
    
    def test_csv_upload_invalid_format(self, client, auth_headers, test_fbo_id):
        """Test CSV upload with invalid format"""
        csv_content = "InvalidHeader1,InvalidHeader2\nValue1,Value2\n"
        csv_file = io.BytesIO(csv_content.encode('utf-8'))
        csv_file.name = 'invalid.csv'
        
        response = client.post(
            f'/api/admin/fbo/{test_fbo_id}/aircraft-type-mappings/upload-csv',
            headers=auth_headers['administrator'],
            data={'file': (csv_file, 'invalid.csv')},
            content_type='multipart/form-data'
        )
        
        assert response.status_code == 400
    
    def test_csv_upload_nonexistent_category(self, client, auth_headers, test_fbo_id, test_aircraft_types):
        """Test CSV upload with non-existent fee category"""
        csv_content = (
            "AircraftModel,AircraftManufacturer,AircraftClassificationName\n"
            f"{test_aircraft_types[0].name},Cessna,NonExistentCategory\n"
        )
        
        csv_file = io.BytesIO(csv_content.encode('utf-8'))
        csv_file.name = 'mappings.csv'
        
        response = client.post(
            f'/api/admin/fbo/{test_fbo_id}/aircraft-type-mappings/upload-csv',
            headers=auth_headers['administrator'],
            data={'file': (csv_file, 'mappings.csv')},
            content_type='multipart/form-data'
        )
        
        assert response.status_code == 200
        data = response.get_json()
        # Service returns {created: X, updated: X, errors: [...]}
        assert data['created'] == 0
        assert data['updated'] == 0
        assert len(data['errors']) == 1


class TestWaiverTiersAPI:
    """Test Waiver Tiers API endpoints"""
    
    def test_create_waiver_tier_success(self, client, auth_headers, test_fbo_id):
        """Test successful waiver tier creation"""
        tier_data = {
            'name': 'Test Tier',
            'fuel_uplift_multiplier': 2.5,
            'fees_waived_codes': ['RAMP', 'OVERNIGHT'],
            'tier_priority': 3,
            'is_caa_specific_tier': False
        }
        
        response = client.post(
            f'/api/admin/fbo/{test_fbo_id}/waiver-tiers',
            headers=auth_headers['administrator'],
            json=tier_data
        )
        
        assert response.status_code == 201
        data = response.get_json()
        assert 'waiver_tier' in data
        assert data['waiver_tier']['name'] == 'Test Tier'
        assert data['waiver_tier']['tier_priority'] == 3
    
    def test_create_waiver_tier_caa_specific(self, client, auth_headers, test_fbo_id):
        """Test creation of CAA-specific waiver tier"""
        tier_data = {
            'name': 'CAA Gold Tier',
            'fuel_uplift_multiplier': 1.0,
            'fees_waived_codes': ['RAMP'],
            'tier_priority': 5,
            'is_caa_specific_tier': True
        }
        
        response = client.post(
            f'/api/admin/fbo/{test_fbo_id}/waiver-tiers',
            headers=auth_headers['administrator'],
            json=tier_data
        )
        
        assert response.status_code == 201
        data = response.get_json()
        assert data['waiver_tier']['is_caa_specific_tier'] == True
    
    def test_create_waiver_tier_missing_fields(self, client, auth_headers, test_fbo_id):
        """Test waiver tier creation with missing required fields"""
        response = client.post(
            f'/api/admin/fbo/{test_fbo_id}/waiver-tiers',
            headers=auth_headers['administrator'],
            json={'name': 'Incomplete Tier'}
        )
        
        assert response.status_code == 400
    
    def test_get_waiver_tiers_list_success(self, client, auth_headers, test_fbo_id, test_waiver_tiers):
        """Test successful retrieval of waiver tiers list"""
        response = client.get(
            f'/api/admin/fbo/{test_fbo_id}/waiver-tiers',
            headers=auth_headers['administrator']
        )
        
        assert response.status_code == 200
        data = response.get_json()
        assert 'waiver_tiers' in data
        assert len(data['waiver_tiers']) == len(test_waiver_tiers)
        
        # Verify they're sorted by priority
        priorities = [tier['tier_priority'] for tier in data['waiver_tiers']]
        assert priorities == sorted(priorities, reverse=True)  # Descending order
    
    def test_get_waiver_tier_single_success(self, client, auth_headers, test_fbo_id, test_waiver_tiers):
        """Test successful retrieval of single waiver tier"""
        tier_id = test_waiver_tiers[0].id
        
        response = client.get(
            f'/api/admin/fbo/{test_fbo_id}/waiver-tiers/{tier_id}',
            headers=auth_headers['administrator']
        )
        
        assert response.status_code == 200
        data = response.get_json()
        assert 'waiver_tier' in data
        assert data['waiver_tier']['id'] == tier_id
    
    def test_update_waiver_tier_success(self, client, auth_headers, test_fbo_id, test_waiver_tiers):
        """Test successful waiver tier update"""
        tier_id = test_waiver_tiers[0].id
        update_data = {
            'name': 'Updated Tier Name',
            'tier_priority': 10
        }
        
        response = client.put(
            f'/api/admin/fbo/{test_fbo_id}/waiver-tiers/{tier_id}',
            headers=auth_headers['administrator'],
            json=update_data
        )
        
        assert response.status_code == 200
        data = response.get_json()
        assert data['waiver_tier']['name'] == 'Updated Tier Name'
        assert data['waiver_tier']['tier_priority'] == 10
    
    def test_delete_waiver_tier_success(self, client, auth_headers, test_fbo_id, test_waiver_tiers):
        """Test successful waiver tier deletion"""
        tier_id = test_waiver_tiers[0].id
        
        response = client.delete(
            f'/api/admin/fbo/{test_fbo_id}/waiver-tiers/{tier_id}',
            headers=auth_headers['administrator']
        )
        
        assert response.status_code == 204


class TestFeeConfigPermissions:
    """Test authorization and permission requirements"""
    
    def test_all_endpoints_require_auth(self, client, test_fbo_id):
        """Test that all fee config endpoints require authentication"""
        endpoints = [
            f'/api/admin/fbo/{test_fbo_id}/aircraft-types',
            f'/api/admin/fbo/{test_fbo_id}/fee-categories',
            f'/api/admin/fbo/{test_fbo_id}/fee-rules',
            f'/api/admin/fbo/{test_fbo_id}/aircraft-type-mappings',
            f'/api/admin/fbo/{test_fbo_id}/waiver-tiers'
        ]
        
        for endpoint in endpoints:
            response = client.get(endpoint)
            assert response.status_code == 401
    
    def test_admin_user_has_access(self, client, auth_headers, test_fbo_id):
        """Test that admin users can access fee configuration endpoints"""
        response = client.get(
            f'/api/admin/fbo/{test_fbo_id}/fee-categories',
            headers=auth_headers['administrator']
        )
        
        assert response.status_code == 200


class TestFeeConfigErrorHandling:
    """Test error handling and edge cases"""
    
    def test_invalid_fbo_id_parameter(self, client, auth_headers):
        """Test endpoints with invalid FBO ID parameter"""
        response = client.get(
            '/api/admin/fbo/invalid/fee-categories',
            headers=auth_headers['administrator']
        )
        
        assert response.status_code == 404
    
    def test_malformed_json_request(self, client, auth_headers, test_fbo_id):
        """Test endpoints with malformed JSON"""
        response = client.post(
            f'/api/admin/fbo/{test_fbo_id}/fee-categories',
            headers=auth_headers['administrator'],
            data='{"invalid": json',
            content_type='application/json'
        )
        
        assert response.status_code == 400
    
    def test_database_constraint_violations(self, client, auth_headers, test_fbo_id, test_fee_categories, db_session):
        """Test handling of database constraint violations"""
        # Test unique constraint violation (should be handled gracefully)
        category_data = {
            'name': test_fee_categories[0].name
        }
        
        response = client.post(
            f'/api/admin/fbo/{test_fbo_id}/fee-categories',
            headers=auth_headers['administrator'],
            json=category_data
        )
        
        assert response.status_code == 409
        data = response.get_json()
        assert 'error' in data


class TestUpdateOrCreateMappingByType:
    """Test the update_or_create_mapping_by_type service method"""
    
    def test_update_aircraft_type_classification_success(self, db_session, test_aircraft_types, test_aircraft_classifications):
        """Test successfully updating an aircraft type's classification"""
        # Arrange
        aircraft_type = test_aircraft_types[0]  # Cessna 172 (currently Piston)
        new_classification = test_aircraft_classifications[1]  # Light Jet
        original_classification_id = aircraft_type.classification_id
        
        # Act
        result = AdminFeeConfigService.update_or_create_mapping_by_type(
            aircraft_type_id=aircraft_type.id,
            classification_id=new_classification.id
        )
        
        # Assert
        assert result is not None
        assert result['aircraft_type_id'] == aircraft_type.id
        assert result['aircraft_type_name'] == aircraft_type.name
        assert result['classification_id'] == new_classification.id
        assert result['classification_name'] == new_classification.name
        assert result['classification_id'] != original_classification_id
        
        # Verify the database was updated
        db_session.refresh(aircraft_type)
        assert aircraft_type.classification_id == new_classification.id
    
    def test_update_aircraft_type_classification_nonexistent_aircraft_type(self, db_session, test_aircraft_classifications):
        """Test updating classification for non-existent aircraft type"""
        # Act & Assert
        with pytest.raises(ValueError, match="Aircraft type not found"):
            AdminFeeConfigService.update_or_create_mapping_by_type(
                aircraft_type_id=99999,
                classification_id=test_aircraft_classifications[0].id
            )
    
    def test_update_aircraft_type_classification_nonexistent_classification(self, db_session, test_aircraft_types):
        """Test updating with non-existent classification"""
        # Act & Assert
        with pytest.raises(ValueError, match="Aircraft classification not found"):
            AdminFeeConfigService.update_or_create_mapping_by_type(
                aircraft_type_id=test_aircraft_types[0].id,
                classification_id=99999
            )
    
    def test_update_aircraft_type_classification_with_eager_loading(self, db_session, test_aircraft_types, test_aircraft_classifications):
        """Test that the service method returns eagerly loaded relationships"""
        # Arrange
        aircraft_type = test_aircraft_types[0]
        new_classification = test_aircraft_classifications[1]
        
        # Act
        result = AdminFeeConfigService.update_or_create_mapping_by_type(
            aircraft_type_id=aircraft_type.id,
            classification_id=new_classification.id
        )
        
        # Assert - verify that relationship data is included without additional queries
        assert 'aircraft_type_name' in result
        assert 'classification_name' in result
        assert result['aircraft_type_name'] == aircraft_type.name
        assert result['classification_name'] == new_classification.name


class TestUpdateOrCreateMappingByTypeAPI:
    """Test the API endpoint for updating aircraft type classifications"""
    
    def test_update_aircraft_classification_mapping_success(self, client, auth_headers, test_fbo_id, test_aircraft_types, test_aircraft_classifications):
        """Test successful API call to update aircraft type classification"""
        # Arrange
        aircraft_type = test_aircraft_types[0]  # Cessna 172 (currently Piston)
        new_classification = test_aircraft_classifications[1]  # Light Jet
        
        request_data = {
            'classification_id': new_classification.id
        }
        
        # Act
        response = client.put(
            f'/api/admin/fbo/{test_fbo_id}/aircraft-classification-mappings/by-type/{aircraft_type.id}',
            headers=auth_headers['administrator'],
            json=request_data
        )
        
        # Assert
        assert response.status_code == 200
        data = response.get_json()
        assert 'mapping' in data
        assert data['mapping']['aircraft_type_id'] == aircraft_type.id
        assert data['mapping']['classification_id'] == new_classification.id
    
    def test_update_aircraft_classification_mapping_invalid_aircraft_type(self, client, auth_headers, test_fbo_id, test_aircraft_classifications):
        """Test API call with invalid aircraft type ID"""
        # Arrange
        request_data = {
            'classification_id': test_aircraft_classifications[0].id
        }
        
        # Act
        response = client.put(
            f'/api/admin/fbo/{test_fbo_id}/aircraft-classification-mappings/by-type/99999',
            headers=auth_headers['administrator'],
            json=request_data
        )
        
        # Assert
        assert response.status_code == 404
        data = response.get_json()
        assert 'error' in data
    
    def test_update_aircraft_classification_mapping_invalid_classification(self, client, auth_headers, test_fbo_id, test_aircraft_types):
        """Test API call with invalid classification ID"""
        # Arrange
        aircraft_type = test_aircraft_types[0]
        request_data = {
            'classification_id': 99999
        }
        
        # Act
        response = client.put(
            f'/api/admin/fbo/{test_fbo_id}/aircraft-classification-mappings/by-type/{aircraft_type.id}',
            headers=auth_headers['administrator'],
            json=request_data
        )
        
        # Assert
        assert response.status_code == 400
        data = response.get_json()
        assert 'error' in data
    
    def test_update_aircraft_classification_mapping_requires_permission(self, client, auth_headers, test_fbo_id, test_aircraft_types, test_aircraft_classifications):
        """Test that the endpoint requires proper permissions"""
        # Arrange
        aircraft_type = test_aircraft_types[0]
        request_data = {
            'classification_id': test_aircraft_classifications[1].id
        }
        
        # Act - try with LST permissions (should fail)
        response = client.put(
            f'/api/admin/fbo/{test_fbo_id}/aircraft-classification-mappings/by-type/{aircraft_type.id}',
            headers=auth_headers['line'],
            json=request_data
        )
        
        # Assert
        assert response.status_code == 403 