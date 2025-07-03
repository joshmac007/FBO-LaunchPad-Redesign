from typing import Tuple, List, Optional, Dict, Any
from ..models.aircraft import Aircraft
from ..models.aircraft_type import AircraftType
from ..models.fuel_type import FuelType
from ..app import db

class AircraftService:
    @staticmethod
    def _get_fuel_type_id(fuel_type_name: str) -> Optional[int]:
        """
        Helper method to get fuel type ID from fuel type name.
        
        Args:
            fuel_type_name: String name of the fuel type (e.g., "Jet A", "100LL")
            
        Returns:
            Integer fuel type ID if found, None if not found
        """
        # First try exact match
        fuel_type = FuelType.query.filter_by(name=fuel_type_name.strip(), is_active=True).first()
        if fuel_type:
            return fuel_type.id
            
        # Try case-insensitive match
        fuel_type = FuelType.query.filter(
            db.func.lower(FuelType.name) == fuel_type_name.strip().lower(),
            FuelType.is_active == True
        ).first()
        if fuel_type:
            return fuel_type.id
            
        # Try mapping common variations
        fuel_type_mappings = {
            'jet a': 'Jet A',
            'jet-a': 'Jet A',
            'jet_a': 'Jet A',
            'jeta': 'Jet A',
            '100ll': '100LL',
            'avgas': '100LL',
            'avgas 100ll': '100LL',
            'saf': 'SAF',
            'sustainable aviation fuel': 'SAF'
        }
        
        normalized_name = fuel_type_name.strip().lower()
        if normalized_name in fuel_type_mappings:
            mapped_name = fuel_type_mappings[normalized_name]
            fuel_type = FuelType.query.filter_by(name=mapped_name, is_active=True).first()
            if fuel_type:
                return fuel_type.id
                
        return None

    @staticmethod
    def create_aircraft(data: Dict[str, Any]) -> Tuple[Optional[Aircraft], str, int]:
        if 'tail_number' not in data:
            return None, "Missing required field: tail_number", 400
        if 'aircraft_type' not in data:
            return None, "Missing required field: aircraft_type", 400
        if 'fuel_type' not in data:
            return None, "Missing required field: fuel_type", 400
            
        # Convert fuel_type string to fuel_type_id
        fuel_type_id = AircraftService._get_fuel_type_id(data['fuel_type'])
        if fuel_type_id is None:
            return None, f"Invalid fuel type: {data['fuel_type']}. Please use a valid fuel type.", 400
            
        if Aircraft.query.filter_by(tail_number=data['tail_number']).first():
            return None, "Aircraft with this tail number already exists", 409
        try:
            aircraft = Aircraft(
                tail_number=data['tail_number'],
                aircraft_type=data['aircraft_type'],
                fuel_type_id=fuel_type_id,
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
            
            # Convert fuel_type string to fuel_type_id
            fuel_type_id = AircraftService._get_fuel_type_id(data['fuel_type'].strip())
            if fuel_type_id is None:
                return None, f"Invalid fuel type: {data['fuel_type']}. Please use a valid fuel type.", 400, False
            
            logger.info(f"Creating new aircraft: {tail_number}")
            
            # Use a transaction to handle potential race conditions
            try:
                aircraft = Aircraft(
                    tail_number=tail_number,
                    aircraft_type=data['aircraft_type'].strip(),
                    fuel_type_id=fuel_type_id,
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
                fuel_type_id = AircraftService._get_fuel_type_id(update_data['fuel_type'])
                if fuel_type_id is None:
                    return None, f"Invalid fuel type: {update_data['fuel_type']}. Please use a valid fuel type.", 400
                aircraft.fuel_type_id = fuel_type_id
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

    @staticmethod
    def create_aircraft_type(data: Dict[str, Any]) -> Tuple[Optional[AircraftType], str, int]:
        """Create a new aircraft type."""
        try:
            # Verify if aircraft type with same name already exists
            existing_type = AircraftType.query.filter_by(name=data['name']).first()
            if existing_type:
                return None, f"Aircraft type with name '{data['name']}' already exists", 409
            
            # Validate required fields
            if 'classification_id' not in data:
                return None, "Missing required field: classification_id", 400
            
            # Create new aircraft type
            aircraft_type = AircraftType(
                name=data['name'],
                base_min_fuel_gallons_for_waiver=data['base_min_fuel_gallons_for_waiver'],
                classification_id=data['classification_id']
            )
            db.session.add(aircraft_type)
            db.session.commit()
            return aircraft_type, "Aircraft type created successfully", 201
        except Exception as e:
            db.session.rollback()
            return None, f"Error creating aircraft type: {str(e)}", 500

    @staticmethod
    def update_aircraft_type(type_id: int, data: Dict[str, Any]) -> Tuple[Optional[AircraftType], str, int]:
        """Update an existing aircraft type."""
        try:
            # Fetch the aircraft type
            aircraft_type = AircraftType.query.get(type_id)
            if not aircraft_type:
                return None, f"Aircraft type with ID {type_id} not found", 404
            
            # Check if name is being updated and if it conflicts
            if 'name' in data and data['name'] != aircraft_type.name:
                existing_type = AircraftType.query.filter_by(name=data['name']).first()
                if existing_type:
                    return None, f"Aircraft type with name '{data['name']}' already exists", 409
            
            # Update fields if provided
            if 'name' in data:
                aircraft_type.name = data['name']
            if 'base_min_fuel_gallons_for_waiver' in data:
                aircraft_type.base_min_fuel_gallons_for_waiver = data['base_min_fuel_gallons_for_waiver']
            if 'classification_id' in data:
                aircraft_type.classification_id = data['classification_id']
            
            db.session.commit()
            return aircraft_type, "Aircraft type updated successfully", 200
        except Exception as e:
            db.session.rollback()
            return None, f"Error updating aircraft type: {str(e)}", 500

    @staticmethod
    def delete_aircraft_type(type_id: int) -> Tuple[bool, str, int]:
        """Delete an aircraft type."""
        try:
            # Fetch the aircraft type
            aircraft_type = AircraftType.query.get(type_id)
            if not aircraft_type:
                return False, f"Aircraft type with ID {type_id} not found", 404
            
            # Check if the type is used in any aircraft instances
            aircraft_using_type = Aircraft.query.filter_by(aircraft_type=aircraft_type.name).first()
            if aircraft_using_type:
                return False, f"Cannot delete aircraft type '{aircraft_type.name}' because it is being used by aircraft instance '{aircraft_using_type.tail_number}'. Please update or delete the aircraft instances first.", 409
            
            # Delete the aircraft type
            db.session.delete(aircraft_type)
            db.session.commit()
            return True, "Aircraft type deleted successfully", 200
        except Exception as e:
            db.session.rollback()
            return False, f"Error deleting aircraft type: {str(e)}", 500
