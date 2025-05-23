from marshmallow import Schema, fields, validate

class RoleBriefSchema(Schema):
    """Brief schema for role information in user responses."""
    id = fields.Integer()
    name = fields.String()

class UserCreateRequestSchema(Schema):
    """Schema for user creation requests."""
    email = fields.Email(required=True)
    password = fields.String(required=True, load_only=True, validate=validate.Length(min=6))
    role_ids = fields.List(fields.Integer(), required=True)
    name = fields.String(required=False)
    is_active = fields.Boolean(required=False)

class UserUpdateRequestSchema(Schema):
    """Schema for user update requests."""
    name = fields.String(required=False)
    email = fields.Email(required=False)
    role_ids = fields.List(fields.Integer(), required=False)
    is_active = fields.Boolean(required=False)
    password = fields.String(required=False, load_only=True, validate=validate.Length(min=6))

class UserBriefSchema(Schema):
    """Brief schema for user information in list responses."""
    id = fields.Integer()
    name = fields.String(attribute="username")
    email = fields.Email()
    roles = fields.List(fields.Nested(RoleBriefSchema))
    is_active = fields.Boolean()
    created_at = fields.DateTime()

class UserDetailSchema(Schema):
    """Detailed schema for single user responses."""
    id = fields.Integer()
    name = fields.String(attribute="username")
    email = fields.Email()
    roles = fields.List(fields.Nested(RoleBriefSchema))
    is_active = fields.Boolean()
    created_at = fields.DateTime()
    updated_at = fields.DateTime()

class UserListResponseSchema(Schema):
    """Schema for list of users response."""
    message = fields.String()
    users = fields.List(fields.Nested(UserBriefSchema))

class ErrorResponseSchema(Schema):
    """Schema for error responses."""
    error = fields.String()
    details = fields.Raw(required=False)
