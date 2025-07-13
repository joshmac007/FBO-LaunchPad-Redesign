from marshmallow import Schema, fields

class CustomerCreateSchema(Schema):
    name = fields.String(required=True)
    email = fields.Email(required=False)
    phone = fields.String(required=False)
    company_name = fields.String(required=False)
    phone_number = fields.String(required=False)
    address = fields.String(required=False)
    payment_type = fields.String(required=False)
    poc_role = fields.String(required=False)

class CustomerUpdateSchema(Schema):
    name = fields.String(required=False)
    email = fields.Email(required=False)
    phone = fields.String(required=False)
    company_name = fields.String(required=False)
    phone_number = fields.String(required=False)
    address = fields.String(required=False)
    payment_type = fields.String(required=False)
    poc_role = fields.String(required=False)

class CustomerResponseSchema(Schema):
    id = fields.Integer()
    name = fields.String()
    email = fields.Email()
    phone = fields.String()
    company_name = fields.String()
    phone_number = fields.String()
    address = fields.String()
    payment_type = fields.String()
    poc_role = fields.String()
    is_placeholder = fields.Boolean()
    is_caa_member = fields.Boolean()
    caa_member_id = fields.String()
    created_at = fields.DateTime()
    updated_at = fields.DateTime()

class CustomerListSchema(Schema):
    message = fields.String()
    customers = fields.List(fields.Nested(CustomerResponseSchema))

class ErrorResponseSchema(Schema):
    error = fields.String()
    details = fields.Raw(required=False)
