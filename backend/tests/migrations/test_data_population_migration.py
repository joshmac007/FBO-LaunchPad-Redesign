"""
Test for the data population migration that validates the "most recently updated" rule
for aircraft type classification assignments.

This test ensures that when multiple legacy mappings exist for the same aircraft type,
the migration correctly selects the mapping with the most recent updated_at timestamp.
"""

import pytest
from datetime import datetime, timedelta
from decimal import Decimal
import sqlalchemy as sa
from sqlalchemy import create_engine, MetaData, Table, Column, Integer, String, DateTime, Numeric, ForeignKey, Boolean
from sqlalchemy.orm import sessionmaker
from alembic import command
from alembic.config import Config
from alembic.script import ScriptDirectory
from alembic.runtime.migration import MigrationContext
from alembic.runtime.environment import EnvironmentContext
import tempfile
import os


class TestDataPopulationMigration:
    """Test the data population migration logic"""
    
    def setup_method(self):
        """Set up an in-memory SQLite database for testing"""
        self.engine = create_engine("sqlite:///:memory:")
        self.metadata = MetaData()
        self.Session = sessionmaker(bind=self.engine)
        
        # Define the tables as they would exist after the schema migration but before data population
        self.aircraft_classifications = Table(
            'aircraft_classifications', self.metadata,
            Column('id', Integer, primary_key=True),
            Column('name', String(100), nullable=False),
            # Note: fbo_location_id was removed in the schema migration
            Column('created_at', DateTime, nullable=False),
            Column('updated_at', DateTime, nullable=False)
        )
        
        self.aircraft_types = Table(
            'aircraft_types', self.metadata,
            Column('id', Integer, primary_key=True),
            Column('name', String(100), nullable=False),
            Column('base_min_fuel_gallons_for_waiver', Numeric(10, 2), nullable=False),
            Column('classification_id', Integer, nullable=True),  # Will be populated by migration
            Column('default_max_gross_weight_lbs', Numeric(10, 2), nullable=True),
            Column('created_at', DateTime, nullable=False),
            Column('updated_at', DateTime, nullable=False)
        )
        
        self.aircraft_classification_mappings = Table(
            'aircraft_classification_mappings', self.metadata,
            Column('id', Integer, primary_key=True),
            Column('aircraft_type_id', Integer, ForeignKey('aircraft_types.id'), nullable=False),
            Column('classification_id', Integer, ForeignKey('aircraft_classifications.id'), nullable=False),
            Column('fbo_location_id', Integer, nullable=False),
            Column('created_at', DateTime, nullable=False),
            Column('updated_at', DateTime, nullable=False)
        )
        
        # Create all tables
        self.metadata.create_all(self.engine)
    
    def teardown_method(self):
        """Clean up after each test"""
        self.metadata.drop_all(self.engine)
        self.engine.dispose()
    
    def test_migration_selects_most_recent_mapping(self):
        """
        Test that the migration correctly selects the mapping with the most recent updated_at timestamp
        when multiple conflicting legacy mappings exist for the same aircraft type.
        """
        # Arrange: Set up test data
        session = self.Session()
        
        # Create test timestamps (3 different times)
        base_time = datetime(2025, 1, 1, 12, 0, 0)
        old_time = base_time - timedelta(hours=2)
        middle_time = base_time - timedelta(hours=1)
        recent_time = base_time  # Most recent
        
        try:
            # Create test aircraft classifications (now global, no fbo_location_id)
            piston_classification = {
                'id': 1,
                'name': 'Piston',
                'created_at': old_time,
                'updated_at': old_time
            }
            
            light_jet_classification = {
                'id': 2,
                'name': 'Light Jet',
                'created_at': old_time,
                'updated_at': old_time
            }
            
            heavy_jet_classification = {
                'id': 3,
                'name': 'Heavy Jet',
                'created_at': old_time,
                'updated_at': old_time
            }
            
            session.execute(self.aircraft_classifications.insert().values([
                piston_classification,
                light_jet_classification,
                heavy_jet_classification
            ]))
            
            # Create test aircraft type
            aircraft_type = {
                'id': 1,
                'name': 'Test Cessna 172',
                'base_min_fuel_gallons_for_waiver': Decimal('50.00'),
                'classification_id': None,  # Will be populated by migration
                'created_at': old_time,
                'updated_at': old_time
            }
            
            session.execute(self.aircraft_types.insert().values(aircraft_type))
            
            # Create multiple conflicting legacy mappings with different updated_at timestamps
            # The migration should pick the one with the most recent timestamp (Heavy Jet)
            legacy_mappings = [
                {
                    'id': 1,
                    'aircraft_type_id': 1,
                    'classification_id': 1,  # Piston - oldest
                    'fbo_location_id': 1,
                    'created_at': old_time,
                    'updated_at': old_time
                },
                {
                    'id': 2,
                    'aircraft_type_id': 1,
                    'classification_id': 2,  # Light Jet - middle
                    'fbo_location_id': 1,
                    'created_at': middle_time,
                    'updated_at': middle_time
                },
                {
                    'id': 3,
                    'aircraft_type_id': 1,
                    'classification_id': 3,  # Heavy Jet - most recent (should be selected)
                    'fbo_location_id': 1,
                    'created_at': recent_time,
                    'updated_at': recent_time
                }
            ]
            
            session.execute(self.aircraft_classification_mappings.insert().values(legacy_mappings))
            session.commit()
            
            # Act: Run the migration logic manually
            self._run_migration_upgrade_logic()
            
            # Assert: Verify the aircraft type was assigned the correct classification
            result = session.execute(
                sa.text("SELECT classification_id FROM aircraft_types WHERE id = 1")
            ).scalar_one()
            
            # The aircraft type should be assigned to Heavy Jet (id=3) since it had the most recent updated_at
            assert result == 3, f"Expected classification_id=3 (Heavy Jet), but got {result}"
            
            # Verify the classification was assigned correctly by name
            classification_name = session.execute(
                sa.text("""
                    SELECT ac.name 
                    FROM aircraft_types at 
                    JOIN aircraft_classifications ac ON at.classification_id = ac.id 
                    WHERE at.id = 1
                """)
            ).scalar_one()
            
            assert classification_name == 'Heavy Jet', f"Expected 'Heavy Jet', but got '{classification_name}'"
            
        finally:
            session.close()
    
    def test_migration_handles_aircraft_with_no_mappings(self):
        """
        Test that aircraft types with no legacy mappings are assigned to 'Unclassified'
        """
        # Arrange: Set up test data
        session = self.Session()
        base_time = datetime(2025, 1, 1, 12, 0, 0)
        
        try:
            # Create an aircraft type with no mappings
            aircraft_type = {
                'id': 1,
                'name': 'Test Orphan Aircraft',
                'base_min_fuel_gallons_for_waiver': Decimal('100.00'),
                'classification_id': None,
                'created_at': base_time,
                'updated_at': base_time
            }
            
            session.execute(self.aircraft_types.insert().values(aircraft_type))
            session.commit()
            
            # Act: Run the migration logic manually
            self._run_migration_upgrade_logic()
            
            # Assert: Verify the aircraft type was assigned to 'Unclassified'
            classification_name = session.execute(
                sa.text("""
                    SELECT ac.name 
                    FROM aircraft_types at 
                    JOIN aircraft_classifications ac ON at.classification_id = ac.id 
                    WHERE at.id = 1
                """)
            ).scalar_one()
            
            assert classification_name == 'Unclassified', f"Expected 'Unclassified', but got '{classification_name}'"
            
        finally:
            session.close()
    
    def _run_migration_upgrade_logic(self):
        """
        Manually run the upgrade logic from the data population migration.
        
        This simulates the key logic from 888aa11223bc_populate_aircraft_classifications_and_.py
        that assigns aircraft types to classifications based on their most recent legacy mappings.
        """
        conn = self.engine.connect()
        trans = conn.begin()
        
        try:
            # Step 1: Get the mapping from existing classification names to their IDs
            classifications_map_result = conn.execute(sa.text("SELECT id, name FROM aircraft_classifications"))
            classifications_map = {name: id for id, name in classifications_map_result}
            
            # Step 2: Find the correct classification_id for each aircraft type based on the most recent mapping
            # This is the core logic we're testing - the "most recently updated" rule
            migration_query = sa.text("""
                WITH ranked_mappings AS (
                    SELECT
                        acm.aircraft_type_id,
                        ac.name AS classification_name,
                        ROW_NUMBER() OVER(PARTITION BY acm.aircraft_type_id ORDER BY acm.updated_at DESC) as rn
                    FROM aircraft_classification_mappings acm
                    JOIN aircraft_classifications ac ON acm.classification_id = ac.id
                )
                SELECT aircraft_type_id, classification_name FROM ranked_mappings WHERE rn = 1
            """)
            
            # Execute the update for all aircraft types that have legacy mappings
            for aircraft_type_id, classification_name in conn.execute(migration_query):
                new_classification_id = classifications_map.get(classification_name)
                if new_classification_id:
                    conn.execute(sa.text("UPDATE aircraft_types SET classification_id = :class_id WHERE id = :ac_id").bindparams(class_id=new_classification_id, ac_id=aircraft_type_id))

            # Step 3: Handle edge case - ensure 'Unclassified' exists
            if 'Unclassified' not in classifications_map:
                conn.execute(sa.text("""
                    INSERT INTO aircraft_classifications (name, created_at, updated_at) 
                    VALUES ('Unclassified', datetime('now'), datetime('now'))
                """))
                unclassified_id = conn.execute(sa.text("SELECT id FROM aircraft_classifications WHERE name = 'Unclassified'")).scalar_one()
                classifications_map['Unclassified'] = unclassified_id
            
            # Step 4: Update aircraft types with no mappings to 'Unclassified'
            unclassified_id = classifications_map['Unclassified']
            conn.execute(sa.text("UPDATE aircraft_types SET classification_id = :unclassified_id WHERE classification_id IS NULL").bindparams(unclassified_id=unclassified_id))
            
            trans.commit()
            
        except Exception:
            trans.rollback()
            raise
        finally:
            conn.close()
    
    def test_migration_with_multiple_aircraft_types(self):
        """
        Test the migration logic with multiple aircraft types having different mapping scenarios
        """
        # Arrange: Set up test data
        session = self.Session()
        base_time = datetime(2025, 1, 1, 12, 0, 0)
        
        try:
            # Create test classifications (now global, no fbo_location_id)
            classifications = [
                {'id': 1, 'name': 'Piston', 'created_at': base_time, 'updated_at': base_time},
                {'id': 2, 'name': 'Turboprop', 'created_at': base_time, 'updated_at': base_time},
                {'id': 3, 'name': 'Light Jet', 'created_at': base_time, 'updated_at': base_time}
            ]
            session.execute(self.aircraft_classifications.insert().values(classifications))
            
            # Create multiple aircraft types
            aircraft_types = [
                {'id': 1, 'name': 'Cessna 172', 'base_min_fuel_gallons_for_waiver': Decimal('50.00'), 'classification_id': None, 'created_at': base_time, 'updated_at': base_time},
                {'id': 2, 'name': 'King Air 350', 'base_min_fuel_gallons_for_waiver': Decimal('200.00'), 'classification_id': None, 'created_at': base_time, 'updated_at': base_time},
                {'id': 3, 'name': 'Orphan Aircraft', 'base_min_fuel_gallons_for_waiver': Decimal('100.00'), 'classification_id': None, 'created_at': base_time, 'updated_at': base_time}
            ]
            session.execute(self.aircraft_types.insert().values(aircraft_types))
            
            # Create mappings: 
            # - Cessna 172: Piston (most recent) vs Turboprop (older)
            # - King Air 350: Turboprop (only mapping)
            # - Orphan Aircraft: no mappings (should get Unclassified)
            mappings = [
                # Cessna 172 mappings (should pick Piston as it's more recent)
                {'id': 1, 'aircraft_type_id': 1, 'classification_id': 2, 'fbo_location_id': 1, 'created_at': base_time - timedelta(hours=2), 'updated_at': base_time - timedelta(hours=2)},  # Turboprop - older
                {'id': 2, 'aircraft_type_id': 1, 'classification_id': 1, 'fbo_location_id': 1, 'created_at': base_time - timedelta(hours=1), 'updated_at': base_time - timedelta(hours=1)},  # Piston - more recent
                
                # King Air 350 mapping (only one, should be selected)
                {'id': 3, 'aircraft_type_id': 2, 'classification_id': 2, 'fbo_location_id': 1, 'created_at': base_time, 'updated_at': base_time}  # Turboprop
            ]
            session.execute(self.aircraft_classification_mappings.insert().values(mappings))
            session.commit()
            
            # Act: Run the migration logic
            self._run_migration_upgrade_logic()
            
            # Assert: Verify all aircraft types were assigned correctly
            results = session.execute(sa.text("""
                SELECT at.name, ac.name as classification_name
                FROM aircraft_types at
                JOIN aircraft_classifications ac ON at.classification_id = ac.id
                ORDER BY at.id
            """)).fetchall()
            
            expected_results = [
                ('Cessna 172', 'Piston'),      # Should pick the more recent mapping
                ('King Air 350', 'Turboprop'),  # Should pick the only mapping  
                ('Orphan Aircraft', 'Unclassified')  # Should get default classification
            ]
            
            assert len(results) == 3, f"Expected 3 results, got {len(results)}"
            
            for i, (expected_name, expected_classification) in enumerate(expected_results):
                actual_name, actual_classification = results[i]
                assert actual_name == expected_name, f"Expected aircraft '{expected_name}', got '{actual_name}'"
                assert actual_classification == expected_classification, f"Expected '{expected_name}' to have classification '{expected_classification}', got '{actual_classification}'"
                
        finally:
            session.close()