"""
Admin Fee Configuration Service

This service handles CRUD operations for fee configuration entities including:
- Aircraft Types (base min fuel for waiver management)
- Aircraft Classifications (global resources)
- Fee Rules (with CAA overrides)
- Waiver Tiers

All configurations are now globally managed in the single-tenant architecture.
"""

import csv
import io
import json
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional, Tuple
from flask import current_app
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from sqlalchemy.orm import joinedload
from sqlalchemy import func

from ..extensions import db
from ..models import (
    AircraftType, AircraftClassification,
    FeeRule, WaiverTier, CalculationBasis, WaiverStrategy,
    FeeRuleOverride, FuelPrice, FuelTypeEnum, FuelType,
    FeeScheduleVersion
)
from ..schemas.fuel_type_schemas import (
    FuelTypeSchema, SetFuelPricesRequestSchema, FuelPriceEntrySchema
)
from ..schemas.admin_fee_config_schemas import (
    FeeScheduleSnapshotSchema, AircraftClassificationSchema, AircraftTypeSchema,
    FeeRuleSchema, WaiverTierSchema, FeeRuleOverrideSchema
)
from marshmallow import ValidationError as MarshmallowValidationError
from .aircraft_service import AircraftService


class AdminFeeConfigService:
    """Service for managing fee configurations (global aircraft classifications and rules)."""

    # Define the standard aircraft classification sort order
    AIRCRAFT_CLASSIFICATION_SORT_ORDER = [
        "Piston Single Engine",
        "Piston Multi Engine", 
        "Turboprop Single Engine",
        "Turboprop Multi Engine",
        "Light Jet",
        "Medium Jet",
        "Super-Mid Jet",
        "Large Jet",
        "Heavy Jet",
        "Super Heavy Jet",
        "Helicopter",
        "Military"
    ]

    @staticmethod
    def _sort_aircraft_classifications(classifications):
        """
        Sort aircraft classifications according to the standard hierarchy.
        Classifications not in the standard order will retain their original order by ID.
        """
        def classification_sort_key(classification):
            name = classification.name
            try:
                # Return the index from our sort order (lower index = higher priority)
                return (0, AdminFeeConfigService.AIRCRAFT_CLASSIFICATION_SORT_ORDER.index(name))
            except ValueError:
                # Not in our standard order, preserve original order by ID
                return (1, classification.id)
        
        return sorted(classifications, key=classification_sort_key)

    @staticmethod
    def get_aircraft_types() -> List[Dict[str, Any]]:
        """Get all aircraft types with their base min fuel for waiver."""
        try:
            aircraft_types = AircraftType.query.all()
            
            result = []
            for aircraft_type in aircraft_types:
                result.append({
                    'id': aircraft_type.id,
                    'name': aircraft_type.name,
                    'base_min_fuel_gallons_for_waiver': float(aircraft_type.base_min_fuel_gallons_for_waiver),
                    'classification_id': aircraft_type.classification_id,
                    'default_max_gross_weight_lbs': float(aircraft_type.default_max_gross_weight_lbs) if aircraft_type.default_max_gross_weight_lbs else None,
                    'created_at': aircraft_type.created_at.isoformat(),
                    'updated_at': aircraft_type.updated_at.isoformat()
                })
            return result
        except SQLAlchemyError as e:
            current_app.logger.error(f"Error fetching aircraft types: {str(e)}")
            raise

    @staticmethod
    def update_aircraft_type_fuel_waiver(aircraft_type_id: int, base_min_fuel_gallons: float) -> Dict[str, Any]:
        """Update base min fuel for waiver for a specific aircraft type."""
        try:
            # Verify aircraft type exists
            aircraft_type = AircraftType.query.get(aircraft_type_id)
            if not aircraft_type:
                raise ValueError("Aircraft type not found")
            
            # Update the aircraft type directly (consolidated to single source of truth)
            aircraft_type.base_min_fuel_gallons_for_waiver = base_min_fuel_gallons
            
            db.session.commit()
            
            return {
                'id': aircraft_type.id,
                'aircraft_type_id': aircraft_type.id,
                'aircraft_type_name': aircraft_type.name,
                'base_min_fuel_gallons_for_waiver': float(aircraft_type.base_min_fuel_gallons_for_waiver),
                'updated_at': aircraft_type.updated_at.isoformat()
            }
        except SQLAlchemyError as e:
            db.session.rollback()
            current_app.logger.error(f"Error updating aircraft type fuel waiver: {str(e)}")
            raise

    @staticmethod
    def get_aircraft_type_configs() -> List[Dict[str, Any]]:
        """Get all aircraft type configurations (now consolidated in AircraftType model)."""
        try:
            aircraft_types = AircraftType.query.all()
            
            return [
                {
                    'id': aircraft_type.id,
                    'aircraft_type_id': aircraft_type.id,
                    'aircraft_type_name': aircraft_type.name,
                    'base_min_fuel_gallons_for_waiver': float(aircraft_type.base_min_fuel_gallons_for_waiver),
                    'created_at': aircraft_type.created_at.isoformat(),
                    'updated_at': aircraft_type.updated_at.isoformat()
                }
                for aircraft_type in aircraft_types
            ]
        except SQLAlchemyError as e:
            current_app.logger.error(f"Error fetching aircraft type configs: {str(e)}")
            raise

    # Fee Categories CRUD
    @staticmethod
    def get_aircraft_classifications() -> List[Dict[str, Any]]:
        """Get all aircraft classifications."""
        try:
            classifications = AircraftClassification.query.all()
            sorted_classifications = AdminFeeConfigService._sort_aircraft_classifications(classifications)
            return [
                {
                    'id': classification.id,
                    'name': classification.name,
                    'created_at': classification.created_at.isoformat(),
                    'updated_at': classification.updated_at.isoformat()
                }
                for classification in sorted_classifications
            ]
        except SQLAlchemyError as e:
            current_app.logger.error(f"Error fetching aircraft classifications: {str(e)}")
            raise

    @staticmethod
    def get_aircraft_classification_by_id(classification_id: int) -> Optional[Dict[str, Any]]:
        """Get a single aircraft classification by ID."""
        try:
            classification = AircraftClassification.query.get(classification_id)
            
            if not classification:
                return None
                
            return {
                'id': classification.id,
                'name': classification.name,
                'created_at': classification.created_at.isoformat(),
                'updated_at': classification.updated_at.isoformat()
            }
        except SQLAlchemyError as e:
            current_app.logger.error(f"Error fetching aircraft classification: {str(e)}")
            raise

    @staticmethod
    def create_aircraft_classification(name: str) -> Dict[str, Any]:
        """Create a new aircraft classification."""
        try:
            classification = AircraftClassification()
            classification.name = name
            db.session.add(classification)
            db.session.commit()
            
            return {
                'id': classification.id,
                'name': classification.name,
                'created_at': classification.created_at.isoformat(),
                'updated_at': classification.updated_at.isoformat()
            }
        except IntegrityError as e:
            db.session.rollback()
            if '_classification_name_uc' in str(e):
                raise ValueError("Aircraft classification with this name already exists")
            raise
        except SQLAlchemyError as e:
            db.session.rollback()
            current_app.logger.error(f"Error creating aircraft classification: {str(e)}")
            raise

    @staticmethod
    def update_aircraft_classification(classification_id: int, name: str) -> Optional[Dict[str, Any]]:
        """Update an aircraft classification."""
        try:
            classification = AircraftClassification.query.get(classification_id)
            
            if not classification:
                return None
            
            classification.name = name
            db.session.commit()
            
            return {
                'id': classification.id,
                'name': classification.name,
                'created_at': classification.created_at.isoformat(),
                'updated_at': classification.updated_at.isoformat()
            }
        except IntegrityError as e:
            db.session.rollback()
            if '_classification_name_uc' in str(e):
                raise ValueError("Aircraft classification with this name already exists")
            raise
        except SQLAlchemyError as e:
            db.session.rollback()
            current_app.logger.error(f"Error updating aircraft classification: {str(e)}")
            raise

    @staticmethod
    def delete_aircraft_classification(classification_id: int) -> bool:
        """Delete an aircraft classification."""
        try:
            classification = AircraftClassification.query.get(classification_id)
            
            if not classification:
                return False
            
            # Note: Fee rules are now global, no need to check for classification references
            
            # Check if classification is referenced by aircraft types
            aircraft_types_count = AircraftType.query.filter_by(classification_id=classification_id).count()
            if aircraft_types_count > 0:
                raise ValueError("Cannot delete aircraft classification that is used by aircraft types")
            
            db.session.delete(classification)
            db.session.commit()
            return True
        except SQLAlchemyError as e:
            db.session.rollback()
            current_app.logger.error(f"Error deleting aircraft classification: {str(e)}")
            raise

    @staticmethod
    def get_or_create_general_aircraft_classification() -> Dict[str, Any]:
        """
        Get or create a 'General' aircraft classification using race-condition-proof logic.
        Aircraft classifications are global.
        """
        category_name = "General Service Fees"
        
        try:
            # First attempt: try to find existing global category
            category = AircraftClassification.query.filter_by(name=category_name).first()
            
            if category:
                return {
                    'id': category.id,
                    'name': category.name,
                    'created_at': category.created_at.isoformat(),
                    'updated_at': category.updated_at.isoformat()
                }
            
            # Not found, try to create it
            try:
                category = AircraftClassification()
                category.name = category_name
                db.session.add(category)
                db.session.commit()
                
                return {
                    'id': category.id,
                    'name': category.name,
                    'created_at': category.created_at.isoformat(),
                    'updated_at': category.updated_at.isoformat()
                }
                
            except IntegrityError:
                # Race condition occurred - another thread created it
                db.session.rollback()
                # Try SELECT again - this should now succeed
                category = AircraftClassification.query.filter_by(name=category_name).first()
                
                if not category:
                    # This should not happen, but handle gracefully
                    raise ValueError("Failed to create or retrieve General aircraft classification after race condition")
                
                return {
                    'id': category.id,
                    'name': category.name,
                    'created_at': category.created_at.isoformat(),
                    'updated_at': category.updated_at.isoformat()
                }
                
        except SQLAlchemyError as e:
            db.session.rollback()
            current_app.logger.error(f"Error in get_or_create_general_aircraft_classification: {str(e)}")
            raise

    # Aircraft Type to Fee Category Mappings CRUD
    @staticmethod
    def get_aircraft_type_classifications(category_id: Optional[int] = None) -> List[Dict[str, Any]]:
        """Get all aircraft types with their classifications, optionally filtered by classification."""
        try:
            query = AircraftType.query.options(
                joinedload(AircraftType.classification)  # type: ignore
            )
            
            # Apply category filter if provided
            if category_id is not None:
                query = query.filter_by(classification_id=category_id)
            
            aircraft_types = query.all()
            
            return [
                {
                    'id': aircraft_type.id,
                    'aircraft_type_id': aircraft_type.id,
                    'aircraft_type_name': aircraft_type.name,
                    'classification_id': aircraft_type.classification_id,
                    'classification_name': aircraft_type.classification.name if aircraft_type.classification else None,
                    'created_at': aircraft_type.created_at.isoformat(),
                    'updated_at': aircraft_type.updated_at.isoformat()
                }
                for aircraft_type in aircraft_types
            ]
        except SQLAlchemyError as e:
            current_app.logger.error(f"Error fetching aircraft type classifications: {str(e)}")
            raise

    @staticmethod
    def update_aircraft_type_classification(aircraft_type_id: int, aircraft_classification_id: int) -> Dict[str, Any]:
        """Update an aircraft type's classification (global operation)."""
        try:
            # Verify the aircraft classification exists (global)
            aircraft_classification = AircraftClassification.query.get(aircraft_classification_id)
            if not aircraft_classification:
                raise ValueError("Aircraft classification not found")
                
            # Verify aircraft type exists
            aircraft_type = AircraftType.query.get(aircraft_type_id)
            if not aircraft_type:
                raise ValueError("Aircraft type not found")
            
            # Update the classification directly
            aircraft_type.classification_id = aircraft_classification_id
            db.session.commit()
            
            return {
                'id': aircraft_type.id,
                'aircraft_type_id': aircraft_type.id,
                'aircraft_type_name': aircraft_type.name,
                'classification_id': aircraft_type.classification_id,
                'classification_name': aircraft_classification.name,
                'created_at': aircraft_type.created_at.isoformat(),
                'updated_at': aircraft_type.updated_at.isoformat()
            }
        except SQLAlchemyError as e:
            db.session.rollback()
            current_app.logger.error(f"Error updating aircraft type classification: {str(e)}")
            raise



    # Fee Rules CRUD
    @staticmethod
    def get_fee_rules(category_id: Optional[int] = None) -> List[Dict[str, Any]]:
        """Get all fee rules. Note: category_id parameter is deprecated since fee rules are now global."""
        try:
            # All fee rules are now global, ignore category_id parameter
            rules = FeeRule.query.all()
            
            return [rule.to_dict() for rule in rules]
        except SQLAlchemyError as e:
            current_app.logger.error(f"Error fetching fee rules: {str(e)}")
            raise

    @staticmethod
    def get_fee_rule(rule_id: int) -> Optional[Dict[str, Any]]:
        """Get a single fee rule by ID."""
        try:
            rule = FeeRule.query.get(rule_id)
            return rule.to_dict() if rule else None
        except SQLAlchemyError as e:
            current_app.logger.error(f"Error fetching fee rule: {str(e)}")
            raise

    @staticmethod
    def create_fee_rule(rule_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create or update a global fee rule (upsert)."""
        try:
            fee_code = rule_data.get('fee_code')
            
            # Reject any attempts to create classification-specific rules
            if 'applies_to_classification_id' in rule_data and rule_data['applies_to_classification_id'] is not None:
                raise ValueError("Fee rules are now global only. Use FeeRuleOverride for classification-specific pricing.")
            if 'applies_to_aircraft_classification_id' in rule_data and rule_data['applies_to_aircraft_classification_id'] is not None:
                raise ValueError("Fee rules are now global only. Use FeeRuleOverride for classification-specific pricing.")

            if not fee_code:
                raise ValueError("fee_code is required.")

            # Check for an existing global rule with this fee_code
            existing_rule = FeeRule.query.filter_by(fee_code=fee_code).first()

            if existing_rule:
                # Update existing rule
                AdminFeeConfigService._apply_rule_data(existing_rule, rule_data)
                rule_id = existing_rule.id
            else:
                # Create new global rule
                rule = FeeRule(**AdminFeeConfigService._prepare_rule_data(rule_data))
                db.session.add(rule)
                db.session.flush()
                rule_id = rule.id
            
            db.session.commit()
            
            result = AdminFeeConfigService.get_fee_rule(rule_id)
            if result is None:
                raise ValueError("Failed to retrieve rule after creation/update.")
            return result
            
        except IntegrityError as e:
            db.session.rollback()
            if 'fee_code' in str(e).lower():
                raise ValueError("Fee rule with this code already exists")
            raise
        except SQLAlchemyError as e:
            db.session.rollback()
            current_app.logger.error(f"Error creating fee rule: {str(e)}")
            raise
    
    @staticmethod
    def _prepare_rule_data(rule_data: Dict[str, Any]) -> Dict[str, Any]:
        """Prepare rule data for creating a new global FeeRule."""
        
        prepared_data = {
            'fee_name': rule_data['fee_name'],
            'fee_code': rule_data['fee_code'],
            'amount': rule_data['amount'],
            'currency': rule_data.get('currency', 'USD'),
            'is_taxable': rule_data.get('is_taxable', False),
            'is_potentially_waivable_by_fuel_uplift': rule_data.get('is_potentially_waivable_by_fuel_uplift', False),
            'calculation_basis': CalculationBasis[rule_data.get('calculation_basis', 'NOT_APPLICABLE')],
            'waiver_strategy': WaiverStrategy[rule_data.get('waiver_strategy', 'NONE')],
            'simple_waiver_multiplier': rule_data.get('simple_waiver_multiplier'),
            'has_caa_override': rule_data.get('has_caa_override', False),
            'caa_override_amount': rule_data.get('caa_override_amount'),
            'caa_waiver_strategy_override': WaiverStrategy[rule_data['caa_waiver_strategy_override']] if rule_data.get('caa_waiver_strategy_override') else None,
            'caa_simple_waiver_multiplier_override': rule_data.get('caa_simple_waiver_multiplier_override')
        }
        return prepared_data
    
    @staticmethod
    def _apply_rule_data(rule: FeeRule, rule_data: Dict[str, Any]):
        """Apply rule data to an existing global FeeRule object."""
        
        # Update fields
        for field in ['fee_name', 'fee_code', 'amount', 'currency', 'is_taxable', 
                     'is_potentially_waivable_by_fuel_uplift', 'simple_waiver_multiplier',
                     'has_caa_override', 'caa_override_amount', 'caa_simple_waiver_multiplier_override']:
            if field in rule_data:
                setattr(rule, field, rule_data[field])
        
        # Handle enum fields
        if 'calculation_basis' in rule_data:
            rule.calculation_basis = CalculationBasis[rule_data['calculation_basis']]
        if 'waiver_strategy' in rule_data:
            rule.waiver_strategy = WaiverStrategy[rule_data['waiver_strategy']]
        if 'caa_waiver_strategy_override' in rule_data:
            rule.caa_waiver_strategy_override = WaiverStrategy[rule_data['caa_waiver_strategy_override']] if rule_data['caa_waiver_strategy_override'] else None

    @staticmethod
    def update_fee_rule(rule_id: int, rule_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Update a fee rule."""
        try:
            rule = FeeRule.query.get(rule_id)
            if not rule:
                raise ValueError("Fee rule not found")
            
            AdminFeeConfigService._apply_rule_data(rule, rule_data)
            db.session.commit()
            return AdminFeeConfigService.get_fee_rule(rule.id)
        except IntegrityError as e:
            db.session.rollback()
            if 'uq_fee_rule_code_classification' in str(e):
                raise ValueError("Fee rule with this code already exists for this classification")
            raise
        except SQLAlchemyError as e:
            db.session.rollback()
            current_app.logger.error(f"Error updating fee rule: {str(e)}")
            raise

    @staticmethod
    def delete_fee_rule(rule_id: int) -> bool:
        """Delete a fee rule."""
        try:
            rule = FeeRule.query.get(rule_id)
            if rule:
                db.session.delete(rule)
                db.session.commit()
                return True
            return False
        except SQLAlchemyError as e:
            db.session.rollback()
            current_app.logger.error(f"Error deleting fee rule: {str(e)}")
            raise

    # Waiver Tiers CRUD
    @staticmethod
    def get_waiver_tiers() -> List[Dict[str, Any]]:
        """Get all waiver tiers."""
        try:
            tiers = WaiverTier.query.order_by(WaiverTier.tier_priority.desc()).all()
            
            return [
                {
                    'id': tier.id,
                    'name': tier.name,
                    'fuel_uplift_multiplier': float(tier.fuel_uplift_multiplier),
                    'fees_waived_codes': tier.fees_waived_codes,
                    'tier_priority': tier.tier_priority,
                    'is_caa_specific_tier': tier.is_caa_specific_tier,
                    'created_at': tier.created_at.isoformat(),
                    'updated_at': tier.updated_at.isoformat()
                }
                for tier in tiers
            ]
        except SQLAlchemyError as e:
            current_app.logger.error(f"Error fetching waiver tiers: {str(e)}")
            raise

    @staticmethod
    def get_waiver_tier(tier_id: int) -> Optional[Dict[str, Any]]:
        """Get a single waiver tier by ID."""
        try:
            tier = WaiverTier.query.get(tier_id)
            
            if not tier:
                return None
                
            return {
                'id': tier.id,
                'name': tier.name,
                'fuel_uplift_multiplier': float(tier.fuel_uplift_multiplier),
                'fees_waived_codes': tier.fees_waived_codes,
                'tier_priority': tier.tier_priority,
                'is_caa_specific_tier': tier.is_caa_specific_tier,
                'created_at': tier.created_at.isoformat(),
                'updated_at': tier.updated_at.isoformat()
            }
        except SQLAlchemyError as e:
            current_app.logger.error(f"Error fetching waiver tier: {str(e)}")
            raise

    @staticmethod
    def create_waiver_tier(tier_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new waiver tier."""
        try:
            tier = WaiverTier()
            tier.name = tier_data['name']
            tier.fuel_uplift_multiplier = tier_data['fuel_uplift_multiplier']
            tier.fees_waived_codes = tier_data['fees_waived_codes']
            tier.tier_priority = tier_data['tier_priority']
            tier.is_caa_specific_tier = tier_data.get('is_caa_specific_tier', False)
            db.session.add(tier)
            db.session.commit()
            
            result = AdminFeeConfigService.get_waiver_tier(tier.id)
            if result is None:
                raise ValueError("Failed to retrieve created waiver tier")
            return result
        except SQLAlchemyError as e:
            db.session.rollback()
            current_app.logger.error(f"Error creating waiver tier: {str(e)}")
            raise

    @staticmethod
    def update_waiver_tier(tier_id: int, tier_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Update a waiver tier."""
        try:
            tier = WaiverTier.query.get(tier_id)
            
            if not tier:
                return None
            
            # Update fields
            for field in ['name', 'fuel_uplift_multiplier', 'fees_waived_codes', 'tier_priority', 'is_caa_specific_tier']:
                if field in tier_data:
                    setattr(tier, field, tier_data[field])
            
            db.session.commit()
            
            return AdminFeeConfigService.get_waiver_tier(tier.id)
        except SQLAlchemyError as e:
            db.session.rollback()
            current_app.logger.error(f"Error updating waiver tier: {str(e)}")
            raise

    @staticmethod
    def delete_waiver_tier(tier_id: int) -> bool:
        """Delete a waiver tier."""
        try:
            tier = WaiverTier.query.get(tier_id)

            if not tier:
                return False

            db.session.delete(tier)
            db.session.commit()
            return True
        except SQLAlchemyError as e:
            db.session.rollback()
            current_app.logger.error(f"Error deleting waiver tier: {str(e)}")
            raise

    @staticmethod
    def reorder_waiver_tiers(tier_updates: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Atomically reorder waiver tiers by updating their tier_priority values.
        
        Args:
            tier_updates: List of dicts with 'tier_id' and 'new_priority' keys
            
        Returns:
            Dict with success status and updated tiers count
            
        Raises:
            ValueError: If tier IDs don't exist
        """
        try:
            # Validate that all tier IDs exist
            tier_ids = [update['tier_id'] for update in tier_updates]
            existing_tiers = db.session.query(WaiverTier).filter(
                WaiverTier.id.in_(tier_ids)
            ).all()
            
            if len(existing_tiers) != len(tier_ids):
                raise ValueError("Some tier IDs do not exist")
            
            # Perform all updates in a single transaction
            for update in tier_updates:
                db.session.query(WaiverTier).filter(
                    WaiverTier.id == update['tier_id']
                ).update({'tier_priority': update['new_priority']})
            
            db.session.commit()
            
            return {
                'success': True,
                'updated_count': len(tier_updates),
                'message': f"Successfully reordered {len(tier_updates)} waiver tiers"
            }
            
        except IntegrityError as e:
            db.session.rollback()
            raise ValueError(f"Waiver tier reordering failed: {str(e)}")
        except Exception as e:
            db.session.rollback()
            raise

    @staticmethod
    def get_consolidated_fee_schedule() -> Dict[str, List[Dict[str, Any]]]:
        """
        Get a consolidated fee schedule, including all related entities.
        """
        try:
            # Aircraft classifications are now global, return all
            categories = AircraftClassification.query.all()
            rules = FeeRule.query.all()
            aircraft_types = AircraftType.query.options(
                joinedload(AircraftType.classification)  # type: ignore
            ).all()
            overrides = FeeRuleOverride.query.all()

            # Enhanced aircraft types with classification names
            enhanced_aircraft_types = []
            for aircraft_type in aircraft_types:
                aircraft_dict = aircraft_type.to_dict()
                aircraft_dict['classification_name'] = aircraft_type.classification.name if aircraft_type.classification else None
                enhanced_aircraft_types.append(aircraft_dict)

            return {
                "categories": [c.to_dict() for c in categories],
                "rules": [r.to_dict() for r in rules],
                "aircraft_types": enhanced_aircraft_types,
                "overrides": [o.to_dict() for o in overrides]
            }
        except SQLAlchemyError as e:
            current_app.logger.error(f"Error fetching consolidated fee schedule: {str(e)}")
            raise

    @staticmethod
    def get_global_fee_schedule() -> Dict[str, Any]:
        """
        Get the entire global fee schedule with enhanced three-tiered fee logic.
        """
        classifications = AircraftClassification.query.all()
        sorted_classifications = AdminFeeConfigService._sort_aircraft_classifications(classifications)
        aircraft_types = AircraftType.query.order_by(AircraftType.name).all()
        fee_rules = FeeRule.query.order_by(FeeRule.fee_name).all()
        overrides = FeeRuleOverride.query.all()

        classification_overrides_map = {
            (o.classification_id, o.fee_rule_id): o.to_dict() for o in overrides if o.classification_id
        }
        aircraft_overrides_map = {
            (o.aircraft_type_id, o.fee_rule_id): o.to_dict() for o in overrides if o.aircraft_type_id
        }

        schedule = []
        for classification in sorted_classifications:
            classification_data = classification.to_dict()
            classification_data['aircraft_types'] = []
            
            classification_aircraft = [at for at in aircraft_types if at.classification_id == classification.id]
            
            for aircraft_type in classification_aircraft:
                aircraft_data = aircraft_type.to_dict()
                
                aircraft_fees = {}
                
                for fee_rule in fee_rules:
                    fee_code = fee_rule.fee_code
                    
                    global_default = float(fee_rule.amount)
                    global_caa_default = float(fee_rule.caa_override_amount) if fee_rule.has_caa_override else global_default
                    
                    class_override = classification_overrides_map.get((classification.id, fee_rule.id))
                    class_default = float(class_override['override_amount']) if class_override and class_override.get('override_amount') is not None else global_default
                    class_caa_default = float(class_override['override_caa_amount']) if class_override and class_override.get('override_caa_amount') is not None else global_caa_default

                    aircraft_override = aircraft_overrides_map.get((aircraft_type.id, fee_rule.id))
                    
                    is_aircraft_override = aircraft_override is not None and aircraft_override.get('override_amount') is not None
                    is_caa_aircraft_override = aircraft_override is not None and aircraft_override.get('override_caa_amount') is not None

                    final_display_value = float(aircraft_override['override_amount']) if is_aircraft_override else class_default
                    final_caa_display_value = float(aircraft_override['override_caa_amount']) if is_caa_aircraft_override else class_caa_default

                    aircraft_fees[str(fee_rule.id)] = {
                        "fee_rule_id": fee_rule.id,
                        "final_display_value": final_display_value,
                        "is_aircraft_override": is_aircraft_override,
                        "revert_to_value": class_default,
                        "classification_default": class_default,
                        "global_default": global_default,
                        "final_caa_display_value": final_caa_display_value,
                        "is_caa_aircraft_override": is_caa_aircraft_override,
                        "revert_to_caa_value": class_caa_default,
                    }

                aircraft_data['fees'] = aircraft_fees
                classification_data['aircraft_types'].append(aircraft_data)
            
            schedule.append(classification_data)

        return {
            "schedule": schedule,
            "fee_rules": [rule.to_dict() for rule in fee_rules],
            "overrides": [o.to_dict() for o in overrides]
        }

    @staticmethod
    def upsert_fee_rule_override(data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Create or update a fee rule override for either classification-level or aircraft-specific overrides.
        """
        is_classification_override = 'classification_id' in data and data['classification_id'] is not None
        is_aircraft_override = 'aircraft_type_id' in data and data['aircraft_type_id'] is not None

        if not (is_classification_override ^ is_aircraft_override): # XOR check
            raise ValueError("Override must have either classification_id OR aircraft_type_id, but not both.")
        
        if 'fee_rule_id' not in data:
            raise ValueError("fee_rule_id is required for fee rule override upsert")

        try:
            if is_classification_override:
                key_filter = {
                    "classification_id": data['classification_id'],
                    "fee_rule_id": data['fee_rule_id']
                }
            else: # is_aircraft_override
                key_filter = {
                    "aircraft_type_id": data['aircraft_type_id'],
                    "fee_rule_id": data['fee_rule_id']
                }

            override = FeeRuleOverride.query.filter_by(**key_filter).first()

            if override:
                if 'override_amount' in data:
                    override.override_amount = data['override_amount']
                if 'override_caa_amount' in data:
                    override.override_caa_amount = data['override_caa_amount']
            else:
                override = FeeRuleOverride(**data)
                db.session.add(override)
            
            db.session.commit()
            return override.to_dict()
        except IntegrityError:
            db.session.rollback()
            raise ValueError("Integrity error, possibly due to invalid foreign keys.")
        except SQLAlchemyError as e:
            db.session.rollback()
            current_app.logger.error(f"Error upserting fee rule override: {str(e)}")
            raise

    @staticmethod
    def delete_fee_rule_override(data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Delete a fee rule override for either classification-level or aircraft-specific overrides.
        """
        is_classification_override = 'classification_id' in data and data['classification_id'] is not None
        is_aircraft_override = 'aircraft_type_id' in data and data['aircraft_type_id'] is not None

        if not (is_classification_override ^ is_aircraft_override): # XOR check
            raise ValueError("Override deletion must specify either classification_id OR aircraft_type_id, but not both.")
        
        if 'fee_rule_id' not in data:
            raise ValueError("fee_rule_id is required for fee rule override deletion")

        try:
            if is_classification_override:
                key_filter = {
                    "classification_id": data['classification_id'],
                    "fee_rule_id": data['fee_rule_id']
                }
            else: # is_aircraft_override
                key_filter = {
                    "aircraft_type_id": data['aircraft_type_id'],
                    "fee_rule_id": data['fee_rule_id']
                }

            override = FeeRuleOverride.query.filter_by(**key_filter).first()

            if override:
                db.session.delete(override)
                db.session.commit()
                return {"success": True}
            
            return {"success": False}
        except SQLAlchemyError as e:
            db.session.rollback()
            current_app.logger.error(f"Error deleting fee rule override: {str(e)}")
            raise

    @staticmethod
    def create_aircraft_fee_setup(aircraft_type_name: str, aircraft_classification_id: int, min_fuel_gallons: float, initial_ramp_fee_rule_id: Optional[int] = None, initial_ramp_fee_amount: Optional[float] = None) -> Dict[str, Any]:
        """
        A comprehensive service method to:
        1. Find or create an AircraftType.
        2. Set the aircraft's classification.
        3. Set the min fuel waiver directly on AircraftType.
        4. Optionally, create an initial FeeRuleOverride for the aircraft.
        All operations are performed in a single atomic transaction.
        """
        try:
            # 1. Normalize input and find or create AircraftType
            normalized_name = aircraft_type_name.strip().title()
            
            # Case-insensitive find-or-create
            aircraft_type = AircraftType.query.filter(func.lower(AircraftType.name) == func.lower(normalized_name)).first()
            if not aircraft_type:
                # Use the normalized name for creation
                aircraft_type = AircraftType()
                aircraft_type.name = normalized_name
                aircraft_type.base_min_fuel_gallons_for_waiver = min_fuel_gallons # Satisfy NOT NULL constraint
                aircraft_type.classification_id = aircraft_classification_id
                db.session.add(aircraft_type)
                # We need to flush to get the ID for the subsequent operations
                db.session.flush()

            # 2. Verify AircraftClassification exists (global)
            aircraft_classification = AircraftClassification.query.get(aircraft_classification_id)
            if not aircraft_classification:
                raise ValueError(f"Aircraft classification with ID {aircraft_classification_id} not found.")

            # 3. Update aircraft type's classification and min fuel if it exists
            if aircraft_type.classification_id != aircraft_classification_id:
                aircraft_type.classification_id = aircraft_classification_id
            
            # Update the base min fuel gallons directly on the aircraft type
            aircraft_type.base_min_fuel_gallons_for_waiver = min_fuel_gallons

            # 4. Create initial FeeRuleOverride if parameters are provided
            # Note: Override is now created for the aircraft type directly
            override = None
            if initial_ramp_fee_rule_id is not None and initial_ramp_fee_amount is not None:
                override = FeeRuleOverride()
                override.aircraft_type_id = aircraft_type.id
                override.fee_rule_id = initial_ramp_fee_rule_id
                override.override_amount = initial_ramp_fee_amount
                db.session.add(override)
            
            db.session.commit()

            # Return objects and basic data for route processing
            result = {
                "message": "Aircraft fee setup completed successfully.",
                "aircraft_type_id": aircraft_type.id,
                "aircraft_type": aircraft_type
            }
            
            # Add override if it was created
            if override is not None:
                result["fee_rule_override"] = override
                
            return result

        except IntegrityError as e:
            db.session.rollback()
            current_app.logger.error(f"Database integrity error during aircraft fee setup: {str(e)}")
            raise ValueError("A database integrity error occurred. This could be due to a race condition or invalid foreign key.")
        except SQLAlchemyError as e:
            db.session.rollback()
            current_app.logger.error(f"Database error during aircraft fee setup: {str(e)}")
            raise ValueError("A database error occurred while setting up the aircraft fee structure.")

    # Fuel Type Management
    @staticmethod
    def get_all_active_fuel_types() -> List[Dict[str, Any]]:
        """
        Get all active fuel types.
        
        Returns a list of active fuel types that can be used for pricing configuration.
        This replaces the hardcoded FuelTypeEnum approach with dynamic fuel type management.
        """
        try:
            fuel_types = FuelType.query.filter_by(is_active=True).order_by(FuelType.name).all()
            return [fuel_type.to_dict() for fuel_type in fuel_types]
        except SQLAlchemyError as e:
            current_app.logger.error(f"Error fetching active fuel types: {str(e)}")
            raise

    @staticmethod
    def get_all_fuel_types() -> List[Dict[str, Any]]:
        """
        Get all fuel types including inactive ones.
        
        Returns a list of all fuel types (both active and inactive) for administrative
        purposes where viewing inactive fuel types is needed.
        """
        try:
            fuel_types = FuelType.query.order_by(FuelType.name).all()
            return [fuel_type.to_dict() for fuel_type in fuel_types]
        except SQLAlchemyError as e:
            current_app.logger.error(f"Error fetching all fuel types: {str(e)}")
            raise

    # Fuel Price Management
    @staticmethod
    def get_current_fuel_prices() -> List[Dict[str, Any]]:
        """
        Get current fuel prices.
        
        This method returns an entry for ALL active fuel types.
        If a price has never been set for a specific fuel type, its price field 
        will be null. This ensures the frontend UI is always complete.
        """
        try:
            # Get all active fuel types
            all_fuel_types = FuelType.query.filter_by(is_active=True).order_by(FuelType.name).all()
            
            # Get the latest price for each fuel type
            result = []
            for fuel_type in all_fuel_types:
                latest_price = FuelPrice.query.filter_by(
                    fuel_type_id=fuel_type.id
                ).order_by(FuelPrice.effective_date.desc()).first()
                
                if latest_price:
                    result.append({
                        'fuel_type_id': fuel_type.id,
                        'fuel_type_name': fuel_type.name,
                        'fuel_type_code': fuel_type.code,
                        'price': float(latest_price.price),
                        'currency': latest_price.currency,
                        'effective_date': latest_price.effective_date.isoformat(),
                        'created_at': latest_price.created_at.isoformat(),
                        'updated_at': latest_price.updated_at.isoformat()
                    })
                else:
                    result.append({
                        'fuel_type_id': fuel_type.id,
                        'fuel_type_name': fuel_type.name,
                        'fuel_type_code': fuel_type.code,
                        'price': None,
                        'currency': 'USD',
                        'effective_date': None,
                        'created_at': None,
                        'updated_at': None
                    })
            
            return result
        except SQLAlchemyError as e:
            current_app.logger.error(f"Error fetching current fuel prices: {str(e)}")
            raise

    @staticmethod
    def set_current_fuel_prices(prices_data: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Set current fuel prices.
        
        This method creates NEW FuelPrice records with the current effective_date.
        It does not update existing rows to maintain an immutable price history.
        
        Args:
            prices_data: List of dicts with 'fuel_type_id' and 'price' keys
            
        Returns:
            Dict with success status and count of prices updated
        """
        try:
            from datetime import datetime
            from decimal import Decimal, InvalidOperation
            
            # Validate input using Marshmallow schema
            try:
                # Create schema instances
                request_schema = SetFuelPricesRequestSchema()
                entry_schema = FuelPriceEntrySchema()
                
                # Validate the overall request structure
                request_data = {'fuel_prices': prices_data}
                validated_request = request_schema.load(request_data)
                price_entries = validated_request['fuel_prices']
                
            except MarshmallowValidationError as e:
                raise ValueError(f"Request validation failed: {e.messages}")
            except Exception as e:
                raise ValueError(f"Request validation failed: {str(e)}")
            
            current_time = datetime.utcnow()
            updated_count = 0
            
            # Begin transaction
            for price_entry in price_entries:
                # Validate fuel type exists and is active
                fuel_type = FuelType.query.filter_by(id=price_entry['fuel_type_id'], is_active=True).first()
                if not fuel_type:
                    raise ValueError(f"Invalid or inactive fuel type ID: {price_entry['fuel_type_id']}")
                
                # Create new price record
                new_price = FuelPrice()
                new_price.fuel_type_id = price_entry['fuel_type_id']
                new_price.price = Decimal(str(price_entry['price']))
                new_price.currency = 'USD'
                new_price.effective_date = current_time
                
                db.session.add(new_price)
                updated_count += 1
            
            db.session.commit()
            
            return {
                'success': True,
                'updated_count': updated_count,
                'message': f"Successfully updated {updated_count} fuel prices"
            }
            
        except ValueError:
            # Re-raise validation errors as-is
            db.session.rollback()
            raise
        except SQLAlchemyError as e:
            db.session.rollback()
            current_app.logger.error(f"Database error setting fuel prices: {str(e)}")
            # Preserve original error context for debugging
            raise ValueError(f"Database operation failed while setting fuel prices. Original error: {str(e)}")
        except Exception as e:
            db.session.rollback()
            current_app.logger.error(f"Unexpected error setting fuel prices: {str(e)}")
            raise ValueError(f"An unexpected error occurred while setting fuel prices: {str(e)}")

    @staticmethod
    def update_or_create_mapping_by_type(aircraft_type_id: int, classification_id: int) -> Dict[str, Any]:
        """
        Update an aircraft type's classification.
        
        This method updates the classification_id directly on the AircraftType model,
        as the refactoring has moved from FBO-specific mappings to global aircraft classifications.
        
        Args:
            aircraft_type_id: The ID of the aircraft type to update
            classification_id: The ID of the new classification
            
        Returns:
            Dict containing the updated aircraft type and classification information
            
        Raises:
            ValueError: If aircraft type or classification not found
        """
        try:
            # Verify aircraft type exists
            aircraft_type = AircraftType.query.options(
                joinedload(AircraftType.classification)
            ).filter_by(id=aircraft_type_id).first()
            
            if not aircraft_type:
                raise ValueError("Aircraft type not found")
            
            # Verify classification exists
            new_classification = AircraftClassification.query.filter_by(id=classification_id).first()
            if not new_classification:
                raise ValueError("Aircraft classification not found")
            
            # Update the aircraft type's classification
            aircraft_type.classification_id = classification_id
            db.session.commit()
            
            # Refresh to get updated relationships
            db.session.refresh(aircraft_type)
            
            return {
                'aircraft_type_id': aircraft_type.id,
                'aircraft_type_name': aircraft_type.name,
                'classification_id': aircraft_type.classification_id,
                'classification_name': aircraft_type.classification.name,
                'updated_at': aircraft_type.updated_at.isoformat()
            }
            
        except SQLAlchemyError as e:
            db.session.rollback()
            current_app.logger.error(f"Error updating aircraft type classification: {str(e)}")
            raise

    # ==========================================
    # Fee Schedule Versioning & Configuration Management
    # ==========================================

    @staticmethod
    def _diff_configurations(current_data: Dict[str, Any], backup_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Compare two configuration snapshots and generate a changeset for restoration.
        
        Args:
            current_data: Current database configuration snapshot
            backup_data: Target backup configuration snapshot
            
        Returns:
            Dict containing create, update, and delete operations for each data type:
            {
                'classifications': {'create': [...], 'update': [...], 'delete': [...]},
                'aircraft_types': {'create': [...], 'update': [...], 'delete': [...]},
                'fee_rules': {'create': [...], 'update': [...], 'delete': [...]},
                'overrides': {'create': [...], 'update': [...], 'delete': [...]},
                'waiver_tiers': {'create': [...], 'update': [...], 'delete': [...]},
                'aircraft_type_configs': {'create': [...], 'update': [...], 'delete': [...]}
            }
        """
        def _compare_entities(current_list: List[Dict], backup_list: List[Dict], id_field: str = 'id') -> Dict[str, List]:
            """
            Compare two lists of entities and return create, update, delete operations.
            
            This enhanced comparison handles edge cases like None vs 0, JSON array content
            comparison, and type-aware comparisons for robust diff detection.
            """
            # Create lookup dictionaries
            current_by_id = {item[id_field]: item for item in current_list}
            backup_by_id = {item[id_field]: item for item in backup_list}
            
            # Find operations needed
            create_ops = []
            update_ops = []
            delete_ops = []
            
            # Items to create: in backup but not in current
            for backup_id, backup_item in backup_by_id.items():
                if backup_id not in current_by_id:
                    create_ops.append(backup_item)
            
            # Items to update: in both but different
            for backup_id, backup_item in backup_by_id.items():
                if backup_id in current_by_id:
                    current_item = current_by_id[backup_id]
                    if _items_differ(current_item, backup_item):
                        update_ops.append(backup_item)
            
            # Items to delete: in current but not in backup
            for current_id in current_by_id:
                if current_id not in backup_by_id:
                    delete_ops.append(current_id)
            
            return {
                'create': create_ops,
                'update': update_ops,
                'delete': delete_ops
            }
        
        def _items_differ(current_item: Dict, backup_item: Dict) -> bool:
            """
            Enhanced comparison that handles edge cases properly.
            
            Handles:
            - None vs 0 vs empty string distinctions
            - JSON array content comparison (not just reference)
            - Decimal/float precision normalization
            - Case-sensitive string comparisons
            """
            # Remove timestamps for comparison
            current_clean = {k: v for k, v in current_item.items() if k not in ['created_at', 'updated_at']}
            backup_clean = {k: v for k, v in backup_item.items() if k not in ['created_at', 'updated_at']}
            
            # Get all unique keys from both items
            all_keys = set(current_clean.keys()) | set(backup_clean.keys())
            
            for key in all_keys:
                current_val = current_clean.get(key)
                backup_val = backup_clean.get(key)
                
                # Handle missing keys (one has the key, other doesn't)
                if key not in current_clean or key not in backup_clean:
                    return True
                
                # Enhanced value comparison
                if not _values_equal(current_val, backup_val):
                    return True
            
            return False
        
        def _values_equal(val1, val2) -> bool:
            """
            Deep value comparison that handles type coercion and edge cases.
            """
            # Handle exact match first (most common case)
            if val1 == val2:
                return True
            
            # Handle None comparisons explicitly
            if val1 is None or val2 is None:
                return val1 is val2
            
            # Handle numeric comparisons (None vs 0 should be different)
            if isinstance(val1, (int, float)) and isinstance(val2, (int, float)):
                return abs(float(val1) - float(val2)) < 1e-10  # Handle float precision
            
            # Handle list/array comparisons (e.g., fees_waived_codes in WaiverTier)
            if isinstance(val1, list) and isinstance(val2, list):
                # Compare sorted versions to handle order differences
                try:
                    return sorted(val1) == sorted(val2)
                except TypeError:
                    # If items aren't sortable, compare as-is
                    return val1 == val2
            
            # Handle string comparisons (case-sensitive)
            if isinstance(val1, str) and isinstance(val2, str):
                return val1 == val2
            
            # For all other types, use default equality
            return val1 == val2
        
        # Compare each data type
        changeset = {
            'classifications': _compare_entities(
                current_data.get('classifications', []), 
                backup_data.get('classifications', [])
            ),
            'aircraft_types': _compare_entities(
                current_data.get('aircraft_types', []), 
                backup_data.get('aircraft_types', [])
            ),
            'fee_rules': _compare_entities(
                current_data.get('fee_rules', []), 
                backup_data.get('fee_rules', [])
            ),
            'overrides': _compare_entities(
                current_data.get('overrides', []), 
                backup_data.get('overrides', [])
            ),
            'waiver_tiers': _compare_entities(
                current_data.get('waiver_tiers', []), 
                backup_data.get('waiver_tiers', [])
            ),
            'aircraft_type_configs': _compare_entities(
                current_data.get('aircraft_type_configs', []), 
                backup_data.get('aircraft_type_configs', [])
            )
        }
        
        return changeset

    @staticmethod
    def _apply_configuration_changeset(changeset: Dict[str, Any]) -> None:
        """
        Apply a configuration changeset using the safe Diff and Apply strategy.
        
        This method performs database operations in the correct dependency order:
        
        DELETION ORDER (reverse dependency):
        1. FeeRuleOverrides (depend on aircraft types and fee rules)
        2. WaiverTiers (no dependencies)
        3. FeeRules (depend on classifications)
        4. AircraftTypes (depend on classifications)
        5. AircraftClassifications (other entities depend on them)
        
        CREATION ORDER (dependency order):
        1. AircraftClassifications (no dependencies)
        2. AircraftTypes (depend on classifications)
        3. FeeRules (depend on classifications)
        4. FeeRuleOverrides (depend on aircraft types and fee rules)
        5. WaiverTiers (no foreign key dependencies)
        
        Args:
            changeset: Dictionary containing create, update, and delete operations
        """
        # Execute deletions in reverse dependency order
        # 1. Delete FeeRuleOverrides first (depend on aircraft types and fee rules)
        for override_id in changeset['overrides']['delete']:
            override = FeeRuleOverride.query.get(override_id)
            if override:
                db.session.delete(override)
        
        # 2. Delete WaiverTiers (no dependencies)
        for tier_id in changeset['waiver_tiers']['delete']:
            tier = WaiverTier.query.get(tier_id)
            if tier:
                db.session.delete(tier)
        
        # 4. Delete FeeRules (depend on classifications)
        for rule_id in changeset['fee_rules']['delete']:
            rule = FeeRule.query.get(rule_id)
            if rule:
                db.session.delete(rule)
        
        # 5. Delete AircraftTypes (depend on classifications)
        for aircraft_type_id in changeset['aircraft_types']['delete']:
            aircraft_type = AircraftType.query.get(aircraft_type_id)
            if aircraft_type:
                db.session.delete(aircraft_type)
        
        # 6. Delete AircraftClassifications last (other entities depend on them)
        for classification_id in changeset['classifications']['delete']:
            classification = AircraftClassification.query.get(classification_id)
            if classification:
                db.session.delete(classification)
        
        # Execute creations in dependency order
        # 1. Create AircraftClassifications first (no dependencies)
        for classification_data in changeset['classifications']['create']:
            # Remove timestamp fields as they will be auto-generated
            clean_data = {k: v for k, v in classification_data.items() if k not in ['created_at', 'updated_at']}
            classification = AircraftClassification(**clean_data)
            db.session.add(classification)
        
        db.session.flush()  # Get IDs for foreign keys
        
        # 2. Create AircraftTypes (depend on classifications)
        for aircraft_type_data in changeset['aircraft_types']['create']:
            clean_data = {k: v for k, v in aircraft_type_data.items() if k not in ['created_at', 'updated_at']}
            aircraft_type = AircraftType(**clean_data)
            db.session.add(aircraft_type)
        
        db.session.flush()  # Get IDs for foreign keys
        
        # 3. Create FeeRules (depend on classifications)
        for fee_rule_data in changeset['fee_rules']['create']:
            clean_data = {k: v for k, v in fee_rule_data.items() if k not in ['created_at', 'updated_at']}
            # Handle enum conversions
            if 'calculation_basis' in clean_data and isinstance(clean_data['calculation_basis'], str):
                clean_data['calculation_basis'] = CalculationBasis[clean_data['calculation_basis']]
            if 'waiver_strategy' in clean_data and isinstance(clean_data['waiver_strategy'], str):
                clean_data['waiver_strategy'] = WaiverStrategy[clean_data['waiver_strategy']]
            if 'caa_waiver_strategy_override' in clean_data and clean_data['caa_waiver_strategy_override'] and isinstance(clean_data['caa_waiver_strategy_override'], str):
                clean_data['caa_waiver_strategy_override'] = WaiverStrategy[clean_data['caa_waiver_strategy_override']]
            
            fee_rule = FeeRule(**clean_data)
            db.session.add(fee_rule)
        
        db.session.flush()  # Get IDs for foreign keys
        
        # 4. Create FeeRuleOverrides (depend on aircraft types and fee rules)
        for override_data in changeset['overrides']['create']:
            clean_data = {k: v for k, v in override_data.items() if k not in ['created_at', 'updated_at']}
            override = FeeRuleOverride(**clean_data)
            db.session.add(override)
        
        # 6. Create WaiverTiers (no foreign key dependencies)
        for waiver_tier_data in changeset['waiver_tiers']['create']:
            clean_data = {k: v for k, v in waiver_tier_data.items() if k not in ['created_at', 'updated_at']}
            waiver_tier = WaiverTier(**clean_data)
            db.session.add(waiver_tier)
        
        # Execute updates
        # Update AircraftClassifications
        for classification_data in changeset['classifications']['update']:
            classification = AircraftClassification.query.get(classification_data['id'])
            if classification:
                for key, value in classification_data.items():
                    if key not in ['id', 'created_at', 'updated_at']:
                        setattr(classification, key, value)
        
        # Update AircraftTypes
        for aircraft_type_data in changeset['aircraft_types']['update']:
            aircraft_type = AircraftType.query.get(aircraft_type_data['id'])
            if aircraft_type:
                for key, value in aircraft_type_data.items():
                    if key not in ['id', 'created_at', 'updated_at']:
                        setattr(aircraft_type, key, value)
        
        # Update FeeRules
        for fee_rule_data in changeset['fee_rules']['update']:
            fee_rule = FeeRule.query.get(fee_rule_data['id'])
            if fee_rule:
                for key, value in fee_rule_data.items():
                    if key not in ['id', 'created_at', 'updated_at']:
                        if key == 'calculation_basis' and isinstance(value, str):
                            value = CalculationBasis[value]
                        elif key == 'waiver_strategy' and isinstance(value, str):
                            value = WaiverStrategy[value]
                        elif key == 'caa_waiver_strategy_override' and value and isinstance(value, str):
                            value = WaiverStrategy[value]
                        setattr(fee_rule, key, value)
        
        # Update FeeRuleOverrides
        for override_data in changeset['overrides']['update']:
            override = FeeRuleOverride.query.get(override_data['id'])
            if override:
                for key, value in override_data.items():
                    if key not in ['id', 'created_at', 'updated_at']:
                        setattr(override, key, value)
        
        # Update WaiverTiers
        for waiver_tier_data in changeset['waiver_tiers']['update']:
            waiver_tier = WaiverTier.query.get(waiver_tier_data['id'])
            if waiver_tier:
                for key, value in waiver_tier_data.items():
                    if key not in ['id', 'created_at', 'updated_at']:
                        setattr(waiver_tier, key, value)

    @staticmethod
    def _create_configuration_snapshot() -> Dict[str, Any]:
        """
        Create a complete snapshot of the current fee configuration.
        
        This function queries and serializes all configuration tables:
        - AircraftClassification
        - AircraftType
        - FeeRule
        - FeeRuleOverride
        - WaiverTier
        
        Returns:
            Dict containing the complete configuration snapshot
        """
        try:
            # Initialize schemas for serialization
            classification_schema = AircraftClassificationSchema(many=True)
            aircraft_type_schema = AircraftTypeSchema(many=True)
            fee_rule_schema = FeeRuleSchema(many=True)
            fee_rule_override_schema = FeeRuleOverrideSchema(many=True)
            waiver_tier_schema = WaiverTierSchema(many=True)
            
            # Query all configuration data
            classifications = AircraftClassification.query.all()
            aircraft_types = AircraftType.query.all()
            fee_rules = FeeRule.query.all()
            fee_rule_overrides = FeeRuleOverride.query.all()
            waiver_tiers = WaiverTier.query.all()
            
            # Serialize all data
            snapshot = {
                'classifications': classification_schema.dump(classifications),
                'aircraft_types': aircraft_type_schema.dump(aircraft_types),
                'fee_rules': fee_rule_schema.dump(fee_rules),
                'overrides': fee_rule_override_schema.dump(fee_rule_overrides),
                'waiver_tiers': waiver_tier_schema.dump(waiver_tiers)
            }
            
            current_app.logger.info(f"Created configuration snapshot with {len(classifications)} classifications, "
                                  f"{len(aircraft_types)} aircraft types, {len(fee_rules)} fee rules, "
                                  f"{len(fee_rule_overrides)} overrides, {len(waiver_tiers)} waiver tiers")
            
            return snapshot
            
        except SQLAlchemyError as e:
            current_app.logger.error(f"Error creating configuration snapshot: {str(e)}")
            raise

    @staticmethod
    def _transform_legacy_data(configuration_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Transform legacy configuration data to match current schema expectations.
        
        This method handles backward compatibility by transforming:
        1. Aircraft types missing classification_id
        2. Fee rules with enum values that have class prefixes
        3. Legacy field names from old schema versions
        4. Missing or invalid ID references within the snapshot
        
        Args:
            configuration_data: Raw configuration data from version history
            
        Returns:
            Dict containing transformed configuration data
        """
        transformed_data = configuration_data.copy()
        
        # Extract available IDs for reference validation and mapping
        classifications = transformed_data.get('classifications', [])
        aircraft_types = transformed_data.get('aircraft_types', [])
        fee_rules = transformed_data.get('fee_rules', [])
        
        classification_ids = {item['id'] for item in classifications if 'id' in item}
        aircraft_type_ids = {item['id'] for item in aircraft_types if 'id' in item}
        fee_rule_ids = {item['id'] for item in fee_rules if 'id' in item}
        
        # Get fallback IDs
        fallback_classification_id = classifications[0]['id'] if classifications else 1
        fallback_aircraft_type_id = aircraft_types[0]['id'] if aircraft_types else 1
        fallback_fee_rule_id = fee_rules[0]['id'] if fee_rules else 1
        
        # Transform aircraft types
        if 'aircraft_types' in transformed_data:
            for at in transformed_data['aircraft_types']:
                # Legacy field name mapping
                if 'classification_id' not in at and 'default_aircraft_classification_id' in at:
                    at['classification_id'] = at.pop('default_aircraft_classification_id')
                # Set a default classification_id if missing
                if 'classification_id' not in at or at['classification_id'] is None:
                    at['classification_id'] = fallback_classification_id
                # Fix invalid classification references
                elif at['classification_id'] not in classification_ids:
                    try:
                        current_app.logger.warning(f"Aircraft type references invalid classification ID {at['classification_id']}, mapping to {fallback_classification_id}")
                    except RuntimeError:
                        pass  # No application context, skip logging
                    at['classification_id'] = fallback_classification_id
        
        # Transform fee rules
        if 'fee_rules' in transformed_data:
            for fr in transformed_data['fee_rules']:
                # Legacy field name mapping - check multiple possible legacy field names
                if 'applies_to_classification_id' not in fr:
                    if 'applies_to_aircraft_classification_id' in fr:
                        fr['applies_to_classification_id'] = fr.pop('applies_to_aircraft_classification_id')
                    elif 'applies_to_fee_category_id' in fr:
                        # Very old field name
                        fr['applies_to_classification_id'] = fr.pop('applies_to_fee_category_id')
                    elif 'fee_category_id' in fr:
                        # Another possible legacy field name
                        fr['applies_to_classification_id'] = fr.pop('fee_category_id')
                    else:
                        # No classification reference found, assign to default
                        fr['applies_to_classification_id'] = fallback_classification_id
                
                # Fix invalid classification references in fee rules
                if fr.get('applies_to_classification_id') not in classification_ids:
                    try:
                        current_app.logger.warning(f"Fee rule references invalid classification ID {fr.get('applies_to_classification_id')}, mapping to {fallback_classification_id}")
                    except RuntimeError:
                        pass  # No application context, skip logging
                    fr['applies_to_classification_id'] = fallback_classification_id
                
                # Transform enum values with class prefixes
                if 'calculation_basis' in fr and isinstance(fr['calculation_basis'], str):
                    if '.' in fr['calculation_basis']:
                        fr['calculation_basis'] = fr['calculation_basis'].split('.')[-1]
                if 'waiver_strategy' in fr and isinstance(fr['waiver_strategy'], str):
                    if '.' in fr['waiver_strategy']:
                        fr['waiver_strategy'] = fr['waiver_strategy'].split('.')[-1]
                if 'caa_waiver_strategy_override' in fr and isinstance(fr['caa_waiver_strategy_override'], str):
                    if '.' in fr['caa_waiver_strategy_override']:
                        fr['caa_waiver_strategy_override'] = fr['caa_waiver_strategy_override'].split('.')[-1]
        
        # Remove aircraft_type_configs from legacy data (no longer used)
        if 'aircraft_type_configs' in transformed_data:
            del transformed_data['aircraft_type_configs']
        
        # Fix overrides
        overrides = transformed_data.get('overrides', [])
        valid_overrides = []
        for override in overrides:
            aircraft_type_id = override.get('aircraft_type_id')
            fee_rule_id = override.get('fee_rule_id')
            classification_id = override.get('classification_id')
            
            # Check if references are valid
            valid_aircraft_type = aircraft_type_id is None or aircraft_type_id in aircraft_type_ids
            valid_fee_rule = fee_rule_id in fee_rule_ids
            valid_classification = classification_id is None or classification_id in classification_ids
            
            if valid_aircraft_type and valid_fee_rule and valid_classification:
                valid_overrides.append(override)
            else:
                try:
                    current_app.logger.warning(f"Removing override with invalid references: aircraft_type_id={aircraft_type_id}, fee_rule_id={fee_rule_id}, classification_id={classification_id}")
                except RuntimeError:
                    pass  # No application context, skip logging
        
        transformed_data['overrides'] = valid_overrides
        
        return transformed_data

    @staticmethod
    def restore_from_version(version_id: int) -> None:
        """
        Restore fee configuration from a specific version using Diff and Apply strategy.
        
        This method uses a safer "Diff and Apply" approach instead of "Wipe & Replace":
        1. Fetch the version from the database
        2. Load the backup configuration from version.configuration_data
        3. Fetch the current configuration from the database
        4. Call _diff_configurations to get the changeset
        5. Open a transaction and execute database operations based on the changeset
        6. Operations are performed in the correct order to respect foreign key constraints
        
        Args:
            version_id: The ID of the version to restore from
            
        Raises:
            ValueError: If version not found or validation fails
        """
        try:
            # Step 1: Fetch the version
            version = FeeScheduleVersion.query.get(version_id)
            if not version:
                raise ValueError(f"Version {version_id} not found")
            
            current_app.logger.info(f"Fetched version {version_id}: {version.version_name}")
            
            # Step 2: Load the backup configuration
            backup_configuration_data = version.configuration_data
            transformed_backup_data = AdminFeeConfigService._transform_legacy_data(backup_configuration_data)
            
            # Step 3: Fetch current configuration from database
            current_configuration_data = AdminFeeConfigService._create_configuration_snapshot()
            
            # Step 4: Call _diff_configurations with current and backup data
            changeset = AdminFeeConfigService._diff_configurations(current_configuration_data, transformed_backup_data)
            
            current_app.logger.info(f"Generated changeset for version {version_id}: "
                                  f"Classifications: {len(changeset['classifications']['create'])} create, "
                                  f"{len(changeset['classifications']['update'])} update, "
                                  f"{len(changeset['classifications']['delete'])} delete")
            
            # Step 5: Open transaction and apply changeset
            with db.session.begin_nested() as transaction:
                current_app.logger.info(f"Starting atomic diff-and-apply restore operation for version {version_id}")
                AdminFeeConfigService._apply_configuration_changeset(changeset)
                current_app.logger.info(f"Successfully restored configuration from version {version_id} using diff-and-apply strategy")
                
        except SQLAlchemyError as e:
            current_app.logger.error(f"Database error during restore from version {version_id}: {str(e)}")
            raise ValueError(f"Database error during restore: {str(e)}")

    @staticmethod
    def import_configuration_from_file(file_stream, user_id: int) -> None:
        """
        Import fee configuration from an uploaded JSON file using safe Diff and Apply strategy.
        
        This method now uses the same safe "Diff and Apply" approach as restore_from_version.
        
        Follows this sequence:
        1. Create automatic backup (separate committed transaction)
        2. Read and validate JSON from file against FeeScheduleSnapshotSchema
        3. Generate diff between current state and import data
        4. Apply changeset using safe Diff and Apply strategy in transaction
        
        Args:
            file_stream: File-like object containing JSON configuration
            user_id: ID of the user performing the import
            
        Raises:
            ValueError: If file parsing or validation fails
        """
        try:
            # Step 1: Create automatic backup (separate transaction)
            current_app.logger.info(f"Creating pre-import backup for user {user_id}")
            backup_snapshot = AdminFeeConfigService._create_configuration_snapshot()
            
            backup_version = FeeScheduleVersion()
            backup_version.version_name = f"Pre-import backup {datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S')}"
            backup_version.description = "Automatic backup created before configuration import"
            backup_version.configuration_data = backup_snapshot
            backup_version.version_type = 'pre_import_backup'
            backup_version.created_by_user_id = user_id
            backup_version.expires_at = datetime.utcnow() + timedelta(hours=48)  # 48 hour expiry
            
            db.session.add(backup_version)
            db.session.commit()  # Commit backup separately
            current_app.logger.info(f"Created backup version {backup_version.id}")
            
            # Step 2: Read and validate JSON from file
            try:
                file_content = file_stream.read()
                if isinstance(file_content, bytes):
                    file_content = file_content.decode('utf-8')
                
                import_data = json.loads(file_content)
                current_app.logger.info("Successfully parsed JSON from uploaded file")
            except (json.JSONDecodeError, UnicodeDecodeError) as e:
                raise ValueError(f"Invalid JSON file: {str(e)}")
            
            # Step 3: Transform legacy data and validate against schema
            transformed_data = AdminFeeConfigService._transform_legacy_data(import_data)
            
            # Step 4: Fetch current configuration and generate diff
            current_configuration_data = AdminFeeConfigService._create_configuration_snapshot()
            changeset = AdminFeeConfigService._diff_configurations(current_configuration_data, transformed_data)
            
            current_app.logger.info(f"Generated import changeset: "
                                  f"Classifications: {len(changeset['classifications']['create'])} create, "
                                  f"{len(changeset['classifications']['update'])} update, "
                                  f"{len(changeset['classifications']['delete'])} delete")
            
            # Step 5: Apply changeset using safe Diff and Apply strategy
            with db.session.begin():
                current_app.logger.info("Starting atomic diff-and-apply import operation")
                AdminFeeConfigService._apply_configuration_changeset(changeset)
                current_app.logger.info("Successfully imported configuration from file using diff-and-apply strategy")
                
        except SQLAlchemyError as e:
            current_app.logger.error(f"Database error during import: {str(e)}")
            raise ValueError(f"Database error during import: {str(e)}") 