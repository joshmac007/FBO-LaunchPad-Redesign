"""
Integration tests for Receipt API endpoints.

Tests the API endpoints for receipt management, including manual waiver toggles.
"""

import pytest
import json
from decimal import Decimal
from flask import url_for

from src.models.customer import Customer
from src.models.aircraft import Aircraft
from src.models.aircraft_type import AircraftType
from src.models.fuel_order import FuelOrder, FuelOrderStatus
from src.models.receipt import Receipt, ReceiptStatus
from src.models.receipt_line_item import ReceiptLineItem, LineItemType
from src.models.fee_category import FeeCategory
from src.models.aircraft_type_fee_category_mapping import AircraftTypeToFeeCategoryMapping
from src.models.fee_rule import FeeRule, CalculationBasis, WaiverStrategy
from src.models.user import User
from src.extensions import db


@pytest.fixture(scope='function')
def setup_receipt_test_data(app, db):
    """Setup test data for receipt API tests."""
    
    with app.app_context():
        # Clean up existing data
        db.session.query(ReceiptLineItem).delete()
        db.session.query(Receipt).delete()
        db.session.query(FuelOrder).delete()
        db.session.query(Aircraft).delete()
        db.session.query(AircraftTypeToFeeCategoryMapping).delete()
        db.session.query(FeeRule).delete()
        db.session.query(FeeCategory).delete()
        db.session.query(AircraftType).delete()
        db.session.query(Customer).delete()
        db.session.commit()
        
        # Create customer
        customer = Customer(
            name="Test Customer",
            email="test@example.com",
            is_placeholder=False,
            is_caa_member=False
        )
        db.session.add(customer)
        db.session.commit()
        
        # Create aircraft type
        aircraft_type = AircraftType(
            name="Citation CJ3",
            base_min_fuel_gallons_for_waiver=Decimal('150.00'),
            default_max_gross_weight_lbs=Decimal('13500.00')
        )
        db.session.add(aircraft_type)
        db.session.commit()
        
        # Create aircraft
        aircraft = Aircraft(
            tail_number="N123AB",
            aircraft_type=aircraft_type.name,
            fuel_type="Jet A"
        )
        db.session.add(aircraft)
        db.session.commit()
        
        # Create fee category
        fee_category = FeeCategory(
            fbo_location_id=1,
            name="Light Jet"
        )
        db.session.add(fee_category)
        db.session.commit()
        
        # Create aircraft type mapping
        mapping = AircraftTypeToFeeCategoryMapping(
            fbo_location_id=1,
            aircraft_type_id=aircraft_type.id,
            fee_category_id=fee_category.id
        )
        db.session.add(mapping)
        db.session.commit()
        
        # Create fee rules
        ramp_fee = FeeRule(
            fbo_location_id=1,
            fee_name="Ramp Fee",
            fee_code="RAMP_FEE",
            applies_to_fee_category_id=fee_category.id,
            amount=Decimal('75.00'),
            currency="USD",
            is_taxable=True,
            is_potentially_waivable_by_fuel_uplift=True,
            calculation_basis=CalculationBasis.NOT_APPLICABLE,
            waiver_strategy=WaiverStrategy.SIMPLE_MULTIPLIER,
            simple_waiver_multiplier=Decimal('1.0')
        )
        
        gpu_service = FeeRule(
            fbo_location_id=1,
            fee_name="GPU Service",
            fee_code="GPU_SERVICE",
            applies_to_fee_category_id=fee_category.id,
            amount=Decimal('25.00'),
            currency="USD",
            is_taxable=True,
            is_potentially_waivable_by_fuel_uplift=False,  # Not waivable
            calculation_basis=CalculationBasis.FIXED_PRICE,
            waiver_strategy=WaiverStrategy.NONE
        )
        
        db.session.add_all([ramp_fee, gpu_service])
        db.session.commit()
        
        # Create fuel order
        fuel_order = FuelOrder(
            tail_number="N123AB",
            fuel_type="Jet A",
            customer_id=customer.id,
            start_meter_reading=Decimal('1000.00'),
            end_meter_reading=Decimal('1200.00'),  # 200 gallons
            status=FuelOrderStatus.COMPLETED
        )
        db.session.add(fuel_order)
        db.session.commit()
        
        return {
            'customer_id': customer.id,
            'aircraft_type_id': aircraft_type.id,
            'aircraft_tail_number': aircraft.tail_number,
            'fee_category_id': fee_category.id,
            'fuel_order_id': fuel_order.id,
            'ramp_fee_id': ramp_fee.id,
            'gpu_service_id': gpu_service.id
        }


