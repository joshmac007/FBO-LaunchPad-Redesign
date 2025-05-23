"""Tests for the permission system."""

import pytest
from flask import json
from src.models.user import User
from src.models.role import Role
from src.models.permission import Permission
from src.utils.decorators import require_permission
from flask import Blueprint, jsonify

# Create a test blueprint with protected routes
test_bp = Blueprint('test_bp', __name__)

@test_bp.route('/test-permission')
@require_permission('TEST_PERMISSION')
def test_permission_route():
    return jsonify({'message': 'success'})

def test_user_has_permission(app, client, db, test_users, test_permissions):
    """Test the user.has_permission() method."""
    with app.app_context():
        # Admin should have all permissions
        admin = test_users[0]  # First user is admin
        for perm in test_permissions:
            assert admin.has_permission(perm.name), f"Admin should have {perm.name} permission"

        # CSR should have specific permissions
        csr = test_users[1]  # Second user is CSR
        assert csr.has_permission('CREATE_ORDER'), "CSR should have CREATE_ORDER permission"
        assert csr.has_permission('MANAGE_ORDERS'), "CSR should have MANAGE_ORDERS permission"
        assert csr.has_permission('VIEW_USERS'), "CSR should have VIEW_USERS permission"
        assert not csr.has_permission('MANAGE_ROLES'), "CSR should not have MANAGE_ROLES permission"

        # LST should have limited permissions
        lst = test_users[2]  # Third user is LST
        assert lst.has_permission('VIEW_ORDERS'), "LST should have VIEW_ORDERS permission"
        assert lst.has_permission('COMPLETE_ORDER'), "LST should have COMPLETE_ORDER permission"
        assert not lst.has_permission('MANAGE_ORDERS'), "LST should not have MANAGE_ORDERS permission"
        assert not lst.has_permission('MANAGE_ROLES'), "LST should not have MANAGE_ROLES permission"

def test_permission_decorator(app, client, db, test_users, test_permissions):
    """Test the @require_permission decorator."""
    with app.app_context():
        # Register test route
        test_perm = Permission(name='TEST_PERMISSION')
        db.session.add(test_perm)
        db.session.commit()

        # Add test permission to admin role
        admin_role = test_users[0].roles[0]  # First user is admin
        admin_role.permissions.append(test_perm)
        db.session.commit()

        # Register blueprint
        app.register_blueprint(test_bp)

        # Test with admin (has permission)
        response = client.get('/test-permission', 
                            headers={'Authorization': f'Bearer {test_users[0].generate_token()}'})
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['message'] == 'success'

        # Test with CSR (no permission)
        response = client.get('/test-permission',
                            headers={'Authorization': f'Bearer {test_users[1].generate_token()}'})
        assert response.status_code == 403
        data = json.loads(response.data)
        assert 'error' in data
        assert 'Permission denied' in data['error']

        # Test with LST (no permission)
        response = client.get('/test-permission',
                            headers={'Authorization': f'Bearer {test_users[2].generate_token()}'})
        assert response.status_code == 403
        data = json.loads(response.data)
        assert 'error' in data
        assert 'Permission denied' in data['error']

def test_permission_inheritance(app, client, db, test_users, test_permissions):
    """Test that permissions are correctly inherited through roles."""
    with app.app_context():
        # Create a new role that inherits from CSR
        parent_role = test_users[1].roles[0]  # Second user is CSR
        child_role = Role(name='Child Role', description='Inherits from CSR')
        db.session.add(child_role)
        db.session.commit()

        # Create a user with the child role
        user = User(username='childuser', email='child@test.com', name='Child User')
        user.set_password('testpass')
        user.roles.append(child_role)
        db.session.add(user)
        db.session.commit()

        # Child role should have parent's permissions
        assert user.has_permission('CREATE_ORDER'), "User should inherit CREATE_ORDER permission"
        assert user.has_permission('MANAGE_ORDERS'), "User should inherit MANAGE_ORDERS permission"
        assert user.has_permission('VIEW_USERS'), "User should inherit VIEW_USERS permission"
        assert not user.has_permission('MANAGE_ROLES'), "User should not have MANAGE_ROLES permission"

