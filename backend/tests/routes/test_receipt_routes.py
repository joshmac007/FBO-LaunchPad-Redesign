"""
Comprehensive integration test suite for Receipt API endpoints.

Following TDD principles, these tests validate the complete request-response cycle
for all receipt operations including authentication, validation, and business logic.
"""

import pytest
import json
from decimal import Decimal
from datetime import datetime, timedelta
from unittest.mock import patch, MagicMock

from src.models.receipt import Receipt, ReceiptStatus
from src.models.receipt_line_item import ReceiptLineItem, LineItemType
from src.models.fuel_order import FuelOrder, FuelOrderStatus
from src.models.customer import Customer
from src.models.aircraft import Aircraft
from src.models.aircraft_type import AircraftType
from src.models.user import User
from src.models.fuel_price import FuelPrice, FuelTypeEnum
from src.extensions import db


class TestReceiptRoutes:
    """Integration test suite for Receipt API endpoints."""

    @pytest.fixture
    def test_user(self, app):
        """Create test user."""
        with app.app_context():
            user = User(
                email="test@example.com",
                first_name="Test",
                last_name="User",
                role="CSR"
            )
            db.session.add(user)
            db.session.commit()
            return user

    @pytest.fixture
    def test_customer(self, app):
        """Create test customer."""
        with app.app_context():
            customer = Customer(
                name="Test Customer",
                email="customer@example.com",
                is_placeholder=False,
                is_caa_member=False
            )
            db.session.add(customer)
            db.session.commit()
            return customer

    @pytest.fixture
    def test_aircraft_type(self, app):
        """Create test aircraft type."""
        with app.app_context():
            aircraft_type = AircraftType(
                name="Light Jet",
                description="Small business jet"
            )
            db.session.add(aircraft_type)
            db.session.commit()
            return aircraft_type

    @pytest.fixture
    def test_aircraft(self, app, test_aircraft_type):
        """Create test aircraft."""
        with app.app_context():
            aircraft = Aircraft(
                tail_number="N12345",
                aircraft_type="Light Jet"
            )
            db.session.add(aircraft)
            db.session.commit()
            return aircraft

    @pytest.fixture
    def test_fuel_order(self, app, test_customer, test_aircraft):
        """Create test fuel order."""
        with app.app_context():
            fuel_order = FuelOrder(
                tail_number="N12345",
                fuel_type="JET_A",
                requested_amount=Decimal("100.00"),
                gallons_dispensed=Decimal("100.00"),
                start_meter_reading=Decimal("1000.00"),
                end_meter_reading=Decimal("1100.00"),
                status=FuelOrderStatus.COMPLETED,
                customer_id=test_customer.id
            )
            db.session.add(fuel_order)
            db.session.commit()
            return fuel_order

    @pytest.fixture
    def test_fuel_price(self, app):
        """Create test fuel price."""
        with app.app_context():
            fuel_price = FuelPrice(
                fuel_type=FuelTypeEnum.JET_A,
                price=Decimal("5.75"),
                effective_date=datetime.utcnow()
            )
            db.session.add(fuel_price)
            db.session.commit()
            return fuel_price

    @pytest.fixture
    def auth_headers(self, test_user):
        """Create authentication headers."""
        # Mock JWT token generation
        return {
            'Authorization': 'Bearer test-token',
            'Content-Type': 'application/json'
        }


