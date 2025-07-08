"""
Unit tests for AdminFeeConfigService.

This module contains comprehensive tests for the AdminFeeConfigService,
focusing on the new diff-and-apply restore functionality.
"""

import pytest
from unittest.mock import Mock, patch

from src.services.admin_fee_config_service import AdminFeeConfigService


class TestAdminFeeConfigService:
    """Test suite for AdminFeeConfigService."""
    
    def test_diff_configurations_no_changes(self):
        """Test diff when current and backup configurations are identical."""
        # Given: Identical current and backup configurations
        current_data = {
            'classifications': [
                {'id': 1, 'name': 'Light Jet', 'created_at': '2024-01-01', 'updated_at': '2024-01-01'}
            ],
            'aircraft_types': [
                {'id': 1, 'name': 'Citation', 'classification_id': 1, 'created_at': '2024-01-01', 'updated_at': '2024-01-01'}
            ],
            'fee_rules': [],
            'overrides': [],
            'waiver_tiers': [],
            'aircraft_type_configs': []
        }
        backup_data = current_data.copy()
        
        # When: Calling diff_configurations
        changeset = AdminFeeConfigService._diff_configurations(current_data, backup_data)
        
        # Then: No changes should be detected
        assert len(changeset['classifications']['create']) == 0
        assert len(changeset['classifications']['update']) == 0
        assert len(changeset['classifications']['delete']) == 0
        assert len(changeset['aircraft_types']['create']) == 0
        assert len(changeset['aircraft_types']['update']) == 0
        assert len(changeset['aircraft_types']['delete']) == 0
    
    def test_diff_configurations_create_operations(self):
        """Test diff when backup has new items that need to be created."""
        # Given: Current data is empty, backup has items
        current_data = {
            'classifications': [],
            'aircraft_types': [],
            'fee_rules': [],
            'overrides': [],
            'waiver_tiers': [],
            'aircraft_type_configs': []
        }
        backup_data = {
            'classifications': [
                {'id': 1, 'name': 'Light Jet', 'created_at': '2024-01-01', 'updated_at': '2024-01-01'}
            ],
            'aircraft_types': [
                {'id': 1, 'name': 'Citation', 'classification_id': 1, 'created_at': '2024-01-01', 'updated_at': '2024-01-01'}
            ],
            'fee_rules': [
                {'id': 1, 'fee_code': 'RAMP', 'fee_name': 'Ramp Fee', 'amount': 75.0, 'created_at': '2024-01-01', 'updated_at': '2024-01-01'}
            ],
            'overrides': [],
            'waiver_tiers': [],
            'aircraft_type_configs': []
        }
        
        # When: Calling diff_configurations
        changeset = AdminFeeConfigService._diff_configurations(current_data, backup_data)
        
        # Then: Items should be marked for creation
        assert len(changeset['classifications']['create']) == 1
        assert changeset['classifications']['create'][0]['name'] == 'Light Jet'
        assert len(changeset['aircraft_types']['create']) == 1
        assert changeset['aircraft_types']['create'][0]['name'] == 'Citation'
        assert len(changeset['fee_rules']['create']) == 1
        assert changeset['fee_rules']['create'][0]['fee_code'] == 'RAMP'
    
    def test_diff_configurations_delete_operations(self):
        """Test diff when current has items that are not in backup (should be deleted)."""
        # Given: Current data has items, backup is empty
        current_data = {
            'classifications': [
                {'id': 1, 'name': 'Light Jet', 'created_at': '2024-01-01', 'updated_at': '2024-01-01'},
                {'id': 2, 'name': 'Medium Jet', 'created_at': '2024-01-01', 'updated_at': '2024-01-01'}
            ],
            'aircraft_types': [
                {'id': 1, 'name': 'Citation', 'classification_id': 1, 'created_at': '2024-01-01', 'updated_at': '2024-01-01'}
            ],
            'fee_rules': [],
            'overrides': [],
            'waiver_tiers': [],
            'aircraft_type_configs': []
        }
        backup_data = {
            'classifications': [],
            'aircraft_types': [],
            'fee_rules': [],
            'overrides': [],
            'waiver_tiers': [],
            'aircraft_type_configs': []
        }
        
        # When: Calling diff_configurations
        changeset = AdminFeeConfigService._diff_configurations(current_data, backup_data)
        
        # Then: Items should be marked for deletion
        assert len(changeset['classifications']['delete']) == 2
        assert 1 in changeset['classifications']['delete']
        assert 2 in changeset['classifications']['delete']
        assert len(changeset['aircraft_types']['delete']) == 1
        assert 1 in changeset['aircraft_types']['delete']
    
    def test_diff_configurations_update_operations(self):
        """Test diff when items exist in both but have different values."""
        # Given: Current and backup data with same IDs but different values
        current_data = {
            'classifications': [
                {'id': 1, 'name': 'Light Jet', 'created_at': '2024-01-01', 'updated_at': '2024-01-01'}
            ],
            'aircraft_types': [
                {'id': 1, 'name': 'Citation CJ2', 'classification_id': 1, 'base_min_fuel_gallons_for_waiver': 200.0, 'created_at': '2024-01-01', 'updated_at': '2024-01-01'}
            ],
            'fee_rules': [],
            'overrides': [],
            'waiver_tiers': [],
            'aircraft_type_configs': []
        }
        backup_data = {
            'classifications': [
                {'id': 1, 'name': 'Light Business Jet', 'created_at': '2024-01-01', 'updated_at': '2024-01-02'}  # Name changed
            ],
            'aircraft_types': [
                {'id': 1, 'name': 'Citation CJ3', 'classification_id': 1, 'base_min_fuel_gallons_for_waiver': 250.0, 'created_at': '2024-01-01', 'updated_at': '2024-01-02'}  # Name and fuel gallons changed
            ],
            'fee_rules': [],
            'overrides': [],
            'waiver_tiers': [],
            'aircraft_type_configs': []
        }
        
        # When: Calling diff_configurations
        changeset = AdminFeeConfigService._diff_configurations(current_data, backup_data)
        
        # Then: Items should be marked for update
        assert len(changeset['classifications']['update']) == 1
        assert changeset['classifications']['update'][0]['name'] == 'Light Business Jet'
        assert len(changeset['aircraft_types']['update']) == 1
        assert changeset['aircraft_types']['update'][0]['name'] == 'Citation CJ3'
        assert changeset['aircraft_types']['update'][0]['base_min_fuel_gallons_for_waiver'] == 250.0
    
    def test_diff_configurations_ignores_timestamps(self):
        """Test that diff ignores created_at and updated_at timestamps when comparing."""
        # Given: Same data but different timestamps
        current_data = {
            'classifications': [
                {'id': 1, 'name': 'Light Jet', 'created_at': '2024-01-01T10:00:00', 'updated_at': '2024-01-01T10:00:00'}
            ],
            'aircraft_types': [],
            'fee_rules': [],
            'overrides': [],
            'waiver_tiers': [],
            'aircraft_type_configs': []
        }
        backup_data = {
            'classifications': [
                {'id': 1, 'name': 'Light Jet', 'created_at': '2024-01-01T08:00:00', 'updated_at': '2024-01-01T09:00:00'}  # Different timestamps
            ],
            'aircraft_types': [],
            'fee_rules': [],
            'overrides': [],
            'waiver_tiers': [],
            'aircraft_type_configs': []
        }
        
        # When: Calling diff_configurations
        changeset = AdminFeeConfigService._diff_configurations(current_data, backup_data)
        
        # Then: No updates should be detected (timestamps are ignored)
        assert len(changeset['classifications']['update']) == 0
        assert len(changeset['classifications']['create']) == 0
        assert len(changeset['classifications']['delete']) == 0
    
    def test_diff_configurations_complex_scenario(self):
        """Test diff with a complex scenario involving create, update, and delete operations."""
        # Given: Complex current and backup configurations
        current_data = {
            'classifications': [
                {'id': 1, 'name': 'Light Jet', 'created_at': '2024-01-01', 'updated_at': '2024-01-01'},
                {'id': 2, 'name': 'Medium Jet', 'created_at': '2024-01-01', 'updated_at': '2024-01-01'},
                {'id': 3, 'name': 'Heavy Jet', 'created_at': '2024-01-01', 'updated_at': '2024-01-01'}  # Will be deleted
            ],
            'aircraft_types': [
                {'id': 1, 'name': 'Citation CJ2', 'classification_id': 1, 'created_at': '2024-01-01', 'updated_at': '2024-01-01'}  # Will be updated
            ],
            'fee_rules': [],
            'overrides': [],
            'waiver_tiers': [],
            'aircraft_type_configs': []
        }
        backup_data = {
            'classifications': [
                {'id': 1, 'name': 'Light Jet', 'created_at': '2024-01-01', 'updated_at': '2024-01-01'},  # Unchanged
                {'id': 2, 'name': 'Medium Business Jet', 'created_at': '2024-01-01', 'updated_at': '2024-01-02'},  # Updated name
                {'id': 4, 'name': 'Super Heavy Jet', 'created_at': '2024-01-01', 'updated_at': '2024-01-01'}  # New item
            ],
            'aircraft_types': [
                {'id': 1, 'name': 'Citation CJ3', 'classification_id': 1, 'created_at': '2024-01-01', 'updated_at': '2024-01-02'},  # Updated name
                {'id': 2, 'name': 'Boeing 737', 'classification_id': 2, 'created_at': '2024-01-01', 'updated_at': '2024-01-01'}  # New item
            ],
            'fee_rules': [],
            'overrides': [],
            'waiver_tiers': [],
            'aircraft_type_configs': []
        }
        
        # When: Calling diff_configurations
        changeset = AdminFeeConfigService._diff_configurations(current_data, backup_data)
        
        # Then: Verify all operation types are detected correctly
        # Classifications: 1 create, 1 update, 1 delete
        assert len(changeset['classifications']['create']) == 1
        assert changeset['classifications']['create'][0]['id'] == 4
        assert len(changeset['classifications']['update']) == 1
        assert changeset['classifications']['update'][0]['name'] == 'Medium Business Jet'
        assert len(changeset['classifications']['delete']) == 1
        assert 3 in changeset['classifications']['delete']
        
        # Aircraft types: 1 create, 1 update, 0 delete
        assert len(changeset['aircraft_types']['create']) == 1
        assert changeset['aircraft_types']['create'][0]['name'] == 'Boeing 737'
        assert len(changeset['aircraft_types']['update']) == 1
        assert changeset['aircraft_types']['update'][0]['name'] == 'Citation CJ3'
        assert len(changeset['aircraft_types']['delete']) == 0
    
    def test_diff_configurations_handles_missing_data_types(self):
        """Test diff when some data types are missing from configurations."""
        # Given: Configurations with missing data types
        current_data = {
            'classifications': [
                {'id': 1, 'name': 'Light Jet', 'created_at': '2024-01-01', 'updated_at': '2024-01-01'}
            ]
            # Missing other data types
        }
        backup_data = {
            'aircraft_types': [
                {'id': 1, 'name': 'Citation', 'classification_id': 1, 'created_at': '2024-01-01', 'updated_at': '2024-01-01'}
            ]
            # Missing other data types
        }
        
        # When: Calling diff_configurations
        changeset = AdminFeeConfigService._diff_configurations(current_data, backup_data)
        
        # Then: Should handle missing data types gracefully
        assert len(changeset['classifications']['delete']) == 1  # Classification will be deleted
        assert len(changeset['aircraft_types']['create']) == 1  # Aircraft type will be created
        assert len(changeset['fee_rules']['create']) == 0
        assert len(changeset['fee_rules']['update']) == 0
        assert len(changeset['fee_rules']['delete']) == 0
    
    @patch.object(AdminFeeConfigService, '_create_configuration_snapshot')
    @patch('src.services.admin_fee_config_service.FeeScheduleVersion')
    @patch('src.services.admin_fee_config_service.db')
    def test_restore_from_version_diff_and_apply_workflow(self, mock_db, mock_fee_schedule_version, mock_create_snapshot):
        """Test the complete restore_from_version workflow using diff-and-apply."""
        # Given: Mocked version and current configuration
        mock_version = Mock()
        mock_version.id = 1
        mock_version.version_name = 'Test Version'
        mock_version.configuration_data = {
            'classifications': [{'id': 1, 'name': 'Light Jet'}],
            'aircraft_types': [],
            'fee_rules': [],
            'overrides': [],
            'waiver_tiers': [],
            'aircraft_type_configs': []
        }
        
        mock_fee_schedule_version.query.get.return_value = mock_version
        mock_create_snapshot.return_value = {
            'classifications': [],
            'aircraft_types': [],
            'fee_rules': [],
            'overrides': [],
            'waiver_tiers': [],
            'aircraft_type_configs': []
        }
        
        # Mock database session
        mock_transaction = Mock()
        mock_db.session.begin_nested.return_value.__enter__.return_value = mock_transaction
        
        # When: Calling restore_from_version
        AdminFeeConfigService.restore_from_version(1)
        
        # Then: Verify the workflow was executed
        mock_fee_schedule_version.query.get.assert_called_once_with(1)
        mock_create_snapshot.assert_called_once()
        mock_db.session.begin_nested.assert_called_once()
        
    @patch.object(AdminFeeConfigService, '_create_configuration_snapshot')
    @patch('src.services.admin_fee_config_service.FeeScheduleVersion')
    def test_restore_from_version_handles_version_not_found(self, mock_fee_schedule_version, mock_create_snapshot):
        """Test restore_from_version handles version not found error."""
        # Given: Version that doesn't exist
        mock_fee_schedule_version.query.get.return_value = None
        
        # When & Then: Should raise ValueError
        with pytest.raises(ValueError, match="Version 999 not found"):
            AdminFeeConfigService.restore_from_version(999)
    
    def test_diff_configurations_handles_none_vs_zero(self):
        """Test that diff correctly distinguishes None vs 0 for numeric fields."""
        # Given: Current data with None, backup with 0
        current_data = {
            'fee_rules': [
                {'id': 1, 'fee_code': 'RAMP', 'caa_override_amount': None, 'created_at': '2024-01-01', 'updated_at': '2024-01-01'}
            ],
            'classifications': [], 'aircraft_types': [], 'overrides': [], 'waiver_tiers': [], 'aircraft_type_configs': []
        }
        backup_data = {
            'fee_rules': [
                {'id': 1, 'fee_code': 'RAMP', 'caa_override_amount': 0.0, 'created_at': '2024-01-01', 'updated_at': '2024-01-02'}
            ],
            'classifications': [], 'aircraft_types': [], 'overrides': [], 'waiver_tiers': [], 'aircraft_type_configs': []
        }
        
        # When: Calling diff_configurations
        changeset = AdminFeeConfigService._diff_configurations(current_data, backup_data)
        
        # Then: Should detect update (None != 0.0)
        assert len(changeset['fee_rules']['update']) == 1
        assert changeset['fee_rules']['update'][0]['caa_override_amount'] == 0.0
    
    def test_diff_configurations_handles_json_array_content(self):
        """Test that diff correctly compares JSON array contents, not references."""
        # Given: Current and backup with same array content but different order
        current_data = {
            'waiver_tiers': [
                {'id': 1, 'name': 'Standard', 'fees_waived_codes': ['RAMP', 'FUEL'], 'created_at': '2024-01-01', 'updated_at': '2024-01-01'}
            ],
            'classifications': [], 'aircraft_types': [], 'fee_rules': [], 'overrides': [], 'aircraft_type_configs': []
        }
        backup_data = {
            'waiver_tiers': [
                {'id': 1, 'name': 'Standard', 'fees_waived_codes': ['FUEL', 'RAMP'], 'created_at': '2024-01-01', 'updated_at': '2024-01-02'}
            ],
            'classifications': [], 'aircraft_types': [], 'fee_rules': [], 'overrides': [], 'aircraft_type_configs': []
        }
        
        # When: Calling diff_configurations
        changeset = AdminFeeConfigService._diff_configurations(current_data, backup_data)
        
        # Then: Should NOT detect update (array content is same, just different order)
        assert len(changeset['waiver_tiers']['update']) == 0
    
    def test_diff_configurations_handles_array_content_changes(self):
        """Test that diff correctly detects actual changes in JSON array content."""
        # Given: Current and backup with different array content
        current_data = {
            'waiver_tiers': [
                {'id': 1, 'name': 'Standard', 'fees_waived_codes': ['RAMP'], 'created_at': '2024-01-01', 'updated_at': '2024-01-01'}
            ],
            'classifications': [], 'aircraft_types': [], 'fee_rules': [], 'overrides': [], 'aircraft_type_configs': []
        }
        backup_data = {
            'waiver_tiers': [
                {'id': 1, 'name': 'Standard', 'fees_waived_codes': ['RAMP', 'FUEL'], 'created_at': '2024-01-01', 'updated_at': '2024-01-02'}
            ],
            'classifications': [], 'aircraft_types': [], 'fee_rules': [], 'overrides': [], 'aircraft_type_configs': []
        }
        
        # When: Calling diff_configurations
        changeset = AdminFeeConfigService._diff_configurations(current_data, backup_data)
        
        # Then: Should detect update (array content is different)
        assert len(changeset['waiver_tiers']['update']) == 1
        assert 'FUEL' in changeset['waiver_tiers']['update'][0]['fees_waived_codes']
    
    def test_diff_configurations_handles_float_precision(self):
        """Test that diff handles floating point precision correctly."""
        # Given: Current and backup with tiny floating point differences
        current_data = {
            'aircraft_types': [
                {'id': 1, 'name': 'Citation', 'base_min_fuel_gallons_for_waiver': 200.0000001, 'created_at': '2024-01-01', 'updated_at': '2024-01-01'}
            ],
            'classifications': [], 'fee_rules': [], 'overrides': [], 'waiver_tiers': [], 'aircraft_type_configs': []
        }
        backup_data = {
            'aircraft_types': [
                {'id': 1, 'name': 'Citation', 'base_min_fuel_gallons_for_waiver': 200.0000002, 'created_at': '2024-01-01', 'updated_at': '2024-01-02'}
            ],
            'classifications': [], 'fee_rules': [], 'overrides': [], 'waiver_tiers': [], 'aircraft_type_configs': []
        }
        
        # When: Calling diff_configurations
        changeset = AdminFeeConfigService._diff_configurations(current_data, backup_data)
        
        # Then: Should NOT detect update (difference is within precision tolerance)
        assert len(changeset['aircraft_types']['update']) == 0
    
    def test_diff_configurations_handles_significant_float_differences(self):
        """Test that diff correctly detects significant floating point differences."""
        # Given: Current and backup with significant floating point differences
        current_data = {
            'aircraft_types': [
                {'id': 1, 'name': 'Citation', 'base_min_fuel_gallons_for_waiver': 200.0, 'created_at': '2024-01-01', 'updated_at': '2024-01-01'}
            ],
            'classifications': [], 'fee_rules': [], 'overrides': [], 'waiver_tiers': [], 'aircraft_type_configs': []
        }
        backup_data = {
            'aircraft_types': [
                {'id': 1, 'name': 'Citation', 'base_min_fuel_gallons_for_waiver': 250.0, 'created_at': '2024-01-01', 'updated_at': '2024-01-02'}
            ],
            'classifications': [], 'fee_rules': [], 'overrides': [], 'waiver_tiers': [], 'aircraft_type_configs': []
        }
        
        # When: Calling diff_configurations
        changeset = AdminFeeConfigService._diff_configurations(current_data, backup_data)
        
        # Then: Should detect update (significant difference)
        assert len(changeset['aircraft_types']['update']) == 1
        assert changeset['aircraft_types']['update'][0]['base_min_fuel_gallons_for_waiver'] == 250.0