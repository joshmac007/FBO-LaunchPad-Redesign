#!/usr/bin/env python3
"""
Permission Performance Monitor
Phase 4 Step 3: Performance Optimization & Production Features

Monitors and analyzes permission checking performance with metrics collection.
"""

import time
import json
import logging
from typing import Dict, List, Optional, Any, Tuple
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from collections import defaultdict, deque
from functools import wraps
import statistics
import threading
import csv
import io

try:
    from flask import current_app
    FLASK_AVAILABLE = True
except ImportError:
    FLASK_AVAILABLE = False

logger = logging.getLogger(__name__)

@dataclass
class PermissionMetric:
    """Individual permission check metric."""
    user_id: int
    permission: str
    resource_type: Optional[str]
    resource_id: Optional[str]
    result: bool
    response_time_ms: float
    cache_hit: bool
    timestamp: datetime
    source: str = "unknown"  # API, background, etc.

@dataclass
class PerformanceStats:
    """Aggregated performance statistics."""
    total_checks: int = 0
    successful_checks: int = 0
    failed_checks: int = 0
    cache_hits: int = 0
    cache_misses: int = 0
    average_response_time_ms: float = 0.0
    min_response_time_ms: float = float('inf')
    max_response_time_ms: float = 0.0
    p95_response_time_ms: float = 0.0
    p99_response_time_ms: float = 0.0
    checks_per_second: float = 0.0
    error_rate_percent: float = 0.0
    cache_hit_rate_percent: float = 0.0

