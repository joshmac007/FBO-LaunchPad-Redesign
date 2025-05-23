from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from apispec import APISpec
from apispec.ext.marshmallow import MarshmallowPlugin
from flask_jwt_extended import JWTManager

# Database
db = SQLAlchemy()
migrate = Migrate()
jwt = JWTManager()

# API documentation
marshmallow_plugin = MarshmallowPlugin()
apispec = APISpec(
    title="FBO LaunchPad API",
    version="1.0.0",
    openapi_version="3.0.2",
    plugins=[marshmallow_plugin],
    info=dict(description="API for FBO LaunchPad")
)

# Initialize resolver for marshmallow plugin
marshmallow_plugin.init_spec(apispec)

