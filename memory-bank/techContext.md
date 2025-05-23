# Tech Context: Key Risks & AI Hotspots

**Note for AI Collaboration:** This document highlights critical technical areas, potential points of failure, and dependencies requiring careful attention. Adherence to these points is crucial for maintaining stability and consistency, especially when multiple AI agents or developers are involved.

##  High-Risk Areas & AI Hotspots

### 1. API Endpoint Integrity & Frontend-Backend Alignment
   - **Obsolete Frontend API Calls:** [AI Hotspot: Stale Code & API Lifecycle Management]
     - **Risk:** Frontend calls several **removed/obsolete** backend endpoints (e.g., `/api/orders/unassigned`, `/api/orders/{orderId}/accept`, `/api/admin/assignment-settings`).
     - **Action:** These calls **must be removed** from frontend code (e.g., `QueuedOrdersPage.jsx`, `OrderCreatePage.jsx`, `AssignmentSettingsPage.jsx`) to prevent errors and confusion.
   - **Specific Fuel Order API Usage:** [AI Hotspot: API Endpoint Specificity & Workflow Alignment]
     - **Risk:** Misuse of distinct backend endpoints for fuel order progression.
     - **Endpoints & Intended Use:**
       - `PATCH /api/fuel-orders/{order_id}/status`: Generic status update by CSR/Admin.
       - `PUT /api/fuel-orders/{order_id}/submit-data`: LST submits meter readings/final data to complete. (Currently underutilized by frontend)
       - `PATCH /api/fuel-orders/{order_id}/review`: CSR marks a completed order as reviewed. (Primary current frontend use)
     - **Action:** Ensure future frontend integrations (especially for LST data submission and general CSR status updates) use the correct, designated endpoints.
   - **Admin User Management Endpoints Status:** [AI Hotspot: API Endpoint Availability & Backend Status]
     - **Risk:** Uncertainty about the operational status of backend `POST`, `PATCH`, `DELETE` operations for `/api/admin/users`. Routes may be inactive/commented.
     - **Action:** Verify backend functionality before significant frontend work on admin user management or if related issues arise.
   - **Payload Alignment & Validation (Marshmallow):** [AI Hotspot: API Contract & Validation]
     - **Risk:** Mismatches between frontend payloads and backend API expectations (field names, data types, required fields). Marshmallow schema changes must be carefully managed.
     - **Action:** Frontend **must** strictly adhere to backend Marshmallow schemas. Backend uses Marshmallow for validation, but frontend diligence is primary. Any changes to models/services likely require schema updates.

### 2. Data Integrity & Model Consistency
   - **Aircraft Creation & Data Consistency:** [AI Hotspot: Data Consistency & Backend Automation Behavior]
     - **Risk:** Issues with creating `Fuel Orders` if referenced `Aircraft` (by tail number) doesn't exist or if placeholder `Aircraft` data isn't updated.
     - **Backend Behavior:** Auto-creates `Aircraft` with placeholder values if a new tail number is provided during fuel order creation.
     - **Action:** Consider UI enhancements (e.g., searchable dropdowns for existing aircraft) and define processes for updating placeholder aircraft data.
   - **Customer-Aircraft Relationship:** [AI Hotspot: Model-View-Service Consistency & Data Model Evolution]
     - **Risk:** Discrepancy between frontend (`AircraftForm.jsx` includes `customer_id`) and backend (`Aircraft` model lacks direct `customer_id`).
     - **Action:** Resolve by either updating the backend model/service (`src/models/aircraft.py`, `AircraftService.create_aircraft`) to handle `customer_id`, or remove/disable the field in the frontend.

### 3. Core Feature Logic
   - **"Auto-Assign" Fuel Order Logic:** [AI Hotspot: Feature Logic & API Parameter Semantics]
     - **Risk:** Inconsistent handling of the auto-assignment feature for fuel orders.
     - **Mechanism:** Frontend sends `-1` for `assigned_truck_id` and/or `assigned_lst_user_id`. Backend attempts to assign available active resources; returns 400 if none.
     - **Action:** Ensure frontend UI clearly reflects auto-assignment choices and backend logic is robustly handling these states.

