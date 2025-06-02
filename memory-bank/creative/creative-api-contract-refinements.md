🎨🎨🎨 ENTERING CREATIVE PHASE: ARCHITECTURE/DATA MODEL 🎨🎨🎨

**Component/Decision Point 1: Standardizing `User.roles` structure (Sub-tasks 1.1.1, 1.1.4)**

**1. Component Description & Requirements:**
   - **Description:** The current system has an inconsistency in how user roles are represented. Admin-related user endpoints return roles as a list of objects (`List[{id: int, name: str}]`), while the non-admin user endpoint returns a single role string. The frontend `User` interface expects `string[]`. This needs to be standardized across frontend and backend for consistency and to prevent type errors.
   - **Requirements & Constraints:**
     - The solution must provide a consistent structure for `User.roles` across all relevant frontend services and backend API responses.
     - The backend `User` model supports multiple roles per user.
     - The frontend needs access to both role ID and role name for various functionalities (e.g., display, permission checks if IDs are used).
     - Minimize breaking changes to existing frontend components if possible, or clearly document necessary adaptations.
     - The solution should be clear and maintainable.

**2. Options Analysis:**

   **Option 1: Standardize on `Array<{ id: number; name: string }>` everywhere.**
     - **Description:**
       - Frontend `User.roles` interface becomes `Array<{ id: number; name: string }>`.
       - Backend `UserDetailSchema` (admin) continues to provide `List[RoleBriefSchema]` which matches this.
       - Backend `UserResponseSchema` (non-admin) is updated to also provide `List[RoleBriefSchema]` (e.g., `roles: fields.List(fields.Nested(RoleBriefSchema))`).
     - **Pros:**
       - Most consistent and provides full role information (ID and name) to the frontend.
       - Aligns with current `UserDetailSchema`.
       - Explicit and type-safe.
     - **Cons:**
       - Requires frontend components that currently expect `string[]` (if any beyond the direct service layer mismatch) to be updated to handle objects.
       - Slightly more verbose data transfer if only names are needed in some places.
     - **Complexity:** Medium (backend change for one schema, frontend interface change, potential component updates).

   **Option 2: Standardize on `Array<string>` (role names) everywhere.**
     - **Description:**
       - Frontend `User.roles` interface remains `string[]`.
       - Backend `UserDetailSchema` (admin) is modified to map its `List[RoleBriefSchema]` to `List[str]` (list of role names) before sending the response.
       - Backend `UserResponseSchema` (non-admin) is updated to return `List[str]` (list of role names), changing from a single role string.
     - **Pros:**
       - Simpler for frontend components that only need to display role names.
       - Matches current (though problematic) frontend `User.roles` interface expectation directly.
     - **Cons:**
       - Frontend loses direct access to role IDs unless a separate lookup mechanism is implemented or IDs are not needed. Role IDs are often useful for backend interactions or more robust permission checks.
       - Backend needs modification in `UserDetailSchema` to perform the mapping.
     - **Complexity:** Medium (backend changes for both schemas, frontend interface might be "correct" but underlying data source changes).

   **Option 3: Frontend service layer maps to a consistent internal model.**
     - **Description:**
       - Backend responses remain as they are (mixed types for roles initially).
       - Frontend `user-service.ts` is responsible for fetching user data from different endpoints and transforming the `roles` into a single, consistent internal frontend model (e.g., `Array<{ id: number; name: string }>`).
       - The exposed `User` interface from the service would use this consistent model.
     - **Pros:**
       - Isolates backend inconsistencies from the rest of the frontend application.
       - No immediate backend changes required (though backend standardization is still ideal long-term).
     - **Cons:**
       - Frontend service layer becomes more complex.
       - Still relies on inconsistent backend APIs, which is a root cause of the problem.
       - May lead to duplicate logic if different services fetch user data.
     - **Complexity:** Medium (significant frontend service logic changes).

