import os
from dotenv import load_dotenv
from datetime import timedelta

# Load environment variables from .env file
load_dotenv()

class Config:
    """Base configuration class."""
    # Flask
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'hard-to-guess-string'
    JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY') or 'jwt-secret-string'
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=1)
    JWT_ALGORITHM = 'HS256'
    JWT_TOKEN_LOCATION = ['headers']
    JWT_HEADER_NAME = 'Authorization'
    JWT_HEADER_TYPE = 'Bearer'
    FLASK_ENV = os.getenv('FLASK_ENV', 'development')
    DEBUG = os.getenv('DEBUG', 'True').lower() == 'true'

    # Database
    SQLALCHEMY_DATABASE_URI = os.getenv('SQLALCHEMY_DATABASE_URI')
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_ECHO = os.getenv('SQLALCHEMY_ECHO', 'False').lower() == 'true'

    # Application specific
    APP_NAME = os.getenv('APP_NAME', 'FBO LaunchPad')
    LOG_LEVEL = os.getenv('LOG_LEVEL', 'DEBUG')

    @staticmethod
    def init_app(app):
        pass

class DevelopmentConfig(Config):
    """Development configuration."""
    DEBUG = True
    SQLALCHEMY_DATABASE_URI = os.environ.get('DEV_DATABASE_URL') or \
        'postgresql://fbo_user:fbo_password@db:5432/fbo_launchpad_dev'

class ProductionConfig(Config):
    """Production configuration."""
    DEBUG = False
    SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL') or \
        'postgresql://fbo_user:fbo_password@db:5432/fbo_launchpad'

class TestingConfig(Config):
    """Testing configuration."""
    TESTING = True
    # Use environment variable if set, otherwise use Docker service name
    SQLALCHEMY_DATABASE_URI = os.environ.get('SQLALCHEMY_DATABASE_URI') or \
        'postgresql://fbo_user:fbo_password@db:5432/fbo_launchpad_test'
    # Keep test output clean
    SQLALCHEMY_ECHO = False
    # Disable CSRF for testing if using Flask-WTF
    WTF_CSRF_ENABLED = False
    # Disable error catching during request handling
    PROPAGATE_EXCEPTIONS = True
    # Disable Flask-DebugToolbar if installed
    DEBUG_TB_ENABLED = False

    @classmethod
    def init_app(cls, app):
        """Initialize the testing configuration."""
        Config.init_app(app)
        # Ensure SQLAlchemy always uses the test database URL
        app.config['SQLALCHEMY_DATABASE_URI'] = cls.SQLALCHEMY_DATABASE_URI

# Configuration dictionary
config = {
    'development': DevelopmentConfig,
    'production': ProductionConfig,
    'testing': TestingConfig,
    'default': DevelopmentConfig
} 