"""
Unit tests for Receipt Service

Tests the core business logic for receipt lifecycle management,
focusing on fee calculation and aircraft type handling.
"""

import pytest
from unittest.mock import Mock, MagicMock, patch
from decimal import Decimal
from datetime import datetime

from src.services.receipt_service import ReceiptService
from src.services.fee_calculation_service import FeeCalculationContext, FeeCalculationResult, FeeCalculationResultLineItem
from src.models.receipt import Receipt, ReceiptStatus
from src.models.aircraft_type import AircraftType


class TestReceiptService:
    """Test cases for Receipt Service"""
    
    def setup_method(self):
        """Set up test fixtures"""
        self.receipt_service = ReceiptService()
    
    @patch('src.services.receipt_service.Receipt.query')
    @patch('src.services.receipt_service.AircraftType.query')
    @patch('src.services.receipt_service.ReceiptLineItem.query')
    @patch('src.services.receipt_service.db.session')
    def test_calculate_and_update_draft_uses_correct_aircraft_type(
        self, mock_db_session, mock_line_item_query, mock_aircraft_type_query, mock_receipt_query, app, db
    ):
        """
        Test that calculate_and_update_draft uses the correct aircraft type from the receipt,
        not the first aircraft type in the database.
        
        This test validates the fix for Task 1.1 where the method was incorrectly using
        AircraftType.query.first() instead of the receipt's aircraft_type_at_receipt_time.
        """
        with app.app_context():
            # Create two different aircraft types
            first_aircraft_type = Mock(spec=AircraftType)
            first_aircraft_type.id = 1
            first_aircraft_type.name = "Cessna 172"
            
            second_aircraft_type = Mock(spec=AircraftType)
            second_aircraft_type.id = 2
            second_aircraft_type.name = "Citation CJ3"
            
            # Create a receipt linked to the SECOND aircraft type
            mock_receipt = Mock(spec=Receipt)
            mock_receipt.id = 123
            mock_receipt.status = ReceiptStatus.DRAFT
            mock_receipt.fuel_order = Mock()
            mock_receipt.fuel_quantity_gallons_at_receipt_time = Decimal('100.0')
            mock_receipt.aircraft_type_at_receipt_time = "Citation CJ3"  # This should be used
            mock_receipt.fuel_type_at_receipt_time = "Jet A"
            mock_receipt.customer_id = 456
            
            # Mock database queries
            mock_receipt_query.options.return_value.filter_by.return_value.first.return_value = mock_receipt
            mock_aircraft_type_query.filter_by.return_value.first.return_value = second_aircraft_type
            mock_line_item_query.filter_by.return_value.delete.return_value = None
            
            # Mock the fee calculation service
            mock_calculation_result = Mock(spec=FeeCalculationResult)
            mock_calculation_result.line_items = []
            mock_calculation_result.fuel_subtotal = Decimal('550.00')
            mock_calculation_result.total_fees_amount = Decimal('100.00')
            mock_calculation_result.total_waivers_amount = Decimal('0.00')
            mock_calculation_result.tax_amount = Decimal('52.00')
            mock_calculation_result.grand_total_amount = Decimal('702.00')
            mock_calculation_result.is_caa_applied = False
            
            with patch.object(self.receipt_service.fee_calculation_service, 'calculate_for_transaction') as mock_calculate:
                mock_calculate.return_value = mock_calculation_result
                
                # Call the method
                result = self.receipt_service.calculate_and_update_draft(
                    receipt_id=123,
                    fbo_location_id=1
                )
                
                # Verify that the aircraft type query used filter_by with the correct name
                mock_aircraft_type_query.filter_by.assert_called_once_with(name="Citation CJ3")
                
                # Verify that the FeeCalculationContext was created with the SECOND aircraft type's ID
                mock_calculate.assert_called_once()
                call_args = mock_calculate.call_args[0][0]  # Get the FeeCalculationContext
                assert isinstance(call_args, FeeCalculationContext)
                assert call_args.aircraft_type_id == 2  # Should be second aircraft type, not first
                assert call_args.fbo_location_id == 1
                assert call_args.customer_id == 456
                assert call_args.fuel_uplift_gallons == Decimal('100.0')
                
                # Verify the receipt was returned
                assert result == mock_receipt
    
    @patch('src.services.receipt_service.Receipt.query')
    @patch('src.services.receipt_service.AircraftType.query')
    def test_calculate_and_update_draft_aircraft_type_not_found(
        self, mock_aircraft_type_query, mock_receipt_query, app, db
    ):
        """
        Test that calculate_and_update_draft raises ValueError when aircraft type is not found.
        """
        with app.app_context():
            # Create a receipt with non-existent aircraft type
            mock_receipt = Mock(spec=Receipt)
            mock_receipt.id = 123
            mock_receipt.status = ReceiptStatus.DRAFT
            mock_receipt.fuel_order = Mock()
            mock_receipt.fuel_quantity_gallons_at_receipt_time = Decimal('100.0')
            mock_receipt.aircraft_type_at_receipt_time = "Nonexistent Aircraft"
            mock_receipt.fuel_type_at_receipt_time = "Jet A"
            mock_receipt.customer_id = 456
            
            # Mock database queries
            mock_receipt_query.options.return_value.filter_by.return_value.first.return_value = mock_receipt
            mock_aircraft_type_query.filter_by.return_value.first.return_value = None  # Not found
            
            # Expect ValueError to be raised
            with pytest.raises(ValueError, match="Aircraft type 'Nonexistent Aircraft' not found in system configuration"):
                self.receipt_service.calculate_and_update_draft(
                    receipt_id=123,
                    fbo_location_id=1
                )
    
    def test_get_fuel_price_returns_correct_prices(self):
        """
        Test that _get_fuel_price returns correct prices for different fuel types and FBOs.
        """
        # Test FBO 1 prices
        assert self.receipt_service._get_fuel_price(1, 'Jet A') == Decimal('5.50')
        assert self.receipt_service._get_fuel_price(1, 'Avgas 100LL') == Decimal('6.25')
        assert self.receipt_service._get_fuel_price(1, 'Jet A-1') == Decimal('5.50')
        assert self.receipt_service._get_fuel_price(1, 'Unknown Fuel') == Decimal('5.50')  # default
        
        # Test non-existent FBO (should default to FBO 1 prices)
        assert self.receipt_service._get_fuel_price(999, 'Jet A') == Decimal('5.50') 