**3. Recommended Approach:**

   - **Chosen Option:** Option 1: Standardize on `Array<{ id: number; name: string }>` everywhere.
   - **Rationale:**
     - This approach provides the most comprehensive and consistent data to the frontend, making both role IDs and names available. This is generally more robust for future development and allows for more flexible permission handling or UI displays.
     - It aligns with the existing structure of `UserDetailSchema` from admin routes, minimizing changes there.
     - While it requires changes to the non-admin `UserResponseSchema` and the frontend `User` interface (and potentially consuming components), these changes lead to a cleaner and more type-safe contract overall. Explicitly handling objects in the frontend is preferable to losing ID information or having complex mapping logic scattered.
     - This directly addresses the root inconsistency in API responses.

**4. Implementation Guidelines:**

   - **Backend:**
     - Modify `UserResponseSchema` in `backend/src/schemas/auth_schemas.py` to serialize the `roles` field as a list of `RoleBriefSchema` objects (e.g., `roles = fields.List(fields.Nested(RoleBriefSchema), attribute="roles")`). Ensure the `User` model's `roles` relationship is correctly loaded for serialization.
   - **Frontend:**
     - Update the `User` interface in `frontend/app/services/user-service.ts`: `roles: Array<{ id: number; name: string }>;`
     - Review functions within `user-service.ts` (like `getUserById`) to ensure they correctly type the expected response from the backend (now consistently `List[RoleBriefSchema]`). The existing `transformUserResponse` might already handle this if the `RoleBriefSchema` structure matches.
     - Audit frontend components that consume the `User` object (especially its `roles` property). Update them to work with an array of role objects instead of an array of strings if they were relying on the old incorrect type. For example, if displaying roles, map over the array and access the `name` property: `user.roles.map(role => role.name).join(', ')`.

**5. Verification Checkpoint:**
   - After implementation, verify:
     - All admin user endpoints (`/api/admin/users`, `/api/admin/users/{id}`) return roles as `Array<{ id: number; name: string }>`. 
     - The non-admin user endpoint (`/api/users/{id}`) returns roles as `Array<{ id: number; name: string }>`. 
     - Frontend correctly fetches, types, and utilizes this standardized roles structure without errors.
     - UI elements displaying roles function as expected.

---

**Component/Decision Point 2: Determining appropriate permissions for Fuel Order routes (Sub-tasks 2.3.1-2.3.3)**

**1. Component Description & Requirements:**
    - **Description:** Several Fuel Order routes (`get_fuel_orders`, `get_fuel_order`, `update_fuel_order_status`) are protected by `@token_required` but lack specific `@require_permission` decorators. Authorization currently relies on service-layer logic. This item is about deciding and implementing appropriate route-level permission checks for better security and consistency.
    - **Requirements & Constraints:**
        - Implement route-level permission checks using `@require_permission`.
        - Permissions should align with the principle of least privilege.
        - The chosen permissions should be consistent with existing permissions defined in `seeds.py`.
        - Service-level logic can provide more granular checks, but route-level should offer a baseline.
        - Consider user roles (e.g., LST, Admin, Member) and their expected access to fuel order data.
        - `VIEW_ALL_ORDERS` and `VIEW_ASSIGNED_ORDERS` are existing relevant permissions. `UPDATE_OWN_ORDER_STATUS` is also relevant.

