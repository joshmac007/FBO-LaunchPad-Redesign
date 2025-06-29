import pytest
from decimal import Decimal
from datetime import datetime
from sqlalchemy.exc import IntegrityError
from src.extensions import db
from src.models.customer import Customer
from src.models.aircraft_type import AircraftType
from src.models.aircraft_classification import AircraftClassification
from src.models.aircraft_type_aircraft_classification_mapping import AircraftTypeToAircraftClassificationMapping
from src.models.fee_rule import FeeRule
from src.models.waiver_tier import WaiverTier
from src.models.receipt import Receipt
from src.models.receipt_line_item import ReceiptLineItem
from src.models.fuel_order import FuelOrder
from src.models.user import User


@pytest.fixture(autouse=True)
def clean_receipt_tables(db_session):
    """Clean up receipt-related tables before and after each test to ensure isolation."""
    # Clean up BEFORE test runs
    try:
        # Clean up in dependency order (children first, then parents)
        db_session.query(ReceiptLineItem).delete()
        db_session.query(Receipt).delete()
        db_session.query(FeeRule).delete()
        db_session.query(WaiverTier).delete()
        db_session.query(AircraftTypeToAircraftClassificationMapping).delete()
        db_session.query(AircraftClassification).delete()
        db_session.query(AircraftType).delete()
        
        # Clean up test customers that aren't part of the session fixtures
        test_customer_emails = [
            'test@example.com',
            'default@example.com',
            'customer1@example.com',
            'customer2@example.com',
            'receipt_test@example.com',
            'lineitem_test@example.com',
            'cascade_test@example.com',
            'receipt_unique_test@example.com'
        ]
        for email in test_customer_emails:
            customer = db_session.query(Customer).filter_by(email=email).first()
            if customer:
                db_session.delete(customer)
        
        # Clean up test fuel orders and aircraft
        from src.models.fuel_order import FuelOrder
        from src.models.aircraft import Aircraft
        db_session.query(FuelOrder).filter(FuelOrder.tail_number.in_(['N123AB', 'N456CD'])).delete(synchronize_session=False)
        db_session.query(Aircraft).filter(Aircraft.tail_number.in_(['N123AB', 'N456CD'])).delete(synchronize_session=False)
        
        db_session.commit()
    except Exception:
        db_session.rollback()
    
    yield
    
    try:
        # Clean up in dependency order (children first, then parents)
        db_session.query(ReceiptLineItem).delete()
        db_session.query(Receipt).delete()
        db_session.query(FeeRule).delete()
        db_session.query(WaiverTier).delete()
        db_session.query(AircraftTypeToAircraftClassificationMapping).delete()
        db_session.query(AircraftClassification).delete()
        db_session.query(AircraftType).delete()
        
        # Clean up test customers that aren't part of the session fixtures
        test_customer_emails = [
            'receipt_test@example.com',
            'lineitem_test@example.com',
            'cascade_test@example.com',
            'receipt_unique_test@example.com'
        ]
        for email in test_customer_emails:
            customer = db_session.query(Customer).filter_by(email=email).first()
            if customer:
                db_session.delete(customer)
        
        # Clean up test fuel orders and aircraft
        from src.models.fuel_order import FuelOrder
        from src.models.aircraft import Aircraft
        db_session.query(FuelOrder).filter(FuelOrder.tail_number.in_(['N123AB', 'N456CD'])).delete(synchronize_session=False)
        db_session.query(Aircraft).filter(Aircraft.tail_number.in_(['N123AB', 'N456CD'])).delete(synchronize_session=False)
        
        db_session.commit()
    except Exception:
        db_session.rollback()


