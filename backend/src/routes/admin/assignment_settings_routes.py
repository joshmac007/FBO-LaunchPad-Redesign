# assignment_settings_routes.py
# Deprecated: Global auto-assign setting is no longer used. All logic removed as of April 2025.

from flask import Blueprint, jsonify
from ..utils.enhanced_auth_decorators_v2 import require_permission_v2
from . import admin_bp

@admin_bp.route('/assignment-settings', methods=['GET'])
@require_permission_v2('administrative_operations')
def get_assignment_settings():
    """Get assignment settings.
    This endpoint is deprecated as of April 2025. Global auto-assign setting is no longer used.
    ---
    tags:
      - Admin
    security:
      - bearerAuth: []
    responses:
      404:
        description: Feature deprecated
    """
    return jsonify({
        "error": "This feature has been deprecated. Global auto-assign setting is no longer used.",
        "code": "FEATURE_DEPRECATED"
    }), 404
