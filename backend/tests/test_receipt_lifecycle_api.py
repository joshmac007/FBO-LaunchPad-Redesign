import pytest
import json
from decimal import Decimal
from datetime import datetime

from src.models.customer import Customer
from src.models.aircraft import Aircraft
from src.models.fuel_order import FuelOrder, FuelOrderStatus
from src.models.receipt import Receipt, ReceiptStatus
from src.models.receipt_line_item import ReceiptLineItem
from src.models.aircraft_type import AircraftType
from src.models.aircraft_classification import AircraftClassification
# from src.models.aircraft_type_aircraft_classification_mapping import AircraftTypeToAircraftClassificationMapping
from src.models.fee_rule import FeeRule, WaiverStrategy, CalculationBasis
from src.models.waiver_tier import WaiverTier
from src.extensions import db


@pytest.fixture(scope='function')
def setup_fbo_fee_configuration(app, db):
    """Comprehensive test fixture that populates the test database with sample FBO configuration."""
    
    with app.app_context():
        # Clean up any existing data - order matters due to foreign key constraints
        from src.models.receipt import Receipt
        from src.models.receipt_line_item import ReceiptLineItem
        from src.models.fuel_order import FuelOrder
        from src.models.aircraft import Aircraft
        
        db.session.query(ReceiptLineItem).delete()
        db.session.query(Receipt).delete()
        db.session.query(FuelOrder).delete()
        db.session.query(Aircraft).delete()
        db.session.query(WaiverTier).delete()
        db.session.query(FeeRule).delete()
        db.session.query(AircraftTypeToAircraftClassificationMapping).delete()
        db.session.query(AircraftClassification).delete()
        db.session.query(AircraftType).delete()
        db.session.query(Customer).delete()
        db.session.commit()
        
        # Create Aircraft Types with different fuel waiver requirements
        light_jet = AircraftType(
            name="Citation CJ3",
            base_min_fuel_gallons_for_waiver=Decimal('150.00'),
            default_aircraft_classification_id=None,
            default_max_gross_weight_lbs=Decimal('13500.00')
        )
        piston_single = AircraftType(
            name="Cessna 172",
            base_min_fuel_gallons_for_waiver=Decimal('30.00'),
            default_aircraft_classification_id=None,
            default_max_gross_weight_lbs=Decimal('2550.00')
        )
        
        db.session.add_all([light_jet, piston_single])
        db.session.commit()
        
        # Create Fee Categories
        light_jet_category = AircraftClassification(
            fbo_location_id=1,
            name="Light Jet"
        )
        piston_category = AircraftClassification(
            fbo_location_id=1,
            name="Piston Single"
        )
        
        db.session.add_all([light_jet_category, piston_category])
        db.session.commit()
        
        # Create Aircraft Type to Fee Category Mappings
        light_jet_mapping = AircraftTypeToAircraftClassificationMapping(
            fbo_location_id=1,
            aircraft_type_id=light_jet.id,
            aircraft_classification_id=light_jet_category.id
        )
        piston_mapping = AircraftTypeToAircraftClassificationMapping(
            fbo_location_id=1,
            aircraft_type_id=piston_single.id,
            aircraft_classification_id=piston_category.id
        )
        
        db.session.add_all([light_jet_mapping, piston_mapping])
        db.session.commit()
        
        # Create Fee Rules for Light Jet category
        ramp_fee_lj = FeeRule(
            fbo_location_id=1,
            fee_name="Ramp Fee",
            fee_code="RAMP_LJ",
            applies_to_aircraft_classification_id=light_jet_category.id,
            amount=Decimal('75.00'),
            currency="USD",
            is_taxable=True,
            is_potentially_waivable_by_fuel_uplift=True,
            calculation_basis=CalculationBasis.NOT_APPLICABLE,
            waiver_strategy=WaiverStrategy.TIERED_MULTIPLIER,
            has_caa_override=True,
            caa_override_amount=Decimal('60.00'),
            caa_waiver_strategy_override=WaiverStrategy.TIERED_MULTIPLIER
        )
        
        overnight_fee_lj = FeeRule(
            fbo_location_id=1,
            fee_name="Overnight Fee",
            fee_code="OVN_LJ",
            applies_to_aircraft_classification_id=light_jet_category.id,
            amount=Decimal('50.00'),
            currency="USD",
            is_taxable=True,
            is_potentially_waivable_by_fuel_uplift=True,
            calculation_basis=CalculationBasis.NOT_APPLICABLE,
            waiver_strategy=WaiverStrategy.TIERED_MULTIPLIER,
            has_caa_override=False
        )
        
        gpu_service = FeeRule(
            fbo_location_id=1,
            fee_name="GPU Service",
            fee_code="GPU",
            applies_to_aircraft_classification_id=light_jet_category.id,
            amount=Decimal('25.00'),
            currency="USD",
            is_taxable=True,
            is_potentially_waivable_by_fuel_uplift=False,
            calculation_basis=CalculationBasis.FIXED_PRICE,
            waiver_strategy=WaiverStrategy.NONE
        )
        
        lavatory_service = FeeRule(
            fbo_location_id=1,
            fee_name="Lavatory Service",
            fee_code="LAV",
            applies_to_aircraft_classification_id=light_jet_category.id,
            amount=Decimal('35.00'),
            currency="USD",
            is_taxable=True,
            is_potentially_waivable_by_fuel_uplift=True,
            calculation_basis=CalculationBasis.FIXED_PRICE,
            waiver_strategy=WaiverStrategy.SIMPLE_MULTIPLIER,
            simple_waiver_multiplier=Decimal('1.0'),
            has_caa_override=True,
            caa_override_amount=Decimal('30.00'),
            caa_waiver_strategy_override=WaiverStrategy.SIMPLE_MULTIPLIER,
            caa_simple_waiver_multiplier_override=Decimal('0.8')
        )
        
        db.session.add_all([ramp_fee_lj, overnight_fee_lj, gpu_service, lavatory_service])
        db.session.commit()
        
        # Create Waiver Tiers
        tier_1x = WaiverTier(
            fbo_location_id=1,
            name="Basic Tier",
            fuel_uplift_multiplier=Decimal('1.0'),
            fees_waived_codes=['RAMP_LJ'],
            tier_priority=1,
            is_caa_specific_tier=False
        )
        
        tier_2x = WaiverTier(
            fbo_location_id=1,
            name="Premium Tier",
            fuel_uplift_multiplier=Decimal('2.0'),
            fees_waived_codes=['RAMP_LJ', 'OVN_LJ'],
            tier_priority=2,
            is_caa_specific_tier=False
        )
        
        db.session.add_all([tier_1x, tier_2x])
        db.session.commit()
        
        # Create Customers
        regular_customer = Customer(
            name="John Smith",
            email="john.smith@example.com",
            phone="555-1234",
            is_placeholder=False,
            is_caa_member=False
        )
        
        caa_customer = Customer(
            name="Jane Doe",
            email="jane.doe@example.com",
            phone="555-5678",
            is_placeholder=False,
            is_caa_member=True,
            caa_member_id="CAA123456"
        )
        
        db.session.add_all([regular_customer, caa_customer])
        db.session.commit()
        
        return {
            'aircraft_types': {'light_jet': light_jet.id, 'piston_single': piston_single.id},
            'fee_categories': {'light_jet': light_jet_category.id, 'piston': piston_category.id},
            'customers': {'regular': regular_customer.id, 'caa': caa_customer.id},
            'fee_rules': {
                'ramp_fee_lj': ramp_fee_lj.id,
                'overnight_fee_lj': overnight_fee_lj.id,
                'gpu_service': gpu_service.id,
                'lavatory_service': lavatory_service.id
            },
            'waiver_tiers': {'tier_1x': tier_1x.id, 'tier_2x': tier_2x.id}
        }


