"""
Comprehensive test suite for ReceiptService.

Following TDD principles, these tests validate all receipt business logic
and lifecycle operations including creation, calculation, generation, and state transitions.
"""

import pytest
from decimal import Decimal
from datetime import datetime
from unittest.mock import patch, MagicMock

from src.services.receipt_service import ReceiptService
from src.models.receipt import Receipt, ReceiptStatus
from src.models.receipt_line_item import ReceiptLineItem, LineItemType
from src.models.fuel_order import FuelOrder, FuelOrderStatus
from src.models.customer import Customer
from src.models.aircraft import Aircraft
from src.models.aircraft_type import AircraftType
from src.models.fuel_price import FuelPrice, FuelTypeEnum
from src.models.fee_rule import FeeRule
from src.extensions import db


class TestReceiptService:
    """Test suite for ReceiptService business logic."""
    
    @pytest.fixture
    def receipt_service(self):
        """Fixture to provide a ReceiptService instance."""
        return ReceiptService()
    
    @pytest.fixture
    def mock_customer(self):
        """Fixture for test customer."""
        customer = Customer(
            id=1,
            name="Test Customer",
            email="test@example.com",
            is_placeholder=False,
            is_caa_member=False
        )
        return customer
    
    @pytest.fixture
    def mock_aircraft_type(self):
        """Fixture for test aircraft type."""
        aircraft_type = AircraftType(
            id=1,
            name="Light Jet",
            description="Small business jet"
        )
        return aircraft_type
    
    @pytest.fixture
    def mock_aircraft(self, mock_aircraft_type):
        """Fixture for test aircraft."""
        aircraft = Aircraft(
            id=1,
            tail_number="N12345",
            aircraft_type="Light Jet"
        )
        return aircraft
    
    @pytest.fixture
    def mock_completed_fuel_order(self, mock_customer, mock_aircraft):
        """Fixture for completed fuel order."""
        fuel_order = FuelOrder(
            id=1,
            tail_number="N12345",
            fuel_type="JET_A",
            requested_amount=Decimal("100.00"),
            gallons_dispensed=Decimal("100.00"),
            start_meter_reading=Decimal("1000.00"),
            end_meter_reading=Decimal("1100.00"),
            status=FuelOrderStatus.COMPLETED,
            customer_id=1,
            aircraft=mock_aircraft
        )
        return fuel_order
    
    @pytest.fixture
    def mock_fuel_price(self):
        """Fixture for fuel price."""
        fuel_price = FuelPrice(
            fuel_type=FuelTypeEnum.JET_A,
            price=Decimal("5.75"),
            effective_date=datetime.utcnow()
        )
        return fuel_price


