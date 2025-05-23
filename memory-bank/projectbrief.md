# Project Brief: FBO LaunchPad

## Project Overview
FBO LaunchPad is a comprehensive Fixed Base Operator (FBO) management system designed to streamline aircraft fueling operations. It consists of a React/Vite frontend SPA and a Flask/SQLAlchemy backend RESTful API.
The system connects Customer Service Representatives (CSRs), Line Service Technicians (LSTs), and administrators in a workflow for fuel order management, user authentication, and real-time status tracking.

## Core Requirements & Features

### 1. User Management
*   Supports multiple user roles (CSR, LST, Admin) with Permission-Based Access Control (PBAC).
*   Secure JWT-based authentication.
*   User status tracking (active/inactive).
*   Admin capabilities for user/role/permission management.

### 2. Fuel Order Management
*   Complete fuel order lifecycle: Create, Dispatch, Acknowledge, En Route, Fueling, Complete, Review, Cancel.
*   Real-time status updates (currently via polling).
*   LST/Truck Assignment: Manual and auto-assignment (via `-1` ID).
*   Aircraft Auto-Creation: If a fuel order is created for an unknown tail number, an Aircraft record is created with placeholder details.
*   Meter reading validation for order completion.
*   Support for multiple fuel types.
*   Customer and aircraft tracking.
*   CSR notes and LST notes.
*   CSV Export functionality.

### 3. Aircraft Management
*   Admin CRUD operations for aircraft records (`tail_number`, `aircraft_type`, `fuel_type`).
*   *Note:* No direct Customer-Aircraft link in the current model.

### 4. Customer Management
*   Admin CRUD operations for customer records.

### 5. Fuel Truck Management
*   Admin CRUD operations for fuel trucks (`truck_number`, `fuel_type`, `capacity`, `is_active`).

### 6. Security
*   JWT-based authentication (1-hour expiry, no refresh MVP).
*   PBAC authorization using `@require_permission`.
*   Password hashing (pbkdf2:sha256).
*   CORS protection for frontend integration.

### 7. API Design
*   RESTful architecture.
*   OpenAPI/Swagger documentation via APISpec.
*   Consistent JSON request/response format.
*   Standardized error handling.
*   Pagination for list endpoints.

## Technical Goals
*   Maintainable and modular codebase (src-layout, factory pattern, blueprints, services).
*   Comprehensive test coverage (Pytest backend, Vitest frontend).
*   Clear API documentation.
*   Scalable database design (SQLAlchemy models, Alembic migrations).
*   Efficient query optimization.

## Success Criteria
*   All API endpoints documented and tested.
*   High test coverage (target 90%+).
*   Good performance (sub-second response times for common operations).
*   Secure authentication.
*   Successful frontend-backend integration.

## Non-Functional Requirements
*   Performance: Response time < 1 second for 95% of requests.
*   Availability: High uptime target (e.g., 99.9%) during operational hours.
*   Concurrency: Support multiple simultaneous users.
*   Auditing: Audit trail for key operations (e.g., fuel orders).
*   Data Management: Backup and recovery procedures.

## Points for Clarification / Design Decisions
*   **Aircraft-Customer Relationship:** Define how aircraft should be associated with customers (current model has no link, frontend form includes field).
*   **Auto-Assignment UI:** Frontend UI for "autoAssign" needs clarification - should it cover LST only or LST+Truck? Ensure correct IDs (`-1` or valid) are sent based on user intent.
*   **Aircraft Auto-Creation Follow-up:** Define process for updating placeholder details ("UNKNOWN_TYPE", "UNKNOWN_FUEL") for auto-created aircraft.

## Future Considerations / Roadmap
*   **Features:** Customer portal, mobile app, advanced analytics, automated scheduling, WebSocket real-time updates, JWT refresh.
*   **Integrations:** Billing systems, aircraft tracking, weather services, maintenance systems, payment processing, flight planning, inventory management, equipment tracking.
*   **Scalability:** Multi-location support, increased user capacity, enhanced reporting.

---

# Consolidated Lessons Learned

## Backend / PBAC / Migrations
*   **PBAC Implementation:**
    *   Encapsulate permission checking (`has_permission`) on the User model for clarity and efficiency (leveraging SQLAlchemy `EXISTS`).
    *   Use permission-based decorators (`@require_permission`) for route protection; remove obsolete role-based ones.
    *   Check auth context (`g.current_user`) before permissions; return distinct 403 (denied) / 500 (context error) codes.
*   **Alembic Migrations:**
    *   Order matters: Seed base data (permissions) before dependent data (roles), then map using fetched IDs (role_permissions).
    *   Migrate data using old columns *before* dropping them.
    *   Define session/table objects before use.
    *   Ensure downgrade paths correctly reverse all changes, including seeded data.
*   **Authentication System (General):**
    *   Rate Limiting: Implement per-endpoint; use separate stores; reset on success; make configurable for tests.
    - Permission Management: Use request-level caching (Flask `g`); ensure proper invalidation; use SQLAlchemy `EXISTS` for efficiency; test inheritance.
    - Security: Hash passwords (PBKDF2-SHA256); implement token expiration; validate inputs.
    - Testing: Reset stateful components (rate limiters) between tests; test edge cases; verify caching.
    *   Error Handling: Specific messages; Retry-After headers; log failures.
*   **Common Auth Pitfalls:**
    *   JWT `sub` must be a string (`str(user.id)`).
    *   Use `JWT_SECRET_KEY` (not `SECRET_KEY`) for Flask-JWT-Extended.
    *   Ensure consistent algorithm (HS256 default).
    *   Align custom auth decorators with Flask-JWT-Extended logic.
    *   Keep DB operations within the same app context for in-memory SQLite tests.
    *   Ensure test payloads match API schemas.

## Frontend Development
*   **Authorization:**
    *   Prefer backend enforcement over frontend checks for security and simplicity.
    *   Handle 403 errors gracefully in the UI.
    *   Store complete user data from JWT; avoid storing role-specific state.
*   **Component Design:**
    *   Break down complex UIs into small, reusable components.
    *   Use consistent patterns (forms, tables, modals).
    *   Use prop types and default props.
*   **Styling (Tailwind):**
    *   Maintain consistency; avoid mixing UI frameworks.
    *   Use standard HTML elements with Tailwind classes.
    *   Document common UI patterns.
*   **State Management:**
    *   Keep state close to where it's used.
    *   Use loading/error states consistently.
    *   Clear state/errors appropriately (e.g., on modal close).
*   **API Integration:**
    *   Use dedicated service classes.
    *   Handle errors consistently.
*   **UI/UX:**
    *   Consistent button placement/styling.
    *   Clear feedback (loading/error states).
    *   Confirmation for destructive actions.
    *   Use modals for focused tasks.
*   **Navigation:**
    *   Organize features logically (sidebar/tabs).
    *   Use consistent icons/labels.
*   **Testing:**
    *   Test CRUD operations.
    *   Verify permission flows (UI hiding/showing, error handling).
    *   Test error/loading states.
    *   Validate forms.
    *   Check modal behavior.
