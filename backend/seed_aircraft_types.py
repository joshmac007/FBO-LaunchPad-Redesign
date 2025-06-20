#!/usr/bin/env python3
"""
Seed basic aircraft types that the system expects.
This addresses the missing aircraft types that are causing E2E tests to fail.
"""

from src.app import create_app
from src.models.aircraft_type import AircraftType
from src.extensions import db

def seed_aircraft_types():
    """Seed basic aircraft types into the database."""
    app = create_app()
    
    with app.app_context():
        # Define basic aircraft types that tests expect
        aircraft_types_data = [
            {'name': 'Citation CJ3', 'base_min_fuel_gallons_for_waiver': 200.0},
            {'name': 'Piston Single', 'base_min_fuel_gallons_for_waiver': 20.0},
            {'name': 'Gulfstream G650', 'base_min_fuel_gallons_for_waiver': 600.0},
            {'name': 'King Air 350', 'base_min_fuel_gallons_for_waiver': 100.0},
            {'name': 'Cessna 172', 'base_min_fuel_gallons_for_waiver': 20.0},
            {'name': 'Boeing 737', 'base_min_fuel_gallons_for_waiver': 2000.0},
            {'name': 'Embraer Phenom 300', 'base_min_fuel_gallons_for_waiver': 275.0},
        ]
        
        created_count = 0
        for aircraft_data in aircraft_types_data:
            # Check if aircraft type already exists
            existing = AircraftType.query.filter_by(name=aircraft_data['name']).first()
            if not existing:
                aircraft_type = AircraftType(
                    name=aircraft_data['name'],
                    base_min_fuel_gallons_for_waiver=aircraft_data['base_min_fuel_gallons_for_waiver']
                )
                db.session.add(aircraft_type)
                created_count += 1
                print(f"Created aircraft type: {aircraft_data['name']}")
            else:
                print(f"Aircraft type already exists: {aircraft_data['name']}")
        
        if created_count > 0:
            db.session.commit()
            print(f"\nSuccessfully seeded {created_count} aircraft types.")
        else:
            print("\nNo new aircraft types needed to be created.")
        
        # Verify final count
        total_count = AircraftType.query.count()
        print(f"Total aircraft types in database: {total_count}")

if __name__ == '__main__':
    seed_aircraft_types() 