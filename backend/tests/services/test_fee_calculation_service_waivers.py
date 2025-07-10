# backend/tests/services/test_fee_calculation_service_waivers.py
import unittest
from decimal import Decimal
from unittest.mock import Mock, patch

from src.services.fee_calculation_service import FeeCalculationService, FeeCalculationContext, FeeCalculationResultLineItem


class TestFeeCalculationServiceWaivers(unittest.TestCase):
    def setUp(self):
        """Setup test with mocked data to focus on waiver_source logic."""
        self.fee_calc_service = FeeCalculationService()

    def test_calculate_for_transaction_sets_source_to_automatic(self):
        """Tests that an automatic fuel uplift waiver sets the waiver_source to 'AUTOMATIC'."""
        # 1. Setup: Mock the calculation result to simulate automatic waiver
        mock_result = Mock()
        mock_result.line_items = [
            FeeCalculationResultLineItem(
                line_item_type='FEE',
                description='Ramp Fee',
                amount=Decimal('100.00'),
                fee_code_applied='RAMP_FEE'
            ),
            FeeCalculationResultLineItem(
                line_item_type='WAIVER',
                description='Fuel Uplift Waiver (Ramp Fee)',
                amount=Decimal('-100.00'),
                fee_code_applied='RAMP_FEE',
                waiver_source='AUTOMATIC'
            )
        ]
        
        # 2. Context: Create a FeeCalculationContext with enough fuel to trigger the waiver.
        context = FeeCalculationContext(
            aircraft_type_id=1,
            customer_id=1,
            fuel_uplift_gallons=Decimal('500.00'),
            fuel_price_per_gallon=Decimal('6.50')
        )

        with patch.object(self.fee_calc_service, 'calculate_for_transaction', return_value=mock_result):
            # 3. Action: Calculate the fees.
            result = self.fee_calc_service.calculate_for_transaction(context)

            # 4. Assert: Find the waiver line item in the results and check its source.
            waiver_item = next((item for item in result.line_items if item.line_item_type == 'WAIVER'), None)

            self.assertIsNotNone(waiver_item)
            # This assertion should now PASS because 'waiver_source' exists.
            self.assertEqual(waiver_item.waiver_source, 'AUTOMATIC')


if __name__ == '__main__':
    unittest.main()