"""
Enhanced Fuel Order Routes with Granular Permission System

This module demonstrates how existing routes can be enhanced with the new permission system:
- Resource-specific permission checking
- Ownership-based access control
- Permission-based filtering for list endpoints
- Fine-grained permission requirements

This is an example of how to migrate existing routes to the new system.
"""

from flask import Blueprint, request, jsonify, g, Response, current_app
from decimal import Decimal
from datetime import datetime
from typing import Dict, List, Optional

from ..utils.enhanced_auth_decorators import (
    require_permission, 
    require_any_permission,
    require_permission_or_ownership,
    get_permission_context,
    csr_required,
    fueler_required
)
from ..models.user import UserRole
from ..models.fuel_order import FuelOrder, FuelOrderStatus
from ..services.fuel_order_service import FuelOrderService
from ..services.permission_service import PermissionService
from ..models.fuel_truck import FuelTruck
from ..schemas import OrderStatusCountsResponseSchema, ErrorResponseSchema
from ..extensions import db
from ..models.aircraft import Aircraft
from ..services.aircraft_service import AircraftService

# Create the blueprint for enhanced fuel order routes
enhanced_fuel_order_bp = Blueprint('enhanced_fuel_order_bp', __name__)

# Special values for auto-assignment
AUTO_ASSIGN_LST_ID = -1
AUTO_ASSIGN_TRUCK_ID = -1


@enhanced_fuel_order_bp.route('/stats/status-counts', methods=['GET', 'OPTIONS'])
@require_permission('view_order_statistics')
def get_status_counts():
    """
    Get fuel order status counts with granular permission checking.
    
    Enhanced features:
    - Uses granular permission 'view_order_statistics' instead of broad 'VIEW_ORDER_STATS'
    - Permission context available for additional filtering
    """
    if request.method == 'OPTIONS':
        return jsonify({'message': 'OPTIONS request successful'}), 200
    
    try:
        # Get permission context for advanced filtering
        perm_context = get_permission_context()
        
        # Get counts with potential filtering based on permissions
        counts, message, status_code = FuelOrderService.get_status_counts(
            current_user=g.current_user,
            permission_context=perm_context
        )
        
        if counts is not None:
            return jsonify({
                "message": message, 
                "counts": counts,
                "access_reason": getattr(g, 'access_reason', 'permission')
            }), status_code
        else:
            return jsonify({"error": message}), status_code
    except Exception as e:
        current_app.logger.error(f"Unhandled exception in enhanced get_status_counts: {str(e)}")
        return jsonify({"error": "Internal server error in get_status_counts.", "details": str(e)}), 500


@enhanced_fuel_order_bp.route('', methods=['POST', 'OPTIONS'])
@enhanced_fuel_order_bp.route('/', methods=['POST', 'OPTIONS'])
@require_permission('create_fuel_order')
def create_fuel_order():
    """
    Create a new fuel order with enhanced permission checking.
    
    Enhanced features:
    - Uses granular permission 'create_fuel_order'
    - Permission context available for validation
    - Could include customer-specific restrictions
    """
    if request.method == 'OPTIONS':
        return jsonify({'message': 'OPTIONS request successful'}), 200
    
    current_app.logger.info(f"Enhanced create_fuel_order - User: {g.current_user.id}")
    
    data = request.get_json()
    
    # Check if data exists and is a dictionary
    if not data or not isinstance(data, dict):
        return jsonify({"error": "Invalid request data"}), 400
    
    # Get permission context for additional validation
    perm_context = get_permission_context()
    
    # Enhanced validation: Check if user can create orders for specific customers
    if 'customer_id' in data:
        customer_id = data['customer_id']
        if not perm_context.has_permission('create_fuel_order', 'customer', str(customer_id)):
            if not perm_context.has_permission('create_fuel_order_any_customer'):
                return jsonify({
                    "error": "Insufficient permissions to create orders for this customer",
                    "required_permission": "create_fuel_order for customer or create_fuel_order_any_customer"
                }), 403
    
    # Standard validation would continue here...
    # (Implementation details omitted for brevity - would be similar to original)
    
    try:
        # Create the fuel order using existing service logic
        # The service layer should be enhanced to respect permission context
        fuel_order, message, status_code = FuelOrderService.create_fuel_order(
            data, 
            current_user=g.current_user,
            permission_context=perm_context
        )
        
        if fuel_order:
            return jsonify({
                "message": message,
                "fuel_order": {
                    "id": fuel_order.id,
                    "status": fuel_order.status.value,
                    "tail_number": fuel_order.tail_number
                },
                "access_reason": getattr(g, 'access_reason', 'permission')
            }), status_code
        else:
            return jsonify({"error": message}), status_code
            
    except Exception as e:
        current_app.logger.error(f"Error in enhanced create_fuel_order: {str(e)}")
        return jsonify({"error": "Internal server error"}), 500


