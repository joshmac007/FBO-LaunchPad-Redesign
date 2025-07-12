"""
Fee Calculation Service

This service provides the core business logic for calculating fees, taxes, and waivers
for fuel order transactions. It is designed to be:
- Isolated: Pure business logic with no direct API exposure
- Immutable: Does not modify database state, only reads and calculates
- Clear: Uses dataclasses for well-defined input/output contracts
- Unit Consistent: All fuel volume calculations use gallons
"""

from dataclasses import dataclass, field
from decimal import Decimal
from typing import List, Dict, Any, Optional, Set
from flask import current_app
from sqlalchemy.orm import joinedload
from ..extensions import db
from sqlalchemy import and_

from ..extensions import db
from ..models.customer import Customer
from ..models.aircraft_type import AircraftType
from ..models.aircraft_classification import AircraftClassification
from ..models.fee_rule import FeeRule, WaiverStrategy, CalculationBasis
from ..models.waiver_tier import WaiverTier


@dataclass
class FeeCalculationContext:
    """Input context for fee calculation."""
    aircraft_type_id: int
    customer_id: int
    fuel_uplift_gallons: Decimal
    fuel_price_per_gallon: Decimal
    additional_services: List[Dict[str, Any]] = field(default_factory=list)  # [{'fee_code': 'GPU', 'quantity': 1}]


@dataclass
class FeeCalculationResultLineItem:
    """Represents a single line item in the fee calculation result."""
    line_item_type: str  # 'FUEL', 'FEE', 'WAIVER', 'TAX', 'DISCOUNT'
    description: str
    amount: Decimal
    quantity: Decimal = Decimal('1.0')
    unit_price: Optional[Decimal] = None
    fee_code_applied: Optional[str] = None  # Fee code for fees and waivers
    is_taxable: bool = True
    waiver_source: Optional[str] = None  # 'AUTOMATIC' or 'MANUAL' for waiver line items


@dataclass
class FeeCalculationResult:
    """Complete result of fee calculation with itemized breakdown and totals."""
    line_items: List[FeeCalculationResultLineItem]
    fuel_subtotal: Decimal
    total_fees_amount: Decimal
    total_waivers_amount: Decimal
    tax_amount: Decimal
    grand_total_amount: Decimal
    is_caa_applied: bool


