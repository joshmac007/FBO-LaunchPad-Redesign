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
from typing import List, Dict, Any, Optional, Tuple
from flask import current_app
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from sqlalchemy.orm import joinedload
from sqlalchemy import func

from ..extensions import db
from ..models import (
    AircraftType, AircraftClassification,
    FeeRule, WaiverTier, CalculationBasis, WaiverStrategy,
    AircraftTypeConfig, FeeRuleOverride, FuelPrice, FuelTypeEnum, FuelType
)
from ..schemas.fuel_type_schemas import (
    FuelTypeSchema, SetFuelPricesRequestSchema, FuelPriceEntrySchema
)
from marshmallow import ValidationError as MarshmallowValidationError
from .aircraft_service import AircraftService


class AdminFeeConfigService:
    """Service for managing fee configurations (global aircraft classifications and rules)."""

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
            
            # Create or update aircraft type config
            config = AircraftTypeConfig.query.filter_by(
                aircraft_type_id=aircraft_type_id
            ).first()
            
            if config:
                config.base_min_fuel_gallons_for_waiver = base_min_fuel_gallons
            else:
                config = AircraftTypeConfig()
                config.aircraft_type_id = aircraft_type_id
                config.base_min_fuel_gallons_for_waiver = base_min_fuel_gallons
                db.session.add(config)
            
            db.session.commit()
            
            return {
                'id': config.id,
                'aircraft_type_id': config.aircraft_type_id,
                'aircraft_type_name': aircraft_type.name,
                'base_min_fuel_gallons_for_waiver': float(config.base_min_fuel_gallons_for_waiver),
                'updated_at': config.updated_at.isoformat()
            }
        except SQLAlchemyError as e:
            db.session.rollback()
            current_app.logger.error(f"Error updating aircraft type fuel waiver: {str(e)}")
            raise

    @staticmethod
    def get_aircraft_type_configs() -> List[Dict[str, Any]]:
        """Get all aircraft type configurations."""
        try:
            configs = AircraftTypeConfig.query.options(
                joinedload(AircraftTypeConfig.aircraft_type)  # type: ignore
            ).all()
            
            return [dict(config.to_dict()) for config in configs]
        except SQLAlchemyError as e:
            current_app.logger.error(f"Error fetching aircraft type configs: {str(e)}")
            raise

    # Fee Categories CRUD
    @staticmethod
    def get_aircraft_classifications() -> List[Dict[str, Any]]:
        """Get all aircraft classifications."""
        try:
            classifications = AircraftClassification.query.all()
            return [
                {
                    'id': classification.id,
                    'name': classification.name,
                    'created_at': classification.created_at.isoformat(),
                    'updated_at': classification.updated_at.isoformat()
                }
                for classification in classifications
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
            
            # Check if classification is referenced by fee rules
            fee_rules_count = FeeRule.query.filter_by(applies_to_classification_id=classification_id).count()
            if fee_rules_count > 0:
                raise ValueError("Cannot delete aircraft classification that is referenced by fee rules")
            
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



    @staticmethod
    def upload_aircraft_type_mappings_csv(csv_content: str) -> Dict[str, Any]:
        """Upload and process CSV for aircraft type to classification mappings."""
        try:
            csv_file = io.StringIO(csv_content)
            reader = csv.DictReader(csv_file)
            
            expected_columns = {'AircraftModel', 'AircraftClassificationName'}
            if not expected_columns.issubset(set(reader.fieldnames or [])):
                missing = expected_columns - set(reader.fieldnames or [])
                raise ValueError(f"Missing required CSV columns: {missing}")
            
            results = {
                'created': 0,
                'updated': 0,
                'errors': []
            }
            
            for row_num, row in enumerate(reader, start=2):  # Start at 2 for header row
                try:
                    aircraft_model = row['AircraftModel'].strip()
                    aircraft_classification_name = row['AircraftClassificationName'].strip()
                    aircraft_manufacturer = row.get('AircraftManufacturer', '').strip()
                    
                    if not aircraft_model or not aircraft_classification_name:
                        results['errors'].append(f"Row {row_num}: Missing required fields")
                        continue
                    
                    # Find aircraft type by name (exact match)
                    aircraft_type = AircraftType.query.filter_by(name=aircraft_model).first()
                    if not aircraft_type:
                        results['errors'].append(f"Row {row_num}: Aircraft model '{aircraft_model}' not found")
                        continue
                    
                    # Find aircraft classification by name (global)
                    aircraft_classification = AircraftClassification.query.filter_by(
                        name=aircraft_classification_name
                    ).first()
                    if not aircraft_classification:
                        results['errors'].append(f"Row {row_num}: Aircraft classification '{aircraft_classification_name}' not found")
                        continue
                    
                    # Update aircraft type's classification directly
                    if aircraft_type.classification_id != aircraft_classification.id:
                        aircraft_type.classification_id = aircraft_classification.id
                        results['updated'] += 1
                        
                except Exception as e:
                    results['errors'].append(f"Row {row_num}: {str(e)}")
            
            if results['updated'] > 0:
                db.session.commit()
            
            return results
            
        except Exception as e:
            db.session.rollback()
            current_app.logger.error(f"Error processing CSV upload: {str(e)}")
            raise

    # Fee Rules CRUD
    @staticmethod
    def get_fee_rules(category_id: Optional[int] = None) -> List[Dict[str, Any]]:
        """Get all fee rules, optionally filtered by fee category."""
        try:
            query = FeeRule.query
            
            # Apply category filter if provided
            if category_id is not None:
                query = query.filter_by(applies_to_classification_id=category_id)
            
            rules = query.options(joinedload(FeeRule.classification)).all()
            
            return [rule.to_dict() for rule in rules]
        except SQLAlchemyError as e:
            current_app.logger.error(f"Error fetching fee rules: {str(e)}")
            raise

    @staticmethod
    def get_fee_rule(rule_id: int) -> Optional[Dict[str, Any]]:
        """Get a single fee rule by ID."""
        try:
            rule = FeeRule.query.options(joinedload(FeeRule.classification)).get(rule_id)
            return rule.to_dict() if rule else None
        except SQLAlchemyError as e:
            current_app.logger.error(f"Error fetching fee rule: {str(e)}")
            raise

    @staticmethod
    def create_fee_rule(rule_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create or update a fee rule (upsert)."""
        try:
            fee_code = rule_data.get('fee_code')
            classification_id = rule_data.get('applies_to_classification_id') or rule_data.get('applies_to_aircraft_classification_id')

            if not fee_code or not classification_id:
                raise ValueError("fee_code and applies_to_classification_id are required.")

            # Check for an existing rule using the new unique key
            existing_rule = FeeRule.query.filter_by(
                fee_code=fee_code,
                applies_to_classification_id=classification_id
            ).first()

            if existing_rule:
                # Update existing rule
                AdminFeeConfigService._apply_rule_data(existing_rule, rule_data)
                rule_id = existing_rule.id
            else:
                # Create new rule
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
            if 'uq_fee_rule_code_classification' in str(e):
                raise ValueError("Fee rule with this code already exists for this classification")
            raise
        except SQLAlchemyError as e:
            db.session.rollback()
            current_app.logger.error(f"Error creating fee rule: {str(e)}")
            raise
    
    @staticmethod
    def _prepare_rule_data(rule_data: Dict[str, Any]) -> Dict[str, Any]:
        """Prepare rule data for creating a new FeeRule."""
        classification_id = rule_data.get('applies_to_classification_id') or rule_data.get('applies_to_aircraft_classification_id')
        
        # Verify the aircraft classification exists
        aircraft_classification = AircraftClassification.query.get(classification_id)
        if not aircraft_classification:
            raise ValueError("Aircraft classification not found")
        
        prepared_data = {
            'fee_name': rule_data['fee_name'],
            'fee_code': rule_data['fee_code'],
            'applies_to_classification_id': classification_id,
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
            'caa_simple_waiver_multiplier_override': rule_data.get('caa_simple_waiver_multiplier_override'),
            'is_primary_fee': rule_data.get('is_primary_fee', False)
        }
        return prepared_data
    
    @staticmethod
    def _apply_rule_data(rule: FeeRule, rule_data: Dict[str, Any]):
        """Apply rule data to an existing FeeRule object."""
        classification_id = rule_data.get('applies_to_classification_id') or rule_data.get('applies_to_aircraft_classification_id')
        
        # Verify the aircraft classification exists if being updated
        if classification_id and classification_id != rule.applies_to_classification_id:
            aircraft_classification = AircraftClassification.query.get(classification_id)
            if not aircraft_classification:
                raise ValueError("Aircraft classification not found")
            rule.applies_to_classification_id = classification_id
        
        # Update fields
        for field in ['fee_name', 'fee_code', 'amount', 'currency', 'is_taxable', 
                     'is_potentially_waivable_by_fuel_uplift', 'simple_waiver_multiplier',
                     'has_caa_override', 'caa_override_amount', 'caa_simple_waiver_multiplier_override',
                     'is_primary_fee']:
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
            aircraft_config = AircraftTypeConfig.query.all()

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
                "overrides": [o.to_dict() for o in overrides],
                "aircraft_config": [ac.to_dict() for ac in aircraft_config]
            }
        except SQLAlchemyError as e:
            current_app.logger.error(f"Error fetching consolidated fee schedule: {str(e)}")
            raise

    @staticmethod
    def get_global_fee_schedule() -> Dict[str, Any]:
        """
        Get the entire global fee schedule, structured for the UI.
        This will be the single source of truth for the fee management page.
        """
        try:
            classifications = AircraftClassification.query.order_by(AircraftClassification.name).all()
            aircraft_types = AircraftType.query.order_by(AircraftType.name).all()
            fee_rules = FeeRule.query.order_by(FeeRule.fee_name).all()
            overrides = FeeRuleOverride.query.all()
            
            # Structure the data in a way the frontend can easily consume
            # Group aircraft by their classification
            schedule = []
            classifications_map = {c.id: c.to_dict() for c in classifications}
            
            for classification in classifications:
                classification_data = classification.to_dict()
                classification_data['aircraft_types'] = [
                    ac.to_dict() for ac in aircraft_types if ac.classification_id == classification.id
                ]
                schedule.append(classification_data)

            return {
                "schedule": schedule,  # Grouped data
                "fee_rules": [rule.to_dict() for rule in fee_rules],
                "overrides": [override.to_dict() for override in overrides]
            }
        except SQLAlchemyError as e:
            current_app.logger.error(f"Error fetching global fee schedule: {str(e)}")
            raise

    @staticmethod
    def upsert_fee_rule_override(data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Create or update a fee rule override.
        """
        required_fields = ["aircraft_type_id", "fee_rule_id"]
        if not all(field in data for field in required_fields):
            raise ValueError("Missing required fields for fee rule override upsert")

        try:
            override = FeeRuleOverride.query.filter_by(
                aircraft_type_id=data["aircraft_type_id"],
                fee_rule_id=data["fee_rule_id"]
            ).first()

            if override:
                # Update existing override
                override.override_amount = data.get("override_amount")
                override.override_caa_amount = data.get("override_caa_amount")
            else:
                # Create new override
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
        Delete a fee rule override.
        """
        required_fields = ["aircraft_type_id", "fee_rule_id"]
        if not all(field in data for field in required_fields):
            raise ValueError("Missing required fields for fee rule override deletion")

        try:
            override = FeeRuleOverride.query.filter_by(
                aircraft_type_id=data["aircraft_type_id"],
                fee_rule_id=data["fee_rule_id"]
            ).first()

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
        3. Create a config for min fuel waiver.
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

            # 3. Update aircraft type's classification if it exists
            if aircraft_type.classification_id != aircraft_classification_id:
                aircraft_type.classification_id = aircraft_classification_id

            # 4. Create or update AircraftTypeConfig
            config = AircraftTypeConfig.query.filter_by(
                aircraft_type_id=aircraft_type.id
            ).first()

            if config:
                config.base_min_fuel_gallons_for_waiver = min_fuel_gallons
            else:
                config = AircraftTypeConfig()
                config.aircraft_type_id = aircraft_type.id
                config.base_min_fuel_gallons_for_waiver = min_fuel_gallons
                db.session.add(config)

            # 5. Create initial FeeRuleOverride if parameters are provided
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
                "aircraft_type": aircraft_type,
                "aircraft_config_id": config.id,
                "aircraft_config": config
            }
            
            # Add override if it was created
            if initial_ramp_fee_rule_id is not None and initial_ramp_fee_amount is not None:
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