"""
Example implementation showing how to update fuel order routes 
to use the enhanced permission system with resource-specific checking.

This file demonstrates the migration from simple permission decorators
to the new granular permission system.
"""

from flask import Blueprint, request, jsonify, g, current_app
from ..utils.enhanced_auth_decorators import (
    require_permission, 
    require_any_permission, 
    require_permission_or_ownership,
    get_permission_context,
    csr_required,
    fueler_required
)
from ..services.fuel_order_service import FuelOrderService

# Create the blueprint for enhanced fuel order routes
enhanced_fuel_order_bp = Blueprint('enhanced_fuel_order_bp', __name__)

# Example 1: Global permission for viewing order statistics
@enhanced_fuel_order_bp.route('/stats/status-counts', methods=['GET'])
@require_permission('view_order_statistics')
def get_status_counts():
    """
    Get fuel order status counts.
    Requires global 'view_order_statistics' permission.
    """
    try:
        counts, message, status_code = FuelOrderService.get_status_counts()
        if counts is not None:
            return jsonify({"message": message, "counts": counts}), status_code
        else:
            return jsonify({"error": message}), status_code
    except Exception as e:
        current_app.logger.error(f"Error in get_status_counts: {str(e)}")
        return jsonify({"error": "Internal server error"}), 500

# Example 2: Creating fuel orders with granular permissions
@enhanced_fuel_order_bp.route('', methods=['POST'])
@require_permission('create_fuel_order')
def create_fuel_order():
    """
    Create a new fuel order.
    Requires 'create_fuel_order' permission.
    """
    data = request.get_json()
    
    # Get permission context for additional checks
    perm_ctx = get_permission_context()
    
    # Example: Check if user can assign specific LST users
    if data.get('assigned_lst_user_id') and perm_ctx:
        if not perm_ctx.has_permission('assign_lst_to_orders'):
            # User can only assign themselves if they're an LST
            if not perm_ctx.has_permission('perform_fueling'):
                return jsonify({
                    'error': 'You can only assign yourself to fuel orders'
                }), 403
            # Force assignment to current user
            data['assigned_lst_user_id'] = g.permission_context['user_id']
    
    try:
        order, message, status_code = FuelOrderService.create_fuel_order(data)
        if order:
            return jsonify({
                "message": message, 
                "fuel_order": order.to_dict()
            }), status_code
        else:
            return jsonify({"error": message}), status_code
    except Exception as e:
        current_app.logger.error(f"Error creating fuel order: {str(e)}")
        return jsonify({"error": "Failed to create fuel order"}), 500

# Example 3: Viewing specific fuel orders with resource-specific permissions
@enhanced_fuel_order_bp.route('/<int:order_id>', methods=['GET'])
@require_permission_or_ownership('view_any_fuel_order', 'fuel_order', 'order_id')
def get_fuel_order(order_id):
    """
    Get a specific fuel order.
    Allows access if user has 'view_any_fuel_order' permission OR owns the order.
    """
    try:
        order, message, status_code = FuelOrderService.get_fuel_order_by_id(order_id)
        if order:
            # Add access reason to response for debugging
            access_reason = getattr(g, 'access_reason', 'unknown')
            response_data = {
                "fuel_order": order.to_dict(),
                "access_granted_by": access_reason
            }
            return jsonify(response_data), status_code
        else:
            return jsonify({"error": message}), status_code
    except Exception as e:
        current_app.logger.error(f"Error retrieving fuel order {order_id}: {str(e)}")
        return jsonify({"error": "Failed to retrieve fuel order"}), 500

# Example 4: Updating fuel order status with multiple permission options
@enhanced_fuel_order_bp.route('/<int:order_id>/status', methods=['PATCH'])
@require_any_permission('update_fuel_order_status', 'manage_fuel_orders', 'perform_fueling')
def update_fuel_order_status(order_id):
    """
    Update fuel order status.
    Allows access with any of: update_fuel_order_status, manage_fuel_orders, or perform_fueling.
    """
    data = request.get_json()
    new_status = data.get('status')
    
    # Get permission context for granular checks
    perm_ctx = get_permission_context()
    granted_permission = getattr(g, 'granted_permission', None)
    
    # Apply business rules based on which permission was granted
    if granted_permission == 'perform_fueling':
        # Fuelers can only update to specific statuses
        allowed_statuses = ['in_progress', 'completed']
        if new_status not in allowed_statuses:
            return jsonify({
                'error': f'Fuelers can only set status to: {", ".join(allowed_statuses)}'
            }), 403
        
        # Fuelers can only update orders assigned to them
        order, _, _ = FuelOrderService.get_fuel_order_by_id(order_id)
        if order and order.assigned_lst_user_id != g.permission_context['user_id']:
            return jsonify({
                'error': 'You can only update orders assigned to you'
            }), 403
    
    try:
        order, message, status_code = FuelOrderService.update_fuel_order_status(
            order_id, new_status
        )
        if order:
            return jsonify({
                "message": message, 
                "fuel_order": order.to_dict(),
                "updated_by_permission": granted_permission
            }), status_code
        else:
            return jsonify({"error": message}), status_code
    except Exception as e:
        current_app.logger.error(f"Error updating fuel order status: {str(e)}")
        return jsonify({"error": "Failed to update fuel order status"}), 500

