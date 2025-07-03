from datetime import datetime, timedelta
from decimal import Decimal
import csv
import io
from typing import List, Dict, Any, Optional, Tuple
from sqlalchemy import and_, or_, desc, asc, func
from sqlalchemy.orm import joinedload
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from src.models import (
    FuelOrder, 
    FuelOrderStatus, 
    Aircraft, 
    User,
    FuelTruck,
    Customer,
    Permission,
    PermissionGroup,
    UserPermission,
    AuditLog,
    Role
)
from src.models.user_permission_group import UserPermissionGroup
from src.extensions import db
from src.services.aircraft_service import AircraftService
from flask import current_app
import logging
import traceback

logger = logging.getLogger(__name__)

class FuelOrderService:
    @classmethod
    def get_order_status_counts(cls, current_user):
        """
        Calculate and return counts of fuel orders by status groups for dashboard cards.
        PBAC: Permission-based, not role-based. Only users with 'VIEW_ORDER_STATS' permission should access this.
        Returns: (dict, message, status_code)
        """
        from src.models import FuelOrderStatus, FuelOrder
        from sqlalchemy import func, case, and_
        from src.extensions import db
        from datetime import datetime, date
        try:
            # PBAC: Permission check is handled by decorator, so no need to check here
            pending_statuses = [FuelOrderStatus.DISPATCHED]
            in_progress_statuses = [FuelOrderStatus.ACKNOWLEDGED, FuelOrderStatus.EN_ROUTE, FuelOrderStatus.FUELING]
            completed_statuses = [FuelOrderStatus.COMPLETED, FuelOrderStatus.REVIEWED]
            
            # Get today's date for completed_today calculation
            today = date.today()
            
            # Query for basic counts and completed today
            counts = db.session.query(
                func.count(case((FuelOrder.status.in_(pending_statuses), FuelOrder.id))).label('pending'),
                func.count(case((FuelOrder.status.in_(in_progress_statuses), FuelOrder.id))).label('in_progress'),
                func.count(case((FuelOrder.status.in_(completed_statuses), FuelOrder.id))).label('completed'),
                func.count(case((
                    and_(
                        FuelOrder.status.in_(completed_statuses),
                        func.date(FuelOrder.completion_timestamp) == today
                    ), 
                    FuelOrder.id
                ))).label('completed_today'),
                func.count(FuelOrder.id).label('total')
            ).one_or_none()
            
            result_counts = {
                'pending_count': counts[0] if counts else 0,
                'active_count': counts[1] if counts else 0,  # in_progress becomes active_count
                'completed_count': counts[2] if counts else 0,
                'completed_today': counts[3] if counts else 0,
                'total_orders': counts[4] if counts else 0,
                'in_progress_count': counts[1] if counts else 0,  # Keep for backward compatibility
                'avg_completion_time': 0,  # Placeholder for future implementation
                'status_distribution': {
                    'pending': counts[0] if counts else 0,
                    'in_progress': counts[1] if counts else 0,
                    'completed': counts[2] if counts else 0,
                }
            }
            return result_counts, "Status counts retrieved successfully.", 200
        except Exception as e:
            db.session.rollback()
            import logging
            logging.getLogger(__name__).error(f"Error retrieving fuel order status counts: {str(e)}")
            return None, f"Database error retrieving status counts: {str(e)}", 500

    @classmethod
    def get_status_counts(cls, current_user):
        """
        PBAC: Permission-based, not role-based. Only users with 'view_order_statistics' permission should access this.
        Returns: (dict, message, status_code)
        """
        try:
            return cls.get_order_status_counts(current_user)
        except Exception as e:
            import logging
            logging.getLogger(__name__).error(f"Error in get_status_counts: {str(e)}")
            return None, f"Internal error in get_status_counts: {str(e)}", 500

    @classmethod
    def create_fuel_order(cls, order_data: dict) -> Tuple[Optional[FuelOrder], Optional[str], Optional[int]]:
        """
        Create a new fuel order with comprehensive validation and auto-assignment logic.
        
        Args:
            order_data: Dictionary containing fuel order data
            
        Returns:
            Tuple of (FuelOrder, message, status_code)
        """
        from src.models import User, FuelOrder, FuelOrderStatus, Aircraft
        from src.extensions import db
        import logging
        logger = logging.getLogger(__name__)

        # Special values for auto-assignment
        AUTO_ASSIGN_LST_ID = -1
        AUTO_ASSIGN_TRUCK_ID = -1

        try:
            # --- Input validation ---
            if not order_data or not isinstance(order_data, dict):
                return None, "Invalid request data", 400

            # Required fields validation
            base_required_fields = {
                'tail_number': str,
                'fuel_type': str,
                'assigned_lst_user_id': int,
                'assigned_truck_id': int,
            }

            # Validate requested_amount separately for robust conversion
            if 'requested_amount' not in order_data:
                return None, "Missing required field: requested_amount", 400
            
            try:
                order_data['requested_amount'] = float(order_data['requested_amount'])
                if order_data['requested_amount'] <= 0:
                    return None, "Invalid value for requested_amount: must be a positive number", 400
            except (ValueError, TypeError):
                return None, "Invalid type for field: requested_amount (must be a valid number)", 400

            # Validate base required fields
            for field, field_type in base_required_fields.items():
                if field not in order_data:
                    return None, f"Missing required field: {field}", 400
                
                if field == 'assigned_lst_user_id':
                    try:
                        order_data[field] = int(order_data[field])
                        if order_data[field] != AUTO_ASSIGN_LST_ID and order_data[field] <= 0:
                            return None, f"Invalid ID for field: {field}", 400
                    except Exception:
                        return None, f"Invalid type for field: {field} (must be integer or {AUTO_ASSIGN_LST_ID})", 400
                elif field == 'assigned_truck_id':
                    try:
                        order_data[field] = int(order_data[field])
                        if order_data[field] != AUTO_ASSIGN_TRUCK_ID and order_data[field] <= 0:
                            return None, f"Invalid ID for field: {field}", 400
                    except Exception:
                        return None, f"Invalid type for field: {field} (must be integer or {AUTO_ASSIGN_TRUCK_ID})", 400
                else:
                    if not isinstance(order_data[field], field_type):
                        return None, f"Invalid type for field: {field}", 400
                    if field_type == str and not order_data[field].strip():
                        return None, f"Field {field} cannot be empty", 400

            # --- Check if any users exist ---
            user_count = User.query.count()
            if user_count == 0:
                return None, "No users exist in the system. Please create an ADMIN user via the CLI or database to access the admin panel and create LST users.", 400

            # --- Aircraft handling (get or create) ---
            tail_number = order_data['tail_number']
            aircraft_data = {
                'tail_number': tail_number,
                'aircraft_type': order_data.get('aircraft_type', 'Unknown'),
                'fuel_type': order_data['fuel_type']
            }
            
            aircraft, aircraft_message, aircraft_status, aircraft_created = AircraftService.get_or_create_aircraft(aircraft_data)
            
            if not aircraft:
                logger.error(f"Failed to get or create aircraft {tail_number}: {aircraft_message}")
                return None, f"Failed to process aircraft {tail_number}: {aircraft_message}", aircraft_status

            if aircraft_created:
                logger.info(f"Created new aircraft during fuel order creation: {tail_number}")
            else:
                logger.info(f"Using existing aircraft for fuel order: {tail_number}")
                # Update aircraft fuel type if it differs from the order (for existing aircraft)
                if aircraft.fuel_type != order_data['fuel_type']:
                    logger.info(f"Updating fuel_type for existing aircraft {aircraft.tail_number} from {aircraft.fuel_type} to {order_data['fuel_type']}.")
                    updated_aircraft, msg, update_status = AircraftService.update_aircraft(aircraft.tail_number, {'fuel_type': order_data['fuel_type']})
                    if update_status != 200:
                        logger.warning(f"Could not update fuel_type for aircraft {aircraft.tail_number}: {msg}")
                    else:
                        aircraft = updated_aircraft

            # --- LST Assignment Logic ---
            assigned_lst_user_id = order_data.get('assigned_lst_user_id')
            if assigned_lst_user_id == AUTO_ASSIGN_LST_ID:
                # Find the LST with the fewest active orders in a single, efficient query.
                active_statuses = [
                    FuelOrderStatus.DISPATCHED,
                    FuelOrderStatus.ACKNOWLEDGED,
                    FuelOrderStatus.EN_ROUTE,
                    FuelOrderStatus.FUELING,
                ]

                # Subquery to get active order counts per LST.
                subquery = db.session.query(
                    FuelOrder.assigned_lst_user_id,
                    func.count(FuelOrder.id).label('active_orders_count')
                ).filter(
                    FuelOrder.status.in_(active_statuses)
                ).group_by(
                    FuelOrder.assigned_lst_user_id
                ).subquery()

                # Get the LST role.
                lst_role = Role.query.filter_by(name='Line Service Technician').first()
                if not lst_role:
                    return None, "Configuration error: 'Line Service Technician' role not found.", 500

                # LEFT JOIN active LSTs with their order counts.
                # COALESCE is used to treat NULL counts (for LSTs with no orders) as 0.
                least_busy_lst_query_result = db.session.query(
                    User,
                    func.coalesce(subquery.c.active_orders_count, 0).label('order_count')
                ).join(
                    User.roles  # type: ignore
                ).filter(
                    Role.id == lst_role.id,
                    User.is_active == True
                ).outerjoin(
                    subquery, User.id == subquery.c.assigned_lst_user_id
                ).order_by(
                    func.coalesce(subquery.c.active_orders_count, 0).asc()
                ).first()

                if not least_busy_lst_query_result:
                    return None, "No active Line Service Technicians are available for auto-assignment.", 400

                assigned_lst_user_id = least_busy_lst_query_result.User.id
            else:
                if assigned_lst_user_id is None:
                    return None, "assigned_lst_user_id cannot be null when not auto-assigning", 400
                # Validate the specified LST if not auto-assigning.
                lst_user, error_msg = cls.validate_lst_assignment(assigned_lst_user_id)
                if error_msg:
                    return None, error_msg, 400

            # --- Truck Assignment Logic ---
            assigned_truck_id = order_data['assigned_truck_id']
            if assigned_truck_id == AUTO_ASSIGN_TRUCK_ID:
                # Get the first active truck for simplicity
                # Future enhancement: more sophisticated selection logic
                active_truck = FuelTruck.query.filter(FuelTruck.is_active == True).first()
                
                if not active_truck:
                    return None, "No active FuelTrucks available for auto-assignment", 400
                
                assigned_truck_id = active_truck.id
                logger.info(f"Auto-assigned FuelTruck ID {active_truck.id} (Name: {getattr(active_truck, 'name', 'N/A')}).")
            else:
                # Validate the specified truck
                truck = FuelTruck.query.get(assigned_truck_id)
                if not truck:
                    return None, f"Fuel truck with ID {assigned_truck_id} not found.", 400
                if not truck.is_active:
                    return None, f"Fuel truck {assigned_truck_id} is not active.", 400

            # --- Optional fields validation ---
            optional_fields = {
                'customer_id': int,
                'additive_requested': bool,
                'csr_notes': str,
                'location_on_ramp': str
            }
            
            for field, field_type in optional_fields.items():
                if field in order_data:
                    try:
                        if field_type == int:
                            if order_data[field] is not None:
                                order_data[field] = int(order_data[field])
                        elif field_type == bool and not isinstance(order_data[field], bool):
                            order_data[field] = bool(order_data[field])
                        elif field_type == str and order_data[field] is not None and not isinstance(order_data[field], str):
                            order_data[field] = str(order_data[field])
                    except (ValueError, TypeError):
                        return None, f"Invalid type for field {field}. Expected {field_type.__name__}", 400

            # --- Customer validation (if provided) ---
            customer_id = order_data.get('customer_id')
            if customer_id:
                customer = Customer.query.get(customer_id)
                if not customer:
                    return None, f"Customer with ID {customer_id} not found.", 400

            # --- Create and commit the FuelOrder ---
            new_fuel_order = FuelOrder()
            new_fuel_order.tail_number = tail_number
            new_fuel_order.customer_id = order_data.get('customer_id')
            new_fuel_order.fuel_type = order_data['fuel_type']
            new_fuel_order.additive_requested = order_data.get('additive_requested', False)
            new_fuel_order.requested_amount = Decimal(order_data['requested_amount'])
            new_fuel_order.assigned_lst_user_id = assigned_lst_user_id
            new_fuel_order.assigned_truck_id = assigned_truck_id
            new_fuel_order.location_on_ramp = order_data.get('location_on_ramp')
            new_fuel_order.csr_notes = order_data.get('csr_notes')
            new_fuel_order.priority = order_data.get('priority', 'NORMAL').upper()

            db.session.add(new_fuel_order)
            db.session.commit()

            logger.info(f"Successfully created fuel order {new_fuel_order.id}")
            return new_fuel_order, "Fuel order created successfully", 201
            
        except Exception as e:
            db.session.rollback()
            logger.error(f"Error creating fuel order: {str(e)} traceback: {traceback.format_exc()}")
            return None, f"Error creating fuel order: {str(e)}", 500

    @classmethod
    def get_fuel_orders(
        cls,
        current_user: User,
        filters: Optional[Dict[str, Any]] = None
    ) -> Tuple[Optional[Any], str]:
        """
        Retrieve paginated fuel orders based on user PBAC and optional filters.
        PBAC: If user lacks 'view_all_orders', only show orders assigned to them.
        Optimized with eager loading for denormalized fields.
        """
        logger = logging.getLogger(__name__)
        try:
            logger.info(f"[FuelOrderService.get_fuel_orders] User: {getattr(current_user, 'id', None)} | Filters: {filters}")
            
            # Use eager loading for optimization of denormalized fields
            query = FuelOrder.query.options(
                joinedload(FuelOrder.assigned_lst),  # type: ignore
                joinedload(FuelOrder.assigned_truck),  # type: ignore
                joinedload(FuelOrder.customer),  # type: ignore
                joinedload(FuelOrder.aircraft)  # type: ignore
            )

            # PBAC: Only show all orders if user has permission
            if not current_user.has_permission('view_all_orders'):
                # For fuelers (with access_fueler_dashboard), show unassigned orders + their assigned orders
                if current_user.has_permission('access_fueler_dashboard'):
                    query = query.filter(
                        db.or_(
                            FuelOrder.assigned_lst_user_id == current_user.id,  # Their assigned orders
                            FuelOrder.assigned_lst_user_id == None  # Unassigned orders available for claiming
                        )
                    )
                else:
                    # For other users, only see their assigned orders
                    query = query.filter(FuelOrder.assigned_lst_user_id == current_user.id)

            # Apply filtering based on request parameters
            if filters:
                status_filter = filters.get('status')
                if status_filter:
                    try:
                        status_enum = FuelOrderStatus[status_filter.upper()]
                        query = query.filter(FuelOrder.status == status_enum)
                    except KeyError:
                        return None, f"Invalid status value provided: {status_filter}"
                
                # Add additional filter implementations
                customer_id = filters.get('customer_id')
                if customer_id:
                    try:
                        query = query.filter(FuelOrder.customer_id == int(customer_id))
                    except (ValueError, TypeError):
                        return None, f"Invalid customer_id value provided: {customer_id}"
                
                priority = filters.get('priority')
                if priority:
                    query = query.filter(FuelOrder.priority == priority.upper())
                
                fuel_type = filters.get('fuel_type')
                if fuel_type:
                    query = query.filter(FuelOrder.fuel_type == fuel_type)
                
                start_date = filters.get('start_date')
                if start_date:
                    try:
                        start_datetime = datetime.fromisoformat(start_date.replace('Z', '+00:00'))
                        query = query.filter(FuelOrder.created_at >= start_datetime)
                    except ValueError:
                        return None, f"Invalid start_date format provided: {start_date}"
                
                end_date = filters.get('end_date')
                if end_date:
                    try:
                        end_datetime = datetime.fromisoformat(end_date.replace('Z', '+00:00'))
                        query = query.filter(FuelOrder.created_at <= end_datetime)
                    except ValueError:
                        return None, f"Invalid end_date format provided: {end_date}"
                
                assigned_lst_user_id = filters.get('assigned_lst_user_id')
                if assigned_lst_user_id:
                    try:
                        query = query.filter(FuelOrder.assigned_lst_user_id == int(assigned_lst_user_id))
                    except (ValueError, TypeError):
                        return None, f"Invalid assigned_lst_user_id value provided: {assigned_lst_user_id}"
                
                assigned_truck_id = filters.get('assigned_truck_id')
                if assigned_truck_id:
                    try:
                        query = query.filter(FuelOrder.assigned_truck_id == int(assigned_truck_id))
                    except (ValueError, TypeError):
                        return None, f"Invalid assigned_truck_id value provided: {assigned_truck_id}"

            try:
                page = int(filters.get('page', 1)) if filters else 1
                per_page = int(filters.get('per_page', 20)) if filters else 20
                if page < 1:
                    page = 1
                if per_page < 1:
                    per_page = 20
                if per_page > 100:
                    per_page = 100
            except (ValueError, TypeError):
                page = 1
                per_page = 20

            try:
                paginated_orders = query.order_by(FuelOrder.created_at.desc()).paginate(
                    page=page,
                    per_page=per_page,
                    error_out=False
                )
                return paginated_orders, "Orders retrieved successfully"
            except Exception as e:
                current_app.logger.error(f"Error retrieving fuel orders: {str(e)}")
                return None, f"Database error while retrieving orders: {str(e)}"
        except Exception as e:
            logger.error(f"Unhandled exception in FuelOrderService.get_fuel_orders: {str(e)}\n{traceback.format_exc()}")
            return None, f"An internal server error occurred in FuelOrderService.get_fuel_orders: {str(e)}"

    @classmethod
    def get_fuel_order_by_id(
        cls,
        order_id: int,
        current_user: User
    ) -> Tuple[Optional[FuelOrder], str, int]:
        """
        Retrieve a specific fuel order by ID after performing authorization checks.
        Optimized with eager loading for denormalized fields.
        
        Args:
            order_id (int): The ID of the order to retrieve
            current_user (User): The authenticated user making the request
            
        Returns:
            Tuple[Optional[FuelOrder], str, int]: A tuple containing:
                - The FuelOrder if successful, None if failed
                - A success/error message
                - HTTP status code (200, 403, 404)
        """
        # Use eager loading for optimization of denormalized fields
        order = FuelOrder.query.options(
            joinedload(FuelOrder.assigned_lst),  # type: ignore
            joinedload(FuelOrder.assigned_truck)  # type: ignore
        ).get(order_id)
        
        if not order:
            return None, f"Fuel order with ID {order_id} not found.", 404  # Not Found

        # Perform Authorization Check
        if not FuelOrderService.can_user_modify_order(current_user, order):
            return None, "Forbidden: You do not have permission to view this fuel order.", 403  # Forbidden

        # Return the order object
        return order, "Fuel order retrieved successfully.", 200  # OK

    @classmethod
    def update_order_status(
        cls,
        order_id: int,
        new_status: FuelOrderStatus,
        current_user: User
    ) -> Tuple[Optional[FuelOrder], str, int]:
        """
        Update the status of a fuel order after performing authorization checks.
        
        Args:
            order_id (int): The ID of the order to update
            new_status (FuelOrderStatus): The target status to update to
            current_user (User): The authenticated user performing the action
            
        Returns:
            Tuple[Optional[FuelOrder], str, int]: A tuple containing:
                - The updated FuelOrder if successful, None if failed
                - A success/error message
                - HTTP status code (200, 403, 404)
        """
        # Fetch the fuel order by ID
        order = FuelOrder.query.get(order_id)
        if not order:
            return None, f"Fuel order with ID {order_id} not found.", 404  # Not Found

        # Check if the user is the assigned LST for this order
        if not FuelOrderService.can_user_modify_order(current_user, order):
            return None, "Forbidden: You do not have permission to update this fuel order.", 403  # Forbidden

        # Define allowed transitions for LST updates via this endpoint
        allowed_transitions = {
            FuelOrderStatus.DISPATCHED: [FuelOrderStatus.ACKNOWLEDGED],
            FuelOrderStatus.ACKNOWLEDGED: [FuelOrderStatus.EN_ROUTE],
            FuelOrderStatus.EN_ROUTE: [FuelOrderStatus.FUELING]
            # Note: Fueling -> Completed will be handled by a separate 'complete_order' endpoint
            # Note: Cancellation will be handled by a separate endpoint with different permissions
        }

        # Validate the requested transition
        if order.status not in allowed_transitions or new_status not in allowed_transitions[order.status]:
            return None, f"Invalid status transition from {order.status.value} to {new_status.value}.", 400  # Bad Request

        try:
            # Update the order status
            order.status = new_status

            # Update corresponding timestamp field based on the new status
            if new_status == FuelOrderStatus.ACKNOWLEDGED:
                order.acknowledge_timestamp = datetime.utcnow()
            elif new_status == FuelOrderStatus.EN_ROUTE:
                order.en_route_timestamp = datetime.utcnow()
            elif new_status == FuelOrderStatus.FUELING:
                order.fueling_start_timestamp = datetime.utcnow()

            # Commit the changes
            db.session.commit()

            return order, f"Order status successfully updated to {new_status.value}.", 200  # OK

        except Exception as e:
            db.session.rollback()
            current_app.logger.error(f"Error updating fuel order status: {str(e)}")
            return None, f"Database error while updating order status: {str(e)}", 500  # Internal Server Error

    @classmethod
    def complete_fuel_order(
        cls,
        order_id: int,
        completion_data: Dict[str, Any],
        current_user: User
    ) -> Tuple[Optional[FuelOrder], str, int]:
        """
        Complete a fuel order by updating its status and recording completion details.
        
        Args:
            order_id (int): The ID of the order to complete
            completion_data (Dict[str, Any]): Dictionary containing completion details
                Required keys:
                - start_meter_reading (str/Decimal): Starting meter reading
                - end_meter_reading (str/Decimal): Ending meter reading
                Optional keys:
                - lst_notes (str): Additional notes from the LST
            current_user (User): The authenticated user performing the action
            
        Returns:
            Tuple[Optional[FuelOrder], str, int]: A tuple containing:
                - The updated FuelOrder if successful, None if failed
                - A success/error message
                - HTTP status code (200, 400, 403, 404)
        """
        # Fetch the fuel order by ID
        order = FuelOrder.query.get(order_id)
        if not order:
            return None, f"Fuel order with ID {order_id} not found.", 404  # Not Found

        # Perform Authorization Check: Ensure the user is the assigned LST
        if not FuelOrderService.can_user_complete_order(current_user, order):
            # Also allow Admin/CSR maybe? For MVP, let's stick to LST.
            return None, "Forbidden: Only the assigned LST can complete this fuel order.", 403  # Forbidden

        # Perform Status Check: Ensure the order is in a state ready for completion
        if order.status != FuelOrderStatus.FUELING:
            # We could allow completion from other states like EN_ROUTE, ACKNOWLEDGED
            # but requiring FUELING enforces the workflow more strictly.
            return None, f"Order cannot be completed from its current status ({order.status.value}). Must be 'Fueling'.", 400  # Bad Request

        # Extract and validate meter readings
        try:
            start_meter = Decimal(completion_data['start_meter_reading'])
            end_meter = Decimal(completion_data['end_meter_reading'])
            if end_meter < start_meter:
                return None, "End meter reading cannot be less than start meter reading.", 400  # Bad Request
            # Add checks for negative values if necessary
            if start_meter < 0 or end_meter < 0:
                return None, "Meter readings cannot be negative.", 400
        except (KeyError, ValueError, TypeError):
            return None, "Invalid or missing meter reading values.", 400

        lst_notes = completion_data.get('lst_notes')  # Optional notes

        # Calculate gallons dispensed
        gallons_dispensed = end_meter - start_meter

        # Update order fields
        order.start_meter_reading = start_meter
        order.end_meter_reading = end_meter
        order.calculated_gallons_dispensed = gallons_dispensed
        order.lst_notes = lst_notes  # Update notes (will be None if not provided)
        order.status = FuelOrderStatus.COMPLETED  # Set status to Completed
        order.completion_timestamp = datetime.utcnow()  # Record completion time

        try:
            db.session.commit()
            return order, "Fuel order completed successfully.", 200  # OK
        except Exception as e:
            db.session.rollback()
            current_app.logger.error(f"Error completing fuel order: {str(e)}")
            return None, f"Database error while completing order: {str(e)}", 500  # Internal Server Error

    @classmethod
    def review_fuel_order(
        cls,
        order_id: int,
        reviewer_user: User
    ) -> Tuple[Optional[FuelOrder], str, int]:
        """
        Review a completed fuel order.
        
        Args:
            order_id (int): The ID of the order to review
            reviewer_user (User): The authenticated CSR or Admin user performing the review
            
        Returns:
            Tuple[Optional[FuelOrder], str, int]: A tuple containing:
                - The updated FuelOrder if successful, None if failed
                - A success/error message
                - HTTP status code (200, 400, 404)
        """
        # Fetch the fuel order by ID
        order = FuelOrder.query.get(order_id)
        if not order:
            return None, f"Fuel order with ID {order_id} not found.", 404  # Not Found

        # Perform Status Check: Ensure the order is 'COMPLETED' before it can be reviewed
        if order.status != FuelOrderStatus.COMPLETED:
            return None, f"Order cannot be reviewed. Current status is '{order.status.value}', must be 'Completed'.", 400  # Bad Request

        # Update order fields with review information
        order.status = FuelOrderStatus.REVIEWED
        order.reviewed_by_csr_user_id = reviewer_user.id
        order.reviewed_timestamp = datetime.utcnow()

        try:
            db.session.commit()
            return order, "Fuel order marked as reviewed.", 200  # OK
        except Exception as e:
            db.session.rollback()
            current_app.logger.error(f"Error reviewing fuel order: {str(e)}")
            return None, f"Database error while marking order as reviewed: {str(e)}", 500  # Internal Server Error

    @classmethod
    def export_fuel_orders_to_csv(
        cls,
        current_user: User,
        filters: Optional[Dict[str, Any]] = None
    ) -> Tuple[Optional[str], str, int]:
        """
        Fetch fuel orders for CSV export based on filters and format them into a CSV string.
        
        Args:
            current_user (User): The authenticated user requesting the export
            filters (Optional[Dict[str, Any]]): Optional dictionary containing filter parameters
                - status (str): Override default REVIEWED status filter
                - date_from (str): Filter orders from this date (TODO)
                - date_to (str): Filter orders until this date (TODO)
                
        Returns:
            Tuple[Optional[str], str, int]: A tuple containing:
                - CSV data string if successful, None if failed
                - A success/error message
                - HTTP status code (200, 400, 500)
        """
        # Authorization check: Only users with export permissions can export
        if not current_user.has_permission('export_order_data'):
            return None, "Forbidden: You do not have permission to export fuel orders.", 403

        # Initialize base query
        query = FuelOrder.query

        # Apply default status filter (REVIEWED) or override from filters
        target_status = FuelOrderStatus.REVIEWED  # Default export status
        if filters and filters.get('status'):
            try:
                # Allow overriding default status via filter
                target_status = FuelOrderStatus[filters['status'].upper()]
            except KeyError:
                return None, f"Invalid status value provided for export: {filters['status']}", 400

        query = query.filter(FuelOrder.status == target_status)

        try:
            # Fetch all orders matching the criteria, ordered by review timestamp
            orders_to_export = query.order_by(FuelOrder.reviewed_timestamp.desc()).all()

            if not orders_to_export:
                return None, "No orders found matching the criteria for export.", 200

            # Create in-memory text stream for CSV writing
            output = io.StringIO()
            writer = csv.writer(output)

            # Define and write the header row
            header = [
                'Order ID', 'Status', 'Tail Number', 'Customer ID',
                'Fuel Type', 'Additive Requested', 'Requested Amount',
                'Assigned LST ID', 'Assigned Truck ID',
                'Location on Ramp', 'CSR Notes',
                'Start Meter', 'End Meter', 'Gallons Dispensed', 'LST Notes',
                'Created At (UTC)', 'Dispatch Timestamp (UTC)', 'Acknowledge Timestamp (UTC)',
                'En Route Timestamp (UTC)', 'Fueling Start Timestamp (UTC)',
                'Completion Timestamp (UTC)', 'Reviewed Timestamp (UTC)', 'Reviewed By CSR ID'
            ]
            writer.writerow(header)

            # Helper function to format values safely
            def format_value(value):
                if value is None:
                    return ''
                if isinstance(value, datetime):
                    return value.strftime('%Y-%m-%d %H:%M:%S')  # Consistent UTC format
                if isinstance(value, Decimal):
                    return str(value)  # Convert Decimal to string
                if isinstance(value, bool):
                    return 'Yes' if value else 'No'
                if isinstance(value, FuelOrderStatus):
                    return value.value  # Get enum string value
                return str(value)

            # Write each order as a row in the CSV
            for order in orders_to_export:
                row = [
                    order.id,
                    format_value(order.status),
                    order.tail_number,
                    format_value(order.customer_id),
                    order.fuel_type,
                    format_value(order.additive_requested),
                    format_value(order.requested_amount),
                    format_value(order.assigned_lst_user_id),
                    format_value(order.assigned_truck_id),
                    order.location_on_ramp or '',  # Use empty string for None strings
                    order.csr_notes or '',
                    format_value(order.start_meter_reading),
                    format_value(order.end_meter_reading),
                    format_value(order.calculated_gallons_dispensed),
                    order.lst_notes or '',
                    format_value(order.created_at),
                    format_value(order.dispatch_timestamp),
                    format_value(order.acknowledge_timestamp),
                    format_value(order.en_route_timestamp),
                    format_value(order.fueling_start_timestamp),
                    format_value(order.completion_timestamp),
                    format_value(order.reviewed_timestamp),
                    format_value(order.reviewed_by_csr_user_id)
                ]
                writer.writerow(row)

            # Get the CSV string and close the stream
            csv_data = output.getvalue()
            output.close()

            return csv_data, "CSV data generated successfully.", 200

        except Exception as e:
            current_app.logger.error(f"Error generating CSV export: {str(e)}")
            return None, f"Error generating CSV export: {str(e)}", 500 

    @staticmethod
    def validate_lst_assignment(assigned_lst_user_id: int) -> Tuple[Optional[User], Optional[str]]:
        """Validates that the provided user ID corresponds to an active LST."""
        from src.models import User, Role
        
        if not assigned_lst_user_id or assigned_lst_user_id <= 0:
            return None, "A valid LST user ID must be provided."

        lst_user = User.query.options(joinedload(User.roles)).filter(User.id == assigned_lst_user_id).first()  # type: ignore

        if not lst_user or not lst_user.is_active:
            return None, f"LST user with ID {assigned_lst_user_id} not found or is inactive."
        
        is_lst = any(role.name == 'Line Service Technician' for role in lst_user.roles)
        if not is_lst:
            return None, f"User with ID {assigned_lst_user_id} is not a Line Service Technician."

        return lst_user, None

    @staticmethod
    def can_user_modify_order(user: User, order: FuelOrder) -> bool:
        """Check if user can modify a specific order based on permissions."""
        if not user or not order:
            return False
        
        # Check for admin permissions (System Administrator role)
        admin_permissions = ['manage_settings', 'manage_roles', 'access_admin_dashboard']
        for perm_name in admin_permissions:
            if user.has_permission(perm_name):
                return True
        
        # Check for CSR permissions - CSRs can view/edit fuel orders
        csr_permissions = ['view_all_orders', 'edit_fuel_order', 'access_csr_dashboard']
        for perm_name in csr_permissions:
            if user.has_permission(perm_name):
                return True
        
        # Check if LST can modify their own assigned orders
        if (order.assigned_lst_user_id == user.id and 
            user.has_permission('perform_fueling_task')):
            return True
        
        return False

    @staticmethod
    def can_user_complete_order(user: User, order: FuelOrder) -> bool:
        """Check if user can complete a specific order based on permissions."""
        if not user or not order:
            return False
        
        # Check for admin permissions
        if user.has_permission('manage_settings') or user.has_permission('access_admin_dashboard'):
            return True
        
        # Check if LST can complete their own assigned orders
        if (order.assigned_lst_user_id == user.id and 
            user.has_permission('complete_fuel_order')):
            return True
        
        return False

    @classmethod
    def manual_update_order_status(cls, order_id: int, user_id: int, update_data: dict) -> FuelOrder:
        """
        Manually update a fuel order's status with full auditing.
        
        Args:
            order_id: ID of the fuel order to update
            user_id: ID of the user making the update
            update_data: Dictionary containing status and optional fields like meter readings, reason
            
        Returns:
            Updated FuelOrder object
            
        Raises:
            ValueError: If order not found, invalid status, or missing required fields
        """
        # Fetch the fuel order
        order = FuelOrder.query.get(order_id)
        if not order:
            raise ValueError(f"Fuel order with ID {order_id} not found")
        
        # Take a snapshot of the order's state before any changes for auditing.
        old_order_state = {c.name: getattr(order, c.name) for c in order.__table__.columns}

        # Check if order is locked due to active receipt
        from ..models.receipt import ReceiptStatus
        active_receipt_exists = any(r.status != ReceiptStatus.VOID for r in order.receipts)
        if active_receipt_exists:
            raise ValueError("Cannot modify a Fuel Order that has an active receipt.")
        
        # Get and validate new status
        new_status_str = update_data.get('status')
        if not new_status_str:
            raise ValueError("Missing 'status' in update data")
        
        # Normalize the status string and find the corresponding enum
        new_status = None
        
        # First, try to find by enum value (case-insensitive)
        for status_enum in FuelOrderStatus:
            if status_enum.value.upper() == new_status_str.upper():
                new_status = status_enum
                break
        
        # If not found by value, try by enum member name (handle space-to-underscore conversion)
        if new_status is None:
            normalized_name = new_status_str.upper().replace(' ', '_')
            if normalized_name in FuelOrderStatus.__members__:
                new_status = FuelOrderStatus[normalized_name]
        
        # If still not found, it's an invalid status
        if new_status is None:
            valid_statuses = [status.value for status in FuelOrderStatus]
            raise ValueError(f"Invalid status '{update_data.get('status')}'. Valid statuses: {valid_statuses}")
        
        # Handle status-specific requirements
        if new_status == FuelOrderStatus.COMPLETED:
            # Check for required meter readings
            start_meter = update_data.get('start_meter_reading')
            end_meter = update_data.get('end_meter_reading')
            
            if start_meter is None or end_meter is None:
                raise ValueError("start_meter_reading and end_meter_reading are required when updating status to COMPLETED")
            
            try:
                start_meter = float(start_meter)
                end_meter = float(end_meter)
            except (ValueError, TypeError):
                raise ValueError("start_meter_reading and end_meter_reading must be valid numbers")
            
            if end_meter <= start_meter:
                raise ValueError("end_meter_reading must be greater than start_meter_reading")
            
            # Update meter readings and completion timestamp
            order.start_meter_reading = Decimal(str(start_meter))
            order.end_meter_reading = Decimal(str(end_meter))
            order.completion_timestamp = datetime.utcnow()
        else:
            # If moving away from COMPLETED, clear completion timestamp
            if order.status == FuelOrderStatus.COMPLETED and new_status != FuelOrderStatus.COMPLETED:
                order.completion_timestamp = None
        
        # Update the status
        order.status = new_status
        
        # Update corresponding timestamp field based on the new status
        if new_status == FuelOrderStatus.ACKNOWLEDGED:
            order.acknowledge_timestamp = datetime.utcnow()
        elif new_status == FuelOrderStatus.EN_ROUTE:
            order.en_route_timestamp = datetime.utcnow()
        elif new_status == FuelOrderStatus.FUELING:
            order.fueling_start_timestamp = datetime.utcnow()
        
        # Create audit log entry
        new_order_state = {c.name: getattr(order, c.name) for c in order.__table__.columns}
        
        # Create a non-recursive dictionary for the audit log details
        # Convert enum values to strings for JSON serialization
        def serialize_value(value):
            """Convert enum objects and other non-serializable types to JSON-safe values."""
            if hasattr(value, 'value'):  # Enum objects have a .value attribute
                return value.value
            elif isinstance(value, datetime):
                return value.isoformat()
            elif value is None:
                return None
            else:
                return str(value)
        
        details_for_log = {
            'reason': update_data.get("reason", "No reason provided."),
            'previous_status': serialize_value(old_order_state.get('status')),
            'new_status': serialize_value(new_order_state.get('status')),
            'changed_fields': {
                'old': {k: serialize_value(v) for k, v in old_order_state.items() if v != new_order_state.get(k)},
                'new': {k: serialize_value(v) for k, v in new_order_state.items() if v != old_order_state.get(k)}
            }
        }
        
        audit_log_entry = AuditLog(
            user_id=user_id,
            entity_type='FuelOrder',
            entity_id=order_id,
            action='manual_update',
            details=details_for_log
        )
        db.session.add(audit_log_entry)
        
        # Commit the changes
        db.session.commit()
        
        return order 

    @classmethod
    def claim_order(cls, order_id: int, user_id: int) -> Tuple[Optional[FuelOrder], str, int]:
        """
        Atomically claim an unassigned fuel order.
        This method provides a direct interface to FuelerService.claim_order_atomic
        for backward compatibility.
        """
        from .fueler_service import FuelerService
        return FuelerService.claim_order_atomic(order_id, user_id)
    
    @classmethod
    def csr_update_order(cls, order_id: int, update_data: Dict[str, Any], 
                        csr_user_id: int) -> Tuple[Optional[FuelOrder], str, int]:
        """
        Allow CSR to update order details and set pending change status.
        This method provides a direct interface to FuelerService.csr_update_order.
        """
        from .fueler_service import FuelerService
        return FuelerService.csr_update_order(order_id, update_data, csr_user_id)
    
    @classmethod
    def acknowledge_order_change(cls, order_id: int, change_version: int, 
                               user_id: int) -> Tuple[Optional[FuelOrder], str, int]:
        """
        Acknowledge CSR changes to allow fueler to continue with order.
        This method provides a direct interface to FuelerService.acknowledge_csr_changes.
        """
        from .fueler_service import FuelerService
        return FuelerService.acknowledge_csr_changes(order_id, change_version, user_id)
    
    @classmethod
    def complete_order_atomic(cls, order_id: int, completion_data: Dict[str, Any], 
                            user_id: int) -> Tuple[Optional[FuelOrder], str, int]:
        """
        Atomically complete an order with meter readings and truck updates.
        This method provides a direct interface to FuelerService.complete_order_with_transaction.
        """
        from .fueler_service import FuelerService
        return FuelerService.complete_order_with_transaction(order_id, completion_data, user_id) 