"""
Receipt Service

This service handles all business logic related to Receipt and ReceiptLineItem state changes.
It integrates with the FeeCalculationService to provide comprehensive receipt lifecycle management.
"""

from typing import List, Dict, Any, Optional
from decimal import Decimal
from datetime import datetime
from flask import current_app
from sqlalchemy.orm import joinedload
from sqlalchemy.exc import IntegrityError, SQLAlchemyError

from ..extensions import db
from ..models.receipt import Receipt, ReceiptStatus
from ..models.receipt_line_item import ReceiptLineItem, LineItemType
from ..models.fuel_order import FuelOrder, FuelOrderStatus
from ..models.customer import Customer
from ..models.aircraft import Aircraft
from ..models.aircraft_type import AircraftType
from ..models.audit_log import AuditLog
from .fee_calculation_service import FeeCalculationService, FeeCalculationContext


class ReceiptService:
    """Service for managing receipt lifecycle operations."""
    
    def __init__(self):
        """Initialize the service with fee calculation service."""
        self.fee_calculation_service = FeeCalculationService()
    
    def create_draft_from_fuel_order(self, fuel_order_id: int, fbo_location_id: int, user_id: int) -> Receipt:
        """
        Create a new draft receipt from a completed fuel order.
        
        Args:
            fuel_order_id: ID of the completed fuel order
            fbo_location_id: FBO location ID for scoping
            user_id: ID of the user creating the receipt
            
        Returns:
            The newly created draft receipt
            
        Raises:
            ValueError: If fuel order is invalid or already has a receipt
        """
        try:
            # Fetch the fuel order with relationships
            fuel_order = (FuelOrder.query
                         .options(joinedload(FuelOrder.aircraft))
                         .filter_by(id=fuel_order_id)
                         .first())
            
            if not fuel_order:
                raise ValueError(f"Fuel order with ID {fuel_order_id} not found")
            
            # Validate fuel order is completed
            if fuel_order.status != FuelOrderStatus.COMPLETED:
                raise ValueError(f"Cannot create receipt for fuel order with status {fuel_order.status.value}")
            
            # --- START NEW VALIDATION BLOCK ---
            if not fuel_order.aircraft:
                raise ValueError(
                    f"Data integrity error: FuelOrder ID {fuel_order_id} has tail_number "
                    f"'{fuel_order.tail_number}', but no matching record exists in the Aircraft table."
                )
            print(f"--- R_SVC_04a: Aircraft record '{fuel_order.aircraft.tail_number}' confirmed to be linked.", flush=True)
            # --- END NEW VALIDATION BLOCK ---
            
            # Check if fuel order already has a receipt
            existing_receipt = Receipt.query.filter_by(fuel_order_id=fuel_order_id).first()
            if existing_receipt:
                raise ValueError(f"Fuel order {fuel_order_id} already has a receipt (ID: {existing_receipt.id})")
            
            # Handle customer logic - create placeholder if needed
            customer_id = fuel_order.customer_id
            if not customer_id:
                # Check if placeholder customer already exists for this tail number
                placeholder_email = f"{fuel_order.tail_number.lower()}@placeholder.invalid"
                existing_placeholder = Customer.query.filter_by(
                    email=placeholder_email,
                    is_placeholder=True
                ).first()
                
                if existing_placeholder:
                    customer_id = existing_placeholder.id
                else:
                    # Create new placeholder customer
                    placeholder_customer = Customer(
                        name=fuel_order.tail_number,
                        email=placeholder_email,
                        is_placeholder=True,
                        is_caa_member=False
                    )
                    db.session.add(placeholder_customer)
                    db.session.flush()  # Get the ID
                    customer_id = placeholder_customer.id
            
            # Get aircraft type information
            aircraft_type_name = None
            if fuel_order.aircraft and fuel_order.aircraft.aircraft_type:
                aircraft_type_name = fuel_order.aircraft.aircraft_type
            
            # Calculate fuel quantity dispensed
            fuel_quantity_gallons = None
            if fuel_order.start_meter_reading and fuel_order.end_meter_reading:
                fuel_quantity_gallons = fuel_order.end_meter_reading - fuel_order.start_meter_reading
            
            # Create the receipt record
            receipt = Receipt(
                fbo_location_id=fbo_location_id,
                fuel_order_id=fuel_order_id,
                customer_id=customer_id,
                aircraft_type_at_receipt_time=aircraft_type_name,
                fuel_type_at_receipt_time=fuel_order.fuel_type,
                fuel_quantity_gallons_at_receipt_time=fuel_quantity_gallons,
                status=ReceiptStatus.DRAFT,
                created_by_user_id=user_id,
                updated_by_user_id=user_id
            )
            
            db.session.add(receipt)
            db.session.commit()  # Explicit commit for proper transaction handling
            
            current_app.logger.info(f"Created draft receipt {receipt.id} for fuel order {fuel_order_id}")
            return receipt
            
        except IntegrityError as e:
            db.session.rollback()  # Explicit rollback on integrity error
            current_app.logger.error(f"Integrity error creating receipt: {str(e)}")
            raise ValueError("Failed to create receipt due to data integrity constraints")
        except SQLAlchemyError as e:
            db.session.rollback()  # Explicit rollback on database error
            current_app.logger.error(f"Database error creating receipt: {str(e)}")
            raise
        except Exception as e:
            db.session.rollback()  # Explicit rollback on any other exception
            current_app.logger.error(f"Error creating draft receipt: {str(e)}")
            raise
    
    def update_draft(self, receipt_id: int, fbo_location_id: int, update_data: Dict[str, Any], user_id: int) -> Receipt:
        """
        Update a draft receipt with new information.
        
        Args:
            receipt_id: ID of the receipt to update
            fbo_location_id: FBO location ID for scoping
            update_data: Dictionary containing fields to update
            user_id: ID of the user making the update
            
        Returns:
            The updated receipt
            
        Raises:
            ValueError: If receipt is not found, not a draft, or update is invalid
        """
        try:
            # Fetch the receipt with FBO scoping
            receipt = (Receipt.query
                      .filter_by(id=receipt_id, fbo_location_id=fbo_location_id)
                      .first())
            
            if not receipt:
                raise ValueError(f"Receipt {receipt_id} not found for FBO {fbo_location_id}")
            
            # Validate receipt is in DRAFT status
            if receipt.status != ReceiptStatus.DRAFT:
                raise ValueError(f"Cannot update receipt with status {receipt.status.value}")
            
            # Update allowed fields
            if 'customer_id' in update_data:
                new_customer_id = update_data['customer_id']
                if new_customer_id:
                    # Validate customer exists
                    customer = Customer.query.get(new_customer_id)
                    if not customer:
                        raise ValueError(f"Customer {new_customer_id} not found")
                    receipt.customer_id = new_customer_id
            
            # Update aircraft type if provided
            if 'aircraft_type' in update_data:
                aircraft_type = update_data['aircraft_type']
                if aircraft_type is not None:
                    receipt.aircraft_type_at_receipt_time = aircraft_type
            
            # Update notes if provided
            if 'notes' in update_data:
                notes = update_data['notes']
                if notes is not None:
                    receipt.notes = notes
            
            # Handle additional services (future implementation)
            if 'additional_services' in update_data:
                # For now, we'll store this information but not process it
                # This would be processed during fee calculation
                current_app.logger.info(f"Additional services requested for receipt {receipt_id}: {update_data['additional_services']}")
            
            # Update metadata
            receipt.updated_by_user_id = user_id
            receipt.updated_at = datetime.utcnow()
            
            db.session.commit()
            
            current_app.logger.info(f"Updated draft receipt {receipt_id}")
            return receipt
            
        except IntegrityError as e:
            db.session.rollback()
            current_app.logger.error(f"Integrity error updating receipt: {str(e)}")
            raise ValueError("Failed to update receipt due to data integrity constraints")
        except SQLAlchemyError as e:
            db.session.rollback()
            current_app.logger.error(f"Database error updating receipt: {str(e)}")
            raise
    
    def calculate_and_update_draft(self, receipt_id: int, fbo_location_id: int, 
                                 additional_services: Optional[List[Dict[str, Any]]] = None) -> Receipt:
        """
        Calculate fees and update a draft receipt with line items and totals.
        
        Args:
            receipt_id: ID of the receipt to calculate
            fbo_location_id: FBO location ID for scoping
            additional_services: Optional list of additional services to include
            
        Returns:
            The updated receipt with calculated totals
            
        Raises:
            ValueError: If receipt is not found, not a draft, or calculation fails
        """
        try:
            # Fetch the receipt with all necessary relationships
            receipt = (Receipt.query
                      .options(
                          joinedload(Receipt.fuel_order).joinedload(FuelOrder.aircraft),
                          joinedload(Receipt.customer)
                      )
                      .filter_by(id=receipt_id, fbo_location_id=fbo_location_id)
                      .first())
            
            if not receipt:
                raise ValueError(f"Receipt {receipt_id} not found for FBO {fbo_location_id}")
            
            # Validate receipt is in DRAFT status
            if receipt.status != ReceiptStatus.DRAFT:
                raise ValueError(f"Cannot calculate fees for receipt with status {receipt.status.value}")
            
            # Validate required data for calculation
            if not receipt.fuel_order:
                raise ValueError("Receipt must have an associated fuel order for calculation")
            
            if not receipt.fuel_quantity_gallons_at_receipt_time:
                raise ValueError("Receipt must have fuel quantity for calculation")
            
            if not receipt.aircraft_type_at_receipt_time:
                raise ValueError("Aircraft type information is required for fee calculation")
            
            # FIXED: Properly look up aircraft type using receipt's stored aircraft type name
            aircraft_type_record = AircraftType.query.filter_by(
                name=receipt.aircraft_type_at_receipt_time
            ).first()
            
            if not aircraft_type_record:
                raise ValueError(f"Aircraft type '{receipt.aircraft_type_at_receipt_time}' not found in system configuration")
            
            # FIXED: Use dynamic fuel pricing instead of hardcoded value
            fuel_price_per_gallon = self._get_fuel_price(fbo_location_id, receipt.fuel_type_at_receipt_time)
            
            # Create fee calculation context
            context = FeeCalculationContext(
                fbo_location_id=fbo_location_id,
                aircraft_type_id=aircraft_type_record.id,
                customer_id=receipt.customer_id,
                fuel_uplift_gallons=receipt.fuel_quantity_gallons_at_receipt_time,
                fuel_price_per_gallon=fuel_price_per_gallon,
                additional_services=additional_services or []
            )
            
            # Calculate fees using the fee calculation service
            calculation_result = self.fee_calculation_service.calculate_for_transaction(context)
            
            # Delete existing line items
            ReceiptLineItem.query.filter_by(receipt_id=receipt_id).delete()
            
            # Create new line items from calculation result
            for line_item_data in calculation_result.line_items:
                line_item = ReceiptLineItem(
                    receipt_id=receipt_id,
                    line_item_type=LineItemType(line_item_data.line_item_type),
                    description=line_item_data.description,
                    fee_code_applied=line_item_data.fee_code_applied,
                    quantity=line_item_data.quantity,
                    unit_price=line_item_data.unit_price or Decimal('0.00'),
                    amount=line_item_data.amount
                )
                db.session.add(line_item)
            
            # Update receipt totals
            receipt.fuel_subtotal = calculation_result.fuel_subtotal
            receipt.total_fees_amount = calculation_result.total_fees_amount
            receipt.total_waivers_amount = calculation_result.total_waivers_amount
            receipt.tax_amount = calculation_result.tax_amount
            receipt.grand_total_amount = calculation_result.grand_total_amount
            receipt.is_caa_applied = calculation_result.is_caa_applied
            receipt.fuel_unit_price_at_receipt_time = fuel_price_per_gallon
            receipt.updated_at = datetime.utcnow()
            
            # Commit the transaction
            db.session.commit()
            
            current_app.logger.info(f"Calculated fees for receipt {receipt_id}: ${receipt.grand_total_amount}")
            return receipt
            
        except IntegrityError as e:
            db.session.rollback()  # Explicit rollback on integrity error
            current_app.logger.error(f"Integrity error calculating fees: {str(e)}")
            raise ValueError("Failed to calculate fees due to data integrity constraints")
        except SQLAlchemyError as e:
            db.session.rollback()  # Explicit rollback on database error
            current_app.logger.error(f"Database error calculating fees: {str(e)}")
            raise
        except Exception as e:
            db.session.rollback()  # Explicit rollback on any other exception
            current_app.logger.error(f"Error calculating fees: {str(e)}")
            raise
    
    def _get_fuel_price(self, fbo_id: int, fuel_type: str) -> Decimal:
        """
        Get fuel price for given FBO and fuel type.
        
        Args:
            fbo_id: FBO location ID
            fuel_type: Type of fuel (e.g., 'Jet A', 'Avgas 100LL')
            
        Returns:
            Price per gallon as Decimal
            
        Note: This is a temporary implementation. In the full system, this would
                  query an FBO fuel pricing configuration table.
        """
        # Temporary implementation with hardcoded prices per FBO
        fuel_prices = {
            1: {  # FBO ID 1
                'Jet A': Decimal('5.50'),
                'Avgas 100LL': Decimal('6.25'),
                'Jet A-1': Decimal('5.50'),
                'default': Decimal('5.50')
            },
            # Future FBOs can be added here
        }
        
        fbo_prices = fuel_prices.get(fbo_id, fuel_prices[1])  # Default to FBO 1 prices
        return fbo_prices.get(fuel_type, fbo_prices['default'])
    
    def generate_receipt(self, receipt_id: int, fbo_location_id: int) -> Receipt:
        """
        Generate (finalize) a receipt, assigning a receipt number and changing status.
        
        Args:
            receipt_id: ID of the receipt to generate
            fbo_location_id: FBO location ID for scoping
            
        Returns:
            The generated receipt
            
        Raises:
            ValueError: If receipt is not found, not a draft, or has no calculated fees
        """
        try:
            # Fetch the receipt
            receipt = (Receipt.query
                      .filter_by(id=receipt_id, fbo_location_id=fbo_location_id)
                      .first())
            
            if not receipt:
                raise ValueError(f"Receipt {receipt_id} not found for FBO {fbo_location_id}")
            
            # Validate receipt is in DRAFT status
            if receipt.status != ReceiptStatus.DRAFT:
                raise ValueError(f"Cannot generate receipt with status {receipt.status.value}")
            
            # Validate fees have been calculated (grand total should be > 0 or have line items)
            line_items_count = ReceiptLineItem.query.filter_by(receipt_id=receipt_id).count()
            if line_items_count == 0 and receipt.grand_total_amount == 0:
                raise ValueError("Cannot generate a receipt with uncalculated fees")
            
            # Generate unique receipt number
            receipt_number = self._generate_receipt_number(fbo_location_id)
            
            # Update receipt status and metadata
            receipt.receipt_number = receipt_number
            receipt.status = ReceiptStatus.GENERATED
            receipt.generated_at = datetime.utcnow()
            receipt.updated_at = datetime.utcnow()
            
            db.session.commit()
            
            current_app.logger.info(f"Generated receipt {receipt_number} (ID: {receipt_id})")
            return receipt
            
        except IntegrityError as e:
            db.session.rollback()
            current_app.logger.error(f"Integrity error generating receipt: {str(e)}")
            raise ValueError("Failed to generate receipt due to data integrity constraints")
        except SQLAlchemyError as e:
            db.session.rollback()
            current_app.logger.error(f"Database error generating receipt: {str(e)}")
            raise
    
    def mark_as_paid(self, receipt_id: int, fbo_location_id: int) -> Receipt:
        """
        Mark a generated receipt as paid.
        
        Args:
            receipt_id: ID of the receipt to mark as paid
            fbo_location_id: FBO location ID for scoping
            
        Returns:
            The updated receipt
            
        Raises:
            ValueError: If receipt is not found or not in GENERATED status
        """
        try:
            # Fetch the receipt
            receipt = (Receipt.query
                      .filter_by(id=receipt_id, fbo_location_id=fbo_location_id)
                      .first())
            
            if not receipt:
                raise ValueError(f"Receipt {receipt_id} not found for FBO {fbo_location_id}")
            
            # Validate receipt is in GENERATED status
            if receipt.status != ReceiptStatus.GENERATED:
                raise ValueError(f"Cannot mark receipt as paid. Current status: {receipt.status.value}")
            
            # Update receipt status and timestamp
            receipt.status = ReceiptStatus.PAID
            receipt.paid_at = datetime.utcnow()
            receipt.updated_at = datetime.utcnow()
            
            db.session.commit()
            
            current_app.logger.info(f"Marked receipt {receipt.receipt_number} as paid")
            return receipt
            
        except IntegrityError as e:
            db.session.rollback()
            current_app.logger.error(f"Integrity error marking receipt as paid: {str(e)}")
            raise ValueError("Failed to mark receipt as paid due to data integrity constraints")
        except SQLAlchemyError as e:
            db.session.rollback()
            current_app.logger.error(f"Database error marking receipt as paid: {str(e)}")
            raise
    
    def get_receipts(self, fbo_location_id: int, filters: Optional[Dict[str, Any]] = None, 
                    page: int = 1, per_page: int = 50) -> Dict[str, Any]:
        """
        Get a paginated list of receipts for an FBO with optional filtering.
        
        Args:
            fbo_location_id: FBO location ID for scoping
            filters: Optional dictionary of filters (status, customer_id, date_range, etc.)
            page: Page number (1-based)
            per_page: Number of receipts per page
            
        Returns:
            Dictionary containing receipts list and pagination info
        """
        try:
            # Build base query with FBO scoping
            query = (Receipt.query
                    .filter_by(fbo_location_id=fbo_location_id)
                    .options(joinedload(Receipt.customer))
                    .order_by(Receipt.created_at.desc()))
            
            # Apply filters if provided
            if filters:
                if 'status' in filters:
                    status_filter = filters['status']
                    if isinstance(status_filter, str):
                        query = query.filter(Receipt.status == ReceiptStatus(status_filter))
                
                if 'customer_id' in filters:
                    query = query.filter(Receipt.customer_id == filters['customer_id'])
                
                if 'date_from' in filters:
                    query = query.filter(Receipt.created_at >= filters['date_from'])
                
                if 'date_to' in filters:
                    query = query.filter(Receipt.created_at <= filters['date_to'])
            
            # Apply pagination
            paginated_results = query.paginate(
                page=page, 
                per_page=per_page, 
                error_out=False
            )
            
            return {
                'receipts': [receipt.to_dict() for receipt in paginated_results.items],
                'pagination': {
                    'page': page,
                    'pages': paginated_results.pages,
                    'per_page': per_page,
                    'total': paginated_results.total,
                    'has_next': paginated_results.has_next,
                    'has_prev': paginated_results.has_prev
                }
            }
            
        except SQLAlchemyError as e:
            current_app.logger.error(f"Database error fetching receipts: {str(e)}")
            raise
    
    def get_receipt_by_id(self, receipt_id: int, fbo_location_id: int) -> Optional[Receipt]:
        """
        Get a specific receipt by ID with FBO scoping.
        
        Args:
            receipt_id: ID of the receipt to fetch
            fbo_location_id: FBO location ID for scoping
            
        Returns:
            The receipt if found, None otherwise
        """
        try:
            receipt = (Receipt.query
                      .options(
                          joinedload(Receipt.customer),
                          joinedload(Receipt.fuel_order),
                          joinedload(Receipt.line_items)
                      )
                      .filter_by(id=receipt_id, fbo_location_id=fbo_location_id)
                      .first())
            
            return receipt
            
        except SQLAlchemyError as e:
            current_app.logger.error(f"Database error fetching receipt {receipt_id}: {str(e)}")
            raise
    
    def _generate_receipt_number(self, fbo_location_id: int) -> str:
        """
        Generate a unique receipt number for the FBO.
        
        Args:
            fbo_location_id: FBO location ID
            
        Returns:
            Unique receipt number string
        """
        # For simplicity, using FBO-ID and timestamp
        # In a real system, this would use a sequence or counter per FBO
        timestamp = datetime.utcnow().strftime("%Y%m%d%H%M%S")
        fbo_code = f"FBO{fbo_location_id:03d}"
        
        # Find the next sequential number for today
        today_prefix = f"{fbo_code}-{datetime.utcnow().strftime('%Y%m%d')}"
        latest_receipt = (Receipt.query
                         .filter(Receipt.receipt_number.like(f"{today_prefix}%"))
                         .order_by(Receipt.receipt_number.desc())
                         .first())
        
        if latest_receipt:
            # Extract sequence number and increment
            try:
                last_seq = int(latest_receipt.receipt_number.split('-')[-1])
                next_seq = last_seq + 1
            except (IndexError, ValueError):
                next_seq = 1
        else:
            next_seq = 1
        
        return f"{today_prefix}-{next_seq:04d}"
    
    def void_receipt(self, receipt_id: int, user_id: int, reason: str = None) -> Receipt:
        """
        Void a receipt and record the action.
        
        Args:
            receipt_id: ID of the receipt to void
            user_id: ID of the user voiding the receipt
            reason: Optional reason for voiding
            
        Returns:
            The voided receipt
            
        Raises:
            ValueError: If receipt is not found or cannot be voided
        """
        try:
            receipt = Receipt.query.get(receipt_id)
            
            if not receipt:
                raise ValueError(f"Receipt {receipt_id} not found")
            
            # Can only void generated or paid receipts
            if receipt.status not in [ReceiptStatus.GENERATED, ReceiptStatus.PAID]:
                raise ValueError(f"Cannot void receipt with status {receipt.status.value}")
            
            # Update receipt status
            receipt.status = ReceiptStatus.VOID
            receipt.updated_at = datetime.utcnow()
            receipt.updated_by_user_id = user_id
            
            # Log the void action
            audit_log = AuditLog(
                user_id=user_id,
                action=f"Receipt {receipt.receipt_number or receipt_id} voided",
                details=f"Reason: {reason}" if reason else "No reason provided",
                entity_type="Receipt",
                entity_id=receipt_id
            )
            db.session.add(audit_log)
            
            db.session.commit()
            
            current_app.logger.info(f"Voided receipt {receipt.receipt_number or receipt_id} by user {user_id}")
            return receipt
            
        except IntegrityError as e:
            db.session.rollback()
            current_app.logger.error(f"Integrity error voiding receipt: {str(e)}")
            raise ValueError("Failed to void receipt due to data integrity constraints")
        except SQLAlchemyError as e:
            db.session.rollback()
            current_app.logger.error(f"Database error voiding receipt: {str(e)}")
            raise

    def toggle_line_item_waiver(self, receipt_id: int, line_item_id: int, fbo_location_id: int, user_id: int) -> Receipt:
        """
        Toggle the waiver status of a fee line item manually.
        
        Args:
            receipt_id: ID of the receipt containing the line item
            line_item_id: ID of the fee line item to toggle waiver for
            fbo_location_id: FBO location ID for scoping
            user_id: ID of the user making the change
            
        Returns:
            The updated receipt with recalculated totals
            
        Raises:
            ValueError: If receipt/line item not found, not draft status, or fee not waivable
        """
        try:
            # Fetch the receipt with FBO scoping
            receipt = (Receipt.query
                      .filter_by(id=receipt_id, fbo_location_id=fbo_location_id)
                      .first())
            
            if not receipt:
                raise ValueError(f"Receipt {receipt_id} not found for FBO {fbo_location_id}")
            
            # Validate receipt is in DRAFT status
            if receipt.status != ReceiptStatus.DRAFT:
                raise ValueError(f"Cannot modify waivers on receipt with status {receipt.status.value}")
            
            # Fetch the fee line item
            fee_line_item = (ReceiptLineItem.query
                           .filter_by(id=line_item_id, receipt_id=receipt_id, line_item_type=LineItemType.FEE)
                           .first())
            
            if not fee_line_item:
                raise ValueError(f"Fee line item {line_item_id} not found for receipt {receipt_id}")
            
            # Check if this fee is potentially waivable by looking up the fee rule
            from ..models.fee_rule import FeeRule
            fee_rule = (FeeRule.query
                       .filter_by(fbo_location_id=fbo_location_id, fee_code=fee_line_item.fee_code_applied)
                       .first())
            
            if not fee_rule or not fee_rule.is_potentially_waivable_by_fuel_uplift:
                raise ValueError(f"Fee '{fee_line_item.fee_code_applied}' is not manually waivable")
            
            # Check if there's already a waiver line item for this fee
            existing_waiver = (ReceiptLineItem.query
                             .filter_by(receipt_id=receipt_id, 
                                      line_item_type=LineItemType.WAIVER,
                                      fee_code_applied=fee_line_item.fee_code_applied)
                             .first())
            
            if existing_waiver:
                # Remove the existing waiver
                db.session.delete(existing_waiver)
                current_app.logger.info(f"Removed manual waiver for fee {fee_line_item.fee_code_applied}")
            else:
                # Create a new waiver line item
                waiver_line_item = ReceiptLineItem(
                    receipt_id=receipt_id,
                    line_item_type=LineItemType.WAIVER,
                    description=f"Manual Waiver ({fee_line_item.description})",
                    fee_code_applied=fee_line_item.fee_code_applied,
                    quantity=Decimal('1.0'),
                    unit_price=-fee_line_item.amount,  # Negative of the fee amount
                    amount=-fee_line_item.amount
                )
                db.session.add(waiver_line_item)
                current_app.logger.info(f"Added manual waiver for fee {fee_line_item.fee_code_applied}")
            
            # Recalculate totals
            self._recalculate_receipt_totals(receipt)
            
            # Update metadata
            receipt.updated_by_user_id = user_id
            receipt.updated_at = datetime.utcnow()
            
            db.session.commit()
            
            current_app.logger.info(f"Toggled waiver for line item {line_item_id} on receipt {receipt_id}")
            return receipt
            
        except IntegrityError as e:
            db.session.rollback()
            current_app.logger.error(f"Integrity error toggling waiver: {str(e)}")
            raise ValueError("Failed to toggle waiver due to data integrity constraints")
        except SQLAlchemyError as e:
            db.session.rollback()
            current_app.logger.error(f"Database error toggling waiver: {str(e)}")
            raise
    
    def _recalculate_receipt_totals(self, receipt: Receipt) -> None:
        """
        Recalculate receipt totals based on current line items.
        
        Args:
            receipt: The receipt to recalculate totals for
        """
        line_items = ReceiptLineItem.query.filter_by(receipt_id=receipt.id).all()
        
        fuel_subtotal = Decimal('0.00')
        total_fees_amount = Decimal('0.00')
        total_waivers_amount = Decimal('0.00')
        tax_amount = Decimal('0.00')
        
        for item in line_items:
            if item.line_item_type == LineItemType.FUEL:
                fuel_subtotal += item.amount
            elif item.line_item_type == LineItemType.FEE:
                total_fees_amount += item.amount
            elif item.line_item_type == LineItemType.WAIVER:
                total_waivers_amount += abs(item.amount)  # Store as positive value
            elif item.line_item_type == LineItemType.TAX:
                tax_amount += item.amount
        
        # Update receipt totals
        receipt.fuel_subtotal = fuel_subtotal
        receipt.total_fees_amount = total_fees_amount
        receipt.total_waivers_amount = total_waivers_amount
        receipt.tax_amount = tax_amount
        receipt.grand_total_amount = fuel_subtotal + total_fees_amount - total_waivers_amount + tax_amount
    
    def generate_receipt_pdf(self, receipt: Receipt) -> bytes:
        """
        Generate a PDF representation of the receipt using ReportLab.
        
        Args:
            receipt: The receipt to generate PDF for
            
        Returns:
            PDF data as bytes
            
        Raises:
            ValueError: If receipt is not found or PDF generation fails
        """
        try:
            from reportlab.lib.pagesizes import letter
            from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
            from reportlab.lib.units import inch
            from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
            from reportlab.lib import colors
            from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
            from datetime import datetime
            import io
            
            # Get line items
            line_items = ReceiptLineItem.query.filter_by(receipt_id=receipt.id).all()
            
            # Create PDF buffer
            buffer = io.BytesIO()
            doc = SimpleDocTemplate(buffer, pagesize=letter, rightMargin=72, leftMargin=72, topMargin=72, bottomMargin=18)
            
            # Container for the 'Flowable' objects
            elements = []
            
            # Get styles
            styles = getSampleStyleSheet()
            
            # Custom styles
            title_style = ParagraphStyle(
                'CustomTitle',
                parent=styles['Heading1'],
                fontSize=24,
                alignment=TA_CENTER,
                textColor=colors.HexColor('#2563eb'),
                spaceAfter=12,
            )
            
            company_style = ParagraphStyle(
                'CompanyInfo',
                parent=styles['Normal'],
                fontSize=10,
                alignment=TA_CENTER,
                textColor=colors.grey,
                spaceAfter=20,
            )
            
            receipt_title_style = ParagraphStyle(
                'ReceiptTitle',
                parent=styles['Heading2'],
                fontSize=18,
                alignment=TA_CENTER,
                spaceAfter=6,
            )
            
            receipt_number_style = ParagraphStyle(
                'ReceiptNumber',
                parent=styles['Normal'],
                fontSize=14,
                fontName='Courier-Bold',
                alignment=TA_CENTER,
                spaceAfter=12,
            )
            
            section_title_style = ParagraphStyle(
                'SectionTitle',
                parent=styles['Heading3'],
                fontSize=12,
                textColor=colors.HexColor('#2563eb'),
                spaceAfter=6,
            )
            
            # Company header
            elements.append(Paragraph("FBO LaunchPad", title_style))
            elements.append(Paragraph("Professional Aviation Services<br/>Main Terminal, Gate A1<br/>Phone: (555) 123-4567", company_style))
            
            # Receipt title and number
            elements.append(Paragraph("RECEIPT", receipt_title_style))
            elements.append(Paragraph(f"{receipt.receipt_number or receipt.id}", receipt_number_style))
            
            # Status badge (simplified as text)
            if receipt.status:
                status_text = f"Status: {receipt.status.value if hasattr(receipt.status, 'value') else receipt.status}"
                elements.append(Paragraph(status_text, styles['Normal']))
            
            # Add VOID watermark if needed
            if hasattr(receipt.status, 'value') and receipt.status.value == 'VOID':
                void_style = ParagraphStyle(
                    'VoidWatermark',
                    parent=styles['Normal'],
                    fontSize=48,
                    alignment=TA_CENTER,
                    textColor=colors.red,
                    spaceAfter=12,
                )
                elements.append(Paragraph("VOID", void_style))
            
            elements.append(Spacer(1, 20))
            
            # Receipt information table
            elements.append(Paragraph("Receipt Information", section_title_style))
            
            receipt_info_data = [
                ['Receipt Number:', str(receipt.receipt_number or receipt.id)],
                ['Generated:', receipt.generated_at.strftime('%B %d, %Y at %I:%M %p') if receipt.generated_at else 'N/A'],
                ['Fuel Order ID:', f"#{receipt.fuel_order_id}"],
            ]
            
            if receipt.paid_at:
                receipt_info_data.insert(2, ['Paid:', receipt.paid_at.strftime('%B %d, %Y at %I:%M %p')])
            
            receipt_info_table = Table(receipt_info_data, colWidths=[2*inch, 3*inch])
            receipt_info_table.setStyle(TableStyle([
                ('VALIGN', (0, 0), (-1, -1), 'TOP'),
                ('FONTNAME', (0, 0), (-1, -1), 'Helvetica'),
                ('FONTSIZE', (0, 0), (-1, -1), 10),
                ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
                ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
                ('BACKGROUND', (0, 0), (0, -1), colors.lightgrey),
            ]))
            elements.append(receipt_info_table)
            elements.append(Spacer(1, 15))
            
            # Aircraft and Customer information
            elements.append(Paragraph("Aircraft & Customer Information", section_title_style))
            
            aircraft_info_data = [
                ['Tail Number:', getattr(receipt.fuel_order, 'tail_number', 'N/A') if receipt.fuel_order else 'N/A'],
                ['Customer:', receipt.customer.name if receipt.customer else 'N/A'],
            ]
            
            if receipt.aircraft_type_at_receipt_time:
                aircraft_info_data.insert(1, ['Aircraft Type:', receipt.aircraft_type_at_receipt_time])
            
            if receipt.is_caa_applied:
                aircraft_info_data.append(['CAA Member:', 'Yes'])
            
            aircraft_info_table = Table(aircraft_info_data, colWidths=[2*inch, 3*inch])
            aircraft_info_table.setStyle(TableStyle([
                ('VALIGN', (0, 0), (-1, -1), 'TOP'),
                ('FONTNAME', (0, 0), (-1, -1), 'Helvetica'),
                ('FONTSIZE', (0, 0), (-1, -1), 10),
                ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
                ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
                ('BACKGROUND', (0, 0), (0, -1), colors.lightgrey),
            ]))
            elements.append(aircraft_info_table)
            elements.append(Spacer(1, 15))
            
            # Fueling details
            elements.append(Paragraph("Fueling Details", section_title_style))
            
            fueling_data = [
                ['Fuel Type:', receipt.fuel_type_at_receipt_time or 'N/A'],
                ['Quantity:', f"{receipt.fuel_quantity_gallons_at_receipt_time or 'N/A'} gallons"],
                ['Price per Gallon:', f"${receipt.fuel_unit_price_at_receipt_time or 0:.2f}"],
            ]
            
            fueling_table = Table(fueling_data, colWidths=[2*inch, 3*inch])
            fueling_table.setStyle(TableStyle([
                ('VALIGN', (0, 0), (-1, -1), 'TOP'),
                ('FONTNAME', (0, 0), (-1, -1), 'Helvetica'),
                ('FONTSIZE', (0, 0), (-1, -1), 10),
                ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
                ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
                ('BACKGROUND', (0, 0), (0, -1), colors.lightgrey),
            ]))
            elements.append(fueling_table)
            elements.append(Spacer(1, 20))
            
            # Line items table
            elements.append(Paragraph("Line Items", section_title_style))
            
            line_items_data = [['Description', 'Type', 'Quantity', 'Unit Price', 'Amount']]
            
            for item in line_items:
                line_items_data.append([
                    item.description or '',
                    item.line_item_type.value if hasattr(item.line_item_type, 'value') else str(item.line_item_type),
                    str(item.quantity or ''),
                    f"${item.unit_price or 0:.2f}",
                    f"${item.amount or 0:.2f}"
                ])
            
            line_items_table = Table(line_items_data, colWidths=[2.5*inch, 0.8*inch, 0.8*inch, 0.9*inch, 1*inch])
            line_items_table.setStyle(TableStyle([
                ('VALIGN', (0, 0), (-1, -1), 'TOP'),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
                ('FONTSIZE', (0, 0), (-1, -1), 9),
                ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
                ('BACKGROUND', (0, 0), (-1, 0), colors.lightgrey),
                ('ALIGN', (2, 0), (-1, -1), 'RIGHT'),
            ]))
            elements.append(line_items_table)
            elements.append(Spacer(1, 20))
            
            # Totals
            elements.append(Paragraph("Totals", section_title_style))
            
            totals_data = [
                ['Fuel Subtotal:', f"${receipt.fuel_subtotal or 0:.2f}"],
                ['Total Fees:', f"${receipt.total_fees_amount or 0:.2f}"],
                ['Total Waivers:', f"-${receipt.total_waivers_amount or 0:.2f}"],
                ['Tax:', f"${receipt.tax_amount or 0:.2f}"],
                ['Grand Total:', f"${receipt.grand_total_amount or 0:.2f}"],
            ]
            
            totals_table = Table(totals_data, colWidths=[2*inch, 1.5*inch])
            totals_table.setStyle(TableStyle([
                ('VALIGN', (0, 0), (-1, -1), 'TOP'),
                ('FONTNAME', (0, 0), (-1, -1), 'Helvetica'),
                ('FONTSIZE', (0, 0), (-1, -1), 10),
                ('FONTNAME', (0, -1), (-1, -1), 'Helvetica-Bold'),
                ('FONTSIZE', (0, -1), (-1, -1), 12),
                ('ALIGN', (1, 0), (1, -1), 'RIGHT'),
                ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
                ('BACKGROUND', (0, -1), (-1, -1), colors.lightgrey),
                ('TEXTCOLOR', (0, -1), (-1, -1), colors.HexColor('#2563eb')),
            ]))
            elements.append(totals_table)
            elements.append(Spacer(1, 30))
            
            # Footer
            footer_style = ParagraphStyle(
                'Footer',
                parent=styles['Normal'],
                fontSize=8,
                alignment=TA_CENTER,
                textColor=colors.grey,
            )
            
            elements.append(Paragraph("Thank you for choosing FBO LaunchPad for your aviation needs.", footer_style))
            elements.append(Paragraph(f"Generated on {datetime.utcnow().strftime('%B %d, %Y at %I:%M %p')}", footer_style))
            
            # Build PDF
            doc.build(elements)
            
            # Get the value of the BytesIO buffer and return it
            pdf_data = buffer.getvalue()
            buffer.close()
            
            return pdf_data
            
        except ImportError:
            current_app.logger.error("ReportLab not available for PDF generation")
            raise ValueError("PDF generation not available - ReportLab not installed")
        except Exception as e:
            current_app.logger.error(f"Error generating PDF: {str(e)}")
            raise ValueError(f"Failed to generate PDF: {str(e)}") 