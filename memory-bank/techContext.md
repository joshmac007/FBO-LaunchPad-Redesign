# FBO LaunchPad - AI Context & Guidelines

This document provides essential context about the FBO LaunchPad project to help AI assistants understand its structure, common development patterns, and potential pitfalls.

## 1. Project Overview

*   **Name:** FBO LaunchPad
*   **Purpose:** A comprehensive Fixed Base Operator (FBO) management system designed to streamline aircraft fueling operations, user management, and related administrative tasks.
*   **Key User Roles (Conceptual - actual access is permission-driven):**
    *   **System Administrator:** Full system access, manages users, roles, permissions, permission groups, and system settings.
    *   **Customer Service Representative (CSR):** Manages fuel orders, customer interactions, and reviews completed orders.
    *   **Line Service Technician (LST/Fueler):** Executes fuel orders, updates order statuses, and records operational data. Has specific fields like `employee_id`, `shift`, `certifications`.
    *   **Member:** Basic user with limited view access (e.g., view their own statistics, customer/aircraft info).

## 2. Tech Stack

*   **Frontend:**
    *   Framework: Next.js (React)
    *   Language: TypeScript
    *   Styling: Tailwind CSS with Shadcn UI components
    *   State Management: React Context API (e.g., `PermissionContext`), local component state.
*   **Backend:**
    *   Framework: Flask (Python)
    *   ORM: SQLAlchemy
    *   Database: PostgreSQL
    *   Authentication: JWT (JSON Web Tokens)
    *   API Style: RESTful
    *   Schema Validation: Marshmallow
*   **Containerization:** Docker and Docker Compose for the backend and database.
*   **Caching:** Redis for permission caching.

## 3. Development Environment & Key Commands

### Backend (Dockerized)

*   **Container Orchestration:** `docker-compose.yml` manages the backend Flask application and PostgreSQL database services.
*   **Database Service Name:** The PostgreSQL database service is typically named `db` within the Docker network.
*   **Database Port (Internal Docker):** `5432`
*   **Database Port (Host Mapping):** Usually mapped to `5433` on the host machine (e.g., `localhost:5433`).
*   **Default Backend Connection String (within Docker network):**
    `postgresql://fbo_user:fbo_password@db:5432/fbo_launchpad_dev`
*   **Host Machine Connection String (for direct DB access from host):**
    `postgresql://fbo_user:fbo_password@localhost:5433/fbo_launchpad_dev`
*   **Starting Backend & DB:**
    ```bash
    cd backend
    docker-compose up -d  # Or: docker compose up -d
    ```
*   **Running Flask Commands (Migrations, Seeding, CLI):**
    Always execute Flask commands *inside* the backend container:
    ```bash
    # General format
    docker-compose exec backend flask <command_group> <command> [options]

    # Examples:
    docker-compose exec backend flask db upgrade
    docker-compose exec backend flask seed run
    docker-compose exec backend flask create-admin
    docker-compose exec backend flask create-permission-groups run
    ```
*   **Backend API Port (Internal Docker):** `5000`
*   **Backend API Port (Host Mapping):** Mapped to `5001` on the host (i.e., accessible at `http://localhost:5001`).

### Frontend (Typically Run on Host)

*   **Default Port:** `3000`.
*   **CRITICAL NOTE FOR AI:** The frontend development server should ideally be running on `http://localhost:3000`. **Avoid suggesting commands that start a *new* frontend dev server if one is already running.** New instances often pick `3001`, `3002`, etc., leading to confusion and issues with API proxying if not configured for the new port. Assume `http://localhost:3000` is the active frontend URL.
*   **Starting Frontend:**
    ```bash
    cd frontend
    npm run dev
    ```
*   **API Proxy:** The Next.js frontend uses rewrites to proxy API requests. Requests from the frontend to `/api/*` are forwarded to the backend at `http://localhost:5001/api/*`. This is configured in `frontend/next.config.mjs`.

## 4. Database Seeding & Initialization - CRITICAL CONTEXT