class TestCustomerModifications:
    """Test modifications to Customer model for receipt system."""
    
    def test_customer_creation_with_new_fields(self, db_session):
        """Test creating a customer with new receipt-related fields."""
        customer = Customer(
            name="Test Customer",
            email="test@example.com",
            phone="123-456-7890",
            is_placeholder=False,
            is_caa_member=True,
            caa_member_id="CAA12345"
        )
        db_session.add(customer)
        db_session.commit()
        
        retrieved_customer = Customer.query.filter_by(email="test@example.com").first()
        assert retrieved_customer is not None
        assert retrieved_customer.name == "Test Customer"
        assert retrieved_customer.is_placeholder is False
        assert retrieved_customer.is_caa_member is True
        assert retrieved_customer.caa_member_id == "CAA12345"
    
    def test_customer_default_values(self, db_session):
        """Test customer default values are set correctly."""
        customer = Customer(
            name="Default Test Customer",
            email="default@example.com"
        )
        db_session.add(customer)
        db_session.commit()
        
        retrieved_customer = Customer.query.filter_by(email="default@example.com").first()
        assert retrieved_customer.is_placeholder is False  # Default value
        assert retrieved_customer.is_caa_member is False  # Default value
        assert retrieved_customer.caa_member_id is None
    
    def test_caa_member_id_uniqueness(self, db_session):
        """Test that caa_member_id is unique across customers."""
        customer1 = Customer(
            name="Customer 1",
            email="customer1@example.com",
            caa_member_id="CAA12345"
        )
        customer2 = Customer(
            name="Customer 2", 
            email="customer2@example.com",
            caa_member_id="CAA12345"  # Same CAA ID
        )
        
        db_session.add(customer1)
        db_session.commit()
        
        db_session.add(customer2)
        with pytest.raises(IntegrityError):
            db_session.commit()


class TestAircraftTypes:
    """Test AircraftType model for receipt system."""
    
    def test_aircraft_type_creation(self, db_session):
        """Test creating an aircraft type with all required fields."""
        aircraft_type = AircraftType(
            name="Citation CJ3",
            base_min_fuel_gallons_for_waiver=Decimal('200.0'),
            default_aircraft_classification_id=None,  # Will be set when fee categories exist
            default_max_gross_weight_lbs=Decimal('13870.0')
        )
        db_session.add(aircraft_type)
        db_session.commit()
        
        retrieved = AircraftType.query.filter_by(name="Citation CJ3").first()
        assert retrieved is not None
        assert retrieved.name == "Citation CJ3"
        assert retrieved.base_min_fuel_gallons_for_waiver == Decimal('200.0')
        assert retrieved.default_max_gross_weight_lbs == Decimal('13870.0')
    
    def test_aircraft_type_name_uniqueness(self, db_session):
        """Test that aircraft type names are unique."""
        aircraft_type1 = AircraftType(
            name="Citation CJ3",
            base_min_fuel_gallons_for_waiver=Decimal('200.0')
        )
        aircraft_type2 = AircraftType(
            name="Citation CJ3",  # Duplicate name
            base_min_fuel_gallons_for_waiver=Decimal('150.0')
        )
        
        db_session.add(aircraft_type1)
        db_session.commit()
        
        db_session.add(aircraft_type2)
        with pytest.raises(IntegrityError):
            db_session.commit()


class TestFeeCategories:
    """Test AircraftClassification model for receipt system."""
    
    def test_aircraft_classification_creation(self, db_session):
        """Test creating a fee category with FBO location ID."""
        aircraft_classification = AircraftClassification(
            fbo_location_id=1,
            name="Light Jet"
        )
        db_session.add(aircraft_classification)
        db_session.commit()
        
        retrieved = AircraftClassification.query.filter_by(
            fbo_location_id=1, 
            name="Light Jet"
        ).first()
        assert retrieved is not None
        assert retrieved.fbo_location_id == 1
        assert retrieved.name == "Light Jet"
    
    def test_aircraft_classification_unique_per_fbo(self, db_session):
        """Test that fee category names are unique per FBO."""
        # Same name but different FBOs should be allowed
        aircraft_classification1 = AircraftClassification(fbo_location_id=1, name="Light Jet")
        aircraft_classification2 = AircraftClassification(fbo_location_id=2, name="Light Jet")
        
        db_session.add_all([aircraft_classification1, aircraft_classification2])
        db_session.commit()
        
        # Same name and same FBO should fail
        aircraft_classification3 = AircraftClassification(fbo_location_id=1, name="Light Jet")
        db_session.add(aircraft_classification3)
        with pytest.raises(IntegrityError):
            db_session.commit()


