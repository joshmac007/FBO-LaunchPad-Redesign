"""
Performance Monitor Admin Routes
Phase 4 Step 3: Performance Optimization & Production Features

Administrative interface for monitoring permission system performance and managing cache.
"""

from flask import Blueprint, request, jsonify
from flask_jwt_extended import get_jwt_identity

from ...utils.enhanced_auth_decorators_v2 import require_permission_v2, audit_permission_access
from ...services.redis_permission_cache import redis_permission_cache
from ...services.permission_performance_monitor import permission_performance_monitor
from ...services.enhanced_permission_service import enhanced_permission_service

# Create admin blueprint
performance_monitor_bp = Blueprint('performance_monitor', __name__, url_prefix='/api/admin/performance')

@performance_monitor_bp.route('/stats', methods=['GET'])
@require_permission_v2('administrative_operations')
def get_performance_stats():
    """Get current performance statistics."""
    try:
        timeframe = request.args.get('timeframe', 'last_hour')
        
        # Get permission checking stats
        permission_stats = permission_performance_monitor.get_current_stats(timeframe)
        
        # Get cache stats
        cache_stats = redis_permission_cache.get_stats()
        cache_health = redis_permission_cache.health_check()
        
        return jsonify({
            'timeframe': timeframe,
            'permission_checking': permission_stats,
            'cache_performance': cache_stats,
            'cache_health': cache_health,
            'timestamp': permission_performance_monitor._get_current_timestamp() if hasattr(permission_performance_monitor, '_get_current_timestamp') else None
        }), 200
        
    except Exception as e:
        return jsonify({'error': f'Failed to retrieve performance stats: {str(e)}'}), 500

@performance_monitor_bp.route('/trends', methods=['GET'])
@require_permission_v2('administrative_operations')
def get_performance_trends():
    """Get performance trends over time."""
    try:
        timeframe = request.args.get('timeframe', 'last_24_hours')
        
        trends = permission_performance_monitor.get_performance_trends(timeframe)
        
        return jsonify({
            'trends': trends,
            'timeframe': timeframe
        }), 200
        
    except Exception as e:
        return jsonify({'error': f'Failed to retrieve performance trends: {str(e)}'}), 500

@performance_monitor_bp.route('/slow-queries', methods=['GET'])
@require_permission_v2('administrative_operations')
def get_slow_queries():
    """Get slowest permission checks."""
    try:
        threshold_ms = float(request.args.get('threshold_ms', 500))
        limit = int(request.args.get('limit', 10))
        
        slow_queries = permission_performance_monitor.get_slow_queries(threshold_ms, limit)
        
        return jsonify({
            'slow_queries': slow_queries,
            'threshold_ms': threshold_ms,
            'limit': limit,
            'count': len(slow_queries)
        }), 200
        
    except Exception as e:
        return jsonify({'error': f'Failed to retrieve slow queries: {str(e)}'}), 500

@performance_monitor_bp.route('/users/<int:user_id>/stats', methods=['GET'])
@require_permission_v2('administrative_operations')
def get_user_performance_stats(user_id):
    """Get performance statistics for a specific user."""
    try:
        user_stats = permission_performance_monitor.get_user_stats(user_id)
        
        # Get user permission summary from enhanced service
        permission_summary = enhanced_permission_service.get_user_permission_summary(user_id)
        
        return jsonify({
            'user_id': user_id,
            'performance_stats': user_stats,
            'permission_summary': permission_summary
        }), 200
        
    except Exception as e:
        return jsonify({'error': f'Failed to retrieve user performance stats: {str(e)}'}), 500

@performance_monitor_bp.route('/permissions/<permission>/stats', methods=['GET'])
@require_permission_v2('administrative_operations')
def get_permission_performance_stats(permission):
    """Get performance statistics for a specific permission."""
    try:
        permission_stats = permission_performance_monitor.get_permission_stats(permission)
        
        return jsonify({
            'permission': permission,
            'performance_stats': permission_stats
        }), 200
        
    except Exception as e:
        return jsonify({'error': f'Failed to retrieve permission performance stats: {str(e)}'}), 500