class TestCreateDraftReceipt:
    """Test POST /receipts/draft endpoint."""

    def test_create_draft_receipt_success(self, client, app, test_fuel_order, test_user, 
                                        test_fuel_price, auth_headers):
        """Test successful draft receipt creation."""
        with app.app_context():
            with patch('src.routes.receipt_routes.get_current_user') as mock_get_user:
                mock_get_user.return_value = test_user
                
                payload = {'fuel_order_id': test_fuel_order.id}
                
                response = client.post(
                    '/api/receipts/draft',
                    data=json.dumps(payload),
                    headers=auth_headers
                )
                
                assert response.status_code == 201
                data = response.get_json()
                
                assert 'receipt' in data
                assert 'message' in data
                assert data['receipt']['fuel_order_id'] == test_fuel_order.id
                assert data['receipt']['status'] == 'DRAFT'
                assert data['receipt']['created_by_user_id'] == test_user.id
                
                # Verify receipt was created in database
                receipt = Receipt.query.filter_by(fuel_order_id=test_fuel_order.id).first()
                assert receipt is not None
                assert receipt.status == ReceiptStatus.DRAFT

    def test_create_draft_receipt_invalid_fuel_order(self, client, app, test_user, auth_headers):
        """Test error when fuel order doesn't exist."""
        with app.app_context():
            with patch('src.routes.receipt_routes.get_current_user') as mock_get_user:
                mock_get_user.return_value = test_user
                
                payload = {'fuel_order_id': 99999}
                
                response = client.post(
                    '/api/receipts/draft',
                    data=json.dumps(payload),
                    headers=auth_headers
                )
                
                assert response.status_code == 400
                data = response.get_json()
                assert 'error' in data

    def test_create_draft_receipt_missing_auth(self, client, app, test_fuel_order):
        """Test error when authentication is missing."""
        payload = {'fuel_order_id': test_fuel_order.id}
        
        response = client.post(
            '/api/receipts/draft',
            data=json.dumps(payload),
            headers={'Content-Type': 'application/json'}
        )
        
        assert response.status_code == 401

    def test_create_draft_receipt_invalid_payload(self, client, app, test_user, auth_headers):
        """Test error with invalid request payload."""
        with app.app_context():
            with patch('src.routes.receipt_routes.get_current_user') as mock_get_user:
                mock_get_user.return_value = test_user
                
                # Missing required field
                payload = {}
                
                response = client.post(
                    '/api/receipts/draft',
                    data=json.dumps(payload),
                    headers=auth_headers
                )
                
                assert response.status_code == 400
                data = response.get_json()
                assert 'error' in data

    def test_create_draft_receipt_fuel_order_not_completed(self, client, app, test_customer, 
                                                          test_user, auth_headers):
        """Test error when fuel order is not completed."""
        with app.app_context():
            # Create incomplete fuel order
            incomplete_order = FuelOrder(
                tail_number="N67890",
                fuel_type="JET_A",
                requested_amount=Decimal("100.00"),
                status=FuelOrderStatus.CREATED,
                customer_id=test_customer.id
            )
            db.session.add(incomplete_order)
            db.session.commit()
            
            with patch('src.routes.receipt_routes.get_current_user') as mock_get_user:
                mock_get_user.return_value = test_user
                
                payload = {'fuel_order_id': incomplete_order.id}
                
                response = client.post(
                    '/api/receipts/draft',
                    data=json.dumps(payload),
                    headers=auth_headers
                )
                
                assert response.status_code == 400
                data = response.get_json()
                assert 'error' in data
                assert 'status' in data['error'].lower()


class TestUpdateDraftReceipt:
    """Test PUT /receipts/{id}/draft endpoint."""

    def test_update_draft_receipt_success(self, client, app, test_fuel_order, test_user, 
                                        test_customer, auth_headers):
        """Test successful draft receipt update."""
        with app.app_context():
            # Create draft receipt
            receipt = Receipt(
                fuel_order_id=test_fuel_order.id,
                customer_id=test_customer.id,
                status=ReceiptStatus.DRAFT,
                created_by_user_id=test_user.id,
                updated_by_user_id=test_user.id,
                fuel_subtotal=Decimal('0.00'),
                total_fees_amount=Decimal('0.00'),
                total_waivers_amount=Decimal('0.00'),
                tax_amount=Decimal('0.00'),
                grand_total_amount=Decimal('0.00')
            )
            db.session.add(receipt)
            db.session.commit()
            
            # Create another customer for update
            new_customer = Customer(
                name="Updated Customer",
                email="updated@example.com",
                is_placeholder=False,
                is_caa_member=True
            )
            db.session.add(new_customer)
            db.session.commit()
            
            with patch('src.routes.receipt_routes.get_current_user') as mock_get_user:
                mock_get_user.return_value = test_user
                
                payload = {
                    'customer_id': new_customer.id,
                    'aircraft_type': 'Heavy Jet',
                    'notes': 'Updated notes',
                    'additional_services': [
                        {'fee_code': 'GROUND_POWER', 'quantity': 1}
                    ]
                }
                
                response = client.put(
                    f'/api/receipts/{receipt.id}/draft',
                    data=json.dumps(payload),
                    headers=auth_headers
                )
                
                assert response.status_code == 200
                data = response.get_json()
                
                assert 'receipt' in data
                assert data['receipt']['customer_id'] == new_customer.id
                assert data['receipt']['aircraft_type_at_receipt_time'] == 'Heavy Jet'
                assert data['receipt']['updated_by_user_id'] == test_user.id

    def test_update_draft_receipt_not_found(self, client, app, test_user, auth_headers):
        """Test error when receipt doesn't exist."""
        with app.app_context():
            with patch('src.routes.receipt_routes.get_current_user') as mock_get_user:
                mock_get_user.return_value = test_user
                
                payload = {'notes': 'Test notes'}
                
                response = client.put(
                    '/api/receipts/99999/draft',
                    data=json.dumps(payload),
                    headers=auth_headers
                )
                
                assert response.status_code == 404

    def test_update_draft_receipt_wrong_status(self, client, app, test_fuel_order, test_user, 
                                             test_customer, auth_headers):
        """Test error when receipt is not in draft status."""
        with app.app_context():
            # Create generated receipt
            receipt = Receipt(
                fuel_order_id=test_fuel_order.id,
                customer_id=test_customer.id,
                status=ReceiptStatus.GENERATED,
                receipt_number="R-20240101-0001",
                created_by_user_id=test_user.id,
                updated_by_user_id=test_user.id,
                fuel_subtotal=Decimal('575.00'),
                total_fees_amount=Decimal('100.00'),
                total_waivers_amount=Decimal('0.00'),
                tax_amount=Decimal('0.00'),
                grand_total_amount=Decimal('675.00')
            )
            db.session.add(receipt)
            db.session.commit()
            
            with patch('src.routes.receipt_routes.get_current_user') as mock_get_user:
                mock_get_user.return_value = test_user
                
                payload = {'notes': 'Test notes'}
                
                response = client.put(
                    f'/api/receipts/{receipt.id}/draft',
                    data=json.dumps(payload),
                    headers=auth_headers
                )
                
                assert response.status_code == 400
                data = response.get_json()
                assert 'error' in data