class TestAircraftTypeToAircraftClassificationMapping:
    """Test AircraftTypeToAircraftClassificationMapping model."""
    
    def test_mapping_creation(self, db_session):
        """Test creating aircraft type to fee category mapping."""
        # Create dependencies first
        aircraft_type = AircraftType(
            name="Citation CJ3",
            base_min_fuel_gallons_for_waiver=Decimal('200.0')
        )
        aircraft_classification = AircraftClassification(fbo_location_id=1, name="Light Jet")
        
        db_session.add_all([aircraft_type, aircraft_classification])
        db_session.commit()
        
        # Create mapping
        mapping = AircraftTypeToAircraftClassificationMapping(
            fbo_location_id=1,
            aircraft_type_id=aircraft_type.id,
            aircraft_classification_id=aircraft_classification.id
        )
        db_session.add(mapping)
        db_session.commit()
        
        retrieved = AircraftTypeToAircraftClassificationMapping.query.filter_by(
            fbo_location_id=1,
            aircraft_type_id=aircraft_type.id
        ).first()
        assert retrieved is not None
        assert retrieved.aircraft_classification_id == aircraft_classification.id
    
    def test_mapping_unique_per_fbo_aircraft_type(self, db_session):
        """Test that aircraft type can only map to one fee category per FBO."""
        aircraft_type = AircraftType(
            name="Citation CJ3",
            base_min_fuel_gallons_for_waiver=Decimal('200.0')
        )
        aircraft_classification1 = AircraftClassification(fbo_location_id=1, name="Light Jet")
        aircraft_classification2 = AircraftClassification(fbo_location_id=1, name="Medium Jet")
        
        db_session.add_all([aircraft_type, aircraft_classification1, aircraft_classification2])
        db_session.commit()
        
        # First mapping should work
        mapping1 = AircraftTypeToAircraftClassificationMapping(
            fbo_location_id=1,
            aircraft_type_id=aircraft_type.id,
            aircraft_classification_id=aircraft_classification1.id
        )
        db_session.add(mapping1)
        db_session.commit()
        
        # Second mapping for same aircraft type and FBO should fail
        mapping2 = AircraftTypeToAircraftClassificationMapping(
            fbo_location_id=1,
            aircraft_type_id=aircraft_type.id,
            aircraft_classification_id=aircraft_classification2.id
        )
        db_session.add(mapping2)
        with pytest.raises(IntegrityError):
            db_session.commit()