@enhanced_fuel_order_bp.route('', methods=['GET', 'OPTIONS'])
@enhanced_fuel_order_bp.route('/', methods=['GET', 'OPTIONS'])
@require_any_permission('view_fuel_orders', 'view_own_fuel_orders', 'manage_fuel_orders')
def get_fuel_orders():
    """
    Get fuel orders with permission-based filtering.
    
    Enhanced features:
    - Multiple permission options (any of: view_fuel_orders, view_own_fuel_orders, manage_fuel_orders)
    - Automatic filtering based on user permissions
    - Only shows orders user has permission to view
    """
    if request.method == 'OPTIONS':
        return jsonify({'message': 'OPTIONS request successful'}), 200
    
    try:
        # Get permission context
        perm_context = get_permission_context()
        user = g.current_user
        
        # Determine what orders the user can see based on their permissions
        filters = {}
        granted_permission = getattr(g, 'granted_permission', '')
        
        if granted_permission == 'view_fuel_orders' or perm_context.has_permission('manage_fuel_orders'):
            # User can see all orders
            pass
        elif granted_permission == 'view_own_fuel_orders':
            # User can only see orders they created or are assigned to
            filters['accessible_by_user'] = user.id
        else:
            # Additional permission-based filtering
            accessible_orders = []
            
            # Check for customer-specific permissions
            if perm_context.has_permission('view_fuel_orders_customer'):
                # Get customer IDs user can access
                accessible_customers = PermissionService.get_accessible_resources(
                    user.id, 'view_fuel_orders', 'customer'
                )
                if accessible_customers:
                    filters['customer_ids'] = accessible_customers
            
            # Check for location-specific permissions
            if perm_context.has_permission('view_fuel_orders_location'):
                accessible_locations = PermissionService.get_accessible_resources(
                    user.id, 'view_fuel_orders', 'location'
                )
                if accessible_locations:
                    filters['location_ids'] = accessible_locations
        
        # Get fuel orders with permission-based filtering
        fuel_orders, message, status_code = FuelOrderService.get_fuel_orders(
            filters=filters,
            current_user=user,
            permission_context=perm_context
        )
        
        if fuel_orders is not None:
            return jsonify({
                "message": message,
                "fuel_orders": [order.to_dict() for order in fuel_orders],
                "access_reason": getattr(g, 'access_reason', 'permission'),
                "granted_permission": granted_permission,
                "filtered_by": list(filters.keys()) if filters else []
            }), status_code
        else:
            return jsonify({"error": message}), status_code
            
    except Exception as e:
        current_app.logger.error(f"Error in enhanced get_fuel_orders: {str(e)}")
        return jsonify({"error": "Internal server error"}), 500


@enhanced_fuel_order_bp.route('/<int:order_id>', methods=['GET'])
@require_permission_or_ownership('view_any_fuel_order', 'fuel_order', 'order_id')
def get_fuel_order(order_id):
    """
    Get specific fuel order with ownership checking.
    
    Enhanced features:
    - Uses require_permission_or_ownership decorator
    - Allows access if user has 'view_any_fuel_order' permission OR owns the order
    - Provides detailed access reason in response
    """
    try:
        # Get the fuel order
        fuel_order, message, status_code = FuelOrderService.get_fuel_order_by_id(
            order_id,
            current_user=g.current_user,
            permission_context=get_permission_context()
        )
        
        if fuel_order:
            return jsonify({
                "message": message,
                "fuel_order": fuel_order.to_dict(),
                "access_reason": getattr(g, 'access_reason', 'permission')
            }), status_code
        else:
            return jsonify({"error": message}), status_code
            
    except Exception as e:
        current_app.logger.error(f"Error in enhanced get_fuel_order: {str(e)}")
        return jsonify({"error": "Internal server error"}), 500