class TestCalculateFees:
    """Test POST /receipts/{id}/calculate-fees endpoint."""

    def test_calculate_fees_success(self, client, app, test_fuel_order, test_user, 
                                  test_customer, test_aircraft_type, test_fuel_price, auth_headers):
        """Test successful fee calculation."""
        with app.app_context():
            # Create draft receipt with required data
            receipt = Receipt(
                fuel_order_id=test_fuel_order.id,
                customer_id=test_customer.id,
                status=ReceiptStatus.DRAFT,
                aircraft_type_at_receipt_time="Light Jet",
                fuel_type_at_receipt_time="JET_A",
                fuel_quantity_gallons_at_receipt_time=Decimal("100.00"),
                created_by_user_id=test_user.id,
                updated_by_user_id=test_user.id,
                fuel_subtotal=Decimal('0.00'),
                total_fees_amount=Decimal('0.00'),
                total_waivers_amount=Decimal('0.00'),
                tax_amount=Decimal('0.00'),
                grand_total_amount=Decimal('0.00')
            )
            db.session.add(receipt)
            db.session.commit()
            
            with patch('src.routes.receipt_routes.get_current_user') as mock_get_user:
                with patch('src.services.receipt_service.ReceiptService.calculate_and_update_draft') as mock_calculate:
                    mock_get_user.return_value = test_user
                    
                    # Mock calculation result
                    updated_receipt = receipt
                    updated_receipt.fuel_subtotal = Decimal("575.00")
                    updated_receipt.total_fees_amount = Decimal("100.00")
                    updated_receipt.grand_total_amount = Decimal("675.00")
                    mock_calculate.return_value = updated_receipt
                    
                    payload = {
                        'additional_services': [
                            {'fee_code': 'GROUND_POWER', 'quantity': 1},
                            {'fee_code': 'CATERING', 'quantity': 2}
                        ]
                    }
                    
                    response = client.post(
                        f'/api/receipts/{receipt.id}/calculate-fees',
                        data=json.dumps(payload),
                        headers=auth_headers
                    )
                    
                    assert response.status_code == 200
                    data = response.get_json()
                    
                    assert 'receipt' in data
                    assert 'message' in data
                    
                    # Verify calculation was called with additional services
                    mock_calculate.assert_called_once_with(
                        receipt.id, 
                        payload['additional_services']
                    )

    def test_calculate_fees_without_additional_services(self, client, app, test_fuel_order, 
                                                      test_user, test_customer, auth_headers):
        """Test fee calculation without additional services."""
        with app.app_context():
            # Create draft receipt
            receipt = Receipt(
                fuel_order_id=test_fuel_order.id,
                customer_id=test_customer.id,
                status=ReceiptStatus.DRAFT,
                aircraft_type_at_receipt_time="Light Jet",
                fuel_type_at_receipt_time="JET_A",
                fuel_quantity_gallons_at_receipt_time=Decimal("100.00"),
                created_by_user_id=test_user.id,
                updated_by_user_id=test_user.id,
                fuel_subtotal=Decimal('0.00'),
                total_fees_amount=Decimal('0.00'),
                total_waivers_amount=Decimal('0.00'),
                tax_amount=Decimal('0.00'),
                grand_total_amount=Decimal('0.00')
            )
            db.session.add(receipt)
            db.session.commit()
            
            with patch('src.routes.receipt_routes.get_current_user') as mock_get_user:
                with patch('src.services.receipt_service.ReceiptService.calculate_and_update_draft') as mock_calculate:
                    mock_get_user.return_value = test_user
                    mock_calculate.return_value = receipt
                    
                    response = client.post(
                        f'/api/receipts/{receipt.id}/calculate-fees',
                        headers=auth_headers
                    )
                    
                    assert response.status_code == 200
                    
                    # Verify calculation was called with empty additional services
                    mock_calculate.assert_called_once_with(receipt.id, None)