*   **Primary Seeding Script (`seeds.py`):** `backend/src/seeds.py` populates initial data:
    *   Defines `all_permissions` (canonical list of permission strings).
    *   Creates `default_roles`.
    *   Populates the `role_permissions` table via `role_permission_mapping` (legacy/base role-permission links).
    *   Creates `default_users` and assigns them to roles.
    *   Creates `default_fuel_trucks`.
*   **Permission Groups Script (`permission_groups_schema.py`):** `backend/src/migration_scripts/permission_groups_schema.py` is run *after* `seeds.py`.
    *   Creates `PermissionGroup` definitions.
    *   Assigns permissions to these groups.
    *   Assigns roles to these permission groups. This is a key part of the enhanced permission system.
*   **CLI Commands for Initialization:**
    ```bash
    # 1. Seed base data (permissions, roles, users, legacy role-perms)
    docker-compose exec backend flask seed run

    # 2. Create permission groups and assign roles to groups
    docker-compose exec backend flask create-permission-groups run
    ```
*   **Idempotency:** Both `flask seed run` and `flask create-permission-groups run` are designed to be idempotent. They typically clear relevant tables before re-populating.
*   **When to Run:**
    *   After a full database reset (e.g., `docker-compose down -v` followed by `docker-compose up -d`).
    *   When new permissions, default roles, or permission groups are added/modified in the respective Python scripts.
    *   The `backend/entrypoint.sh` script attempts to auto-run both commands if the `users` table is empty.
*   **Convenience Script:** `backend/reseed_database.sh` offers helpful commands:
    *   `./reseed_database.sh reseed`: Force re-runs `flask seed run` and `flask create-permission-groups run`.
    *   `./reseed_database.sh fresh`: Stops containers, removes volumes (full data wipe), and restarts, triggering auto-initialization.
*   **COMMON AI PITFALL (Database Connection for Seeding/Migrations):**
    *   The AI often assumes a local PostgreSQL instance or tries to run `psql` commands directly on the host without considering Docker.
    *   **Guidance for AI:** Always emphasize that database operations like seeding and migrations for the backend are performed *via Flask commands executed inside the Docker container* (`docker-compose exec backend flask ...`). The backend application connects to the database using the service name `db`.

## 5. Permissions System (Enhanced PBAC)

*   **Current State:** The system uses a multi-layered, granular Permission-Based Access Control (PBAC) model.
*   **Core Service:** `backend/src/services/enhanced_permission_service.py` is the central service for all permission checks. It handles:
    *   Resource-specific permissions (`ResourceContext`).
    *   Caching (in-memory and Redis via `backend/src/services/redis_permission_cache.py`).
    *   Performance monitoring (`backend/src/services/permission_performance_monitor.py`).
*   **Sources of Permissions for a User (evaluated by `EnhancedPermissionService`):**
    1.  **Direct User Permissions:** Specific permissions assigned directly to a user (see `backend/src/models/user_permission.py`). Managed via API.
    2.  **Permission Groups (Directly Assigned):** Permissions inherited from groups directly assigned to the user (see `backend/src/models/user_permission_group.py`). Managed via API.
    3.  **Permission Groups (via Roles):** Permissions inherited from groups assigned to the user's roles (see `backend/src/models/permission_group.py` for `RolePermissionGroup`). Initial setup in `permission_groups_schema.py`, managed via API.
    4.  **Legacy Role Permissions:** Direct permission-to-role links (see `backend/src/models/role_permission.py`). Initial setup in `seeds.py`.
*   **Source of Truth for Permission Strings:** The canonical list of all available permission strings is defined in `backend/src/seeds.py` within the `all_permissions` list (e.g., `create_fuel_order`).
*   **Backend Permission Checking:**
    *   The `User` model (`backend/src/models/user.py`) has a `has_permission(permission_name, resource_type=None, resource_id=None)` method which delegates to `EnhancedPermissionService`.
    *   API routes are protected using decorators from `backend/src/utils/enhanced_auth_decorators_v2.py` (e.g., `@require_permission_v2('PERMISSION_NAME')`, `@require_any_permission_v2`, `@require_permission_or_ownership_v2`).
