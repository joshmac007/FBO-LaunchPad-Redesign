import os
from flask import Flask, jsonify, current_app, request
from flask_cors import CORS
from apispec.ext.marshmallow import MarshmallowPlugin
from apispec_webframeworks.flask import FlaskPlugin
import logging
from datetime import datetime

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

    # JWT User Lookup Loader - sets g.current_user automatically when JWT is present
    @jwt.user_lookup_loader
    def user_lookup_callback(_jwt_header, jwt_data):
        """Load user from JWT identity and set it to g.current_user"""
        from src.models.user import User
        from flask import g
        
        try:
            identity = jwt_data["sub"]
            # Explicitly cast to integer for lookup to be safe
            user_id = int(identity)
            user = User.query.get(user_id)  # .get() is faster for PK lookup
            
            if user:
                g.current_user = user
            return user
        except (ValueError, KeyError, TypeError):
            return None

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
    from src.routes.admin.fee_config_routes import admin_fee_config_bp
    from src.routes.enhanced_user_routes import enhanced_user_bp
    from src.routes.receipt_routes import receipt_bp

    # Register blueprints with strict_slashes=False to prevent 308 redirects for both /api/resource and /api/resource/
    app.register_blueprint(auth_bp, url_prefix='/api/auth', strict_slashes=False)
    app.register_blueprint(fuel_order_bp, url_prefix='/api/fuel-orders', strict_slashes=False)
    app.register_blueprint(user_bp, url_prefix='/api/users', strict_slashes=False)
    app.register_blueprint(truck_bp, url_prefix='/api/fuel-trucks', strict_slashes=False)
    app.register_blueprint(aircraft_bp, url_prefix='/api/aircraft', strict_slashes=False)
    app.register_blueprint(customer_bp, url_prefix='/api/customers', strict_slashes=False)
    app.register_blueprint(admin_bp, url_prefix='/api/admin', strict_slashes=False)
    app.register_blueprint(admin_fee_config_bp, strict_slashes=False)
    app.register_blueprint(enhanced_user_bp, url_prefix='/api/admin/users', strict_slashes=False)
    app.register_blueprint(receipt_bp, strict_slashes=False)

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