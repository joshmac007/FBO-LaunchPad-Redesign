import pytest
from datetime import datetime, timedelta
from src.services.permission_service_legacy import PermissionService
from src.models.user import User
from src.models.role import Role
from src.models.permission import Permission
from src.models.user_permission import UserPermission
# role_permissions table has been removed from the system
from src.extensions import db


class TestPermissionServiceLegacy:
    """
    Characterization tests for legacy PermissionService.
    These tests capture the current behavior of the legacy system before refactoring.
    """

    def test_get_user_effective_permissions_with_access(self, client, test_admin_user):
        """Test get_user_effective_permissions for a user who should have access."""
        # Admin user should have permissions through role assignments
        permissions = PermissionService.get_user_effective_permissions(test_admin_user.id, include_resource_context=False)
        
        # Verify admin has some permissions
        assert isinstance(permissions, dict), "Permissions should be returned as a dictionary."
        # Admin should have some basic permissions like 'admin' or 'manage_users'
        permission_names = list(permissions.keys())
        assert len(permission_names) > 0, "Admin user should have at least one permission."
        
        # Verify structure of permission data
        if permission_names:
            first_perm = permissions[permission_names[0]]
            assert 'permission' in first_perm, "Permission entry should contain 'permission' key."
            assert 'source' in first_perm, "Permission entry should contain 'source' key."

    def test_get_user_effective_permissions_no_access(self, client, test_lst_user):
        """Test get_user_effective_permissions for a user without broad permissions."""
        # Test LST (fueler) user permissions
        has_admin = PermissionService.user_has_permission(test_lst_user.id, 'admin')
        has_manage_users = PermissionService.user_has_permission(test_lst_user.id, 'manage_users')
        
        # LST should not have these broad permissions
        assert has_admin is False, "LST user should not have admin permission."
        assert has_manage_users is False, "LST user should not have manage_users permission."

    def test_get_user_effective_permissions_invalid_input(self):
        """Test get_user_effective_permissions with invalid input."""
        # Test with non-existent user
        has_perm = PermissionService.user_has_permission(99999, 'admin')
        assert has_perm is False, "Non-existent user should not have any permissions."
        
        # Test with non-existent permission
        has_perm = PermissionService.user_has_permission(1, 'non_existent_permission')
        assert has_perm is False, "Non-existent permission should return False."

    def test_user_has_permission_with_access(self, client, test_admin_user):
        """Test user_has_permission for a user who should have access."""
        # Test existing admin user permissions
        has_manage_users = PermissionService.user_has_permission(test_admin_user.id, 'manage_users')
        has_view_all_orders = PermissionService.user_has_permission(test_admin_user.id, 'view_all_orders')
        
        # Admin should have these permissions
        assert has_manage_users is True, "Admin user should have manage_users permission."
        assert has_view_all_orders is True, "Admin user should have view_all_orders permission."

    def test_user_has_permission_no_access(self, client, test_lst_user):
        """Test user_has_permission for a user who should not have access."""
        # LST should not have admin permissions
        has_admin = PermissionService.user_has_permission(test_lst_user.id, 'admin')
        has_manage_users = PermissionService.user_has_permission(test_lst_user.id, 'manage_users')
        
        # LST should not have these permissions
        assert not (has_admin and has_manage_users), "LST should not have both admin and manage_users permissions."

    def test_user_has_permission_invalid_input(self, client):
        """Test user_has_permission with invalid input."""
        # Non-existent user
        has_perm = PermissionService.user_has_permission(99999, 'admin')
        assert has_perm is False, "Non-existent user should not have any permissions."
        
        # Invalid permission name
        has_perm = PermissionService.user_has_permission(1, 'non_existent_permission')
        assert has_perm is False, "Invalid permission name should return False."

    def test_grant_direct_permission_with_valid_input(self, client, test_lst_user, test_admin_user):
        """Test grant_direct_permission with valid input and state verification."""
        # Get a permission to grant that LST doesn't have
        permission_to_test = 'view_all_orders'
        permission = Permission.query.filter_by(name=permission_to_test).first()
        assert permission is not None, f"Setup failed: Permission '{permission_to_test}' not found."

        # 1. ARRANGE (Pre-condition): User does not have the permission
        assert PermissionService.user_has_permission(test_lst_user.id, permission_to_test) is False, "Pre-condition failed: User already has permission."

        # 2. ACT: Grant the permission
        success, message = PermissionService.grant_direct_permission(
            user_id=test_lst_user.id,
            permission_id=permission.id,
            granted_by_user_id=test_admin_user.id,
            reason="Test grant for characterization"
        )
        assert success is True, f"Grant operation should succeed. Message: {message}"
        assert isinstance(message, str), "Grant operation should return a string message."

        # Invalidate cache to ensure the next check is not stale
        PermissionService._clear_user_cache(test_lst_user.id)

        # 3. ASSERT (Post-condition): User now has the permission
        assert PermissionService.user_has_permission(test_lst_user.id, permission_to_test) is True, "Granting permission failed."

    def test_grant_direct_permission_invalid_input(self, client):
        """Test grant_direct_permission with invalid input."""
        success, message = PermissionService.grant_direct_permission(
            user_id=99999,  # Non-existent user
            permission_id=1,
            granted_by_user_id=1,
            reason="Test"
        )
        assert success is False, "Grant operation should fail for non-existent user."
        assert "not found" in message.lower() or "error" in message.lower() or len(message) > 0, "Error message should indicate the problem."

    def test_revoke_direct_permission_valid_input(self, client, test_lst_user, test_admin_user):
        """Test revoke_direct_permission with valid input and state verification."""
        # Get a permission to grant and then revoke
        permission_to_test = 'view_all_orders'
        permission = Permission.query.filter_by(name=permission_to_test).first()
        assert permission is not None, f"Setup failed: Permission '{permission_to_test}' not found."
        
        # 1. ARRANGE: First grant a permission to revoke
        PermissionService.grant_direct_permission(
            user_id=test_lst_user.id,
            permission_id=permission.id,
            granted_by_user_id=test_admin_user.id,
            reason="Setup for revoke test"
        )
        
        # Clear cache and verify user has the permission
        PermissionService._clear_user_cache(test_lst_user.id)
        assert PermissionService.user_has_permission(test_lst_user.id, permission_to_test) is True, "Pre-condition failed: User should have permission before revoke."
        
        # 2. ACT: Now revoke it
        success, message = PermissionService.revoke_direct_permission(
            user_id=test_lst_user.id,
            permission_id=permission.id,
            revoked_by_user_id=test_admin_user.id,
            reason="Test revoke for characterization"
        )
        assert success is True, f"Revoke operation should succeed. Message: {message}"
        assert isinstance(message, str), "Revoke operation should return a string message."
        
        # Clear cache and verify permission was revoked
        PermissionService._clear_user_cache(test_lst_user.id)
        
        # 3. ASSERT (Post-condition): User no longer has the permission
        assert PermissionService.user_has_permission(test_lst_user.id, permission_to_test) is False, "Revoking permission failed."

    def test_revoke_direct_permission_invalid_input(self, client):
        """Test revoke_direct_permission with invalid input."""
        success, message = PermissionService.revoke_direct_permission(
            user_id=99999,  # Non-existent user
            permission_id=1,
            revoked_by_user_id=1,
            reason="Test invalid revoke"
        )
        assert success is False, "Revoke operation should fail for non-existent user."
        assert isinstance(message, str), "Revoke operation should return a string message."

    def test_get_all_permissions(self, client):
        """Test get_all_permissions method."""
        permissions, message, status_code = PermissionService.get_all_permissions()
        
        assert isinstance(permissions, list), "Permissions should be returned as a list."
        assert isinstance(message, str), "Message should be a string."
        assert isinstance(status_code, int), "Status code should be an integer."
        
        if status_code == 200:
            # Should have some permissions in the system (based on seeds.py)
            assert len(permissions) > 0, "System should have permissions if status is 200."

    def test_get_permission_summary(self, client, test_admin_user):
        """Test get_permission_summary method."""
        summary = PermissionService.get_permission_summary(test_admin_user.id)
        
        assert isinstance(summary, dict), "Summary should be returned as a dictionary."
        # Should contain some basic structure
        expected_keys = ['user_id', 'total_permissions', 'direct_permissions', 'group_permissions', 'role_permissions']
        # Some of these keys should be present
        assert any(key in summary for key in expected_keys), f"Summary should contain at least one of: {expected_keys}"
        
        # role_permissions should now be empty since the table has been removed
        if 'role_permissions' in summary:
            assert summary['role_permissions'] == {} or len(summary['role_permissions']) == 0, "role_permissions should be empty after table removal"

    def test_clear_cache_operations(self, client, test_admin_user):
        """Test cache clearing operations."""
        # Test cache clearing doesn't raise exceptions
        try:
            PermissionService._clear_user_cache(test_admin_user.id)
            PermissionService.clear_all_cache()
            # If we get here, no exceptions were raised
            assert True, "Cache operations should complete without exceptions."
        except Exception as e:
            # Capture if cache operations have issues
            pytest.fail(f"Cache operations failed: {e}") 