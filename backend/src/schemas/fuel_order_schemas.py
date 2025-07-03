from marshmallow import Schema, fields, validate, pre_load
from ..models.fuel_order import FuelOrderStatus
from ..models.receipt import ReceiptStatus
from .auth_schemas import ErrorResponseSchema

# --- Schemas for Payloads ---

class FuelOrderBaseSchema(Schema):
    # Common fields, adjust required/optional based on context
    tail_number = fields.Str(required=True, validate=validate.Length(max=20))
    customer_id = fields.Int(required=False, allow_none=True)
    fuel_type = fields.Str(required=True, validate=validate.Length(max=50))
    service_type = fields.Str(required=False, allow_none=True, validate=validate.Length(max=50))
    additive_requested = fields.Bool(load_default=False)
    requested_amount = fields.Decimal(required=False, allow_none=True, places=2)
    assigned_lst_user_id = fields.Int(required=True)
    assigned_truck_id = fields.Int(required=True)
    location_on_ramp = fields.Str(required=False, allow_none=True, validate=validate.Length(max=100))
    csr_notes = fields.Str(required=False, allow_none=True)
    priority = fields.Str(required=False, allow_none=True, validate=validate.OneOf(['normal', 'high', 'urgent']))

class FuelOrderCreateRequestSchema(FuelOrderBaseSchema):
    """
    Request schema for creating a fuel order. Allows assigned_lst_user_id to be -1 for auto-assign (the backend will select the least busy active LST).
    """
    assigned_lst_user_id = fields.Int(required=True, metadata={"description": "Set to -1 to auto-assign the least busy LST."})

class FuelOrderUpdateRequestSchema(Schema): # For potential future PUT/PATCH
     # Define fields allowed for update, likely optional
     pass

class FuelOrderStatusUpdateRequestSchema(Schema):
    status = fields.Str(required=True, validate=validate.OneOf([s.name for s in FuelOrderStatus]))

    # Convert incoming status string to uppercase before validation/loading
    @pre_load
    def uppercase_status(self, data, **kwargs):
        if 'status' in data and isinstance(data['status'], str):
            data['status'] = data['status'].upper()
        return data

class FuelOrderCompleteRequestSchema(Schema):
    start_meter_reading = fields.Decimal(required=True, places=2)
    end_meter_reading = fields.Decimal(required=True, places=2)
    lst_notes = fields.Str(required=False, allow_none=True)

# --- Schemas for Responses ---

class OrderStatusCountsSchema(Schema):
    pending = fields.Int(dump_only=True)
    in_progress = fields.Int(dump_only=True)
    completed = fields.Int(dump_only=True)

class OrderStatusCountsResponseSchema(Schema):
    """
    Response schema for fuel order status counts endpoint.
    """
    message = fields.Str(dump_only=True)
    counts = fields.Nested(OrderStatusCountsSchema, dump_only=True)


