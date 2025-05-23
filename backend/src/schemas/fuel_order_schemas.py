from marshmallow import Schema, fields, validate, pre_load
from ..models.fuel_order import FuelOrderStatus
from .auth_schemas import ErrorResponseSchema

# --- Schemas for Payloads ---

class FuelOrderBaseSchema(Schema):
    # Common fields, adjust required/optional based on context
    tail_number = fields.Str(required=True, validate=validate.Length(max=20))
    customer_id = fields.Int(required=False, allow_none=True)
    fuel_type = fields.Str(required=True, validate=validate.Length(max=50))
    additive_requested = fields.Bool(load_default=False)
    requested_amount = fields.Decimal(required=False, allow_none=True, places=2)
    assigned_lst_user_id = fields.Int(required=True)
    assigned_truck_id = fields.Int(required=True)
    location_on_ramp = fields.Str(required=False, allow_none=True, validate=validate.Length(max=100))
    csr_notes = fields.Str(required=False, allow_none=True)

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
    customer_id = fields.Int(dump_only=True, allow_none=True)
    fuel_type = fields.Str(dump_only=True)
    additive_requested = fields.Bool(dump_only=True)
    requested_amount = fields.Decimal(dump_only=True, places=2, as_string=True, allow_none=True) # Dump Decimal as string
    assigned_lst_user_id = fields.Int(dump_only=True, allow_none=True)
    assigned_truck_id = fields.Int(dump_only=True, allow_none=True)
    location_on_ramp = fields.Str(dump_only=True, allow_none=True)
    csr_notes = fields.Str(dump_only=True, allow_none=True)
    start_meter_reading = fields.Decimal(dump_only=True, places=2, as_string=True, allow_none=True)
    end_meter_reading = fields.Decimal(dump_only=True, places=2, as_string=True, allow_none=True)
    calculated_gallons_dispensed = fields.Decimal(dump_only=True, places=2, as_string=True, allow_none=True)
    lst_notes = fields.Str(dump_only=True, allow_none=True)
    created_at = fields.DateTime(dump_only=True)
    dispatch_timestamp = fields.DateTime(dump_only=True, allow_none=True)
    acknowledge_timestamp = fields.DateTime(dump_only=True, allow_none=True)
    en_route_timestamp = fields.DateTime(dump_only=True, allow_none=True)
    fueling_start_timestamp = fields.DateTime(dump_only=True, allow_none=True)
    completion_timestamp = fields.DateTime(dump_only=True, allow_none=True)
    reviewed_timestamp = fields.DateTime(dump_only=True, allow_none=True)
    reviewed_by_csr_user_id = fields.Int(dump_only=True, allow_none=True)

class FuelOrderBriefResponseSchema(Schema): # For list view
    # Subset of fields for list responses
    id = fields.Int(dump_only=True)
    status = fields.Enum(FuelOrderStatus, by_value=True, dump_only=True)
    tail_number = fields.Str(dump_only=True)
    assigned_lst_user_id = fields.Int(dump_only=True, allow_none=True)
    assigned_truck_id = fields.Int(dump_only=True, allow_none=True)
    created_at = fields.DateTime(dump_only=True)

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