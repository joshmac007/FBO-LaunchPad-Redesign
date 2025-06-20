#!/usr/bin/env python3
"""
Redis Permission Cache Service
Phase 4 Step 3: Performance Optimization & Production Features

Enhanced Redis caching with connection pooling, cluster support, and monitoring.
"""

import time
import threading
import json
import logging
import hashlib
from typing import Dict, List, Optional, Any, Union, Tuple
from dataclasses import dataclass
from datetime import datetime, timedelta
from flask import current_app
from redis.connection import ConnectionPool
from redis.sentinel import Sentinel
from collections import defaultdict

try:
    import redis
    REDIS_AVAILABLE = True
except ImportError:
    REDIS_AVAILABLE = False
    redis = None

try:
    from flask import current_app
    FLASK_AVAILABLE = True
except ImportError:
    FLASK_AVAILABLE = False

logger = logging.getLogger(__name__)

@dataclass
class CacheStats:
    """Cache performance statistics."""
    hits: int = 0
    misses: int = 0
    invalidations: int = 0
    errors: int = 0
    total_requests: int = 0
    average_response_time: float = 0.0
    cache_hits: int = 0
    cache_misses: int = 0
    hit_rate_percent: float = 0.0
    last_reset: datetime = None
    
    @property
    def hit_rate(self) -> float:
        """Calculate cache hit rate."""
        if self.total_requests == 0:
            return 0.0
        return (self.hits / self.total_requests) * 100
    
    @property
    def miss_rate(self) -> float:
        """Calculate cache miss rate."""
        return 100.0 - self.hit_rate

