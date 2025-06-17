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
    FeeRule, WaiverTier, CalculationBasis, WaiverStrategy
)


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
            from ..models.fbo_aircraft_type_config import FBOAircraftTypeConfig
            
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
                config = FBOAircraftTypeConfig(
                    fbo_location_id=fbo_location_id,
                    aircraft_type_id=aircraft_type_id,
                    base_min_fuel_gallons_for_waiver=base_min_fuel_gallons
                )
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
            from ..models.fbo_aircraft_type_config import FBOAircraftTypeConfig
            
            configs = FBOAircraftTypeConfig.query.filter_by(
                fbo_location_id=fbo_location_id
            ).options(
                joinedload(FBOAircraftTypeConfig.aircraft_type)
            ).all()
            
            return [config.to_dict() for config in configs]
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
            category = FeeCategory(
                fbo_location_id=fbo_location_id,
                name=name
            )
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
                joinedload(AircraftTypeToFeeCategoryMapping.aircraft_type),
                joinedload(AircraftTypeToFeeCategoryMapping.fee_category)
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
            
            mapping = AircraftTypeToFeeCategoryMapping(
                fbo_location_id=fbo_location_id,
                aircraft_type_id=aircraft_type_id,
                fee_category_id=fee_category_id
            )
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
                joinedload(AircraftTypeToFeeCategoryMapping.aircraft_type),
                joinedload(AircraftTypeToFeeCategoryMapping.fee_category)
            ).get(mapping.id)
            
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
                        new_mapping = AircraftTypeToFeeCategoryMapping(
                            fbo_location_id=fbo_location_id,
                            aircraft_type_id=aircraft_type.id,
                            fee_category_id=fee_category.id
                        )
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
            
            rules = query.options(joinedload(FeeRule.fee_category)).all()
            
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
            ).options(joinedload(FeeRule.fee_category)).first()
            
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
            
            rule = FeeRule(
                fbo_location_id=fbo_location_id,
                fee_name=rule_data['fee_name'],
                fee_code=rule_data['fee_code'],
                applies_to_fee_category_id=rule_data['applies_to_fee_category_id'],
                amount=rule_data['amount'],
                currency=rule_data.get('currency', 'USD'),
                is_taxable=rule_data.get('is_taxable', False),
                is_potentially_waivable_by_fuel_uplift=rule_data.get('is_potentially_waivable_by_fuel_uplift', False),
                calculation_basis=CalculationBasis[rule_data.get('calculation_basis', 'NOT_APPLICABLE')],
                waiver_strategy=WaiverStrategy[rule_data.get('waiver_strategy', 'NONE')],
                simple_waiver_multiplier=rule_data.get('simple_waiver_multiplier'),
                has_caa_override=rule_data.get('has_caa_override', False),
                caa_override_amount=rule_data.get('caa_override_amount'),
                caa_waiver_strategy_override=WaiverStrategy[rule_data['caa_waiver_strategy_override']] if rule_data.get('caa_waiver_strategy_override') else None,
                caa_simple_waiver_multiplier_override=rule_data.get('caa_simple_waiver_multiplier_override')
            )
            db.session.add(rule)
            db.session.commit()
            
            return AdminFeeConfigService.get_fee_rule(fbo_location_id, rule.id)
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
            tier = WaiverTier(
                fbo_location_id=fbo_location_id,
                name=tier_data['name'],
                fuel_uplift_multiplier=tier_data['fuel_uplift_multiplier'],
                fees_waived_codes=tier_data['fees_waived_codes'],
                tier_priority=tier_data['tier_priority'],
                is_caa_specific_tier=tier_data.get('is_caa_specific_tier', False)
            )
            db.session.add(tier)
            db.session.commit()
            
            return AdminFeeConfigService.get_waiver_tier(fbo_location_id, tier.id)
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