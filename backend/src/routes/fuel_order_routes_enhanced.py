"""
Enhanced Fuel Order Routes - Phase 4 Demo
Demonstrates advanced authorization features including resource contexts,
permission groups, and enhanced caching.
"""

from flask import Blueprint, request, jsonify, g
from flask_jwt_extended import get_jwt_identity

from ..utils.enhanced_auth_decorators_v2 import (
    require_permission_v2,
    require_any_permission_v2,
    require_permission_or_ownership_v2,
    audit_permission_access,
    cache_user_permissions
)
from ..services.permission_service import ResourceContext
from ..models.fuel_order import FuelOrder
from ..schemas.fuel_order_schema import FuelOrderSchema
from ..extensions import db

# Create enhanced fuel order blueprint
fuel_order_enhanced_bp = Blueprint('fuel_order_enhanced', __name__, url_prefix='/api/v2/fuel-orders')

fuel_order_schema = FuelOrderSchema()
fuel_orders_schema = FuelOrderSchema(many=True)

@fuel_order_enhanced_bp.route('/', methods=['GET'])
@cache_user_permissions(ttl=600)  # Cache for 10 minutes
@require_any_permission_v2('view_all_orders', 'view_assigned_orders')
def get_fuel_orders():
    """
    Enhanced fuel orders list with caching and multiple permission options.
    Users can access this with either 'view_all_orders' or 'view_assigned_orders'.
    """
    try:
        current_user_id = get_jwt_identity()
        
        # Check which permission was granted to determine data scope
        if g.verified_permission == 'view_all_orders':
            # User can see all orders
            orders = FuelOrder.query.all()
            scope = 'all'
        else:
            # User can only see assigned orders
            orders = FuelOrder.query.filter_by(assigned_lst_id=current_user_id).all()
            scope = 'assigned'
        
        return jsonify({
            'orders': fuel_orders_schema.dump(orders),
            'scope': scope,
            'permission_used': g.verified_permission,
            'count': len(orders)
        }), 200
        
    except Exception as e:
        return jsonify({'error': f'Failed to retrieve fuel orders: {str(e)}'}), 500

@fuel_order_enhanced_bp.route('/<int:order_id>', methods=['GET'])
@audit_permission_access({'action': 'view_fuel_order', 'category': 'operations'})
@require_permission_or_ownership_v2('view_all_orders', 'fuel_order', 'order_id')
def get_fuel_order(order_id):
    """
    Enhanced individual fuel order retrieval with ownership checking.
    Demonstrates permission OR ownership access pattern.
    """
    try:
        order = FuelOrder.query.get_or_404(order_id)
        
        return jsonify({
            'order': fuel_order_schema.dump(order),
            'access_method': getattr(g, 'access_method', 'unknown'),
            'permission_context': {
                'type': g.resource_context.resource_type if hasattr(g, 'resource_context') else None,
                'id': order_id,
                'owned': g.access_method == 'ownership' if hasattr(g, 'access_method') else False
            }
        }), 200
        
    except Exception as e:
        return jsonify({'error': f'Failed to retrieve fuel order: {str(e)}'}), 500

@fuel_order_enhanced_bp.route('/<int:order_id>', methods=['PUT'])
@require_permission_v2('edit_fuel_order', 
                      resource_context={
                          'type': 'fuel_order',
                          'id_param': 'order_id',
                          'ownership_check': True,
                          'cascade_permissions': ['view_all_orders']
                      })