class TestGenerateReceipt:
    """Test POST /receipts/{id}/generate endpoint."""

    def test_generate_receipt_success(self, client, app, test_fuel_order, test_user, 
                                    test_customer, auth_headers):
        """Test successful receipt generation."""
        with app.app_context():
            # Create draft receipt with calculated fees
            receipt = Receipt(
                fuel_order_id=test_fuel_order.id,
                customer_id=test_customer.id,
                status=ReceiptStatus.DRAFT,
                created_by_user_id=test_user.id,
                updated_by_user_id=test_user.id,
                fuel_subtotal=Decimal('575.00'),
                total_fees_amount=Decimal('100.00'),
                total_waivers_amount=Decimal('0.00'),
                tax_amount=Decimal('0.00'),
                grand_total_amount=Decimal('675.00')
            )
            db.session.add(receipt)
            db.session.commit()
            
            # Add line items
            line_item = ReceiptLineItem(
                receipt_id=receipt.id,
                line_item_type=LineItemType.FUEL,
                description="JET_A Fuel",
                quantity=Decimal("100.00"),
                unit_price=Decimal("5.75"),
                amount=Decimal("575.00")
            )
            db.session.add(line_item)
            db.session.commit()
            
            with patch('src.routes.receipt_routes.get_current_user') as mock_get_user:
                mock_get_user.return_value = test_user
                
                response = client.post(
                    f'/api/receipts/{receipt.id}/generate',
                    headers=auth_headers
                )
                
                assert response.status_code == 200
                data = response.get_json()
                
                assert 'receipt' in data
                assert 'message' in data
                
                # Verify receipt status changed
                updated_receipt = Receipt.query.get(receipt.id)
                assert updated_receipt.status == ReceiptStatus.GENERATED
                assert updated_receipt.receipt_number is not None
                assert updated_receipt.generated_at is not None

    def test_generate_receipt_not_found(self, client, app, test_user, auth_headers):
        """Test error when receipt doesn't exist."""
        with app.app_context():
            with patch('src.routes.receipt_routes.get_current_user') as mock_get_user:
                mock_get_user.return_value = test_user
                
                response = client.post(
                    '/api/receipts/99999/generate',
                    headers=auth_headers
                )
                
                assert response.status_code == 404


class TestMarkAsPaid:
    """Test POST /receipts/{id}/mark-paid endpoint."""

    def test_mark_as_paid_success(self, client, app, test_fuel_order, test_user, 
                                test_customer, auth_headers):
        """Test successful marking receipt as paid."""
        with app.app_context():
            # Create generated receipt
            receipt = Receipt(
                fuel_order_id=test_fuel_order.id,
                customer_id=test_customer.id,
                status=ReceiptStatus.GENERATED,
                receipt_number="R-20240101-0001",
                created_by_user_id=test_user.id,
                updated_by_user_id=test_user.id,
                fuel_subtotal=Decimal('575.00'),
                total_fees_amount=Decimal('100.00'),
                total_waivers_amount=Decimal('0.00'),
                tax_amount=Decimal('0.00'),
                grand_total_amount=Decimal('675.00'),
                generated_at=datetime.utcnow()
            )
            db.session.add(receipt)
            db.session.commit()
            
            with patch('src.routes.receipt_routes.get_current_user') as mock_get_user:
                mock_get_user.return_value = test_user
                
                response = client.post(
                    f'/api/receipts/{receipt.id}/mark-paid',
                    headers=auth_headers
                )
                
                assert response.status_code == 200
                data = response.get_json()
                
                assert 'receipt' in data
                assert 'message' in data
                
                # Verify receipt status changed
                updated_receipt = Receipt.query.get(receipt.id)
                assert updated_receipt.status == ReceiptStatus.PAID
                assert updated_receipt.paid_at is not None