class TestCreateDraftFromFuelOrder:
    """Test receipt creation from fuel orders."""
    
    def test_create_draft_receipt_success(self, receipt_service, mock_completed_fuel_order, 
                                        mock_customer, mock_fuel_price):
        """Test successful creation of draft receipt from completed fuel order."""
        with patch('src.models.fuel_order.FuelOrder.query') as mock_query:
            with patch('src.models.customer.Customer.query') as mock_customer_query:
                with patch('src.models.fuel_price.FuelPrice.query') as mock_fuel_price_query:
                    with patch('src.models.receipt.Receipt.query') as mock_receipt_query:
                        with patch('src.extensions.db.session') as mock_session:
                            # Setup mocks
                            mock_query.options.return_value.filter_by.return_value.first.return_value = mock_completed_fuel_order
                            mock_receipt_query.filter_by.return_value.first.return_value = None  # No existing receipt
                            mock_fuel_price_query.filter.return_value.order_by.return_value.first.return_value = mock_fuel_price
                            
                            # Execute
                            receipt = receipt_service.create_draft_from_fuel_order(
                                fuel_order_id=1, 
                                user_id=1
                            )
                            
                            # Verify
                            assert receipt.fuel_order_id == 1
                            assert receipt.status == ReceiptStatus.DRAFT
                            assert receipt.fuel_quantity_gallons_at_receipt_time == Decimal("100.00")
                            assert receipt.fuel_unit_price_at_receipt_time == Decimal("5.75")
                            assert receipt.fuel_subtotal == Decimal("575.00")
                            assert receipt.grand_total_amount == Decimal("575.00")
                            
                            # Verify database operations
                            mock_session.add.assert_called()
                            mock_session.commit.assert_called()
    
    def test_create_draft_receipt_fuel_order_not_found(self, receipt_service):
        """Test error when fuel order doesn't exist."""
        with patch('src.models.fuel_order.FuelOrder.query') as mock_query:
            mock_query.options.return_value.filter_by.return_value.first.return_value = None
            
            with pytest.raises(ValueError, match="Fuel order with ID 999 not found"):
                receipt_service.create_draft_from_fuel_order(fuel_order_id=999, user_id=1)
    
    def test_create_draft_receipt_fuel_order_not_completed(self, receipt_service):
        """Test error when fuel order is not completed."""
        incomplete_order = FuelOrder(
            id=1,
            status=FuelOrderStatus.CREATED
        )
        
        with patch('src.models.fuel_order.FuelOrder.query') as mock_query:
            mock_query.options.return_value.filter_by.return_value.first.return_value = incomplete_order
            
            with pytest.raises(ValueError, match="Cannot create receipt for fuel order with status CREATED"):
                receipt_service.create_draft_from_fuel_order(fuel_order_id=1, user_id=1)
    
    def test_create_draft_receipt_already_exists(self, receipt_service, mock_completed_fuel_order):
        """Test error when receipt already exists for fuel order."""
        existing_receipt = Receipt(id=1, fuel_order_id=1)
        
        with patch('src.models.fuel_order.FuelOrder.query') as mock_fuel_order_query:
            with patch('src.models.receipt.Receipt.query') as mock_receipt_query:
                mock_fuel_order_query.options.return_value.filter_by.return_value.first.return_value = mock_completed_fuel_order
                mock_receipt_query.filter_by.return_value.first.return_value = existing_receipt
                
                with pytest.raises(ValueError, match="Fuel order 1 already has a receipt"):
                    receipt_service.create_draft_from_fuel_order(fuel_order_id=1, user_id=1)
    
    def test_create_draft_receipt_missing_aircraft(self, receipt_service):
        """Test error when fuel order has no aircraft record."""
        fuel_order_no_aircraft = FuelOrder(
            id=1,
            tail_number="N12345",
            status=FuelOrderStatus.COMPLETED,
            aircraft=None
        )
        
        with patch('src.models.fuel_order.FuelOrder.query') as mock_query:
            with patch('src.models.receipt.Receipt.query') as mock_receipt_query:
                mock_query.options.return_value.filter_by.return_value.first.return_value = fuel_order_no_aircraft
                mock_receipt_query.filter_by.return_value.first.return_value = None
                
                with pytest.raises(ValueError, match="Data integrity error"):
                    receipt_service.create_draft_from_fuel_order(fuel_order_id=1, user_id=1)
    
    def test_create_draft_receipt_creates_placeholder_customer(self, receipt_service, mock_fuel_price):
        """Test creating placeholder customer when fuel order has no customer."""
        fuel_order_no_customer = FuelOrder(
            id=1,
            tail_number="N12345",
            status=FuelOrderStatus.COMPLETED,
            customer_id=None,
            gallons_dispensed=Decimal("100.00"),
            aircraft=Aircraft(tail_number="N12345", aircraft_type="Light Jet")
        )
        
        with patch('src.models.fuel_order.FuelOrder.query') as mock_fuel_order_query:
            with patch('src.models.receipt.Receipt.query') as mock_receipt_query:
                with patch('src.models.customer.Customer.query') as mock_customer_query:
                    with patch('src.models.fuel_price.FuelPrice.query') as mock_fuel_price_query:
                        with patch('src.extensions.db.session') as mock_session:
                            # Setup mocks
                            mock_fuel_order_query.options.return_value.filter_by.return_value.first.return_value = fuel_order_no_customer
                            mock_receipt_query.filter_by.return_value.first.return_value = None
                            mock_customer_query.filter_by.return_value.first.return_value = None  # No existing placeholder
                            mock_fuel_price_query.filter.return_value.order_by.return_value.first.return_value = mock_fuel_price
                            
                            # Execute
                            receipt = receipt_service.create_draft_from_fuel_order(fuel_order_id=1, user_id=1)
                            
                            # Verify placeholder customer was created
                            assert mock_session.add.call_count >= 2  # Receipt + Customer + LineItem
                            
                            # Verify the customer creation arguments
                            customer_calls = [call for call in mock_session.add.call_args_list 
                                            if isinstance(call[0][0], Customer)]
                            assert len(customer_calls) == 1
                            
                            created_customer = customer_calls[0][0][0]
                            assert created_customer.name == "N12345"
                            assert created_customer.email == "n12345@placeholder.invalid"
                            assert created_customer.is_placeholder is True