@pytest.fixture(scope='function')
def test_completed_fuel_order(app, db, test_csr_user, test_lst_user, setup_fbo_fee_configuration):
    """Create a completed fuel order that can be used as the basis for receipt creation."""
    
    fixture_data = setup_fbo_fee_configuration
    
    with app.app_context():
        # Create aircraft with proper aircraft type
        test_aircraft = Aircraft(
            tail_number="N123AB",
            aircraft_type="Citation CJ3",
            fuel_type="Jet A"
        )
        db.session.add(test_aircraft)
        db.session.commit()
        
        # Create a completed fuel order with customer
        fuel_order = FuelOrder(
            tail_number=test_aircraft.tail_number,
            customer_id=fixture_data['customers']['regular'],
            fuel_type="Jet A",
            requested_amount=Decimal('200.00'),
            assigned_lst_user_id=test_lst_user.id,
            status=FuelOrderStatus.COMPLETED,
            start_meter_reading=Decimal('1000.00'),
            end_meter_reading=Decimal('1200.00'),  # 200 gallons dispensed
            completion_timestamp=datetime.utcnow(),
            csr_notes="Test fuel order for receipt",
            lst_notes="Fuel dispensed successfully"
        )
        db.session.add(fuel_order)
        db.session.commit()
        
        # Refresh to ensure it stays bound to the session
        db.session.refresh(fuel_order)
        return fuel_order