### 4. Security & Cross-Origin Resource Sharing (CORS)
   - **Permissions System (PBAC):** [AI Hotspot: Access Control & Authorization Logic]
     - **Risk:** Potential for incorrect or insufficient permission checks, leading to unauthorized access or actions. Transition from `@require_role` to `@require_permission`.
     - **Action:** Rigorously test and verify role-based access control for all sensitive operations and data. Ensure `@require_permission` decorator and `User.has_permission()` logic are correctly implemented and consistently applied. Check for legacy role-based logic.
   - **JWT Handling & Frontend Security:** [AI Hotspot: Authentication Token Management]
     - **Risk:** Incorrect JWT generation (ensure `JWT_SECRET_KEY` is used, not `SECRET_KEY`), verification, or frontend handling (e.g., refresh, expiration - currently not implemented on frontend).
     - **Action:** Emphasize consistent use of `JWT_SECRET_KEY` and HS256 algorithm. Frontend must implement robust JWT refresh and expiration handling.
   - **CORS Headers & Configuration:** [AI Hotspot: Frontend-Backend Communication & Security Policy]
     - **Risk:** Misconfigured CORS headers can block frontend requests. Past issues with OPTIONS preflight. Development config (`"origins": "*"`) is too permissive for production.
     - **Action:** Ensure `FLASK_CORS_ORIGINS` in the backend configuration correctly includes all necessary frontend origins and is appropriately restricted for production. Verify preflight handling relies on Flask-CORS.

### 5. Backend Infrastructure & Operations
   - **Database Migrations (Alembic):** [AI Hotspot: Schema & Data Evolution]
     - **Risk:** Errors in migration scripts, especially with data seeding order (e.g., permissions before roles), data migration before schema changes (dropping columns), or incomplete downgrade paths.
     - **Action:** Follow Alembic best practices: ensure correct order of operations, migrate data before altering/dropping schema elements, and thoroughly test downgrade paths.
   - **Environment Configuration (`.env`, `config.py`):** [AI Hotspot: Application Setup & Secrets Management]
     - **Risk:** Missing or incorrect environment variables in `.env` files (e.g., `SECRET_KEY`, `JWT_SECRET_KEY`, `SQLALCHEMY_DATABASE_URI`) can lead to application failure or security vulnerabilities.
     - **Action:** Ensure correct and complete `.env` files for different environments (dev, test, prod). Be aware of distinct configuration classes in `src/config.py`.

### 6. Frontend Development & Build
   - **Build & Styling (Vite, Tailwind CSS, PostCSS):** [AI Hotspot: Frontend Tooling & Rendering]
     - **Risk:** Known issue: "Tailwind styles not applying correctly." This requires investigation into Vite/PostCSS configuration, build process, or import order.
     - **Action:** Prioritize resolving the Tailwind CSS styling issue. Ensure understanding of the Vite build process and PostCSS usage.
   - **API Specification Adherence (APISpec):** [AI Hotspot: API Documentation & Consistency]
     - **Risk:** API documentation generated by APISpec can become outdated if not updated alongside backend changes to routes or Marshmallow schemas.
     - **Action:** Maintain discipline in updating APISpec documentation whenever API contracts change to ensure frontend developers have accurate information.

### 7. Testing Environment
   - **Test Infrastructure (Pytest Fixtures, `LOCAL_TEST`):** [AI Hotspot: Test Reliability & Configuration]
     - **Risk:** Complex Pytest fixture setup (`tests/conftest.py`). The `LOCAL_TEST=1` environment variable alters database configuration to use SQLite in-memory, which can mask issues specific to PostgreSQL.
     - **Action:** Understand the fixture setup and the implications of `LOCAL_TEST`. Ensure tests are run against configurations representative of production where appropriate.

## Core Technology Overview
- **Backend:** Flask, SQLAlchemy, Flask-Migrate, PyJWT, Marshmallow, APISpec, Gunicorn
- **Frontend (Implicit):** React (based on file names like .jsx and common patterns), Axios, Vite, Tailwind CSS, PostCSS
- **Database:** PostgreSQL (Production), SQLite (Dev/Test)
- **Containerization (Backend):** Docker (`Dockerfile`, `docker-compose.yml`)
- **Testing:**
    - **Backend:** Pytest
    - **Frontend:** Vitest, React Testing Library (as per `activeContext.md`)

## Key Backend Architectural Patterns
- Model-View-Service (MVS)
- Repository-like access in Services
- Application Factory
- Blueprints (for modular route organization)
- Decorators for Authentication (`@jwt_required`) & Authorization (`@require_permission`)
- Permission-Based Access Control (PBAC) - `User.has_permission()`
- Database Migrations (Alembic)

## Deployment Considerations
- **Backend Deployment:** Uses Docker (`Dockerfile`, `docker-compose.yml`) with Gunicorn as the WSGI server.
- **CI/CD:** Pytest generates JUnit-XML reports suitable for CI systems (e.g., Jenkins). No explicit CI/CD pipeline configuration found in the codebase.
- **Cloud Infrastructure:** No direct evidence of specific cloud provider configurations (AWS, GCP, Azure) within the codebase for deployment hosting.