class PermissionPerformanceMonitor:
    """
    Performance monitoring for permission checking system.
    
    Features:
    - Real-time metrics collection
    - Statistical analysis
    - Performance alerting
    - Trend analysis
    - User-specific performance tracking
    """
    
    def __init__(self):
        """Initialize the performance monitor."""
        self.metrics: deque = deque(maxlen=10000)  # Keep last 10k metrics
        self.lock = threading.Lock()
        
        # Initialize settings with defaults
        self.enabled = True
        self.alert_thresholds = {
            'max_response_time_ms': 1000.0,
            'min_cache_hit_rate_percent': 80.0,
            'max_error_rate_percent': 5.0
        }
        
        # Performance tracking
        self.start_time = datetime.utcnow()
        self.last_reset = datetime.utcnow()
        
        # Statistics cache
        self._stats_cache = {}
        self._stats_cache_expiry = datetime.utcnow()
        self._stats_cache_ttl = 60  # 1 minute cache
        
        self.user_metrics = defaultdict(lambda: deque(maxlen=100))
        self.permission_metrics = defaultdict(lambda: deque(maxlen=100))
        self.hourly_stats = defaultdict(lambda: PerformanceStats())
        self.daily_stats = defaultdict(lambda: PerformanceStats())
    
    def _get_flask_config(self, key: str, default: Any = None) -> Any:
        """Safely get Flask configuration value."""
        if FLASK_AVAILABLE:
            try:
                return current_app.config.get(key, default)
            except RuntimeError:
                # No application context
                return default
        return default
    
    def is_enabled(self) -> bool:
        """Check if monitoring is enabled."""
        return self._get_flask_config('PERMISSION_MONITORING_ENABLED', True)
    
    def record_permission_check(self, user_id: int, permission: str, 
                              resource_type: Optional[str] = None,
                              resource_id: Optional[str] = None,
                              result: bool = True, response_time_ms: float = 0.0,
                              cache_hit: bool = False, source: str = "api") -> None:
        """Record a permission check metric."""
        if not self.enabled:
            return
        
        try:
            with self.lock:
                metric = PermissionMetric(
                    user_id=user_id,
                    permission=permission,
                    resource_type=resource_type,
                    resource_id=resource_id,
                    result=result,
                    response_time_ms=response_time_ms,
                    cache_hit=cache_hit,
                    timestamp=datetime.now(),
                    source=source
                )
                
                # Store in main metrics
                self.metrics.append(metric)
                
                # Store in user-specific metrics
                self.user_metrics[user_id].append(metric)
                
                # Store in permission-specific metrics
                self.permission_metrics[permission].append(metric)
                
                # Update aggregated stats
                self._update_aggregated_stats(metric)
                
                # Check for performance alerts
                self._check_performance_alerts(metric)
                
        except Exception as e:
            logger.error(f"Error recording permission check metric: {e}")
    
    def _update_aggregated_stats(self, metric: PermissionMetric):
        """Update hourly and daily aggregated statistics."""
        now = datetime.now()
        hour_key = now.strftime('%Y-%m-%d %H:00')
        day_key = now.strftime('%Y-%m-%d')
        
        # Update hourly stats
        hourly_stat = self.hourly_stats[hour_key]
        self._update_stat(hourly_stat, metric)
        
        # Update daily stats
        daily_stat = self.daily_stats[day_key]
        self._update_stat(daily_stat, metric)
    
    def _update_stat(self, stat: PerformanceStats, metric: PermissionMetric):
        """Update a single performance stat with new metric."""
        stat.total_checks += 1
        
        if metric.result:
            stat.successful_checks += 1
        else:
            stat.failed_checks += 1
        
        if metric.cache_hit:
            stat.cache_hits += 1
        else:
            stat.cache_misses += 1
        
        # Update response time stats
        if stat.total_checks == 1:
            stat.average_response_time_ms = metric.response_time_ms
            stat.min_response_time_ms = metric.response_time_ms
            stat.max_response_time_ms = metric.response_time_ms
        else:
            # Update average using exponential moving average
            alpha = 0.1
            stat.average_response_time_ms = (
                alpha * metric.response_time_ms + 
                (1 - alpha) * stat.average_response_time_ms
            )
            
            stat.min_response_time_ms = min(stat.min_response_time_ms, metric.response_time_ms)
            stat.max_response_time_ms = max(stat.max_response_time_ms, metric.response_time_ms)
        
        # Calculate rates
        if stat.total_checks > 0:
            stat.error_rate_percent = (stat.failed_checks / stat.total_checks) * 100
            stat.cache_hit_rate_percent = (stat.cache_hits / stat.total_checks) * 100
    
    def _check_performance_alerts(self, metric: PermissionMetric):
        """Check if metric triggers any performance alerts."""
        alerts = []
        
        # High response time alert
        if metric.response_time_ms > self.alert_thresholds['max_response_time_ms']:
            alerts.append({
                'type': 'high_response_time',
                'message': f"High response time: {metric.response_time_ms:.2f}ms for user {metric.user_id}, permission {metric.permission}",
                'severity': 'warning',
                'metric': metric
            })
        
        # Process alerts
        for alert in alerts:
            self._process_alert(alert)
    
    def _process_alert(self, alert: Dict[str, Any]):
        """Process a performance alert."""
        logger.warning(f"Performance Alert: {alert['message']}")
        
        # In a production system, this could:
        # - Send notifications
        # - Store in alert database
        # - Trigger automated responses
        # - Update monitoring dashboards
    
    def get_current_stats(self, timeframe: str = "last_hour") -> Dict[str, Any]:
        """Get current performance statistics."""
        try:
            with self.lock:
                if timeframe == "last_hour":
                    metrics = [m for m in self.metrics 
                             if m.timestamp > datetime.now() - timedelta(hours=1)]
                elif timeframe == "last_day":
                    metrics = [m for m in self.metrics 
                             if m.timestamp > datetime.now() - timedelta(days=1)]
                else:
                    metrics = list(self.metrics)
                
                if not metrics:
                    return self._empty_stats()
                
                return self._calculate_stats(metrics)
                
        except Exception as e:
            logger.error(f"Error getting current stats: {e}")
            return self._empty_stats()
    
    def _calculate_stats(self, metrics: List[PermissionMetric]) -> Dict[str, Any]:
        """Calculate statistics for a list of metrics."""
        if not metrics:
            return self._empty_stats()
        
        total_checks = len(metrics)
        successful_checks = sum(1 for m in metrics if m.result)
        failed_checks = total_checks - successful_checks
        cache_hits = sum(1 for m in metrics if m.cache_hit)
        cache_misses = total_checks - cache_hits
        
        response_times = [m.response_time_ms for m in metrics]
        
        # Calculate percentiles
        sorted_times = sorted(response_times)
        p95_index = int(0.95 * len(sorted_times))
        p99_index = int(0.99 * len(sorted_times))
        
        # Calculate time-based metrics
        time_span = (metrics[-1].timestamp - metrics[0].timestamp).total_seconds()
        checks_per_second = total_checks / time_span if time_span > 0 else 0
        
        return {
            'total_checks': total_checks,
            'successful_checks': successful_checks,
            'failed_checks': failed_checks,
            'cache_hits': cache_hits,
            'cache_misses': cache_misses,
            'success_rate_percent': (successful_checks / total_checks) * 100,
            'error_rate_percent': (failed_checks / total_checks) * 100,
            'cache_hit_rate_percent': (cache_hits / total_checks) * 100,
            'average_response_time_ms': statistics.mean(response_times),
            'median_response_time_ms': statistics.median(response_times),
            'min_response_time_ms': min(response_times),
            'max_response_time_ms': max(response_times),
            'p95_response_time_ms': sorted_times[p95_index] if p95_index < len(sorted_times) else 0,
            'p99_response_time_ms': sorted_times[p99_index] if p99_index < len(sorted_times) else 0,
            'checks_per_second': checks_per_second,
            'time_span_seconds': time_span,
            'start_time': metrics[0].timestamp.isoformat(),
            'end_time': metrics[-1].timestamp.isoformat()
        }
    
    def _empty_stats(self) -> Dict[str, Any]:
        """Return empty statistics structure."""
        return {
            'total_checks': 0,
            'successful_checks': 0,
            'failed_checks': 0,
            'cache_hits': 0,
            'cache_misses': 0,
            'success_rate_percent': 0.0,
            'error_rate_percent': 0.0,
            'cache_hit_rate_percent': 0.0,
            'average_response_time_ms': 0.0,
            'median_response_time_ms': 0.0,
            'min_response_time_ms': 0.0,
            'max_response_time_ms': 0.0,
            'p95_response_time_ms': 0.0,
            'p99_response_time_ms': 0.0,
            'checks_per_second': 0.0,
            'time_span_seconds': 0.0
        }
    
    def get_user_stats(self, user_id: int) -> Dict[str, Any]:
        """Get performance statistics for a specific user."""
        try:
            with self.lock:
                user_metrics = list(self.user_metrics.get(user_id, []))
                if not user_metrics:
                    return self._empty_stats()
                
                stats = self._calculate_stats(user_metrics)
                stats['user_id'] = user_id
                
                # Add user-specific insights
                stats['most_checked_permissions'] = self._get_top_permissions(user_metrics)
                stats['resource_type_breakdown'] = self._get_resource_breakdown(user_metrics)
                
                return stats
                
        except Exception as e:
            logger.error(f"Error getting user stats for {user_id}: {e}")
            return self._empty_stats()
    
    def get_permission_stats(self, permission: str) -> Dict[str, Any]:
        """Get performance statistics for a specific permission."""
        try:
            with self.lock:
                perm_metrics = list(self.permission_metrics.get(permission, []))
                if not perm_metrics:
                    return self._empty_stats()
                
                stats = self._calculate_stats(perm_metrics)
                stats['permission'] = permission
                
                # Add permission-specific insights
                stats['user_count'] = len(set(m.user_id for m in perm_metrics))
                stats['resource_type_breakdown'] = self._get_resource_breakdown(perm_metrics)
                
                return stats
                
        except Exception as e:
            logger.error(f"Error getting permission stats for {permission}: {e}")
            return self._empty_stats()
    
    def _get_top_permissions(self, metrics: List[PermissionMetric], limit: int = 5) -> List[Dict[str, Any]]:
        """Get most frequently checked permissions."""
        permission_counts = defaultdict(int)
        for metric in metrics:
            permission_counts[metric.permission] += 1
        
        sorted_permissions = sorted(permission_counts.items(), key=lambda x: x[1], reverse=True)
        
        return [
            {'permission': perm, 'count': count}
            for perm, count in sorted_permissions[:limit]
        ]
    
    def _get_resource_breakdown(self, metrics: List[PermissionMetric]) -> Dict[str, int]:
        """Get breakdown of checks by resource type."""
        resource_counts = defaultdict(int)
        for metric in metrics:
            resource_type = metric.resource_type or 'none'
            resource_counts[resource_type] += 1
        
        return dict(resource_counts)
    
    def get_performance_trends(self, timeframe: str = "last_24_hours") -> Dict[str, Any]:
        """Get performance trends over time."""
        try:
            with self.lock:
                now = datetime.now()
                
                if timeframe == "last_24_hours":
                    start_time = now - timedelta(hours=24)
                    interval = timedelta(hours=1)
                elif timeframe == "last_7_days":
                    start_time = now - timedelta(days=7)
                    interval = timedelta(days=1)
                else:
                    start_time = now - timedelta(hours=24)
                    interval = timedelta(hours=1)
                
                # Group metrics by time intervals
                trends = []
                current_time = start_time
                
                while current_time < now:
                    interval_end = current_time + interval
                    interval_metrics = [
                        m for m in self.metrics
                        if current_time <= m.timestamp < interval_end
                    ]
                    
                    if interval_metrics:
                        stats = self._calculate_stats(interval_metrics)
                        stats['interval_start'] = current_time.isoformat()
                        stats['interval_end'] = interval_end.isoformat()
                        trends.append(stats)
                    
                    current_time = interval_end
                
                return {
                    'timeframe': timeframe,
                    'interval_count': len(trends),
                    'trends': trends
                }
                
        except Exception as e:
            logger.error(f"Error getting performance trends: {e}")
            return {'timeframe': timeframe, 'interval_count': 0, 'trends': []}
    
    def get_slow_queries(self, threshold_ms: float = 500, limit: int = 10) -> List[Dict[str, Any]]:
        """Get slowest permission checks."""
        try:
            with self.lock:
                slow_metrics = [
                    m for m in self.metrics
                    if m.response_time_ms > threshold_ms
                ]
                
                # Sort by response time (slowest first)
                slow_metrics.sort(key=lambda x: x.response_time_ms, reverse=True)
                
                return [
                    {
                        'user_id': m.user_id,
                        'permission': m.permission,
                        'resource_type': m.resource_type,
                        'resource_id': m.resource_id,
                        'response_time_ms': m.response_time_ms,
                        'cache_hit': m.cache_hit,
                        'timestamp': m.timestamp.isoformat(),
                        'source': m.source
                    }
                    for m in slow_metrics[:limit]
                ]
                
        except Exception as e:
            logger.error(f"Error getting slow queries: {e}")
            return []
    
    def reset_metrics(self):
        """Reset all collected metrics."""
        try:
            with self.lock:
                self.metrics.clear()
                self.user_metrics.clear()
                self.permission_metrics.clear()
                self.hourly_stats.clear()
                self.daily_stats.clear()
                logger.info("Performance metrics reset")
                
        except Exception as e:
            logger.error(f"Error resetting metrics: {e}")
    
    def export_metrics(self, timeframe: str = "last_hour") -> List[Dict[str, Any]]:
        """Export metrics for external analysis."""
        try:
            with self.lock:
                if timeframe == "last_hour":
                    metrics = [m for m in self.metrics 
                             if m.timestamp > datetime.now() - timedelta(hours=1)]
                elif timeframe == "last_day":
                    metrics = [m for m in self.metrics 
                             if m.timestamp > datetime.now() - timedelta(days=1)]
                else:
                    metrics = list(self.metrics)
                
                return [
                    {
                        'user_id': m.user_id,
                        'permission': m.permission,
                        'resource_type': m.resource_type,
                        'resource_id': m.resource_id,
                        'result': m.result,
                        'response_time_ms': m.response_time_ms,
                        'cache_hit': m.cache_hit,
                        'timestamp': m.timestamp.isoformat(),
                        'source': m.source
                    }
                    for m in metrics
                ]
                
        except Exception as e:
            logger.error(f"Error exporting metrics: {e}")
            return []