class TestUpdateDraft:
    """Test draft receipt updates."""
    
    def test_update_draft_receipt_success(self, receipt_service):
        """Test successful update of draft receipt."""
        draft_receipt = Receipt(
            id=1,
            status=ReceiptStatus.DRAFT,
            customer_id=1
        )
        
        valid_customer = Customer(id=2, name="New Customer")
        
        with patch('src.models.receipt.Receipt.query') as mock_receipt_query:
            with patch('src.models.customer.Customer.query') as mock_customer_query:
                with patch('src.extensions.db.session') as mock_session:
                    mock_receipt_query.filter_by.return_value.first.return_value = draft_receipt
                    mock_customer_query.get.return_value = valid_customer
                    
                    update_data = {
                        'customer_id': 2,
                        'aircraft_type': 'Heavy Jet',
                        'notes': 'Test notes'
                    }
                    
                    # Execute
                    updated_receipt = receipt_service.update_draft(
                        receipt_id=1, 
                        update_data=update_data, 
                        user_id=1
                    )
                    
                    # Verify
                    assert updated_receipt.customer_id == 2
                    assert updated_receipt.aircraft_type_at_receipt_time == 'Heavy Jet'
                    assert updated_receipt.notes == 'Test notes'
                    assert updated_receipt.updated_by_user_id == 1
                    mock_session.commit.assert_called_once()
    
    def test_update_draft_receipt_not_found(self, receipt_service):
        """Test error when receipt doesn't exist."""
        with patch('src.models.receipt.Receipt.query') as mock_query:
            mock_query.filter_by.return_value.first.return_value = None
            
            with pytest.raises(ValueError, match="Receipt 999 not found"):
                receipt_service.update_draft(receipt_id=999, update_data={}, user_id=1)
    
    def test_update_draft_receipt_wrong_status(self, receipt_service):
        """Test error when receipt is not in draft status."""
        generated_receipt = Receipt(
            id=1,
            status=ReceiptStatus.GENERATED
        )
        
        with patch('src.models.receipt.Receipt.query') as mock_query:
            mock_query.filter_by.return_value.first.return_value = generated_receipt
            
            with pytest.raises(ValueError, match="Cannot update receipt with status GENERATED"):
                receipt_service.update_draft(receipt_id=1, update_data={}, user_id=1)
    
    def test_update_draft_receipt_invalid_customer(self, receipt_service):
        """Test error when customer doesn't exist."""
        draft_receipt = Receipt(id=1, status=ReceiptStatus.DRAFT)
        
        with patch('src.models.receipt.Receipt.query') as mock_receipt_query:
            with patch('src.models.customer.Customer.query') as mock_customer_query:
                mock_receipt_query.filter_by.return_value.first.return_value = draft_receipt
                mock_customer_query.get.return_value = None
                
                update_data = {'customer_id': 999}
                
                with pytest.raises(ValueError, match="Customer 999 not found"):
                    receipt_service.update_draft(receipt_id=1, update_data=update_data, user_id=1)