class TestFeeRules:
    """Test FeeRule model for receipt system."""
    
    def test_fee_rule_creation(self, db_session):
        """Test creating a fee rule with all fields."""
        aircraft_classification = AircraftClassification(fbo_location_id=1, name="Light Jet")
        db_session.add(aircraft_classification)
        db_session.commit()
        
        fee_rule = FeeRule(
            fbo_location_id=1,
            fee_name="Ramp Fee",
            fee_code="RAMP_FEE",
            applies_to_aircraft_classification_id=aircraft_classification.id,
            amount=Decimal('50.00'),
            currency="USD",
            is_taxable=True,
            is_potentially_waivable_by_fuel_uplift=True,
            calculation_basis='FIXED_PRICE',
            waiver_strategy='SIMPLE_MULTIPLIER',
            simple_waiver_multiplier=Decimal('2.0'),
            has_caa_override=True,
            caa_override_amount=Decimal('40.00'),
            caa_waiver_strategy_override='SIMPLE_MULTIPLIER',
            caa_simple_waiver_multiplier_override=Decimal('1.5')
        )
        db_session.add(fee_rule)
        db_session.commit()
        
        retrieved = FeeRule.query.filter_by(
            fbo_location_id=1,
            fee_code="RAMP_FEE"
        ).first()
        assert retrieved is not None
        assert retrieved.fee_name == "Ramp Fee"
        assert retrieved.amount == Decimal('50.00')
        assert retrieved.waiver_strategy.value == 'SIMPLE_MULTIPLIER'
        assert retrieved.has_caa_override is True
        assert retrieved.caa_override_amount == Decimal('40.00')
    
    def test_fee_rule_code_unique_per_fbo(self, db_session):
        """Test that fee codes are unique per FBO."""
        aircraft_classification = AircraftClassification(fbo_location_id=1, name="Light Jet")
        db_session.add(aircraft_classification)
        db_session.commit()
        
        # Same fee code but different FBOs should be allowed
        fee_rule1 = FeeRule(
            fbo_location_id=1,
            fee_name="Ramp Fee",
            fee_code="RAMP_FEE",
            applies_to_aircraft_classification_id=aircraft_classification.id,
            amount=Decimal('50.00')
        )
        fee_rule2 = FeeRule(
            fbo_location_id=2,
            fee_name="Ramp Fee",
            fee_code="RAMP_FEE",
            applies_to_aircraft_classification_id=aircraft_classification.id,
            amount=Decimal('60.00')
        )
        
        db_session.add_all([fee_rule1, fee_rule2])
        db_session.commit()
        
        # Same fee code and same FBO should fail
        fee_rule3 = FeeRule(
            fbo_location_id=1,
            fee_name="Another Ramp Fee",
            fee_code="RAMP_FEE",
            applies_to_aircraft_classification_id=aircraft_classification.id,
            amount=Decimal('70.00')
        )
        db_session.add(fee_rule3)
        with pytest.raises(IntegrityError):
            db_session.commit()


class TestWaiverTiers:
    """Test WaiverTier model for receipt system."""
    
    def test_waiver_tier_creation(self, db_session):
        """Test creating a waiver tier with JSON fee codes."""
        waiver_tier = WaiverTier(
            fbo_location_id=1,
            name="Standard Waiver",
            fuel_uplift_multiplier=Decimal('2.0'),
            fees_waived_codes=["RAMP_FEE", "OVERNIGHT_FEE"],
            tier_priority=1,
            is_caa_specific_tier=False
        )
        db_session.add(waiver_tier)
        db_session.commit()
        
        retrieved = WaiverTier.query.filter_by(
            fbo_location_id=1,
            name="Standard Waiver"
        ).first()
        assert retrieved is not None
        assert retrieved.fuel_uplift_multiplier == Decimal('2.0')
        assert retrieved.fees_waived_codes == ["RAMP_FEE", "OVERNIGHT_FEE"]
        assert retrieved.tier_priority == 1
        assert retrieved.is_caa_specific_tier is False
    
    def test_caa_specific_waiver_tier(self, db_session):
        """Test creating a CAA-specific waiver tier."""
        waiver_tier = WaiverTier(
            fbo_location_id=1,
            name="CAA Premium Waiver",
            fuel_uplift_multiplier=Decimal('1.5'),
            fees_waived_codes=["RAMP_FEE", "OVERNIGHT_FEE", "FACILITY_FEE"],
            tier_priority=2,
            is_caa_specific_tier=True
        )
        db_session.add(waiver_tier)
        db_session.commit()
        
        retrieved = WaiverTier.query.filter_by(
            fbo_location_id=1,
            is_caa_specific_tier=True
        ).first()
        assert retrieved is not None
        assert retrieved.name == "CAA Premium Waiver"
        assert retrieved.is_caa_specific_tier is True
        assert len(retrieved.fees_waived_codes) == 3