class FuelOrderResponseSchema(Schema):
    # Full representation of a FuelOrder
    id = fields.Int(dump_only=True)
    status = fields.Enum(FuelOrderStatus, by_value=True, dump_only=True) # Dump enum value
    tail_number = fields.Str(dump_only=True)
    aircraft_registration = fields.Str(dump_only=True, attribute="tail_number")  # Frontend field mapping
    customer_id = fields.Int(dump_only=True, allow_none=True)
    # Include customer information via relationship
    customer_name = fields.Str(dump_only=True, attribute="customer.name", allow_none=True)
    fuel_type = fields.Str(dump_only=True, attribute="fuel_type.name")  # Access fuel type name through relationship
    fuel_type_id = fields.Int(dump_only=True)  # Include fuel_type_id for backend compatibility
    fuel_type_name = fields.Str(dump_only=True, attribute="fuel_type.name")  # Explicit fuel_type_name field
    fuel_type_code = fields.Str(dump_only=True, attribute="fuel_type.code")  # Include fuel_type_code
    service_type = fields.Str(dump_only=True)
    additive_requested = fields.Bool(dump_only=True)
    requested_amount = fields.Decimal(dump_only=True, places=2, as_string=True, allow_none=True) # Dump Decimal as string
    gallons_requested = fields.Method("get_gallons_requested", dump_only=True, allow_none=True)  # Frontend field mapping
    assigned_lst_user_id = fields.Int(dump_only=True, allow_none=True)
    assigned_to_id = fields.Int(dump_only=True, allow_none=True, attribute="assigned_lst_user_id")  # Frontend field mapping
    assigned_truck_id = fields.Int(dump_only=True, allow_none=True)
    # Denormalized fields for optimization
    assigned_lst_username = fields.Str(dump_only=True, attribute="assigned_lst.username", allow_none=True)
    assigned_lst_fullName = fields.Str(dump_only=True, attribute="assigned_lst.name", allow_none=True)
    assigned_truck_number = fields.Str(dump_only=True, attribute="assigned_truck.truck_number", allow_none=True)
    location_on_ramp = fields.Str(dump_only=True, allow_none=True)
    csr_notes = fields.Str(dump_only=True, allow_none=True)
    lst_notes = fields.Str(dump_only=True, allow_none=True)
    notes = fields.Method("get_notes", dump_only=True, allow_none=True)  # Generic notes field for frontend
    # Add priority field instead of hardcoding
    priority = fields.Method("get_priority_value", dump_only=True, allow_none=True)
    start_meter_reading = fields.Decimal(dump_only=True, places=2, as_string=True, allow_none=True)
    end_meter_reading = fields.Decimal(dump_only=True, places=2, as_string=True, allow_none=True)
    calculated_gallons_dispensed = fields.Decimal(dump_only=True, places=2, as_string=True, allow_none=True)
    gallons_dispensed = fields.Decimal(dump_only=True, places=2, as_string=True, allow_none=True)
    created_at = fields.DateTime(dump_only=True)
    estimated_completion_time = fields.DateTime(dump_only=True, allow_none=True)
    completed_at = fields.DateTime(dump_only=True, allow_none=True, attribute="completion_timestamp")
    reviewed_at = fields.DateTime(dump_only=True, allow_none=True, attribute="reviewed_timestamp")
    review_notes = fields.Str(dump_only=True, allow_none=True)
    dispatch_timestamp = fields.DateTime(dump_only=True, allow_none=True)
    acknowledge_timestamp = fields.DateTime(dump_only=True, allow_none=True)
    en_route_timestamp = fields.DateTime(dump_only=True, allow_none=True)
    fueling_start_timestamp = fields.DateTime(dump_only=True, allow_none=True)
    completion_timestamp = fields.DateTime(dump_only=True, allow_none=True)
    reviewed_timestamp = fields.DateTime(dump_only=True, allow_none=True)
    reviewed_by_csr_user_id = fields.Int(dump_only=True, allow_none=True)
    
    # New fields for receipt linking and order locking
    receipt_id = fields.Method("get_active_receipt_id", allow_none=True)
    is_locked = fields.Method("get_is_locked", dump_only=True)

    def get_active_receipt_id(self, obj):
        """Find the first non-voided receipt. This handles the void-and-recreate flow."""
        for receipt in obj.receipts:
            if receipt.status != ReceiptStatus.VOID:
                return receipt.id
        return None

    def get_is_locked(self, obj):
        """An order is locked if it has any receipt that is NOT voided."""
        return any(r.status != ReceiptStatus.VOID for r in obj.receipts)
    
    def get_priority_value(self, obj):
        """Extract the priority enum value as a string."""
        return obj.priority.value if obj.priority else None

    def get_gallons_requested(self, obj):
        """Convert requested_amount to gallons_requested for frontend compatibility."""
        return float(obj.requested_amount) if obj.requested_amount else None

    def get_notes(self, obj):
        """Return generic notes field for frontend (prioritizes lst_notes over csr_notes)."""
        return obj.lst_notes or obj.csr_notes