class TestVoidReceipt:
    """Test POST /receipts/{id}/void endpoint."""

    def test_void_receipt_success(self, client, app, test_fuel_order, test_user, 
                                test_customer, auth_headers):
        """Test successful receipt voiding."""
        with app.app_context():
            # Create generated receipt
            receipt = Receipt(
                fuel_order_id=test_fuel_order.id,
                customer_id=test_customer.id,
                status=ReceiptStatus.GENERATED,
                receipt_number="R-20240101-0001",
                created_by_user_id=test_user.id,
                updated_by_user_id=test_user.id,
                fuel_subtotal=Decimal('575.00'),
                total_fees_amount=Decimal('100.00'),
                total_waivers_amount=Decimal('0.00'),
                tax_amount=Decimal('0.00'),
                grand_total_amount=Decimal('675.00'),
                generated_at=datetime.utcnow()
            )
            db.session.add(receipt)
            db.session.commit()
            
            with patch('src.routes.receipt_routes.get_current_user') as mock_get_user:
                mock_get_user.return_value = test_user
                
                payload = {'reason': 'Customer request'}
                
                response = client.post(
                    f'/api/receipts/{receipt.id}/void',
                    data=json.dumps(payload),
                    headers=auth_headers
                )
                
                assert response.status_code == 200
                data = response.get_json()
                
                assert 'receipt' in data
                assert 'message' in data
                
                # Verify receipt status changed
                updated_receipt = Receipt.query.get(receipt.id)
                assert updated_receipt.status == ReceiptStatus.VOID


class TestGetReceipts:
    """Test GET /receipts endpoint."""

    def test_get_receipts_success(self, client, app, test_fuel_order, test_user, 
                                test_customer, auth_headers):
        """Test successful receipts list retrieval."""
        with app.app_context():
            # Create multiple receipts
            receipts = []
            for i in range(3):
                receipt = Receipt(
                    fuel_order_id=test_fuel_order.id,
                    customer_id=test_customer.id,
                    status=ReceiptStatus.GENERATED,
                    receipt_number=f"R-20240101-000{i+1}",
                    created_by_user_id=test_user.id,
                    updated_by_user_id=test_user.id,
                    fuel_subtotal=Decimal('575.00'),
                    total_fees_amount=Decimal('100.00'),
                    total_waivers_amount=Decimal('0.00'),
                    tax_amount=Decimal('0.00'),
                    grand_total_amount=Decimal('675.00'),
                    generated_at=datetime.utcnow()
                )
                db.session.add(receipt)
                receipts.append(receipt)
            db.session.commit()
            
            with patch('src.routes.receipt_routes.get_current_user') as mock_get_user:
                mock_get_user.return_value = test_user
                
                response = client.get(
                    '/api/receipts',
                    headers=auth_headers
                )
                
                assert response.status_code == 200
                data = response.get_json()
                
                assert 'receipts' in data
                assert 'pagination' in data
                assert len(data['receipts']) >= 3
                assert data['pagination']['total'] >= 3

    def test_get_receipts_with_filters(self, client, app, test_fuel_order, test_user, 
                                     test_customer, auth_headers):
        """Test receipts list with filters."""
        with app.app_context():
            # Create receipts with different statuses
            draft_receipt = Receipt(
                fuel_order_id=test_fuel_order.id,
                customer_id=test_customer.id,
                status=ReceiptStatus.DRAFT,
                created_by_user_id=test_user.id,
                updated_by_user_id=test_user.id,
                fuel_subtotal=Decimal('0.00'),
                total_fees_amount=Decimal('0.00'),
                total_waivers_amount=Decimal('0.00'),
                tax_amount=Decimal('0.00'),
                grand_total_amount=Decimal('0.00')
            )
            
            paid_receipt = Receipt(
                fuel_order_id=test_fuel_order.id,
                customer_id=test_customer.id,
                status=ReceiptStatus.PAID,
                receipt_number="R-20240101-0001",
                created_by_user_id=test_user.id,
                updated_by_user_id=test_user.id,
                fuel_subtotal=Decimal('575.00'),
                total_fees_amount=Decimal('100.00'),
                total_waivers_amount=Decimal('0.00'),
                tax_amount=Decimal('0.00'),
                grand_total_amount=Decimal('675.00'),
                generated_at=datetime.utcnow(),
                paid_at=datetime.utcnow()
            )
            
            db.session.add_all([draft_receipt, paid_receipt])
            db.session.commit()
            
            with patch('src.routes.receipt_routes.get_current_user') as mock_get_user:
                mock_get_user.return_value = test_user
                
                # Filter by status
                response = client.get(
                    '/api/receipts?status=PAID',
                    headers=auth_headers
                )
                
                assert response.status_code == 200
                data = response.get_json()
                
                assert 'receipts' in data
                # All returned receipts should have PAID status
                for receipt in data['receipts']:
                    assert receipt['status'] == 'PAID'

    def test_get_receipts_pagination(self, client, app, test_fuel_order, test_user, 
                                   test_customer, auth_headers):
        """Test receipts list pagination."""
        with app.app_context():
            with patch('src.routes.receipt_routes.get_current_user') as mock_get_user:
                mock_get_user.return_value = test_user
                
                response = client.get(
                    '/api/receipts?page=1&per_page=5',
                    headers=auth_headers
                )
                
                assert response.status_code == 200
                data = response.get_json()
                
                assert 'pagination' in data
                assert data['pagination']['page'] == 1
                assert data['pagination']['per_page'] == 5


