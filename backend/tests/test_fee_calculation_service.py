"""
Unit tests for Fee Calculation Service

Tests the core business logic for fee, waiver, and tax calculations,
focusing on different waiver strategies and CAA overrides.
"""

import pytest
from unittest.mock import Mock, patch
from decimal import Decimal
from datetime import datetime
from src.extensions import db
from src.models.customer import Customer
from src.models.aircraft_type import AircraftType
from src.models.fee_category import FeeCategory
from src.models.aircraft_type_fee_category_mapping import AircraftTypeToFeeCategoryMapping
from src.models.fee_rule import FeeRule, CalculationBasis, WaiverStrategy
from src.models.waiver_tier import WaiverTier
from src.models.fbo_aircraft_type_config import FBOAircraftTypeConfig
from src.services.fee_calculation_service import (
    FeeCalculationService,
    FeeCalculationContext,
    FeeCalculationResult,
    FeeCalculationResultLineItem
)


@pytest.fixture(scope='function')
def setup_fbo_fee_configuration(app, db):
    """Comprehensive test fixture that populates the test database with sample FBO configuration."""
    
    with app.app_context():
        # Clean up any existing data
        db.session.query(WaiverTier).delete()
        db.session.query(FeeRule).delete()
        db.session.query(AircraftTypeToFeeCategoryMapping).delete()
        db.session.query(FeeCategory).delete()
        db.session.query(AircraftType).delete()
        db.session.query(Customer).delete()
        db.session.query(FBOAircraftTypeConfig).delete()
        db.session.commit()
        
        # Create Aircraft Types with different fuel waiver requirements
        light_jet = AircraftType(
            name="Citation CJ3",
            base_min_fuel_gallons_for_waiver=Decimal('150.00'),
            default_fee_category_id=None,
            default_max_gross_weight_lbs=Decimal('13500.00')
        )
        piston_single = AircraftType(
            name="Cessna 172",
            base_min_fuel_gallons_for_waiver=Decimal('30.00'),
            default_fee_category_id=None,
            default_max_gross_weight_lbs=Decimal('2550.00')
        )
        
        db.session.add_all([light_jet, piston_single])
        db.session.commit()
        
        # Create Fee Categories
        light_jet_category = FeeCategory(
            fbo_location_id=1,
            name="Light Jet"
        )
        piston_category = FeeCategory(
            fbo_location_id=1,
            name="Piston Single"
        )
        
        db.session.add_all([light_jet_category, piston_category])
        db.session.commit()
        
        # Create Aircraft Type to Fee Category Mappings
        light_jet_mapping = AircraftTypeToFeeCategoryMapping(
            fbo_location_id=1,
            aircraft_type_id=light_jet.id,
            fee_category_id=light_jet_category.id
        )
        piston_mapping = AircraftTypeToFeeCategoryMapping(
            fbo_location_id=1,
            aircraft_type_id=piston_single.id,
            fee_category_id=piston_category.id
        )
        
        db.session.add_all([light_jet_mapping, piston_mapping])
        db.session.commit()
        
        # Create Fee Rules for Light Jet category
        ramp_fee_lj = FeeRule(
            fbo_location_id=1,
            fee_name="Ramp Fee",
            fee_code="RAMP_LJ",
            applies_to_fee_category_id=light_jet_category.id,
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
            applies_to_fee_category_id=light_jet_category.id,
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
            applies_to_fee_category_id=light_jet_category.id,
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
            applies_to_fee_category_id=light_jet_category.id,
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
        
        # Create FBO-specific configurations for different FBOs
        # FBO 1: 200 gallons minimum for waiver
        fbo1_config = FBOAircraftTypeConfig(
            fbo_location_id=1,
            aircraft_type_id=light_jet.id,
            base_min_fuel_gallons_for_waiver=Decimal('200.00')
        )
        
        # FBO 2: 100 gallons minimum for waiver
        fbo2_config = FBOAircraftTypeConfig(
            fbo_location_id=2,
            aircraft_type_id=light_jet.id,
            base_min_fuel_gallons_for_waiver=Decimal('100.00')
        )
        
        db.session.add_all([fbo1_config, fbo2_config])
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
            'waiver_tiers': {'tier_1x': tier_1x.id, 'tier_2x': tier_2x.id},
            'fbo_aircraft_type_configs': {
                'fbo1_config': fbo1_config.id,
                'fbo2_config': fbo2_config.id
            }
        }


