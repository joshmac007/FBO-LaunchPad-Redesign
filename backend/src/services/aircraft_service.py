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
                fuel_type=data['fuel_type']
            )
            db.session.add(aircraft)
            db.session.commit()
            return aircraft, "Aircraft created successfully", 201
        except Exception as e:
            db.session.rollback()
            return None, f"Error creating aircraft: {str(e)}", 500

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
            db.session.delete(aircraft)
            db.session.commit()
            return True, "Aircraft deleted successfully", 200
        except Exception as e:
            db.session.rollback()
            return False, f"Error deleting aircraft: {str(e)}", 500