class FeeCalculationService:
    """Service for calculating fees, taxes, and waivers for transactions."""
    
    # Default tax rate - in a real system this would be configurable
    DEFAULT_TAX_RATE = Decimal('0.08')  # 8%
    
    def calculate_for_transaction(self, context: FeeCalculationContext) -> FeeCalculationResult:
        """
        Main public method to calculate all fees, waivers, and taxes for a transaction.
        
        Args:
            context: Input context with transaction details
            
        Returns:
            Complete calculation result with line items and totals
        """
        try:
            # Fetch all necessary data from database
            data = self._fetch_data(context)
            
            # Initialize result components
            line_items = []
            
            # Determine if customer is CAA member
            is_caa_member = data['customer'].is_caa_member if data['customer'] else False
            
            # 1. Calculate fuel line item
            fuel_line_item = FeeCalculationResultLineItem(
                line_item_type='FUEL',
                description=f"Fuel ({context.fuel_uplift_gallons} gallons)",
                amount=context.fuel_uplift_gallons * context.fuel_price_per_gallon,
                quantity=context.fuel_uplift_gallons,
                unit_price=context.fuel_price_per_gallon,
                is_taxable=True
            )
            line_items.append(fuel_line_item)
            
            # 2. Determine applicable fee rules
            # Store aircraft type ID for override lookups
            self._current_aircraft_type_id = context.aircraft_type_id
            
            applicable_rules = self._determine_applicable_rules(
                data['fee_rules'], 
                data['aircraft_aircraft_classification_id'],
                context.additional_services
            )
            
            # 3. Evaluate tiered waivers
            # Get base minimum fuel gallons for waiver from aircraft type (single source of truth)
            base_min_fuel_for_waiver = None
            if data['aircraft_type']:
                base_min_fuel_for_waiver = data['aircraft_type'].base_min_fuel_gallons_for_waiver
            
            waived_fee_codes = self._evaluate_waivers(
                context.fuel_uplift_gallons,
                base_min_fuel_for_waiver,
                data['waiver_tiers'],
                is_caa_member
            )
            
            # 4. Process each applicable fee rule
            for rule in applicable_rules:
                # Determine amounts and waiver settings based on CAA membership
                if is_caa_member and rule.has_caa_override:
                    fee_amount = rule.caa_override_amount
                    waiver_strategy = rule.caa_waiver_strategy_override or rule.waiver_strategy
                    simple_multiplier = rule.caa_simple_waiver_multiplier_override or rule.simple_waiver_multiplier
                else:
                    fee_amount = rule.amount
                    waiver_strategy = rule.waiver_strategy
                    simple_multiplier = rule.simple_waiver_multiplier
                
                # Get quantity for this service
                service_quantity = self._get_service_quantity(rule.fee_code, context.additional_services)
                total_amount = fee_amount * service_quantity
                
                # Add fee line item
                fee_line_item = FeeCalculationResultLineItem(
                    line_item_type='FEE',
                    description=rule.fee_name,
                    amount=total_amount,
                    quantity=service_quantity,
                    unit_price=fee_amount,
                    fee_code_applied=rule.fee_code,
                    is_taxable=rule.is_taxable
                )
                line_items.append(fee_line_item)
                
                # Check if fee should be waived
                should_waive = False
                
                if waiver_strategy != WaiverStrategy.NONE and base_min_fuel_for_waiver:
                    if waiver_strategy == WaiverStrategy.SIMPLE_MULTIPLIER:
                        # Simple multiplier waiver
                        threshold = base_min_fuel_for_waiver * simple_multiplier
                        should_waive = context.fuel_uplift_gallons >= threshold
                        
                    elif waiver_strategy == WaiverStrategy.TIERED_MULTIPLIER:
                        # Tiered multiplier waiver
                        should_waive = rule.fee_code in waived_fee_codes
                
                if should_waive:
                    # Add waiver line item (negative amount, matches the total fee amount)
                    waiver_line_item = FeeCalculationResultLineItem(
                        line_item_type='WAIVER',
                        description=f"Fuel Uplift Waiver ({rule.fee_name})",
                        amount=-total_amount,
                        quantity=service_quantity,
                        fee_code_applied=rule.fee_code,
                        is_taxable=False,
                        waiver_source='AUTOMATIC'
                    )
                    line_items.append(waiver_line_item)
            
            # 5. Calculate tax on all taxable line items
            taxable_amount = sum(
                item.amount for item in line_items 
                if item.is_taxable and item.line_item_type in ['FUEL', 'FEE']
            )
            
            tax_amount = self._calculate_taxes(taxable_amount) # type: ignore
            if tax_amount > 0:
                tax_line_item = FeeCalculationResultLineItem(
                    line_item_type='TAX',
                    description="Tax",
                    amount=tax_amount,
                    is_taxable=False
                )
                line_items.append(tax_line_item)
            
            # 6. Calculate totals
            fuel_subtotal = fuel_line_item.amount
            total_fees_amount = sum(
                item.amount for item in line_items 
                if item.line_item_type == 'FEE'
            )
            total_waivers_amount = abs(sum(
                item.amount for item in line_items 
                if item.line_item_type == 'WAIVER'
            ))
            grand_total_amount = sum(
                item.amount for item in line_items 
                if item.line_item_type in ['FUEL', 'FEE', 'WAIVER', 'TAX']
            )
            
            return FeeCalculationResult(
                line_items=line_items,
                fuel_subtotal=fuel_subtotal,
                total_fees_amount=total_fees_amount, # type: ignore
                total_waivers_amount=total_waivers_amount, # type: ignore
                tax_amount=tax_amount, # type: ignore
                grand_total_amount=grand_total_amount, # type: ignore
                is_caa_applied=is_caa_member
            )
            
        except Exception as e:
            current_app.logger.error(f"Error in fee calculation: {str(e)}")
            raise
    
    def _fetch_data(self, context: FeeCalculationContext) -> Dict[str, Any]:
        """
        Efficiently fetch all necessary data from the database.
        
        Args:
            context: Input context
            
        Returns:
            Dictionary containing all fetched data
        """
        # Fetch customer
        customer = db.session.get(Customer, context.customer_id)
        
        # Fetch aircraft type
        aircraft_type = db.session.get(AircraftType, context.aircraft_type_id)
        
        # Find aircraft's fee category (now global relationship)
        aircraft_aircraft_classification_id = None
        if aircraft_type:
            aircraft_aircraft_classification_id = aircraft_type.classification_id
        
        # Fetch all fee rules
        fee_rules = FeeRule.query.all()  # FeeRule is now global without aircraft_classification relationship
        
        # Fetch all waiver tiers
        waiver_tiers = WaiverTier.query.all()
        
        return {
            'customer': customer,
            'aircraft_type': aircraft_type,
            'aircraft_aircraft_classification_id': aircraft_aircraft_classification_id,
            'fee_rules': fee_rules,
            'waiver_tiers': waiver_tiers
        }
    
    def _determine_applicable_rules(
        self, 
        all_rules: List[FeeRule], 
        aircraft_aircraft_classification_id: Optional[int],
        additional_services: List[Dict[str, Any]]
    ) -> List[FeeRule]:
        """
        Filter fee rules using the simplified three-tier hierarchy to determine applicable rules.
        
        Three-tier hierarchy (highest to lowest priority):
        1. Aircraft-specific override
        2. Classification-specific override  
        3. Global base fee
        
        Args:
            all_rules: All fee rules
            aircraft_aircraft_classification_id: Classification ID for the aircraft
            additional_services: Additional services requested
            
        Returns:
            List of applicable fee rules with overrides applied
        """
        from ..models.fee_rule_override import FeeRuleOverride
        
        # Get aircraft type ID from context for overrides
        aircraft_type_id = getattr(self, '_current_aircraft_type_id', None)
        
        # Fetch all overrides efficiently
        all_overrides = FeeRuleOverride.query.all()
        
        # Initialize dictionaries for single-pass algorithm
        resolved_rules = {}
        overrides = {}
        
        # First, process all FeeRuleOverride records
        for override in all_overrides:
            fee_code = None
            # Find the fee code for this override
            for rule in all_rules:
                if rule.id == override.fee_rule_id:
                    fee_code = rule.fee_code
                    break
            
            if fee_code:
                if override.aircraft_type_id:
                    # Aircraft-specific override
                    key = (fee_code, 'aircraft')
                    overrides[key] = override
                elif override.classification_id:
                    # Classification-specific override
                    key = (fee_code, 'classification')
                    overrides[key] = override
        
        # Only process rules that are explicitly requested in additional_services
        # This ensures CSRs have full control over which fees are applied
        global_rules = all_rules
        additional_fee_codes = {service['fee_code'] for service in additional_services}
        
        for rule in global_rules:
            fee_code = rule.fee_code
            
            # Only process this rule if it's explicitly requested in additional_services
            if fee_code not in additional_fee_codes:
                continue
            
            # For each requested fee_code, determine the final rule using the three-tier hierarchy:
            # 1. Check for aircraft-specific override
            aircraft_override_key = (fee_code, 'aircraft')
            if aircraft_type_id and aircraft_override_key in overrides:
                override = overrides[aircraft_override_key]
                if override.aircraft_type_id == aircraft_type_id:
                    modified_rule = self._apply_override_to_rule(rule, override)
                    resolved_rules[fee_code] = modified_rule
                    continue
            
            # 2. Check for classification-specific override
            classification_override_key = (fee_code, 'classification')
            if aircraft_aircraft_classification_id and classification_override_key in overrides:
                override = overrides[classification_override_key]
                if override.classification_id == aircraft_aircraft_classification_id:
                    modified_rule = self._apply_override_to_rule(rule, override)
                    resolved_rules[fee_code] = modified_rule
                    continue
            
            # 3. Use global base fee (if no overrides exist)
            resolved_rules[fee_code] = rule
        
        return list(resolved_rules.values())
    
    def _apply_override_to_rule(self, base_rule: FeeRule, override: 'FeeRuleOverride') -> FeeRule:
        """
        Apply override values to a base rule, creating a modified copy.
        
        Args:
            base_rule: The base FeeRule
            override: The FeeRuleOverride to apply
            
        Returns:
            Modified FeeRule with override values applied
        """
        # Create a copy of the rule to avoid modifying the original
        modified_rule = FeeRule(
            id=base_rule.id,
            fee_name=base_rule.fee_name,
            fee_code=base_rule.fee_code,
            amount=override.override_amount if override.override_amount is not None else base_rule.amount,
            currency=base_rule.currency,
            is_taxable=base_rule.is_taxable,
            is_manually_waivable=base_rule.is_manually_waivable,
            calculation_basis=base_rule.calculation_basis,
            waiver_strategy=base_rule.waiver_strategy,
            simple_waiver_multiplier=base_rule.simple_waiver_multiplier,
            has_caa_override=base_rule.has_caa_override,
            caa_override_amount=override.override_caa_amount if override.override_caa_amount is not None else base_rule.caa_override_amount,
            caa_waiver_strategy_override=base_rule.caa_waiver_strategy_override,
            caa_simple_waiver_multiplier_override=base_rule.caa_simple_waiver_multiplier_override,
            created_at=base_rule.created_at,
            updated_at=base_rule.updated_at
        )
        
        return modified_rule
    
    def _evaluate_waivers(
        self,
        fuel_uplift_gallons: Decimal,
        base_min_fuel_for_waiver: Optional[Decimal],
        all_tiers: List[WaiverTier],
        is_caa_member: bool
    ) -> Set[str]:
        """
        Evaluate tiered waivers and return set of fee codes that are waived.
        
        Args:
            fuel_uplift_gallons: Amount of fuel purchased
            base_min_fuel_for_waiver: Aircraft's base minimum fuel for waivers
            all_tiers: All waiver tiers
            is_caa_member: Whether customer is a CAA member
            
        Returns:
            Set of fee codes that are waived by tiered system
        """
        waived_codes = set()
        
        if not base_min_fuel_for_waiver or fuel_uplift_gallons <= 0:
            return waived_codes
        
        # Filter tiers based on CAA membership
        relevant_tiers = [
            tier for tier in all_tiers
            if tier.is_caa_specific_tier == is_caa_member or not tier.is_caa_specific_tier
        ]
        
        # Find highest priority tier that is met
        met_tiers = []
        for tier in relevant_tiers:
            threshold = base_min_fuel_for_waiver * tier.fuel_uplift_multiplier
            if fuel_uplift_gallons >= threshold:
                met_tiers.append(tier)
        
        if met_tiers:
            # Sort by priority (higher number = higher priority)
            highest_priority_tier = max(met_tiers, key=lambda t: t.tier_priority)
            waived_codes.update(highest_priority_tier.fees_waived_codes)
        
        return waived_codes
    
    def _calculate_taxes(self, taxable_amount: Decimal) -> Decimal:
        """
        Calculate tax amount on the taxable base.
        
        Args:
            taxable_amount: Amount subject to tax
            
        Returns:
            Tax amount
        """
        if taxable_amount <= 0:
            return Decimal('0.00')
        
        # In a real system, tax rate would be configurable
        return (taxable_amount * self.DEFAULT_TAX_RATE).quantize(Decimal('0.01'))
    
    def _get_service_quantity(self, fee_code: str, additional_services: List[Dict[str, Any]]) -> Decimal:
        """
        Get the quantity for a specific service from additional services list.
        
        Args:
            fee_code: Fee code to look up
            additional_services: List of additional services
            
        Returns:
            Quantity for the service (defaults to 1.0)
        """
        for service in additional_services:
            if service.get('fee_code') == fee_code:
                return Decimal(str(service.get('quantity', 1)))
        
        return Decimal('1.0') 