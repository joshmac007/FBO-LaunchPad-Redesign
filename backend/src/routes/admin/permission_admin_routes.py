from flask import request, jsonify
from ...services.permission_service import PermissionService
from src.utils.enhanced_auth_decorators_v2 import require_permission_v2
from ...models.user import UserRole
from ...schemas import PermissionSchema, ErrorResponseSchema
from marshmallow import Schema, fields
from src.extensions import apispec
from .routes import admin_bp

class PermissionListResponseSchema(Schema):
    permissions = fields.List(fields.Nested(PermissionSchema))

@admin_bp.route('/permissions', methods=['GET', 'OPTIONS'])
@require_permission_v2('view_permissions')
def get_permissions():
    """
    ---
    get:
      summary: List all permissions (no authentication required for testing)
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