class TestReceiptAPIEndpoints:
    """Test class for receipt API endpoints."""
    
    def test_toggle_waiver_on_waivable_fee(self, client, setup_receipt_test_data, test_users):
        """Test toggling waiver on a fee that is potentially waivable."""
        fixture_data = setup_receipt_test_data
        
        # Get CSR user for authentication
        csr_user = User.query.filter_by(username='csr').first()
        
        # Create draft receipt
        receipt = Receipt(
            fbo_location_id=1,
            fuel_order_id=fixture_data['fuel_order_id'],
            customer_id=fixture_data['customer_id'],
            aircraft_type_at_receipt_time="Citation CJ3",
            fuel_type_at_receipt_time="Jet A",
            fuel_quantity_gallons_at_receipt_time=Decimal('200.00'),
            status=ReceiptStatus.DRAFT,
            created_by_user_id=csr_user.id,
            updated_by_user_id=csr_user.id
        )
        db.session.add(receipt)
        db.session.commit()
        
        # Create fee line item (waivable)
        ramp_fee_line_item = ReceiptLineItem(
            receipt_id=receipt.id,
            line_item_type=LineItemType.FEE,
            description="Ramp Fee",
            fee_code_applied="RAMP_FEE",
            quantity=Decimal('1.0'),
            unit_price=Decimal('75.00'),
            amount=Decimal('75.00')
        )
        db.session.add(ramp_fee_line_item)
        db.session.commit()
        
        # Set up authentication
        auth_headers = {
            'Authorization': f'Bearer {csr_user.generate_token()}'
        }
        
        # Test toggling waiver ON
        response = client.post(
            f'/api/fbo/1/receipts/{receipt.id}/line-items/{ramp_fee_line_item.id}/toggle-waiver',
            headers=auth_headers
        )
        
        assert response.status_code == 200
        response_data = response.get_json()
        assert 'receipt' in response_data
        assert response_data['message'] == 'Waiver toggled successfully'
        
        # Check that waiver line item was created
        receipt_data = response_data['receipt']
        line_items = receipt_data['line_items']
        waiver_items = [item for item in line_items if item['line_item_type'] == 'WAIVER']
        
        assert len(waiver_items) == 1
        waiver_item = waiver_items[0]
        assert waiver_item['fee_code_applied'] == 'RAMP_FEE'
        assert waiver_item['amount'] == '-75.00'
        assert waiver_item['description'] == 'Manual Waiver (Ramp Fee)'
        
        # Test toggling waiver OFF
        response = client.post(
            f'/api/fbo/1/receipts/{receipt.id}/line-items/{ramp_fee_line_item.id}/toggle-waiver',
            headers=auth_headers
        )
        
        assert response.status_code == 200
        response_data = response.get_json()
        
        # Check that waiver line item was removed
        receipt_data = response_data['receipt']
        line_items = receipt_data['line_items']
        waiver_items = [item for item in line_items if item['line_item_type'] == 'WAIVER']
        
        assert len(waiver_items) == 0
    
    def test_toggle_waiver_on_non_waivable_fee(self, client, setup_receipt_test_data, test_users):
        """Test that toggling waiver on a non-waivable fee returns an error."""
        fixture_data = setup_receipt_test_data
        
        # Get CSR user for authentication
        csr_user = User.query.filter_by(username='csr').first()
        
        # Create draft receipt
        receipt = Receipt(
            fbo_location_id=1,
            fuel_order_id=fixture_data['fuel_order_id'],
            customer_id=fixture_data['customer_id'],
            aircraft_type_at_receipt_time="Citation CJ3",
            fuel_type_at_receipt_time="Jet A",
            fuel_quantity_gallons_at_receipt_time=Decimal('200.00'),
            status=ReceiptStatus.DRAFT,
            created_by_user_id=csr_user.id,
            updated_by_user_id=csr_user.id
        )
        db.session.add(receipt)
        db.session.commit()
        
        # Create fee line item (NOT waivable)
        gpu_fee_line_item = ReceiptLineItem(
            receipt_id=receipt.id,
            line_item_type=LineItemType.FEE,
            description="GPU Service",
            fee_code_applied="GPU_SERVICE",
            quantity=Decimal('1.0'),
            unit_price=Decimal('25.00'),
            amount=Decimal('25.00')
        )
        db.session.add(gpu_fee_line_item)
        db.session.commit()
        
        # Set up authentication
        auth_headers = {
            'Authorization': f'Bearer {csr_user.generate_token()}'
        }
        
        # Test toggling waiver on non-waivable fee
        response = client.post(
            f'/api/fbo/1/receipts/{receipt.id}/line-items/{gpu_fee_line_item.id}/toggle-waiver',
            headers=auth_headers
        )
        
        assert response.status_code == 400
        response_data = response.get_json()
        assert 'error' in response_data
        assert 'not manually waivable' in response_data['error']
    
    def test_toggle_waiver_on_generated_receipt(self, client, setup_receipt_test_data, test_users):
        """Test that toggling waiver on a generated receipt returns an error."""
        fixture_data = setup_receipt_test_data
        
        # Get CSR user for authentication
        csr_user = User.query.filter_by(username='csr').first()
        
        # Create generated receipt (not draft)
        receipt = Receipt(
            fbo_location_id=1,
            fuel_order_id=fixture_data['fuel_order_id'],
            customer_id=fixture_data['customer_id'],
            aircraft_type_at_receipt_time="Citation CJ3",
            fuel_type_at_receipt_time="Jet A",
            fuel_quantity_gallons_at_receipt_time=Decimal('200.00'),
            status=ReceiptStatus.GENERATED,  # Not draft
            receipt_number="FBO1-001",
            created_by_user_id=csr_user.id,
            updated_by_user_id=csr_user.id
        )
        db.session.add(receipt)
        db.session.commit()
        
        # Create fee line item
        ramp_fee_line_item = ReceiptLineItem(
            receipt_id=receipt.id,
            line_item_type=LineItemType.FEE,
            description="Ramp Fee",
            fee_code_applied="RAMP_FEE",
            quantity=Decimal('1.0'),
            unit_price=Decimal('75.00'),
            amount=Decimal('75.00')
        )
        db.session.add(ramp_fee_line_item)
        db.session.commit()
        
        # Set up authentication
        auth_headers = {
            'Authorization': f'Bearer {csr_user.generate_token()}'
        }
        
        # Test toggling waiver on generated receipt
        response = client.post(
            f'/api/fbo/1/receipts/{receipt.id}/line-items/{ramp_fee_line_item.id}/toggle-waiver',
            headers=auth_headers
        )
        
        assert response.status_code == 403
        response_data = response.get_json()
        assert 'error' in response_data
        assert 'cannot modify' in response_data['error'].lower()
    
    def test_toggle_waiver_nonexistent_line_item(self, client, setup_receipt_test_data, test_users):
        """Test toggling waiver on a line item that doesn't exist."""
        fixture_data = setup_receipt_test_data
        
        # Get CSR user for authentication
        csr_user = User.query.filter_by(username='csr').first()
        
        # Create draft receipt
        receipt = Receipt(
            fbo_location_id=1,
            fuel_order_id=fixture_data['fuel_order_id'],
            customer_id=fixture_data['customer_id'],
            aircraft_type_at_receipt_time="Citation CJ3",
            fuel_type_at_receipt_time="Jet A",
            fuel_quantity_gallons_at_receipt_time=Decimal('200.00'),
            status=ReceiptStatus.DRAFT,
            created_by_user_id=csr_user.id,
            updated_by_user_id=csr_user.id
        )
        db.session.add(receipt)
        db.session.commit()
        
        # Set up authentication
        auth_headers = {
            'Authorization': f'Bearer {csr_user.generate_token()}'
        }
        
        # Test toggling waiver on nonexistent line item
        nonexistent_line_item_id = 99999
        response = client.post(
            f'/api/fbo/1/receipts/{receipt.id}/line-items/{nonexistent_line_item_id}/toggle-waiver',
            headers=auth_headers
        )
        
        assert response.status_code == 404
        response_data = response.get_json()
        assert 'error' in response_data
        assert 'not found' in response_data['error'].lower() 