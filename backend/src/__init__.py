"""
FBO LaunchPad Backend Package
"""

from flask import Flask
from .config import config
from .extensions import db, migrate, jwt

def create_app(config_name='default'):
    app = Flask(__name__)
    
    # Load config
    app.config.from_object(config[config_name])
    config[config_name].init_app(app)
    
    # Initialize extensions
    db.init_app(app)
    migrate.init_app(app, db)
    jwt.init_app(app)
    
    # Import models to ensure they are registered with SQLAlchemy
    from .models.user import User
    from .models.aircraft import Aircraft
    from .models.customer import Customer
    from .models.fuel_truck import FuelTruck
    from .models.fuel_order import FuelOrder
    
    # Register blueprints
    from .routes.auth_routes import auth_bp
    from .routes.admin.routes import admin_bp
    from .routes.user_routes import user_bp
    from .routes.fuel_order_routes import fuel_order_bp
    from .routes.fuel_truck_routes import truck_bp
    from .routes.aircraft_routes import aircraft_bp
    from .routes.customer_routes import customer_bp
    
    app.register_blueprint(auth_bp)
    app.register_blueprint(admin_bp)
    app.register_blueprint(user_bp, url_prefix='/api/users')
    app.register_blueprint(fuel_order_bp, url_prefix='/api/fuel-orders')
    app.register_blueprint(truck_bp, url_prefix='/api/fuel-trucks')
    app.register_blueprint(aircraft_bp, url_prefix='/api/aircraft')
    app.register_blueprint(customer_bp, url_prefix='/api/customers')
    
    return app