*   **Frontend Permission Handling:**
    *   `frontend/app/contexts/permission-context.tsx` and `frontend/hooks/usePermissions.ts` manage user permissions on the client-side.
    *   Upon login, the frontend fetches the authenticated user's effective permissions from the `/api/auth/me/permissions` endpoint (see `frontend/app/services/auth-service.ts`). This endpoint returns a list of permission strings.
    *   UI elements are conditionally rendered or disabled based on these fetched permissions using helpers like `hasPermission()`, `hasAnyPermission()`, etc., from `usePermissions`.
*   **COMMON AI PITFALL (Inferring Permissions):**
    *   The AI might try to infer a user's capabilities solely from their role name (e.g., "CSR can do X").
    *   **Guidance for AI:** Stress that access control is primarily based on *specific permission strings*. While roles and groups are collections of permissions, functionality checks should verify the presence of the required permission string (e.g., `create_fuel_order`), not just the role/group name. Refer to `seeds.py` for actual permission names. The `EnhancedPermissionService` resolves the final "has permission" status.

## 6. API Endpoints Overview

The backend exposes RESTful APIs for various resources. Key areas related to permissions and core functionality:

*   **Authentication (`/api/auth/`):**
    *   `/login`: Authenticates user, returns JWT.
    *   `/register`: Creates a new user.
    *   `/me/permissions`: Returns a list of effective permission strings for the authenticated user. Crucial for frontend.
*   **User Management (`/api/users/` and `/api/admin/users/`):**
    *   CRUD operations for users.
    *   Admin endpoints for managing all users.
*   **Enhanced User Permissions (`/api/enhanced_users/` - *check actual prefix in `app.py`*):**
    *   Endpoints for managing direct user-permission assignments.
    *   Endpoints for managing user-permission group assignments.
*   **Role Management (`/api/admin/roles/`):**
    *   CRUD for roles.
    *   Endpoints to assign/remove permissions from roles (legacy style).
    *   Endpoints to assign/remove permission groups from roles.
*   **Permission Management (`/api/admin/permissions/`):**
    *   List all available permissions.
*   **Permission Group Management (`/api/admin/permission-groups/`):**
    *   CRUD for permission groups.
    *   Endpoints to manage permissions within a group.
*   **LST Management (`/api/admin/lsts/`):**
    *   CRUD for Line Service Technicians, including LST-specific fields and performance data.
*   **Other Resources:** Standard CRUD APIs for Fuel Orders, Fuel Trucks, Aircraft, Customers, often with admin-specific versions.

## 7. Key Files for Context

*   **Backend Structure & Config:**
    *   `backend/docker-compose.yml`: Defines services.
    *   `backend/src/config.py`: Database URIs, secret keys.
    *   `backend/entrypoint.sh`: Initial container setup, auto-seeding/initialization logic.
    *   `backend/reseed_database.sh`: DB management helper.
    *   `backend/src/app.py`: Flask app factory, blueprint registration.
*   **Permissions & Seeding (Backend):**
    *   `backend/src/seeds.py`: **Canonical source for permission strings, default roles, initial role-permission links.**
    *   `backend/src/migration_scripts/permission_groups_schema.py`: **Defines permission groups and assigns roles to groups.**
    *   `backend/src/models/permission.py`, `role.py`, `user.py`, `permission_group.py`, `user_permission.py`, `user_permission_group.py`: Core PBAC models.
    *   `backend/src/services/enhanced_permission_service.py`: **Central permission checking logic.**
    *   `backend/src/services/redis_permission_cache.py`: Redis caching for permissions.
    *   `backend/src/utils/enhanced_auth_decorators_v2.py`: API protection decorators (e.g., `@require_permission_v2`).
    *   `backend/src/routes/admin/` (various files): Admin API endpoints for managing permissions, roles, groups.
    *   `backend/src/routes/enhanced_user_routes.py`: API endpoints for granular user permission/group management.
