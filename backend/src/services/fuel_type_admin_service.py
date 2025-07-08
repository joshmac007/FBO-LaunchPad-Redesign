"""
Service for managing fuel types (admin functionality).

This service provides full CRUD operations for fuel types, following the project's 
service layer architecture. It handles business logic for fuel type management
including validation, uniqueness checks, and proper error handling.
"""

from typing import Dict, Any, List, Tuple, Optional
from flask import current_app
from sqlalchemy.exc import SQLAlchemyError, IntegrityError
from ..models.fuel_type import FuelType
from ..models.fuel_order import FuelOrder
from ..models.fuel_price import FuelPrice
from ..extensions import db


class FuelTypeAdminService:
    """Service for managing fuel types with full CRUD operations."""
    
    @staticmethod
    def get_all_fuel_types(include_inactive: bool = False) -> Tuple[List[Dict[str, Any]], str, int]:
        """
        Get all fuel types.
        
        Args:
            include_inactive: If True, includes inactive fuel types
            
        Returns:
            Tuple of (fuel_types_list, message, status_code)
        """
        try:
            query = FuelType.query
            if not include_inactive:
                query = query.filter_by(is_active=True)
            
            fuel_types = query.order_by(FuelType.name).all()
            fuel_types_data = [fuel_type.to_dict() for fuel_type in fuel_types]
            
            return fuel_types_data, f"Retrieved {len(fuel_types_data)} fuel types successfully", 200
            
        except SQLAlchemyError as e:
            current_app.logger.error(f"Database error retrieving fuel types: {str(e)}")
            return [], "Failed to retrieve fuel types", 500
        except Exception as e:
            current_app.logger.error(f"Unexpected error retrieving fuel types: {str(e)}")
            return [], "Internal server error", 500
    
    @staticmethod
    def get_fuel_type_by_id(fuel_type_id: int) -> Tuple[Optional[FuelType], str, int]:
        """
        Get a fuel type by ID.
        
        Args:
            fuel_type_id: The ID of the fuel type to retrieve
            
        Returns:
            Tuple of (fuel_type, message, status_code)
        """
        try:
            fuel_type = FuelType.query.get(fuel_type_id)
            if not fuel_type:
                return None, f"Fuel type with ID {fuel_type_id} not found", 404
            
            return fuel_type, "Fuel type retrieved successfully", 200
            
        except SQLAlchemyError as e:
            current_app.logger.error(f"Database error retrieving fuel type {fuel_type_id}: {str(e)}")
            return None, "Failed to retrieve fuel type", 500
        except Exception as e:
            current_app.logger.error(f"Unexpected error retrieving fuel type {fuel_type_id}: {str(e)}")
            return None, "Internal server error", 500
    
    @staticmethod
    def create_fuel_type(data: Dict[str, Any]) -> Tuple[Optional[FuelType], str, int]:
        """
        Create a new fuel type.
        
        Args:
            data: Dictionary containing fuel type data
            
        Returns:
            Tuple of (fuel_type, message, status_code)
        """
        try:
            # Check for duplicate name
            existing_name = FuelType.query.filter_by(name=data['name']).first()
            if existing_name:
                return None, f"Fuel type with name '{data['name']}' already exists", 409
            
            # Check for duplicate code
            existing_code = FuelType.query.filter_by(code=data['code']).first()
            if existing_code:
                return None, f"Fuel type with code '{data['code']}' already exists", 409
            
            # Create new fuel type
            fuel_type = FuelType(
                name=data['name'],
                code=data['code'],
                description=data.get('description'),
                is_active=data.get('is_active', True)
            )
            
            db.session.add(fuel_type)
            db.session.commit()
            
            current_app.logger.info(f"Created fuel type: {fuel_type.name} ({fuel_type.code})")
            return fuel_type, f"Fuel type '{fuel_type.name}' created successfully", 201
            
        except IntegrityError as e:
            db.session.rollback()
            current_app.logger.error(f"Integrity error creating fuel type: {str(e)}")
            return None, "Fuel type with this name or code already exists", 409
        except SQLAlchemyError as e:
            db.session.rollback()
            current_app.logger.error(f"Database error creating fuel type: {str(e)}")
            return None, "Failed to create fuel type", 500
        except Exception as e:
            db.session.rollback()
            current_app.logger.error(f"Unexpected error creating fuel type: {str(e)}")
            return None, "Internal server error", 500
    
    @staticmethod
    def update_fuel_type(fuel_type_id: int, data: Dict[str, Any]) -> Tuple[Optional[FuelType], str, int]:
        """
        Update an existing fuel type.
        
        Args:
            fuel_type_id: The ID of the fuel type to update
            data: Dictionary containing updated fuel type data
            
        Returns:
            Tuple of (fuel_type, message, status_code)
        """
        try:
            fuel_type = FuelType.query.get(fuel_type_id)
            if not fuel_type:
                return None, f"Fuel type with ID {fuel_type_id} not found", 404
            
            # Check for duplicate name if name is being updated
            if 'name' in data and data['name'] != fuel_type.name:
                existing_name = FuelType.query.filter_by(name=data['name']).first()
                if existing_name:
                    return None, f"Fuel type with name '{data['name']}' already exists", 409
            
            # Check for duplicate code if code is being updated
            if 'code' in data and data['code'] != fuel_type.code:
                existing_code = FuelType.query.filter_by(code=data['code']).first()
                if existing_code:
                    return None, f"Fuel type with code '{data['code']}' already exists", 409
            
            # Update fields
            if 'name' in data:
                fuel_type.name = data['name']
            if 'code' in data:
                fuel_type.code = data['code']
            if 'description' in data:
                fuel_type.description = data['description']
            if 'is_active' in data:
                fuel_type.is_active = data['is_active']
            
            db.session.commit()
            
            current_app.logger.info(f"Updated fuel type: {fuel_type.name} ({fuel_type.code})")
            return fuel_type, f"Fuel type '{fuel_type.name}' updated successfully", 200
            
        except IntegrityError as e:
            db.session.rollback()
            current_app.logger.error(f"Integrity error updating fuel type {fuel_type_id}: {str(e)}")
            return None, "Fuel type with this name or code already exists", 409
        except SQLAlchemyError as e:
            db.session.rollback()
            current_app.logger.error(f"Database error updating fuel type {fuel_type_id}: {str(e)}")
            return None, "Failed to update fuel type", 500
        except Exception as e:
            db.session.rollback()
            current_app.logger.error(f"Unexpected error updating fuel type {fuel_type_id}: {str(e)}")
            return None, "Internal server error", 500
    
    @staticmethod
    def delete_fuel_type(fuel_type_id: int) -> Tuple[bool, str, int]:
        """
        Delete (soft delete) a fuel type.
        
        This method sets the fuel type as inactive rather than permanently deleting it
        to maintain data integrity and historical references.
        
        Args:
            fuel_type_id: The ID of the fuel type to delete
            
        Returns:
            Tuple of (success, message, status_code)
        """
        try:
            fuel_type = FuelType.query.get(fuel_type_id)
            if not fuel_type:
                return False, f"Fuel type with ID {fuel_type_id} not found", 404
            
            # Check if fuel type is used in any fuel orders
            fuel_orders_count = FuelOrder.query.filter_by(fuel_type_id=fuel_type_id).count()
            if fuel_orders_count > 0:
                # Soft delete by setting is_active to False
                fuel_type.is_active = False
                db.session.commit()
                current_app.logger.info(f"Soft deleted fuel type: {fuel_type.name} (used in {fuel_orders_count} orders)")
                return True, f"Fuel type '{fuel_type.name}' deactivated successfully (used in {fuel_orders_count} orders)", 200
            
            # Check if fuel type has associated prices
            fuel_prices_count = FuelPrice.query.filter_by(fuel_type_id=fuel_type_id).count()
            if fuel_prices_count > 0:
                # Soft delete by setting is_active to False
                fuel_type.is_active = False
                db.session.commit()
                current_app.logger.info(f"Soft deleted fuel type: {fuel_type.name} (has {fuel_prices_count} price records)")
                return True, f"Fuel type '{fuel_type.name}' deactivated successfully (has price history)", 200
            
            # If no references exist, perform hard delete
            db.session.delete(fuel_type)
            db.session.commit()
            
            current_app.logger.info(f"Hard deleted fuel type: {fuel_type.name}")
            return True, f"Fuel type '{fuel_type.name}' deleted successfully", 200
            
        except SQLAlchemyError as e:
            db.session.rollback()
            current_app.logger.error(f"Database error deleting fuel type {fuel_type_id}: {str(e)}")
            return False, "Failed to delete fuel type", 500
        except Exception as e:
            db.session.rollback()
            current_app.logger.error(f"Unexpected error deleting fuel type {fuel_type_id}: {str(e)}")
            return False, "Internal server error", 500
    
    @staticmethod
    def get_fuel_type_usage_stats(fuel_type_id: int) -> Tuple[Optional[Dict[str, Any]], str, int]:
        """
        Get usage statistics for a fuel type.
        
        Args:
            fuel_type_id: The ID of the fuel type
            
        Returns:
            Tuple of (stats_dict, message, status_code)
        """
        try:
            fuel_type = FuelType.query.get(fuel_type_id)
            if not fuel_type:
                return None, f"Fuel type with ID {fuel_type_id} not found", 404
            
            # Count fuel orders using this fuel type
            fuel_orders_count = FuelOrder.query.filter_by(fuel_type_id=fuel_type_id).count()
            
            # Count fuel prices for this fuel type
            fuel_prices_count = FuelPrice.query.filter_by(fuel_type_id=fuel_type_id).count()
            
            # Get latest fuel price
            latest_price = FuelPrice.query.filter_by(fuel_type_id=fuel_type_id).order_by(
                FuelPrice.effective_date.desc()
            ).first()
            
            stats = {
                'fuel_type_id': fuel_type_id,
                'fuel_type_name': fuel_type.name,
                'fuel_type_code': fuel_type.code,
                'is_active': fuel_type.is_active,
                'orders_count': fuel_orders_count,
                'price_history_count': fuel_prices_count,
                'latest_price': float(latest_price.price) if latest_price and latest_price.price else None,
                'latest_price_date': latest_price.effective_date.isoformat() if latest_price else None,
                'can_be_deleted': fuel_orders_count == 0 and fuel_prices_count == 0
            }
            
            return stats, "Usage statistics retrieved successfully", 200
            
        except SQLAlchemyError as e:
            current_app.logger.error(f"Database error retrieving usage stats for fuel type {fuel_type_id}: {str(e)}")
            return None, "Failed to retrieve usage statistics", 500
        except Exception as e:
            current_app.logger.error(f"Unexpected error retrieving usage stats for fuel type {fuel_type_id}: {str(e)}")
            return None, "Internal server error", 500