class FuelOrderBriefResponseSchema(Schema): # For list view
    # Subset of fields for list responses
    id = fields.Int(dump_only=True)
    status = fields.Enum(FuelOrderStatus, by_value=True, dump_only=True)
    tail_number = fields.Str(dump_only=True)
    aircraft_registration = fields.Str(dump_only=True, attribute="tail_number")  # Frontend field mapping
    customer_id = fields.Int(dump_only=True, allow_none=True)
    customer_name = fields.Str(dump_only=True, attribute="customer.name", allow_none=True)
    fuel_type = fields.Str(dump_only=True, attribute="fuel_type.name")  # Access fuel type name through relationship
    fuel_type_id = fields.Int(dump_only=True)  # Include fuel_type_id for backend compatibility
    fuel_type_name = fields.Str(dump_only=True, attribute="fuel_type.name")  # Explicit fuel_type_name field
    fuel_type_code = fields.Str(dump_only=True, attribute="fuel_type.code")  # Include fuel_type_code
    service_type = fields.Str(dump_only=True)
    gallons_requested = fields.Method("get_gallons_requested", dump_only=True, allow_none=True)  # Frontend field mapping
    assigned_lst_user_id = fields.Int(dump_only=True, allow_none=True)
    assigned_to_id = fields.Int(dump_only=True, allow_none=True, attribute="assigned_lst_user_id")  # Frontend field mapping
    assigned_truck_id = fields.Int(dump_only=True, allow_none=True)
    # Denormalized fields for optimization
    assigned_lst_username = fields.Str(dump_only=True, attribute="assigned_lst.username", allow_none=True)
    assigned_lst_fullName = fields.Str(dump_only=True, attribute="assigned_lst.name", allow_none=True)
    assigned_truck_number = fields.Str(dump_only=True, attribute="assigned_truck.truck_number", allow_none=True)
    priority = fields.Method("get_priority_value", dump_only=True, allow_none=True)
    created_at = fields.DateTime(dump_only=True)
    # Add completion fields for completed orders
    start_meter_reading = fields.Decimal(dump_only=True, places=2, as_string=True, allow_none=True)
    end_meter_reading = fields.Decimal(dump_only=True, places=2, as_string=True, allow_none=True)
    calculated_gallons_dispensed = fields.Decimal(dump_only=True, places=2, as_string=True, allow_none=True)
    gallons_dispensed = fields.Decimal(dump_only=True, places=2, as_string=True, allow_none=True)
    completion_timestamp = fields.DateTime(dump_only=True, allow_none=True)
    completed_at = fields.DateTime(dump_only=True, allow_none=True, attribute="completion_timestamp")
    # Add notes and change version fields that frontend needs
    notes = fields.Method("get_notes", dump_only=True, allow_none=True)  # Generic notes field for frontend
    change_version = fields.Int(dump_only=True, allow_none=True)
    acknowledged_change_version = fields.Int(dump_only=True, allow_none=True)
    updated_at = fields.DateTime(dump_only=True)
    
    def get_priority_value(self, obj):
        """Extract the priority enum value as a string."""
        return obj.priority.value if obj.priority else None

    def get_gallons_requested(self, obj):
        """Convert requested_amount to gallons_requested for frontend compatibility."""
        return float(obj.requested_amount) if obj.requested_amount else None

    def get_notes(self, obj):
        """Return generic notes field for frontend (prioritizes lst_notes over csr_notes)."""
        return obj.lst_notes or obj.csr_notes

class FuelOrderCreateResponseSchema(Schema):
    message = fields.Str(dump_only=True)
    fuel_order = fields.Nested(FuelOrderResponseSchema, dump_only=True) # Return full details on create

class FuelOrderUpdateResponseSchema(Schema): # For status, complete, review
    message = fields.Str(dump_only=True)
    fuel_order = fields.Nested(FuelOrderResponseSchema, dump_only=True) # Return updated details

class PaginationSchema(Schema):
    page = fields.Int(dump_only=True)
    per_page = fields.Int(dump_only=True)
    total_pages = fields.Int(dump_only=True)
    total_items = fields.Int(dump_only=True)
    has_next = fields.Bool(dump_only=True)
    has_prev = fields.Bool(dump_only=True)

class FuelOrderListResponseSchema(Schema):
    message = fields.Str(dump_only=True)
    fuel_orders = fields.List(fields.Nested(FuelOrderBriefResponseSchema), dump_only=True) # Use brief schema for list
    pagination = fields.Nested(PaginationSchema, dump_only=True) 