# Example 5: Resource-specific permission with resource context
@enhanced_fuel_order_bp.route('/<int:order_id>/complete', methods=['PUT'])
@require_permission('complete_fuel_order', 'fuel_order', 'order_id')
def complete_fuel_order(order_id):
    """
    Complete a fuel order with fuel data submission.
    Requires 'complete_fuel_order' permission for the specific fuel order.
    """
    data = request.get_json()
    
    try:
        order, message, status_code = FuelOrderService.complete_fuel_order(
            order_id, data
        )
        if order:
            return jsonify({
                "message": message, 
                "fuel_order": order.to_dict()
            }), status_code
        else:
            return jsonify({"error": message}), status_code
    except Exception as e:
        current_app.logger.error(f"Error completing fuel order: {str(e)}")
        return jsonify({"error": "Failed to complete fuel order"}), 500

# Example 6: CSR-specific route using convenience decorator
@enhanced_fuel_order_bp.route('/<int:order_id>/review', methods=['PATCH'])
@csr_required()
def review_fuel_order(order_id):
    """
    Review a fuel order (CSR only).
    Uses convenience decorator that checks for CSR-level permissions.
    """
    data = request.get_json()
    
    try:
        order, message, status_code = FuelOrderService.review_fuel_order(
            order_id, data
        )
        if order:
            return jsonify({
                "message": message, 
                "fuel_order": order.to_dict()
            }), status_code
        else:
            return jsonify({"error": message}), status_code
    except Exception as e:
        current_app.logger.error(f"Error reviewing fuel order: {str(e)}")
        return jsonify({"error": "Failed to review fuel order"}), 500

# Example 7: Export functionality with data filtering based on permissions
@enhanced_fuel_order_bp.route('/export', methods=['GET'])
@require_any_permission('export_all_orders', 'export_own_orders')
def export_fuel_orders():
    """
    Export fuel orders to CSV.
    Data filtering based on user's permission level.
    """
    perm_ctx = get_permission_context()
    granted_permission = getattr(g, 'granted_permission', None)
    
    # Determine data scope based on permission
    if granted_permission == 'export_own_orders':
        # Filter to only user's own orders
        filters = {'created_by_user_id': g.permission_context['user_id']}
    else:
        # User has export_all_orders permission
        filters = {}
    
    try:
        csv_data, message, status_code = FuelOrderService.export_to_csv(filters)
        if csv_data:
            return csv_data, status_code, {
                'Content-Type': 'text/csv',
                'Content-Disposition': 'attachment; filename=fuel_orders.csv'
            }
        else:
            return jsonify({"error": message}), status_code
    except Exception as e:
        current_app.logger.error(f"Error exporting fuel orders: {str(e)}")
        return jsonify({"error": "Failed to export fuel orders"}), 500

# Example 8: Dynamic permission checking within route
@enhanced_fuel_order_bp.route('/<int:order_id>/actions', methods=['GET'])
@require_permission('view_fuel_order', 'fuel_order', 'order_id')
def get_available_actions(order_id):
    """
    Get available actions for a fuel order based on user's permissions.
    Demonstrates dynamic permission checking within the route.
    """
    perm_ctx = get_permission_context()
    
    if not perm_ctx:
        return jsonify({"error": "Permission context not available"}), 500
    
    # Get the fuel order
    order, message, status_code = FuelOrderService.get_fuel_order_by_id(order_id)
    if not order:
        return jsonify({"error": message}), status_code
    
    # Determine available actions based on permissions
    available_actions = []
    
    if perm_ctx.can_edit_resource('fuel_order', str(order_id)):
        available_actions.append('edit')
    
    if perm_ctx.has_permission('delete_fuel_order', 'fuel_order', str(order_id)):
        available_actions.append('delete')
    
    if perm_ctx.has_permission('complete_fuel_order', 'fuel_order', str(order_id)):
        available_actions.append('complete')
    
    if perm_ctx.has_permission('review_fuel_order'):
        available_actions.append('review')
    
    if perm_ctx.has_permission('assign_lst_to_orders'):
        available_actions.append('reassign_lst')
    
    return jsonify({
        "order_id": order_id,
        "available_actions": available_actions,
        "user_permissions_summary": {
            "total_permissions": len(perm_ctx.get_permissions()),
            "can_edit": perm_ctx.can_edit_resource('fuel_order', str(order_id)),
            "can_view": perm_ctx.can_view_resource('fuel_order', str(order_id))
        }
    }), 200

"""
Key Changes from Legacy System:

1. **Granular Permissions**: Instead of broad permissions like 'CREATE_ORDER', 
   we use specific permissions like 'create_fuel_order', 'view_any_fuel_order'.

2. **Resource-Specific Checking**: The @require_permission decorator can now 
   check permissions for specific resources using resource_type and resource_id.

3. **Multiple Permission Options**: @require_any_permission allows routes to 
   accept multiple valid permissions, enabling flexible access control.

4. **Ownership-Based Access**: @require_permission_or_ownership allows access 
   based on either permission or resource ownership.

5. **Dynamic Permission Checking**: Routes can use get_permission_context() 
   to perform additional permission checks within the route logic.

6. **Business Rule Enforcement**: Permission-based business rules can be 
   applied within routes based on which permission granted access.

7. **Convenience Decorators**: Role-like decorators (csr_required, fueler_required) 
   provide backward compatibility while using the new permission system.

Migration Strategy:
1. Update route decorators to use new enhanced decorators
2. Replace broad permissions with granular ones
3. Add resource-specific permission checking where appropriate
4. Implement dynamic permission checking for complex business rules
5. Test thoroughly to ensure no security regressions
""" 