class TestCalculateAndUpdateDraft:
    """Test fee calculation and draft updates."""
    
    def test_calculate_fees_success(self, receipt_service, mock_customer, mock_aircraft_type):
        """Test successful fee calculation for draft receipt."""
        draft_receipt = Receipt(
            id=1,
            status=ReceiptStatus.DRAFT,
            customer_id=1,
            fuel_order_id=1,
            aircraft_type_at_receipt_time="Light Jet",
            fuel_type_at_receipt_time="JET_A",
            fuel_quantity_gallons_at_receipt_time=Decimal("100.00"),
            customer=mock_customer
        )
        
        mock_fuel_order = FuelOrder(
            id=1,
            aircraft=Aircraft(tail_number="N12345")
        )
        draft_receipt.fuel_order = mock_fuel_order
        
        # Mock fee calculation result
        mock_calculation_result = MagicMock()
        mock_calculation_result.line_items = []
        mock_calculation_result.fuel_subtotal = Decimal("575.00")
        mock_calculation_result.total_fees_amount = Decimal("100.00")
        mock_calculation_result.total_waivers_amount = Decimal("0.00")
        mock_calculation_result.tax_amount = Decimal("0.00")
        mock_calculation_result.grand_total_amount = Decimal("675.00")
        mock_calculation_result.is_caa_applied = False
        
        with patch('src.models.receipt.Receipt.query') as mock_receipt_query:
            with patch('src.models.aircraft_type.AircraftType.query') as mock_aircraft_type_query:
                with patch('src.models.receipt_line_item.ReceiptLineItem.query') as mock_line_item_query:
                    with patch.object(receipt_service, 'fee_calculation_service') as mock_fee_service:
                        with patch.object(receipt_service, '_get_fuel_price') as mock_fuel_price:
                            with patch('src.extensions.db.session') as mock_session:
                                # Setup mocks
                                mock_receipt_query.options.return_value.filter_by.return_value.first.return_value = draft_receipt
                                mock_aircraft_type_query.filter_by.return_value.first.return_value = mock_aircraft_type
                                mock_fee_service.calculate_for_transaction.return_value = mock_calculation_result
                                mock_fuel_price.return_value = Decimal("5.75")
                                
                                # Execute
                                updated_receipt = receipt_service.calculate_and_update_draft(receipt_id=1)
                                
                                # Verify
                                assert updated_receipt.fuel_subtotal == Decimal("575.00")
                                assert updated_receipt.total_fees_amount == Decimal("100.00")
                                assert updated_receipt.grand_total_amount == Decimal("675.00")
                                assert updated_receipt.is_caa_applied is False
                                
                                # Verify fee calculation was called
                                mock_fee_service.calculate_for_transaction.assert_called_once()
                                mock_session.commit.assert_called_once()
    
    def test_calculate_fees_receipt_not_found(self, receipt_service):
        """Test error when receipt doesn't exist."""
        with patch('src.models.receipt.Receipt.query') as mock_query:
            mock_query.options.return_value.filter_by.return_value.first.return_value = None
            
            with pytest.raises(ValueError, match="Receipt 999 not found"):
                receipt_service.calculate_and_update_draft(receipt_id=999)
    
    def test_calculate_fees_wrong_status(self, receipt_service):
        """Test error when receipt is not in draft status."""
        generated_receipt = Receipt(
            id=1,
            status=ReceiptStatus.GENERATED
        )
        
        with patch('src.models.receipt.Receipt.query') as mock_query:
            mock_query.options.return_value.filter_by.return_value.first.return_value = generated_receipt
            
            with pytest.raises(ValueError, match="Cannot calculate fees for receipt with status GENERATED"):
                receipt_service.calculate_and_update_draft(receipt_id=1)
    
    def test_calculate_fees_missing_fuel_order(self, receipt_service):
        """Test error when receipt has no fuel order."""
        draft_receipt = Receipt(
            id=1,
            status=ReceiptStatus.DRAFT,
            fuel_order=None
        )
        
        with patch('src.models.receipt.Receipt.query') as mock_query:
            mock_query.options.return_value.filter_by.return_value.first.return_value = draft_receipt
            
            with pytest.raises(ValueError, match="Receipt must have an associated fuel order"):
                receipt_service.calculate_and_update_draft(receipt_id=1)
    
    def test_calculate_fees_missing_fuel_quantity(self, receipt_service):
        """Test error when receipt has no fuel quantity."""
        draft_receipt = Receipt(
            id=1,
            status=ReceiptStatus.DRAFT,
            fuel_order=FuelOrder(id=1),
            fuel_quantity_gallons_at_receipt_time=None
        )
        
        with patch('src.models.receipt.Receipt.query') as mock_query:
            mock_query.options.return_value.filter_by.return_value.first.return_value = draft_receipt
            
            with pytest.raises(ValueError, match="Receipt must have fuel quantity"):
                receipt_service.calculate_and_update_draft(receipt_id=1)
    
    def test_calculate_fees_missing_aircraft_type(self, receipt_service):
        """Test error when receipt has no aircraft type."""
        draft_receipt = Receipt(
            id=1,
            status=ReceiptStatus.DRAFT,
            fuel_order=FuelOrder(id=1),
            fuel_quantity_gallons_at_receipt_time=Decimal("100.00"),
            aircraft_type_at_receipt_time=None
        )
        
        with patch('src.models.receipt.Receipt.query') as mock_query:
            mock_query.options.return_value.filter_by.return_value.first.return_value = draft_receipt
            
            with pytest.raises(ValueError, match="Aircraft type information is required"):
                receipt_service.calculate_and_update_draft(receipt_id=1)
    
    def test_calculate_fees_aircraft_type_not_found(self, receipt_service):
        """Test error when aircraft type doesn't exist in system."""
        draft_receipt = Receipt(
            id=1,
            status=ReceiptStatus.DRAFT,
            fuel_order=FuelOrder(id=1),
            fuel_quantity_gallons_at_receipt_time=Decimal("100.00"),
            aircraft_type_at_receipt_time="Unknown Type"
        )
        
        with patch('src.models.receipt.Receipt.query') as mock_receipt_query:
            with patch('src.models.aircraft_type.AircraftType.query') as mock_aircraft_type_query:
                mock_receipt_query.options.return_value.filter_by.return_value.first.return_value = draft_receipt
                mock_aircraft_type_query.filter_by.return_value.first.return_value = None
                
                with pytest.raises(ValueError, match="Aircraft type 'Unknown Type' not found"):
                    receipt_service.calculate_and_update_draft(receipt_id=1)


