from typing import Tuple, List, Optional, Dict, Any

from ..models.fuel_truck import FuelTruck
from ..app import db

class FuelTruckService:
    """Service class for managing fuel truck operations."""

    @classmethod
    def get_trucks(cls, filters: Optional[Dict[str, Any]] = None) -> Tuple[Optional[List[FuelTruck]], str, int]:
        # ... (existing code unchanged)
        query = FuelTruck.query
        if filters:
            is_active_filter = filters.get('is_active')
            if is_active_filter is not None:
                is_active_bool = is_active_filter.lower() == 'true'
                query = query.filter(FuelTruck.is_active == is_active_bool)
        try:
            trucks = query.order_by(FuelTruck.truck_number.asc()).all()
            # --- Add Debugging ---
            from flask import current_app
            current_app.logger.info(f"DEBUG: FuelTruckService.get_trucks found {len(trucks)} trucks: {trucks}")
            # --- End Debugging ---
            return trucks, "Fuel trucks retrieved successfully", 200
        except Exception as e:
            return None, f"Database error while retrieving fuel trucks: {str(e)}", 500

    @classmethod
    def create_truck(cls, truck_data: Dict[str, Any]) -> Tuple[Optional[FuelTruck], str, int]:
        # ... (existing code unchanged)
        existing_truck = FuelTruck.query.filter_by(truck_number=truck_data['truck_number']).first()
        if existing_truck:
            return None, f"Truck number {truck_data['truck_number']} already exists", 400
        try:
            new_truck = FuelTruck(
                truck_number=truck_data['truck_number'],
                fuel_type=truck_data['fuel_type'],
                capacity=truck_data['capacity'],
                current_meter_reading=truck_data.get('current_meter_reading', 0),
                is_active=True
            )
            db.session.add(new_truck)
            db.session.commit()
            return new_truck, "Fuel truck created successfully", 201
        except Exception as e:
            db.session.rollback()
            return None, f"Database error while creating fuel truck: {str(e)}", 500

    @classmethod
    def get_truck_by_id(cls, truck_id: int) -> Tuple[Optional[FuelTruck], str, int]:
        """Get a fuel truck by its ID."""
        try:
            truck = FuelTruck.query.get(truck_id)
            if not truck:
                return None, f"Fuel truck with ID {truck_id} not found", 404
            return truck, "Fuel truck retrieved successfully", 200
        except Exception as e:
            return None, f"Database error while retrieving fuel truck: {str(e)}", 500

    @classmethod
    def update_truck(cls, truck_id: int, update_data: Dict[str, Any]) -> Tuple[Optional[FuelTruck], str, int]:
        """Update a fuel truck."""
        try:
            truck = FuelTruck.query.get(truck_id)
            if not truck:
                return None, f"Fuel truck with ID {truck_id} not found", 404
            # Update fields if provided
            if 'truck_number' in update_data:
                # Check for uniqueness
                existing = FuelTruck.query.filter_by(truck_number=update_data['truck_number']).first()
                if existing and existing.id != truck_id:
                    return None, f"Truck number {update_data['truck_number']} already exists", 400
                truck.truck_number = update_data['truck_number']
            if 'fuel_type' in update_data:
                truck.fuel_type = update_data['fuel_type']
            if 'capacity' in update_data:
                truck.capacity = update_data['capacity']
            if 'current_meter_reading' in update_data:
                truck.current_meter_reading = update_data['current_meter_reading']
            if 'is_active' in update_data:
                truck.is_active = bool(update_data['is_active'])
            db.session.commit()
            return truck, "Fuel truck updated successfully", 200
        except Exception as e:
            db.session.rollback()
            return None, f"Database error while updating fuel truck: {str(e)}", 500

    @classmethod
    def delete_truck(cls, truck_id: int) -> Tuple[bool, str, int]:
        """Delete a fuel truck by ID."""
        try:
            truck = FuelTruck.query.get(truck_id)
            if not truck:
                return False, f"Fuel truck with ID {truck_id} not found", 404
            db.session.delete(truck)
            db.session.commit()
            return True, "Fuel truck deleted successfully", 200
        except Exception as e:
            db.session.rollback()
            return False, f"Database error while deleting fuel truck: {str(e)}", 500