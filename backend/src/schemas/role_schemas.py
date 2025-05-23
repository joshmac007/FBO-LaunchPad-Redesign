from marshmallow import Schema, fields

class RoleSchema(Schema):
    """Schema for role responses."""
    id = fields.Integer(dump_only=True)
    name = fields.String(required=True)
    description = fields.String(required=False, allow_none=True)
    created_at = fields.DateTime(dump_only=True)

class RoleCreateRequestSchema(Schema):
    """Schema for role creation requests."""
    name = fields.String(required=True)
    description = fields.String(required=False, allow_none=True)

class RoleUpdateRequestSchema(Schema):
    """Schema for role update requests."""
    name = fields.String(required=False)
    description = fields.String(required=False, allow_none=True)

class RoleListResponseSchema(Schema):
    """Schema for role list responses."""
    message = fields.String(required=True)
    roles = fields.Nested(RoleSchema, many=True, required=True)

class RoleAssignPermissionRequestSchema(Schema):
    """Schema for assigning a permission to a role."""
    permission_id = fields.Integer(required=True) 