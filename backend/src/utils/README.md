# Authentication Decorators

This module provides authentication decorators for protecting API routes in the FBO LaunchPad backend.

## `@token_required` Decorator

The `@token_required` decorator provides JWT-based authentication for Flask routes. It verifies the presence and validity of a JWT token in the request's Authorization header and makes the authenticated user available to the route handler.

### Configuration

Before using the decorator, ensure your Flask application has the following configuration:

```python
app.config['SECRET_KEY'] = 'your-secure-secret-key'  # Use a strong secret key in production
```

### Usage

Import and apply the decorator to your route handlers:

```python
from src.utils.decorators import token_required

@app.route('/api/protected')
@token_required
def protected_route():
    # Access the authenticated user from Flask's g object
    current_user = g.current_user
    return jsonify({
        "message": f"Hello {current_user.name}!",
        "user_id": current_user.id
    })
```

### Authentication Flow

1. **Token Format**: The client must include the JWT token in the Authorization header using the Bearer scheme:
   ```
   Authorization: Bearer <your-jwt-token>
   ```

2. **Validation Process**:
   - Verifies the presence of the Authorization header
   - Validates the Bearer scheme format
   - Decodes and verifies the JWT signature
   - Checks token expiration
   - Retrieves and validates the user from the database
   - Makes the user object available via `g.current_user`

3. **Error Handling**: The decorator returns appropriate 401 Unauthorized responses for various failure cases:

   | Error Case | Response |
   |------------|----------|
   | Missing Authorization header | `{"error": "Authentication token is missing!"}` |
   | Invalid header format | `{"error": "Invalid Authorization header format"}` |
   | Expired token | `{"error": "Token has expired!"}` |
   | Invalid token signature | `{"error": "Invalid token!"}` |
   | User not found/inactive | `{"error": "User not found or inactive"}` |
   | Other token errors | `{"error": "Token processing error"}` |

### Example Client Usage

```python
import requests

def make_authenticated_request(token, endpoint):
    headers = {
        'Authorization': f'Bearer {token}',
        'Content-Type': 'application/json'
    }
    response = requests.get(
        f'https://api.fbolaunchpad.com{endpoint}',
        headers=headers
    )
    return response

# Example usage
token = "your.jwt.token"
response = make_authenticated_request(token, '/api/protected')
if response.status_code == 200:
    print("Success:", response.json())
else:
    print("Error:", response.json())
```

### Security Considerations

1. **Token Storage**: 
   - Store tokens securely on the client side (e.g., HttpOnly cookies for web applications)
   - Never store tokens in localStorage or sessionStorage due to XSS vulnerabilities

2. **Token Expiration**:
   - Use short-lived tokens (e.g., 15-60 minutes)
   - Implement token refresh mechanisms for longer sessions

3. **HTTPS**:
   - Always use HTTPS in production to prevent token interception
   - Consider adding additional security headers (e.g., HSTS)

4. **Error Messages**:
   - The decorator provides generic error messages to avoid leaking sensitive information
   - In development, you may want to enable more detailed error messages

### Dependencies

- Flask
- PyJWT
- SQLAlchemy (via Flask-SQLAlchemy)

### Best Practices

1. **Route Protection**:
   ```python
   # Protect all routes in a Blueprint
   @blueprint.before_request
   @token_required
   def before_request():
       pass
   ```

2. **Role-Based Access**:
   ```python
   from functools import wraps
   from flask import g

   def admin_required(f):
       @wraps(f)
       @token_required
       def decorated(*args, **kwargs):
           if g.current_user.role != UserRole.ADMIN:
               return jsonify({"error": "Admin access required"}), 403
           return f(*args, **kwargs)
       return decorated

   # Usage
   @app.route('/admin/dashboard')
   @admin_required
   def admin_dashboard():
       return jsonify({"message": "Welcome, Admin!"})
   ```

3. **Error Handling**:
   ```python
   from flask import Blueprint
   
   api = Blueprint('api', __name__)
   
   @api.errorhandler(401)
   def handle_unauthorized(error):
       return jsonify({
           "error": "Unauthorized",
           "message": "Please authenticate to access this resource"
       }), 401
   ```

### Testing

When writing tests for protected routes, you'll need to create valid JWT tokens:

```python
import jwt
import datetime

def create_test_token(user_id):
    return jwt.encode(
        {
            'sub': user_id,
            'exp': datetime.datetime.utcnow() + datetime.timedelta(minutes=30)
        },
        current_app.config['SECRET_KEY'],
        algorithm='HS256'
    )

def test_protected_route(client, test_user):
    token = create_test_token(test_user.id)
    headers = {'Authorization': f'Bearer {token}'}
    response = client.get('/api/protected', headers=headers)
    assert response.status_code == 200
``` 