class TestGetReceiptById:
    """Test GET /receipts/{id} endpoint."""

    def test_get_receipt_by_id_success(self, client, app, test_fuel_order, test_user, 
                                     test_customer, auth_headers):
        """Test successful receipt retrieval by ID."""
        with app.app_context():
            # Create receipt with line items
            receipt = Receipt(
                fuel_order_id=test_fuel_order.id,
                customer_id=test_customer.id,
                status=ReceiptStatus.GENERATED,
                receipt_number="R-20240101-0001",
                created_by_user_id=test_user.id,
                updated_by_user_id=test_user.id,
                fuel_subtotal=Decimal('575.00'),
                total_fees_amount=Decimal('100.00'),
                total_waivers_amount=Decimal('0.00'),
                tax_amount=Decimal('0.00'),
                grand_total_amount=Decimal('675.00'),
                generated_at=datetime.utcnow()
            )
            db.session.add(receipt)
            db.session.commit()
            
            # Add line items
            line_items = [
                ReceiptLineItem(
                    receipt_id=receipt.id,
                    line_item_type=LineItemType.FUEL,
                    description="JET_A Fuel",
                    quantity=Decimal("100.00"),
                    unit_price=Decimal("5.75"),
                    amount=Decimal("575.00")
                ),
                ReceiptLineItem(
                    receipt_id=receipt.id,
                    line_item_type=LineItemType.FEE,
                    description="Ramp Fee",
                    fee_code_applied="RAMP_FEE",
                    quantity=Decimal("1.00"),
                    unit_price=Decimal("100.00"),
                    amount=Decimal("100.00")
                )
            ]
            db.session.add_all(line_items)
            db.session.commit()
            
            with patch('src.routes.receipt_routes.get_current_user') as mock_get_user:
                mock_get_user.return_value = test_user
                
                response = client.get(
                    f'/api/receipts/{receipt.id}',
                    headers=auth_headers
                )
                
                assert response.status_code == 200
                data = response.get_json()
                
                assert 'receipt' in data
                assert data['receipt']['id'] == receipt.id
                assert data['receipt']['receipt_number'] == "R-20240101-0001"
                assert 'line_items' in data['receipt']
                assert len(data['receipt']['line_items']) == 2

    def test_get_receipt_by_id_not_found(self, client, app, test_user, auth_headers):
        """Test error when receipt doesn't exist."""
        with app.app_context():
            with patch('src.routes.receipt_routes.get_current_user') as mock_get_user:
                mock_get_user.return_value = test_user
                
                response = client.get(
                    '/api/receipts/99999',
                    headers=auth_headers
                )
                
                assert response.status_code == 404


class TestToggleLineItemWaiver:
    """Test POST /receipts/{id}/line-items/{line_item_id}/toggle-waiver endpoint."""

    def test_toggle_waiver_success(self, client, app, test_fuel_order, test_user, 
                                 test_customer, auth_headers):
        """Test successful line item waiver toggle."""
        with app.app_context():
            # Create receipt with fee line item
            receipt = Receipt(
                fuel_order_id=test_fuel_order.id,
                customer_id=test_customer.id,
                status=ReceiptStatus.DRAFT,
                created_by_user_id=test_user.id,
                updated_by_user_id=test_user.id,
                fuel_subtotal=Decimal('575.00'),
                total_fees_amount=Decimal('100.00'),
                total_waivers_amount=Decimal('0.00'),
                tax_amount=Decimal('0.00'),
                grand_total_amount=Decimal('675.00')
            )
            db.session.add(receipt)
            db.session.commit()
            
            fee_line_item = ReceiptLineItem(
                receipt_id=receipt.id,
                line_item_type=LineItemType.FEE,
                description="Ramp Fee",
                fee_code_applied="RAMP_FEE",
                quantity=Decimal("1.00"),
                unit_price=Decimal("100.00"),
                amount=Decimal("100.00")
            )
            db.session.add(fee_line_item)
            db.session.commit()
            
            with patch('src.routes.receipt_routes.get_current_user') as mock_get_user:
                with patch('src.services.receipt_service.ReceiptService.toggle_line_item_waiver') as mock_toggle:
                    mock_get_user.return_value = test_user
                    mock_toggle.return_value = receipt
                    
                    response = client.post(
                        f'/api/receipts/{receipt.id}/line-items/{fee_line_item.id}/toggle-waiver',
                        headers=auth_headers
                    )
                    
                    assert response.status_code == 200
                    data = response.get_json()
                    
                    assert 'receipt' in data
                    assert 'message' in data
                    
                    # Verify service was called correctly
                    mock_toggle.assert_called_once_with(
                        receipt.id,
                        fee_line_item.id,
                        test_user.id
                    )


