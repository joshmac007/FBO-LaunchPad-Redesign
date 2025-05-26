from flask import request, jsonify, current_app
from marshmallow import ValidationError
from ...services.user_service import UserService
from ...services.fuel_order_service import FuelOrderService
from src.utils.decorators import token_required, require_permission
from ...models.user import UserRole
from ...schemas.user_schemas import (
    UserDetailSchema,
    UserUpdateRequestSchema,
    ErrorResponseSchema
)
from .routes import admin_bp
from datetime import datetime, timedelta
from sqlalchemy import func, desc
from ...models.fuel_order import FuelOrder, FuelOrderStatus
from ...models.user import User
from ...extensions import db

@admin_bp.route('/lsts', methods=['GET', 'OPTIONS'])
@token_required
@require_permission('MANAGE_USERS')
def get_lsts():
    """Get a list of all LSTs with performance metrics.
    Returns LST users with enhanced performance data.
    ---
    tags:
      - LST Management
    security:
      - bearerAuth: []
    parameters:
      - in: query
        name: status
        schema:
          type: string
          enum: [active, inactive, on_leave, all]
        required: false
        description: Filter LSTs by status (default: all)
      - in: query
        name: shift
        schema:
          type: string
          enum: [day, swing, night, all]
        required: false
        description: Filter LSTs by shift (default: all)
    responses:
      200:
        description: List of LSTs retrieved successfully
        content:
          application/json:
            schema:
              type: object
              properties:
                lsts:
                  type: array
                  items:
                    type: object
                    properties:
                      id:
                        type: integer
                      name:
                        type: string
                      email:
                        type: string
                      employee_id:
                        type: string
                      status:
                        type: string
                        enum: [active, inactive, on_leave]
                      shift:
                        type: string
                        enum: [day, swing, night]
                      certifications:
                        type: array
                        items:
                          type: string
                      performance_rating:
                        type: number
                      orders_completed:
                        type: integer
                      average_time:
                        type: number
                      last_active:
                        type: string
                        format: date-time
                      hire_date:
                        type: string
                        format: date-time
                message:
                  type: string
      401:
        description: Unauthorized
      403:
        description: Forbidden (missing permission)
      500:
        description: Server error
    """
    if request.method == 'OPTIONS':
        return jsonify({'message': 'OPTIONS request successful'}), 200
    
    try:
        # Get query parameters
        status_filter = request.args.get('status', 'all')
        shift_filter = request.args.get('shift', 'all')
        
        # Build filters for user service
        filters = {'role': 'Line Service Technician'}
        
        # Handle status filter
        if status_filter != 'all':
            if status_filter == 'active':
                filters['is_active'] = True
            elif status_filter == 'inactive':
                filters['is_active'] = False
            # on_leave would need custom field, for now treat as active
            elif status_filter == 'on_leave':
                filters['is_active'] = True  # Will need custom field later
        
        # Get LST users
        users, message, status_code = UserService.get_users(filters)
        
        if status_code != 200:
            return jsonify({"error": message}), status_code
        
        # Enhance each LST with performance data
        enhanced_lsts = []
        for user in users:
            # Calculate performance metrics
            performance_data = _calculate_lst_performance(user.id)
            
            # Create enhanced LST object using real database fields
            lst_data = {
                "id": user.id,
                "name": user.name or user.username,
                "email": user.email,
                "employee_id": user.employee_id or f"LST{user.id:03d}",
                "status": user.status or ("active" if user.is_active else "inactive"),
                "shift": user.shift or 'day',
                "certifications": user.certifications or ["Fuel Safety", "Aircraft Ground Support"],
                "performance_rating": user.performance_rating or performance_data['performance_rating'],
                "orders_completed": user.orders_completed or performance_data['orders_completed'],
                "average_time": user.average_time or performance_data['average_time'],
                "last_active": (user.last_active.isoformat() if user.last_active else 
                              performance_data['last_active'].isoformat() if performance_data['last_active'] else 
                              user.updated_at.isoformat()),
                "hire_date": user.hire_date.isoformat() if user.hire_date else user.created_at.isoformat()
            }
            
            # Apply shift filter if specified
            if shift_filter != 'all' and lst_data['shift'] != shift_filter:
                continue
                
            enhanced_lsts.append(lst_data)
        
        return jsonify({
            "lsts": enhanced_lsts,
            "message": f"Retrieved {len(enhanced_lsts)} LSTs successfully"
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"Error in get_lsts: {str(e)}")
        return jsonify({"error": "Failed to retrieve LSTs"}), 500

@admin_bp.route('/lsts', methods=['POST'])
@token_required
@require_permission('MANAGE_USERS')
def create_lst():
    """Create a new LST user.
    Creates a new user with LST role and additional LST-specific fields.
    ---
    tags:
      - LST Management
    security:
      - bearerAuth: []
    requestBody:
      required: true
      content:
        application/json:
          schema:
            type: object
            required:
              - name
              - email
              - password
            properties:
              name:
                type: string
              email:
                type: string
                format: email
              password:
                type: string
                minLength: 8
              employee_id:
                type: string
              shift:
                type: string
                enum: [day, swing, night]
                default: day
              certifications:
                type: array
                items:
                  type: string
    responses:
      201:
        description: LST created successfully
      400:
        description: Bad Request
      409:
        description: Conflict (email already exists)
      500:
        description: Server error
    """
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "No data provided"}), 400
        
        # Get LST role ID
        from ...models.role import Role
        lst_role = Role.query.filter_by(name='Line Service Technician').first()
        if not lst_role:
            return jsonify({"error": "Line Service Technician role not found"}), 500
        
        # Prepare user data with LST role
        user_data = {
            'name': data.get('name'),
            'email': data.get('email'),
            'password': data.get('password'),
            'username': data.get('email'),  # Use email as username
            'role_ids': [lst_role.id]  # Assign LST role using role ID
        }
        
        # Create the user
        user, message, status_code = UserService.create_user(user_data)
        
        if status_code != 201:
            return jsonify({"error": message}), status_code
        
        # Update LST-specific fields now that user is created
        try:
            # Set LST-specific fields
            user.employee_id = data.get('employee_id', f"LST{user.id:03d}")
            user.status = 'active'
            user.shift = data.get('shift', 'day')
            user.certifications = data.get('certifications', ["Fuel Safety", "Aircraft Ground Support"])
            user.performance_rating = 0.0
            user.orders_completed = 0
            user.average_time = 0.0
            user.last_active = datetime.utcnow()
            user.hire_date = user.created_at
            
            db.session.commit()
            
        except Exception as e:
            current_app.logger.error(f"Error setting LST fields: {str(e)}")
            # Continue with default values if field update fails
        
        lst_data = {
            "id": user.id,
            "name": user.name,
            "email": user.email,
            "employee_id": user.employee_id or f"LST{user.id:03d}",
            "status": user.status or "active",
            "shift": user.shift or 'day',
            "certifications": user.certifications or ["Fuel Safety", "Aircraft Ground Support"],
            "performance_rating": user.performance_rating or 0.0,
            "orders_completed": user.orders_completed or 0,
            "average_time": user.average_time or 0.0,
            "last_active": user.last_active.isoformat() if user.last_active else datetime.utcnow().isoformat(),
            "hire_date": user.hire_date.isoformat() if user.hire_date else user.created_at.isoformat()
        }
        
        return jsonify({
            "lst": lst_data,
            "message": "LST created successfully"
        }), 201
        
    except Exception as e:
        current_app.logger.error(f"Error in create_lst: {str(e)}")
        return jsonify({"error": "Failed to create LST"}), 500

