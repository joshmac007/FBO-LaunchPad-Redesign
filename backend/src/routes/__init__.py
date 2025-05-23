from .fuel_order_routes import fuel_order_bp
from .auth_routes import auth_bp
from .user_routes import user_bp
from .fuel_truck_routes import truck_bp

__all__ = ['fuel_order_bp', 'auth_bp', 'user_bp', 'truck_bp']