class RedisPermissionCache:
    """
    Enhanced Redis cache service for permission data with:
    - Connection pooling
    - Cluster support
    - Performance monitoring
    - Smart invalidation
    - Automatic failover
    """
    
    def __init__(self):
        """Initialize Redis cache service."""
        self.redis_client = None
        self.connection_pool = None
        self.sentinel = None
        self.lock = threading.Lock()
        
        # Statistics
        self.stats = CacheStats()
        self.stats.last_reset = datetime.utcnow()
        
        # Configuration defaults
        self.default_ttl = 1800  # 30 minutes
        self.key_prefix = "fbo:perm:"
        
        # Connection settings with defaults
        self.connection_config = {
            'max_connections': 20,
            'decode_responses': True,
            'health_check_interval': 30,
            'socket_connect_timeout': 5,
            'socket_timeout': 5,
            'retry_on_timeout': True
        }
        
        # Initialize Redis connection if available
        self._init_redis_connection()
        
    def _init_redis_connection(self):
        """Initialize Redis connection with Flask config or defaults."""
        if not REDIS_AVAILABLE:
            return
            
        try:
            # Get Redis URL from Flask config or use default
            redis_url = self._get_flask_config('REDIS_URL', 'redis://localhost:6379/0')
            
            # Create connection pool
            self.connection_pool = redis.ConnectionPool.from_url(
                redis_url,
                **self.connection_config
            )
            
            # Create Redis client
            self.redis_client = redis.Redis(connection_pool=self.connection_pool)
            
            # Test connection
            self.redis_client.ping()
            
        except Exception as e:
            # Redis connection failed, will operate without cache
            self.redis_client = None
            self.connection_pool = None
    
    def _get_flask_config(self, key: str, default: Any = None) -> Any:
        """Safely get Flask configuration value."""
        if FLASK_AVAILABLE:
            try:
                return current_app.config.get(key, default)
            except RuntimeError:
                # No application context
                return default
        return default
    
    def _init_cluster_connection(self):
        """Initialize Redis cluster connection."""
        try:
            from rediscluster import RedisCluster
            
            cluster_nodes = current_app.config['REDIS_CLUSTER_NODES']
            
            self.redis_client = RedisCluster(
                startup_nodes=cluster_nodes,
                decode_responses=True,
                skip_full_coverage_check=True,
                health_check_interval=30
            )
            
            self.is_cluster_mode = True
            logger.info(f"Redis cluster connection established with {len(cluster_nodes)} nodes")
            
        except ImportError:
            logger.error("redis-py-cluster not installed for cluster support")
            raise
        except Exception as e:
            logger.error(f"Failed to initialize Redis cluster: {e}")
            raise
    
    def _init_sentinel_connection(self):
        """Initialize Redis Sentinel for high availability."""
        try:
            sentinel_hosts = current_app.config['REDIS_SENTINEL_HOSTS']
            master_name = current_app.config.get('REDIS_MASTER_NAME', 'mymaster')
            
            self.sentinel = Sentinel(sentinel_hosts)
            self.redis_client = self.sentinel.master_for(
                master_name,
                socket_timeout=5,
                decode_responses=True
            )
            
            self.is_sentinel_mode = True
            logger.info(f"Redis Sentinel connection established for master '{master_name}'")
            
        except Exception as e:
            logger.error(f"Failed to initialize Redis Sentinel: {e}")
            raise
    
    def get(self, key: str) -> Optional[Any]:
        """Get value from cache with performance monitoring."""
        start_time = time.time()
        
        try:
            self.stats.total_requests += 1
            
            if not self.redis_client:
                self.stats.errors += 1
                return None
            
            value = self.redis_client.get(key)
            
            if value is not None:
                self.stats.hits += 1
                result = json.loads(value)
                logger.debug(f"Cache HIT for key: {key}")
                return result
            else:
                self.stats.misses += 1
                logger.debug(f"Cache MISS for key: {key}")
                return None
                
        except Exception as e:
            self.stats.errors += 1
            logger.error(f"Redis GET error for key {key}: {e}")
            return None
        finally:
            # Update average response time
            response_time = time.time() - start_time
            self._update_response_time(response_time)
    
    def set(self, key: str, value: Any, ttl: int = 1800) -> bool:
        """Set value in cache with TTL."""
        try:
            if not self.redis_client:
                return False
            
            serialized_value = json.dumps(value)
            result = self.redis_client.setex(key, ttl, serialized_value)
            
            logger.debug(f"Cache SET for key: {key} (TTL: {ttl}s)")
            return bool(result)
            
        except Exception as e:
            self.stats.errors += 1
            logger.error(f"Redis SET error for key {key}: {e}")
            return False
    
    def delete(self, key: str) -> bool:
        """Delete key from cache."""
        try:
            if not self.redis_client:
                return False
            
            result = self.redis_client.delete(key)
            
            if result > 0:
                self.stats.invalidations += 1
                logger.debug(f"Cache DELETE for key: {key}")
                
            return result > 0
            
        except Exception as e:
            self.stats.errors += 1
            logger.error(f"Redis DELETE error for key {key}: {e}")
            return False
    
    def delete_pattern(self, pattern: str) -> int:
        """Delete all keys matching pattern."""
        try:
            if not self.redis_client:
                return 0
            
            keys = self.redis_client.keys(pattern)
            if keys:
                deleted = self.redis_client.delete(*keys)
                self.stats.invalidations += deleted
                logger.info(f"Cache pattern DELETE: {pattern} (deleted {deleted} keys)")
                return deleted
            
            return 0
            
        except Exception as e:
            self.stats.errors += 1
            logger.error(f"Redis pattern DELETE error for pattern {pattern}: {e}")
            return 0
    
    def invalidate_user_permissions(self, user_id: int) -> int:
        """Invalidate all permission cache entries for a user."""
        pattern = f"perm:{user_id}:*"
        return self.delete_pattern(pattern)
    
    def invalidate_role_permissions(self, role_id: int) -> int:
        """Invalidate permissions for all users with a specific role."""
        try:
            # Import here to avoid circular imports
            from ..models.role import Role
            
            role = Role.query.get(role_id)
            if not role:
                return 0
            
            total_deleted = 0
            for user in role.users:
                deleted = self.invalidate_user_permissions(user.id)
                total_deleted += deleted
            
            logger.info(f"Invalidated permissions for role {role.name} (affected {len(role.users)} users)")
            return total_deleted
            
        except Exception as e:
            logger.error(f"Error invalidating role permissions: {e}")
            return 0
    
    def invalidate_permission_group(self, group_id: int) -> int:
        """Invalidate cache for all users affected by permission group changes."""
        try:
            from ..models.permission_group import PermissionGroup, RolePermissionGroup
            
            group = PermissionGroup.query.get(group_id)
            if not group:
                return 0
            
            affected_users = set()
            
            # Get all roles assigned to this group
            role_groups = RolePermissionGroup.query.filter_by(group_id=group_id).all()
            for role_group in role_groups:
                for user in role_group.role.users:
                    affected_users.add(user.id)
            
            # Invalidate cache for each affected user
            total_deleted = 0
            for user_id in affected_users:
                deleted = self.invalidate_user_permissions(user_id)
                total_deleted += deleted
            
            logger.info(f"Invalidated permissions for group {group.name} (affected {len(affected_users)} users)")
            return total_deleted
            
        except Exception as e:
            logger.error(f"Error invalidating group permissions: {e}")
            return 0
    
    def health_check(self) -> Dict[str, Any]:
        """Perform health check on Redis connection."""
        try:
            if not self.redis_client:
                return {
                    'status': 'disconnected',
                    'error': 'No Redis connection available'
                }
            
            # Test basic operations
            start_time = time.time()
            self.redis_client.ping()
            ping_time = time.time() - start_time
            
            # Get Redis info
            info = self.redis_client.info()
            
            return {
                'status': 'healthy',
                'ping_time_ms': round(ping_time * 1000, 2),
                'connected_clients': info.get('connected_clients', 0),
                'used_memory_human': info.get('used_memory_human', 'Unknown'),
                'redis_version': info.get('redis_version', 'Unknown'),
                'mode': 'cluster' if self.is_cluster_mode else 'sentinel' if self.is_sentinel_mode else 'single',
                'uptime_in_seconds': info.get('uptime_in_seconds', 0)
            }
            
        except Exception as e:
            return {
                'status': 'error',
                'error': str(e)
            }
    
    def get_stats(self) -> Dict[str, Any]:
        """Get cache performance statistics."""
        return {
            'hits': self.stats.hits,
            'misses': self.stats.misses,
            'invalidations': self.stats.invalidations,
            'errors': self.stats.errors,
            'total_requests': self.stats.total_requests,
            'hit_rate_percent': round(self.stats.hit_rate, 2),
            'miss_rate_percent': round(self.stats.miss_rate, 2),
            'average_response_time_ms': round(self.stats.average_response_time * 1000, 2)
        }
    
    def reset_stats(self):
        """Reset performance statistics."""
        self.stats = CacheStats()
        self.stats.last_reset = datetime.utcnow()
        logger.info("Cache statistics reset")
    
    def _update_response_time(self, response_time: float):
        """Update average response time."""
        if self.stats.total_requests == 1:
            self.stats.average_response_time = response_time
        else:
            # Calculate exponential moving average
            alpha = 0.1  # Smoothing factor
            self.stats.average_response_time = (
                alpha * response_time + 
                (1 - alpha) * self.stats.average_response_time
            )
    
    def generate_cache_key(self, user_id: int, permission: str, 
                          resource_context: Optional[Dict] = None) -> str:
        """Generate optimized cache key with context hashing."""
        base_key = f"perm:{user_id}:{permission}"
        
        if resource_context:
            # Create a stable hash for resource context
            context_str = json.dumps(resource_context, sort_keys=True)
            context_hash = hashlib.md5(context_str.encode()).hexdigest()[:8]
            base_key += f":{context_hash}"
        
        return base_key
    
    def batch_get(self, keys: List[str]) -> Dict[str, Any]:
        """Get multiple cache values in a single operation."""
        try:
            if not self.redis_client or not keys:
                return {}
            
            start_time = time.time()
            values = self.redis_client.mget(keys)
            
            result = {}
            for i, (key, value) in enumerate(zip(keys, values)):
                self.stats.total_requests += 1
                
                if value is not None:
                    self.stats.hits += 1
                    try:
                        result[key] = json.loads(value)
                    except json.JSONDecodeError:
                        logger.warning(f"Invalid JSON in cache for key {key}")
                        self.stats.errors += 1
                else:
                    self.stats.misses += 1
            
            # Update response time
            response_time = time.time() - start_time
            self._update_response_time(response_time)
            
            logger.debug(f"Batch GET: {len(result)} hits, {len(keys) - len(result)} misses")
            return result
            
        except Exception as e:
            self.stats.errors += len(keys)
            logger.error(f"Redis batch GET error: {e}")
            return {}
    
    def batch_set(self, data: Dict[str, Any], ttl: int = 1800) -> bool:
        """Set multiple cache values in a single operation."""
        try:
            if not self.redis_client or not data:
                return False
            
            # Prepare data for Redis
            redis_data = {}
            for key, value in data.items():
                redis_data[key] = json.dumps(value)
            
            # Use pipeline for batch operations
            pipe = self.redis_client.pipeline()
            pipe.mset(redis_data)
            
            # Set TTL for each key
            for key in data.keys():
                pipe.expire(key, ttl)
            
            pipe.execute()
            
            logger.debug(f"Batch SET: {len(data)} keys with TTL {ttl}s")
            return True
            
        except Exception as e:
            self.stats.errors += len(data)
            logger.error(f"Redis batch SET error: {e}")
            return False
    
    def close(self):
        """Close Redis connection."""
        try:
            if self.connection_pool:
                self.connection_pool.disconnect()
            if self.redis_client:
                self.redis_client.close()
            logger.info("Redis connection closed")
        except Exception as e:
            logger.error(f"Error closing Redis connection: {e}")

# Create a lazy-initialized global instance
_redis_cache_instance = None
_cache_lock = threading.Lock()

def get_redis_permission_cache() -> RedisPermissionCache:
    """Get the global Redis cache instance (lazy initialization)."""
    global _redis_cache_instance
    
    if _redis_cache_instance is None:
        with _cache_lock:
            if _redis_cache_instance is None:
                _redis_cache_instance = RedisPermissionCache()
    
    return _redis_cache_instance

# For backward compatibility
redis_permission_cache = get_redis_permission_cache() 