class TestGenerateReceipt:
    """Test receipt generation (finalization)."""
    
    def test_generate_receipt_success(self, receipt_service):
        """Test successful receipt generation."""
        draft_receipt = Receipt(
            id=1,
            status=ReceiptStatus.DRAFT,
            grand_total_amount=Decimal("675.00")
        )
        
        with patch('src.models.receipt.Receipt.query') as mock_receipt_query:
            with patch('src.models.receipt_line_item.ReceiptLineItem.query') as mock_line_item_query:
                with patch.object(receipt_service, '_generate_receipt_number') as mock_generate_number:
                    with patch('src.extensions.db.session') as mock_session:
                        # Setup mocks
                        mock_receipt_query.filter_by.return_value.first.return_value = draft_receipt
                        mock_line_item_query.filter_by.return_value.count.return_value = 2  # Has line items
                        mock_generate_number.return_value = "R-20240101-0001"
                        
                        # Execute
                        generated_receipt = receipt_service.generate_receipt(receipt_id=1)
                        
                        # Verify
                        assert generated_receipt.receipt_number == "R-20240101-0001"
                        assert generated_receipt.status == ReceiptStatus.GENERATED
                        assert generated_receipt.generated_at is not None
                        mock_session.commit.assert_called_once()
    
    def test_generate_receipt_not_found(self, receipt_service):
        """Test error when receipt doesn't exist."""
        with patch('src.models.receipt.Receipt.query') as mock_query:
            mock_query.filter_by.return_value.first.return_value = None
            
            with pytest.raises(ValueError, match="Receipt 999 not found"):
                receipt_service.generate_receipt(receipt_id=999)
    
    def test_generate_receipt_wrong_status(self, receipt_service):
        """Test error when receipt is not in draft status."""
        generated_receipt = Receipt(
            id=1,
            status=ReceiptStatus.GENERATED
        )
        
        with patch('src.models.receipt.Receipt.query') as mock_query:
            mock_query.filter_by.return_value.first.return_value = generated_receipt
            
            with pytest.raises(ValueError, match="Cannot generate receipt with status GENERATED"):
                receipt_service.generate_receipt(receipt_id=1)
    
    def test_generate_receipt_uncalculated_fees(self, receipt_service):
        """Test error when receipt has no calculated fees."""
        draft_receipt = Receipt(
            id=1,
            status=ReceiptStatus.DRAFT,
            grand_total_amount=Decimal("0.00")
        )
        
        with patch('src.models.receipt.Receipt.query') as mock_receipt_query:
            with patch('src.models.receipt_line_item.ReceiptLineItem.query') as mock_line_item_query:
                mock_receipt_query.filter_by.return_value.first.return_value = draft_receipt
                mock_line_item_query.filter_by.return_value.count.return_value = 0  # No line items
                
                with pytest.raises(ValueError, match="Cannot generate a receipt with uncalculated fees"):
                    receipt_service.generate_receipt(receipt_id=1)


class TestMarkAsPaid:
    """Test marking receipts as paid."""
    
    def test_mark_as_paid_success(self, receipt_service):
        """Test successful marking of receipt as paid."""
        generated_receipt = Receipt(
            id=1,
            receipt_number="R-20240101-0001",
            status=ReceiptStatus.GENERATED
        )
        
        with patch('src.models.receipt.Receipt.query') as mock_query:
            with patch('src.extensions.db.session') as mock_session:
                mock_query.filter_by.return_value.first.return_value = generated_receipt
                
                # Execute
                paid_receipt = receipt_service.mark_as_paid(receipt_id=1)
                
                # Verify
                assert paid_receipt.status == ReceiptStatus.PAID
                assert paid_receipt.paid_at is not None
                mock_session.commit.assert_called_once()
    
    def test_mark_as_paid_receipt_not_found(self, receipt_service):
        """Test error when receipt doesn't exist."""
        with patch('src.models.receipt.Receipt.query') as mock_query:
            mock_query.filter_by.return_value.first.return_value = None
            
            with pytest.raises(ValueError, match="Receipt 999 not found"):
                receipt_service.mark_as_paid(receipt_id=999)
    
    def test_mark_as_paid_wrong_status(self, receipt_service):
        """Test error when receipt is not in generated status."""
        draft_receipt = Receipt(
            id=1,
            status=ReceiptStatus.DRAFT
        )
        
        with patch('src.models.receipt.Receipt.query') as mock_query:
            mock_query.filter_by.return_value.first.return_value = draft_receipt
            
            with pytest.raises(ValueError, match="Cannot mark receipt as paid. Current status: DRAFT"):
                receipt_service.mark_as_paid(receipt_id=1)


