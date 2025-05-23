from marshmallow import Schema, fields

class AdminAircraftSchema(Schema):
    tail_number = fields.String(required=True)
    aircraft_type = fields.String()
    customer_id = fields.Integer(allow_none=True)

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
