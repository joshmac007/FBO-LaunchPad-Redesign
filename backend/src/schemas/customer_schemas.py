from marshmallow import Schema, fields

class CustomerCreateSchema(Schema):
    name = fields.String(required=True)

class CustomerUpdateSchema(Schema):
    name = fields.String(required=False)

class CustomerResponseSchema(Schema):
    id = fields.Integer()
    name = fields.String()

class CustomerListSchema(Schema):
    message = fields.String()
    customers = fields.List(fields.Nested(CustomerResponseSchema))

class ErrorResponseSchema(Schema):
    error = fields.String()
    details = fields.Raw(required=False)
