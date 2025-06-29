"""
Admin Fee Configuration Service

This service handles CRUD operations for FBO-specific fee configuration entities including:
- Aircraft Types (base min fuel for waiver management)
- Fee Categories
- Aircraft Type to Fee Category Mappings
- Fee Rules (with CAA overrides)
- Waiver Tiers

All operations are scoped by fbo_location_id to ensure proper multi-tenancy.
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
    AircraftType, AircraftClassification, AircraftTypeToAircraftClassificationMapping,
    FeeRule, WaiverTier, CalculationBasis, WaiverStrategy,
    FBOAircraftTypeConfig, FeeRuleOverride, FuelPrice, FuelTypeEnum, FuelType
)
from ..schemas.fuel_type_schemas import (
    FuelTypeSchema, SetFuelPricesRequestSchema, FuelPriceEntrySchema
)
from marshmallow import ValidationError as MarshmallowValidationError
from .aircraft_service import AircraftService


class AdminFeeConfigService:
    """Service for managing FBO-specific fee configurations."""

    @staticmethod
    def get_aircraft_types(fbo_location_id: int) -> List[Dict[str, Any]]:
        """Get all aircraft types with their base min fuel for waiver."""
        try:
            aircraft_types = AircraftType.query.all()
            
            result = []
            for aircraft_type in aircraft_types:
                result.append({
                    'id': aircraft_type.id,
                    'name': aircraft_type.name,
                    'base_min_fuel_gallons_for_waiver': float(aircraft_type.base_min_fuel_gallons_for_waiver),
                    'default_aircraft_classification_id': aircraft_type.default_aircraft_classification_id,
                    'default_max_gross_weight_lbs': float(aircraft_type.default_max_gross_weight_lbs) if aircraft_type.default_max_gross_weight_lbs else None,
                    'created_at': aircraft_type.created_at.isoformat(),
                    'updated_at': aircraft_type.updated_at.isoformat()
                })
            return result
        except SQLAlchemyError as e:
            current_app.logger.error(f"Error fetching aircraft types: {str(e)}")
            raise

    @staticmethod
    def update_aircraft_type_fuel_waiver(fbo_location_id: int, aircraft_type_id: int, base_min_fuel_gallons: float) -> Dict[str, Any]:
        """Update base min fuel for waiver for a specific aircraft type and FBO."""
        try:
            # Verify aircraft type exists
            aircraft_type = AircraftType.query.get(aircraft_type_id)
            if not aircraft_type:
                raise ValueError("Aircraft type not found")
            
            # Create or update FBO-specific config
            config = FBOAircraftTypeConfig.query.filter_by(
                fbo_location_id=fbo_location_id,
                aircraft_type_id=aircraft_type_id
            ).first()
            
            if config:
                config.base_min_fuel_gallons_for_waiver = base_min_fuel_gallons
            else:
                config = FBOAircraftTypeConfig()
                config.fbo_location_id = fbo_location_id
                config.aircraft_type_id = aircraft_type_id
                config.base_min_fuel_gallons_for_waiver = base_min_fuel_gallons
                db.session.add(config)
            
            db.session.commit()
            
            return {
                'id': config.id,
                'fbo_location_id': config.fbo_location_id,
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
    def get_fbo_aircraft_type_configs(fbo_location_id: int) -> List[Dict[str, Any]]:
        """Get all FBO-specific aircraft type configurations."""
        try:
            configs = FBOAircraftTypeConfig.query.filter_by(
                fbo_location_id=fbo_location_id
            ).options(
                joinedload(FBOAircraftTypeConfig.aircraft_type)  # type: ignore
            ).all()
            
            return [dict(config.to_dict()) for config in configs]
        except SQLAlchemyError as e:
            current_app.logger.error(f"Error fetching FBO aircraft type configs: {str(e)}")
            raise

    # Fee Categories CRUD
    @staticmethod
    def get_fee_categories(fbo_location_id: int) -> List[Dict[str, Any]]:
        """Get all fee categories for a specific FBO."""
        try:
            # Aircraft classifications are now global, return all for compatibility
            categories = AircraftClassification.query.all()
            return [
                {
                    'id': cat.id,
                    'name': cat.name,
                    'created_at': cat.created_at.isoformat(),
                    'updated_at': cat.updated_at.isoformat()
                }
                for cat in categories
            ]
        except SQLAlchemyError as e:
            current_app.logger.error(f"Error fetching fee categories: {str(e)}")
            raise

    @staticmethod
    def get_aircraft_classification(fbo_location_id: int, category_id: int) -> Optional[Dict[str, Any]]:
        """Get a single fee category by ID for a specific FBO."""
        try:
            # Aircraft classifications are now global, no FBO filtering needed
            category = AircraftClassification.query.get(category_id)
            
            if not category:
                return None
                
            return {
                'id': category.id,
                'name': category.name,
                'created_at': category.created_at.isoformat(),
                'updated_at': category.updated_at.isoformat()
            }
        except SQLAlchemyError as e:
            current_app.logger.error(f"Error fetching fee category: {str(e)}")
            raise

    @staticmethod
    def get_aircraft_classification_by_id(fbo_location_id: int, category_id: int) -> Optional[Dict[str, Any]]:
        """Get a single fee category by ID for a specific FBO (alias for get_aircraft_classification)."""
        return AdminFeeConfigService.get_aircraft_classification(fbo_location_id, category_id)

    @staticmethod
    def create_aircraft_classification(fbo_location_id: int, name: str) -> Dict[str, Any]:
        """Create a new fee category (global aircraft classification)."""
        try:
            category = AircraftClassification()
            category.name = name
            db.session.add(category)
            db.session.commit()
            
            return {
                'id': category.id,
                'name': category.name,
                'created_at': category.created_at.isoformat(),
                'updated_at': category.updated_at.isoformat()
            }
        except IntegrityError as e:
            db.session.rollback()
            if '_classification_name_uc' in str(e):
                raise ValueError("Aircraft classification with this name already exists")
            raise
        except SQLAlchemyError as e:
            db.session.rollback()
            current_app.logger.error(f"Error creating fee category: {str(e)}")
            raise

    @staticmethod
    def update_aircraft_classification(fbo_location_id: int, category_id: int, name: str) -> Optional[Dict[str, Any]]:
        """Update a fee category (global aircraft classification)."""
        try:
            # Aircraft classifications are now global, no FBO filtering needed
            category = AircraftClassification.query.get(category_id)
            
            if not category:
                return None
            
            category.name = name
            db.session.commit()
            
            return {
                'id': category.id,
                'name': category.name,
                'created_at': category.created_at.isoformat(),
                'updated_at': category.updated_at.isoformat()
            }
        except IntegrityError as e:
            db.session.rollback()
            if '_classification_name_uc' in str(e):
                raise ValueError("Aircraft classification with this name already exists")
            raise
        except SQLAlchemyError as e:
            db.session.rollback()
            current_app.logger.error(f"Error updating fee category: {str(e)}")
            raise

    @staticmethod
    def delete_aircraft_classification(fbo_location_id: int, category_id: int) -> bool:
        """Delete a fee category for a specific FBO."""
        try:
            category = AircraftClassification.query.filter_by(
                id=category_id, 
                fbo_location_id=fbo_location_id
            ).first()
            
            if not category:
                return False
            
            # Check if category is referenced by fee rules
            fee_rules_count = FeeRule.query.filter_by(applies_to_classification_id=category_id).count()
            if fee_rules_count > 0:
                raise ValueError("Cannot delete fee category that is referenced by fee rules")
            
            # Check if category is referenced by mappings
            mappings_count = AircraftTypeToAircraftClassificationMapping.query.filter_by(aircraft_classification_id=category_id).count()
            if mappings_count > 0:
                raise ValueError("Cannot delete fee category that has aircraft type mappings")
            
            db.session.delete(category)
            db.session.commit()
            return True
        except SQLAlchemyError as e:
            db.session.rollback()
            current_app.logger.error(f"Error deleting fee category: {str(e)}")
            raise

    @staticmethod
    def get_or_create_general_aircraft_classification(fbo_location_id: int) -> Dict[str, Any]:
        """
        Get or create a 'General' aircraft classification using race-condition-proof logic.
        Aircraft classifications are now global, not FBO-specific.
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
    def get_aircraft_type_mappings(fbo_location_id: int, category_id: Optional[int] = None) -> List[Dict[str, Any]]:
        """Get all aircraft type to fee category mappings for a specific FBO, optionally filtered by fee category."""
        try:
            query = AircraftTypeToAircraftClassificationMapping.query.filter_by(
                fbo_location_id=fbo_location_id
            )
            
            # Apply category filter if provided
            if category_id is not None:
                query = query.filter_by(classification_id=category_id)
            
            mappings = query.options(
                joinedload(AircraftTypeToAircraftClassificationMapping.aircraft_type),  # type: ignore
                joinedload(AircraftTypeToAircraftClassificationMapping.aircraft_classification)  # type: ignore
            ).all()
            
            return [
                {
                    'id': mapping.id,
                    'fbo_location_id': mapping.fbo_location_id,
                    'aircraft_type_id': mapping.aircraft_type_id,
                    'aircraft_type_name': mapping.aircraft_type.name,
                    'aircraft_classification_id': mapping.classification_id,
                    'aircraft_classification_name': mapping.classification.name,
                    'created_at': mapping.created_at.isoformat(),
                    'updated_at': mapping.updated_at.isoformat()
                }
                for mapping in mappings
            ]
        except SQLAlchemyError as e:
            current_app.logger.error(f"Error fetching aircraft type mappings: {str(e)}")
            raise

    @staticmethod
    def create_aircraft_type_mapping(fbo_location_id: int, aircraft_type_id: int, aircraft_classification_id: int) -> Dict[str, Any]:
        """Create a new aircraft type to fee category mapping."""
        try:
            # Verify the aircraft classification exists (global)
            aircraft_classification = AircraftClassification.query.get(aircraft_classification_id)
            if not aircraft_classification:
                raise ValueError("Aircraft classification not found")
                
            # Verify aircraft type exists
            aircraft_type = AircraftType.query.get(aircraft_type_id)
            if not aircraft_type:
                raise ValueError("Aircraft type not found")
            
            mapping = AircraftTypeToAircraftClassificationMapping()
            mapping.fbo_location_id = fbo_location_id
            mapping.aircraft_type_id = aircraft_type_id
            mapping.classification_id = aircraft_classification_id
            db.session.add(mapping)
            db.session.commit()
            
            return {
                'id': mapping.id,
                'fbo_location_id': mapping.fbo_location_id,
                'aircraft_type_id': mapping.aircraft_type_id,
                'aircraft_type_name': aircraft_type.name,
                'aircraft_classification_id': mapping.classification_id,
                'aircraft_classification_name': aircraft_classification.name,
                'created_at': mapping.created_at.isoformat(),
                'updated_at': mapping.updated_at.isoformat()
            }
        except IntegrityError as e:
            db.session.rollback()
            if 'uq_aircraft_type_fbo_mapping' in str(e):
                raise ValueError("Aircraft type already has a mapping for this FBO")
            raise
        except SQLAlchemyError as e:
            db.session.rollback()
            current_app.logger.error(f"Error creating aircraft type mapping: {str(e)}")
            raise

    @staticmethod
    def update_aircraft_type_mapping(fbo_location_id: int, mapping_id: int, aircraft_classification_id: int) -> Optional[Dict[str, Any]]:
        """Update an aircraft type to fee category mapping."""
        try:
            mapping = AircraftTypeToAircraftClassificationMapping.query.filter_by(
                id=mapping_id, 
                fbo_location_id=fbo_location_id
            ).first()
            
            if not mapping:
                return None
            
            # Verify the aircraft classification exists (global)
            aircraft_classification = AircraftClassification.query.get(aircraft_classification_id)
            if not aircraft_classification:
                raise ValueError("Aircraft classification not found")
            
            mapping.classification_id = aircraft_classification_id
            db.session.commit()
            
            # Reload to get updated relationships
            mapping = AircraftTypeToAircraftClassificationMapping.query.options(
                joinedload(AircraftTypeToAircraftClassificationMapping.aircraft_type),  # type: ignore
                joinedload(AircraftTypeToAircraftClassificationMapping.classification)  # type: ignore
            ).get(mapping.id)
            
            if not mapping:
                # This should not happen if we just updated it, but for type safety
                return None
            
            return {
                'id': mapping.id,
                'fbo_location_id': mapping.fbo_location_id,
                'aircraft_type_id': mapping.aircraft_type_id,
                'aircraft_type_name': mapping.aircraft_type.name,
                'aircraft_classification_id': mapping.classification_id,
                'aircraft_classification_name': mapping.classification.name,
                'created_at': mapping.created_at.isoformat(),
                'updated_at': mapping.updated_at.isoformat()
            }
        except SQLAlchemyError as e:
            db.session.rollback()
            current_app.logger.error(f"Error updating aircraft type mapping: {str(e)}")
            raise

    @staticmethod
    def delete_aircraft_type_mapping(fbo_location_id: int, mapping_id: int) -> bool:
        """Delete an aircraft type to fee category mapping."""
        try:
            mapping = AircraftTypeToAircraftClassificationMapping.query.filter_by(
                id=mapping_id, 
                fbo_location_id=fbo_location_id
            ).first()
            
            if not mapping:
                return False
            
            db.session.delete(mapping)
            db.session.commit()
            return True
        except SQLAlchemyError as e:
            db.session.rollback()
            current_app.logger.error(f"Error deleting aircraft type mapping: {str(e)}")
            raise

    @staticmethod
    def upload_aircraft_type_mappings_csv(fbo_location_id: int, csv_content: str) -> Dict[str, Any]:
        """Upload and process CSV for aircraft type to fee category mappings."""
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
                    
                    # Check if mapping already exists
                    existing_mapping = AircraftTypeToAircraftClassificationMapping.query.filter_by(
                        fbo_location_id=fbo_location_id,
                        aircraft_type_id=aircraft_type.id
                    ).first()
                    
                    if existing_mapping:
                        # Update existing mapping
                        existing_mapping.classification_id = aircraft_classification.id
                        results['updated'] += 1
                    else:
                        # Create new mapping
                        new_mapping = AircraftTypeToAircraftClassificationMapping()
                        new_mapping.fbo_location_id = fbo_location_id
                        new_mapping.aircraft_type_id = aircraft_type.id
                        new_mapping.classification_id = aircraft_classification.id
                        db.session.add(new_mapping)
                        results['created'] += 1
                        
                except Exception as e:
                    results['errors'].append(f"Row {row_num}: {str(e)}")
            
            if results['created'] > 0 or results['updated'] > 0:
                db.session.commit()
            
            return results
            
        except Exception as e:
            db.session.rollback()
            current_app.logger.error(f"Error processing CSV upload: {str(e)}")
            raise

    # Fee Rules CRUD
    @staticmethod
    def get_fee_rules(fbo_location_id: int, category_id: Optional[int] = None) -> List[Dict[str, Any]]:
        """Get all fee rules for a specific FBO, optionally filtered by fee category."""
        try:
            query = FeeRule.query.filter_by(fbo_location_id=fbo_location_id)
            
            # Apply category filter if provided
            if category_id is not None:
                query = query.filter_by(applies_to_classification_id=category_id)
            
            rules = query.options(joinedload(FeeRule.aircraft_classification)).all()  # type: ignore
            
            return [
                {
                    'id': rule.id,
                    'fbo_location_id': rule.fbo_location_id,
                    'fee_name': rule.fee_name,
                    'fee_code': rule.fee_code,
                    'applies_to_aircraft_classification_id': rule.applies_to_classification_id,
                    'aircraft_classification_name': rule.classification.name,
                    'amount': float(rule.amount),
                    'currency': rule.currency,
                    'is_taxable': rule.is_taxable,
                    'is_potentially_waivable_by_fuel_uplift': rule.is_potentially_waivable_by_fuel_uplift,
                    'calculation_basis': rule.calculation_basis.name,
                    'waiver_strategy': rule.waiver_strategy.name,
                    'simple_waiver_multiplier': float(rule.simple_waiver_multiplier) if rule.simple_waiver_multiplier else None,
                    'has_caa_override': rule.has_caa_override,
                    'caa_override_amount': float(rule.caa_override_amount) if rule.caa_override_amount else None,
                    'caa_waiver_strategy_override': rule.caa_waiver_strategy_override.name if rule.caa_waiver_strategy_override else None,
                    'caa_simple_waiver_multiplier_override': float(rule.caa_simple_waiver_multiplier_override) if rule.caa_simple_waiver_multiplier_override else None,
                    'is_primary_fee': rule.is_primary_fee,
                    'created_at': rule.created_at.isoformat(),
                    'updated_at': rule.updated_at.isoformat()
                }
                for rule in rules
            ]
        except SQLAlchemyError as e:
            current_app.logger.error(f"Error fetching fee rules: {str(e)}")
            raise

    @staticmethod
    def get_fee_rule(fbo_location_id: int, rule_id: int) -> Optional[Dict[str, Any]]:
        """Get a single fee rule by ID for a specific FBO."""
        try:
            rule = FeeRule.query.filter_by(
                id=rule_id, 
                fbo_location_id=fbo_location_id
            ).options(joinedload(FeeRule.aircraft_classification)).first()  # type: ignore
            
            if not rule:
                return None
                
            return {
                'id': rule.id,
                'fbo_location_id': rule.fbo_location_id,
                'fee_name': rule.fee_name,
                'fee_code': rule.fee_code,
                'applies_to_aircraft_classification_id': rule.applies_to_classification_id,
                'aircraft_classification_name': rule.classification.name,
                'amount': float(rule.amount),
                'currency': rule.currency,
                'is_taxable': rule.is_taxable,
                'is_potentially_waivable_by_fuel_uplift': rule.is_potentially_waivable_by_fuel_uplift,
                'calculation_basis': rule.calculation_basis.name,
                'waiver_strategy': rule.waiver_strategy.name,
                'simple_waiver_multiplier': float(rule.simple_waiver_multiplier) if rule.simple_waiver_multiplier else None,
                'has_caa_override': rule.has_caa_override,
                'caa_override_amount': float(rule.caa_override_amount) if rule.caa_override_amount else None,
                'caa_waiver_strategy_override': rule.caa_waiver_strategy_override.name if rule.caa_waiver_strategy_override else None,
                'caa_simple_waiver_multiplier_override': float(rule.caa_simple_waiver_multiplier_override) if rule.caa_simple_waiver_multiplier_override else None,
                'is_primary_fee': rule.is_primary_fee,
                'created_at': rule.created_at.isoformat(),
                'updated_at': rule.updated_at.isoformat()
            }
        except SQLAlchemyError as e:
            current_app.logger.error(f"Error fetching fee rule: {str(e)}")
            raise

    @staticmethod
    def create_fee_rule(fbo_location_id: int, rule_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new fee rule for a specific FBO."""
        try:
            # Verify the aircraft classification exists (global)
            aircraft_classification = AircraftClassification.query.get(rule_data['applies_to_classification_id'])
            if not aircraft_classification:
                raise ValueError("Aircraft classification not found")
            
            rule = FeeRule()
            rule.fbo_location_id = fbo_location_id
            rule.fee_name = rule_data['fee_name']
            rule.fee_code = rule_data['fee_code']
            rule.applies_to_classification_id = rule_data['applies_to_classification_id']
            rule.amount = rule_data['amount']
            rule.currency = rule_data.get('currency', 'USD')
            rule.is_taxable = rule_data.get('is_taxable', False)
            rule.is_potentially_waivable_by_fuel_uplift = rule_data.get('is_potentially_waivable_by_fuel_uplift', False)
            rule.calculation_basis = CalculationBasis[rule_data.get('calculation_basis', 'NOT_APPLICABLE')]
            rule.waiver_strategy = WaiverStrategy[rule_data.get('waiver_strategy', 'NONE')]
            rule.simple_waiver_multiplier = rule_data.get('simple_waiver_multiplier')
            rule.has_caa_override = rule_data.get('has_caa_override', False)
            rule.caa_override_amount = rule_data.get('caa_override_amount')
            rule.caa_waiver_strategy_override = WaiverStrategy[rule_data['caa_waiver_strategy_override']] if rule_data.get('caa_waiver_strategy_override') else None
            rule.caa_simple_waiver_multiplier_override = rule_data.get('caa_simple_waiver_multiplier_override')
            rule.is_primary_fee = rule_data.get('is_primary_fee', False)

            db.session.add(rule)
            db.session.commit()
            
            result = AdminFeeConfigService.get_fee_rule(fbo_location_id, rule.id)
            if result is None:
                raise ValueError("Failed to retrieve created fee rule")
            return result
        except IntegrityError as e:
            db.session.rollback()
            if 'uq_fee_rule_fbo_code' in str(e):
                raise ValueError("Fee rule with this code already exists for this FBO")
            raise
        except SQLAlchemyError as e:
            db.session.rollback()
            current_app.logger.error(f"Error creating fee rule: {str(e)}")
            raise

    @staticmethod
    def update_fee_rule(fbo_location_id: int, rule_id: int, rule_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Update a fee rule for a specific FBO."""
        try:
            rule = FeeRule.query.filter_by(
                id=rule_id, 
                fbo_location_id=fbo_location_id
            ).first()
            
            if not rule:
                return None
            
            # Verify the aircraft classification exists if being updated
            if 'applies_to_classification_id' in rule_data:
                aircraft_classification = AircraftClassification.query.get(rule_data['applies_to_classification_id'])
                if not aircraft_classification:
                    raise ValueError("Aircraft classification not found")
                rule.applies_to_classification_id = rule_data['applies_to_classification_id']
            
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
            
            db.session.commit()
            
            return AdminFeeConfigService.get_fee_rule(fbo_location_id, rule.id)
        except IntegrityError as e:
            db.session.rollback()
            if 'uq_fee_rule_fbo_code' in str(e):
                raise ValueError("Fee rule with this code already exists for this FBO")
            raise
        except SQLAlchemyError as e:
            db.session.rollback()
            current_app.logger.error(f"Error updating fee rule: {str(e)}")
            raise

    @staticmethod
    def delete_fee_rule(fbo_location_id: int, rule_id: int) -> bool:
        """Delete a fee rule for a specific FBO."""
        try:
            rule = FeeRule.query.filter_by(
                id=rule_id, 
                fbo_location_id=fbo_location_id
            ).first()
            
            if not rule:
                return False
            
            db.session.delete(rule)
            db.session.commit()
            return True
        except SQLAlchemyError as e:
            db.session.rollback()
            current_app.logger.error(f"Error deleting fee rule: {str(e)}")
            raise

    # Waiver Tiers CRUD
    @staticmethod
    def get_waiver_tiers(fbo_location_id: int) -> List[Dict[str, Any]]:
        """Get all waiver tiers for a specific FBO."""
        try:
            tiers = WaiverTier.query.filter_by(fbo_location_id=fbo_location_id).order_by(WaiverTier.tier_priority.desc()).all()
            
            return [
                {
                    'id': tier.id,
                    'fbo_location_id': tier.fbo_location_id,
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
    def get_waiver_tier(fbo_location_id: int, tier_id: int) -> Optional[Dict[str, Any]]:
        """Get a single waiver tier by ID for a specific FBO."""
        try:
            tier = WaiverTier.query.filter_by(
                id=tier_id, 
                fbo_location_id=fbo_location_id
            ).first()
            
            if not tier:
                return None
                
            return {
                'id': tier.id,
                'fbo_location_id': tier.fbo_location_id,
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
    def create_waiver_tier(fbo_location_id: int, tier_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new waiver tier for a specific FBO."""
        try:
            tier = WaiverTier()
            tier.fbo_location_id = fbo_location_id
            tier.name = tier_data['name']
            tier.fuel_uplift_multiplier = tier_data['fuel_uplift_multiplier']
            tier.fees_waived_codes = tier_data['fees_waived_codes']
            tier.tier_priority = tier_data['tier_priority']
            tier.is_caa_specific_tier = tier_data.get('is_caa_specific_tier', False)
            db.session.add(tier)
            db.session.commit()
            
            result = AdminFeeConfigService.get_waiver_tier(fbo_location_id, tier.id)
            if result is None:
                raise ValueError("Failed to retrieve created waiver tier")
            return result
        except SQLAlchemyError as e:
            db.session.rollback()
            current_app.logger.error(f"Error creating waiver tier: {str(e)}")
            raise

    @staticmethod
    def update_waiver_tier(fbo_location_id: int, tier_id: int, tier_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Update a waiver tier for a specific FBO."""
        try:
            tier = WaiverTier.query.filter_by(
                id=tier_id, 
                fbo_location_id=fbo_location_id
            ).first()
            
            if not tier:
                return None
            
            # Update fields
            for field in ['name', 'fuel_uplift_multiplier', 'fees_waived_codes', 'tier_priority', 'is_caa_specific_tier']:
                if field in tier_data:
                    setattr(tier, field, tier_data[field])
            
            db.session.commit()
            
            return AdminFeeConfigService.get_waiver_tier(fbo_location_id, tier.id)
        except SQLAlchemyError as e:
            db.session.rollback()
            current_app.logger.error(f"Error updating waiver tier: {str(e)}")
            raise

    @staticmethod
    def delete_waiver_tier(fbo_location_id: int, tier_id: int) -> bool:
        """Delete a waiver tier for a specific FBO."""
        try:
            tier = WaiverTier.query.filter_by(
                id=tier_id,
                fbo_location_id=fbo_location_id
            ).first()

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
    def reorder_waiver_tiers(fbo_location_id: int, tier_updates: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Atomically reorder waiver tiers by updating their tier_priority values.
        
        Args:
            fbo_location_id: FBO location ID
            tier_updates: List of dicts with 'tier_id' and 'new_priority' keys
            
        Returns:
            Dict with success status and updated tiers count
            
        Raises:
            ValueError: If tier IDs don't exist or belong to different FBO
        """
        try:
            # Validate that all tier IDs exist and belong to this FBO
            tier_ids = [update['tier_id'] for update in tier_updates]
            existing_tiers = db.session.query(WaiverTier).filter(
                WaiverTier.id.in_(tier_ids),
                WaiverTier.fbo_location_id == fbo_location_id
            ).all()
            
            if len(existing_tiers) != len(tier_ids):
                raise ValueError("Some tier IDs do not exist or belong to this FBO")
            
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
    def get_consolidated_fee_schedule(fbo_id: int) -> Dict[str, List[Dict[str, Any]]]:
        """
        Get a consolidated fee schedule for a given FBO, including all related entities.
        """
        try:
            # Aircraft classifications are now global, return all
            categories = AircraftClassification.query.all()
            rules = FeeRule.query.filter_by(fbo_location_id=fbo_id).all()
            mappings = AircraftTypeToAircraftClassificationMapping.query.filter_by(fbo_location_id=fbo_id).options(
                joinedload(AircraftTypeToAircraftClassificationMapping.aircraft_type),  # type: ignore
                joinedload(AircraftTypeToAircraftClassificationMapping.classification)    # type: ignore
            ).all()
            overrides = FeeRuleOverride.query.filter_by(fbo_location_id=fbo_id).all()
            fbo_aircraft_config = FBOAircraftTypeConfig.query.filter_by(fbo_location_id=fbo_id).all()

            # Enhanced mappings with related names
            enhanced_mappings = []
            for mapping in mappings:
                mapping_dict = mapping.to_dict()
                mapping_dict['aircraft_type_name'] = mapping.aircraft_type.name if mapping.aircraft_type else None
                mapping_dict['aircraft_classification_name'] = mapping.classification.name if mapping.classification else None
                enhanced_mappings.append(mapping_dict)

            return {
                "categories": [c.to_dict() for c in categories],
                "rules": [r.to_dict() for r in rules],
                "mappings": enhanced_mappings,
                "overrides": [o.to_dict() for o in overrides],
                "fbo_aircraft_config": [ac.to_dict() for ac in fbo_aircraft_config]
            }
        except SQLAlchemyError as e:
            current_app.logger.error(f"Error fetching consolidated fee schedule: {str(e)}")
            raise

    @staticmethod
    def upsert_fee_rule_override(data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Create or update a fee rule override.
        """
        required_fields = ["fbo_location_id", "aircraft_type_id", "fee_rule_id"]
        if not all(field in data for field in required_fields):
            raise ValueError("Missing required fields for fee rule override upsert")

        try:
            override = FeeRuleOverride.query.filter_by(
                fbo_location_id=data["fbo_location_id"],
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
        required_fields = ["fbo_location_id", "aircraft_type_id", "fee_rule_id"]
        if not all(field in data for field in required_fields):
            raise ValueError("Missing required fields for fee rule override deletion")

        try:
            override = FeeRuleOverride.query.filter_by(
                fbo_location_id=data["fbo_location_id"],
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
    def create_aircraft_fee_setup(fbo_location_id: int, aircraft_type_name: str, aircraft_classification_id: int, min_fuel_gallons: float, initial_ramp_fee_rule_id: Optional[int] = None, initial_ramp_fee_amount: Optional[float] = None) -> Dict[str, Any]:
        """
        A comprehensive service method to:
        1. Find or create an AircraftType.
        2. Create a mapping to a AircraftClassification for a specific FBO.
        3. Create an FBO-specific config for min fuel waiver.
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
                db.session.add(aircraft_type)
                # We need to flush to get the ID for the subsequent operations
                db.session.flush()

            # 2. Verify AircraftClassification exists (global)
            aircraft_classification = AircraftClassification.query.get(aircraft_classification_id)
            if not aircraft_classification:
                raise ValueError(f"Aircraft classification with ID {aircraft_classification_id} not found.")

            # 3. Check for duplicate mapping before creating
            existing_mapping = AircraftTypeToAircraftClassificationMapping.query.filter_by(
                fbo_location_id=fbo_location_id,
                aircraft_type_id=aircraft_type.id,
                classification_id=aircraft_classification_id
            ).first()

            if existing_mapping:
                # Use a "raise ValueError" to send a clean error to the frontend
                raise ValueError(f"Aircraft '{normalized_name}' already exists in this classification.")

            # 4. Create AircraftTypeToAircraftClassificationMapping if it doesn't exist for this FBO
            mapping = AircraftTypeToAircraftClassificationMapping.query.filter_by(
                fbo_location_id=fbo_location_id,
                aircraft_type_id=aircraft_type.id
            ).first()

            if mapping:
                # If mapping exists, just update the category
                mapping.classification_id = aircraft_classification_id
            else:
                # If no mapping for this FBO, create one
                mapping = AircraftTypeToAircraftClassificationMapping()
                mapping.fbo_location_id = fbo_location_id
                mapping.aircraft_type_id = aircraft_type.id
                mapping.classification_id = aircraft_classification_id
                db.session.add(mapping)

            # 5. Create or update FBOAircraftTypeConfig
            config = FBOAircraftTypeConfig.query.filter_by(
                fbo_location_id=fbo_location_id,
                aircraft_type_id=aircraft_type.id
            ).first()

            if config:
                config.base_min_fuel_gallons_for_waiver = min_fuel_gallons
            else:
                config = FBOAircraftTypeConfig()
                config.fbo_location_id = fbo_location_id
                config.aircraft_type_id = aircraft_type.id
                config.base_min_fuel_gallons_for_waiver = min_fuel_gallons
                db.session.add(config)

            # 6. Create initial FeeRuleOverride if parameters are provided
            if initial_ramp_fee_rule_id is not None and initial_ramp_fee_amount is not None:
                override = FeeRuleOverride()
                override.fbo_location_id = fbo_location_id
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
                "mapping_id": mapping.id,
                "fbo_aircraft_config_id": config.id,
                "fbo_aircraft_config": config
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
    def get_current_fuel_prices(fbo_location_id: int) -> List[Dict[str, Any]]:
        """
        Get current fuel prices for a specific FBO.
        
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
                    fbo_location_id=fbo_location_id,
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
    def set_current_fuel_prices(fbo_location_id: int, prices_data: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Set current fuel prices for a specific FBO.
        
        This method creates NEW FuelPrice records with the current effective_date.
        It does not update existing rows to maintain an immutable price history.
        
        Args:
            fbo_location_id: The FBO location ID
            prices_data: List of dicts with 'fuel_type_id' and 'price' keys
            
        Returns:
            Dict with success status and count of prices updated
        """
        try:
            from datetime import datetime
            from decimal import Decimal, InvalidOperation
            
            # Validate FBO location ID
            if not isinstance(fbo_location_id, int) or fbo_location_id <= 0:
                raise ValueError(f"Invalid FBO location ID: {fbo_location_id}")
            
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
                new_price.fbo_location_id = fbo_location_id
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
            current_app.logger.error(f"Database error setting fuel prices for FBO {fbo_location_id}: {str(e)}")
            # Preserve original error context for debugging
            raise ValueError(f"Database operation failed while setting fuel prices. Original error: {str(e)}")
        except Exception as e:
            db.session.rollback()
            current_app.logger.error(f"Unexpected error setting fuel prices for FBO {fbo_location_id}: {str(e)}")
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