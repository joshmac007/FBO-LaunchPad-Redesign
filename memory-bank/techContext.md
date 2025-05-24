# Technical Context

This document outlines key technical aspects and architectural decisions for the FBO LaunchPad project.

## Backend
*   Language/Framework: Python with FastAPI (assumed based on common patterns).
*   Database: PostgreSQL (assumed).
*   Authentication: JWT-based authentication.
*   API Style: RESTful APIs.
*   Key Endpoints (examples):
    *   `/auth/login`
    *   `/auth/me/permissions`
    *   `/admin/users/`
    *   `/admin/aircraft/`
    *   `/admin/customers/`
    *   `/fuel-trucks/`
    *   `/aircraft/`

## Frontend
*   Framework: Next.js (React).
*   Language: TypeScript.
*   Styling: Tailwind CSS with Shadcn UI components.
*   State Management: React Context API (e.g., `PermissionContext`), local component state (`useState`).
*   API Communication: `fetch` API used within service modules.

## Frontend Architecture & Data Flow (Post API Integration Phase 1 & 2)

*   **Service Layer:**
    *   All backend API interactions for primary data modules (Authentication, Users, Aircraft, Customers, Fuel Trucks) are now centralized in dedicated service files located in `frontend/app/services/`.
    *   These services (`auth-service.ts`, `user-service.ts`, `aircraft-service.ts`, `customer-service.ts`, `fuel-truck-service.ts`) encapsulate API endpoint calls, request/response handling, and data mapping.
    *   Mock data and direct `localStorage` usage for storing primary application data (like lists of users, aircraft, etc.) have been removed from these core services. Data is fetched live from the API.
*   **API Configuration:**
    *   `frontend/app/services/api-config.ts` provides the `API_BASE_URL`, a helper `getAuthHeaders()` to retrieve the JWT token from `localStorage` and prepare authorization headers, and `handleApiResponse()` for consistent response parsing and error handling.
*   **State Management & Permissions:**
    *   User session state (JWT token and basic user info) is stored in `localStorage` after successful login via `auth-service.ts`.
    *   `PermissionContext` (in `frontend/app/contexts/permission-context.tsx`), in conjunction with `auth-service.ts`, manages user roles and live permissions. Permissions are fetched from the `/auth/me/permissions` endpoint upon application load (if authenticated) and made available via the `usePermissions` hook.
*   **Data Display and Forms:**
    *   Page components (e.g., under `frontend/app/admin/`) and general components utilize these services to fetch data and perform CRUD operations.
    *   Forms for creating and editing entities (Users, Customers, Fuel Trucks) are implemented within their respective page components, using local component state to manage form data and submission states.

## Known Challenges & Frontend-Backend Interaction Notes

*   **Data Mapping for Model Discrepancies:**
    *   A data mapping strategy is employed in services like `aircraft-service.ts` to bridge differences between the richer frontend data models (designed for a comprehensive UI) and the current, more limited backend schemas.
    *   This results in some data fields on the frontend being displayed with default values (e.g., 'N/A', 0) or derived information when the backend does not provide corresponding data. For example, the `Aircraft` frontend model has fields like `model`, `owner`, `homeBase` which are not yet fully supplied by the backend.
    *   Create and Update operations in the services ensure that payloads sent to the backend conform to the expected backend schemas, omitting frontend-only fields or transforming data as needed.
*   **Error Handling:**
    *   `handleApiResponse` provides a basic layer for handling non-OK HTTP responses and parsing errors.
    *   Individual services and components implement further error handling, often displaying messages to the user via `toast` notifications or in-form error messages.
*   **API Endpoint Versioning/Consistency:**
    *   Care is taken to align frontend service calls with the documented backend API endpoints (e.g., use of trailing slashes where appropriate, correct HTTP methods).
    *   The admin user management temporarily uses a non-admin route for fetching a single user due to backend limitations (see `activeContext.md`).

## Testing
*   Unit and integration tests for frontend components are being developed using Vitest and React Testing Library.
*   Service modules are mocked to isolate component behavior during tests.
*   Focus is on testing user interactions, data display, form submissions, and error handling.
