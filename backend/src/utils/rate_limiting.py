from functools import wraps
from flask import request, jsonify
from datetime import datetime, timedelta
import time

# Store rate limiting state
rate_limits = {}

def rate_limit(limit=5, window=300):
    """
    Rate limiting decorator that limits the number of requests per time window.
    
    Args:
        limit (int): Maximum number of requests allowed within the window
        window (int): Time window in seconds
        
    Returns:
        decorator: Function that implements rate limiting
    """
    def decorator(f):
        @wraps(f)
        def wrapped(*args, **kwargs):
            # Get client IP
            client_ip = request.remote_addr
            
            # Get current timestamp
            now = time.time()
            
            # Initialize rate limit entry for this IP if it doesn't exist
            if client_ip not in rate_limits:
                rate_limits[client_ip] = {
                    'count': 0,
                    'reset_time': now + window
                }
                
            # Check if window has expired and reset if needed
            if now > rate_limits[client_ip]['reset_time']:
                rate_limits[client_ip] = {
                    'count': 0,
                    'reset_time': now + window
                }
                
            # Increment request count
            rate_limits[client_ip]['count'] += 1
            
            # Check if limit exceeded
            if rate_limits[client_ip]['count'] > limit:
                reset_time = datetime.fromtimestamp(rate_limits[client_ip]['reset_time'])
                retry_after = int(rate_limits[client_ip]['reset_time'] - now)
                
                return jsonify({
                    'error': 'Rate limit exceeded',
                    'retry_after': retry_after
                }), 429
                
            return f(*args, **kwargs)
        return wrapped
    return decorator

def reset_rate_limits():
    """Reset all rate limiting state (useful for testing)."""
    global rate_limits
    rate_limits = {} 