@admin_bp.route('/lsts/<int:lst_id>', methods=['GET'])
@token_required
@require_permission('MANAGE_USERS')
def get_lst(lst_id):
    """Get LST details by ID.
    Returns detailed LST information including performance metrics.
    """
    try:
        # Get user and verify it's an LST
        user, message, status_code = UserService.get_user_by_id(lst_id)
        
        if status_code != 200:
            return jsonify({"error": message}), status_code
        
        # Verify user has LST role
        if not any(role.name == 'Line Service Technician' for role in user.roles):
            return jsonify({"error": "User is not an LST"}), 400
        
        # Get performance data
        performance_data = _calculate_lst_performance(user.id)
        
        lst_data = {
            "id": user.id,
            "name": user.name or user.username,
            "email": user.email,
            "employee_id": user.employee_id or f"LST{user.id:03d}",
            "status": user.status or ("active" if user.is_active else "inactive"),
            "shift": user.shift or 'day',
            "certifications": user.certifications or ["Fuel Safety", "Aircraft Ground Support"],
            "performance_rating": user.performance_rating or performance_data['performance_rating'],
            "orders_completed": user.orders_completed or performance_data['orders_completed'],
            "average_time": user.average_time or performance_data['average_time'],
            "last_active": (user.last_active.isoformat() if user.last_active else 
                          performance_data['last_active'].isoformat() if performance_data['last_active'] else 
                          user.updated_at.isoformat()),
            "hire_date": user.hire_date.isoformat() if user.hire_date else user.created_at.isoformat()
        }
        
        return jsonify({
            "lst": lst_data,
            "message": "LST retrieved successfully"
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"Error in get_lst: {str(e)}")
        return jsonify({"error": "Failed to retrieve LST"}), 500

@admin_bp.route('/lsts/<int:lst_id>', methods=['PATCH'])
@token_required
@require_permission('MANAGE_USERS')
def update_lst(lst_id):
    """Update LST details.
    Updates LST-specific fields and user information.
    """
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "No data provided"}), 400
        
        # Get current user and verify it's an LST
        user, message, status_code = UserService.get_user_by_id(lst_id)
        if status_code != 200:
            return jsonify({"error": message}), status_code
        
        # Verify user has LST role
        if not any(role.name == 'Line Service Technician' for role in user.roles):
            return jsonify({"error": "User is not an LST"}), 400
        
        # Prepare user update data (basic fields)
        user_update_data = {}
        if 'name' in data:
            user_update_data['name'] = data['name']
        if 'email' in data:
            user_update_data['email'] = data['email']
        if 'status' in data:
            # Map LST status to user is_active
            if data['status'] == 'active':
                user_update_data['is_active'] = True
            elif data['status'] == 'inactive':
                user_update_data['is_active'] = False
            # TODO: Handle 'on_leave' status when model is extended
        
        # Update user if there are user fields to update
        if user_update_data:
            user, message, status_code = UserService.update_user(lst_id, user_update_data)
            if status_code != 200:
                return jsonify({"error": message}), status_code
        
        # Update LST-specific fields
        try:
            lst_fields_updated = False
            
            if 'employee_id' in data:
                user.employee_id = data['employee_id']
                lst_fields_updated = True
            if 'shift' in data:
                user.shift = data['shift']
                lst_fields_updated = True
            if 'certifications' in data:
                user.certifications = data['certifications']
                lst_fields_updated = True
            if 'status' in data and data['status'] == 'on_leave':
                user.status = 'on_leave'
                lst_fields_updated = True
            elif 'status' in data:
                # Active/inactive handled above in user_update_data
                user.status = data['status']
                lst_fields_updated = True
                
            if lst_fields_updated:
                db.session.commit()
                
        except Exception as e:
            current_app.logger.error(f"Error updating LST fields: {str(e)}")
            # Continue with existing values if update fails
        
        # Get updated performance data
        performance_data = _calculate_lst_performance(user.id)
        
        lst_data = {
            "id": user.id,
            "name": user.name or user.username,
            "email": user.email,
            "employee_id": user.employee_id or f"LST{user.id:03d}",
            "status": user.status or ("active" if user.is_active else "inactive"),
            "shift": user.shift or 'day',
            "certifications": user.certifications or ["Fuel Safety", "Aircraft Ground Support"],
            "performance_rating": user.performance_rating or performance_data['performance_rating'],
            "orders_completed": user.orders_completed or performance_data['orders_completed'],
            "average_time": user.average_time or performance_data['average_time'],
            "last_active": (user.last_active.isoformat() if user.last_active else 
                          performance_data['last_active'].isoformat() if performance_data['last_active'] else 
                          user.updated_at.isoformat()),
            "hire_date": user.hire_date.isoformat() if user.hire_date else user.created_at.isoformat()
        }
        
        return jsonify({
            "lst": lst_data,
            "message": "LST updated successfully"
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"Error in update_lst: {str(e)}")
        return jsonify({"error": "Failed to update LST"}), 500

@admin_bp.route('/lsts/<int:lst_id>', methods=['DELETE'])
@token_required
@require_permission('MANAGE_USERS')
def delete_lst(lst_id):
    """Delete (deactivate) an LST.
    Soft deletes the LST by deactivating the user account.
    """
    try:
        # Verify user exists and is an LST
        user, message, status_code = UserService.get_user_by_id(lst_id)
        if status_code != 200:
            return jsonify({"error": message}), status_code
        
        # Verify user has LST role
        if not any(role.name == 'Line Service Technician' for role in user.roles):
            return jsonify({"error": "User is not an LST"}), 400
        
        # Delete the user (soft delete)
        success, message, status_code = UserService.delete_user(lst_id)
        
        if success:
            return jsonify({"message": "LST deactivated successfully"}), status_code
        else:
            return jsonify({"error": message}), status_code
            
    except Exception as e:
        current_app.logger.error(f"Error in delete_lst: {str(e)}")
        return jsonify({"error": "Failed to delete LST"}), 500

@admin_bp.route('/lsts/stats', methods=['GET'])
@token_required
@require_permission('MANAGE_USERS')
def get_lst_stats():
    """Get LST statistics and aggregated performance metrics.
    Returns summary statistics for all LSTs.
    """
    try:
        # Get all LST users
        filters = {'role': 'Line Service Technician'}
        users, message, status_code = UserService.get_users(filters)
        
        if status_code != 200:
            return jsonify({"error": message}), status_code
        
        # Calculate aggregate statistics
        total_lsts = len(users)
        active_lsts = len([u for u in users if u.is_active])
        
        # Calculate average performance
        total_performance = 0
        total_orders = 0
        total_time = 0
        active_count = 0
        
        for user in users:
            if user.is_active:
                performance_data = _calculate_lst_performance(user.id)
                if performance_data['orders_completed'] > 0:
                    total_performance += performance_data['performance_rating']
                    total_orders += performance_data['orders_completed']
                    total_time += performance_data['average_time']
                    active_count += 1
        
        avg_performance = total_performance / active_count if active_count > 0 else 0
        avg_orders = total_orders / active_count if active_count > 0 else 0
        avg_time = total_time / active_count if active_count > 0 else 0
        
        stats = {
            "total_lsts": total_lsts,
            "active_lsts": active_lsts,
            "inactive_lsts": total_lsts - active_lsts,
            "average_performance_rating": round(avg_performance, 2),
            "total_orders_completed": total_orders,
            "average_orders_per_lst": round(avg_orders, 1),
            "average_completion_time": round(avg_time, 1)
        }
        
        return jsonify({
            "stats": stats,
            "message": "LST statistics retrieved successfully"
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"Error in get_lst_stats: {str(e)}")
        return jsonify({"error": "Failed to retrieve LST statistics"}), 500

# Helper functions
def _calculate_lst_performance(lst_id):
    """Calculate performance metrics for an LST."""
    try:
        # Get completed orders for this LST
        completed_orders = db.session.query(FuelOrder).filter(
            FuelOrder.assigned_lst_user_id == lst_id,
            FuelOrder.status == FuelOrderStatus.COMPLETED
        ).all()
        
        orders_completed = len(completed_orders)
        
        if orders_completed == 0:
            return {
                'performance_rating': 0.0,
                'orders_completed': 0,
                'average_time': 0,
                'last_active': None
            }
        
        # Calculate average completion time (placeholder calculation)
        # In a real system, you'd track start/end times
        total_time = sum(15 + (i * 2) for i in range(orders_completed))  # Mock calculation
        average_time = total_time / orders_completed
        
        # Calculate performance rating based on completion rate and time
        # This is a simplified calculation
        performance_rating = min(5.0, 3.0 + (orders_completed / 50) + (1 / (average_time / 15)))
        
        # Get last activity (most recent completed order)
        last_active = None
        if completed_orders:
            last_order = max(completed_orders, key=lambda x: x.updated_at)
            last_active = last_order.updated_at
        
        # Update user's performance fields in database
        try:
            user = User.query.get(lst_id)
            if user:
                user.performance_rating = round(performance_rating, 1)
                user.orders_completed = orders_completed
                user.average_time = round(average_time, 1)
                if last_active:
                    user.last_active = last_active
                db.session.commit()
        except Exception as e:
            current_app.logger.error(f"Error updating performance fields for user {lst_id}: {str(e)}")
        
        return {
            'performance_rating': round(performance_rating, 1),
            'orders_completed': orders_completed,
            'average_time': round(average_time, 1),
            'last_active': last_active
        }
        
    except Exception as e:
        current_app.logger.error(f"Error calculating LST performance for {lst_id}: {str(e)}")
        return {
            'performance_rating': 0.0,
            'orders_completed': 0,
            'average_time': 0,
            'last_active': None
        }

def _get_lst_status(user):
    """Get LST status based on user data."""
    if user.status:
        return user.status
    if not user.is_active:
        return "inactive"
    return "active"

def _get_lst_certifications(user):
    """Get LST certifications."""
    if user.certifications:
        return user.certifications
    # Return default certifications if none set
    return ["Fuel Safety", "Aircraft Ground Support"] 