class TestErrorHandling:
    """Test error handling across all endpoints."""

    def test_invalid_json_payload(self, client, app, test_user, auth_headers):
        """Test handling of invalid JSON payloads."""
        with app.app_context():
            with patch('src.routes.receipt_routes.get_current_user') as mock_get_user:
                mock_get_user.return_value = test_user
                
                response = client.post(
                    '/api/receipts/draft',
                    data='invalid json',
                    headers=auth_headers
                )
                
                assert response.status_code == 400

    def test_missing_content_type(self, client, app, test_user):
        """Test handling of missing content type header."""
        with app.app_context():
            with patch('src.routes.receipt_routes.get_current_user') as mock_get_user:
                mock_get_user.return_value = test_user
                
                payload = {'fuel_order_id': 1}
                
                response = client.post(
                    '/api/receipts/draft',
                    data=json.dumps(payload),
                    headers={'Authorization': 'Bearer test-token'}
                )
                
                # Should handle missing content-type gracefully
                assert response.status_code in [400, 415]

    def test_database_error_handling(self, client, app, test_user, auth_headers):
        """Test handling of database errors."""
        with app.app_context():
            with patch('src.routes.receipt_routes.get_current_user') as mock_get_user:
                with patch('src.services.receipt_service.ReceiptService.create_draft_from_fuel_order') as mock_create:
                    mock_get_user.return_value = test_user
                    mock_create.side_effect = Exception("Database connection error")
                    
                    payload = {'fuel_order_id': 1}
                    
                    response = client.post(
                        '/api/receipts/draft',
                        data=json.dumps(payload),
                        headers=auth_headers
                    )
                    
                    assert response.status_code == 500

    def test_permission_errors(self, client, app, auth_headers):
        """Test handling of permission errors."""
        with app.app_context():
            # Mock user without proper permissions
            unauthorized_user = User(
                email="unauthorized@example.com",
                first_name="Unauthorized",
                last_name="User",
                role="MEMBER"  # Limited role
            )
            
            with patch('src.routes.receipt_routes.get_current_user') as mock_get_user:
                with patch('src.routes.receipt_routes.require_permission') as mock_require_permission:
                    mock_get_user.return_value = unauthorized_user
                    mock_require_permission.side_effect = Exception("Insufficient permissions")
                    
                    payload = {'fuel_order_id': 1}
                    
                    response = client.post(
                        '/api/receipts/draft',
                        data=json.dumps(payload),
                        headers=auth_headers
                    )
                    
                    assert response.status_code in [403, 500]


class TestDataValidation:
    """Test input validation across all endpoints."""

    def test_invalid_fuel_order_id_type(self, client, app, test_user, auth_headers):
        """Test validation of fuel_order_id data type."""
        with app.app_context():
            with patch('src.routes.receipt_routes.get_current_user') as mock_get_user:
                mock_get_user.return_value = test_user
                
                payload = {'fuel_order_id': 'invalid'}
                
                response = client.post(
                    '/api/receipts/draft',
                    data=json.dumps(payload),
                    headers=auth_headers
                )
                
                assert response.status_code == 400

    def test_negative_fuel_order_id(self, client, app, test_user, auth_headers):
        """Test validation of negative fuel_order_id."""
        with app.app_context():
            with patch('src.routes.receipt_routes.get_current_user') as mock_get_user:
                mock_get_user.return_value = test_user
                
                payload = {'fuel_order_id': -1}
                
                response = client.post(
                    '/api/receipts/draft',
                    data=json.dumps(payload),
                    headers=auth_headers
                )
                
                assert response.status_code == 400

    def test_invalid_additional_services_format(self, client, app, test_fuel_order, test_user, 
                                               test_customer, auth_headers):
        """Test validation of additional services format."""
        with app.app_context():
            # Create draft receipt
            receipt = Receipt(
                fuel_order_id=test_fuel_order.id,
                customer_id=test_customer.id,
                status=ReceiptStatus.DRAFT,
                created_by_user_id=test_user.id,
                updated_by_user_id=test_user.id,
                fuel_subtotal=Decimal('0.00'),
                total_fees_amount=Decimal('0.00'),
                total_waivers_amount=Decimal('0.00'),
                tax_amount=Decimal('0.00'),
                grand_total_amount=Decimal('0.00')
            )
            db.session.add(receipt)
            db.session.commit()
            
            with patch('src.routes.receipt_routes.get_current_user') as mock_get_user:
                mock_get_user.return_value = test_user
                
                # Invalid format - missing required fields
                payload = {
                    'additional_services': [
                        {'fee_code': 'GROUND_POWER'}  # Missing quantity
                    ]
                }
                
                response = client.post(
                    f'/api/receipts/{receipt.id}/calculate-fees',
                    data=json.dumps(payload),
                    headers=auth_headers
                )
                
                assert response.status_code == 400

    def test_pagination_parameter_validation(self, client, app, test_user, auth_headers):
        """Test validation of pagination parameters."""
        with app.app_context():
            with patch('src.routes.receipt_routes.get_current_user') as mock_get_user:
                mock_get_user.return_value = test_user
                
                # Invalid page number
                response = client.get(
                    '/api/receipts?page=0',
                    headers=auth_headers
                )
                
                assert response.status_code == 400
                
                # Invalid per_page number
                response = client.get(
                    '/api/receipts?per_page=101',  # Assuming max is 100
                    headers=auth_headers
                )
                
                assert response.status_code == 400