class TestReceipts:
    """Test Receipt model for receipt system."""
    
    def test_receipt_creation(self, db_session, test_users):
        """Test creating a receipt with all required fields."""
        # Create dependencies
        customer = Customer(
            name="Test Customer",
            email="receipt_test@example.com"
        )
        db_session.add(customer)
        db_session.commit()
        
                # Use test user from conftest
        user = User.query.filter_by(username='csr').first()

        # Create required aircraft record for foreign key constraint
        from src.models.aircraft import Aircraft
        aircraft = Aircraft(
            tail_number="N123AB",
            aircraft_type="Citation CJ3",
            fuel_type="Jet A"
        )
        db_session.add(aircraft)
        db_session.commit()

        # Create a mock fuel order (simplified for testing)
        from src.models.fuel_order import FuelOrder, FuelOrderStatus
        fuel_order = FuelOrder(
            tail_number="N123AB",
            fuel_type="Jet A",
            requested_amount=Decimal('100.0'),
            status=FuelOrderStatus.COMPLETED
        )
        db_session.add(fuel_order)
        db_session.commit()
        
        receipt = Receipt(
            receipt_number="FBO1-001",
            fbo_location_id=1,
            fuel_order_id=fuel_order.id,
            customer_id=customer.id,
            aircraft_type_at_receipt_time="Citation CJ3",
            fuel_type_at_receipt_time="Jet A",
            fuel_quantity_gallons_at_receipt_time=Decimal('100.0'),
            fuel_unit_price_at_receipt_time=Decimal('5.50'),
            fuel_subtotal=Decimal('550.00'),
            total_fees_amount=Decimal('50.00'),
            total_waivers_amount=Decimal('0.00'),
            tax_amount=Decimal('48.00'),
            grand_total_amount=Decimal('648.00'),
            status='DRAFT',
            is_caa_applied=False,
            created_by_user_id=user.id,
            updated_by_user_id=user.id
        )
        db_session.add(receipt)
        db_session.commit()
        
        retrieved = Receipt.query.filter_by(receipt_number="FBO1-001").first()
        assert retrieved is not None
        assert retrieved.fbo_location_id == 1
        assert retrieved.fuel_quantity_gallons_at_receipt_time == Decimal('100.0')
        assert retrieved.status.value == 'DRAFT'
        assert retrieved.grand_total_amount == Decimal('648.00')
    
    def test_receipt_number_unique_per_fbo(self, db_session, test_users):
        """Test that receipt numbers are unique per FBO."""
        customer = Customer(
            name="Test Customer",
            email="receipt_unique_test@example.com"
        )
        db_session.add(customer)
        db_session.commit()
        
        user = User.query.filter_by(username='csr').first()
        
        # Same receipt number but different FBOs should be allowed
        receipt1 = Receipt(
            receipt_number="FBO-001",
            fbo_location_id=1,
            customer_id=customer.id,
            status='DRAFT',
            created_by_user_id=user.id,
            updated_by_user_id=user.id,
            aircraft_type_at_receipt_time="Citation CJ3",
            fuel_type_at_receipt_time="Jet A",
            fuel_quantity_gallons_at_receipt_time=Decimal('100.0'),
            fuel_unit_price_at_receipt_time=Decimal('5.50'),
            fuel_subtotal=Decimal('550.00'),
            total_fees_amount=Decimal('0.00'),
            total_waivers_amount=Decimal('0.00'),
            tax_amount=Decimal('0.00'),
            grand_total_amount=Decimal('550.00')
        )
        receipt2 = Receipt(
            receipt_number="FBO-001",
            fbo_location_id=2,
            customer_id=customer.id,
            status='DRAFT',
            created_by_user_id=user.id,
            updated_by_user_id=user.id,
            aircraft_type_at_receipt_time="Citation CJ3",
            fuel_type_at_receipt_time="Jet A",
            fuel_quantity_gallons_at_receipt_time=Decimal('100.0'),
            fuel_unit_price_at_receipt_time=Decimal('5.50'),
            fuel_subtotal=Decimal('550.00'),
            total_fees_amount=Decimal('0.00'),
            total_waivers_amount=Decimal('0.00'),
            tax_amount=Decimal('0.00'),
            grand_total_amount=Decimal('550.00')
        )
        
        db_session.add_all([receipt1, receipt2])
        db_session.commit()
        
        # Same receipt number and same FBO should fail
        receipt3 = Receipt(
            receipt_number="FBO-001",
            fbo_location_id=1,
            customer_id=customer.id,
            status='DRAFT',
            created_by_user_id=user.id,
            updated_by_user_id=user.id,
            aircraft_type_at_receipt_time="Citation CJ3",
            fuel_type_at_receipt_time="Jet A",
            fuel_quantity_gallons_at_receipt_time=Decimal('100.0'),
            fuel_unit_price_at_receipt_time=Decimal('5.50'),
            fuel_subtotal=Decimal('550.00'),
            total_fees_amount=Decimal('0.00'),
            total_waivers_amount=Decimal('0.00'),
            tax_amount=Decimal('0.00'),
            grand_total_amount=Decimal('550.00')
        )
        db_session.add(receipt3)
        with pytest.raises(IntegrityError):
            db_session.commit()


