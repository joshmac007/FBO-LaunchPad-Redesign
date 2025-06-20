from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from apispec import APISpec
from apispec.ext.marshmallow import MarshmallowPlugin
from flask_jwt_extended import JWTManager
from flask_socketio import SocketIO
import redis

# Database
db = SQLAlchemy()
migrate = Migrate()
jwt = JWTManager()

# Real-time messaging
socketio = SocketIO(
    cors_allowed_origins="*",
    async_mode='eventlet',
    message_queue='redis://redis:6379/0',  # Re-enabled after fixing eventlet monkey patching
    logger=False,  # Disable verbose logging
    engineio_logger=False,  # Disable verbose logging
    allow_upgrades=True,
    ping_timeout=60,
    ping_interval=25,
    max_http_buffer_size=100000000,  # 100MB buffer for large payloads
    transports=['polling', 'websocket']
)

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