@enhanced_fuel_order_bp.route('/<int:order_id>/status', methods=['PATCH'])
@fueler_required()
def update_fuel_order_status(order_id):
    """
    Update fuel order status with role-based convenience decorator.
    
    Enhanced features:
    - Uses convenience decorator @fueler_required()
    - Automatically checks for fueler-level permissions
    - Could be enhanced with resource-specific checking
    """
    try:
        data = request.get_json()
        if not data or 'status' not in data:
            return jsonify({"error": "Status is required"}), 400
        
        # Update with permission context
        result, message, status_code = FuelOrderService.update_fuel_order_status(
            order_id,
            data['status'],
            current_user=g.current_user,
            permission_context=get_permission_context()
        )
        
        if result:
            return jsonify({
                "message": message,
                "access_reason": getattr(g, 'access_reason', 'permission')
            }), status_code
        else:
            return jsonify({"error": message}), status_code
            
    except Exception as e:
        current_app.logger.error(f"Error in enhanced update_fuel_order_status: {str(e)}")
        return jsonify({"error": "Internal server error"}), 500


@enhanced_fuel_order_bp.route('/<int:order_id>/submit-data', methods=['PUT'])
@require_permission('complete_fuel_order', 'fuel_order', 'order_id')
def submit_fuel_data(order_id):
    """
    Submit fuel data with resource-specific permission checking.
    
    Enhanced features:
    - Resource-specific permission checking for the specific fuel order
    - Permission context available for additional validation
    """
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "Request data is required"}), 400
        
        # Submit fuel data with permission context
        result, message, status_code = FuelOrderService.submit_fuel_data(
            order_id,
            data,
            current_user=g.current_user,
            permission_context=get_permission_context()
        )
        
        if result:
            return jsonify({
                "message": message,
                "access_reason": getattr(g, 'access_reason', 'permission')
            }), status_code
        else:
            return jsonify({"error": message}), status_code
            
    except Exception as e:
        current_app.logger.error(f"Error in enhanced submit_fuel_data: {str(e)}")
        return jsonify({"error": "Internal server error"}), 500


@enhanced_fuel_order_bp.route('/<int:order_id>/review', methods=['PATCH'])
@require_permission('review_fuel_order', 'fuel_order', 'order_id')
def review_fuel_order(order_id):
    """
    Review fuel order with resource-specific permission.
    
    Enhanced features:
    - Resource-specific permission for the specific fuel order
    - Could include customer or location-based restrictions
    """
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "Review data is required"}), 400
        
        # Review with permission context
        result, message, status_code = FuelOrderService.review_fuel_order(
            order_id,
            data,
            current_user=g.current_user,
            permission_context=get_permission_context()
        )
        
        if result:
            return jsonify({
                "message": message,
                "access_reason": getattr(g, 'access_reason', 'permission')
            }), status_code
        else:
            return jsonify({"error": message}), status_code
            
    except Exception as e:
        current_app.logger.error(f"Error in enhanced review_fuel_order: {str(e)}")
        return jsonify({"error": "Internal server error"}), 500


@enhanced_fuel_order_bp.route('/export', methods=['GET'])
@require_any_permission('export_fuel_orders', 'export_own_fuel_orders', 'manage_fuel_orders')
def export_fuel_orders_csv():
    """
    Export fuel orders with permission-based filtering.
    
    Enhanced features:
    - Multiple permission options for different levels of access
    - Automatic filtering based on what user can export
    - Respects data privacy boundaries
    """
    try:
        # Get permission context
        perm_context = get_permission_context()
        user = g.current_user
        granted_permission = getattr(g, 'granted_permission', '')
        
        # Determine export scope based on permissions
        export_filters = {}
        
        if granted_permission == 'export_fuel_orders' or perm_context.has_permission('manage_fuel_orders'):
            # User can export all orders
            pass
        elif granted_permission == 'export_own_fuel_orders':
            # User can only export orders they have access to
            export_filters['accessible_by_user'] = user.id
        
        # Export with permission-based filtering
        csv_data, filename, message, status_code = FuelOrderService.export_fuel_orders_csv(
            filters=export_filters,
            current_user=user,
            permission_context=perm_context
        )
        
        if csv_data:
            response = Response(
                csv_data,
                mimetype='text/csv',
                headers={
                    'Content-Disposition': f'attachment; filename={filename}',
                    'Access-Reason': getattr(g, 'access_reason', 'permission'),
                    'Granted-Permission': granted_permission
                }
            )
            return response
        else:
            return jsonify({"error": message}), status_code
            
    except Exception as e:
        current_app.logger.error(f"Error in enhanced export_fuel_orders_csv: {str(e)}")
        return jsonify({"error": "Internal server error"}), 500