class TestReceiptLineItems:
    """Test ReceiptLineItem model for receipt system."""
    
    def test_receipt_line_item_creation(self, db_session, test_users):
        """Test creating receipt line items and relationship with receipt."""
        # Create dependencies
        customer = Customer(
            name="Line Item Test Customer",
            email="lineitem_test@example.com"
        )
        db_session.add(customer)
        db_session.commit()
        
        user = User.query.filter_by(username='csr').first()
        
        receipt = Receipt(
            receipt_number="FBO1-002",
            fbo_location_id=1,
            customer_id=customer.id,
            status='DRAFT',
            created_by_user_id=user.id,
            updated_by_user_id=user.id,
            aircraft_type_at_receipt_time="Citation CJ3",
            fuel_type_at_receipt_time="Jet A",
            fuel_quantity_gallons_at_receipt_time=Decimal('100.0'),
            fuel_unit_price_at_receipt_time=Decimal('5.50'),
            fuel_subtotal=Decimal('550.00'),
            total_fees_amount=Decimal('50.00'),
            total_waivers_amount=Decimal('-25.00'),
            tax_amount=Decimal('46.00'),
            grand_total_amount=Decimal('621.00')
        )
        db_session.add(receipt)
        db_session.commit()
        
        # Create line items
        fuel_line_item = ReceiptLineItem(
            receipt_id=receipt.id,
            line_item_type='FUEL',
            description="Jet A Fuel",
            quantity=Decimal('100.0'),
            unit_price=Decimal('5.50'),
            amount=Decimal('550.00')
        )
        fee_line_item = ReceiptLineItem(
            receipt_id=receipt.id,
            line_item_type='FEE',
            description="Ramp Fee",
            fee_code_applied="RAMP_FEE",
            quantity=Decimal('1.0'),
            unit_price=Decimal('50.00'),
            amount=Decimal('50.00')
        )
        waiver_line_item = ReceiptLineItem(
            receipt_id=receipt.id,
            line_item_type='WAIVER',
            description="Fuel Uplift Waiver (Ramp Fee)",
            fee_code_applied="RAMP_FEE",
            quantity=Decimal('1.0'),
            unit_price=Decimal('-25.00'),
            amount=Decimal('-25.00')
        )
        
        db_session.add_all([fuel_line_item, fee_line_item, waiver_line_item])
        db_session.commit()
        
        # Test relationships
        retrieved_receipt = Receipt.query.filter_by(receipt_number="FBO1-002").first()
        assert retrieved_receipt is not None
        assert len(retrieved_receipt.line_items) == 3
        
        # Test line item types
        line_item_types = [item.line_item_type.value if hasattr(item.line_item_type, 'value') else item.line_item_type for item in retrieved_receipt.line_items]
        assert 'FUEL' in line_item_types
        assert 'FEE' in line_item_types
        assert 'WAIVER' in line_item_types
        
        # Test negative amount for waiver
        waiver_item = next(item for item in retrieved_receipt.line_items if (item.line_item_type.value if hasattr(item.line_item_type, 'value') else item.line_item_type) == 'WAIVER')
        assert waiver_item.amount == Decimal('-25.00')
    
    def test_receipt_line_item_cascade_delete(self, db_session, test_users):
        """Test that deleting a receipt also deletes its line items."""
        customer = Customer(
            name="Cascade Test Customer",
            email="cascade_test@example.com"
        )
        db_session.add(customer)
        db_session.commit()
        
        user = User.query.filter_by(username='csr').first()
        
        receipt = Receipt(
            receipt_number="FBO1-003",
            fbo_location_id=1,
            customer_id=customer.id,
            status='DRAFT',
            created_by_user_id=user.id,
            updated_by_user_id=user.id,
            aircraft_type_at_receipt_time="Citation CJ3",
            fuel_type_at_receipt_time="Jet A",
            fuel_quantity_gallons_at_receipt_time=Decimal('100.0'),
            fuel_unit_price_at_receipt_time=Decimal('5.50'),
            fuel_subtotal=Decimal('550.00'),
            total_fees_amount=Decimal('0.00'),
            total_waivers_amount=Decimal('0.00'),
            tax_amount=Decimal('0.00'),
            grand_total_amount=Decimal('550.00')
        )
        db_session.add(receipt)
        db_session.commit()
        
        line_item = ReceiptLineItem(
            receipt_id=receipt.id,
            line_item_type='FUEL',
            description="Test Fuel",
            quantity=Decimal('100.0'),
            unit_price=Decimal('5.50'),
            amount=Decimal('550.00')
        )
        db_session.add(line_item)
        db_session.commit()
        
        # Verify line item exists
        assert ReceiptLineItem.query.filter_by(receipt_id=receipt.id).count() == 1
        
        # Delete receipt
        db_session.delete(receipt)
        db_session.commit()
        
        # Verify line item was cascade deleted
        assert ReceiptLineItem.query.filter_by(receipt_id=receipt.id).count() == 0