@performance_monitor_bp.route('/cache/status', methods=['GET'])
@require_permission_v2('administrative_operations')
def get_cache_status():
    """Get detailed cache status and health information."""
    try:
        health = redis_permission_cache.health_check()
        stats = redis_permission_cache.get_stats()
        
        return jsonify({
            'health': health,
            'statistics': stats,
            'configuration': {
                'max_connections': 20,  # This would come from config
                'default_ttl': 1800,
                'monitoring_enabled': permission_performance_monitor.enabled
            }
        }), 200
        
    except Exception as e:
        return jsonify({'error': f'Failed to retrieve cache status: {str(e)}'}), 500

@performance_monitor_bp.route('/cache/invalidate', methods=['POST'])
@audit_permission_access({'action': 'cache_invalidation', 'category': 'performance'})
@require_permission_v2('administrative_operations')
def invalidate_cache():
    """Invalidate cache entries based on criteria."""
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No invalidation criteria provided'}), 400
        
        invalidated_count = 0
        
        # Invalidate by user ID
        if 'user_id' in data:
            user_id = data['user_id']
            count = redis_permission_cache.invalidate_user_permissions(user_id)
            invalidated_count += count
            
        # Invalidate by role ID
        elif 'role_id' in data:
            role_id = data['role_id']
            count = redis_permission_cache.invalidate_role_permissions(role_id)
            invalidated_count += count
            
        # Invalidate by permission group ID
        elif 'group_id' in data:
            group_id = data['group_id']
            count = redis_permission_cache.invalidate_permission_group(group_id)
            invalidated_count += count
            
        # Invalidate by pattern
        elif 'pattern' in data:
            pattern = data['pattern']
            count = redis_permission_cache.delete_pattern(pattern)
            invalidated_count += count
            
        else:
            return jsonify({'error': 'Invalid invalidation criteria'}), 400
        
        return jsonify({
            'message': 'Cache invalidation completed',
            'invalidated_entries': invalidated_count,
            'criteria': data
        }), 200
        
    except Exception as e:
        return jsonify({'error': f'Failed to invalidate cache: {str(e)}'}), 500

@performance_monitor_bp.route('/cache/warm', methods=['POST'])
@audit_permission_access({'action': 'cache_warming', 'category': 'performance'})
@require_permission_v2('administrative_operations')
def warm_cache():
    """Pre-populate cache with frequently accessed permissions."""
    try:
        data = request.get_json() or {}
        
        # Get list of active users to warm cache for
        from ...models.user import User
        
        limit = data.get('user_limit', 100)
        users = User.query.filter_by(is_active=True).limit(limit).all()
        
        warmed_entries = 0
        errors = 0
        
        for user in users:
            try:
                # Get user permissions to populate cache
                permissions = enhanced_permission_service.get_user_permissions(user.id, include_groups=True)
                
                # Cache each permission
                for permission in permissions:
                    cache_key = redis_permission_cache.generate_cache_key(user.id, permission)
                    redis_permission_cache.set(cache_key, True, ttl=1800)
                    warmed_entries += 1
                    
            except Exception as e:
                errors += 1
                continue
        
        return jsonify({
            'message': 'Cache warming completed',
            'users_processed': len(users),
            'entries_warmed': warmed_entries,
            'errors': errors
        }), 200
        
    except Exception as e:
        return jsonify({'error': f'Failed to warm cache: {str(e)}'}), 500

@performance_monitor_bp.route('/metrics/export', methods=['GET'])
@require_permission_v2('administrative_operations')
def export_metrics():
    """Export performance metrics for external analysis."""
    try:
        timeframe = request.args.get('timeframe', 'last_hour')
        format_type = request.args.get('format', 'json')
        
        metrics = permission_performance_monitor.export_metrics(timeframe)
        
        if format_type == 'csv':
            # Convert to CSV format
            import csv
            import io
            
            output = io.StringIO()
            if metrics:
                fieldnames = metrics[0].keys()
                writer = csv.DictWriter(output, fieldnames=fieldnames)
                writer.writeheader()
                writer.writerows(metrics)
            
            return jsonify({
                'format': 'csv',
                'data': output.getvalue(),
                'count': len(metrics)
            }), 200
        else:
            return jsonify({
                'format': 'json',
                'data': metrics,
                'count': len(metrics),
                'timeframe': timeframe
            }), 200
        
    except Exception as e:
        return jsonify({'error': f'Failed to export metrics: {str(e)}'}), 500

