# Active Context & Action Items

This document outlines current issues, decisions made, and immediate next steps for the FBO LaunchPad project.

## Decisions Made during Integration (Phases 1 & 2)

*   **API-First Data Fetching:** All primary data modules (Auth, Users, Aircraft, Customers, Fuel Trucks) in the frontend now fetch data live from the backend APIs. Mock data and direct `localStorage` usage for these entities have been removed from services.
*   **User Management API Usage:**
    *   Admin User Management UI (`frontend/app/admin/users/page.tsx`) now uses the `/admin/users/` API endpoints for CRUD operations.
    *   Due to the backend's `/admin/users/{id}` (GET single user) endpoint being commented out, the `user-service.ts#getUserById` function temporarily uses the non-admin `/users/:id` route. This should be revisited once the admin endpoint is active.
*   **Aircraft & Customer Model Discrepancies Management:**
    *   Frontend services (e.g., `aircraft-service.ts`) implement a mapping layer to adapt the currently minimal backend data (e.g., for Aircraft: `id`, `tail_number`, `aircraft_type`, `fuel_type`) to the richer frontend models desired for UI presentation.
    *   Consequently, the UI will display default values (e.g., 'N/A', 0) or derived information for fields not yet supplied by the backend (e.g., `Aircraft.model`, `Aircraft.owner`, `Aircraft.homeBase`).
    *   Create and Update operations in the services are designed to send payloads compatible with the current backend schemas, omitting frontend-only fields.
*   **Role ID Handling in User Forms (Temporary):**
    *   The admin user creation and editing forms (`frontend/app/admin/users/page.tsx`) use a temporary, hardcoded mapping (`roleStringToIdMap`) to convert selected role names (strings) to placeholder numeric IDs for the `role_ids` field in API requests. This is a stopgap measure.
*   **Error Display:**
    *   API errors are generally caught by service functions and re-thrown. UI components display these errors using `toast` notifications and, for form-specific errors, by setting state variables that render messages within the dialogs.
*   **Permissions Management:**
    *   User permissions are fetched live from `/auth/me/permissions` after login and managed by `PermissionContext`.

## Current Known Issues / Technical Debt / Backend Needs

*   **Backend Model Expansion (Critical Priority):**
    *   **Aircraft Model:** The `Aircraft` model on the backend urgently requires expansion to include fields essential for the frontend UI. Currently, it primarily supports `id`, `tail_number`, `aircraft_type`, and `fuel_type`. Missing fields that are desired on the frontend include (but are not limited to): `model`, `owner` (or clear relation to a `Customer`), `homeBase`, `status` (enum: active, maintenance, inactive), `fuelCapacity`, `mtow`, `lastMaintenance`, `nextMaintenance`.
    *   **Customer Model:** While the `Customer` model (`id`, `name`, `email`, `phone`) is more complete, ensure `email` and `phone` are robustly supported and consistently available through all API layers.
    *   **Impact:** Without these backend model enhancements, the corresponding UI sections will remain sparse, displaying 'N/A' or default values, and full functionality cannot be realized.
*   **Dynamic Role Fetching & Management for Forms (High Priority):**
    *   The user creation/editing forms need to dynamically fetch available roles and their corresponding IDs from a dedicated backend API endpoint (e.g., `GET /admin/roles`). This will replace the current temporary placeholder ID mapping and allow for proper role assignment.
*   **Server-Side Filtering, Sorting, and Pagination (Medium Priority):**
    *   Currently, most admin list views (Users, Customers, Fuel Trucks) fetch all data and perform filtering/sorting on the client-side.
    *   For improved performance and scalability, backend APIs for these list endpoints should be enhanced to support:
        *   Server-side filtering by multiple fields (e.g., filter users by email, filter trucks by fuel type and status).
        *   Server-side sorting by various columns.
        *   Pagination.
*   **Comprehensive API Error Handling & Feedback (Medium Priority):**
    *   While basic API error handling is in place (toasts, form field errors), a more systematic approach could be beneficial. This includes:
        *   Consistent error response structure from the backend.
        *   More granular error handling on the frontend based on specific HTTP status codes or error types from the backend (e.g., distinguishing between a 400 Bad Request due to validation vs. a 500 Internal Server Error).
*   **Automated Test Coverage Expansion (Medium Priority):**
    *   Foundational Vitest tests for Customer and Fuel Truck admin pages have been added.
    *   Coverage should be reviewed and expanded for:
        *   Other integrated components (e.g., `aircraft-lookup.tsx`, `admin/users/page.tsx`, `login/page.tsx` interactions).
        *   More edge cases and validation scenarios in existing tests.
        *   Service layer functions (potentially with more focused integration tests against a mock API).
*   **UI for Admin Aircraft Management (If Required):**
    *   A UI for managing Aircraft entities under an `/admin/aircraft` route (similar to customers/users) was not explicitly built out in this phase beyond the `aircraft-lookup` component. If full CRUD admin pages for Aircraft are needed, these will need to be created and integrated with `aircraft-service.ts`.
*   **Backend `GET /admin/users/{id}` Endpoint:**
    *   This endpoint was noted as commented out in the backend API documentation. The frontend `user-service.ts#getUserById` currently uses the non-admin `/users/:id` as a workaround. This should be switched to the admin version once available for consistency and proper permissioning.

## Immediate Next Steps (Post-Integration Phase 1 & 2)

1.  **User/QA Manual Testing (Critical):**
    *   The user/QA team needs to perform thorough manual end-to-end testing of all integrated features:
        *   Login/Logout.
        *   Permission-based UI rendering.
        *   Admin User Management (List, Create, Edit, Delete).
        *   Admin Customer Management (List, Create, Edit, Delete).
        *   Admin Fuel Truck Management (List, Create, Edit, Delete).
        *   Aircraft Lookup component functionality.
    *   Focus on data consistency, UI responsiveness, error handling, and adherence to requirements.
2.  **Address Backend Model Expansion (Blocker for UI Richness):**
    *   Prioritize backend development to expand the `Aircraft` model as detailed above. This is crucial for the aircraft-related UI to display meaningful information.
3.  **Implement Dynamic Role Fetching for User Forms (High Impact for User Admin):**
    *   Backend to provide an endpoint for roles (e.g., `GET /admin/roles`).
    *   Frontend `admin/users/page.tsx` to be updated to use this endpoint for populating role selection in create/edit forms.

This document should be regularly updated as the project progresses.