class TestFBOLocationScoping:
    """Test that fbo_location_id properly scopes data per FBO."""
    
    def test_fee_rules_scoped_by_fbo_location(self, db_session):
        """Test querying fee rules by FBO location ID."""
        aircraft_classification1 = AircraftClassification(fbo_location_id=1, name="Light Jet")
        aircraft_classification2 = AircraftClassification(fbo_location_id=2, name="Light Jet")
        db_session.add_all([aircraft_classification1, aircraft_classification2])
        db_session.commit()
        
        fee_rule1 = FeeRule(
            fbo_location_id=1,
            fee_name="Ramp Fee FBO1",
            fee_code="RAMP_FEE",
            applies_to_aircraft_classification_id=aircraft_classification1.id,
            amount=Decimal('50.00')
        )
        fee_rule2 = FeeRule(
            fbo_location_id=2,
            fee_name="Ramp Fee FBO2",
            fee_code="RAMP_FEE",
            applies_to_aircraft_classification_id=aircraft_classification2.id,
            amount=Decimal('75.00')
        )
        db_session.add_all([fee_rule1, fee_rule2])
        db_session.commit()
        
        # Query rules for FBO 1 only
        fbo1_rules = FeeRule.query.filter_by(fbo_location_id=1).all()
        assert len(fbo1_rules) == 1
        assert fbo1_rules[0].fee_name == "Ramp Fee FBO1"
        assert fbo1_rules[0].amount == Decimal('50.00')
        
        # Query rules for FBO 2 only
        fbo2_rules = FeeRule.query.filter_by(fbo_location_id=2).all()
        assert len(fbo2_rules) == 1
        assert fbo2_rules[0].fee_name == "Ramp Fee FBO2"
        assert fbo2_rules[0].amount == Decimal('75.00')