class TestVoidReceipt:
    """Test voiding receipts."""
    
    def test_void_receipt_success(self, receipt_service):
        """Test successful voiding of receipt."""
        generated_receipt = Receipt(
            id=1,
            receipt_number="R-20240101-0001",
            status=ReceiptStatus.GENERATED
        )
        
        with patch('src.models.receipt.Receipt.query') as mock_query:
            with patch('src.models.audit_log.AuditLog') as mock_audit_log:
                with patch('src.extensions.db.session') as mock_session:
                    mock_query.get.return_value = generated_receipt
                    
                    # Execute
                    voided_receipt = receipt_service.void_receipt(
                        receipt_id=1, 
                        user_id=1, 
                        reason="Customer request"
                    )
                    
                    # Verify
                    assert voided_receipt.status == ReceiptStatus.VOID
                    assert voided_receipt.updated_by_user_id == 1
                    
                    # Verify audit log was created
                    mock_audit_log.assert_called_once()
                    mock_session.add.assert_called()
                    mock_session.commit.assert_called_once()
    
    def test_void_receipt_not_found(self, receipt_service):
        """Test error when receipt doesn't exist."""
        with patch('src.models.receipt.Receipt.query') as mock_query:
            mock_query.get.return_value = None
            
            with pytest.raises(ValueError, match="Receipt 999 not found"):
                receipt_service.void_receipt(receipt_id=999, user_id=1)
    
    def test_void_receipt_wrong_status(self, receipt_service):
        """Test error when receipt cannot be voided."""
        draft_receipt = Receipt(
            id=1,
            status=ReceiptStatus.DRAFT
        )
        
        with patch('src.models.receipt.Receipt.query') as mock_query:
            mock_query.get.return_value = draft_receipt
            
            with pytest.raises(ValueError, match="Cannot void receipt with status DRAFT"):
                receipt_service.void_receipt(receipt_id=1, user_id=1)


class TestGetFuelPrice:
    """Test fuel price retrieval logic."""
    
    def test_get_fuel_price_success(self, receipt_service):
        """Test successful fuel price retrieval."""
        mock_fuel_price = FuelPrice(
            fuel_type=FuelTypeEnum.JET_A,
            price=Decimal("5.75"),
            effective_date=datetime.utcnow()
        )
        
        with patch('src.models.fuel_price.FuelPrice.query') as mock_query:
            mock_query.filter.return_value.order_by.return_value.first.return_value = mock_fuel_price
            
            price = receipt_service._get_fuel_price("JET_A")
            
            assert price == Decimal("5.75")
    
    def test_get_fuel_price_fallback(self, receipt_service):
        """Test fallback price when no fuel price found."""
        with patch('src.models.fuel_price.FuelPrice.query') as mock_query:
            mock_query.filter.return_value.order_by.return_value.first.return_value = None
            
            price = receipt_service._get_fuel_price("JET_A")
            
            assert price == Decimal("5.75")  # Fallback price
    
    def test_get_fuel_price_normalize_variations(self, receipt_service):
        """Test fuel type normalization for common variations."""
        mock_fuel_price = FuelPrice(
            fuel_type=FuelTypeEnum.JET_A,
            price=Decimal("5.75")
        )
        
        with patch('src.models.fuel_price.FuelPrice.query') as mock_query:
            mock_query.filter.return_value.order_by.return_value.first.return_value = mock_fuel_price
            
            # Test various fuel type variations
            variations = ["jet_a", "JET-A", "jet a", "JET"]
            for variation in variations:
                price = receipt_service._get_fuel_price(variation)
                assert price == Decimal("5.75")


