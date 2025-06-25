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

from ..extensions import db
from ..models import (
    AircraftType, FeeCategory, AircraftTypeToFeeCategoryMapping,
    FeeRule, WaiverTier, CalculationBasis, WaiverStrategy,
    FBOAircraftTypeConfig, FeeRuleOverride
)
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
                    'default_fee_category_id': aircraft_type.default_fee_category_id,
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
            categories = FeeCategory.query.filter_by(fbo_location_id=fbo_location_id).all()
            return [
                {
                    'id': cat.id,
                    'fbo_location_id': cat.fbo_location_id,
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
    def get_fee_category(fbo_location_id: int, category_id: int) -> Optional[Dict[str, Any]]:
        """Get a single fee category by ID for a specific FBO."""
        try:
            category = FeeCategory.query.filter_by(
                id=category_id, 
                fbo_location_id=fbo_location_id
            ).first()
            
            if not category:
                return None
                
            return {
                'id': category.id,
                'fbo_location_id': category.fbo_location_id,
                'name': category.name,
                'created_at': category.created_at.isoformat(),
                'updated_at': category.updated_at.isoformat()
            }
        except SQLAlchemyError as e:
            current_app.logger.error(f"Error fetching fee category: {str(e)}")
            raise

    @staticmethod
    def get_fee_category_by_id(fbo_location_id: int, category_id: int) -> Optional[Dict[str, Any]]:
        """Get a single fee category by ID for a specific FBO (alias for get_fee_category)."""
        return AdminFeeConfigService.get_fee_category(fbo_location_id, category_id)

    @staticmethod
    def create_fee_category(fbo_location_id: int, name: str) -> Dict[str, Any]:
        """Create a new fee category for a specific FBO."""
        try:
            category = FeeCategory()
            category.fbo_location_id = fbo_location_id
            category.name = name
            db.session.add(category)
            db.session.commit()
            
            return {
                'id': category.id,
                'fbo_location_id': category.fbo_location_id,
                'name': category.name,
                'created_at': category.created_at.isoformat(),
                'updated_at': category.updated_at.isoformat()
            }
        except IntegrityError as e:
            db.session.rollback()
            if 'uq_fee_category_fbo_name' in str(e):
                raise ValueError("Fee category with this name already exists for this FBO")
            raise
        except SQLAlchemyError as e:
            db.session.rollback()
            current_app.logger.error(f"Error creating fee category: {str(e)}")
            raise

    @staticmethod
    def update_fee_category(fbo_location_id: int, category_id: int, name: str) -> Optional[Dict[str, Any]]:
        """Update a fee category for a specific FBO."""
        try:
            category = FeeCategory.query.filter_by(
                id=category_id, 
                fbo_location_id=fbo_location_id
            ).first()
            
            if not category:
                return None
            
            category.name = name
            db.session.commit()
            
            return {
                'id': category.id,
                'fbo_location_id': category.fbo_location_id,
                'name': category.name,
                'created_at': category.created_at.isoformat(),
                'updated_at': category.updated_at.isoformat()
            }
        except IntegrityError as e:
            db.session.rollback()
            if 'uq_fee_category_fbo_name' in str(e):
                raise ValueError("Fee category with this name already exists for this FBO")
            raise
        except SQLAlchemyError as e:
            db.session.rollback()
            current_app.logger.error(f"Error updating fee category: {str(e)}")
            raise

    @staticmethod
    def delete_fee_category(fbo_location_id: int, category_id: int) -> bool:
        """Delete a fee category for a specific FBO."""
        try:
            category = FeeCategory.query.filter_by(
                id=category_id, 
                fbo_location_id=fbo_location_id
            ).first()
            
            if not category:
                return False
            
            # Check if category is referenced by fee rules
            fee_rules_count = FeeRule.query.filter_by(applies_to_fee_category_id=category_id).count()
            if fee_rules_count > 0:
                raise ValueError("Cannot delete fee category that is referenced by fee rules")
            
            # Check if category is referenced by mappings
            mappings_count = AircraftTypeToFeeCategoryMapping.query.filter_by(fee_category_id=category_id).count()
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
    def get_or_create_general_fee_category(fbo_location_id: int) -> Dict[str, Any]:
        """
        Get or create a 'General' fee category for the specified FBO using race-condition-proof logic.
        Uses optimistic-locking-with-fallback pattern: try SELECT, on miss try INSERT, on IntegrityError rollback and SELECT again.
        """
        category_name = "General"
        
        try:
            # First attempt: try to find existing category
            category = FeeCategory.query.filter_by(
                fbo_location_id=fbo_location_id,
                name=category_name
            ).first()
            
            if category:
                return {
                    'id': category.id,
                    'fbo_location_id': category.fbo_location_id,
                    'name': category.name,
                    'created_at': category.created_at.isoformat(),
                    'updated_at': category.updated_at.isoformat()
                }
            
            # Not found, try to create it
            try:
                category = FeeCategory()
                category.fbo_location_id = fbo_location_id
                category.name = category_name
                db.session.add(category)
                db.session.commit()
                
                return {
                    'id': category.id,
                    'fbo_location_id': category.fbo_location_id,
                    'name': category.name,
                    'created_at': category.created_at.isoformat(),
                    'updated_at': category.updated_at.isoformat()
                }
                
            except IntegrityError:
                # Race condition occurred - another thread created it
                db.session.rollback()
                # Try SELECT again - this should now succeed
                category = FeeCategory.query.filter_by(
                    fbo_location_id=fbo_location_id,
                    name=category_name
                ).first()
                
                if not category:
                    # This should not happen, but handle gracefully
                    raise ValueError("Failed to create or retrieve General fee category after race condition")
                
                return {
                    'id': category.id,
                    'fbo_location_id': category.fbo_location_id,
                    'name': category.name,
                    'created_at': category.created_at.isoformat(),
                    'updated_at': category.updated_at.isoformat()
                }
                
        except SQLAlchemyError as e:
            db.session.rollback()
            current_app.logger.error(f"Error in get_or_create_general_fee_category: {str(e)}")
            raise

    # Aircraft Type to Fee Category Mappings CRUD
    @staticmethod
    def get_aircraft_type_mappings(fbo_location_id: int, category_id: Optional[int] = None) -> List[Dict[str, Any]]:
        """Get all aircraft type to fee category mappings for a specific FBO, optionally filtered by fee category."""
        try:
            query = AircraftTypeToFeeCategoryMapping.query.filter_by(
                fbo_location_id=fbo_location_id
            )
            
            # Apply category filter if provided
            if category_id is not None:
                query = query.filter_by(fee_category_id=category_id)
            
            mappings = query.options(
                joinedload(AircraftTypeToFeeCategoryMapping.aircraft_type),  # type: ignore
                joinedload(AircraftTypeToFeeCategoryMapping.fee_category)  # type: ignore
            ).all()
            
            return [
                {
                    'id': mapping.id,
                    'fbo_location_id': mapping.fbo_location_id,
                    'aircraft_type_id': mapping.aircraft_type_id,
                    'aircraft_type_name': mapping.aircraft_type.name,
                    'fee_category_id': mapping.fee_category_id,
                    'fee_category_name': mapping.fee_category.name,
                    'created_at': mapping.created_at.isoformat(),
                    'updated_at': mapping.updated_at.isoformat()
                }
                for mapping in mappings
            ]
        except SQLAlchemyError as e:
            current_app.logger.error(f"Error fetching aircraft type mappings: {str(e)}")
            raise

    @staticmethod
    def create_aircraft_type_mapping(fbo_location_id: int, aircraft_type_id: int, fee_category_id: int) -> Dict[str, Any]:
        """Create a new aircraft type to fee category mapping."""
        try:
            # Verify the fee category belongs to this FBO
            fee_category = FeeCategory.query.filter_by(
                id=fee_category_id, 
                fbo_location_id=fbo_location_id
            ).first()
            if not fee_category:
                raise ValueError("Fee category not found for this FBO")
            
            # Verify aircraft type exists
            aircraft_type = AircraftType.query.get(aircraft_type_id)
            if not aircraft_type:
                raise ValueError("Aircraft type not found")
            
            mapping = AircraftTypeToFeeCategoryMapping()
            mapping.fbo_location_id = fbo_location_id
            mapping.aircraft_type_id = aircraft_type_id
            mapping.fee_category_id = fee_category_id
            db.session.add(mapping)
            db.session.commit()
            
            return {
                'id': mapping.id,
                'fbo_location_id': mapping.fbo_location_id,
                'aircraft_type_id': mapping.aircraft_type_id,
                'aircraft_type_name': aircraft_type.name,
                'fee_category_id': mapping.fee_category_id,
                'fee_category_name': fee_category.name,
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
    def update_aircraft_type_mapping(fbo_location_id: int, mapping_id: int, fee_category_id: int) -> Optional[Dict[str, Any]]:
        """Update an aircraft type to fee category mapping."""
        try:
            mapping = AircraftTypeToFeeCategoryMapping.query.filter_by(
                id=mapping_id, 
                fbo_location_id=fbo_location_id
            ).first()
            
            if not mapping:
                return None
            
            # Verify the new fee category belongs to this FBO
            fee_category = FeeCategory.query.filter_by(
                id=fee_category_id, 
                fbo_location_id=fbo_location_id
            ).first()
            if not fee_category:
                raise ValueError("Fee category not found for this FBO")
            
            mapping.fee_category_id = fee_category_id
            db.session.commit()
            
            # Reload to get updated relationships
            mapping = AircraftTypeToFeeCategoryMapping.query.options(
                joinedload(AircraftTypeToFeeCategoryMapping.aircraft_type),  # type: ignore
                joinedload(AircraftTypeToFeeCategoryMapping.fee_category)  # type: ignore
            ).get(mapping.id)
            
            if not mapping:
                # This should not happen if we just updated it, but for type safety
                return None
            
            return {
                'id': mapping.id,
                'fbo_location_id': mapping.fbo_location_id,
                'aircraft_type_id': mapping.aircraft_type_id,
                'aircraft_type_name': mapping.aircraft_type.name,
                'fee_category_id': mapping.fee_category_id,
                'fee_category_name': mapping.fee_category.name,
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
            mapping = AircraftTypeToFeeCategoryMapping.query.filter_by(
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
            
            expected_columns = {'AircraftModel', 'FeeCategoryName'}
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
                    fee_category_name = row['FeeCategoryName'].strip()
                    aircraft_manufacturer = row.get('AircraftManufacturer', '').strip()
                    
                    if not aircraft_model or not fee_category_name:
                        results['errors'].append(f"Row {row_num}: Missing required fields")
                        continue
                    
                    # Find aircraft type by name (exact match)
                    aircraft_type = AircraftType.query.filter_by(name=aircraft_model).first()
                    if not aircraft_type:
                        results['errors'].append(f"Row {row_num}: Aircraft model '{aircraft_model}' not found")
                        continue
                    
                    # Find fee category by name for this FBO
                    fee_category = FeeCategory.query.filter_by(
                        fbo_location_id=fbo_location_id,
                        name=fee_category_name
                    ).first()
                    if not fee_category:
                        results['errors'].append(f"Row {row_num}: Fee category '{fee_category_name}' not found for this FBO")
                        continue
                    
                    # Check if mapping already exists
                    existing_mapping = AircraftTypeToFeeCategoryMapping.query.filter_by(
                        fbo_location_id=fbo_location_id,
                        aircraft_type_id=aircraft_type.id
                    ).first()
                    
                    if existing_mapping:
                        # Update existing mapping
                        existing_mapping.fee_category_id = fee_category.id
                        results['updated'] += 1
                    else:
                        # Create new mapping
                        new_mapping = AircraftTypeToFeeCategoryMapping()
                        new_mapping.fbo_location_id = fbo_location_id
                        new_mapping.aircraft_type_id = aircraft_type.id
                        new_mapping.fee_category_id = fee_category.id
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
                query = query.filter_by(applies_to_fee_category_id=category_id)
            
            rules = query.options(joinedload(FeeRule.fee_category)).all()  # type: ignore
            
            return [
                {
                    'id': rule.id,
                    'fbo_location_id': rule.fbo_location_id,
                    'fee_name': rule.fee_name,
                    'fee_code': rule.fee_code,
                    'applies_to_fee_category_id': rule.applies_to_fee_category_id,
                    'fee_category_name': rule.fee_category.name,
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
            ).options(joinedload(FeeRule.fee_category)).first()  # type: ignore
            
            if not rule:
                return None
                
            return {
                'id': rule.id,
                'fbo_location_id': rule.fbo_location_id,
                'fee_name': rule.fee_name,
                'fee_code': rule.fee_code,
                'applies_to_fee_category_id': rule.applies_to_fee_category_id,
                'fee_category_name': rule.fee_category.name,
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
            # Verify the fee category belongs to this FBO
            fee_category = FeeCategory.query.filter_by(
                id=rule_data['applies_to_fee_category_id'], 
                fbo_location_id=fbo_location_id
            ).first()
            if not fee_category:
                raise ValueError("Fee category not found for this FBO")
            
            rule = FeeRule()
            rule.fbo_location_id = fbo_location_id
            rule.fee_name = rule_data['fee_name']
            rule.fee_code = rule_data['fee_code']
            rule.applies_to_fee_category_id = rule_data['applies_to_fee_category_id']
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
            
            # Verify the fee category belongs to this FBO if being updated
            if 'applies_to_fee_category_id' in rule_data:
                fee_category = FeeCategory.query.filter_by(
                    id=rule_data['applies_to_fee_category_id'], 
                    fbo_location_id=fbo_location_id
                ).first()
                if not fee_category:
                    raise ValueError("Fee category not found for this FBO")
                rule.applies_to_fee_category_id = rule_data['applies_to_fee_category_id']
            
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
            categories = FeeCategory.query.filter_by(fbo_location_id=fbo_id).all()
            rules = FeeRule.query.filter_by(fbo_location_id=fbo_id).all()
            mappings = AircraftTypeToFeeCategoryMapping.query.filter_by(fbo_location_id=fbo_id).all()
            overrides = FeeRuleOverride.query.filter_by(fbo_location_id=fbo_id).all()
            fbo_aircraft_configs = FBOAircraftTypeConfig.query.filter_by(fbo_location_id=fbo_id).all()

            return {
                "categories": [c.to_dict() for c in categories],
                "rules": [r.to_dict() for r in rules],
                "mappings": [m.to_dict() for m in mappings],
                "overrides": [o.to_dict() for o in overrides],
                "fbo_aircraft_configs": [ac.to_dict() for ac in fbo_aircraft_configs]
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
    def create_aircraft_fee_setup(fbo_location_id: int, aircraft_type_name: str, fee_category_id: int, min_fuel_gallons: float, initial_ramp_fee_rule_id: Optional[int] = None, initial_ramp_fee_amount: Optional[float] = None) -> Dict[str, Any]:
        """
        A comprehensive service method to:
        1. Find or create an AircraftType.
        2. Create a mapping to a FeeCategory for a specific FBO.
        3. Create an FBO-specific config for min fuel waiver.
        4. Optionally, create an initial FeeRuleOverride for the aircraft.
        All operations are performed in a single atomic transaction.
        """
        try:
            # 1. Find or create AircraftType
            aircraft_type = AircraftType.query.filter_by(name=aircraft_type_name).first()
            if not aircraft_type:
                aircraft_type = AircraftType()
                aircraft_type.name = aircraft_type_name
                aircraft_type.base_min_fuel_gallons_for_waiver = min_fuel_gallons # Satisfy NOT NULL constraint
                db.session.add(aircraft_type)
                # We need to flush to get the ID for the subsequent operations
                db.session.flush()

            # 2. Verify FeeCategory exists for this FBO
            fee_category = FeeCategory.query.filter_by(id=fee_category_id, fbo_location_id=fbo_location_id).first()
            if not fee_category:
                raise ValueError(f"Fee Category with ID {fee_category_id} not found for this FBO.")

            # 3. Create AircraftTypeToFeeCategoryMapping if it doesn't exist for this FBO
            mapping = AircraftTypeToFeeCategoryMapping.query.filter_by(
                fbo_location_id=fbo_location_id,
                aircraft_type_id=aircraft_type.id
            ).first()

            if mapping:
                # If mapping exists, just update the category
                mapping.fee_category_id = fee_category_id
            else:
                # If no mapping for this FBO, create one
                mapping = AircraftTypeToFeeCategoryMapping()
                mapping.fbo_location_id = fbo_location_id
                mapping.aircraft_type_id = aircraft_type.id
                mapping.fee_category_id = fee_category_id
                db.session.add(mapping)

            # 4. Create or update FBOAircraftTypeConfig
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

            # 5. Create initial FeeRuleOverride if parameters are provided
            if initial_ramp_fee_rule_id is not None and initial_ramp_fee_amount is not None:
                override = FeeRuleOverride()
                override.fbo_location_id = fbo_location_id
                override.aircraft_type_id = aircraft_type.id
                override.fee_rule_id = initial_ramp_fee_rule_id
                override.override_amount = initial_ramp_fee_amount
                db.session.add(override)
            
            db.session.commit()

            # We need to get the IDs after the commit
            return {
                "message": "Aircraft fee setup completed successfully.",
                "aircraft_type_id": aircraft_type.id,
                "mapping_id": mapping.id,
                "fbo_aircraft_config_id": config.id
            }

        except IntegrityError as e:
            db.session.rollback()
            current_app.logger.error(f"Database integrity error during aircraft fee setup: {str(e)}")
            raise ValueError("A database integrity error occurred. This could be due to a race condition or invalid foreign key.")
        except SQLAlchemyError as e:
            db.session.rollback()
            current_app.logger.error(f"Database error during aircraft fee setup: {str(e)}")
            raise ValueError("A database error occurred while setting up the aircraft fee structure.") 