@performance_monitor_bp.route('/metrics/reset', methods=['POST'])
@audit_permission_access({'action': 'metrics_reset', 'category': 'performance'})
@require_permission_v2('administrative_operations')
def reset_metrics():
    """Reset all performance metrics."""
    try:
        # Reset permission performance metrics
        permission_performance_monitor.reset_metrics()
        
        # Reset cache statistics
        redis_permission_cache.reset_stats()
        
        return jsonify({
            'message': 'All performance metrics have been reset'
        }), 200
        
    except Exception as e:
        return jsonify({'error': f'Failed to reset metrics: {str(e)}'}), 500

@performance_monitor_bp.route('/alerts/thresholds', methods=['GET'])
@require_permission_v2('administrative_operations')
def get_alert_thresholds():
    """Get current performance alert thresholds."""
    try:
        thresholds = permission_performance_monitor.alert_thresholds
        
        return jsonify({
            'thresholds': thresholds,
            'monitoring_enabled': permission_performance_monitor.enabled
        }), 200
        
    except Exception as e:
        return jsonify({'error': f'Failed to retrieve alert thresholds: {str(e)}'}), 500

@performance_monitor_bp.route('/alerts/thresholds', methods=['PUT'])
@audit_permission_access({'action': 'update_alert_thresholds', 'category': 'performance'})
@require_permission_v2('administrative_operations')
def update_alert_thresholds():
    """Update performance alert thresholds."""
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No threshold data provided'}), 400
        
        # Validate and update thresholds
        valid_thresholds = ['max_response_time_ms', 'min_cache_hit_rate', 'max_error_rate']
        updated_thresholds = {}
        
        for key, value in data.items():
            if key in valid_thresholds:
                if isinstance(value, (int, float)) and value >= 0:
                    permission_performance_monitor.alert_thresholds[key] = value
                    updated_thresholds[key] = value
                else:
                    return jsonify({'error': f'Invalid threshold value for {key}'}), 400
        
        return jsonify({
            'message': 'Alert thresholds updated successfully',
            'updated_thresholds': updated_thresholds
        }), 200
        
    except Exception as e:
        return jsonify({'error': f'Failed to update alert thresholds: {str(e)}'}), 500

@performance_monitor_bp.route('/monitoring/toggle', methods=['POST'])
@audit_permission_access({'action': 'toggle_monitoring', 'category': 'performance'})
@require_permission_v2('administrative_operations')
def toggle_monitoring():
    """Enable or disable performance monitoring."""
    try:
        data = request.get_json() or {}
        enabled = data.get('enabled', not permission_performance_monitor.enabled)
        
        permission_performance_monitor.enabled = enabled
        
        return jsonify({
            'message': f'Performance monitoring {"enabled" if enabled else "disabled"}',
            'monitoring_enabled': enabled
        }), 200
        
    except Exception as e:
        return jsonify({'error': f'Failed to toggle monitoring: {str(e)}'}), 500

@performance_monitor_bp.route('/dashboard', methods=['GET'])
@require_permission_v2('administrative_operations')
def get_dashboard_data():
    """Get comprehensive dashboard data for performance monitoring."""
    try:
        # Get current stats
        current_stats = permission_performance_monitor.get_current_stats('last_hour')
        
        # Get cache status
        cache_health = redis_permission_cache.health_check()
        cache_stats = redis_permission_cache.get_stats()
        
        # Get recent slow queries
        slow_queries = permission_performance_monitor.get_slow_queries(500, 5)
        
        # Get trends
        trends = permission_performance_monitor.get_performance_trends('last_24_hours')
        
        return jsonify({
            'current_stats': current_stats,
            'cache_health': cache_health,
            'cache_stats': cache_stats,
            'recent_slow_queries': slow_queries,
            'trends': trends,
            'alert_thresholds': permission_performance_monitor.alert_thresholds,
            'monitoring_enabled': permission_performance_monitor.enabled,
            'timestamp': permission_performance_monitor._get_current_timestamp() if hasattr(permission_performance_monitor, '_get_current_timestamp') else None
        }), 200
        
    except Exception as e:
        return jsonify({'error': f'Failed to retrieve dashboard data: {str(e)}'}), 500

# Error handlers
@performance_monitor_bp.errorhandler(403)
def permission_denied(error):
    """Enhanced permission denied handler."""
    return jsonify({
        'error': 'Permission denied',
        'message': 'You do not have sufficient administrative permissions for performance monitoring'
    }), 403

@performance_monitor_bp.errorhandler(404)
def not_found(error):
    """Enhanced not found handler."""
    return jsonify({
        'error': 'Resource not found',
        'message': 'The requested performance monitoring resource was not found'
    }), 404 