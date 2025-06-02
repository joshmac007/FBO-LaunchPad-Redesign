from marshmallow import Schema, fields, validate

# Import RoleBriefSchema from user_schemas for consistency
from .user_schemas import RoleBriefSchema

class RegisterRequestSchema(Schema):
    """Schema for user registration request"""
    email = fields.Email(required=True)
    password = fields.String(required=True, validate=validate.Length(min=8))
    username = fields.String(required=False)  # Login username field
    fullName = fields.String(required=False, attribute="name")  # Full name field, maps to User.name

class UserResponseSchema(Schema):
    id = fields.Int(dump_only=True)
    username = fields.Str(dump_only=True)
    fullName = fields.Str(dump_only=True, attribute="name")  # Maps to User.name in database
    email = fields.Email(dump_only=True)
    roles = fields.List(fields.Nested(RoleBriefSchema), dump_only=True)  # Changed from single role string to list
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
    user = fields.Dict(keys=fields.String(), values=fields.Raw(), required=True)

class ErrorResponseSchema(Schema):
    """Schema for error responses"""
    error = fields.String(required=True)
    details = fields.Dict(keys=fields.String(), values=fields.Raw(), required=False)

# --- New schema for user permissions response ---
class UserPermissionsResponseSchema(Schema):
    message = fields.Str(dump_only=True)
    permissions = fields.List(fields.Str(), dump_only=True) 