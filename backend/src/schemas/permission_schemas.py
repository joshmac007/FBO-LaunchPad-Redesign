from marshmallow import Schema, fields

class PermissionSchema(Schema):
    """Schema for permission responses."""
    id = fields.Integer(dump_only=True)
    name = fields.String(dump_only=True)
    description = fields.String(dump_only=True)
    created_at = fields.DateTime(dump_only=True) 