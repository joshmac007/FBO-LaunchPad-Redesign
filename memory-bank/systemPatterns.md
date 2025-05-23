# System Patterns

## Backend Architectural Overview & Core Patterns

### 1. Application Structure (Flask)
```
Flask Application
├── Application Factory (create_app in app.py)
├── Blueprints (Feature Modules in src/routes/)
├── Services (Business Logic in src/services/)
└── Models (Data Layer in src/models/)
```

### 2. Request Flow (Backend)
```
Request → JWT Auth Middleware → Permission Check Decorator → Route Handler (View) → Service Layer → Database (SQLAlchemy Models)
```

### 3. Authentication Pattern (Backend)
*   JWT token validation (Flask-JWT-Extended or custom decorator).
*   Permission verification using `@require_permission` decorator.
*   User object attached to request context (e.g., `g.current_user`).
```python
# Example Decorator Usage
@jwt_required()
@require_permission('MANAGE_ORDERS')
def protected_endpoint():
    # Access g.current_user if needed
    pass
```

### 4. Service Pattern (Backend)
*   Encapsulates business logic.
*   Interacts with database models.
*   Often uses a base class for common operations.
```python
# Example Service Structure
class BaseService:
    # ... common methods ...

class ConcreteService(BaseService):
    def specific_operation(self, args):
        # ... business logic ...
        # ... DB interaction via self.model ...
        return result
```

### 5. API Response Pattern (Backend)
*   Consistent JSON structure, often including `data`, `message`, `error`, `pagination` fields.
*   Standard HTTP status codes.
```json
// Example Success with Pagination
{
    "data": [/* items */],
    "pagination": {
        "page": 1,
        "per_page": 20,
        "total": 100
    },
    "message": "Items retrieved successfully",
    "error": null
}
```

### 6. Error Handling Pattern (Backend)
*   Custom exception classes (e.g., `APIError`).
*   Flask `@app.errorhandler` to catch custom exceptions and return standardized JSON error responses.
```python
# Example Error Handling
class APIError(Exception):
    # ... init ...

@app.errorhandler(APIError)
def handle_api_error(error):
    return jsonify({"error": error.message, "data": null}), error.status_code
```

## Database Patterns (Backend - SQLAlchemy)

### 1. Model Definition
*   Uses `db.Model` base class.
*   Common fields often in a `BaseModel` (e.g., `id`, `created_at`, `updated_at`).
*   Relationships defined using `db.relationship`.
```python
# Example Base Model
class BaseModel(db.Model):
    __abstract__ = True
    id = db.Column(db.Integer, primary_key=True)
    # ... common fields ...
```

### 2. Relationship Patterns
*   Standard SQLAlchemy relationships (One-to-Many, Many-to-One, Many-to-Many using association tables).

### 3. Query Patterns
*   Leverages SQLAlchemy ORM query capabilities (`.query`, `.filter`, `.join`, `.options(selectinload(...))`, `.paginate()`).
*   Complex queries encapsulated within Service layer.

## API Patterns (Backend)

### 1. URL Structure
*   Prefix `/api/`.
*   Resource-based paths (e.g., `/api/users/`, `/api/fuel-orders/<id>`).
*   Actions on resources (e.g., `/api/fuel-orders/<id>/review`).

### 2. HTTP Methods
*   Standard RESTful verbs (GET, POST, PUT, PATCH, DELETE).

### 3. Query Parameters
*   Used for pagination (`page`, `per_page`), sorting (`sort`), filtering (`filter[key]=value`).

## Security Patterns (Backend)

### 1. Permission-Based Access Control (PBAC)
*   `User` model has `has_permission(permission_name)` method.
*   Method checks user's roles and associated permissions.
*   `@require_permission('PERMISSION_NAME')` decorator protects routes.

### 2. Password Handling
*   Hashing using `werkzeug.security` (`generate_password_hash`, `check_password_hash`).
*   No plaintext passwords stored.

### 3. Token Pattern (JWT)
*   Payload contains `sub` (user ID as string), `exp` (expiration), potentially roles/permissions.
*   Signed using `JWT_SECRET_KEY`.

## User Management Patterns (Backend)

### 1. User Status Management
*   `is_active` boolean flag on `User` model.
*   Login checks `is_active` status.

### 2. User Creation Pattern
*   Requires `MANAGE_USERS` permission.
*   Validates input data (email, password, role IDs).
*   Assigns roles via relationship.
*   Hashes password.

### 3. User Authentication Pattern
*   Checks email exists, user is active, password hash matches.
*   Uses eager loading (`selectinload`) for roles/permissions if needed after login.

### 4. API Endpoints (Illustrative)
*   Standard RESTful endpoints for Users, Roles, Permissions under `/api/admin/`. (*Note: Current implementation status of POST/PATCH/DELETE for admin users needs verification*).

## Testing Patterns (Backend - Pytest)

### 1. Fixture Pattern
*   Uses `@pytest.fixture` for test setup (app context, test client, DB session, mock users/data, auth headers).

### 2. Test Structure
*   Tests organized by feature (`test_auth.py`, `test_routes.py`, etc.).
*   Clear separation of test cases for different scenarios (success, failure, edge cases).

## Frontend Component Patterns (React)

### 1. Common Reusable Components
*   **PaginationControls:** Handles list pagination UI and logic.
*   **ProtectedRoute:** Wraps routes requiring authentication.
*   *(Identify and document other common components like Buttons, Modals, Forms, Tables as patterns emerge)*

### 2. Layout Components
*   **MainLayout:** Provides consistent page shell (nav, footer, main content area using `<Outlet>`).
*   **AdminLayout:** Specific layout for admin sections, potentially with sidebar/tab navigation.

### 3. Page Components
*   Top-level components mapped to routes.
*   Responsible for fetching data (often via custom hooks).
*   Manage page-level state.
*   Compose feature-specific and common components.

### 4. Feature Components
*   Implement specific parts of a feature (e.g., `OrderGrid`, `OrderFilters`, `RoleForm`).
*   Receive data and callbacks via props.
*   Emit events to parent page components.

## Frontend Data Fetching Patterns (React)

### 1. Custom Hooks
*   Encapsulate API calls and related state management (data, loading, error) within custom hooks (e.g., `useOrders`, `useFuelTrucks`).

### 2. API Service Modules
*   Centralized Axios instance (`apiService.js`) with base URL and interceptors (e.g., for adding auth token).
*   Specific service files (`AuthService.js`, `FuelOrderService.js`) import `apiService` and define functions for specific endpoints.

### 3. State Management for Fetched Data
*   Data, loading, and error states typically managed within the custom hook or the calling page component.
*   Global context (React Context API) used for Authentication state (`AuthContext`).

### 4. Pagination Pattern
*   Page component manages pagination state (current page, filters).
*   State passed to data fetching hook/service.
*   Pagination data from API response used to render `PaginationControls` component.
*   Filter changes typically reset pagination to page 1.
