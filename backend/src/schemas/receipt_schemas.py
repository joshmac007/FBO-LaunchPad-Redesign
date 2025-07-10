"""
Receipt Schemas

Marshmallow schemas for receipt lifecycle API request validation and response serialization.
"""

from marshmallow import Schema, fields, validate, validates, ValidationError, post_load
from datetime import datetime
from typing import Dict, Any


class CreateDraftReceiptSchema(Schema):
    """Schema for creating a draft receipt from a fuel order."""
    fuel_order_id = fields.Integer(required=True, validate=validate.Range(min=1))


class UpdateDraftReceiptSchema(Schema):
    """Schema for updating a draft receipt."""
    customer_id = fields.Integer(validate=validate.Range(min=1), allow_none=True)
    aircraft_type = fields.String(allow_none=True, validate=validate.Length(max=50))
    notes = fields.String(allow_none=True, validate=validate.Length(max=1000))
    additional_services = fields.List(
        fields.Dict(keys=fields.Str(), values=fields.Raw()),
        missing=[]
    )
    
    @validates('additional_services')
    def validate_additional_services(self, value):
        """Validate additional services structure."""
        if not isinstance(value, list):
            raise ValidationError('Additional services must be a list')
        
        for service in value:
            if not isinstance(service, dict):
                raise ValidationError('Each service must be a dictionary')
            
            if 'fee_code' not in service:
                raise ValidationError('Each service must have a fee_code')
            
            if 'quantity' not in service:
                raise ValidationError('Each service must have a quantity')
            
            try:
                quantity = float(service['quantity'])
                if quantity <= 0:
                    raise ValidationError('Service quantity must be positive')
            except (ValueError, TypeError):
                raise ValidationError('Service quantity must be a number')


class ReceiptLineItemSchema(Schema):
    """Schema for receipt line item response."""
    id = fields.Integer(dump_only=True)
    receipt_id = fields.Integer(dump_only=True)
    line_item_type = fields.String(dump_only=True)
    description = fields.String(dump_only=True)
    fee_code_applied = fields.String(dump_only=True, allow_none=True)
    quantity = fields.String(dump_only=True)  # String to handle Decimal serialization
    unit_price = fields.String(dump_only=True)  # String to handle Decimal serialization
    amount = fields.String(dump_only=True)  # String to handle Decimal serialization
    waiver_source = fields.String(dump_only=True, allow_none=True)
    is_manually_waivable = fields.Method('get_is_manually_waivable', dump_only=True)
    created_at = fields.DateTime(dump_only=True)
    updated_at = fields.DateTime(dump_only=True)
    
    def get_is_manually_waivable(self, obj):
        """Get whether this line item can be manually waived by looking up the associated FeeRule."""
        # Only fee line items can be waived
        if not hasattr(obj, 'line_item_type') or obj.line_item_type.value != 'FEE':
            return False
        
        # Must have a fee code to look up the rule
        if not obj.fee_code_applied:
            return False
        
        # Look up the fee rule
        from ..models.fee_rule import FeeRule
        fee_rule = FeeRule.query.filter_by(fee_code=obj.fee_code_applied).first()
        
        return fee_rule.is_manually_waivable if fee_rule else False


class ReceiptSchema(Schema):
    """Schema for receipt response."""
    id = fields.Integer(dump_only=True)
    receipt_number = fields.String(dump_only=True, allow_none=True)
    fuel_order_id = fields.Integer(dump_only=True, allow_none=True)
    customer_id = fields.Integer(dump_only=True)
    
    # Fuel order reference data (for display purposes)
    fuel_order_tail_number = fields.String(dump_only=True, allow_none=True)
    
    # Snapshot data
    aircraft_type_at_receipt_time = fields.String(dump_only=True, allow_none=True)
    fuel_type_at_receipt_time = fields.String(dump_only=True, allow_none=True)
    fuel_quantity_gallons_at_receipt_time = fields.String(dump_only=True, allow_none=True)
    fuel_unit_price_at_receipt_time = fields.String(dump_only=True, allow_none=True)
    
    # Calculated totals
    fuel_subtotal = fields.String(dump_only=True)
    total_fees_amount = fields.String(dump_only=True)
    total_waivers_amount = fields.String(dump_only=True)
    tax_amount = fields.String(dump_only=True)
    grand_total_amount = fields.String(dump_only=True)
    
    # Status and metadata
    status = fields.String(dump_only=True)
    is_caa_applied = fields.Boolean(dump_only=True)
    
    # Timestamps
    generated_at = fields.DateTime(dump_only=True, allow_none=True)
    paid_at = fields.DateTime(dump_only=True, allow_none=True)
    created_at = fields.DateTime(dump_only=True)
    updated_at = fields.DateTime(dump_only=True)
    
    # User tracking
    created_by_user_id = fields.Integer(dump_only=True)
    updated_by_user_id = fields.Integer(dump_only=True)
    
    # Optional nested line items
    line_items = fields.List(fields.Nested(ReceiptLineItemSchema), dump_only=True, missing=[])


