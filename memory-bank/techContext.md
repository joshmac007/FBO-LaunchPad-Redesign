# FBO LaunchPad - AI Context & Guidelines

This document provides essential context about the FBO LaunchPad project to help AI assistants understand its structure, common development patterns, and potential pitfalls.

## 1. Project Overview

*   **Name:** FBO LaunchPad
*   **Purpose:** A comprehensive Fixed Base Operator (FBO) management system designed to streamline aircraft fueling operations, user management, and related administrative tasks.
*   **Key User Roles:**
    *   **System Administrator:** Full system access, manages users, roles, permissions, and system settings.
    *   **Customer Service Representative (CSR):** Manages fuel orders, customer interactions, and reviews completed orders.
    *   **Line Service Technician (LST/Fueler):** Executes fuel orders, updates order statuses, and records operational data.
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
*   **Containerization:** Docker and Docker Compose for the backend and database.

## 3. Development Environment & Key Commands

### Backend (Dockerized)

*   **Container Orchestration:** `docker-compose.yml` (or `docker-compose.yml`) manages the backend Flask application and PostgreSQL database services.
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

## 4. Database Seeding - CRITICAL CONTEXT

*   **Primary Seeding Script:** `backend/src/seeds.py` contains the logic for populating initial data, including permissions, roles, role-permission assignments, and default users.
*   **CLI Command for Seeding:**
    ```bash
    docker-compose exec backend flask seed run
    ```
*   **Idempotency:** The `seed_data()` function in `seeds.py` is designed to be idempotent. It typically clears existing PBAC-related tables (`user_roles`, `role_permissions`, etc.) before re-populating them. This means it can be re-run safely without duplicating core data.
*   **When to Seed:**
    *   After a full database reset (e.g., `docker-compose down -v` followed by `docker-compose up -d`).
    *   When new permissions or default roles are added/modified in `seeds.py`.
    *   The `backend/entrypoint.sh` script attempts to auto-seed the database if the `users` table is empty upon container startup.
*   **Convenience Script:** `backend/reseed_database.sh` offers helpful commands:
    *   `./reseed_database.sh reseed`: Force re-runs `flask seed run`.
    *   `./reseed_database.sh fresh`: Stops containers, removes volumes (full data wipe), and restarts, triggering auto-seed.
*   **COMMON AI PITFALL (Database Connection for Seeding/Migrations):**
    *   The AI often assumes a local PostgreSQL instance or tries to run `psql` commands directly on the host without considering Docker.
    *   **Guidance for AI:** Always emphasize that database operations like seeding and migrations for the backend are performed *via Flask commands executed inside the Docker container* (`docker-compose exec backend flask ...`). The backend application connects to the database using the service name `db` (e.g., `postgresql://fbo_user:fbo_password@db:5432/fbo_launchpad_dev`).

## 5. Permissions System (PBAC)

*   **Current State:** The system has transitioned from a simple role-based system to a more granular Permission-Based Access Control (PBAC) system.
*   **Source of Truth for Permissions:** The canonical list of all available permissions is defined in `backend/src/seeds.py` within the `all_permissions` list.
*   **Role-Permission Mapping:** `backend/src/seeds.py` also defines the `role_permission_mapping`, which assigns sets of these permissions to default roles (System Administrator, CSR, LST, Member).
*   **Backend Permission Checking:**
    *   The `User` model (`backend/src/models/user.py`) has a `has_permission(permission_name)` method.
    *   API routes are protected using the `@require_permission('PERMISSION_NAME')` decorator (`backend/src/utils/decorators.py`).
*   **Frontend Permission Handling:**
    *   `frontend/app/contexts/permission-context.tsx` and `frontend/hooks/usePermissions.ts` manage user permissions on the client-side.
    *   Upon login, the frontend fetches the authenticated user's effective permissions from the `/api/auth/me/permissions` endpoint (see `frontend/app/services/auth-service.ts`).
    *   UI elements are conditionally rendered or disabled based on these fetched permissions using helpers like `can()`, `canAny()`, etc., from `usePermissions`.
*   **COMMON AI PITFALL (Inferring Permissions):**
    *   The AI might try to infer a user's capabilities solely from their role name (e.g., "CSR can do X").
    *   **Guidance for AI:** Stress that access control is now primarily based on *specific permissions*. While roles are collections of permissions, functionality checks should verify the presence of the required permission string (e.g., `CREATE_ORDER`), not just the role name. Refer to `seeds.py` for actual permission names.

## 6. Key Files for Context

*   **Backend Structure & Config:**
    *   `backend/docker-compose.yml`: Defines services, especially `db` and `backend`.
    *   `backend/config.py` & `backend/src/config.py`: Database URIs, secret keys.
    *   `backend/entrypoint.sh`: Initial container setup, auto-seeding logic.
    *   `backend/reseed_database.sh`: DB management helper.
    *   `backend/src/app.py`: Flask app factory, blueprint registration.
*   **Permissions & Seeding (Backend):**
    *   `backend/src/seeds.py`: **Canonical source for permissions and initial role assignments.**
    *   `backend/src/models/permission.py`, `backend/src/models/role.py`, `backend/src/models/user.py`: Core PBAC models.
    *   `backend/src/utils/decorators.py`: `@require_permission` decorator.
*   **Frontend Configuration & Auth:**
    *   `frontend/next.config.mjs`: API proxy rewrite rules.
    *   `frontend/app/contexts/permission-context.tsx`: Manages permissions state.
    *   `frontend/hooks/usePermissions.ts`: Provides permission checking utilities.
    *   `frontend/app/services/auth-service.ts`: Handles login and fetching user permissions.
    *   `frontend/app/services/api-config.ts`: Base API URL and auth header generation.

## 7. General AI Guidance & Reminders

*   **Docker is Key for Backend:** Assume the backend Flask app and PostgreSQL database are always running within Docker containers managed by `docker-compose`.
*   **Database Interaction:** For tasks involving the database (migrations, seeding, direct queries for debugging), use `docker-compose exec backend flask ...` for application-level commands, or connect to `localhost:5433` (default host mapping) if using a GUI/CLI tool from the host. The application itself connects to `db:5432`.
*   **Frontend Port `3000`:** The primary frontend development server is expected to be on `http://localhost:3000`. Avoid starting new instances that might occupy other ports unless explicitly instructed.
*   **API Proxy:** Frontend calls to `/api/...` are proxied to `http://localhost:5001/api/...`.
*   **Permissions Source of Truth:** `backend/src/seeds.py` is the definitive source for available permission strings. Frontend checks should align with these names.
*   **Idempotent Seeding:** The `flask seed run` command is designed to be safe to re-run.
*   **Migrations:** Database schema changes are managed by Alembic using `flask db ...` commands executed within the `backend` Docker container.
*   **Focus on Granular Permissions:** When discussing access control for features, prioritize checking for specific permissions over broad role checks.
*   **Error Handling:** Be mindful of common errors like JWT issues, database connection problems (especially with Docker), and permission mismatches between frontend expectations and backend definitions.