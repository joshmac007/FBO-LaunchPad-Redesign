from marshmallow import Schema, fields, validate, validates_schema, ValidationError

class RoleBriefSchema(Schema):
    """Brief schema for role information in user responses."""
    id = fields.Integer()
    name = fields.String()

class UserCreateRequestSchema(Schema):
    """Schema for user creation requests."""
    email = fields.Email(required=True)
    password = fields.String(required=True, load_only=True, validate=validate.Length(min=6))
    role_ids = fields.List(fields.Integer(), required=True)
    username = fields.String(required=False)
    fullName = fields.String(required=False, attribute="name")
    is_active = fields.Boolean(required=False)

class UserUpdateRequestSchema(Schema):
    """Schema for user update requests."""
    username = fields.String(required=False)
    fullName = fields.String(required=False, attribute="name")
    email = fields.Email(required=False)
    role_ids = fields.List(fields.Integer(), required=False)
    is_active = fields.Boolean(required=False)
    password = fields.String(required=False, load_only=True, validate=validate.Length(min=6))

class UserBriefSchema(Schema):
    """Brief schema for user information in list responses."""
    id = fields.Integer()
    username = fields.String()
    fullName = fields.String(attribute="name")
    email = fields.Email()
    roles = fields.List(fields.Nested(RoleBriefSchema))
    is_active = fields.Boolean()
    created_at = fields.DateTime()

class UserDetailSchema(Schema):
    """Detailed schema for single user responses."""
    id = fields.Integer()
    username = fields.String()
    fullName = fields.String(attribute="name")
    email = fields.Email()
    roles = fields.List(fields.Nested(RoleBriefSchema))
    is_active = fields.Boolean()
    created_at = fields.DateTime()
    updated_at = fields.DateTime()

class UserListResponseSchema(Schema):
    """Schema for list of users response."""
    message = fields.String()
    users = fields.List(fields.Nested(UserBriefSchema))

class UserPreferencesSchema(Schema):
    """Schema for user preferences validation."""
    fee_schedule_view_size = fields.String(
        validate=validate.OneOf(['compact', 'standard', 'detailed']),
        required=False
    )
    fee_schedule_sort_order = fields.String(
        validate=validate.OneOf(['alphabetical', 'amount_asc', 'amount_desc', 'classification']),
        required=False
    )
    highlight_overrides = fields.Boolean(
        required=False
    )
    show_classification_defaults = fields.Boolean(
        missing=True
    )
    dismissed_tooltips = fields.List(
        fields.String(),
        required=False,
        missing=[]
    )
    fee_schedule_column_codes = fields.List(
        fields.String(),
        required=False
    )

class ErrorResponseSchema(Schema):
    """Schema for error responses."""
    error = fields.String()
    details = fields.Raw(required=False)
