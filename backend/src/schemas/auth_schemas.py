from marshmallow import Schema, fields, validate

class RegisterRequestSchema(Schema):
    """Schema for user registration request"""
    email = fields.Email(required=True)
    password = fields.String(required=True, validate=validate.Length(min=8))
    name = fields.String(required=False)  # Optional name field
    username = fields.String(required=False)  # Optional username field

class UserResponseSchema(Schema):
    id = fields.Int(dump_only=True)
    username = fields.Str(dump_only=True)
    email = fields.Email(dump_only=True)
    role = fields.Str(dump_only=True)
    is_active = fields.Bool(dump_only=True)
    created_at = fields.DateTime(dump_only=True)

class RegisterResponseSchema(Schema):
    """Schema for user registration response"""
    message = fields.String(required=True)
    user = fields.Dict(keys=fields.String(), values=fields.Raw(), required=True)

class LoginRequestSchema(Schema):
    """Schema for login request"""
    email = fields.Email(required=True)
    password = fields.String(required=True)

class LoginSuccessResponseSchema(Schema):
    """Schema for successful login response"""
    token = fields.String(required=True)
    message = fields.String(required=True)

class ErrorResponseSchema(Schema):
    """Schema for error responses"""
    error = fields.String(required=True)
    details = fields.Dict(keys=fields.String(), values=fields.Raw(), required=False)

# --- New schema for user permissions response ---
class UserPermissionsResponseSchema(Schema):
    message = fields.Str(dump_only=True)
    permissions = fields.List(fields.Str(), dump_only=True) 