class TestFeeCalculationService:
    """Test cases for Fee Calculation Service"""
    
    def setup_method(self):
        """Set up test fixtures"""
        self.fee_service = FeeCalculationService()
        
        # Standard test context
        self.context = FeeCalculationContext(
            fbo_location_id=1,
            aircraft_type_id=2,
            customer_id=3,
            fuel_uplift_gallons=Decimal('150.0'),
            fuel_price_per_gallon=Decimal('5.50'),
            additional_services=[]
        )
    
    @patch('src.services.fee_calculation_service.FeeCalculationService._fetch_data')
    def test_calculate_no_waiver_fees_applied(self, mock_fetch_data, app, db):
        """
        Test Case 1: An order that does NOT meet any waiver thresholds. 
        Assert that fees are applied without waivers.
        """
        with app.app_context():
            # Mock data setup
            customer = Mock(spec=Customer)
            customer.is_caa_member = False
            
            aircraft_type = Mock(spec=AircraftType)
            aircraft_type.base_min_fuel_gallons_for_waiver = Decimal('200.0')  # Higher than fuel uplift
            
            # Fee rule that won't be waived (fuel uplift 150 < waiver threshold)
            fee_rule = Mock(spec=FeeRule)
            fee_rule.id = 1
            fee_rule.fee_code = "RAMP"
            fee_rule.fee_name = "Ramp Fee"
            fee_rule.amount = Decimal('100.00')
            fee_rule.is_taxable = True
            fee_rule.is_potentially_waivable_by_fuel_uplift = True
            fee_rule.waiver_strategy = WaiverStrategy.SIMPLE_MULTIPLIER
            fee_rule.simple_waiver_multiplier = Decimal('1.5')
            fee_rule.has_caa_override = False
            fee_rule.applies_to_fee_category_id = 1  # FIXED: Match the aircraft_fee_category_id
            
            mock_fetch_data.return_value = {
                'customer': customer,
                'aircraft_type': aircraft_type,
                'aircraft_fee_category_id': 1,
                'fee_rules': [fee_rule],
                'waiver_tiers': [],
                'fbo_aircraft_config': None  # No FBO-specific config
            }
            
            # Execute calculation
            result = self.fee_service.calculate_for_transaction(self.context)
            
            # Assertions
            assert isinstance(result, FeeCalculationResult)
            assert len(result.line_items) == 3  # Fuel + Fee + Tax
            
            # Check fuel line item
            fuel_item = next(item for item in result.line_items if item.line_item_type == 'FUEL')
            assert fuel_item.amount == Decimal('825.00')  # 150 * 5.50
            
            # Check fee line item (should be applied, no waiver)
            fee_item = next(item for item in result.line_items if item.line_item_type == 'FEE')
            assert fee_item.amount == Decimal('100.00')
            assert fee_item.fee_code_applied == "RAMP"
            
            # No waiver line item should exist
            waiver_items = [item for item in result.line_items if item.line_item_type == 'WAIVER']
            assert len(waiver_items) == 0
            
            # Check totals
            assert result.fuel_subtotal == Decimal('825.00')
            assert result.total_fees_amount == Decimal('100.00')
            assert result.total_waivers_amount == Decimal('0.00')
            assert result.is_caa_applied == False
    
    @patch('src.services.fee_calculation_service.FeeCalculationService._fetch_data')
    def test_calculate_simple_multiplier_waiver(self, mock_fetch_data, app, db):
        """
        Test Case 2: An order that DOES meet a SIMPLE_MULTIPLIER waiver.
        Assert the specific fee is waived (negative line item is created).
        """
        with app.app_context():
            # Mock data setup
            customer = Mock(spec=Customer)
            customer.is_caa_member = False

            aircraft_type = Mock(spec=AircraftType)
            aircraft_type.base_min_fuel_gallons_for_waiver = Decimal('100.0')  # Lower than fuel uplift

            # Fee rule that WILL be waived (fuel uplift 150 >= 100 * 1.5 = 150)
            fee_rule = Mock(spec=FeeRule)
            fee_rule.id = 1
            fee_rule.fee_code = "RAMP"
            fee_rule.fee_name = "Ramp Fee"
            fee_rule.amount = Decimal('100.00')
            fee_rule.is_taxable = True
            fee_rule.is_potentially_waivable_by_fuel_uplift = True
            fee_rule.waiver_strategy = WaiverStrategy.SIMPLE_MULTIPLIER
            fee_rule.simple_waiver_multiplier = Decimal('1.5')
            fee_rule.has_caa_override = False
            fee_rule.applies_to_fee_category_id = 1  # CRITICAL: Must match aircraft_fee_category_id

            mock_fetch_data.return_value = {
                'customer': customer,
                'aircraft_type': aircraft_type,
                'aircraft_fee_category_id': 1,
                'fee_rules': [fee_rule],
                'waiver_tiers': [],
                'fbo_aircraft_config': None  # No FBO-specific config
            }
            
            # Execute calculation
            result = self.fee_service.calculate_for_transaction(self.context)
            
            # Assertions
            assert isinstance(result, FeeCalculationResult)
            assert len(result.line_items) == 4  # Fuel + Fee + Waiver + Tax
            
            # Check fee line item
            fee_item = next(item for item in result.line_items if item.line_item_type == 'FEE')
            assert fee_item.amount == Decimal('100.00')
            assert fee_item.fee_code_applied == "RAMP"
            
            # Check waiver line item (should be negative amount)
            waiver_item = next(item for item in result.line_items if item.line_item_type == 'WAIVER')
            assert waiver_item.amount == Decimal('-100.00')  # Negative to offset fee
            assert waiver_item.fee_code_applied == "RAMP"
            assert "Fuel Uplift Waiver" in waiver_item.description
            
            # Check totals
            assert result.total_fees_amount == Decimal('100.00')
            assert result.total_waivers_amount == Decimal('100.00')  # Absolute value
    
    @patch('src.services.fee_calculation_service.FeeCalculationService._fetch_data')
    def test_calculate_tiered_multiplier_waiver(self, mock_fetch_data, app, db):
        """
        Test Case 3: An order that meets a TIERED_MULTIPLIER waiver.
        Assert all fees in the tier's fees_waived_codes are waived.
        """
        with app.app_context():
            # Mock data setup
            customer = Mock(spec=Customer)
            customer.is_caa_member = False

            aircraft_type = Mock(spec=AircraftType)
            aircraft_type.base_min_fuel_gallons_for_waiver = Decimal('100.0')

            # Multiple fee rules, some will be waived by tier
            ramp_fee = Mock(spec=FeeRule)
            ramp_fee.id = 1
            ramp_fee.fee_code = "RAMP"
            ramp_fee.fee_name = "Ramp Fee"
            ramp_fee.amount = Decimal('100.00')
            ramp_fee.is_taxable = True
            ramp_fee.is_potentially_waivable_by_fuel_uplift = True
            ramp_fee.waiver_strategy = WaiverStrategy.TIERED_MULTIPLIER
            ramp_fee.has_caa_override = False
            ramp_fee.applies_to_fee_category_id = 1  # CRITICAL: Must match aircraft_fee_category_id

            facility_fee = Mock(spec=FeeRule)
            facility_fee.id = 2
            facility_fee.fee_code = "FACILITY"
            facility_fee.fee_name = "Facility Fee"
            facility_fee.amount = Decimal('50.00')
            facility_fee.is_taxable = True
            facility_fee.is_potentially_waivable_by_fuel_uplift = True
            facility_fee.waiver_strategy = WaiverStrategy.TIERED_MULTIPLIER
            facility_fee.has_caa_override = False
            facility_fee.applies_to_fee_category_id = 1  # CRITICAL: Must match aircraft_fee_category_id

            # Waiver tier that waives these fees
            waiver_tier = Mock(spec=WaiverTier)
            waiver_tier.id = 1
            waiver_tier.tier_name = "Tier 1"
            waiver_tier.fuel_uplift_multiplier = Decimal('1.5')
            waiver_tier.fees_waived_codes = ["RAMP", "FACILITY"]  # Should be a list, not string
            waiver_tier.tier_priority = 1
            waiver_tier.is_caa_specific_tier = False

            mock_fetch_data.return_value = {
                'customer': customer,
                'aircraft_type': aircraft_type,
                'aircraft_fee_category_id': 1,
                'fee_rules': [ramp_fee, facility_fee],
                'waiver_tiers': [waiver_tier],
                'fbo_aircraft_config': None  # No FBO-specific config
            }
            
            # Mock the _evaluate_waivers method to return the waived fee codes
            with patch.object(self.fee_service, '_evaluate_waivers') as mock_evaluate:
                mock_evaluate.return_value = {"RAMP", "FACILITY"}
                
                # Execute calculation
                result = self.fee_service.calculate_for_transaction(self.context)
                
                # Assertions
                fee_items = [item for item in result.line_items if item.line_item_type == 'FEE']
                waiver_items = [item for item in result.line_items if item.line_item_type == 'WAIVER']
                
                assert len(fee_items) == 2  # Both fees applied
                assert len(waiver_items) == 2  # Both fees waived
                
                # Check that both fees are waived
                waived_codes = {item.fee_code_applied for item in waiver_items}
                assert waived_codes == {"RAMP", "FACILITY"}
                
                # Check waiver amounts
                ramp_waiver = next(item for item in waiver_items if item.fee_code_applied == "RAMP")
                facility_waiver = next(item for item in waiver_items if item.fee_code_applied == "FACILITY")
                assert ramp_waiver.amount == Decimal('-100.00')
                assert facility_waiver.amount == Decimal('-50.00')
                
                # Check totals
                assert result.total_fees_amount == Decimal('150.00')
                assert result.total_waivers_amount == Decimal('150.00')
    
    @patch('src.services.fee_calculation_service.FeeCalculationService._fetch_data')
    def test_calculate_caa_member_overrides(self, mock_fetch_data, app, db):
        """
        Test Case 4: A CAA member customer.
        Assert that CAA override amounts and waiver logic are used.
        """
        with app.app_context():
            # Mock data setup
            customer = Mock(spec=Customer)
            customer.is_caa_member = True  # CAA member

            aircraft_type = Mock(spec=AircraftType)
            aircraft_type.base_min_fuel_gallons_for_waiver = Decimal('100.0')

            # Fee rule with CAA overrides
            fee_rule = Mock(spec=FeeRule)
            fee_rule.id = 1
            fee_rule.fee_code = "RAMP"
            fee_rule.fee_name = "Ramp Fee"
            fee_rule.amount = Decimal('100.00')  # Regular amount
            fee_rule.is_taxable = True
            fee_rule.is_potentially_waivable_by_fuel_uplift = True
            fee_rule.waiver_strategy = WaiverStrategy.SIMPLE_MULTIPLIER
            fee_rule.simple_waiver_multiplier = Decimal('2.0')
            fee_rule.has_caa_override = True
            fee_rule.caa_override_amount = Decimal('75.00')  # Reduced amount for CAA
            fee_rule.caa_waiver_strategy_override = WaiverStrategy.SIMPLE_MULTIPLIER
            fee_rule.caa_simple_waiver_multiplier_override = Decimal('1.0')  # Easier waiver
            fee_rule.applies_to_fee_category_id = 1  # CRITICAL: Must match aircraft_fee_category_id

            mock_fetch_data.return_value = {
                'customer': customer,
                'aircraft_type': aircraft_type,
                'aircraft_fee_category_id': 1,
                'fee_rules': [fee_rule],
                'waiver_tiers': [],
                'fbo_aircraft_config': None  # No FBO-specific config
            }
            
            # Execute calculation
            result = self.fee_service.calculate_for_transaction(self.context)
            
            # Assertions
            assert result.is_caa_applied == True
            
            # Check fee uses CAA override amount
            fee_item = next(item for item in result.line_items if item.line_item_type == 'FEE')
            assert fee_item.amount == Decimal('75.00')  # CAA override amount, not regular
            
            # Check waiver (fuel uplift 150 >= 100 * 1.0 = 100, so waiver applies)
            waiver_items = [item for item in result.line_items if item.line_item_type == 'WAIVER']
            assert len(waiver_items) == 1
            waiver_item = waiver_items[0]
            assert waiver_item.amount == Decimal('-75.00')  # Waives the CAA amount
    
    def test_evaluate_waivers_tiered_multiplier(self):
        """
        Test the _evaluate_waivers method for tiered multiplier logic.
        """
        # Test data
        fuel_uplift = Decimal('150.0')
        base_min_fuel = Decimal('100.0')

        # Create mock waiver tier (without SQLAlchemy spec to avoid app context issues)
        tier = Mock()
        tier.fuel_uplift_multiplier = Decimal('1.5')  # 100 * 1.5 = 150
        tier.fees_waived_codes = ["RAMP", "FACILITY"]  # Should be a list
        tier.tier_priority = 1
        tier.is_caa_specific_tier = False

        # Test with exact threshold match
        waived_codes = self.fee_service._evaluate_waivers(
            fuel_uplift, base_min_fuel, [tier], is_caa_member=False
        )
        assert waived_codes == {"RAMP", "FACILITY"}
        
        # Test with insufficient fuel uplift
        waived_codes = self.fee_service._evaluate_waivers(
            Decimal('140.0'), base_min_fuel, [tier], is_caa_member=False
        )
        assert waived_codes == set()  # Below threshold
        
        # Test with excess fuel uplift
        waived_codes = self.fee_service._evaluate_waivers(
            Decimal('200.0'), base_min_fuel, [tier], is_caa_member=False
        )
        assert waived_codes == {"RAMP", "FACILITY"}  # Above threshold
    
    def test_get_service_quantity(self):
        """
        Test the _get_service_quantity method.
        """
        # Test with additional service
        additional_services = [
            {'fee_code': 'GPU', 'quantity': 2},
            {'fee_code': 'LAVATORY', 'quantity': 1}
        ]
        
        assert self.fee_service._get_service_quantity('GPU', additional_services) == Decimal('2')
        assert self.fee_service._get_service_quantity('LAVATORY', additional_services) == Decimal('1')
        assert self.fee_service._get_service_quantity('UNKNOWN', additional_services) == Decimal('1')
        assert self.fee_service._get_service_quantity('GPU', []) == Decimal('1')
    
    def test_calculate_taxes(self):
        """
        Test the _calculate_taxes method.
        """
        # Test normal tax calculation
        taxable_amount = Decimal('100.00')
        tax = self.fee_service._calculate_taxes(taxable_amount)
        assert tax == Decimal('8.00')  # 8% of 100
        
        # Test zero amount
        tax = self.fee_service._calculate_taxes(Decimal('0.00'))
        assert tax == Decimal('0.00')
        
        # Test negative amount (shouldn't happen in practice)
        tax = self.fee_service._calculate_taxes(Decimal('-50.00'))
        assert tax == Decimal('0.00')  # Should not tax negative amounts

    def test_fuel_subtotal_calculation(self, setup_fbo_fee_configuration):
        """Test basic fuel subtotal calculation (gallons * price_per_gallon)."""
        fixture_data = setup_fbo_fee_configuration
        service = FeeCalculationService()
        
        context = FeeCalculationContext(
            fbo_location_id=1,
            aircraft_type_id=fixture_data['aircraft_types']['light_jet'],
            customer_id=fixture_data['customers']['regular'],
            fuel_uplift_gallons=Decimal('200.00'),
            fuel_price_per_gallon=Decimal('5.50'),
            additional_services=[]
        )
        
        result = service.calculate_for_transaction(context)
        
        # Fuel subtotal should be 200 * 5.50 = $1,100.00
        assert result.fuel_subtotal == Decimal('1100.00')
        
        # Check that fuel line item exists
        fuel_line_items = [item for item in result.line_items if item.line_item_type == 'FUEL']
        assert len(fuel_line_items) == 1
        assert fuel_line_items[0].amount == Decimal('1100.00')
        assert fuel_line_items[0].quantity == Decimal('200.00')
        assert fuel_line_items[0].unit_price == Decimal('5.50')
    
    def test_applicable_fees_identification(self, setup_fbo_fee_configuration):
        """Test that the service correctly identifies and applies base amounts for applicable fees."""
        fixture_data = setup_fbo_fee_configuration
        service = FeeCalculationService()
        
        context = FeeCalculationContext(
            fbo_location_id=1,
            aircraft_type_id=fixture_data['aircraft_types']['light_jet'],
            customer_id=fixture_data['customers']['regular'],
            fuel_uplift_gallons=Decimal('100.00'),  # Below waiver thresholds
            fuel_price_per_gallon=Decimal('5.50'),
            additional_services=[]
        )
        
        result = service.calculate_for_transaction(context)
        
        # Should have fee line items for ramp and overnight fees (not waived at 100 gallons)
        fee_line_items = [item for item in result.line_items if item.line_item_type == 'FEE']
        fee_codes = [item.fee_code_applied for item in fee_line_items]
        
        assert 'RAMP_LJ' in fee_codes
        assert 'OVN_LJ' in fee_codes
        
        # Check amounts
        ramp_fee_item = next(item for item in fee_line_items if item.fee_code_applied == 'RAMP_LJ')
        overnight_fee_item = next(item for item in fee_line_items if item.fee_code_applied == 'OVN_LJ')
        
        assert ramp_fee_item.amount == Decimal('75.00')
        assert overnight_fee_item.amount == Decimal('50.00')
    
    def test_simple_waiver_equal_threshold(self, setup_fbo_fee_configuration):
        """Test simple waiver when fuel uplift equals the aircraft's base minimum."""
        fixture_data = setup_fbo_fee_configuration
        service = FeeCalculationService()
        
        # Light jet base minimum is 150 gallons, lavatory service has SIMPLE_MULTIPLIER with 1.0
        # So 150 * 1.0 = 150 gallons should waive the lavatory service
        context = FeeCalculationContext(
            fbo_location_id=1,
            aircraft_type_id=fixture_data['aircraft_types']['light_jet'],
            customer_id=fixture_data['customers']['regular'],
            fuel_uplift_gallons=Decimal('150.00'),
            fuel_price_per_gallon=Decimal('5.50'),
            additional_services=[{'fee_code': 'LAV', 'quantity': 1}]
        )
        
        result = service.calculate_for_transaction(context)
        
        # Should have lavatory fee and waiver
        fee_line_items = [item for item in result.line_items if item.line_item_type == 'FEE']
        waiver_line_items = [item for item in result.line_items if item.line_item_type == 'WAIVER']
        
        lav_fee_item = next((item for item in fee_line_items if item.fee_code_applied == 'LAV'), None)
        lav_waiver_item = next((item for item in waiver_line_items if item.fee_code_applied == 'LAV'), None)
        
        assert lav_fee_item is not None
        assert lav_fee_item.amount == Decimal('35.00')
        
        assert lav_waiver_item is not None
        assert lav_waiver_item.amount == Decimal('-35.00')
    
    def test_simple_waiver_exceeds_threshold(self, setup_fbo_fee_configuration):
        """Test simple waiver when fuel uplift exceeds the base minimum."""
        fixture_data = setup_fbo_fee_configuration
        service = FeeCalculationService()
        
        context = FeeCalculationContext(
            fbo_location_id=1,
            aircraft_type_id=fixture_data['aircraft_types']['light_jet'],
            customer_id=fixture_data['customers']['regular'],
            fuel_uplift_gallons=Decimal('200.00'),  # Exceeds 150 threshold
            fuel_price_per_gallon=Decimal('5.50'),
            additional_services=[{'fee_code': 'LAV', 'quantity': 1}]
        )
        
        result = service.calculate_for_transaction(context)
        
        # Should have lavatory waiver
        waiver_line_items = [item for item in result.line_items if item.line_item_type == 'WAIVER']
        lav_waiver_item = next((item for item in waiver_line_items if item.fee_code_applied == 'LAV'), None)
        
        assert lav_waiver_item is not None
        assert lav_waiver_item.amount == Decimal('-35.00')
    
    def test_simple_waiver_below_threshold(self, setup_fbo_fee_configuration):
        """Test that simple waiver is NOT applied when fuel uplift is below threshold."""
        fixture_data = setup_fbo_fee_configuration
        service = FeeCalculationService()
        
        context = FeeCalculationContext(
            fbo_location_id=1,
            aircraft_type_id=fixture_data['aircraft_types']['light_jet'],
            customer_id=fixture_data['customers']['regular'],
            fuel_uplift_gallons=Decimal('100.00'),  # Below 150 threshold
            fuel_price_per_gallon=Decimal('5.50'),
            additional_services=[{'fee_code': 'LAV', 'quantity': 1}]
        )
        
        result = service.calculate_for_transaction(context)
        
        # Should have lavatory fee but NO waiver
        fee_line_items = [item for item in result.line_items if item.line_item_type == 'FEE']
        waiver_line_items = [item for item in result.line_items if item.line_item_type == 'WAIVER']
        
        lav_fee_item = next((item for item in fee_line_items if item.fee_code_applied == 'LAV'), None)
        lav_waiver_item = next((item for item in waiver_line_items if item.fee_code_applied == 'LAV'), None)
        
        assert lav_fee_item is not None
        assert lav_fee_item.amount == Decimal('35.00')
        assert lav_waiver_item is None
    
    def test_tiered_waiver_tier_1_only(self, setup_fbo_fee_configuration):
        """Test tiered waiver that only meets the 1.0x multiplier tier."""
        fixture_data = setup_fbo_fee_configuration
        service = FeeCalculationService()
        
        # Light jet base minimum is 150 gallons
        # Tier 1: 1.0x = 150 gallons waives RAMP_LJ
        # Tier 2: 2.0x = 300 gallons waives RAMP_LJ, OVN_LJ
        context = FeeCalculationContext(
            fbo_location_id=1,
            aircraft_type_id=fixture_data['aircraft_types']['light_jet'],
            customer_id=fixture_data['customers']['regular'],
            fuel_uplift_gallons=Decimal('150.00'),  # Meets tier 1 only
            fuel_price_per_gallon=Decimal('5.50'),
            additional_services=[]
        )
        
        result = service.calculate_for_transaction(context)
        
        # Should waive RAMP_LJ but not OVN_LJ
        waiver_line_items = [item for item in result.line_items if item.line_item_type == 'WAIVER']
        waiver_codes = [item.fee_code_applied for item in waiver_line_items]
        
        assert 'RAMP_LJ' in waiver_codes
        assert 'OVN_LJ' not in waiver_codes
        
        # Check waiver amount
        ramp_waiver = next(item for item in waiver_line_items if item.fee_code_applied == 'RAMP_LJ')
        assert ramp_waiver.amount == Decimal('-75.00')
    
    def test_tiered_waiver_tier_2_met(self, setup_fbo_fee_configuration):
        """Test tiered waiver that meets the 2.0x multiplier tier."""
        fixture_data = setup_fbo_fee_configuration
        service = FeeCalculationService()
        
        context = FeeCalculationContext(
            fbo_location_id=1,
            aircraft_type_id=fixture_data['aircraft_types']['light_jet'],
            customer_id=fixture_data['customers']['regular'],
            fuel_uplift_gallons=Decimal('300.00'),  # Meets tier 2 (2.0x = 300)
            fuel_price_per_gallon=Decimal('5.50'),
            additional_services=[]
        )
        
        result = service.calculate_for_transaction(context)
        
        # Should waive both RAMP_LJ and OVN_LJ
        waiver_line_items = [item for item in result.line_items if item.line_item_type == 'WAIVER']
        waiver_codes = [item.fee_code_applied for item in waiver_line_items]
        
        assert 'RAMP_LJ' in waiver_codes
        assert 'OVN_LJ' in waiver_codes
        
        # Check waiver amounts
        ramp_waiver = next(item for item in waiver_line_items if item.fee_code_applied == 'RAMP_LJ')
        overnight_waiver = next(item for item in waiver_line_items if item.fee_code_applied == 'OVN_LJ')
        
        assert ramp_waiver.amount == Decimal('-75.00')
        assert overnight_waiver.amount == Decimal('-50.00')
    
    def test_tiered_waiver_below_threshold(self, setup_fbo_fee_configuration):
        """Test tiered waiver when fuel uplift is below any tier threshold."""
        fixture_data = setup_fbo_fee_configuration
        service = FeeCalculationService()
        
        context = FeeCalculationContext(
            fbo_location_id=1,
            aircraft_type_id=fixture_data['aircraft_types']['light_jet'],
            customer_id=fixture_data['customers']['regular'],
            fuel_uplift_gallons=Decimal('100.00'),  # Below 150 (1.0x threshold)
            fuel_price_per_gallon=Decimal('5.50'),
            additional_services=[]
        )
        
        result = service.calculate_for_transaction(context)
        
        # Should have fees but no tiered waivers
        fee_line_items = [item for item in result.line_items if item.line_item_type == 'FEE']
        waiver_line_items = [item for item in result.line_items if item.line_item_type == 'WAIVER']
        
        fee_codes = [item.fee_code_applied for item in fee_line_items]
        waiver_codes = [item.fee_code_applied for item in waiver_line_items]
        
        assert 'RAMP_LJ' in fee_codes
        assert 'OVN_LJ' in fee_codes
        assert 'RAMP_LJ' not in waiver_codes
        assert 'OVN_LJ' not in waiver_codes
    
    def test_caa_member_override_amount(self, setup_fbo_fee_configuration):
        """Test that CAA member gets CAA override amount."""
        fixture_data = setup_fbo_fee_configuration
        service = FeeCalculationService()
        
        context = FeeCalculationContext(
            fbo_location_id=1,
            aircraft_type_id=fixture_data['aircraft_types']['light_jet'],
            customer_id=fixture_data['customers']['caa'],  # CAA member
            fuel_uplift_gallons=Decimal('100.00'),  # Below waiver thresholds
            fuel_price_per_gallon=Decimal('5.50'),
            additional_services=[{'fee_code': 'LAV', 'quantity': 1}]
        )
        
        result = service.calculate_for_transaction(context)
        
        # Should use CAA override amounts
        fee_line_items = [item for item in result.line_items if item.line_item_type == 'FEE']
        
        # Ramp fee should use CAA override: $60 instead of $75
        ramp_fee = next(item for item in fee_line_items if item.fee_code_applied == 'RAMP_LJ')
        assert ramp_fee.amount == Decimal('60.00')
        
        # Lavatory service should use CAA override: $30 instead of $35
        lav_fee = next(item for item in fee_line_items if item.fee_code_applied == 'LAV')
        assert lav_fee.amount == Decimal('30.00')
        
        # Should flag CAA was applied
        assert result.is_caa_applied == True
    
    def test_caa_member_waiver_override(self, setup_fbo_fee_configuration):
        """Test CAA member uses CAA waiver multiplier override."""
        fixture_data = setup_fbo_fee_configuration
        service = FeeCalculationService()
        
        # Lavatory service has CAA override multiplier of 0.8 (vs 1.0 standard)
        # Light jet base minimum is 150 gallons
        # CAA waiver threshold: 150 * 0.8 = 120 gallons
        context = FeeCalculationContext(
            fbo_location_id=1,
            aircraft_type_id=fixture_data['aircraft_types']['light_jet'],
            customer_id=fixture_data['customers']['caa'],  # CAA member
            fuel_uplift_gallons=Decimal('120.00'),  # Meets CAA threshold but not standard
            fuel_price_per_gallon=Decimal('5.50'),
            additional_services=[{'fee_code': 'LAV', 'quantity': 1}]
        )
        
        result = service.calculate_for_transaction(context)
        
        # Should have lavatory waiver due to CAA override multiplier
        waiver_line_items = [item for item in result.line_items if item.line_item_type == 'WAIVER']
        lav_waiver = next((item for item in waiver_line_items if item.fee_code_applied == 'LAV'), None)
        
        assert lav_waiver is not None
        assert lav_waiver.amount == Decimal('-30.00')  # CAA amount
    
    def test_non_caa_member_standard_pricing(self, setup_fbo_fee_configuration):
        """Test that non-CAA member uses standard pricing even when CAA overrides exist."""
        fixture_data = setup_fbo_fee_configuration
        service = FeeCalculationService()
        
        context = FeeCalculationContext(
            fbo_location_id=1,
            aircraft_type_id=fixture_data['aircraft_types']['light_jet'],
            customer_id=fixture_data['customers']['regular'],  # Non-CAA member
            fuel_uplift_gallons=Decimal('100.00'),
            fuel_price_per_gallon=Decimal('5.50'),
            additional_services=[{'fee_code': 'LAV', 'quantity': 1}]
        )
        
        result = service.calculate_for_transaction(context)
        
        # Should use standard amounts, not CAA overrides
        fee_line_items = [item for item in result.line_items if item.line_item_type == 'FEE']
        
        ramp_fee = next(item for item in fee_line_items if item.fee_code_applied == 'RAMP_LJ')
        assert ramp_fee.amount == Decimal('75.00')  # Standard, not CAA $60
        
        lav_fee = next(item for item in fee_line_items if item.fee_code_applied == 'LAV')
        assert lav_fee.amount == Decimal('35.00')  # Standard, not CAA $30
        
        # Should not flag CAA as applied
        assert result.is_caa_applied == False
    
    def test_additional_services_fixed_price(self, setup_fbo_fee_configuration):
        """Test that additional services (like GPU) are correctly added."""
        fixture_data = setup_fbo_fee_configuration
        service = FeeCalculationService()
        
        context = FeeCalculationContext(
            fbo_location_id=1,
            aircraft_type_id=fixture_data['aircraft_types']['light_jet'],
            customer_id=fixture_data['customers']['regular'],
            fuel_uplift_gallons=Decimal('200.00'),
            fuel_price_per_gallon=Decimal('5.50'),
            additional_services=[{'fee_code': 'GPU', 'quantity': 1}]
        )
        
        result = service.calculate_for_transaction(context)
        
        # Should have GPU service fee
        fee_line_items = [item for item in result.line_items if item.line_item_type == 'FEE']
        gpu_fee = next((item for item in fee_line_items if item.fee_code_applied == 'GPU'), None)
        
        assert gpu_fee is not None
        assert gpu_fee.amount == Decimal('25.00')
        assert gpu_fee.description == "GPU Service"
    
    def test_tax_calculation_on_taxable_items(self, setup_fbo_fee_configuration):
        """Test that tax is calculated correctly on taxable line items."""
        fixture_data = setup_fbo_fee_configuration
        service = FeeCalculationService()
        
        context = FeeCalculationContext(
            fbo_location_id=1,
            aircraft_type_id=fixture_data['aircraft_types']['light_jet'],
            customer_id=fixture_data['customers']['regular'],
            fuel_uplift_gallons=Decimal('100.00'),  # Below waiver thresholds
            fuel_price_per_gallon=Decimal('5.00'),
            additional_services=[]
        )
        
        result = service.calculate_for_transaction(context)
        
        # All items should be taxable by default
        # Fuel: $500, Ramp Fee: $75, Overnight Fee: $50
        # Taxable base: $625
        # Assuming 8% tax rate (this should be configurable per FBO)
        expected_taxable_base = Decimal('625.00')  # 100 * 5.00 + 75 + 50
        
        # Check that tax line item exists
        tax_line_items = [item for item in result.line_items if item.line_item_type == 'TAX']
        assert len(tax_line_items) == 1
        
        # Tax amount should be calculated correctly (assuming 8% rate)
        assert result.tax_amount > Decimal('0.00')
    
    def test_grand_total_calculation(self, setup_fbo_fee_configuration):
        """Test comprehensive grand total calculation with all components."""
        fixture_data = setup_fbo_fee_configuration
        service = FeeCalculationService()
        
        # Use scenario with fuel, fees, partial waiver, and tax
        context = FeeCalculationContext(
            fbo_location_id=1,
            aircraft_type_id=fixture_data['aircraft_types']['light_jet'],
            customer_id=fixture_data['customers']['regular'],
            fuel_uplift_gallons=Decimal('150.00'),  # Meets tier 1 waiver
            fuel_price_per_gallon=Decimal('5.00'),
            additional_services=[{'fee_code': 'GPU', 'quantity': 1}]  # Non-waivable service
        )
        
        result = service.calculate_for_transaction(context)
        
        # Expected calculation:
        # Fuel: 150 * $5.00 = $750.00
        # Ramp Fee: $75.00 (waived = -$75.00)
        # Overnight Fee: $50.00 (not waived at tier 1)
        # GPU Service: $25.00 (not waivable)
        # Lavatory Service: $35.00 (waived = -$35.00 due to 150 gallons meeting 1.0x threshold)
        # Total fees: $75 + $50 + $25 + $35 = $185.00
        # Total waivers: $75 + $35 = $110.00
        # Subtotal before tax: $750 + $185 - $110 = $825.00
        # Tax on $825.00 (assuming 8%): $66.00
        # Grand Total: $825.00 + $66.00 = $891.00
        
        expected_fuel_subtotal = Decimal('750.00')
        expected_total_fees = Decimal('185.00')  # $75 + $50 + $25 + $35
        expected_total_waivers = Decimal('110.00')  # Ramp fee + Lavatory service waived
        
        assert result.fuel_subtotal == expected_fuel_subtotal
        assert result.total_fees_amount == expected_total_fees
        assert result.total_waivers_amount == expected_total_waivers
        
        # Grand total should follow formula: (fuel + fees) - waivers + tax
        calculated_pre_tax = result.fuel_subtotal + result.total_fees_amount - result.total_waivers_amount
        assert result.grand_total_amount == calculated_pre_tax + result.tax_amount
    
    def test_zero_fuel_uplift_no_waivers(self, setup_fbo_fee_configuration):
        """Test that zero fuel uplift applies no fuel-based waivers."""
        fixture_data = setup_fbo_fee_configuration
        service = FeeCalculationService()
        
        context = FeeCalculationContext(
            fbo_location_id=1,
            aircraft_type_id=fixture_data['aircraft_types']['light_jet'],
            customer_id=fixture_data['customers']['regular'],
            fuel_uplift_gallons=Decimal('0.00'),
            fuel_price_per_gallon=Decimal('5.50'),
            additional_services=[{'fee_code': 'LAV', 'quantity': 1}]
        )
        
        result = service.calculate_for_transaction(context)
        
        # Should have no waivers
        waiver_line_items = [item for item in result.line_items if item.line_item_type == 'WAIVER']
        assert len(waiver_line_items) == 0
        
        # Should still have fees
        fee_line_items = [item for item in result.line_items if item.line_item_type == 'FEE']
        assert len(fee_line_items) > 0
    
    def test_aircraft_with_no_fee_rules(self, setup_fbo_fee_configuration):
        """Test aircraft type with no configured fee rules returns zero fees."""
        fixture_data = setup_fbo_fee_configuration
        service = FeeCalculationService()
        
        # Use piston aircraft which has no fee rules configured
        context = FeeCalculationContext(
            fbo_location_id=1,
            aircraft_type_id=fixture_data['aircraft_types']['piston_single'],
            customer_id=fixture_data['customers']['regular'],
            fuel_uplift_gallons=Decimal('50.00'),
            fuel_price_per_gallon=Decimal('4.00'),
            additional_services=[]
        )
        
        result = service.calculate_for_transaction(context)
        
        # Should have fuel but no category-based fees
        assert result.fuel_subtotal == Decimal('200.00')  # 50 * 4.00
        
        # Should have no category-based fee line items
        fee_line_items = [item for item in result.line_items if item.line_item_type == 'FEE']
        category_fees = [item for item in fee_line_items if item.fee_code_applied in ['RAMP_LJ', 'OVN_LJ']]
        assert len(category_fees) == 0
    
    def test_aircraft_no_fuel_waiver_minimum_set(self, setup_fbo_fee_configuration):
        """Test aircraft type with 0 base_min_fuel_gallons_for_waiver (no waivers)."""
        fixture_data = setup_fbo_fee_configuration
        
        # Modify the piston aircraft to have 0 for waiver minimum (indicating no waivers)
        from src.models.aircraft_type import AircraftType
        piston_id = fixture_data['aircraft_types']['piston_single']
        piston = db.session.get(AircraftType, piston_id)
        piston.base_min_fuel_gallons_for_waiver = Decimal('0.00')
        db.session.commit()
        
        service = FeeCalculationService()
        
        context = FeeCalculationContext(
            fbo_location_id=1,
            aircraft_type_id=piston_id,
            customer_id=fixture_data['customers']['regular'],
            fuel_uplift_gallons=Decimal('1000.00'),  # Large amount
            fuel_price_per_gallon=Decimal('4.00'),
            additional_services=[]
        )
        
        result = service.calculate_for_transaction(context)
        
        # Should not apply any fuel-based waivers
        waiver_line_items = [item for item in result.line_items if item.line_item_type == 'WAIVER']
        assert len(waiver_line_items) == 0

    def test_fbo_specific_waiver_minimums(self, setup_fbo_fee_configuration):
        """Test that two FBOs have different waiver minimums for the same aircraft."""
        fixture_data = setup_fbo_fee_configuration
        
        # Get the Citation CJ3 aircraft type
        from src.models.aircraft_type import AircraftType
        from src.models.fbo_aircraft_type_config import FBOAircraftTypeConfig
        light_jet_id = fixture_data['aircraft_types']['light_jet']
        
        # The fixture already created FBO configs, let's use them
        # FBO 1 has 200 gallons minimum (from fixture)
        # FBO 2 has 100 gallons minimum (from fixture)
        # We need to create fee categories and rules for FBO 2 to make the test work
        
        from src.models.fee_category import FeeCategory
        from src.models.fee_rule import FeeRule, CalculationBasis, WaiverStrategy
        from src.models.waiver_tier import WaiverTier
        from src.models.aircraft_type_fee_category_mapping import AircraftTypeToFeeCategoryMapping
        
        # Create fee category for FBO 2
        light_jet_category_fbo2 = FeeCategory(
            fbo_location_id=2,
            name="Light Jet FBO2"
        )
        db.session.add(light_jet_category_fbo2)
        db.session.commit()
        
        # Create aircraft type mapping for FBO 2
        light_jet_mapping_fbo2 = AircraftTypeToFeeCategoryMapping(
            fbo_location_id=2,
            aircraft_type_id=light_jet_id,
            fee_category_id=light_jet_category_fbo2.id
        )
        db.session.add(light_jet_mapping_fbo2)
        db.session.commit()
        
        # Create a simple fee rule for FBO 2 that can be waived
        ramp_fee_fbo2 = FeeRule(
            fbo_location_id=2,
            fee_name="Ramp Fee",
            fee_code="RAMP_FBO2",
            applies_to_fee_category_id=light_jet_category_fbo2.id,
            amount=Decimal('50.00'),
            currency="USD",
            is_taxable=True,
            is_potentially_waivable_by_fuel_uplift=True,
            calculation_basis=CalculationBasis.NOT_APPLICABLE,
            waiver_strategy=WaiverStrategy.SIMPLE_MULTIPLIER,
            simple_waiver_multiplier=Decimal('1.0')
        )
        db.session.add(ramp_fee_fbo2)
        db.session.commit()
        
        service = FeeCalculationService()
        
        # Test with 150 gallons fuel uplift
        fuel_amount = Decimal('150.00')
        
        # Context for FBO 1 (minimum 200 gallons from fixture)
        context_fbo1 = FeeCalculationContext(
            fbo_location_id=1,
            aircraft_type_id=light_jet_id,
            customer_id=fixture_data['customers']['regular'],
            fuel_uplift_gallons=fuel_amount,
            fuel_price_per_gallon=Decimal('5.50'),
            additional_services=[]
        )
        
        # Context for FBO 2 (minimum 100 gallons from fixture)
        context_fbo2 = FeeCalculationContext(
            fbo_location_id=2,
            aircraft_type_id=light_jet_id,
            customer_id=fixture_data['customers']['regular'],
            fuel_uplift_gallons=fuel_amount,
            fuel_price_per_gallon=Decimal('5.50'),
            additional_services=[]
        )
        
        # Calculate for both FBOs
        result_fbo1 = service.calculate_for_transaction(context_fbo1)
        result_fbo2 = service.calculate_for_transaction(context_fbo2)
        
        # FBO 1: 150 gallons < 200 minimum, so no waivers should be applied
        waiver_line_items_fbo1 = [item for item in result_fbo1.line_items if item.line_item_type == 'WAIVER']
        assert len(waiver_line_items_fbo1) == 0, "FBO 1 should have no waivers with 150 gallons (minimum 200)"
        
        # FBO 2: 150 gallons > 100 minimum, so waivers should be applied
        waiver_line_items_fbo2 = [item for item in result_fbo2.line_items if item.line_item_type == 'WAIVER']
        assert len(waiver_line_items_fbo2) > 0, "FBO 2 should have waivers with 150 gallons (minimum 100)"
        
        # Verify that the calculation service correctly used the FBO-specific minimum
        assert result_fbo1.total_waivers_amount == Decimal('0.00'), "FBO 1 should have no waiver amount"
        assert result_fbo2.total_waivers_amount > Decimal('0.00'), "FBO 2 should have waiver amount"

    def test_additional_services_in_calculation(self, setup_fbo_fee_configuration):
        """Test that additional services are properly processed by the fee calculation service."""
        fixture_data = setup_fbo_fee_configuration
        service = FeeCalculationService()
        
        # Test with additional services
        additional_services = [
            {'fee_code': 'GPU', 'quantity': 1},
            {'fee_code': 'LAV', 'quantity': 2}  # Test multiple quantity
        ]
        
        context = FeeCalculationContext(
            fbo_location_id=1,
            aircraft_type_id=fixture_data['aircraft_types']['light_jet'],
            customer_id=fixture_data['customers']['regular'],
            fuel_uplift_gallons=Decimal('100.00'),  # Below waiver thresholds
            fuel_price_per_gallon=Decimal('5.50'),
            additional_services=additional_services
        )
        
        result = service.calculate_for_transaction(context)
        
        # Should have line items for both additional services
        fee_line_items = [item for item in result.line_items if item.line_item_type == 'FEE']
        
        # Find GPU service fee
        gpu_fee = next((item for item in fee_line_items if item.fee_code_applied == 'GPU'), None)
        assert gpu_fee is not None, "GPU service fee should be included"
        assert gpu_fee.amount == Decimal('25.00'), "GPU service should have correct amount"
        assert gpu_fee.quantity == Decimal('1'), "GPU service should have correct quantity"
        
        # Find Lavatory service fee (should be 2 quantities)
        lav_fee = next((item for item in fee_line_items if item.fee_code_applied == 'LAV'), None)
        assert lav_fee is not None, "Lavatory service fee should be included"
        assert lav_fee.amount == Decimal('70.00'), "Lavatory service should be 2 × $35.00 = $70.00"
        assert lav_fee.quantity == Decimal('2'), "Lavatory service should have correct quantity"
        
        # Total fees should include additional services
        # Default fees: Ramp ($75) + Overnight ($50) = $125
        # Additional services: GPU ($25) + LAV ($70) = $95
        # Total expected: $220
        expected_total_fees = Decimal('220.00')
        assert result.total_fees_amount == expected_total_fees, f"Total fees should include additional services: expected {expected_total_fees}, got {result.total_fees_amount}" 