# Additional enhanced endpoints for demonstration

@enhanced_fuel_order_bp.route('/my-orders', methods=['GET'])
@require_permission('view_own_fuel_orders')
def get_my_fuel_orders():
    """
    Get orders accessible to the current user.
    
    Enhanced features:
    - Dedicated endpoint for user's own orders
    - Automatic filtering to user's accessible orders
    """
    try:
        user = g.current_user
        
        # Get orders accessible to the current user
        fuel_orders, message, status_code = FuelOrderService.get_user_accessible_orders(
            user.id,
            permission_context=get_permission_context()
        )
        
        if fuel_orders is not None:
            return jsonify({
                "message": message,
                "fuel_orders": [order.to_dict() for order in fuel_orders],
                "user_id": user.id
            }), status_code
        else:
            return jsonify({"error": message}), status_code
            
    except Exception as e:
        current_app.logger.error(f"Error in get_my_fuel_orders: {str(e)}")
        return jsonify({"error": "Internal server error"}), 500


@enhanced_fuel_order_bp.route('/permissions-info', methods=['GET'])
@require_any_permission('view_fuel_orders', 'view_own_fuel_orders')
def get_permission_info():
    """
    Get information about user's fuel order permissions.
    
    Enhanced features:
    - Provides transparency about user's permissions
    - Helps frontend adapt UI based on capabilities
    """
    try:
        perm_context = get_permission_context()
        user = g.current_user
        
        # Gather permission information
        permissions_info = {
            "user_id": user.id,
            "username": user.username,
            "fuel_order_permissions": {
                "can_view_all_orders": perm_context.has_permission('view_fuel_orders'),
                "can_view_own_orders": perm_context.has_permission('view_own_fuel_orders'),
                "can_create_orders": perm_context.has_permission('create_fuel_order'),
                "can_manage_orders": perm_context.has_permission('manage_fuel_orders'),
                "can_export_all": perm_context.has_permission('export_fuel_orders'),
                "can_export_own": perm_context.has_permission('export_own_fuel_orders'),
                "can_complete_orders": perm_context.has_permission('complete_fuel_order'),
                "can_review_orders": perm_context.has_permission('review_fuel_order')
            },
            "resource_specific_permissions": {
                "customer_restrictions": PermissionService.get_accessible_resources(
                    user.id, 'view_fuel_orders', 'customer'
                ),
                "location_restrictions": PermissionService.get_accessible_resources(
                    user.id, 'view_fuel_orders', 'location'
                )
            }
        }
        
        return jsonify({
            "permissions_info": permissions_info,
            "effective_permissions": perm_context.get_permissions()
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"Error in get_permission_info: {str(e)}")
        return jsonify({"error": "Internal server error"}), 500


"""
ENHANCED ROUTE MIGRATION EXAMPLES

This module demonstrates how to migrate existing routes to the new granular permission system:

1. **Basic Permission Upgrade**:
   - Old: @require_permission('VIEW_ORDER_STATS')
   - New: @require_permission('view_order_statistics')

2. **Resource-Specific Checking**: The @require_permission decorator can now
   include resource type and ID parameter:
   - @require_permission('view_fuel_order', 'fuel_order', 'order_id')

3. **Multiple Permission Options**: Allow access with any of several permissions:
   - @require_any_permission('view_fuel_orders', 'view_own_fuel_orders', 'manage_fuel_orders')

4. **Ownership-Based Access**: @require_permission_or_ownership allows access
   if user has global permission OR owns the specific resource:
   - @require_permission_or_ownership('view_any_fuel_order', 'fuel_order', 'order_id')

5. **Convenience Decorators**: Role-based decorators for common patterns:
   - @csr_required(), @fueler_required(), @admin_required()

6. **Permission Context**: Access to PermissionContext within routes:
   - perm_context = get_permission_context()
   - perm_context.has_permission('specific_permission')

7. **Permission-Based Filtering**: Automatically filter data based on permissions:
   - Only show orders user has permission to view
   - Respect customer/location/resource boundaries

8. **Transparency**: Include access reason and granted permissions in responses
   to help with debugging and auditing.

MIGRATION STEPS:
1. Update decorator imports to use enhanced_auth_decorators
2. Replace broad permissions with granular ones
3. Add resource-specific checking where appropriate
4. Implement permission-based filtering for list endpoints
5. Add permission context usage for advanced validation
6. Update service layer to respect permission context
7. Test all permission scenarios thoroughly
""" 