class TestResponseFormats:
    """Test API response formats and schemas."""

    def test_receipt_response_schema(self, client, app, test_fuel_order, test_user, 
                                   test_customer, auth_headers):
        """Test that receipt responses match expected schema."""
        with app.app_context():
            # Create receipt
            receipt = Receipt(
                fuel_order_id=test_fuel_order.id,
                customer_id=test_customer.id,
                status=ReceiptStatus.GENERATED,
                receipt_number="R-20240101-0001",
                created_by_user_id=test_user.id,
                updated_by_user_id=test_user.id,
                fuel_subtotal=Decimal('575.00'),
                total_fees_amount=Decimal('100.00'),
                total_waivers_amount=Decimal('0.00'),
                tax_amount=Decimal('0.00'),
                grand_total_amount=Decimal('675.00'),
                generated_at=datetime.utcnow()
            )
            db.session.add(receipt)
            db.session.commit()
            
            with patch('src.routes.receipt_routes.get_current_user') as mock_get_user:
                mock_get_user.return_value = test_user
                
                response = client.get(
                    f'/api/receipts/{receipt.id}',
                    headers=auth_headers
                )
                
                assert response.status_code == 200
                data = response.get_json()
                
                # Verify response structure
                assert 'receipt' in data
                receipt_data = data['receipt']
                
                # Check required fields
                required_fields = [
                    'id', 'status', 'customer_id', 'fuel_subtotal',
                    'total_fees_amount', 'total_waivers_amount', 
                    'tax_amount', 'grand_total_amount', 'created_at',
                    'updated_at', 'created_by_user_id', 'updated_by_user_id'
                ]
                
                for field in required_fields:
                    assert field in receipt_data
                
                # Check data types
                assert isinstance(receipt_data['id'], int)
                assert isinstance(receipt_data['customer_id'], int)
                assert isinstance(receipt_data['fuel_subtotal'], str)  # Decimal as string
                assert isinstance(receipt_data['is_caa_applied'], bool)

    def test_error_response_schema(self, client, app, test_user, auth_headers):
        """Test that error responses match expected schema."""
        with app.app_context():
            with patch('src.routes.receipt_routes.get_current_user') as mock_get_user:
                mock_get_user.return_value = test_user
                
                response = client.get(
                    '/api/receipts/99999',
                    headers=auth_headers
                )
                
                assert response.status_code == 404
                data = response.get_json()
                
                # Verify error response structure
                assert 'error' in data
                assert isinstance(data['error'], str)
                
                # Optional fields
                if 'details' in data:
                    assert isinstance(data['details'], dict)
                if 'timestamp' in data:
                    assert isinstance(data['timestamp'], str)

    def test_pagination_response_schema(self, client, app, test_user, auth_headers):
        """Test that paginated responses match expected schema."""
        with app.app_context():
            with patch('src.routes.receipt_routes.get_current_user') as mock_get_user:
                mock_get_user.return_value = test_user
                
                response = client.get(
                    '/api/receipts?page=1&per_page=10',
                    headers=auth_headers
                )
                
                assert response.status_code == 200
                data = response.get_json()
                
                # Verify pagination response structure
                assert 'receipts' in data
                assert 'pagination' in data
                
                pagination = data['pagination']
                required_pagination_fields = [
                    'page', 'pages', 'per_page', 'total', 'has_next', 'has_prev'
                ]
                
                for field in required_pagination_fields:
                    assert field in pagination
                
                # Check data types
                assert isinstance(pagination['page'], int)
                assert isinstance(pagination['pages'], int)
                assert isinstance(pagination['per_page'], int)
                assert isinstance(pagination['total'], int)
                assert isinstance(pagination['has_next'], bool)
                assert isinstance(pagination['has_prev'], bool)