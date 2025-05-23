from datetime import datetime
from decimal import Decimal
import csv
import io
from src.models import (
    FuelOrder,
    FuelOrderStatus,
    Aircraft,
    User,
    UserRole,
    FuelTruck,
    Customer
)
from src.extensions import db
from flask import current_app
from typing import Optional, Tuple, List, Dict, Any, Union
import logging
import traceback

class FuelOrderService:
    @classmethod
    def get_order_status_counts(cls, current_user):
        """
        Calculate and return counts of fuel orders by status groups for dashboard cards.
        PBAC: Permission-based, not role-based. Only users with 'VIEW_ORDER_STATS' permission should access this.
        Returns: (dict, message, status_code)
        """
        from src.models import FuelOrderStatus, FuelOrder
        from sqlalchemy import func, case
        from src.extensions import db
        try:
            # PBAC: Permission check is handled by decorator, so no need to check here
            pending_statuses = [FuelOrderStatus.DISPATCHED]
            in_progress_statuses = [FuelOrderStatus.ACKNOWLEDGED, FuelOrderStatus.EN_ROUTE, FuelOrderStatus.FUELING]
            completed_statuses = [FuelOrderStatus.COMPLETED]
            counts = db.session.query(
                func.count(case((FuelOrder.status.in_(pending_statuses), FuelOrder.id))).label('pending'),
                func.count(case((FuelOrder.status.in_(in_progress_statuses), FuelOrder.id))).label('in_progress'),
                func.count(case((FuelOrder.status.in_(completed_statuses), FuelOrder.id))).label('completed')
            ).one_or_none()
            result_counts = {
                'pending': counts[0] if counts else 0,
                'in_progress': counts[1] if counts else 0,
                'completed': counts[2] if counts else 0,
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
        PBAC: Permission-based, not role-based. Only users with 'VIEW_ORDER_STATS' permission should access this.
        Returns: (dict, message, status_code)
        """
        try:
            return cls.get_order_status_counts(current_user)
        except Exception as e:
            import logging
            logging.getLogger(__name__).error(f"Error in get_status_counts: {str(e)}")
            return None, f"Internal error in get_status_counts: {str(e)}", 500

    @classmethod
    def create_fuel_order(cls, order_data: dict) -> Tuple[Optional[FuelOrder], Optional[str], Optional[int], Optional[bool]]:
        from src.models import User, UserRole, FuelOrder, FuelOrderStatus, Aircraft
        from src.extensions import db
        import logging
        logger = logging.getLogger(__name__)

        # --- Check if any users exist (existing logic) ---
        user_count = User.query.count()
        if user_count == 0:
            return (
                None,
                "No users exist in the system. Please create an ADMIN user via the CLI or database to access the admin panel and create LST users.",
                400,
                False # aircraft_created_this_request
            )

        # Extract data
        tail_number = order_data.get('tail_number')
        fuel_type_from_order = order_data.get('fuel_type') # Renamed to avoid conflict with aircraft.fuel_type
        assigned_lst_user_id = order_data.get('assigned_lst_user_id')
        assigned_truck_id = order_data.get('assigned_truck_id')
        customer_id = order_data.get('customer_id') # For FuelOrder, not new Aircraft

        # Validate presence of tail_number specifically first for aircraft check
        if not tail_number:
            return None, "Tail number is required.", 400, False # aircraft_created_this_request

        # --- Check for Aircraft and auto-create if not found ---
        aircraft = Aircraft.query.get(tail_number)
        aircraft_created_this_request = False
        if not aircraft:
            logger.info(f"Aircraft with tail number {tail_number} not found. Auto-creating.")
            placeholder_aircraft_type = "UNKNOWN_TYPE"
            placeholder_fuel_type = "UNKNOWN_FUEL" # Consider if fuel_type_from_order could be used if appropriate

            aircraft = Aircraft(
                tail_number=tail_number,
                aircraft_type=placeholder_aircraft_type,
                fuel_type=placeholder_fuel_type
                # customer_id is not part of Aircraft model, so not set here
            )
            db.session.add(aircraft)
            aircraft_created_this_request = True
            # DO NOT COMMIT HERE - will be part of the main transaction for the fuel order

        # Check for other required fields for the fuel order itself
        # Note: tail_number is already validated. fuel_type_from_order is for the order.
        if not all([fuel_type_from_order, assigned_lst_user_id is not None, assigned_truck_id is not None]):
            return None, "Missing required fields for fuel order (fuel_type, LST, truck).", 400, aircraft_created_this_request

        # --- LST Assignment Logic ---
        if assigned_lst_user_id == -1:
            active_lsts = User.query.filter(User.role == UserRole.LST, User.is_active == True).all()
            if not active_lsts:
                return None, "No available LST found for auto-assignment.", 400, aircraft_created_this_request
            min_count = None
            chosen_lst = None
            active_statuses = [
                FuelOrderStatus.DISPATCHED,
                FuelOrderStatus.ACKNOWLEDGED,
                FuelOrderStatus.EN_ROUTE,
                FuelOrderStatus.FUELING
            ]
            for lst in active_lsts:
                count = FuelOrder.query.filter(
                    FuelOrder.assigned_lst_user_id == lst.id,
                    FuelOrder.status.in_(active_statuses)
                ).count()
                if min_count is None or count < min_count:
                    min_count = count
                    chosen_lst = lst
            if not chosen_lst:
                return None, "No available LST found for auto-assignment.", 400, aircraft_created_this_request
            logger.info(f"Auto-assigned LST user: {chosen_lst.id} (Active orders: {min_count})")
            assigned_lst_user_id = chosen_lst.id
            # order_data['assigned_lst_user_id'] = assigned_lst_user_id # Not needed if using var directly
        else:
            lst_user = User.query.filter_by(id=assigned_lst_user_id, role=UserRole.LST, is_active=True).first()
            if not lst_user:
                return None, f"Assigned LST user {assigned_lst_user_id} does not exist, is not active, or is not an LST.", 400, aircraft_created_this_request

        # --- Truck Validation ---
        # Assuming truck validation logic exists here or is part of route handler.
        # For this example, we'll just check if truck ID leads to a valid truck.
        truck = FuelTruck.query.get(assigned_truck_id)
        if not truck:
            return None, f"Fuel truck with ID {assigned_truck_id} not found.", 400, aircraft_created_this_request
        if not truck.is_active:
            return None, f"Fuel truck {assigned_truck_id} is not active.", 400, aircraft_created_this_request
        
        # --- Customer Validation (Optional) ---
        if customer_id:
            customer = Customer.query.get(customer_id)
            if not customer:
                return None, f"Customer with ID {customer_id} not found.", 400, aircraft_created_this_request


        # Create the FuelOrder
        try:
            new_order = FuelOrder(
                tail_number=aircraft.tail_number, # Use tail_number from the aircraft object
                fuel_type=fuel_type_from_order, # Use fuel_type from the order data
                assigned_lst_user_id=assigned_lst_user_id,
                assigned_truck_id=assigned_truck_id,
                customer_id=customer_id, # For the FuelOrder
                additive_requested=order_data.get('additive_requested', False),
                requested_amount=order_data.get('requested_amount'),
                location_on_ramp=order_data.get('location_on_ramp'),
                csr_notes=order_data.get('csr_notes'),
                status=FuelOrderStatus.DISPATCHED,
                dispatch_timestamp=datetime.utcnow()
            )
            db.session.add(new_order)
            
            # Commit the session (includes new_order and potentially new_aircraft)
            db.session.commit()
            
            message = "Fuel order created successfully."
            if aircraft_created_this_request:
                message += f" New aircraft {aircraft.tail_number} was auto-created with placeholder details."
            
            return new_order, message, 201, aircraft_created_this_request
            
        except Exception as e:
            db.session.rollback()
            logger.error(f"Error creating fuel order: {str(e)} traceback: {traceback.format_exc()}")
            # Check for specific FK violation on aircraft if not auto-created, though auto-create should prevent this path.
            if "violates foreign key constraint" in str(e) and "fuel_orders_tail_number_fkey" in str(e) and not aircraft_created_this_request:
                 return None, f"Database error: Aircraft with tail number {tail_number} could not be referenced. Ensure it exists or was auto-created.", 500, False
            return None, f"Database error during fuel order creation: {str(e)}", 500, aircraft_created_this_request

    @classmethod
    def get_fuel_orders(
        cls,
        current_user: User,
        filters: Optional[Dict[str, Any]] = None
    ) -> Tuple[Optional[Any], str]:
        """
        Retrieve paginated fuel orders based on user PBAC and optional filters.
        PBAC: If user lacks 'VIEW_ALL_ORDERS', only show orders assigned to them.
        """
        logger = logging.getLogger(__name__)
        try:
            logger.info(f"[FuelOrderService.get_fuel_orders] User: {getattr(current_user, 'id', None)} | Filters: {filters}")
            query = FuelOrder.query

            # PBAC: Only show all orders if user has permission
            if not current_user.has_permission('VIEW_ALL_ORDERS'):
                # Only see their assigned orders
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
                # TODO: Add other filters here

            try:
                page = int(filters.get('page', 1))
                per_page = int(filters.get('per_page', 20))
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
        
        Args:
            order_id (int): The ID of the order to retrieve
            current_user (User): The authenticated user making the request
            
        Returns:
            Tuple[Optional[FuelOrder], str, int]: A tuple containing:
                - The FuelOrder if successful, None if failed
                - A success/error message
                - HTTP status code (200, 403, 404)
        """
        # Basic fetch for now. Add joinedload/selectinload options later for optimization if needed.
        order = FuelOrder.query.get(order_id)
        if not order:
            return None, f"Fuel order with ID {order_id} not found.", 404  # Not Found

        # Perform Authorization Check
        if current_user.role == UserRole.LST:
            # LST can only view orders assigned to them
            if order.assigned_lst_user_id != current_user.id:
                return None, "Forbidden: You are not assigned to this fuel order.", 403  # Forbidden
        elif current_user.role in [UserRole.CSR, UserRole.ADMIN]:
            # CSRs and Admins can view any order
            pass  # No additional check needed for these roles
        else:
            # Should not happen due to auth middleware, but let's be thorough
            return None, "Forbidden: Invalid user role.", 403

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
        if current_user.role == UserRole.LST:
            if order.assigned_lst_user_id != current_user.id:
                return None, "Forbidden: You are not assigned to this fuel order.", 403  # Forbidden
        elif current_user.role in [UserRole.CSR, UserRole.ADMIN]:
            # Restrict status changes strictly to LSTs for MVP workflow
            return None, "Forbidden: Only the assigned LST can update the status via this method.", 403
        else:
            # Should not happen due to auth middleware, but let's be thorough
            return None, "Forbidden: Invalid user role.", 403

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
        if not (current_user.role == UserRole.LST and order.assigned_lst_user_id == current_user.id):
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
        # Authorization check: Only CSR and Admin can export
        if current_user.role not in [UserRole.CSR, UserRole.ADMIN]:
            return None, "Forbidden: Only CSR and Admin users can export fuel orders.", 403

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
                return [], "No orders found matching the criteria for export.", 200

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