def test_permission_caching(app, client, db, test_users, test_permissions):
    """Test that permission checks are properly cached."""
    with app.app_context():
        user = test_users[1]  # Second user is CSR
        perm_name = 'CREATE_ORDER'

        # First check should cache the result
        assert user.has_permission(perm_name), "User should have CREATE_ORDER permission"

        # Remove permission but don't clear cache
        role = user.roles[0]
        perm = next(p for p in role.permissions if p.name == perm_name)
        role.permissions.remove(perm)
        db.session.commit()

        # Should still return True from cache
        assert user.has_permission(perm_name), "Cached permission should still return True"

        # Clear cache and check again
        user.clear_permission_cache()
        assert not user.has_permission(perm_name), "Permission should be False after cache clear"

        # Restore permission
        role.permissions.append(perm)
        db.session.commit()

def test_user_with_multiple_roles(app, db, test_permissions):
    """Test user with multiple roles."""
    with app.app_context():
        # Create two roles with different permissions
        role1 = Role(name='Role1')
        view_orders = next(p for p in test_permissions if p.name == 'VIEW_ORDERS')
        role1.permissions.append(view_orders)
        role2 = Role(name='Role2')
        create_order = next(p for p in test_permissions if p.name == 'CREATE_ORDER')
        role2.permissions.append(create_order)
        
        db.session.add(role1)
        db.session.add(role2)
        
        # Create user with both roles
        user = User(username='multiuser', email='multi@test.com')
        user.set_password('testpass')
        user.roles.append(role1)
        user.roles.append(role2)
        
        db.session.add(user)
        db.session.commit()
        
        # User should have permissions from both roles
        assert user.has_permission('VIEW_ORDERS'), "User should have VIEW_ORDERS from Role1"
        assert user.has_permission('CREATE_ORDER'), "User should have CREATE_ORDER from Role2"
        assert not user.has_permission('MANAGE_ROLES'), "User should not have MANAGE_ROLES"

def test_require_permission_decorator(app, client, auth_headers):
    """Test @require_permission decorator."""
    with app.app_context():
        # Test admin access (has MANAGE_ROLES)
        response = client.get('/api/admin/roles/', headers=auth_headers['admin'])
        assert response.status_code == 200, "Admin should have access to roles endpoint"

        # Test CSR access (no MANAGE_ROLES)
        response = client.get('/api/admin/roles/', headers=auth_headers['csr'])
        assert response.status_code == 403, "CSR should be denied access to roles endpoint"

        # Test LST access (no MANAGE_ROLES)
        response = client.get('/api/admin/roles/', headers=auth_headers['lst'])
        assert response.status_code == 403, "LST should be denied access to roles endpoint"

        # Test unauthorized access
        response = client.get('/api/admin/roles/')
        assert response.status_code == 401, "Unauthorized request should be rejected"

def test_permission_edge_cases(app, db, test_permissions):
    """Test edge cases for permissions."""
    with app.app_context():
        # Test user with no roles
        user = User(username='noroles', email='noroles@test.com')
        user.set_password('testpass')
        db.session.add(user)
        db.session.commit()
        
        assert not user.has_permission('VIEW_ORDERS'), "User with no roles should have no permissions"
        
        # Test user with empty role (no permissions)
        empty_role = Role(name='Empty')
        db.session.add(empty_role)
        user.roles.append(empty_role)
        db.session.commit()
        
        assert not user.has_permission('VIEW_ORDERS'), "User with empty role should have no permissions"
        
        # Test non-existent permission
        assert not user.has_permission('NON_EXISTENT'), "Non-existent permission should return False"

def test_inactive_user_permissions(app, test_inactive_user, test_roles, test_permissions):
    """Test that inactive users can't use permissions."""
    with app.app_context():
        # Give the inactive user some permissions via a role
        csr_role = next(r for r in test_roles if r.name == 'Customer Service Representative')
        test_inactive_user.roles.append(csr_role)
        
        # Even though the user has the role, they should not have permission when inactive
        assert not test_inactive_user.has_permission('VIEW_ORDERS'), \
            "Inactive user should not have permissions" 