class TestGenerateReceiptNumber:
    """Test receipt number generation."""
    
    def test_generate_receipt_number_first_today(self, receipt_service):
        """Test receipt number generation for first receipt of the day."""
        with patch('src.models.receipt.Receipt.query') as mock_query:
            mock_query.filter.return_value.order_by.return_value.first.return_value = None
            
            receipt_number = receipt_service._generate_receipt_number()
            
            # Should be in format R-YYYYMMDD-0001
            assert receipt_number.startswith("R-")
            assert receipt_number.endswith("-0001")
            assert len(receipt_number) == 16  # R-YYYYMMDD-0001
    
    def test_generate_receipt_number_increment(self, receipt_service):
        """Test receipt number generation increments correctly."""
        mock_latest_receipt = Receipt(receipt_number="R-20240101-0005")
        
        with patch('src.models.receipt.Receipt.query') as mock_query:
            mock_query.filter.return_value.order_by.return_value.first.return_value = mock_latest_receipt
            
            receipt_number = receipt_service._generate_receipt_number()
            
            assert receipt_number.endswith("-0006")


class TestToggleLineItemWaiver:
    """Test manual line item waiver functionality."""
    
    def test_toggle_waiver_add_success(self, receipt_service):
        """Test successfully adding a manual waiver."""
        draft_receipt = Receipt(id=1, status=ReceiptStatus.DRAFT)
        fee_line_item = ReceiptLineItem(
            id=1,
            receipt_id=1,
            line_item_type=LineItemType.FEE,
            fee_code_applied="RAMP_FEE",
            amount=Decimal("100.00")
        )
        fee_rule = FeeRule(
            fee_code="RAMP_FEE",
            is_manually_waivable=True
        )
        
        with patch('src.models.receipt.Receipt.query') as mock_receipt_query:
            with patch('src.models.receipt_line_item.ReceiptLineItem.query') as mock_line_item_query:
                with patch('src.models.fee_rule.FeeRule.query') as mock_fee_rule_query:
                    with patch.object(receipt_service, '_recalculate_receipt_totals') as mock_recalc:
                        with patch('src.extensions.db.session') as mock_session:
                            # Setup mocks
                            mock_receipt_query.filter_by.return_value.first.return_value = draft_receipt
                            mock_line_item_query.filter_by.return_value.first.side_effect = [
                                fee_line_item,  # Fee line item
                                None  # No existing waiver
                            ]
                            mock_fee_rule_query.filter_by.return_value.first.return_value = fee_rule
                            
                            # Execute
                            updated_receipt = receipt_service.toggle_line_item_waiver(
                                receipt_id=1,
                                line_item_id=1,
                                user_id=1
                            )
                            
                            # Verify waiver was created
                            mock_session.add.assert_called()
                            mock_recalc.assert_called_once_with(draft_receipt)
                            mock_session.commit.assert_called_once()
    
    def test_toggle_waiver_remove_success(self, receipt_service):
        """Test successfully removing an existing waiver."""
        draft_receipt = Receipt(id=1, status=ReceiptStatus.DRAFT)
        fee_line_item = ReceiptLineItem(
            id=1,
            receipt_id=1,
            line_item_type=LineItemType.FEE,
            fee_code_applied="RAMP_FEE",
            amount=Decimal("100.00")
        )
        existing_waiver = ReceiptLineItem(
            id=2,
            receipt_id=1,
            line_item_type=LineItemType.WAIVER,
            fee_code_applied="RAMP_FEE",
            amount=Decimal("-100.00")
        )
        fee_rule = FeeRule(
            fee_code="RAMP_FEE",
            is_manually_waivable=True
        )
        
        with patch('src.models.receipt.Receipt.query') as mock_receipt_query:
            with patch('src.models.receipt_line_item.ReceiptLineItem.query') as mock_line_item_query:
                with patch('src.models.fee_rule.FeeRule.query') as mock_fee_rule_query:
                    with patch.object(receipt_service, '_recalculate_receipt_totals') as mock_recalc:
                        with patch('src.extensions.db.session') as mock_session:
                            # Setup mocks
                            mock_receipt_query.filter_by.return_value.first.return_value = draft_receipt
                            mock_line_item_query.filter_by.return_value.first.side_effect = [
                                fee_line_item,  # Fee line item
                                existing_waiver  # Existing waiver
                            ]
                            mock_fee_rule_query.filter_by.return_value.first.return_value = fee_rule
                            
                            # Execute
                            updated_receipt = receipt_service.toggle_line_item_waiver(
                                receipt_id=1,
                                line_item_id=1,
                                user_id=1
                            )
                            
                            # Verify waiver was removed
                            mock_session.delete.assert_called_with(existing_waiver)
                            mock_recalc.assert_called_once_with(draft_receipt)
                            mock_session.commit.assert_called_once()
    
    def test_toggle_waiver_receipt_not_found(self, receipt_service):
        """Test error when receipt doesn't exist."""
        with patch('src.models.receipt.Receipt.query') as mock_query:
            mock_query.filter_by.return_value.first.return_value = None
            
            with pytest.raises(ValueError, match="Receipt 999 not found"):
                receipt_service.toggle_line_item_waiver(
                    receipt_id=999,
                    line_item_id=1,
                    user_id=1
                )
    
    def test_toggle_waiver_wrong_status(self, receipt_service):
        """Test error when receipt is not in draft status."""
        generated_receipt = Receipt(id=1, status=ReceiptStatus.GENERATED)
        
        with patch('src.models.receipt.Receipt.query') as mock_query:
            mock_query.filter_by.return_value.first.return_value = generated_receipt
            
            with pytest.raises(ValueError, match="Cannot modify waivers on receipt with status GENERATED"):
                receipt_service.toggle_line_item_waiver(
                    receipt_id=1,
                    line_item_id=1,
                    user_id=1
                )
    
    def test_toggle_waiver_fee_not_found(self, receipt_service):
        """Test error when fee line item doesn't exist."""
        draft_receipt = Receipt(id=1, status=ReceiptStatus.DRAFT)
        
        with patch('src.models.receipt.Receipt.query') as mock_receipt_query:
            with patch('src.models.receipt_line_item.ReceiptLineItem.query') as mock_line_item_query:
                mock_receipt_query.filter_by.return_value.first.return_value = draft_receipt
                mock_line_item_query.filter_by.return_value.first.return_value = None
                
                with pytest.raises(ValueError, match="Fee line item 999 not found"):
                    receipt_service.toggle_line_item_waiver(
                        receipt_id=1,
                        line_item_id=999,
                        user_id=1
                    )
    
    def test_toggle_waiver_fee_not_waivable(self, receipt_service):
        """Test error when fee is not waivable."""
        draft_receipt = Receipt(id=1, status=ReceiptStatus.DRAFT)
        fee_line_item = ReceiptLineItem(
            id=1,
            receipt_id=1,
            line_item_type=LineItemType.FEE,
            fee_code_applied="NON_WAIVABLE_FEE"
        )
        fee_rule = FeeRule(
            fee_code="NON_WAIVABLE_FEE",
            is_manually_waivable=False
        )
        
        with patch('src.models.receipt.Receipt.query') as mock_receipt_query:
            with patch('src.models.receipt_line_item.ReceiptLineItem.query') as mock_line_item_query:
                with patch('src.models.fee_rule.FeeRule.query') as mock_fee_rule_query:
                    mock_receipt_query.filter_by.return_value.first.return_value = draft_receipt
                    mock_line_item_query.filter_by.return_value.first.return_value = fee_line_item
                    mock_fee_rule_query.filter_by.return_value.first.return_value = fee_rule
                    
                    with pytest.raises(ValueError, match="Fee 'NON_WAIVABLE_FEE' is not manually waivable"):
                        receipt_service.toggle_line_item_waiver(
                            receipt_id=1,
                            line_item_id=1,
                            user_id=1
                        )


