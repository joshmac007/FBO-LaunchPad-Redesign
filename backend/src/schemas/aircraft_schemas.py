from marshmallow import Schema, fields

class AircraftCreateSchema(Schema):
    tail_number = fields.String(required=True)
    aircraft_type = fields.String(required=False)
    fuel_type = fields.String(required=False)
    customer_id = fields.Integer(required=False, allow_none=True)

class AircraftUpdateSchema(Schema):
    aircraft_type = fields.String(required=False)
    fuel_type = fields.String(required=False)
    customer_id = fields.Integer(required=False, allow_none=True)

class AircraftResponseSchema(Schema):
    tail_number = fields.String()
    aircraft_type = fields.String()
    fuel_type = fields.String()
    customer_id = fields.Integer(allow_none=True)

class AircraftListSchema(Schema):
    message = fields.String()
    aircraft = fields.List(fields.Nested(AircraftResponseSchema))

class AircraftTypeResponseSchema(Schema):
    id = fields.Integer(dump_only=True)
    name = fields.String(dump_only=True)
    base_min_fuel_gallons_for_waiver = fields.Decimal(dump_only=True, places=2)
    classification_id = fields.Integer(dump_only=True)

class CreateAircraftTypeSchema(Schema):
    name = fields.String(required=True)
    base_min_fuel_gallons_for_waiver = fields.Decimal(required=True, places=2)

class UpdateAircraftTypeSchema(Schema):
    name = fields.String(required=False)
    base_min_fuel_gallons_for_waiver = fields.Decimal(required=False, places=2)

class ErrorResponseSchema(Schema):
    error = fields.String()
    details = fields.Raw(required=False)
