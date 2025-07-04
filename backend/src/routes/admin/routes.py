from flask import Blueprint

admin_bp = Blueprint('admin', __name__)

# Import all admin route modules
# from .user_admin_routes import *  # REMOVED: Conflicting/redundant with main user routes
from .permission_admin_routes import *
from .role_admin_routes import *
from .customer_admin_routes import *
from .aircraft_admin_routes import *
from .lst_admin_routes import *
from .fuel_truck_admin_routes import *
from .fuel_type_admin_routes import *
from .performance_monitor_routes import performance_monitor_bp

# Register routes with the admin blueprint
# Note: The individual route modules should use admin_bp from this module 