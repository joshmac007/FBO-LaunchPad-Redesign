from typing import Tuple, List, Optional, Dict, Any
from ..models.aircraft import Aircraft
from ..app import db

class AircraftService:
    @staticmethod
    def create_aircraft(data: Dict[str, Any]) -> Tuple[Optional[Aircraft], str, int]:
        if 'tail_number' not in data:
            return None, "Missing required field: tail_number", 400
        if 'aircraft_type' not in data:
            return None, "Missing required field: aircraft_type", 400
        if 'fuel_type' not in data:
            return None, "Missing required field: fuel_type", 400
            
        if Aircraft.query.filter_by(tail_number=data['tail_number']).first():
            return None, "Aircraft with this tail number already exists", 409
        try:
            aircraft = Aircraft(
                tail_number=data['tail_number'],
                aircraft_type=data['aircraft_type'],
                fuel_type=data['fuel_type'],
                customer_id=data.get('customer_id')
            )
            db.session.add(aircraft)
            db.session.commit()
            return aircraft, "Aircraft created successfully", 201
        except Exception as e:
            db.session.rollback()
            return None, f"Error creating aircraft: {str(e)}", 500

    @staticmethod
    def get_or_create_aircraft(data: Dict[str, Any]) -> Tuple[Optional[Aircraft], str, int, bool]:
        """
        Get an existing aircraft by tail_number or create a new one if it doesn't exist.
        This method consolidates all aircraft creation logic to prevent race conditions
        and ensures consistent aircraft handling across the application.
        
        Args:
            data: Dictionary containing aircraft data, must include:
                - tail_number: The aircraft's tail number
                - aircraft_type: Type of aircraft (required for new aircraft)
                - fuel_type: Fuel type (required for new aircraft)
                - customer_id: Optional customer association
        
        Returns:
            Tuple of (aircraft, message, status_code, was_created)
            - aircraft: Aircraft object if successful, None if error
            - message: Success or error message
            - status_code: HTTP status code (200 for existing, 201 for created, 4xx/5xx for errors)
            - was_created: Boolean indicating if aircraft was newly created
        """
        import logging
        logger = logging.getLogger(__name__)
        
        if 'tail_number' not in data:
            return None, "Missing required field: tail_number", 400, False
            
        tail_number = data['tail_number'].strip().upper()
        
        try:
            # First, try to get existing aircraft
            existing_aircraft = Aircraft.query.filter_by(tail_number=tail_number).first()
            if existing_aircraft:
                logger.info(f"Found existing aircraft: {tail_number}")
                return existing_aircraft, "Aircraft retrieved successfully", 200, False
            
            # Aircraft doesn't exist, create it
            if 'aircraft_type' not in data:
                return None, "Missing required field: aircraft_type for aircraft creation", 400, False
            if 'fuel_type' not in data:
                return None, "Missing required field: fuel_type for aircraft creation", 400, False
            
            logger.info(f"Creating new aircraft: {tail_number}")
            
            # Use a transaction to handle potential race conditions
            try:
                aircraft = Aircraft(
                    tail_number=tail_number,
                    aircraft_type=data['aircraft_type'].strip(),
                    fuel_type=data['fuel_type'].strip(),
                    customer_id=data.get('customer_id')
                )
                db.session.add(aircraft)
                db.session.commit()
                logger.info(f"Successfully created new aircraft: {tail_number}")
                return aircraft, "Aircraft created successfully", 201, True
                
            except Exception as create_error:
                db.session.rollback()
                # Check if this is a race condition (another process created the aircraft)
                if "duplicate key" in str(create_error).lower() or "unique constraint" in str(create_error).lower():
                    logger.warning(f"Race condition detected for aircraft {tail_number}, attempting to retrieve existing")
                    # Try to get the aircraft that was created by another process
                    existing_aircraft = Aircraft.query.filter_by(tail_number=tail_number).first()
                    if existing_aircraft:
                        return existing_aircraft, "Aircraft retrieved successfully (created by another process)", 200, False
                    else:
                        logger.error(f"Race condition recovery failed for aircraft {tail_number}")
                        return None, f"Failed to create or retrieve aircraft {tail_number} after race condition", 500, False
                else:
                    logger.error(f"Error creating aircraft {tail_number}: {create_error}")
                    return None, f"Error creating aircraft: {str(create_error)}", 500, False
                    
        except Exception as e:
            logger.error(f"Error in get_or_create_aircraft for {tail_number}: {e}")
            return None, f"Error processing aircraft: {str(e)}", 500, False

    @staticmethod
    def get_aircraft_by_tail(tail_number: str) -> Tuple[Optional[Aircraft], str, int]:
        try:
            aircraft = Aircraft.query.get(tail_number)
            if not aircraft:
                return None, f"Aircraft with tail number {tail_number} not found", 404
            return aircraft, "Aircraft retrieved successfully", 200
        except Exception as e:
            return None, f"Error retrieving aircraft: {str(e)}", 500

    @staticmethod
    def get_all_aircraft(filters: Optional[Dict[str, Any]] = None) -> Tuple[List[Aircraft], str, int]:
        query = Aircraft.query
        if filters and 'customer_id' in filters:
            query = query.filter_by(customer_id=filters['customer_id'])
        try:
            aircraft_list = query.order_by(Aircraft.tail_number.asc()).all()
            return aircraft_list, "Aircraft list retrieved successfully", 200
        except Exception as e:
            return [], f"Error retrieving aircraft: {str(e)}", 500

    @staticmethod
    def update_aircraft(tail_number: str, update_data: Dict[str, Any]) -> Tuple[Optional[Aircraft], str, int]:
        try:
            aircraft = Aircraft.query.get(tail_number)
            if not aircraft:
                return None, f"Aircraft with tail number {tail_number} not found", 404
            if 'aircraft_type' in update_data:
                aircraft.aircraft_type = update_data['aircraft_type']
            if 'fuel_type' in update_data:
                aircraft.fuel_type = update_data['fuel_type']
            if 'customer_id' in update_data:
                aircraft.customer_id = update_data['customer_id']
            db.session.commit()
            return aircraft, "Aircraft updated successfully", 200
        except Exception as e:
            db.session.rollback()
            return None, f"Error updating aircraft: {str(e)}", 500

    @staticmethod
    def delete_aircraft(tail_number: str) -> Tuple[bool, str, int]:
        try:
            aircraft = Aircraft.query.get(tail_number)
            if not aircraft:
                return False, f"Aircraft with tail number {tail_number} not found", 404
            
            # Check for associated fuel orders
            if aircraft.fuel_orders.first():
                return False, "Cannot delete aircraft with existing fuel orders. Please reassign or delete them first.", 409

            db.session.delete(aircraft)
            db.session.commit()
            return True, "Aircraft deleted successfully", 200
        except Exception as e:
            db.session.rollback()
            return False, f"Error deleting aircraft: {str(e)}", 500
