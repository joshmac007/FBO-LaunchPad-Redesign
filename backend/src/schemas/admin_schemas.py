from marshmallow import Schema, fields

class AdminAircraftSchema(Schema):
    tail_number = fields.String(required=True)
    aircraft_type = fields.String(required=True)
    fuel_type = fields.Method("get_fuel_type_name", required=True)
    customer_id = fields.Integer(allow_none=True)
    created_at = fields.DateTime(dump_only=True)
    updated_at = fields.DateTime(dump_only=True)
    
    def get_fuel_type_name(self, obj):
        """Extract fuel type name from the relationship."""
        return obj.fuel_type.name if obj.fuel_type else None

class AdminAircraftListResponseSchema(Schema):
    aircraft = fields.List(fields.Nested(AdminAircraftSchema))

class AdminCustomerSchema(Schema):
    id = fields.Integer(required=True)
    name = fields.String(required=True)

class AdminCustomerListResponseSchema(Schema):
    customers = fields.List(fields.Nested(AdminCustomerSchema))

class ErrorResponseSchema(Schema):
    message = fields.String(required=True)
    code = fields.Integer()