class ReceiptListQuerySchema(Schema):
    """Schema for receipt list query parameters."""
    status = fields.String(
        validate=validate.OneOf(['DRAFT', 'GENERATED', 'PAID', 'VOID']),
        allow_none=True
    )
    customer_id = fields.Integer(validate=validate.Range(min=1), allow_none=True)
    date_from = fields.DateTime(allow_none=True)
    date_to = fields.DateTime(allow_none=True)
    search = fields.String(
        validate=validate.Length(max=100),
        allow_none=True
    )
    page = fields.Integer(validate=validate.Range(min=1), missing=1)
    per_page = fields.Integer(validate=validate.Range(min=1, max=100), missing=50)
    
    @validates('date_from')
    def validate_date_from(self, value):
        """Validate date_from is not in the future."""
        if value and value > datetime.utcnow():
            raise ValidationError('Start date cannot be in the future')
    
    @validates('date_to')
    def validate_date_to(self, value):
        """Validate date_to is not in the future."""
        if value and value > datetime.utcnow():
            raise ValidationError('End date cannot be in the future')
    
    @post_load
    def validate_date_range(self, data, **kwargs):
        """Validate that date_from is before date_to."""
        date_from = data.get('date_from')
        date_to = data.get('date_to')
        
        if date_from and date_to and date_from > date_to:
            raise ValidationError('Start date must be before end date')
        
        return data


class PaginationSchema(Schema):
    """Schema for pagination information."""
    page = fields.Integer(dump_only=True)
    pages = fields.Integer(dump_only=True)
    per_page = fields.Integer(dump_only=True)
    total = fields.Integer(dump_only=True)
    has_next = fields.Boolean(dump_only=True)
    has_prev = fields.Boolean(dump_only=True)


class ReceiptListResponseSchema(Schema):
    """Schema for receipt list response."""
    receipts = fields.List(fields.Nested(ReceiptSchema), dump_only=True)
    pagination = fields.Nested(PaginationSchema, dump_only=True)


class ReceiptDetailResponseSchema(Schema):
    """Schema for single receipt response with line items."""
    receipt = fields.Nested(ReceiptSchema, dump_only=True)


class CreateDraftReceiptResponseSchema(Schema):
    """Schema for create draft receipt response."""
    receipt = fields.Nested(ReceiptSchema, dump_only=True)
    message = fields.String(dump_only=True)


class UpdateDraftReceiptResponseSchema(Schema):
    """Schema for update draft receipt response."""
    receipt = fields.Nested(ReceiptSchema, dump_only=True)
    message = fields.String(dump_only=True)


class CalculateFeesResponseSchema(Schema):
    """Schema for calculate fees response."""
    receipt = fields.Nested(ReceiptSchema, dump_only=True)
    message = fields.String(dump_only=True)


class GenerateReceiptResponseSchema(Schema):
    """Schema for generate receipt response."""
    receipt = fields.Nested(ReceiptSchema, dump_only=True)
    message = fields.String(dump_only=True)


class MarkPaidResponseSchema(Schema):
    """Schema for mark as paid response."""
    receipt = fields.Nested(ReceiptSchema, dump_only=True)
    message = fields.String(dump_only=True)


class ErrorResponseSchema(Schema):
    """Schema for error responses."""
    error = fields.String(required=True)
    details = fields.Dict(allow_none=True)
    timestamp = fields.DateTime(dump_only=True)


# Schema instances for reuse
create_draft_receipt_schema = CreateDraftReceiptSchema()
update_draft_receipt_schema = UpdateDraftReceiptSchema()
receipt_schema = ReceiptSchema()
receipt_line_item_schema = ReceiptLineItemSchema()
receipt_list_query_schema = ReceiptListQuerySchema()
receipt_list_response_schema = ReceiptListResponseSchema()
receipt_detail_response_schema = ReceiptDetailResponseSchema()
create_draft_receipt_response_schema = CreateDraftReceiptResponseSchema()
update_draft_receipt_response_schema = UpdateDraftReceiptResponseSchema()
calculate_fees_response_schema = CalculateFeesResponseSchema()
generate_receipt_response_schema = GenerateReceiptResponseSchema()
mark_paid_response_schema = MarkPaidResponseSchema()
error_response_schema = ErrorResponseSchema() 