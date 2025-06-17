"""
Enhanced Fueler Service for Real-time Fuel Order Management
Includes new endpoints for CSR updates, acknowledgments, and atomic operations
"""

import logging
from datetime import datetime
from decimal import Decimal
from typing import Dict, Any, Optional, Tuple
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from sqlalchemy.orm import joinedload

from ..models.fuel_order import FuelOrder, FuelOrderStatus
from ..models.fuel_truck import FuelTruck
from ..models.user import User
from ..extensions import db
from ..utils.socketio_auth import emit_to_user_room, emit_to_csr_room, emit_to_fuelers_subset
from .fuel_order_service import FuelOrderService

logger = logging.getLogger(__name__)

class FuelerService:
    """
    Enhanced service for Fueler System with real-time capabilities
    """
    
    @classmethod
    def claim_order_atomic(cls, order_id: int, user_id: int) -> Tuple[Optional[FuelOrder], str, int]:
        """
        Atomically claim an unassigned fuel order to prevent race conditions.
        
        Args:
            order_id: The fuel order ID to claim
            user_id: The user ID claiming the order
            
        Returns:
            Tuple of (FuelOrder, message, status_code)
        """
        try:
            # Lock the order row for update to prevent race conditions
            order = db.session.query(FuelOrder).filter(
                FuelOrder.id == order_id
            ).with_for_update().first()
            
            if not order:
                return None, "Fuel order not found", 404
            
            # Check if order is still unassigned or pre-assigned to the current user
            if order.assigned_lst_user_id is not None and order.assigned_lst_user_id != user_id:
                return None, "Order has already been claimed by another fueler", 409
            
            # Check if order has pending CSR changes
            if hasattr(order, 'has_pending_changes') and order.has_pending_changes:
                return None, "Order has pending CSR changes that must be acknowledged first", 409
            
            # Verify user exists and is active
            user = User.query.get(user_id)
            if not user:
                return None, "User not found", 404
            
            # Claim the order (or acknowledge if already pre-assigned)
            if order.assigned_lst_user_id is None:
                order.assigned_lst_user_id = user_id
            order.status = FuelOrderStatus.ACKNOWLEDGED
            order.acknowledge_timestamp = datetime.utcnow()
            
            # Commit the changes
            db.session.commit()
                
            # Emit real-time events after successful commit
            cls._emit_order_claimed(order, user)
            
            logger.info(f"Order {order_id} successfully claimed by user {user_id}")
            return order, "Order claimed successfully", 200
            
        except IntegrityError as e:
            db.session.rollback()
            logger.warning(f"Race condition detected when claiming order {order_id}: {e}")
            return None, "Order was claimed by another fueler", 409
            
        except SQLAlchemyError as e:
            db.session.rollback()
            logger.error(f"Database error claiming order {order_id}: {e}")
            return None, "Database error occurred", 500
            
        except Exception as e:
            db.session.rollback()
            logger.error(f"Unexpected error claiming order {order_id}: {e}")
            return None, "Internal server error", 500
    
    @classmethod
    def update_order_status_with_validation(cls, order_id: int, new_status: FuelOrderStatus, 
                                          user_id: int) -> Tuple[Optional[FuelOrder], str, int]:
        """
        Update order status with validation for pending CSR changes.
        
        Args:
            order_id: The fuel order ID
            new_status: The new status to set
            user_id: The user making the update
            
        Returns:
            Tuple of (FuelOrder, message, status_code)
        """
        try:
            order = FuelOrder.query.get(order_id)
            if not order:
                return None, "Fuel order not found", 404
            
            # Check if order has pending, unacknowledged CSR changes
            if hasattr(order, 'has_pending_changes') and order.has_pending_changes:
                return None, "Order has pending CSR changes that must be acknowledged first", 409
            
            # Verify user is assigned to this order
            if order.assigned_lst_user_id != user_id:
                return None, "You are not assigned to this order", 403
            
            # Update status and timestamp
            old_status = order.status
            order.status = new_status
            
            # Set appropriate timestamp
            now = datetime.utcnow()
            if new_status == FuelOrderStatus.EN_ROUTE:
                order.en_route_timestamp = now
            elif new_status == FuelOrderStatus.FUELING:
                order.fueling_start_timestamp = now
            
            db.session.commit()
            
            # Emit real-time events
            cls._emit_order_status_updated(order, old_status, new_status)
            
            logger.info(f"Order {order_id} status updated from {old_status.value} to {new_status.value}")
            return order, "Order status updated successfully", 200
            
        except SQLAlchemyError as e:
            db.session.rollback()
            logger.error(f"Database error updating order status: {e}")
            return None, "Database error occurred", 500
            
        except Exception as e:
            db.session.rollback()
            logger.error(f"Error updating order status: {e}")
            return None, "Internal server error", 500
    
    @classmethod
    def complete_order_with_transaction(cls, order_id: int, completion_data: Dict[str, Any], 
                                      user_id: int) -> Tuple[Optional[FuelOrder], str, int]:
        """
        Complete a fuel order with atomic transaction including meter readings and truck updates.
        
        Args:
            order_id: The fuel order ID
            completion_data: Dict containing start_meter_reading, end_meter_reading, lst_notes
            user_id: The user completing the order
            
        Returns:
            Tuple of (FuelOrder, message, status_code)
        """
        try:
            # Validate required fields
            start_meter = completion_data.get('start_meter_reading')
            end_meter = completion_data.get('end_meter_reading')
            
            if start_meter is None or end_meter is None:
                return None, "Start and end meter readings are required", 400
            
            try:
                start_meter = Decimal(str(start_meter))
                end_meter = Decimal(str(end_meter))
            except (ValueError, TypeError):
                return None, "Invalid meter reading format", 400
            
            if end_meter < start_meter:
                return None, "End meter reading must be greater than or equal to start meter reading", 400
            
            # Get order with truck relationship
            order = db.session.query(FuelOrder).options(
                joinedload(FuelOrder.assigned_truck)
            ).filter(FuelOrder.id == order_id).first()
            
            if not order:
                return None, "Fuel order not found", 404
            
            # Verify user is assigned to this order
            if order.assigned_lst_user_id != user_id:
                return None, "You are not assigned to this order", 403
            
            # Check if order has pending CSR changes
            if hasattr(order, 'has_pending_changes') and order.has_pending_changes:
                return None, "Order has pending CSR changes that must be acknowledged first", 409
            
            # Calculate gallons dispensed
            gallons_dispensed = end_meter - start_meter
            
            # Update order
            order.start_meter_reading = start_meter
            order.end_meter_reading = end_meter
            order.gallons_dispensed = gallons_dispensed
            order.lst_notes = completion_data.get('lst_notes', '')
            order.status = FuelOrderStatus.COMPLETED
            order.completion_timestamp = datetime.utcnow()
            
            # Update fuel truck current meter reading
            if order.assigned_truck:
                order.assigned_truck.current_meter_reading = end_meter
            
            # Commit the changes
            db.session.commit()
                
            # Emit real-time events after successful commit
            cls._emit_order_completed(order)
            
            logger.info(f"Order {order_id} completed successfully with {gallons_dispensed} gallons dispensed")
            return order, "Order completed successfully", 200
            
        except SQLAlchemyError as e:
            db.session.rollback()
            logger.error(f"Database error completing order: {e}")
            return None, "Database error occurred", 500
            
        except Exception as e:
            db.session.rollback()
            logger.error(f"Error completing order: {e}")
            return None, "Internal server error", 500
    
    @classmethod
    def csr_update_order(cls, order_id: int, update_data: Dict[str, Any], 
                        csr_user_id: int) -> Tuple[Optional[FuelOrder], str, int]:
        """
        CSR update to an active fuel order with change version tracking.
        
        Args:
            order_id: The fuel order ID
            update_data: Dict containing fields to update
            csr_user_id: The CSR user making the update
            
        Returns:
            Tuple of (FuelOrder, message, status_code)
        """
        try:
            order = FuelOrder.query.get(order_id)
            if not order:
                return None, "Fuel order not found", 404
            
            # Verify order is in a state that allows CSR updates
            if order.status in [FuelOrderStatus.COMPLETED, FuelOrderStatus.REVIEWED, FuelOrderStatus.CANCELLED]:
                return None, "Cannot update completed, reviewed, or cancelled orders", 400
            
            # Update allowed fields
            updatable_fields = ['requested_amount', 'fuel_type', 'additive_requested', 
                              'location_on_ramp', 'csr_notes']
            
            updated_fields = []
            for field in updatable_fields:
                if field in update_data:
                    old_value = getattr(order, field)
                    new_value = update_data[field]
                    if old_value != new_value:
                        setattr(order, field, new_value)
                        updated_fields.append(field)
            
            if not updated_fields:
                return order, "No changes detected", 200
            
            # Increment change version
            order.change_version += 1
            order.updated_at = datetime.utcnow()
            
            db.session.commit()
            
            # Emit targeted real-time event to assigned fueler
            if order.assigned_lst_user_id:
                cls._emit_order_details_updated(order, updated_fields)
            
            logger.info(f"CSR updated order {order_id}, fields: {updated_fields}, new version: {order.change_version}")
            return order, f"Order updated successfully. Fields changed: {', '.join(updated_fields)}", 200
            
        except SQLAlchemyError as e:
            db.session.rollback()
            logger.error(f"Database error in CSR update: {e}")
            return None, "Database error occurred", 500
            
        except Exception as e:
            db.session.rollback()
            logger.error(f"Error in CSR update: {e}")
            return None, "Internal server error", 500
    
    @classmethod
    def acknowledge_csr_changes(cls, order_id: int, change_version: int, 
                              user_id: int) -> Tuple[Optional[FuelOrder], str, int]:
        """
        Acknowledge CSR changes to a fuel order.
        
        Args:
            order_id: The fuel order ID
            change_version: The change version being acknowledged
            user_id: The user acknowledging the changes
            
        Returns:
            Tuple of (FuelOrder, message, status_code)
        """
        try:
            order = FuelOrder.query.get(order_id)
            if not order:
                return None, "Fuel order not found", 404
            
            # Verify user is assigned to this order
            if order.assigned_lst_user_id != user_id:
                return None, "You are not assigned to this order", 403
            
            # Validate change version
            if order.change_version != change_version:
                return None, f"Version mismatch. Current version is {order.change_version}, received {change_version}", 409
            
            # Update acknowledged change version to clear pending changes flag
            order.acknowledged_change_version = change_version
            order.updated_at = datetime.utcnow()
            
            db.session.commit()
            
            # Log the acknowledgment
            logger.info(f"User {user_id} acknowledged changes to order {order_id} at version {change_version}")
            
            # Emit confirmation to CSR
            cls._emit_changes_acknowledged(order, user_id)
            
            return order, "Changes acknowledged successfully", 200
            
        except SQLAlchemyError as e:
            db.session.rollback()
            logger.error(f"Database error acknowledging changes: {e}")
            return None, "Database error occurred", 500
            
        except Exception as e:
            db.session.rollback()
            logger.error(f"Error acknowledging changes: {e}")
            return None, "Internal server error", 500
    
    # Real-time event emission methods
    
    @classmethod
    def _emit_order_claimed(cls, order: FuelOrder, user: User):
        """Emit events when an order is claimed"""
        try:
            order_data = order.to_dict()
            
            # Notify CSRs that order was claimed
            emit_to_csr_room('order_claimed', {
                'order_id': order.id,
                'claimed_by': {
                    'id': user.id,
                    'email': user.email
                },
                'order': order_data,
                'timestamp': datetime.utcnow().isoformat()
            })
            
            # Notify the fueler who claimed it
            emit_to_user_room(user.id, 'order_claim_confirmed', {
                'order_id': order.id,
                'order': order_data,
                'timestamp': datetime.utcnow().isoformat()
            })
            
        except Exception as e:
            logger.error(f"Error emitting order claimed events: {e}")
    
    @classmethod
    def _emit_order_status_updated(cls, order: FuelOrder, old_status: FuelOrderStatus, 
                                 new_status: FuelOrderStatus):
        """Emit events when order status is updated"""
        try:
            event_data = {
                'order_id': order.id,
                'old_status': old_status.value,
                'new_status': new_status.value,
                'order': order.to_dict(),
                'timestamp': datetime.utcnow().isoformat()
            }
            
            # Notify CSRs
            emit_to_csr_room('order_status_updated', event_data)
            
            # Notify the assigned fueler
            if order.assigned_lst_user_id:
                emit_to_user_room(order.assigned_lst_user_id, 'order_status_updated', event_data)
            
        except Exception as e:
            logger.error(f"Error emitting order status updated events: {e}")
    
    @classmethod
    def _emit_order_completed(cls, order: FuelOrder):
        """Emit events when an order is completed"""
        try:
            event_data = {
                'order_id': order.id,
                'order': order.to_dict(),
                'gallons_dispensed': str(order.gallons_dispensed) if order.gallons_dispensed else None,
                'timestamp': datetime.utcnow().isoformat()
            }
            
            # Notify CSRs
            emit_to_csr_room('order_completed', event_data)
            
            # Notify the fueler who completed it
            if order.assigned_lst_user_id:
                emit_to_user_room(order.assigned_lst_user_id, 'order_completed', event_data)
            
        except Exception as e:
            logger.error(f"Error emitting order completed events: {e}")
    
    @classmethod
    def _emit_order_details_updated(cls, order: FuelOrder, updated_fields: list):
        """Emit events when CSR updates order details"""
        try:
            event_data = {
                'order_id': order.id,
                'updated_fields': updated_fields,
                'change_version': order.change_version,
                'order': order.to_dict(),
                'timestamp': datetime.utcnow().isoformat()
            }
            
            # Notify the assigned fueler
            if order.assigned_lst_user_id:
                emit_to_user_room(order.assigned_lst_user_id, 'order_details_updated', event_data)
            
        except Exception as e:
            logger.error(f"Error emitting order details updated events: {e}")
    
    @classmethod
    def _emit_changes_acknowledged(cls, order: FuelOrder, user_id: int):
        """Emit events when fueler acknowledges CSR changes"""
        try:
            event_data = {
                'order_id': order.id,
                'acknowledged_by': user_id,
                'change_version': order.change_version,
                'timestamp': datetime.utcnow().isoformat()
            }
            
            # Notify CSRs
            emit_to_csr_room('changes_acknowledged', event_data)
            
        except Exception as e:
            logger.error(f"Error emitting changes acknowledged events: {e}")
    
    @classmethod
    def emit_new_unclaimed_order(cls, order: FuelOrder):
        """
        Emit new unclaimed order to a subset of fuelers for load balancing.
        This is called when a new order is created without assignment.
        """
        try:
            event_data = {
                'order_id': order.id,
                'order': order.to_dict(),
                'timestamp': datetime.utcnow().isoformat()
            }
            
            # Emit to a randomized subset of fuelers
            emit_to_fuelers_subset('new_unclaimed_order', event_data, max_fuelers=5)
            
        except Exception as e:
            logger.error(f"Error emitting new unclaimed order: {e}") 