@pytest.fixture(scope='function')
def test_completed_fuel_order_no_customer(app, db, test_csr_user, test_lst_user, setup_fbo_fee_configuration):
    """Create a completed fuel order with no customer (for placeholder customer testing)."""
    
    fixture_data = setup_fbo_fee_configuration
    
    with app.app_context():
        # Create aircraft with proper aircraft type
        test_aircraft_no_customer = Aircraft(
            tail_number="N456CD",
            aircraft_type="Citation CJ3",
            fuel_type="Jet A"
        )
        db.session.add(test_aircraft_no_customer)
        db.session.commit()
        
        # Create a completed fuel order WITHOUT customer
        fuel_order = FuelOrder(
            tail_number=test_aircraft_no_customer.tail_number,
            customer_id=None,  # No customer linked
            fuel_type="Jet A",
            requested_amount=Decimal('150.00'),
            assigned_lst_user_id=test_lst_user.id,
            status=FuelOrderStatus.COMPLETED,
            start_meter_reading=Decimal('2000.00'),
            end_meter_reading=Decimal('2150.00'),  # 150 gallons dispensed
            completion_timestamp=datetime.utcnow(),
            csr_notes="Test fuel order without customer",
            lst_notes="Fuel dispensed successfully"
        )
        db.session.add(fuel_order)
        db.session.commit()
        
        # Refresh to ensure it stays bound to the session
        db.session.refresh(fuel_order)
        return fuel_order