*   **Frontend Configuration & Auth:**
    *   `frontend/next.config.mjs`: API proxy rewrite rules.
    *   `frontend/app/contexts/permission-context.tsx`: Manages permissions state.
    *   `frontend/hooks/usePermissions.ts`: Provides permission checking utilities.
    *   `frontend/app/services/auth-service.ts`: Handles login and fetching user permissions via `/api/auth/me/permissions`.
    *   `frontend/app/services/api-config.ts`: Base API URL and auth header generation.

## 8. Common Debugging Pitfalls

### 8.1. Mock Data Layer Causing Authentication Issues ⚠️ CRITICAL

**Symptom:** Users experiencing unexpected logouts, particularly when interacting with specific features (e.g., creating receipts). The frontend appears to lose authentication state randomly, often manifesting as 401/403 errors that trigger logout mechanisms.

**Root Cause:** Frontend service functions (`frontend/app/services/`) may contain mock data implementations that bypass real API calls. When these mock implementations are used instead of actual backend API calls, the authentication flow is disrupted because:
1. Mock data doesn't validate JWT tokens
2. `g.current_user` context is not properly set in the backend decorators
3. Frontend receives inconsistent responses that don't match expected API contracts
4. Authentication decorators may throw unhandled exceptions due to missing context

**Where to Look:**
- Check `frontend/app/services/` files for functions with `if (isOfflineMode())` blocks or extensive mock implementations
- Look for functions that return mock data instead of calling `fetch()` with proper API endpoints
- Verify API calls use correct endpoint patterns (e.g., `/fbo/${fboId}/receipts/draft` not `/receipts/draft`)
- Ensure request body formats match backend expectations (e.g., `fuel_order_id` vs `fuelOrderId`)

**Debug Strategy:**
1. **Add logging to auth decorators** (`backend/src/utils/enhanced_auth_decorators_v2.py`) to trace JWT verification and `g.current_user` setup
2. **Check Network tab** in browser dev tools - missing API calls indicate mock implementations
3. **Examine service functions** for mock logic that should be calling real APIs
4. **Verify API response handling** - ensure frontend correctly parses backend response structures

**Prevention:**
- Always implement real API calls in service functions
- Use mock data only for UI component testing, not in service layer
- Maintain consistent API contracts between frontend and backend
- Add integration tests that verify end-to-end authentication flows

This issue can consume significant debugging time, as symptoms appear authentication-related when the actual problem is bypassed API calls.

## 9. General AI Guidance & Reminders

*   **Docker is Key for Backend:** Assume the backend Flask app and PostgreSQL database are always running within Docker containers managed by `docker-compose`.
*   **Database Interaction:** For tasks involving the database (migrations, seeding, direct queries for debugging), use `docker-compose exec backend flask ...` for application-level commands. The application itself connects to `db:5432`.
*   **Frontend Port `3000`:** The primary frontend development server is expected to be on `http://localhost:3000`.
*   **API Proxy:** Frontend calls to `/api/...` are proxied to `http://localhost:5001/api/...`.
*   **Permissions Source of Truth:** `backend/src/seeds.py` for permission *strings*. `permission_groups_schema.py` for group definitions. `EnhancedPermissionService` for runtime checks.
*   **Idempotent Initialization:** `flask seed run` and `flask create-permission-groups run` are designed to be safe to re-run.
*   **Migrations:** Database schema changes are managed by Alembic (`flask db ...`). Migration scripts for data transformation (like `permission_migration.py`) exist in `backend/src/migration_scripts/`.
*   **Focus on Granular Permissions:** When discussing access control, prioritize checking for specific permission strings. The `EnhancedPermissionService` handles the complex resolution.
*   **Error Handling:** Be mindful of common errors like JWT issues, database connection problems (especially with Docker), and permission mismatches.
*   **API Contracts:** Backend uses Marshmallow schemas for request/response validation. Refer to `backend/src/schemas/` for API data structures.


Test Credentials:
Admin: admin@fbolaunchpad.com / Admin123!
CSR: csr@fbolaunchpad.com / CSR123!
Fueler: fueler@fbolaunchpad.com / Fueler123!
Member: member@fbolaunchpad.com / Member123!

**IN TESTING**
If encountering authentication issues or logouts, it is likely a backend 500 error disguised as a 401 authentication error.