def update_fuel_order(order_id):
    """
    Enhanced fuel order update with resource context and cascade permissions.
    User must have edit permission AND view permission (cascade).
    Also checks ownership of the specific order.
    """
    try:
        order = FuelOrder.query.get_or_404(order_id)
        
        # Get update data
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        # Update order fields (simplified for demo)
        if 'status' in data:
            order.status = data['status']
        if 'notes' in data:
            order.notes = data['notes']
            
        db.session.commit()
        
        return jsonify({
            'message': 'Fuel order updated successfully',
            'order': fuel_order_schema.dump(order),
            'permission_context': {
                'resource_type': g.permission_context.resource_type if hasattr(g, 'permission_context') else None,
                'ownership_verified': g.permission_context.ownership_check if hasattr(g, 'permission_context') else False,
                'cascade_permissions': g.permission_context.cascade_permissions if hasattr(g, 'permission_context') else []
            }
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Failed to update fuel order: {str(e)}'}), 500

@fuel_order_enhanced_bp.route('/<int:order_id>/status', methods=['PATCH'])
@require_permission_v2('update_order_status',
                      resource_context=ResourceContext(
                          resource_type='fuel_order',
                          id_param='order_id',
                          ownership_check=True,
                          department_scope=True
                      ),
                      allow_self=False)
def update_order_status(order_id):
    """
    Enhanced status update with full ResourceContext object.
    Demonstrates ownership and department scope checking.
    """
    try:
        order = FuelOrder.query.get_or_404(order_id)
        
        data = request.get_json()
        if not data or 'status' not in data:
            return jsonify({'error': 'Status is required'}), 400
            
        old_status = order.status
        order.status = data['status']
        
        # Add status change log entry (simplified)
        order.last_updated = db.func.now()
        order.updated_by_id = get_jwt_identity()
        
        db.session.commit()
        
        return jsonify({
            'message': 'Status updated successfully',
            'order_id': order_id,
            'old_status': old_status,
            'new_status': order.status,
            'updated_by': get_jwt_identity(),
            'permission_checks': {
                'ownership_verified': True,
                'department_scope_verified': True,
                'resource_context_used': True
            }
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Failed to update status: {str(e)}'}), 500

@fuel_order_enhanced_bp.route('/statistics', methods=['GET'])
@cache_user_permissions(ttl=1800)  # Cache for 30 minutes
@require_permission_v2('view_order_statistics')
@audit_permission_access({'action': 'view_statistics', 'category': 'reporting', 'sensitive': True})
def get_order_statistics():
    """
    Enhanced statistics endpoint with caching and auditing.
    Demonstrates advanced decorator composition.
    """
    try:
        # Get basic statistics
        total_orders = FuelOrder.query.count()
        pending_orders = FuelOrder.query.filter_by(status='pending').count()
        completed_orders = FuelOrder.query.filter_by(status='completed').count()
        
        # Get user-specific statistics if they have ownership scope
        current_user_id = get_jwt_identity()
        user_orders = FuelOrder.query.filter_by(assigned_lst_id=current_user_id).count()
        
        statistics = {
            'total_orders': total_orders,
            'pending_orders': pending_orders,
            'completed_orders': completed_orders,
            'user_assigned_orders': user_orders,
            'completion_rate': (completed_orders / total_orders * 100) if total_orders > 0 else 0,
            'generated_at': db.func.now(),
            'generated_by': current_user_id
        }
        
        return jsonify({
            'statistics': statistics,
            'cache_info': {
                'ttl': 1800,
                'cached': False  # First request won't be cached
            },
            'audit_info': {
                'action_logged': True,
                'sensitivity_level': 'high'
            }
        }), 200
        
    except Exception as e:
        return jsonify({'error': f'Failed to retrieve statistics: {str(e)}'}), 500

@fuel_order_enhanced_bp.route('/bulk-assign', methods=['POST'])
@require_permission_v2('edit_fuel_order',
                      resource_context={
                          'type': 'fuel_order',
                          'custom_validators': [
                              lambda user, ctx: len(request.get_json().get('order_ids', [])) <= 50  # Max 50 orders
                          ]
                      })
def bulk_assign_orders():
    """
    Enhanced bulk assignment with custom validators.
    Demonstrates custom validation in resource context.
    """
    try:
        data = request.get_json()
        if not data or 'order_ids' not in data or 'assigned_lst_id' not in data:
            return jsonify({'error': 'order_ids and assigned_lst_id are required'}), 400
        
        order_ids = data['order_ids']
        assigned_lst_id = data['assigned_lst_id']
        
        # Custom validator ensures max 50 orders (already checked by decorator)
        if len(order_ids) > 50:
            return jsonify({'error': 'Cannot assign more than 50 orders at once'}), 400
        
        # Bulk update orders
        updated_count = FuelOrder.query.filter(
            FuelOrder.id.in_(order_ids)
        ).update({
            'assigned_lst_id': assigned_lst_id,
            'last_updated': db.func.now(),
            'updated_by_id': get_jwt_identity()
        }, synchronize_session=False)
        
        db.session.commit()
        
        return jsonify({
            'message': f'Successfully assigned {updated_count} orders',
            'updated_count': updated_count,
            'assigned_to': assigned_lst_id,
            'custom_validation': {
                'max_orders_check': 'passed',
                'orders_requested': len(order_ids)
            }
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Failed to bulk assign orders: {str(e)}'}), 500

# Error handlers for enhanced routes
@fuel_order_enhanced_bp.errorhandler(403)
def enhanced_permission_denied(error):
    """Enhanced permission denied handler with detailed context."""
    return jsonify({
        'error': 'Permission denied',
        'message': 'You do not have sufficient permissions for this action',
        'enhancement_info': {
            'using_enhanced_auth': True,
            'resource_context_available': hasattr(g, 'permission_context'),
            'verified_permission': getattr(g, 'verified_permission', None),
            'access_method': getattr(g, 'access_method', None)
        }
    }), 403

@fuel_order_enhanced_bp.errorhandler(401) 
def enhanced_auth_required(error):
    """Enhanced authentication required handler."""
    return jsonify({
        'error': 'Authentication required',
        'message': 'You must be logged in to access this resource',
        'enhancement_info': {
            'using_enhanced_auth': True,
            'caching_enabled': True
        }
    }), 401 