**2. Options Analysis:**

    **Option 1: Use specific "assigned" permissions as a baseline, service layer handles "all".**
        - **Description:**
            - `get_fuel_orders` (list): `@require_permission('VIEW_ASSIGNED_ORDERS')`. The service layer would then escalate to show all orders if the user *also* has `VIEW_ALL_ORDERS`.
            - `get_fuel_order` (single): `@require_permission('VIEW_ASSIGNED_ORDERS')`. Service layer verifies if the specific order is indeed assigned or if user has `VIEW_ALL_ORDERS`.
            - `update_fuel_order_status`: `@require_permission('UPDATE_OWN_ORDER_STATUS')`. Service layer verifies if the order is assigned to the user for status updates.
        - **Pros:**
            - Enforces a good baseline of "assigned" access at the route level.
            - Clearly separates general access from privileged "view all" access, which is handled more granularly in the service.
            - Uses existing, relevant permission strings.
        - **Cons:**
            - Users with `VIEW_ALL_ORDERS` but not explicitly `VIEW_ASSIGNED_ORDERS` (if such a state is possible and intended) might be blocked at the route level before service logic kicks in. This depends on how permissions are typically granted. (Assumption: `VIEW_ALL_ORDERS` implies ability to view assigned ones too, or users with `VIEW_ALL_ORDERS` would also have `VIEW_ASSIGNED_ORDERS` or equivalent).
        - **Complexity:** Low (adding existing decorators).

    **Option 2: Create new, more generic route-level permissions.**
        - **Description:**
            - Define new permissions like `ACCESS_FUEL_ORDERS_MODULE` or `INTERACT_WITH_FUEL_ORDERS`.
            - `get_fuel_orders`: `@require_permission('ACCESS_FUEL_ORDERS_MODULE')`
            - `get_fuel_order`: `@require_permission('ACCESS_FUEL_ORDERS_MODULE')`
            - `update_fuel_order_status`: `@require_permission('INTERACT_WITH_FUEL_ORDERS')` (or be more specific like `UPDATE_FUEL_ORDER_GENERIC`)
            - All detailed logic (assigned vs. all, own order for update) remains purely in the service layer.
        - **Pros:**
            - Simplifies route-level checks to just "can this user type even access this module?".
        - **Cons:**
            - Requires adding new permissions to `seeds.py` and assigning them.
            - Less granular at the route level; pushes more responsibility to service layer, which is already the case but the goal was to improve route-level checks.
            - Might be too generic and not add much security value over simple `@token_required` if the service layer is already robust.
        - **Complexity:** Medium (new permissions, assignments, then decorator additions).

    **Option 3: Use a compound permission or role check at the route (if decorator supports).**
        - **Description:** If `@require_permission` could handle OR logic (e.g., `'VIEW_ASSIGNED_ORDERS' or 'VIEW_ALL_ORDERS'`), use that. Or, check for a role that implies these permissions.
        - **Pros:**
            - More expressive route-level check.
        - **Cons:**
            - The current `@require_permission` likely doesn't support OR logic directly in the string. Custom decorator modification would be needed.
            - Checking roles at the route level is generally less flexible than permission-based checks.
        - **Complexity:** High (if decorator modification is needed).

**3. Recommended Approach:**

    - **Chosen Option:** Option 1: Use specific "assigned" permissions as a baseline, service layer handles "all".
    - **Rationale:**
        - This option leverages existing, well-defined permissions (`VIEW_ASSIGNED_ORDERS`, `UPDATE_OWN_ORDER_STATUS`).
        - It establishes a clear and reasonable baseline security check at the route level: a user must at least have rights to see/update orders assigned to them to interact with these endpoints.
        - The service layer is the correct place for more complex logic like escalating to `VIEW_ALL_ORDERS` or detailed ownership checks for updates, as it has more context. This approach doesn't prevent that; it complements it.
        - It avoids the need to create new, potentially overly generic permissions or modify existing decorators.
        - It's assumed that users with broader permissions (like `VIEW_ALL_ORDERS`) would typically also possess the narrower, foundational permissions (like `VIEW_ASSIGNED_ORDERS`), or the role/permission assignment process would ensure this. If not, a minor adjustment to permission assignment might be needed, but the permission structure itself is sound.