class TestReceiptLifecycleAPI:
    """Test suite for Receipt Lifecycle Management APIs."""
    
    # Test Setup: Authorization helpers
    def get_csr_headers(self, auth_headers):
        """Get CSR authorization headers."""
        return auth_headers.get('customer', {})  # CSR user from conftest
    
    def get_admin_headers(self, auth_headers):
        """Get admin authorization headers."""
        return auth_headers.get('admin', {})
    
    # Phase 4.1.2: Draft Creation Endpoint Tests
    def test_create_draft_receipt_success(self, client, auth_headers, test_completed_fuel_order, setup_fbo_fee_configuration):
        """Test successful draft creation from a valid fuel_order_id."""
        
        headers = self.get_csr_headers(auth_headers)
        fbo_id = 1
        fuel_order_id = test_completed_fuel_order.id
        
        response = client.post(
            f'/api/fbo/{fbo_id}/receipts/draft',
            json={'fuel_order_id': fuel_order_id},
            headers=headers
        )
        
        assert response.status_code == 201
        
        data = response.get_json()
        assert 'receipt' in data
        receipt = data['receipt']
        
        # Verify receipt structure
        assert receipt['status'] == 'DRAFT'
        assert receipt['fbo_location_id'] == fbo_id
        assert receipt['fuel_order_id'] == fuel_order_id
        assert receipt['customer_id'] == test_completed_fuel_order.customer_id
        assert receipt['aircraft_type_at_receipt_time'] == 'Citation CJ3'
        assert receipt['fuel_type_at_receipt_time'] == 'Jet A'
        assert receipt['fuel_quantity_gallons_at_receipt_time'] == '200.00'
        
        # Verify database record created
        with client.application.app_context():
            receipt_record = Receipt.query.get(receipt['id'])
            assert receipt_record is not None
            assert receipt_record.status == ReceiptStatus.DRAFT
    
    def test_create_draft_receipt_placeholder_customer(self, client, auth_headers, test_completed_fuel_order_no_customer, setup_fbo_fee_configuration):
        """Test creating a draft from a FuelOrder with null customer_id - should create placeholder customer."""
        
        headers = self.get_csr_headers(auth_headers)
        fbo_id = 1
        fuel_order_id = test_completed_fuel_order_no_customer.id
        
        response = client.post(
            f'/api/fbo/{fbo_id}/receipts/draft',
            json={'fuel_order_id': fuel_order_id},
            headers=headers
        )
        
        assert response.status_code == 201
        
        data = response.get_json()
        receipt = data['receipt']
        
        # Verify placeholder customer was created
        assert receipt['customer_id'] is not None
        
        with client.application.app_context():
            # Check that a placeholder customer was created
            customer = Customer.query.get(receipt['customer_id'])
            assert customer is not None
            assert customer.is_placeholder is True
            assert customer.name == test_completed_fuel_order_no_customer.tail_number  # Tail number as name
    
    def test_create_draft_receipt_nonexistent_fuel_order(self, client, auth_headers, setup_fbo_fee_configuration):
        """Test creating a draft for a non-existent fuel_order_id."""
        
        headers = self.get_csr_headers(auth_headers)
        fbo_id = 1
        
        response = client.post(
            f'/api/fbo/{fbo_id}/receipts/draft',
            json={'fuel_order_id': 99999},  # Non-existent ID
            headers=headers
        )
        
        assert response.status_code == 404
        
        data = response.get_json()
        assert 'error' in data
    
    def test_create_draft_receipt_already_has_receipt(self, client, auth_headers, test_completed_fuel_order, setup_fbo_fee_configuration):
        """Test creating a draft for a FuelOrder that already has a receipt."""
        
        headers = self.get_csr_headers(auth_headers)
        fbo_id = 1
        fuel_order_id = test_completed_fuel_order.id
        
        # First create a receipt
        response1 = client.post(
            f'/api/fbo/{fbo_id}/receipts/draft',
            json={'fuel_order_id': fuel_order_id},
            headers=headers
        )
        assert response1.status_code == 201
        
        # Try to create another receipt for the same fuel order
        response2 = client.post(
            f'/api/fbo/{fbo_id}/receipts/draft',
            json={'fuel_order_id': fuel_order_id},
            headers=headers
        )
        
        assert response2.status_code == 409  # Conflict
        
        data = response2.get_json()
        assert 'error' in data
    
    # Phase 4.1.3: Draft Update Endpoint Tests
    def test_update_draft_receipt_success(self, client, auth_headers, test_completed_fuel_order, setup_fbo_fee_configuration):
        """Test successfully updating a draft receipt's editable fields."""
        
        headers = self.get_csr_headers(auth_headers)
        fbo_id = 1
        fuel_order_id = test_completed_fuel_order.id
        
        # Create draft receipt first
        create_response = client.post(
            f'/api/fbo/{fbo_id}/receipts/draft',
            json={'fuel_order_id': fuel_order_id},
            headers=headers
        )
        assert create_response.status_code == 201
        receipt_id = create_response.get_json()['receipt']['id']
        
        # Update the draft
        update_data = {
            'customer_id': setup_fbo_fee_configuration['customers']['caa'],  # Change to CAA customer
            'additional_services': [
                {'fee_code': 'GPU', 'quantity': 1},
                {'fee_code': 'LAV', 'quantity': 1}
            ]
        }
        
        response = client.put(
            f'/api/fbo/{fbo_id}/receipts/{receipt_id}/draft',
            json=update_data,
            headers=headers
        )
        
        assert response.status_code == 200
        
        data = response.get_json()
        receipt = data['receipt']
        
        # Verify updates were applied
        assert receipt['customer_id'] == setup_fbo_fee_configuration['customers']['caa']
        
        # Verify database record updated
        with client.application.app_context():
            receipt_record = Receipt.query.get(receipt_id)
            assert receipt_record.customer_id == setup_fbo_fee_configuration['customers']['caa']
    
    def test_update_non_draft_receipt_forbidden(self, client, auth_headers, test_completed_fuel_order, setup_fbo_fee_configuration):
        """Test attempting to update a non-draft receipt."""
        
        headers = self.get_csr_headers(auth_headers)
        fbo_id = 1
        
        # Create and generate a receipt (status will be GENERATED)
        with client.application.app_context():
            receipt = Receipt(
                receipt_number="TEST-001",
                fbo_location_id=fbo_id,
                fuel_order_id=test_completed_fuel_order.id,
                customer_id=test_completed_fuel_order.customer_id,
                status=ReceiptStatus.GENERATED,
                created_by_user_id=1,
                updated_by_user_id=1
            )
            db.session.add(receipt)
            db.session.commit()
            receipt_id = receipt.id
        
        # Try to update the generated receipt
        update_data = {'customer_id': setup_fbo_fee_configuration['customers']['caa']}
        
        response = client.put(
            f'/api/fbo/{fbo_id}/receipts/{receipt_id}/draft',
            json=update_data,
            headers=headers
        )
        
        assert response.status_code in [400, 403]  # Bad Request or Forbidden
    
    # Phase 4.1.4: Fee Calculation Endpoint Tests
    def test_calculate_fees_success(self, client, auth_headers, test_completed_fuel_order, setup_fbo_fee_configuration):
        """Test successfully calling fee calculation endpoint for a draft receipt."""
        
        headers = self.get_csr_headers(auth_headers)
        fbo_id = 1
        fuel_order_id = test_completed_fuel_order.id
        
        # Create draft receipt first
        create_response = client.post(
            f'/api/fbo/{fbo_id}/receipts/draft',
            json={'fuel_order_id': fuel_order_id},
            headers=headers
        )
        assert create_response.status_code == 201
        receipt_id = create_response.get_json()['receipt']['id']
        
        # Calculate fees
        response = client.post(
            f'/api/fbo/{fbo_id}/receipts/{receipt_id}/calculate-fees',
            json={},
            headers=headers
        )
        
        assert response.status_code == 200
        
        data = response.get_json()
        receipt = data['receipt']
        
        # Verify calculated totals are present and non-zero
        assert 'grand_total_amount' in receipt
        assert 'total_fees_amount' in receipt
        assert 'fuel_subtotal' in receipt
        assert float(receipt['grand_total_amount']) > 0
        assert float(receipt['fuel_subtotal']) > 0
        
        # Verify line items were created
        with client.application.app_context():
            line_items = ReceiptLineItem.query.filter_by(receipt_id=receipt_id).all()
            assert len(line_items) > 0
            
            # Should have at least fuel and some fees
            line_item_types = [item.line_item_type.value for item in line_items]
            assert 'FUEL' in line_item_types
            assert 'FEE' in line_item_types
    
    def test_calculate_fees_with_caa_customer(self, client, auth_headers, test_completed_fuel_order, setup_fbo_fee_configuration):
        """Test fee calculation with CAA customer - should apply CAA pricing."""
        
        headers = self.get_csr_headers(auth_headers)
        fbo_id = 1
        fuel_order_id = test_completed_fuel_order.id
        
        # Create draft receipt and update to CAA customer
        create_response = client.post(
            f'/api/fbo/{fbo_id}/receipts/draft',
            json={'fuel_order_id': fuel_order_id},
            headers=headers
        )
        assert create_response.status_code == 201
        receipt_id = create_response.get_json()['receipt']['id']
        
        # Update to CAA customer
        client.put(
            f'/api/fbo/{fbo_id}/receipts/{receipt_id}/draft',
            json={'customer_id': setup_fbo_fee_configuration['customers']['caa']},
            headers=headers
        )
        
        # Calculate fees
        response = client.post(
            f'/api/fbo/{fbo_id}/receipts/{receipt_id}/calculate-fees',
            json={},
            headers=headers
        )
        
        assert response.status_code == 200
        
        data = response.get_json()
        receipt = data['receipt']
        
        # Verify CAA flag is set
        assert receipt['is_caa_applied'] is True
    
    def test_calculate_fees_non_draft_receipt_forbidden(self, client, auth_headers, test_completed_fuel_order, setup_fbo_fee_configuration):
        """Test calling fee calculation on a non-draft receipt."""
        
        headers = self.get_csr_headers(auth_headers)
        fbo_id = 1
        
        # Create a generated receipt
        with client.application.app_context():
            receipt = Receipt(
                receipt_number="TEST-002",
                fbo_location_id=fbo_id,
                fuel_order_id=test_completed_fuel_order.id,
                customer_id=test_completed_fuel_order.customer_id,
                status=ReceiptStatus.GENERATED,
                created_by_user_id=1,
                updated_by_user_id=1
            )
            db.session.add(receipt)
            db.session.commit()
            receipt_id = receipt.id
        
        # Try to calculate fees on generated receipt
        response = client.post(
            f'/api/fbo/{fbo_id}/receipts/{receipt_id}/calculate-fees',
            json={},
            headers=headers
        )
        
        assert response.status_code in [400, 403]  # Bad Request or Forbidden
    
    # Phase 4.1.5: Receipt Finalization Endpoint Tests
    def test_generate_receipt_success(self, client, auth_headers, test_completed_fuel_order, setup_fbo_fee_configuration):
        """Test successfully finalizing a draft receipt after fees have been calculated."""
        
        headers = self.get_csr_headers(auth_headers)
        fbo_id = 1
        fuel_order_id = test_completed_fuel_order.id
        
        # Create draft receipt
        create_response = client.post(
            f'/api/fbo/{fbo_id}/receipts/draft',
            json={'fuel_order_id': fuel_order_id},
            headers=headers
        )
        assert create_response.status_code == 201
        receipt_id = create_response.get_json()['receipt']['id']
        
        # Calculate fees first
        calc_response = client.post(
            f'/api/fbo/{fbo_id}/receipts/{receipt_id}/calculate-fees',
            json={},
            headers=headers
        )
        assert calc_response.status_code == 200
        
        # Generate receipt
        response = client.post(
            f'/api/fbo/{fbo_id}/receipts/{receipt_id}/generate',
            headers=headers
        )
        
        assert response.status_code == 200
        
        data = response.get_json()
        receipt = data['receipt']
        
        # Verify receipt is now generated
        assert receipt['status'] == 'GENERATED'
        assert receipt['receipt_number'] is not None
        assert receipt['generated_at'] is not None
        
        # Verify database record updated
        with client.application.app_context():
            receipt_record = Receipt.query.get(receipt_id)
            assert receipt_record.status == ReceiptStatus.GENERATED
            assert receipt_record.receipt_number is not None
            assert receipt_record.generated_at is not None
    
    def test_generate_receipt_without_calculation_fails(self, client, auth_headers, test_completed_fuel_order, setup_fbo_fee_configuration):
        """Test finalizing a draft receipt before fees have been calculated."""
        
        headers = self.get_csr_headers(auth_headers)
        fbo_id = 1
        fuel_order_id = test_completed_fuel_order.id
        
        # Create draft receipt but don't calculate fees
        create_response = client.post(
            f'/api/fbo/{fbo_id}/receipts/draft',
            json={'fuel_order_id': fuel_order_id},
            headers=headers
        )
        assert create_response.status_code == 201
        receipt_id = create_response.get_json()['receipt']['id']
        
        # Try to generate receipt without calculating fees
        response = client.post(
            f'/api/fbo/{fbo_id}/receipts/{receipt_id}/generate',
            headers=headers
        )
        
        assert response.status_code == 400
        
        data = response.get_json()
        assert 'error' in data
        assert 'uncalculated fees' in data['error'].lower()
    
    # Phase 4.1.6: Mark as Paid Endpoint Tests
    def test_mark_receipt_as_paid_success(self, client, auth_headers, test_completed_fuel_order, setup_fbo_fee_configuration):
        """Test successfully marking a GENERATED receipt as PAID."""
        
        headers = self.get_csr_headers(auth_headers)
        fbo_id = 1
        fuel_order_id = test_completed_fuel_order.id
        
        # Create, calculate, and generate a receipt
        create_response = client.post(
            f'/api/fbo/{fbo_id}/receipts/draft',
            json={'fuel_order_id': fuel_order_id},
            headers=headers
        )
        receipt_id = create_response.get_json()['receipt']['id']
        
        client.post(f'/api/fbo/{fbo_id}/receipts/{receipt_id}/calculate-fees', json={}, headers=headers)
        client.post(f'/api/fbo/{fbo_id}/receipts/{receipt_id}/generate', headers=headers)
        
        # Mark as paid
        response = client.post(
            f'/api/fbo/{fbo_id}/receipts/{receipt_id}/mark-paid',
            headers=headers
        )
        
        assert response.status_code == 200
        
        data = response.get_json()
        receipt = data['receipt']
        
        # Verify receipt is now paid
        assert receipt['status'] == 'PAID'
        assert receipt['paid_at'] is not None
        
        # Verify database record updated
        with client.application.app_context():
            receipt_record = Receipt.query.get(receipt_id)
            assert receipt_record.status == ReceiptStatus.PAID
            assert receipt_record.paid_at is not None
    
    def test_mark_draft_receipt_as_paid_fails(self, client, auth_headers, test_completed_fuel_order, setup_fbo_fee_configuration):
        """Test attempting to mark a DRAFT receipt as paid."""
        
        headers = self.get_csr_headers(auth_headers)
        fbo_id = 1
        fuel_order_id = test_completed_fuel_order.id
        
        # Create draft receipt only
        create_response = client.post(
            f'/api/fbo/{fbo_id}/receipts/draft',
            json={'fuel_order_id': fuel_order_id},
            headers=headers
        )
        receipt_id = create_response.get_json()['receipt']['id']
        
        # Try to mark draft as paid
        response = client.post(
            f'/api/fbo/{fbo_id}/receipts/{receipt_id}/mark-paid',
            headers=headers
        )
        
        assert response.status_code == 400
        
        data = response.get_json()
        assert 'error' in data
    
    # Phase 4.1.7: List/View Endpoints Tests
    def test_list_receipts_success(self, client, auth_headers, test_completed_fuel_order, setup_fbo_fee_configuration):
        """Test fetching a list of receipts for the FBO."""
        
        headers = self.get_csr_headers(auth_headers)
        fbo_id = 1
        
        # Create some test receipts
        fuel_order_id = test_completed_fuel_order.id
        client.post(
            f'/api/fbo/{fbo_id}/receipts/draft',
            json={'fuel_order_id': fuel_order_id},
            headers=headers
        )
        
        # List receipts
        response = client.get(
            f'/api/fbo/{fbo_id}/receipts',
            headers=headers
        )
        
        assert response.status_code == 200
        
        data = response.get_json()
        assert 'receipts' in data
        assert len(data['receipts']) >= 1
    
    def test_list_receipts_with_status_filter(self, client, auth_headers, test_completed_fuel_order, setup_fbo_fee_configuration):
        """Test filtering receipts by status."""
        
        headers = self.get_csr_headers(auth_headers)
        fbo_id = 1
        
        # Create a draft receipt
        fuel_order_id = test_completed_fuel_order.id
        client.post(
            f'/api/fbo/{fbo_id}/receipts/draft',
            json={'fuel_order_id': fuel_order_id},
            headers=headers
        )
        
        # Filter by status
        response = client.get(
            f'/api/fbo/{fbo_id}/receipts?status=DRAFT',
            headers=headers
        )
        
        assert response.status_code == 200
        
        data = response.get_json()
        assert 'receipts' in data
        
        # All returned receipts should be DRAFT status
        for receipt in data['receipts']:
            assert receipt['status'] == 'DRAFT'
    
    def test_list_receipts_with_customer_filter(self, client, auth_headers, test_completed_fuel_order, setup_fbo_fee_configuration):
        """Test filtering receipts by customer_id."""
        
        headers = self.get_csr_headers(auth_headers)
        fbo_id = 1
        customer_id = test_completed_fuel_order.customer_id
        
        # Create a receipt
        fuel_order_id = test_completed_fuel_order.id
        client.post(
            f'/api/fbo/{fbo_id}/receipts/draft',
            json={'fuel_order_id': fuel_order_id},
            headers=headers
        )
        
        # Filter by customer
        response = client.get(
            f'/api/fbo/{fbo_id}/receipts?customer_id={customer_id}',
            headers=headers
        )
        
        assert response.status_code == 200
        
        data = response.get_json()
        assert 'receipts' in data
        
        # All returned receipts should have the correct customer_id
        for receipt in data['receipts']:
            assert receipt['customer_id'] == customer_id
    
    def test_get_receipt_by_id_success(self, client, auth_headers, test_completed_fuel_order, setup_fbo_fee_configuration):
        """Test fetching a single receipt by ID."""
        
        headers = self.get_csr_headers(auth_headers)
        fbo_id = 1
        fuel_order_id = test_completed_fuel_order.id
        
        # Create a receipt
        create_response = client.post(
            f'/api/fbo/{fbo_id}/receipts/draft',
            json={'fuel_order_id': fuel_order_id},
            headers=headers
        )
        receipt_id = create_response.get_json()['receipt']['id']
        
        # Get receipt by ID
        response = client.get(
            f'/api/fbo/{fbo_id}/receipts/{receipt_id}',
            headers=headers
        )
        
        assert response.status_code == 200
        
        data = response.get_json()
        assert 'receipt' in data
        assert data['receipt']['id'] == receipt_id
    
    def test_fbo_isolation_receipts(self, client, auth_headers, test_completed_fuel_order, setup_fbo_fee_configuration):
        """Test that CSR from FBO 2 cannot see receipts from FBO 1."""
        
        headers = self.get_csr_headers(auth_headers)
        fbo_id_1 = 1
        fbo_id_2 = 2
        
        # Create a receipt in FBO 1
        fuel_order_id = test_completed_fuel_order.id
        client.post(
            f'/api/fbo/{fbo_id_1}/receipts/draft',
            json={'fuel_order_id': fuel_order_id},
            headers=headers
        )
        
        # Try to list receipts from FBO 2 (should return empty list or 404)
        response = client.get(
            f'/api/fbo/{fbo_id_2}/receipts',
            headers=headers
        )
        
        # Should either return empty list or proper authorization error
        assert response.status_code in [200, 403, 404]
        
        if response.status_code == 200:
            data = response.get_json()
            assert len(data.get('receipts', [])) == 0 