## Logging, Monitoring, and Alerting
- **Backend Logging:** Relies on standard Python `logging` module and Gunicorn's logging. Pytest provides extensive logging for test execution.
- **Frontend Monitoring/Feedback:**
    - Uses basic JavaScript `alert()` for some user notifications.
    - A Playwright-based script (`fbo-launchpad-frontend-csr/BaseMonitor.cjs`) is available as a developer tool for real-time browser console/network monitoring during development or testing (see `chrome-debugging-setup.txt`).
- **System-Wide Monitoring:** Dedicated third-party monitoring/alerting services (e.g., Sentry, Datadog) are not evidently integrated. "System monitoring implementation" is a to-do item (`memory-bank/tasks.md`).

## Data Management (Production Focus)
- **Database Backup & Restore:** The codebase does not contain explicit scripts or configurations for production database backup and restore procedures (e.g., `pg_dump` automation).
- **Data Retention/PII:** No specific data retention policies or advanced PII encryption mechanisms at the database level are documented within the codebase.

## External Service Integrations
- The application primarily exposes its own API and relies on third-party *libraries* rather than integrating with a wide array of external *services* requiring dedicated API keys or OAuth (e.g., payment gateways, external mapping services).
- If external service integrations are added, API keys and secrets should be managed securely (e.g., via environment variables or a dedicated secrets management system) and not hardcoded.

## Scalability and Performance
- **Template Caching:** Jinja2 (used by Flask) utilizes bytecode caching for template rendering performance.
- **Application Performance:** Broader application-level performance optimization and metrics collection are planned tasks (`memory-bank/tasks.md`).
- **Application-Level Caching/Task Queues:** No specific application-level data caching systems (e.g., Redis, Memcached for data) or asynchronous task queues (e.g., Celery, RabbitMQ) are evidently integrated.
- **Database Performance:** Database query performance (e.g., proper indexing, efficient SQLAlchemy queries like `selectinload`) is a critical factor for scalability.

## Frontend State Management & Conventions
- **Primary Approach:**
    - Local component state (React `useState`, potentially `useReducer` for complexity).
    - React Context API for global state (specifically noted for `AuthContext`).
    - Custom hooks for encapsulating data fetching logic and associated state (data, loading, error).
- **Guidelines:** A suggestion to use `useReducer` for complex state logic exists (`.cursor/rules/react.mdc`).
- **Third-Party Libraries:** Common state management libraries (e.g., Redux, Zustand, Jotai, Recoil) are not currently in use.
- **Component Structure:** "Atomic design principles" are mentioned (`activeContext.md`), but no formal external UI component library (e.g., Material UI) or tools like Storybook are evident.

## Code Quality, Linting & Formatting
- **Python (Backend):**
    - Style guidelines (e.g., from `.cursor/rules/python.mdc`) recommend Black (formatter) and isort.
    - Ecosystem awareness of Pytest plugins for Flake8 (linter), Black, and Mypy (type checker) exists via library dependencies.
    - Direct project-level configuration for these tools (e.g., in `pyproject.toml`, `setup.cfg`, or `pytest.ini`) is not explicitly detailed for linting/formatting rules, suggesting reliance on defaults or manual/IDE execution.
- **Frontend (CSR):**
    - ESLint is used for linting, configured via `fbo-launchpad-frontend-csr/eslint.config.js` and `package.json` (with `eslint-plugin-react-hooks`, `eslint-plugin-react-refresh`).
    - No explicit configuration for Prettier found in `package.json` scripts/dependencies.
- **General:**
    - Fixing "lint errors" is a noted practice (`memory-bank/tasks.md`).
    - No project-specific `pre-commit-config.yaml` for automated pre-commit hooks was found.

## Common Troubleshooting Points
- **Key Documents:**
    - `memory-bank/tasks.md`: Contains resolved and known issues (e.g., past CORS problems, advice to clear browser cache).
    - `memory-bank/activeContext.md`: Lists "Known Issues / Current Issues" (e.g., Tailwind CSS styling problem).
    - `fbo-launchpad-backend/src/utils/README.md`: Details the backend `@token_required` auth decorator.
    - `fbo-launchpad-frontend-csr/chrome-debugging-setup.txt`: Explains usage of the `BaseMonitor.cjs` script for frontend debugging.
- **Backend Debugging:** Pytest offers extensive debugging features.
- **Frontend Debugging:** The `BaseMonitor.cjs` script is a key tool. The "Tailwind styles not applying correctly" issue is a known frontend pain point.

**Reminder:** The `projectbrief.md`, `systemPatterns.md`, and `activeContext.md` files contain further architectural and project context.