**4. Implementation Guidelines:**

    - **Backend:**
        - In `backend/src/routes/fuel_order_routes.py`:
            - Add `@require_permission('VIEW_ASSIGNED_ORDERS')` to the `get_fuel_orders` function (the route for listing multiple fuel orders).
            - Add `@require_permission('VIEW_ASSIGNED_ORDERS')` to the `get_fuel_order` function (the route for fetching a single fuel order).
            - Add `@require_permission('UPDATE_OWN_ORDER_STATUS')` to the `update_fuel_order_status` function.
    - **Review & Testing:**
        - Ensure that users with only `VIEW_ASSIGNED_ORDERS` can access their orders but not others (unless service logic specifically allows for some reason, which should be reviewed).
        - Ensure users with `VIEW_ALL_ORDERS` (and `VIEW_ASSIGNED_ORDERS`) can still access all orders as per service logic.
        - Ensure users can only update status for orders they are permitted to (as per `UPDATE_OWN_ORDER_STATUS` and service logic).

**5. Verification Checkpoint:**
    - After implementation, verify:
        - Routes are inaccessible without the required base permission.
        - Users with appropriate permissions can access the routes.
        - Existing service-layer logic for `VIEW_ALL_ORDERS` or detailed update permissions continues to function correctly on top of the route-level check.

---

**Component/Decision Point 3: Deciding on API for username vs. full name (Sub-task 6.1.1)**

**1. Component Description & Requirements:**
    - **Description:** There's an ambiguity regarding user names. The DB has `username` (for login) and `name` (for full name). The admin API schema (`UserDetailSchema`) exposes DB `username` as API `name`. The frontend `User` interface has optional `name` and `username`. `UserService.create_user` uses input `name` for `User.username`. This causes confusion and potential issues with managing full names.
    - **Requirements & Constraints:**
        - The API must clearly distinguish between a unique login identifier (username) and a displayable full name.
        - Both frontend and backend need to consistently use these distinct fields.
        - The solution should allow for creating, updating, and displaying both the username and the full name.
        - Minimize disruption to existing login functionality which relies on `username`.
        - Ensure clarity for API consumers and frontend developers.

