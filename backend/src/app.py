import os
from flask import Flask, jsonify, current_app, request
from flask_cors import CORS
from apispec.ext.marshmallow import MarshmallowPlugin
from apispec_webframeworks.flask import FlaskPlugin
import logging

from src.config import config
from src.extensions import db, migrate, jwt, apispec, marshmallow_plugin
from src.cli import init_app as init_cli  # Import CLI initialization
from src.schemas import (
    RegisterRequestSchema,
    UserResponseSchema,
    RegisterResponseSchema,
    LoginRequestSchema,
    LoginSuccessResponseSchema,
    ErrorResponseSchema,
    FuelOrderCreateRequestSchema,
    FuelOrderStatusUpdateRequestSchema,
    FuelOrderCompleteRequestSchema,
    FuelOrderResponseSchema,
    FuelOrderBriefResponseSchema,
    FuelOrderCreateResponseSchema,
    FuelOrderUpdateResponseSchema,
    PaginationSchema,
    FuelOrderListResponseSchema,
    FuelTruckSchema,
    FuelTruckListResponseSchema,
    FuelTruckCreateRequestSchema,
    FuelTruckCreateResponseSchema,
    OrderStatusCountsSchema,
    OrderStatusCountsResponseSchema,
    UserPermissionsResponseSchema
)