def monitor_permission_performance(permission_monitor: PermissionPerformanceMonitor):
    """Decorator to monitor permission checking performance."""
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            start_time = time.time()
            result = None
            
            try:
                result = func(*args, **kwargs)
                
                # Extract monitoring information from function call
                user_id = kwargs.get('user_id') or (args[0] if args else None)
                permission = kwargs.get('permission') or (args[1] if len(args) > 1 else None)
                
                # Record the performance metric
                if user_id and permission:
                    response_time_ms = (time.time() - start_time) * 1000
                    permission_monitor.record_permission_check(
                        user_id=user_id,
                        permission=permission,
                        result=bool(result),
                        response_time_ms=response_time_ms,
                        source="decorator"
                    )
                
                return result
                
            except Exception as e:
                # Record failed check
                user_id = kwargs.get('user_id') or (args[0] if args else None)
                permission = kwargs.get('permission') or (args[1] if len(args) > 1 else None)
                
                if user_id and permission:
                    response_time_ms = (time.time() - start_time) * 1000
                    permission_monitor.record_permission_check(
                        user_id=user_id,
                        permission=permission,
                        result=False,
                        response_time_ms=response_time_ms,
                        source="decorator"
                    )
                
                raise
        
        return wrapper
    return decorator

# Create a lazy-initialized global instance
_performance_monitor_instance = None
_monitor_lock = threading.Lock()

def get_permission_performance_monitor() -> PermissionPerformanceMonitor:
    """Get the global performance monitor instance (lazy initialization)."""
    global _performance_monitor_instance
    
    if _performance_monitor_instance is None:
        with _monitor_lock:
            if _performance_monitor_instance is None:
                _performance_monitor_instance = PermissionPerformanceMonitor()
    
    return _performance_monitor_instance

# For backward compatibility
permission_performance_monitor = get_permission_performance_monitor() 