**2. Options Analysis:**

    **Option 1: Use `username` and `fullName` consistently across API and frontend.**
        - **Description:**
            - API contracts (request/response bodies, schemas) will use `username` for the login ID and `fullName` for the displayable full name.
            - Backend `User` model continues to use `username` and `name` (DB `name` field stores the full name).
            - Backend schemas (`UserDetailSchema`, `UserResponseSchema`, request schemas) will explicitly map:
                - API `username` <-> DB `User.username`
                - API `fullName` <-> DB `User.name`
            - Frontend `User` interface and DTOs will use `username: string` and `fullName: string`.
        - **Pros:**
            - Very clear and unambiguous.
            - Directly addresses the confusion.
            - Frontend and backend field names in DTOs/interfaces align well with their intent.
        - **Cons:**
            - Requires changes in backend schemas, service logic (for create/update), frontend interfaces, DTOs, and any UI components that currently use a generic `name` field. This is a broad change.
        - **Complexity:** High (due to the breadth of changes across frontend, backend API, and potentially DB mapping logic if service layer doesn't handle it entirely).

    **Option 2: Use `username` and `displayName` (or `display_name`).**
        - **Description:** Similar to Option 1, but uses `displayName` instead of `fullName` for the displayable name.
            - API: `username`, `displayName`.
            - Backend `User` model: `username`, `name` (maps to `displayName`).
            - Frontend: `username`, `displayName`.
        - **Pros:**
            - `displayName` can be a common term. Otherwise, same pros as Option 1.
        - **Cons:**
            - Same cons as Option 1 regarding the breadth of changes.
        - **Complexity:** High.

    **Option 3: Keep API `name` but clarify its use for `fullName` and add explicit `username`.**
        - **Description:**
            - API continues to use `name` but this field is now strictly for the full/display name.
            - A new API field `username` is introduced for the login username.
            - Backend `UserDetailSchema`:
                - `name` field maps to DB `User.name` (full name).
                - New `username` field maps to DB `User.username`.
            - Frontend `User` interface: `name: string` (for full name), `username: string`.
            - Backend services (`create_user`, `update_user`) need to be updated to handle `name` for `User.name` and `username` for `User.username` from requests.
        - **Pros:**
            - Potentially less disruptive to existing frontend code that uses `name` for display purposes if that was the common interpretation.
            - Still achieves clarity by introducing an explicit `username` field.
        - **Cons:**
            - The existing API `name` (which currently points to DB `username`) changes its meaning to DB `User.name`. This is a breaking change for any API client expecting the old behavior of `name`.
            - Requires careful updates to all API interactions (frontend and potentially others).
        - **Complexity:** High (breaking change to the meaning of API `name`, plus other changes).

**3. Recommended Approach:**

    - **Chosen Option:** Option 1: Use `username` and `fullName` consistently across API and frontend.
    - **Rationale:**
        - This option offers the highest level of clarity and unambiguity by introducing distinct, intention-revealing field names (`username`, `fullName`) throughout the DTOs and interfaces used by the API and frontend.
        - While it requires widespread changes, these changes are explicit and aimed at correcting a fundamental ambiguity. Trying to reuse `name` with a changed meaning (Option 3) can lead to more subtle bugs or misunderstandings during transition.
        - `fullName` is a commonly understood term for a person's full displayable name.
        - This approach forces a clean separation of concerns from the API contract downwards, making future development and maintenance easier.

**4. Implementation Guidelines:**

    - **A. Backend - Model:**
        - No change needed for `backend/src/models/user.py` (`User.username` for login, `User.name` for full name is acceptable if consistently mapped).
    - **B. Backend - Schemas (`backend/src/schemas/user_schemas.py`, `auth_schemas.py`):**
        - `UserDetailSchema`, `UserResponseSchema`, and any user creation/update request schemas:
            - Ensure a field `username` that maps to `User.username`.
            - Ensure a field `fullName` that maps to `User.name` (the database field storing the full name).
            - Remove the old ambiguous `name` field if it was mapping to `User.username`.
    - **C. Backend - Services (`backend/src/services/user_service.py`):**
        - `create_user()`:
            - Expect `username` and `fullName` in input data.
            - Populate `User.username` with the input `username`.
            - Populate `User.name` with the input `fullName`.
        - `update_user()`:
            - Expect optional `username` and `fullName` in input data.
            - Update `User.username` if `username` is provided (and valid, e.g., not taken if it's being changed).
            - Update `User.name` if `fullName` is provided.
    - **D. Frontend - Service (`frontend/app/services/user-service.ts`):**
        - Update the `User` interface:
          ```typescript
          export interface User {
            id: number | string; // Consider standardizing this too based on other audit points
            username: string;
            fullName?: string; // Or string, if always expected
            email?: string;
            is_active?: boolean;
            roles: Array<{ id: number; name: string }>; // From previous decision
            // ... any other fields
          }
          ```
        - Update request data structures (e.g., for creating/updating users) to use `username` and `fullName`.
        - Ensure all functions fetching or sending user data align with the new backend API contract.
    - **E. Frontend - Components & UI:**
        - Audit all components that display or take input for user names.
        - Login forms should use the `username` field.
        - User display sections (e.g., user lists, profile views) should use `fullName`.
        - User creation/edit forms should have distinct fields for `username` and `fullName`.
        - Example targets: `frontend/app/admin/users/components/user-form.tsx`, `columns.tsx`.

**5. Verification Checkpoint:**
    - After implementation, verify:
        - API responses consistently use `username` and `fullName`.
        - Users can be created with distinct usernames and full names.
        - Users can be updated, modifying their username (if allowed by policy) and full name.
        - Frontend displays `fullName` where appropriate and uses `username` for login.
        - Data integrity is maintained in the database (`User.username` and `User.name`).
        - Login functionality remains unaffected (uses `username`).

---

**Component/Decision Point 4: Strategy for optimizing frontend lookups (Sub-tasks 7.3.1, 7.3.2, 7.3.3)**

**1. Component Description & Requirements:**
    - **Description:** The audit noted that `getUserData` and `getFuelTruckData` in `frontend/app/services/fuel-order-service.ts` might be inefficient as they could be fetching all users or all fuel trucks for simple name lookups when transforming fuel order data for display. Caching (`getCachedData`) mitigates this for repeated calls but doesn't solve a potentially large initial fetch.
    - **Requirements & Constraints:**
        - Improve performance and reduce data transfer if current lookup methods are indeed inefficient for large datasets.
        - The solution should provide necessary data (e.g., LST name, truck number) for displaying fuel orders.
        - Maintain data consistency.
        - Consider the trade-offs between denormalizing data in API responses vs. making more targeted lookup calls.

**2. Options Analysis:**

    **Option 1: Backend API includes names directly in `FuelOrderBackend` responses.**
        - **Description:** Modify the backend schemas for fuel orders (e.g., `FuelOrderSchema` in `backend/src/schemas/fuel_order_schemas.py`) to include denormalized fields like `assigned_lst_username`, `assigned_lst_fullName`, and `assigned_truck_number` directly within the fuel order object. The backend service would perform the necessary joins or lookups to populate these fields.
        - **Pros:**
            - Simplifies frontend logic significantly; no need for separate lookups in `transformToDisplay`.
            - Reduces the number of API calls from the frontend.
            - Most performant for the frontend once the initial fuel order list is fetched.
        - **Cons:**
            - Backend service/schema becomes slightly more complex with joins/lookups.
            - Data is denormalized in the API response, which means if a user's name or truck number changes, old fuel order API responses (if cached or stored) won't reflect this until refetched. However, fuel orders are often records of a point-in-time assignment.
            - Slightly larger payload per fuel order.
        - **Complexity:** Medium (backend schema and service changes).

    **Option 2: Implement targeted batch lookup endpoints on the backend.**
        - **Description:** Create new backend endpoints like `/api/users/batch?ids=1,2,3` and `/api/fuel-trucks/batch?ids=1,2,3`. The frontend, after fetching fuel orders, would collect all unique `assigned_lst_user_id` and `assigned_truck_id` values and make one or two batch calls to get the associated names/numbers.
        - **Pros:**
            - Keeps fuel order API responses normalized.
            - More targeted data fetching than "get all users/trucks".
            - Reduces number of individual API calls compared to N+1 lookups.
        - **Cons:**
            - Frontend logic is more complex than Option 1 (collect IDs, make batch calls, map results back).
            - Still involves multiple API calls (initial list + batch calls).
            - Requires creating and maintaining new batch endpoints.
        - **Complexity:** Medium (new backend endpoints, more complex frontend service logic).

    **Option 3: Enhance frontend caching and rely on existing "get all" endpoints (Status Quo with minor improvements).**
        - **Description:** Continue using `getCachedData` with `getAllUsers` and `getAllFuelTrucks` but optimize caching parameters (e.g., longer TTL if appropriate) or implement more sophisticated frontend caching/state management (e.g., using a global store like Zustand or Redux if not already in place for this data).
        - **Pros:**
            - Minimal backend changes.
            - Leverages existing caching which helps for repeated views.
        - **Cons:**
            - Does not solve the initial large data fetch if the user/truck lists are very large. This can impact initial load time or performance for users who haven't hit the cache yet.
            - Can lead to stale data if cache TTL is long and underlying data changes frequently (though user names/truck numbers might be relatively stable).
        - **Complexity:** Low to Medium (depending on sophistication of caching improvements).

    **Option 4: GraphQL (Major Architectural Shift - Out of Scope for this task).**
        - **Description:** Adopt GraphQL, allowing the frontend to request exactly the data it needs, including nested user/truck details within the fuel order query.
        - **Pros:**
            - Highly efficient data fetching.
            - Solves N+1 problems elegantly.
        - **Cons:**
            - Major architectural change, significant backend and frontend refactoring. Not suitable for a targeted fix.
        - **Complexity:** Very High.

**3. Recommended Approach:**

    - **Chosen Option:** Option 1: Backend API includes names directly in `FuelOrderBackend` responses.
    - **Rationale:**
        - This offers the best balance of improved frontend performance and reduced frontend complexity for this specific use case. Fuel orders, once created and assigned, often act as historical records where the assigned LST/truck at that time is relevant. The risk of showing slightly stale names (if an LST's name changes *after* assignment and the order isn't refetched) is often acceptable for display purposes compared to the performance hit of multiple lookups or large initial data fetches.
        - It directly provides the data needed by the frontend in the most straightforward way.
        - While it denormalizes slightly, for a read-heavy display scenario of orders, this is a common and effective optimization.
        - The backend is better equipped to do efficient joins/lookups once rather than the frontend making multiple calls.

**4. Implementation Guidelines:**

    - **A. Backend - Schemas (`backend/src/schemas/fuel_order_schemas.py`):**
        - Modify the `FuelOrderSchema` (or relevant display schema for fuel orders) to include new fields:
            - `assigned_lst_fullName: fields.String(attribute="assigned_lst_user.name", allow_none=True)` (assuming `assigned_lst_user` is the relationship to the User model and `name` is the User's full name field after previous decision 6.1).
            - `assigned_lst_username: fields.String(attribute="assigned_lst_user.username", allow_none=True)`
            - `assigned_truck_number: fields.String(attribute="assigned_truck.truck_number", allow_none=True)` (assuming `assigned_truck` relationship and `truck_number` field).
        - Adjust `attribute` paths based on actual SQLAlchemy model relationships.
    - **B. Backend - Service (`backend/src/services/fuel_order_service.py`):**
        - In `get_fuel_orders` and `get_fuel_order_by_id` (and any other functions returning fuel orders), ensure that the SQLAlchemy queries appropriately join or select_inload the related `User` (for LST) and `FuelTruck` models so that the schema can access these nested attributes (e.g., `db.session.query(FuelOrder).options(joinedload(FuelOrder.assigned_lst_user), joinedload(FuelOrder.assigned_truck))`).
    - **C. Frontend - Service (`frontend/app/services/fuel-order-service.ts`):**
        - Update the `FuelOrderBackend` and `FuelOrderDisplay` interfaces to include the new fields: `assigned_lst_fullName?: string;`, `assigned_lst_username?: string;`, `assigned_truck_number?: string;`.
        - Simplify or remove the `getUserData` and `getFuelTruckData` calls from `transformToDisplay` if these names are now directly available on the `FuelOrderBackend` object. The transformation logic will directly map these new fields.
    - **D. Frontend - Caching:**
        - The `getCachedData` calls for `getAllUsers` and `getAllFuelTrucks` within the `fuel-order-service` might become redundant for the purpose of populating fuel order displays. Evaluate if they are still needed for other purposes or can be removed/refactored.

**5. Verification Checkpoint:**
    - After implementation, verify:
        - API responses for fuel orders now include `assigned_lst_fullName`, `assigned_lst_username`, and `assigned_truck_number`.
        - Frontend displays these names/numbers correctly without making separate calls for them within the fuel order display logic.
        - Performance of loading fuel order lists is acceptable, especially with cold caches.
        - Data is accurate.

---

🎨🎨🎨 EXITING CREATIVE PHASE - DECISIONS MADE 🎨🎨🎨

Summary of Decisions:
1.  **User Roles:** Standardize on `Array<{ id: number; name: string }>` for `User.roles` across frontend and backend.
2.  **Fuel Order Permissions:** Use existing specific permissions (`VIEW_ASSIGNED_ORDERS`, `UPDATE_OWN_ORDER_STATUS`) as baseline route decorators, with service layer handling more granular logic.
3.  **Username vs. Full Name:** Consistently use `username` (for login ID) and `fullName` (for displayable name) in API contracts and frontend/backend logic, mapping `fullName` to `User.name` in the database.
4.  **Frontend Lookups:** Optimize by including LST names/usernames and truck numbers directly in backend fuel order API responses.

These decisions are documented in `memory-bank/creative/creative-api-contract-refinements.md`.
The next step is to update `tasks.md` with these decisions and then transition to IMPLEMENT mode. 