class TestRecalculateReceiptTotals:
    """Test receipt totals recalculation."""
    
    def test_recalculate_totals_success(self, receipt_service):
        """Test successful recalculation of receipt totals."""
        receipt = Receipt(id=1)
        
        line_items = [
            ReceiptLineItem(
                line_item_type=LineItemType.FUEL,
                amount=Decimal("575.00")
            ),
            ReceiptLineItem(
                line_item_type=LineItemType.FEE,
                amount=Decimal("100.00")
            ),
            ReceiptLineItem(
                line_item_type=LineItemType.WAIVER,
                amount=Decimal("-50.00")
            ),
            ReceiptLineItem(
                line_item_type=LineItemType.TAX,
                amount=Decimal("25.00")
            )
        ]
        
        with patch('src.models.receipt_line_item.ReceiptLineItem.query') as mock_query:
            mock_query.filter_by.return_value.all.return_value = line_items
            
            # Execute
            receipt_service._recalculate_receipt_totals(receipt)
            
            # Verify
            assert receipt.fuel_subtotal == Decimal("575.00")
            assert receipt.total_fees_amount == Decimal("100.00")
            assert receipt.total_waivers_amount == Decimal("-50.00")
            assert receipt.tax_amount == Decimal("25.00")
            assert receipt.grand_total_amount == Decimal("650.00")  # 575 + 100 - 50 + 25