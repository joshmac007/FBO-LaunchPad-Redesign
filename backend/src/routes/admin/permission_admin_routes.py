from flask import request, jsonify
from ...services.permission_service import PermissionService
from src.utils.decorators import token_required, require_permission
from ...models.user import UserRole
from ...schemas import PermissionSchema, ErrorResponseSchema
from marshmallow import Schema, fields
from src.extensions import apispec
from .routes import admin_bp

class PermissionListResponseSchema(Schema):
    permissions = fields.List(fields.Nested(PermissionSchema))

@admin_bp.route('permissions', methods=['GET', 'OPTIONS'])
@admin_bp.route('/permissions', methods=['GET', 'OPTIONS'])
@token_required
@require_permission('MANAGE_ROLES')
def get_permissions():
    """
    ---
    get:
      summary: List all permissions (admin, MANAGE_ROLES permission required)
      tags:
        - Admin - Permissions
      responses:
        200:
          description: List of permissions
          content:
            application/json:
              schema: PermissionListResponseSchema
        401:
          description: Unauthorized
        403:
          description: Forbidden (missing permission)
    """
    if request.method == 'OPTIONS':
        return jsonify({'message': 'OPTIONS request successful'}), 200
    permissions, msg, status = PermissionService.get_all_permissions()
    schema = PermissionSchema(many=True)
    return jsonify({"permissions": schema.dump(permissions)}), status 