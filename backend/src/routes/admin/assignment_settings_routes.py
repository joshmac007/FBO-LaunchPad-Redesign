# assignment_settings_routes.py
# Deprecated: Global auto-assign setting is no longer used. All logic removed as of April 2025.

from flask import Blueprint, jsonify
from ..utils.decorators import token_required, require_permission
from . import admin_bp

@admin_bp.route('/assignment-settings', methods=['GET'])
@token_required
@require_permission('ADMIN')
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
