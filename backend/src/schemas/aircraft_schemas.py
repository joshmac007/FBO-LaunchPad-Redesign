from marshmallow import Schema, fields

class AircraftCreateSchema(Schema):
    tail_number = fields.String(required=True)
    aircraft_type = fields.String(required=False)
    customer_id = fields.Integer(required=False, allow_none=True)

class AircraftUpdateSchema(Schema):
    aircraft_type = fields.String(required=False)
    customer_id = fields.Integer(required=False, allow_none=True)

class AircraftResponseSchema(Schema):
    tail_number = fields.String()
    aircraft_type = fields.String()
    customer_id = fields.Integer(allow_none=True)

class AircraftListSchema(Schema):
    message = fields.String()
    aircraft = fields.List(fields.Nested(AircraftResponseSchema))

class ErrorResponseSchema(Schema):
    error = fields.String()
    details = fields.Raw(required=False)
