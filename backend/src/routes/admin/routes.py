from flask import Blueprint

admin_bp = Blueprint('admin', __name__)

# Import all admin route modules
from .user_admin_routes import *
from .permission_admin_routes import *
from .role_admin_routes import *
from .customer_admin_routes import *
from .aircraft_admin_routes import *

# Register routes with the admin blueprint
# Note: The individual route modules should use admin_bp from this module 