def create_app(config_name=None):
    """Application factory function."""
    if config_name is None:
        config_name = os.getenv('FLASK_ENV', 'development')

    # Create Flask app instance
    app = Flask(__name__)

    # Initialize CORS before any other extensions or blueprints
    # Use permissive settings for development
    CORS(
        app,
        resources={
            r"/api/*": {
                "origins": "*",  # Allow all origins in development
                "methods": ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
                "allow_headers": [
                    "Content-Type",
                    "Authorization",
                    "X-Requested-With",
                    "Accept",
                    "Origin",
                    "Access-Control-Request-Method",
                    "Access-Control-Request-Headers"
                ],
                "expose_headers": ["Content-Type", "Authorization"],
                "supports_credentials": True,
                "max_age": 3600  # Cache preflight requests for 1 hour
            }
        }
    )

    # Load config
    app.config.from_object(config[config_name])

    # Initialize other extensions
    db.init_app(app)
    migrate.init_app(app, db)
    jwt.init_app(app)
    init_cli(app)

    # Initialize API documentation with apispec
    flask_plugin = FlaskPlugin()
    apispec.plugins = [flask_plugin, marshmallow_plugin]

    # Re-initialize resolver for marshmallow plugin with updated plugins
    marshmallow_plugin.init_spec(apispec)
    
    # Add security scheme for JWT
    apispec.components.security_scheme(
        "bearerAuth",
        {
            "type": "http",
            "scheme": "bearer",
            "bearerFormat": "JWT",
        }
    )

    # Import blueprints here to avoid circular imports
    from src.routes.auth_routes import auth_bp
    from src.routes.fuel_order_routes import fuel_order_bp
    from src.routes.user_routes import user_bp
    from src.routes.fuel_truck_routes import truck_bp
    from src.routes.aircraft_routes import aircraft_bp
    from src.routes.customer_routes import customer_bp
    from src.routes.admin.routes import admin_bp

    # Register blueprints with strict_slashes=False to prevent 308 redirects for both /api/resource and /api/resource/
    app.register_blueprint(auth_bp, url_prefix='/api/auth', strict_slashes=False)
    app.register_blueprint(fuel_order_bp, url_prefix='/api/fuel-orders', strict_slashes=False)
    app.register_blueprint(user_bp, url_prefix='/api/users', strict_slashes=False)
    app.register_blueprint(truck_bp, url_prefix='/api/fuel-trucks', strict_slashes=False)
    app.register_blueprint(aircraft_bp, url_prefix='/api/aircraft', strict_slashes=False)
    app.register_blueprint(customer_bp, url_prefix='/api/customers', strict_slashes=False)
    app.register_blueprint(admin_bp, url_prefix='/api/admin', strict_slashes=False)

    # --- TEMPORARY DEBUGGING CODE ---
    logger = logging.getLogger(__name__)
    if not logger.handlers:
        handler = logging.StreamHandler()
        formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
        handler.setFormatter(formatter)
        logger.addHandler(handler)
    logger.setLevel(logging.INFO)

    logger.info("--- Complete Registered URL Map ---")
    all_rules_logged = []
    for rule in app.url_map.iter_rules():
        all_rules_logged.append(f"Rule: {rule.rule}, Endpoint: {rule.endpoint}, Methods: {sorted(list(rule.methods))}")
    all_rules_logged.sort()
    for log_line in all_rules_logged:
        logger.info(log_line)
    
    logger.info("\n--- Specifically checking /api/admin routes ---")
    admin_rules_found = False
    for rule in app.url_map.iter_rules():
        if rule.rule.startswith('/api/admin'):
            logger.info(f"Admin Rule: {rule.rule}, Endpoint: {rule.endpoint}, Methods: {sorted(list(rule.methods))}")
            admin_rules_found = True
    if not admin_rules_found:
        logger.info("No rules found starting with /api/admin.")
    logger.info("--- End of URL Map Inspection ---")
    # --- END TEMPORARY DEBUGGING CODE ---

    # Register schemas and paths with apispec
    with app.app_context():
        # Attach spec to app for use in other modules
        app.spec = apispec

        # Register Auth Schemas
        apispec.components.schema("RegisterRequestSchema", schema=RegisterRequestSchema)
        apispec.components.schema("UserResponseSchema", schema=UserResponseSchema)
        apispec.components.schema("RegisterResponseSchema", schema=RegisterResponseSchema)
        apispec.components.schema("LoginRequestSchema", schema=LoginRequestSchema)
        apispec.components.schema("LoginSuccessResponseSchema", schema=LoginSuccessResponseSchema)
        apispec.components.schema("ErrorResponseSchema", schema=ErrorResponseSchema)
        apispec.components.schema("UserPermissionsResponseSchema", schema=UserPermissionsResponseSchema)

        # Register User Admin Schemas
        from src.schemas.user_schemas import (
            UserCreateRequestSchema, UserUpdateRequestSchema,
            UserDetailSchema, UserListResponseSchema, UserBriefSchema,
            RoleBriefSchema
        )
        apispec.components.schema("RoleBriefSchema", schema=RoleBriefSchema)
        apispec.components.schema("UserBriefSchema", schema=UserBriefSchema)
        apispec.components.schema("UserCreateRequestSchema", schema=UserCreateRequestSchema)
        apispec.components.schema("UserUpdateRequestSchema", schema=UserUpdateRequestSchema)
        apispec.components.schema("UserDetailSchema", schema=UserDetailSchema)
        apispec.components.schema("UserListResponseSchema", schema=UserListResponseSchema)

        # Register Fuel Order Schemas
        apispec.components.schema("FuelOrderCreateRequestSchema", schema=FuelOrderCreateRequestSchema)
        apispec.components.schema("FuelOrderStatusUpdateRequestSchema", schema=FuelOrderStatusUpdateRequestSchema)
        apispec.components.schema("FuelOrderCompleteRequestSchema", schema=FuelOrderCompleteRequestSchema)
        apispec.components.schema("FuelOrderResponseSchema", schema=FuelOrderResponseSchema)
        apispec.components.schema("FuelOrderBriefResponseSchema", schema=FuelOrderBriefResponseSchema)
        apispec.components.schema("FuelOrderCreateResponseSchema", schema=FuelOrderCreateResponseSchema)
        apispec.components.schema("FuelOrderUpdateResponseSchema", schema=FuelOrderUpdateResponseSchema)
        apispec.components.schema("PaginationSchema", schema=PaginationSchema)
        apispec.components.schema("FuelOrderListResponseSchema", schema=FuelOrderListResponseSchema)
        apispec.components.schema("OrderStatusCountsSchema", schema=OrderStatusCountsSchema)
        apispec.components.schema("OrderStatusCountsResponseSchema", schema=OrderStatusCountsResponseSchema)

        # Register Fuel Truck Schemas
        apispec.components.schema("FuelTruckSchema", schema=FuelTruckSchema)
        apispec.components.schema("FuelTruckListResponseSchema", schema=FuelTruckListResponseSchema)
        apispec.components.schema("FuelTruckCreateRequestSchema", schema=FuelTruckCreateRequestSchema)
        apispec.components.schema("FuelTruckCreateResponseSchema", schema=FuelTruckCreateResponseSchema)

        # Register Aircraft Schemas
        from src.schemas.aircraft_schemas import (
            AircraftCreateSchema,
            AircraftUpdateSchema,
            AircraftResponseSchema,
            AircraftListSchema,
            ErrorResponseSchema as AircraftErrorResponseSchema
        )
        apispec.components.schema("AircraftCreateSchema", schema=AircraftCreateSchema)
        apispec.components.schema("AircraftUpdateSchema", schema=AircraftUpdateSchema)
        apispec.components.schema("AircraftResponseSchema", schema=AircraftResponseSchema)
        apispec.components.schema("AircraftListSchema", schema=AircraftListSchema)
        apispec.components.schema("AircraftErrorResponseSchema", schema=AircraftErrorResponseSchema)

        # Register Customer Schemas
        from src.schemas.customer_schemas import (
            CustomerCreateSchema,
            CustomerUpdateSchema,
            CustomerResponseSchema,
            CustomerListSchema,
            ErrorResponseSchema as CustomerErrorResponseSchema
        )
        apispec.components.schema("CustomerCreateSchema", schema=CustomerCreateSchema)
        apispec.components.schema("CustomerUpdateSchema", schema=CustomerUpdateSchema)
        apispec.components.schema("CustomerResponseSchema", schema=CustomerResponseSchema)
        apispec.components.schema("CustomerListSchema", schema=CustomerListSchema)
        apispec.components.schema("CustomerErrorResponseSchema", schema=CustomerErrorResponseSchema)

        # Register Admin Schemas
        from src.schemas.admin_schemas import (
            AdminAircraftSchema, AdminAircraftListResponseSchema,
            AdminCustomerSchema, AdminCustomerListResponseSchema
        )
        apispec.components.schema("AdminAircraftSchema", schema=AdminAircraftSchema)
        apispec.components.schema("AdminAircraftListResponseSchema", schema=AdminAircraftListResponseSchema)
        apispec.components.schema("AdminCustomerSchema", schema=AdminCustomerSchema)
        apispec.components.schema("AdminCustomerListResponseSchema", schema=AdminCustomerListResponseSchema)

        # Register Permission Schemas
        from src.routes.admin.permission_admin_routes import PermissionListResponseSchema
        from src.schemas import PermissionSchema
        apispec.components.schema("PermissionSchema", schema=PermissionSchema)
        apispec.components.schema("PermissionListResponseSchema", schema=PermissionListResponseSchema)

        # Register Auth Views
        from src.routes.auth_routes import register, login, get_my_permissions
        apispec.path(view=register, bp=auth_bp)
        apispec.path(view=login, bp=auth_bp)
        apispec.path(view=get_my_permissions, bp=auth_bp)

        # Register User Views
        from src.routes.user_routes import get_users
        apispec.path(view=get_users, bp=user_bp)

        # Register Fuel Order Views
        from src.routes.fuel_order_routes import (
            create_fuel_order, get_fuel_orders, get_fuel_order,
            update_fuel_order_status, submit_fuel_data, review_fuel_order,
            export_fuel_orders_csv, get_status_counts
        )
        apispec.path(view=create_fuel_order, bp=fuel_order_bp)
        apispec.path(view=get_fuel_orders, bp=fuel_order_bp)
        apispec.path(view=get_fuel_order, bp=fuel_order_bp)
        apispec.path(view=update_fuel_order_status, bp=fuel_order_bp)
        apispec.path(view=submit_fuel_data, bp=fuel_order_bp)
        apispec.path(view=review_fuel_order, bp=fuel_order_bp)
        apispec.path(view=export_fuel_orders_csv, bp=fuel_order_bp)
        apispec.path(view=get_status_counts, bp=fuel_order_bp)

        # Register Fuel Truck Views
        from src.routes.fuel_truck_routes import get_fuel_trucks, create_fuel_truck
        apispec.path(view=get_fuel_trucks, bp=truck_bp)
        apispec.path(view=create_fuel_truck, bp=truck_bp)

        # Register Aircraft Views
        from src.routes.aircraft_routes import list_aircraft, create_aircraft, get_aircraft, update_aircraft, delete_aircraft
        apispec.path(view=list_aircraft, bp=aircraft_bp)
        apispec.path(view=create_aircraft, bp=aircraft_bp)
        apispec.path(view=get_aircraft, bp=aircraft_bp)
        apispec.path(view=update_aircraft, bp=aircraft_bp)
        apispec.path(view=delete_aircraft, bp=aircraft_bp)

        # Register Admin Views
        from src.routes.admin.aircraft_admin_routes import list_aircraft as admin_list_aircraft, create_aircraft as admin_create_aircraft, get_aircraft as admin_get_aircraft, update_aircraft as admin_update_aircraft, delete_aircraft as admin_delete_aircraft
        from src.routes.admin.customer_admin_routes import list_customers as admin_list_customers, create_customer as admin_create_customer, get_customer as admin_get_customer, update_customer as admin_update_customer, delete_customer as admin_delete_customer
        from src.routes.admin.permission_admin_routes import get_permissions
        from src.routes.admin.user_admin_routes import get_users as admin_get_users
        from src.routes.admin.role_admin_routes import get_roles, create_role, get_role, update_role, delete_role, get_role_permissions

        # Register Admin Aircraft Views
        apispec.path(view=admin_list_aircraft, bp=admin_bp)
        apispec.path(view=admin_create_aircraft, bp=admin_bp)
        apispec.path(view=admin_get_aircraft, bp=admin_bp)
        apispec.path(view=admin_update_aircraft, bp=admin_bp)
        apispec.path(view=admin_delete_aircraft, bp=admin_bp)

        # Register Admin Customer Views
        apispec.path(view=admin_list_customers, bp=admin_bp)
        apispec.path(view=admin_create_customer, bp=admin_bp)
        apispec.path(view=admin_get_customer, bp=admin_bp)
        apispec.path(view=admin_update_customer, bp=admin_bp)
        apispec.path(view=admin_delete_customer, bp=admin_bp)

        # Register Admin User Views
        apispec.path(view=admin_get_users, bp=admin_bp)
        # apispec.path(view=admin_create_user, bp=admin_bp)
        # apispec.path(view=admin_get_user, bp=admin_bp)
        # apispec.path(view=admin_update_user, bp=admin_bp)
        # apispec.path(view=admin_delete_user, bp=admin_bp)

        # Register Admin Role Views
        apispec.path(view=get_roles, bp=admin_bp)
        apispec.path(view=create_role, bp=admin_bp)
        apispec.path(view=get_role, bp=admin_bp)
        apispec.path(view=update_role, bp=admin_bp)
        apispec.path(view=delete_role, bp=admin_bp)
        apispec.path(view=get_role_permissions, bp=admin_bp)

        # Register Admin Permission Views
        apispec.path(view=get_permissions, bp=admin_bp)

    @app.route('/')
    def root():
        """Root endpoint."""
        return jsonify({"status": "ok", "message": "FBO LaunchPad API is running"})

    @app.route('/health')
    def health_check():
        """Basic health check endpoint."""
        return jsonify({'status': 'healthy', 'message': 'FBO LaunchPad API is running'})

    @app.route('/api/swagger.json')
    def create_swagger_spec():
        """Serve the swagger specification."""
        return jsonify(app.spec.to_dict())

    @app.route('/api/cors-test', methods=['OPTIONS', 'POST'])
    def cors_test():
        return jsonify({"message": "CORS test"}), 200

    return app

if __name__ == '__main__':
    app = create_app()
    app.run()