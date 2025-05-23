from marshmallow import Schema, fields

class FuelTruckSchema(Schema):
    """Schema for serializing FuelTruck model instances."""
    id = fields.Int(dump_only=True)
    truck_number = fields.Str(required=True)
    fuel_type = fields.Str(required=True)
    capacity = fields.Decimal(required=True, places=2)
    current_meter_reading = fields.Decimal(required=True, places=2)
    is_active = fields.Bool(dump_only=True)
    created_at = fields.DateTime(dump_only=True)
    updated_at = fields.DateTime(dump_only=True)

class FuelTruckCreateRequestSchema(Schema):
    """Schema for validating fuel truck creation requests."""
    truck_number = fields.Str(required=True)
    fuel_type = fields.Str(required=True)
    capacity = fields.Decimal(required=True, places=2)
    current_meter_reading = fields.Decimal(required=False, places=2, load_default=0)

class FuelTruckUpdateRequestSchema(Schema):
    """Schema for validating fuel truck update requests (PATCH). All fields optional."""
    truck_number = fields.Str(required=False)
    fuel_type = fields.Str(required=False)
    capacity = fields.Decimal(required=False, places=2)
    current_meter_reading = fields.Decimal(required=False, places=2)
    is_active = fields.Bool(required=False)

class FuelTruckCreateResponseSchema(Schema):
    """Schema for the fuel truck creation response."""
    message = fields.Str(dump_only=True)
    fuel_truck = fields.Nested(FuelTruckSchema, dump_only=True)

class FuelTruckListResponseSchema(Schema):
    """Schema for the fuel trucks list endpoint response."""
    message = fields.Str(dump_only=True)
    fuel_trucks = fields.List(fields.Nested(FuelTruckSchema), dump_only=True) 