class TestEnumValueConstraints:
    """Test ENUM constraints on various models."""
    
    def test_fee_rule_enum_constraints(self, db_session):
        """Test ENUM constraints on FeeRule model."""
        aircraft_classification = AircraftClassification(fbo_location_id=1, name="Light Jet")
        db_session.add(aircraft_classification)
        db_session.commit()
        
        # Valid ENUM values should work
        valid_fee_rule = FeeRule(
            fbo_location_id=1,
            fee_name="Test Fee",
            fee_code="TEST_FEE",
            applies_to_aircraft_classification_id=aircraft_classification.id,
            amount=Decimal('50.00'),
            calculation_basis='FIXED_PRICE',
            waiver_strategy='SIMPLE_MULTIPLIER'
        )
        db_session.add(valid_fee_rule)
        db_session.commit()
        
        # Invalid ENUM values should raise error
        invalid_fee_rule = FeeRule(
            fbo_location_id=1,
            fee_name="Invalid Fee",
            fee_code="INVALID_FEE",
            applies_to_aircraft_classification_id=aircraft_classification.id,
            amount=Decimal('50.00'),
            calculation_basis='INVALID_BASIS',  # Invalid ENUM value
            waiver_strategy='NONE'
        )
        db_session.add(invalid_fee_rule)
        with pytest.raises(Exception):  # Should be a database constraint error
            db_session.commit()
    
    def test_receipt_status_enum_constraints(self, db_session, test_users):
        """Test ENUM constraints on Receipt status."""
        customer = Customer(
            name="Enum Test Customer",
            email="enum_test@example.com"
        )
        db_session.add(customer)
        db_session.commit()
        
        user = User.query.filter_by(username='csr').first()
        
        # Valid status should work
        valid_receipt = Receipt(
            receipt_number="ENUM-001",
            fbo_location_id=1,
            customer_id=customer.id,
            status='GENERATED',  # Valid ENUM value
            created_by_user_id=user.id,
            updated_by_user_id=user.id,
            aircraft_type_at_receipt_time="Citation CJ3",
            fuel_type_at_receipt_time="Jet A",
            fuel_quantity_gallons_at_receipt_time=Decimal('100.0'),
            fuel_unit_price_at_receipt_time=Decimal('5.50'),
            fuel_subtotal=Decimal('550.00'),
            total_fees_amount=Decimal('0.00'),
            total_waivers_amount=Decimal('0.00'),
            tax_amount=Decimal('0.00'),
            grand_total_amount=Decimal('550.00')
        )
        db_session.add(valid_receipt)
        db_session.commit()
        
        # Invalid status should raise error
        invalid_receipt = Receipt(
            receipt_number="ENUM-002",
            fbo_location_id=1,
            customer_id=customer.id,
            status='INVALID_STATUS',  # Invalid ENUM value
            created_by_user_id=user.id,
            updated_by_user_id=user.id,
            aircraft_type_at_receipt_time="Citation CJ3",
            fuel_type_at_receipt_time="Jet A",
            fuel_quantity_gallons_at_receipt_time=Decimal('100.0'),
            fuel_unit_price_at_receipt_time=Decimal('5.50'),
            fuel_subtotal=Decimal('550.00'),
            total_fees_amount=Decimal('0.00'),
            total_waivers_amount=Decimal('0.00'),
            tax_amount=Decimal('0.00'),
            grand_total_amount=Decimal('550.00')
        )
        db_session.add(invalid_receipt)
        with pytest.raises(Exception):  # Should be a database constraint error
            db_session.commit() 