## FBO LaunchPad Backend API Documentation

This document provides a comprehensive overview of the FBO LaunchPad backend API endpoints, designed to facilitate frontend integration and AI model understanding.

**Base URL:** `/api` (All routes listed below are prefixed with `/api`)

**Authentication:** Most endpoints require JWT-based authentication. Tokens should be sent in the `Authorization` header using the `Bearer` scheme (e.g., `Authorization: Bearer <your_jwt_token>`).

**Common Schemas:**
*   `ErrorResponseSchema`: Used for most error responses.
    ```json
    {
      "error": "Descriptive error message",
      "details": { /* Optional additional error details */ }
    }
    ```

---

### 1. Authentication Endpoints (`/auth`)

Blueprint: `auth_bp` (defined in `src/routes/auth_routes.py`)

**1.1. User Registration**
*   **Method & Path:** `POST /auth/register`
*   **Description:** Registers a new user. By default, new users are assigned the "Customer Service Representative" role.
*   **Permissions Required:** None (Public endpoint)
*   **Request Body Schema:** `RegisterRequestSchema`
    ```json
    {
      "email": "user@example.com", // required, string, email format
      "password": "password123",   // required, string, min 8 chars
      "name": "User Name",         // optional, string
      "username": "newuser"        // optional, string (defaults to email prefix if not provided)
    }
    ```
*   **Success Response (201 Created):** `RegisterResponseSchema`
    ```json
    {
      "message": "User registered successfully",
      "user": {
        "id": 1,
        "email": "user@example.com",
        "name": "User Name"
      }
    }
    ```
*   **Error Responses:**
    *   `400 Bad Request`: Invalid request data (e.g., missing fields, invalid email/password format). Schema: `ErrorResponseSchema`.
    *   `409 Conflict`: Email already registered. Schema: `ErrorResponseSchema`.
*   **Notes/Incompatibilities:**
    *   The backend `AuthService.register_user` assigns a default role of `UserRole.LST` (Line Service Technician). However, the `test_auth.py` test `test_register_success` asserts that the new user gets the "Customer Service Representative" role. This needs clarification and alignment.
    *   The `RegisterRequestSchema` includes `username` and `name` as optional. The backend service uses `name` for the `User.name` field and derives `username` from email if `username` is not provided. Ensure frontend sends `name` if a display name is intended, and `username` if a specific login username is desired.

**1.2. User Login**
*   **Method & Path:** `POST /auth/login`
*   **Description:** Authenticates a user and returns a JWT token.
*   **Permissions Required:** None (Public endpoint)
*   **Rate Limiting:** 5 attempts per 300 seconds (5 minutes) per IP.
*   **Request Body Schema:** `LoginRequestSchema`
    ```json
    {
      "email": "user@example.com",    // required, string, email format
      "password": "password123"     // required, string
    }
    ```
*   **Success Response (200 OK):** `LoginSuccessResponseSchema` (Note: The schema in `auth_schemas.py` defines `token` and `message`. The route actually returns `user` and `token`.)
    ```json
    // Actual backend response structure:
    {
      "user": { /* UserDetailSchema like structure */
        "id": 1,
        "username": "testuser",
        "email": "user@example.com",
        "name": "Test User",
        "roles": ["CSR"],
        "is_active": true,
        "created_at": "iso_timestamp"
      },
      "token": "your.jwt.access.token"
    }
    // LoginSuccessResponseSchema defines:
    // { "token": "string", "message": "string" }
    ```
*   **Error Responses:**
    *   `400 Bad Request`: Missing fields. Schema: `ErrorResponseSchema`.
    *   `401 Unauthorized`: Invalid credentials or inactive user. Schema: `ErrorResponseSchema`.
    *   `429 Too Many Requests`: Rate limit exceeded. Schema: `ErrorResponseSchema`.
*   **Notes/Incompatibilities:**
    *   **Response Mismatch:** The actual response from the backend login route includes a full `user` object and a `token`. The `LoginSuccessResponseSchema` only defines `token` and `message`.
        *   **Choice Needed:**
            1.  Update `LoginSuccessResponseSchema` to match the actual backend response (include `user` object).
            2.  Modify the backend route to return only `token` and `message` as per the schema.
            *   **Recommendation:** Option 1 (update schema) is generally more useful for the frontend to get user details upon login.
    *   The JWT token generated includes `username`, `roles`, and `is_active` in its `additional_claims`.

**1.3. Get Current User's Permissions**
*   **Method & Path:** `GET /auth/me/permissions`
*   **Description:** Retrieves the effective permissions for the currently authenticated user.
*   **Permissions Required:** Authenticated User (via `@token_required`)
*   **Request Body Schema:** None
*   **Success Response (200 OK):** `UserPermissionsResponseSchema`
    ```json
    {
      "message": "Effective permissions retrieved successfully.",
      "permissions": ["CREATE_ORDER", "VIEW_ALL_ORDERS", ...] // List of permission name strings
    }
    ```
*   **Error Responses:**
    *   `401 Unauthorized`: Invalid/missing token. Schema: `ErrorResponseSchema`.
    *   `500 Internal Server Error`: If there's an issue retrieving permissions. Schema: `ErrorResponseSchema`.
*   **Notes/Incompatibilities:** This is a key endpoint for frontend PBAC. The frontend `AuthContext` should call this after login and on app load if a token exists.

---

### 2. Fuel Order Endpoints (`/fuel-orders`)

Blueprint: `fuel_order_bp` (defined in `src/routes/fuel_order_routes.py`)

**2.1. Create Fuel Order**
*   **Method & Path:** `POST /fuel-orders/` (or `/fuel-orders`)
*   **Description:** Creates a new fuel order. Supports auto-assignment of LST and Fuel Truck if `assigned_lst_user_id` or `assigned_truck_id` is `-1`. Auto-creates `Aircraft` if `tail_number` is new.
*   **Permissions Required:** `CREATE_ORDER`
*   **Request Body Schema:** `FuelOrderCreateRequestSchema` (Note: The route performs its own initial validation before Marshmallow schema might be fully leveraged by the service).
    ```json
    {
      "tail_number": "N123AB",          // required, string
      "fuel_type": "Jet A",             // required, string
      "assigned_lst_user_id": 1,        // required, integer (-1 for auto-assign)
      "assigned_truck_id": 1,         // required, integer (-1 for auto-assign)
      "requested_amount": 100.50,       // required, float/decimal
      "location_on_ramp": "Hangar 1",   // required, string (route validation makes it seem required, schema might differ)
      "aircraft_type": "Unknown",       // optional, string (used if creating new aircraft)
      "customer_id": 1,                 // optional, integer
      "additive_requested": false,      // optional, boolean
      "csr_notes": "Urgent order"       // optional, string
    }
    ```
*   **Success Response (201 Created):** `FuelOrderCreateResponseSchema` (which nests `FuelOrderResponseSchema`)
    ```json
    {
      "message": "Fuel order created successfully",
      "fuel_order": { /* FuelOrderResponseSchema structure */ }
    }
    ```
*   **Error Responses:**
    *   `400 Bad Request`: Missing fields, validation errors (e.g., invalid LST/Truck ID, aircraft not found and not auto-creatable). Schema: `ErrorResponseSchema`.
    *   `500 Internal Server Error`: Database errors. Schema: `ErrorResponseSchema`.
*   **Notes/Incompatibilities:**
    *   **Aircraft Auto-Creation:** If `tail_number` is new, an `Aircraft` record is created with `aircraft_type` from the payload (or "Unknown") and `fuel_type` from the order. The frontend should be aware of this and potentially allow providing `aircraft_type` if the tail number is known to be new.
    *   **LST/Truck Auto-Assignment:** Sending `-1` for `assigned_lst_user_id` or `assigned_truck_id` triggers backend auto-assignment logic. Frontend needs UI to support this.
    *   **`location_on_ramp`:** The route's manual validation implies this is required, but the `FuelOrderBaseSchema` (used by `FuelOrderCreateRequestSchema`) marks it as optional. This should be consistent.
        *   **Choice Needed:** Decide if `location_on_ramp` is truly required for order creation. Update schema or route validation accordingly.
    *   **Frontend `CreateFuelOrderRequest` vs. Backend:**
        *   Frontend (`frontend/app/services/fuel-order-service.ts`): `aircraft_id: number`, `customer_id: number`, `assigned_lst_id: number`, `assigned_truck_id: number`, `quantity: string`.
        *   Backend expects `tail_number` (not `aircraft_id`), `customer_id`, `assigned_lst_user_id`, `assigned_truck_id`, `requested_amount` (numeric).
        *   **Action:** Frontend needs to send `tail_number` instead of `aircraft_id`. `quantity` should be sent as a number or a string that can be reliably converted to a number by the backend. Backend field names `assigned_lst_user_id` and `assigned_truck_id` should be used.

**2.2. List Fuel Orders**
*   **Method & Path:** `GET /fuel-orders/` (or `/fuel-orders`)
*   **Description:** Retrieves a paginated list of fuel orders. Filters by user's permissions (`VIEW_ALL_ORDERS` vs. assigned orders). Supports filtering by `status`, `page`, `per_page`.
*   **Permissions Required:** Authenticated User (specific data visibility depends on `VIEW_ALL_ORDERS` permission)
*   **Query Parameters:**
    *   `status` (string, e.g., "PENDING", "COMPLETED"): Filter by order status.
    *   `page` (integer, default: 1): Page number for pagination.
    *   `per_page` (integer, default: 20, max: 100): Items per page.
*   **Success Response (200 OK):** `FuelOrderListResponseSchema`
    ```json
    {
      "orders": [ /* Array of FuelOrderBriefResponseSchema objects */ ],
      "message": "Orders retrieved successfully",
      "pagination": { /* PaginationSchema object */
        "page": 1,
        "per_page": 20,
        "total": 100,
        "pages": 5,
        "has_next": true,
        "has_prev": false
      }
    }
    ```
*   **Error Responses:**
    *   `400 Bad Request`: Invalid filter values. Schema: `ErrorResponseSchema`.
    *   `500 Internal Server Error`. Schema: `ErrorResponseSchema`.
*   **Notes/Incompatibilities:**
    *   The frontend `FuelOrdersPage.tsx` has more filter options (Tail Number, Assigned LST, Assigned Truck, Date Range) than currently supported by the backend `FuelOrderService.get_fuel_orders`.
        *   **Action:** Backend service needs to be enhanced to support these additional filters.

**2.3. Get Fuel Order Details**
*   **Method & Path:** `GET /fuel-orders/<int:order_id>`
*   **Description:** Retrieves details of a specific fuel order. LSTs can only view orders assigned to them unless they have broader view permissions.
*   **Permissions Required:** Authenticated User (specific data visibility depends on assignment or `VIEW_ALL_ORDERS`)
*   **Path Parameters:**
    *   `order_id` (integer): The ID of the fuel order.
*   **Success Response (200 OK):** `FuelOrderResponseSchema` (full detail)
    ```json
    {
      "message": "Fuel order retrieved successfully.",
      "fuel_order": { /* FuelOrderResponseSchema structure */ }
    }
    ```
*   **Error Responses:**
    *   `403 Forbidden`: User not allowed to view this order. Schema: `ErrorResponseSchema`.
    *   `404 Not Found`: Order ID does not exist. Schema: `ErrorResponseSchema`.
    *   `500 Internal Server Error`. Schema: `ErrorResponseSchema`.

**2.4. Update Fuel Order Status**
*   **Method & Path:** `PATCH /fuel-orders/<int:order_id>/status`
*   **Description:** Updates the status of a fuel order. Primarily intended for LST workflow (Dispatched -> Acknowledged -> En Route -> Fueling).
*   **Permissions Required:** User must be the assigned LST for the order OR have broader order management permissions (e.g., `UPDATE_OWN_ORDER_STATUS` or a more general `MANAGE_ORDERS`). The current backend service logic restricts this to the assigned LST or Admin/CSR (who are then restricted to not use this for LST workflow steps).
*   **Path Parameters:**
    *   `order_id` (integer): The ID of the fuel order.
*   **Request Body Schema:** `FuelOrderStatusUpdateRequestSchema`
    ```json
    {
      "status": "ACKNOWLEDGED", // required, string, one of FuelOrderStatus enum members (case-insensitive on input, converted to uppercase)
      "assigned_truck_id": 1    // required, integer (This seems odd to be required for every status update. Re-evaluate)
    }
    ```
*   **Success Response (200 OK):** `FuelOrderUpdateResponseSchema` (which nests `FuelOrderResponseSchema`)
    ```json
    {
      "id": 1,
      "status": "ACKNOWLEDGED",
      // ... other fields from FuelOrderResponseSchema
      "updated_at": "iso_timestamp"
    }
    ```
*   **Error Responses:**
    *   `400 Bad Request`: Invalid status value or transition. Schema: `ErrorResponseSchema`.
    *   `403 Forbidden`: User not authorized to update this order's status. Schema: `ErrorResponseSchema`.
    *   `404 Not Found`: Order ID does not exist. Schema: `ErrorResponseSchema`.
*   **Notes/Incompatibilities:**
    *   **`assigned_truck_id` Requirement:** The route's direct validation requires `assigned_truck_id` in the payload for *any* status update. This is likely an oversight and should only be required if the status update implies a truck assignment/change.
        *   **Choice Needed:** Modify backend to make `assigned_truck_id` optional for status updates where it's not relevant, or ensure frontend always sends it (even if unchanged).
        *   **Recommendation:** Make it optional in the backend.
    *   The backend service `FuelOrderService.update_order_status` has logic restricting CSR/Admin from making LST-specific status transitions. This seems correct.

**2.5. Submit Fuel Data (Complete Order)**
*   **Method & Path:** `PUT /fuel-orders/<int:order_id>/submit-data`
*   **Description:** Allows the assigned LST to submit final meter readings and notes, transitioning the order to "COMPLETED".
*   **Permissions Required:** `COMPLETE_ORDER` (and user must be the assigned LST).
*   **Path Parameters:**
    *   `order_id` (integer): The ID of the fuel order.
*   **Request Body Schema:** `FuelOrderCompleteRequestSchema`
    ```json
    {
      "start_meter_reading": 1000.50, // required, float/decimal
      "end_meter_reading": 1250.75,   // required, float/decimal
      "lst_notes": "Fueling complete."  // optional, string
    }
    ```
*   **Success Response (200 OK):** `FuelOrderUpdateResponseSchema` (nests `FuelOrderResponseSchema`)
    ```json
    {
      "message": "Fuel data submitted successfully",
      "fuel_order": { /* FuelOrderResponseSchema structure, status will be COMPLETED */ }
    }
    ```
*   **Error Responses:**
    *   `400 Bad Request`: Invalid meter readings, order not in 'FUELING' status. Schema: `ErrorResponseSchema`.
    *   `403 Forbidden`: User not assigned LST or lacks permission. Schema: `ErrorResponseSchema`.
    *   `404 Not Found`: Order ID does not exist. Schema: `ErrorResponseSchema`.
    *   `422 Unprocessable Entity`: Order not in correct status for completion. Schema: `ErrorResponseSchema`.

**2.6. Review Fuel Order**
*   **Method & Path:** `PATCH /fuel-orders/<int:order_id>/review`
*   **Description:** Allows a CSR/Admin to mark a "COMPLETED" order as "REVIEWED".
*   **Permissions Required:** `REVIEW_ORDERS`
*   **Path Parameters:**
    *   `order_id` (integer): The ID of the fuel order.
*   **Request Body Schema:** None explicitly defined for this route, but the service method `FuelOrderService.review_fuel_order` doesn't expect a body.
*   **Success Response (200 OK):** `FuelOrderUpdateResponseSchema` (nests `FuelOrderResponseSchema`)
    ```json
    {
      "message": "Fuel order marked as reviewed.",
      "fuel_order": { /* Relevant fields from FuelOrderResponseSchema, status will be REVIEWED */ }
    }
    ```
*   **Error Responses:**
    *   `400 Bad Request`: Order not in 'COMPLETED' status. Schema: `ErrorResponseSchema`.
    *   `404 Not Found`: Order ID does not exist. Schema: `ErrorResponseSchema`.

**2.7. Export Fuel Orders to CSV**
*   **Method & Path:** `GET /fuel-orders/export`
*   **Description:** Exports fuel orders to a CSV file. Defaults to "REVIEWED" orders but can be filtered by `status`.
*   **Permissions Required:** `EXPORT_ORDERS_CSV`
*   **Query Parameters:**
    *   `status` (string, e.g., "COMPLETED", "REVIEWED"): Filter orders by status for export.
    *   `date_from` (string, YYYY-MM-DD, TODO): Filter orders from this date.
    *   `date_to` (string, YYYY-MM-DD, TODO): Filter orders up to this date.
*   **Success Response (200 OK):**
    *   **Content-Type:** `text/csv`
    *   **Content-Disposition:** `attachment; filename=fuel_orders_export_YYYYMMDD_HHMMSS.csv`
    *   **Body:** CSV formatted data.
*   **Error Responses:**
    *   `400 Bad Request`: Invalid filter value. Schema: `ErrorResponseSchema`.
    *   `403 Forbidden`: User lacks permission. Schema: `ErrorResponseSchema`.
*   **Notes/Incompatibilities:**
    *   Date filtering is marked as TODO in the backend service.

**2.8. Get Fuel Order Status Counts**
*   **Method & Path:** `GET /fuel-orders/stats/status-counts`
*   **Description:** Retrieves counts of fuel orders grouped by status (pending, in_progress, completed).
*   **Permissions Required:** `VIEW_ORDER_STATS`
*   **Request Body Schema:** None
*   **Success Response (200 OK):** `OrderStatusCountsResponseSchema`
    ```json
    {
      "message": "Status counts retrieved successfully.",
      "counts": { // OrderStatusCountsSchema
        "pending": 5,
        "in_progress": 2,
        "completed": 10
      }
    }
    ```
*   **Error Responses:**
    *   `500 Internal Server Error`. Schema: `ErrorResponseSchema`.

---

### 3. Fuel Truck Endpoints (`/fuel-trucks`)

Blueprint: `truck_bp` (defined in `src/routes/fuel_truck_routes.py`)

**3.1. List Fuel Trucks**
*   **Method & Path:** `GET /fuel-trucks/` (or `/fuel-trucks`)
*   **Description:** Retrieves a list of fuel trucks. Supports filtering by `is_active` status.
*   **Permissions Required:** `VIEW_TRUCKS`
*   **Query Parameters:**
    *   `is_active` (string, "true" or "false"): Filter by active status.
*   **Success Response (200 OK):** `FuelTruckListResponseSchema`
    ```json
    {
      "message": "Fuel trucks retrieved successfully",
      "fuel_trucks": [ /* Array of FuelTruckSchema objects */ ]
    }
    ```
*   **Error Responses:**
    *   `400 Bad Request`: Invalid filter value. Schema: `ErrorResponseSchema`.
    *   `500 Internal Server Error`. Schema: `ErrorResponseSchema`.

**3.2. Create Fuel Truck**
*   **Method & Path:** `POST /fuel-trucks/`
*   **Description:** Creates a new fuel truck.
*   **Permissions Required:** `MANAGE_TRUCKS`
*   **Request Body Schema:** `FuelTruckCreateRequestSchema`
    ```json
    {
      "truck_number": "FT001",         // required, string
      "fuel_type": "Jet A",            // required, string
      "capacity": 5000.00,             // required, decimal
      "current_meter_reading": 100.00  // optional, decimal, default: 0
    }
    ```
*   **Success Response (201 Created):** `FuelTruckCreateResponseSchema` (nests `FuelTruckSchema`)
    ```json
    {
      "message": "Fuel truck created successfully",
      "fuel_truck": { /* FuelTruckSchema object */ }
    }
    ```
*   **Error Responses:**
    *   `400 Bad Request`: Validation error or duplicate truck number. Schema: `ErrorResponseSchema`.
    *   `500 Internal Server Error`. Schema: `ErrorResponseSchema`.

**3.3. Get Fuel Truck Details**
*   **Method & Path:** `GET /fuel-trucks/<int:truck_id>`
*   **Description:** Retrieves details of a specific fuel truck.
*   **Permissions Required:** `VIEW_TRUCKS`
*   **Path Parameters:**
    *   `truck_id` (integer): The ID of the fuel truck.
*   **Success Response (200 OK):** `FuelTruckSchema` (as part of a message object)
    ```json
    {
      "message": "Fuel truck retrieved successfully",
      "fuel_truck": { /* FuelTruckSchema object */ }
    }
    ```
*   **Error Responses:**
    *   `404 Not Found`: Truck ID does not exist. Schema: `ErrorResponseSchema`.
    *   `500 Internal Server Error`. Schema: `ErrorResponseSchema`.

**3.4. Update Fuel Truck**
*   **Method & Path:** `PATCH /fuel-trucks/<int:truck_id>`
*   **Description:** Updates details of an existing fuel truck.
*   **Permissions Required:** `MANAGE_TRUCKS`
*   **Path Parameters:**
    *   `truck_id` (integer): The ID of the fuel truck.
*   **Request Body Schema:** `FuelTruckCreateRequestSchema` (used for simplicity, but fields are partial/optional for PATCH). The service layer uses `FuelTruckUpdateRequestSchema` which is more appropriate.
    ```json
    // Example partial update
    {
      "current_meter_reading": 150.00,
      "is_active": false
    }
    ```
*   **Success Response (200 OK):** `FuelTruckSchema` (as part of a message object)
    ```json
    {
      "message": "Fuel truck updated successfully",
      "fuel_truck": { /* FuelTruckSchema object */ }
    }
    ```
*   **Error Responses:**
    *   `400 Bad Request`: Validation error or duplicate truck number if `truck_number` is changed. Schema: `ErrorResponseSchema`.
    *   `404 Not Found`: Truck ID does not exist. Schema: `ErrorResponseSchema`.
    *   `500 Internal Server Error`. Schema: `ErrorResponseSchema`.
*   **Notes/Incompatibilities:**
    *   The route uses `FuelTruckCreateRequestSchema` for the request body in its OpenAPI spec, but the service layer correctly handles partial updates. The schema should ideally be `FuelTruckUpdateRequestSchema` for PATCH.

**3.5. Delete Fuel Truck**
*   **Method & Path:** `DELETE /fuel-trucks/<int:truck_id>`
*   **Description:** Deletes a fuel truck.
*   **Permissions Required:** `MANAGE_TRUCKS`
*   **Path Parameters:**
    *   `truck_id` (integer): The ID of the fuel truck.
*   **Success Response (200 OK):**
    ```json
    {
      "message": "Fuel truck deleted successfully"
    }
    ```
*   **Error Responses:**
    *   `404 Not Found`: Truck ID does not exist. Schema: `ErrorResponseSchema`.
    *   `500 Internal Server Error`. Schema: `ErrorResponseSchema`.
*   **Notes/Incompatibilities:**
    *   The backend service does not currently check if the truck is assigned to any active fuel orders before deletion. This could lead to orphaned records or operational issues.
        *   **Action:** Backend should add a check and return a 409 Conflict if the truck is in use.

---

### 4. User Endpoints (`/users`) - Non-Admin

Blueprint: `user_bp` (defined in `src/routes/user_routes.py`)
These routes are for general user management, potentially by users who have `MANAGE_USERS` but are not full system administrators.

**4.1. List Users (Non-Admin)**
*   **Method & Path:** `GET /users/` (or `/users`)
*   **Description:** Retrieves a list of users. Supports filtering by `role` (string) and `is_active` (string "true"/"false").
*   **Permissions Required:** `VIEW_USERS`
*   **Query Parameters:**
    *   `role` (string, e.g., "ADMIN", "CSR", "LST"): Filter by user role (case-insensitive).
    *   `is_active` (string, "true" or "false"): Filter by active status.
*   **Success Response (200 OK):** `UserListResponseSchema` (nests `UserBriefSchema`)
    ```json
    {
      "message": "Users retrieved successfully",
      "users": [ /* Array of UserBriefSchema objects */ ]
    }
    ```
*   **Error Responses:**
    *   `400 Bad Request`: Invalid filter value. Schema: `ErrorResponseSchema`.
    *   `500 Internal Server Error`. Schema: `ErrorResponseSchema`.

**4.2. Create User (Non-Admin)**
*   **Method & Path:** `POST /users/` (or `/users`)
*   **Description:** Creates a new user.
*   **Permissions Required:** `MANAGE_USERS`
*   **Request Body Schema:** `UserCreateRequestSchema`
    ```json
    {
      "email": "new.user@example.com", // required
      "password": "securePassword123",  // required, min 6 chars
      "role_ids": [1, 2],              // required, list of role IDs
      "name": "New User FullName",     // optional (username derived from email if not provided)
      "is_active": true                // optional, boolean (defaults to true)
    }
    ```
*   **Success Response (201 Created):** `UserResponseSchema` (This is what the route returns, though the OpenAPI spec might point to a different one. `UserResponseSchema` is a general user representation.)
    ```json
    {
      "message": "User created successfully",
      "user": { /* User object matching UserResponseSchema structure */ }
    }
    ```
*   **Error Responses:**
    *   `400 Bad Request`: Validation error (e.g., missing fields, invalid role_ids). Schema: `ErrorResponseSchema`.
    *   `409 Conflict`: Email already exists. Schema: `ErrorResponseSchema`.
    *   `500 Internal Server Error`. Schema: `ErrorResponseSchema`.

**4.3. Get User Details (Non-Admin)**
*   **Method & Path:** `GET /users/<int:user_id>`
*   **Description:** Retrieves details of a specific user.
*   **Permissions Required:** `VIEW_USERS`
*   **Path Parameters:**
    *   `user_id` (integer): The ID of the user.
*   **Success Response (200 OK):** `UserResponseSchema` (as part of a message object)
    ```json
    {
      "message": "User retrieved successfully",
      "user": { /* UserResponseSchema object */ }
    }
    ```
*   **Error Responses:**
    *   `404 Not Found`: User ID does not exist. Schema: `ErrorResponseSchema`.
    *   `500 Internal Server Error`. Schema: `ErrorResponseSchema`.

**4.4. Update User (Non-Admin)**
*   **Method & Path:** `PATCH /users/<int:user_id>`
*   **Description:** Updates details of an existing user.
*   **Permissions Required:** `MANAGE_USERS`
*   **Path Parameters:**
    *   `user_id` (integer): The ID of the user.
*   **Request Body Schema:** `UserUpdateRequestSchema`
    ```json
    {
      "name": "Updated User Name", // optional
      "email": "updated.user@example.com", // optional
      "role_ids": [3],             // optional, list of role IDs
      "is_active": false,          // optional
      "password": "newPassword456" // optional, min 6 chars
    }
    ```
*   **Success Response (200 OK):** `UserResponseSchema` (as part of a message object)
    ```json
    {
      "message": "User updated successfully",
      "user": { /* UserResponseSchema object */ }
    }
    ```
*   **Error Responses:**
    *   `400 Bad Request`: Validation error. Schema: `ErrorResponseSchema`.
    *   `403 Forbidden`: Attempting to self-deactivate or remove own `MANAGE_USERS` permission. Schema: `ErrorResponseSchema`.
    *   `404 Not Found`: User ID does not exist. Schema: `ErrorResponseSchema`.
    *   `409 Conflict`: Email already registered to another user. Schema: `ErrorResponseSchema`.
    *   `500 Internal Server Error`. Schema: `ErrorResponseSchema`.

**4.5. Delete User (Non-Admin - Soft Deletes/Deactivates)**
*   **Method & Path:** `DELETE /users/<int:user_id>`
*   **Description:** Deactivates a user (soft delete by setting `is_active = false`).
*   **Permissions Required:** `MANAGE_USERS`
*   **Path Parameters:**
    *   `user_id` (integer): The ID of the user.
*   **Success Response (200 OK):**
    ```json
    {
      "message": "User deactivated successfully"
    }
    ```
*   **Error Responses:**
    *   `403 Forbidden`: Attempting to self-deactivate. Schema: `ErrorResponseSchema`.
    *   `404 Not Found`: User ID does not exist. Schema: `ErrorResponseSchema`.
    *   `500 Internal Server Error`. Schema: `ErrorResponseSchema`.

---

### 5. Aircraft Endpoints (`/aircraft`)

Blueprint: `aircraft_bp` (defined in `src/routes/aircraft_routes.py`)

**5.1. List Aircraft**
*   **Method & Path:** `GET /aircraft/` (or `/aircraft`)
*   **Description:** Retrieves a list of aircraft. Supports filtering by `customer_id`.
*   **Permissions Required:** `VIEW_AIRCRAFT`
*   **Query Parameters:**
    *   `customer_id` (integer, optional): Filter aircraft by associated customer ID.
*   **Success Response (200 OK):** `AircraftListSchema`
    ```json
    {
      "message": "Aircraft list retrieved successfully",
      "aircraft": [ /* Array of AircraftResponseSchema objects */ ]
    }
    ```
*   **Error Responses:**
    *   `500 Internal Server Error`. Schema: `ErrorResponseSchema`.
*   **Notes/Incompatibilities:**
    *   The backend `Aircraft` model does **not** have a `customer_id` field. The `AircraftService.get_all_aircraft` method attempts to filter by `customer_id` if provided, which will not work as intended with the current model.
        *   **Choice Needed:**
            1.  Add `customer_id` (FK to `Customer`) to the `Aircraft` model and update service logic.
            2.  Remove `customer_id` filtering from this endpoint and its documentation.
            *   **Recommendation:** Option 1 if associating aircraft with a primary customer is a requirement.

**5.2. Create Aircraft**
*   **Method & Path:** `POST /aircraft/` (or `/aircraft`)
*   **Description:** Creates a new aircraft record.
*   **Permissions Required:** `MANAGE_AIRCRAFT`
*   **Request Body Schema:** `AircraftCreateSchema`
    ```json
    {
      "tail_number": "N789XY",    // required, string
      "aircraft_type": "Jet",     // optional, string (but backend service makes it required)
      "customer_id": 1            // optional, integer, allow_none=True (but backend model doesn't have this field)
    }
    ```
*   **Success Response (201 Created):** `AircraftResponseSchema` (as part of a message object)
    ```json
    {
      "message": "Aircraft created successfully",
      "aircraft": { /* AircraftResponseSchema object */ }
    }
    ```
*   **Error Responses:**
    *   `400 Bad Request`: Missing required fields (backend service requires `tail_number`, `aircraft_type`, `fuel_type`). Schema: `ErrorResponseSchema`.
    *   `409 Conflict`: Aircraft with this tail number already exists. Schema: `ErrorResponseSchema`.
    *   `500 Internal Server Error`. Schema: `ErrorResponseSchema`.
*   **Notes/Incompatibilities:**
    *   **Schema vs. Service Mismatch:** `AircraftCreateSchema` marks `aircraft_type` and `customer_id` as optional. However, `AircraftService.create_aircraft` requires `tail_number`, `aircraft_type`, and `fuel_type`. `customer_id` is ignored by the service as it's not in the model. `fuel_type` is missing from `AircraftCreateSchema`.
        *   **Action:**
            1.  Add `fuel_type` (required) to `AircraftCreateSchema`.
            2.  Make `aircraft_type` required in `AircraftCreateSchema` to match service.
            3.  Decide on `customer_id` handling (see 5.1 Notes).
    *   The frontend `AircraftLookup` component shows fields like `model`, `owner`, `homeBase`, `mtow`, `fuelCapacity`, `lastFaaSyncAt`, `previousOwner`, `ownershipChangeDate` which are **not** in the backend `Aircraft` model or its schemas. This is a major discrepancy.
        *   **Choice Needed:**
            1.  Significantly expand the backend `Aircraft` model and associated services/schemas to include these fields.
            2.  Simplify the frontend to only work with `tail_number`, `aircraft_type`, `fuel_type`.
            *   **Recommendation:** Option 1 is likely necessary for a functional system. The current backend `Aircraft` model is too minimal.

**5.3. Get Aircraft Details**
*   **Method & Path:** `GET /aircraft/<string:tail_number>`
*   **Description:** Retrieves details of a specific aircraft by its tail number.
*   **Permissions Required:** `VIEW_AIRCRAFT`
*   **Path Parameters:**
    *   `tail_number` (string): The tail number of the aircraft.
*   **Success Response (200 OK):** `AircraftResponseSchema` (as part of a message object)
    ```json
    {
      "message": "Aircraft retrieved successfully",
      "aircraft": { /* AircraftResponseSchema object */ }
    }
    ```
*   **Error Responses:**
    *   `404 Not Found`: Aircraft with this tail number not found. Schema: `ErrorResponseSchema`.
    *   `500 Internal Server Error`. Schema: `ErrorResponseSchema`.

**5.4. Update Aircraft**
*   **Method & Path:** `PATCH /aircraft/<string:tail_number>`
*   **Description:** Updates details of an existing aircraft.
*   **Permissions Required:** `MANAGE_AIRCRAFT`
*   **Path Parameters:**
    *   `tail_number` (string): The tail number of the aircraft.
*   **Request Body Schema:** `AircraftUpdateSchema` (partial updates)
    ```json
    {
      "aircraft_type": "Turboprop", // optional
      "customer_id": 2            // optional, allow_none=True (but backend model doesn't have this field)
    }
    ```
*   **Success Response (200 OK):** `AircraftResponseSchema` (as part of a message object)
    ```json
    {
      "message": "Aircraft updated successfully",
      "aircraft": { /* AircraftResponseSchema object */ }
    }
    ```
*   **Error Responses:**
    *   `400 Bad Request`: Validation error. Schema: `ErrorResponseSchema`.
    *   `404 Not Found`: Aircraft not found. Schema: `ErrorResponseSchema`.
    *   `500 Internal Server Error`. Schema: `ErrorResponseSchema`.
*   **Notes/Incompatibilities:**
    *   `AircraftUpdateSchema` allows updating `customer_id`, but the backend `Aircraft` model doesn't have this field. The `AircraftService.update_aircraft` *does* attempt to set `aircraft.customer_id`. This will cause an error if the model isn't updated.
        *   **Action:** Align model, schema, and service for `customer_id`.

**5.5. Delete Aircraft**
*   **Method & Path:** `DELETE /aircraft/<string:tail_number>`
*   **Description:** Deletes an aircraft record.
*   **Permissions Required:** `MANAGE_AIRCRAFT`
*   **Path Parameters:**
    *   `tail_number` (string): The tail number of the aircraft.
*   **Success Response (200 OK):**
    ```json
    {
      "message": "Aircraft deleted successfully"
    }
    ```
*   **Error Responses:**
    *   `404 Not Found`: Aircraft not found. Schema: `ErrorResponseSchema`.
    *   `500 Internal Server Error`. Schema: `ErrorResponseSchema`.
*   **Notes/Incompatibilities:**
    *   The backend service does not check if the aircraft is referenced by any fuel orders before deletion. This could lead to FK constraint violations or orphaned records.
        *   **Action:** Backend should add a check and return 409 Conflict if referenced.

---

### 6. Customer Endpoints (`/customers`)

Blueprint: `customer_bp` (defined in `src/routes/customer_routes.py`)

**6.1. List Customers**
*   **Method & Path:** `GET /customers/` (or `/customers`)
*   **Description:** Retrieves a list of customers.
*   **Permissions Required:** `VIEW_CUSTOMERS`
*   **Query Parameters:** None currently supported by the service.
*   **Success Response (200 OK):** `CustomerListSchema`
    ```json
    {
      "message": "Customer list retrieved successfully",
      "customers": [ /* Array of CustomerResponseSchema objects */ ]
    }
    ```
*   **Error Responses:**
    *   `500 Internal Server Error`. Schema: `ErrorResponseSchema`.

**6.2. Create Customer**
*   **Method & Path:** `POST /customers/` (or `/customers`)
*   **Description:** Creates a new customer.
*   **Permissions Required:** `MANAGE_CUSTOMERS`
*   **Request Body Schema:** `CustomerCreateSchema`
    ```json
    {
      "name": "New Customer Inc." // required, string
      // Backend Customer model also has email (required) and phone (optional).
      // CustomerCreateSchema only has 'name'.
    }
    ```
*   **Success Response (201 Created):** `CustomerResponseSchema` (as part of a message object)
    ```json
    {
      "message": "Customer created successfully",
      "customer": { /* CustomerResponseSchema object */ }
    }
    ```
*   **Error Responses:**
    *   `400 Bad Request`: Missing required fields (backend service requires `name` and `email`). Schema: `ErrorResponseSchema`.
    *   `409 Conflict`: Customer with this name or email already exists. Schema: `ErrorResponseSchema`.
    *   `500 Internal Server Error`. Schema: `ErrorResponseSchema`.
*   **Notes/Incompatibilities:**
    *   **Schema vs. Model/Service Mismatch:** `CustomerCreateSchema` only defines `name`. The backend `Customer` model requires `name` and `email`. `CustomerService.create_customer` requires `name` and checks for existing `name`. It does not currently handle `email` or `phone` from the payload.
        *   **Action:**
            1.  Update `CustomerCreateSchema` to include `email` (required) and `phone` (optional).
            2.  Update `CustomerService.create_customer` to accept and process `email` and `phone`.
            3.  Ensure frontend sends these fields.

**6.3. Get Customer Details**
*   **Method & Path:** `GET /customers/<int:customer_id>`
*   **Description:** Retrieves details of a specific customer.
*   **Permissions Required:** `VIEW_CUSTOMERS`
*   **Path Parameters:**
    *   `customer_id` (integer): The ID of the customer.
*   **Success Response (200 OK):** `CustomerResponseSchema` (as part of a message object)
    ```json
    {
      "message": "Customer retrieved successfully",
      "customer": { /* CustomerResponseSchema object */ }
    }
    ```
*   **Error Responses:**
    *   `404 Not Found`: Customer not found. Schema: `ErrorResponseSchema`.
    *   `500 Internal Server Error`. Schema: `ErrorResponseSchema`.

**6.4. Update Customer**
*   **Method & Path:** `PATCH /customers/<int:customer_id>`
*   **Description:** Updates details of an existing customer.
*   **Permissions Required:** `MANAGE_CUSTOMERS`
*   **Path Parameters:**
    *   `customer_id` (integer): The ID of the customer.
*   **Request Body Schema:** `CustomerUpdateSchema` (partial updates)
    ```json
    {
      "name": "Updated Customer Name" // optional
      // Backend Customer model also has email and phone.
      // CustomerUpdateSchema only has 'name'.
    }
    ```
*   **Success Response (200 OK):** `CustomerResponseSchema` (as part of a message object)
    ```json
    {
      "message": "Customer updated successfully",
      "customer": { /* CustomerResponseSchema object */ }
    }
    ```
*   **Error Responses:**
    *   `400 Bad Request`: Validation error (e.g., if name becomes duplicate). Schema: `ErrorResponseSchema`.
    *   `404 Not Found`: Customer not found. Schema: `ErrorResponseSchema`.
    *   `500 Internal Server Error`. Schema: `ErrorResponseSchema`.
*   **Notes/Incompatibilities:**
    *   **Schema vs. Model/Service Mismatch:** `CustomerUpdateSchema` only allows updating `name`. The backend `CustomerService.update_customer` only handles `name`. If `email` or `phone` need to be updatable, the schema and service must be extended.
        *   **Action:** Decide if `email` and `phone` should be updatable. If so, update schema and service.

**6.5. Delete Customer**
*   **Method & Path:** `DELETE /customers/<int:customer_id>`
*   **Description:** Deletes a customer record.
*   **Permissions Required:** `MANAGE_CUSTOMERS`
*   **Path Parameters:**
    *   `customer_id` (integer): The ID of the customer.
*   **Success Response (200 OK):**
    ```json
    {
      "message": "Customer deleted successfully"
    }
    ```
*   **Error Responses:**
    *   `404 Not Found`: Customer not found. Schema: `ErrorResponseSchema`.
    *   `500 Internal Server Error`. Schema: `ErrorResponseSchema`.
*   **Notes/Incompatibilities:**
    *   The backend service does not check if the customer is referenced by any fuel orders before deletion.
        *   **Action:** Backend should add a check and return 409 Conflict if referenced.

---

### 7. Admin Endpoints (`/admin`)

Blueprint: `admin_bp` (defined in `src/routes/admin/routes.py`)

**7.1. Admin - User Management**

These routes are prefixed with `/api/admin`.

**7.1.1. List Users (Admin)**
*   **Method & Path:** `GET /admin/users/` (or `/admin/users`)
*   **Description:** Retrieves a list of users. Supports filtering by `role_ids` (list of role IDs) and `is_active` (boolean).
*   **Permissions Required:** `MANAGE_USERS` (Note: `VIEW_USERS` might be more appropriate for a GET list, but `MANAGE_USERS` is currently used).
*   **Query Parameters:**
    *   `role_ids` (list of integers, e.g., `role_ids=1&role_ids=2`): Filter by user role IDs.
    *   `is_active` (string "true" or "false"): Filter by active status.
*   **Success Response (200 OK):** `UserListResponseSchema` (nests `UserDetailSchema` - this is different from the non-admin `/api/users` which uses `UserBriefSchema`).
    ```json
    {
      "users": [ /* Array of UserDetailSchema objects */ ],
      "message": "Users retrieved successfully"
    }
    ```
*   **Error Responses:**
    *   `400 Bad Request`: Invalid filter values. Schema: `ErrorResponseSchema`.
    *   `500 Internal Server Error`. Schema: `ErrorResponseSchema`.
*   **Notes/Incompatibilities:**
    *   Uses `UserDetailSchema` for list items, providing more detail than the non-admin `/api/users` list.
    *   The permission `MANAGE_USERS` for a GET list is stricter than `VIEW_USERS`. Consider if `VIEW_USERS` is sufficient if the user only needs to see the list.

**7.1.2. Create User (Admin)**
*   **Method & Path:** `POST /admin/users/`
*   **Description:** Creates a new user.
*   **Permissions Required:** `MANAGE_USERS`
*   **Request Body Schema:** `UserCreateRequestSchema` (from `src/schemas/user_schemas.py`)
    ```json
    {
      "email": "admin.created@example.com", // required
      "password": "securePassword123",      // required, min 6 chars
      "role_ids": [1],                     // required, list of role IDs
      "name": "Admin Created User",        // optional (username derived from email if not provided)
      "is_active": true                    // optional, boolean (defaults to true)
    }
    ```
*   **Success Response (201 Created):** `UserDetailSchema` (as part of a message object)
    ```json
    {
      "user": { /* UserDetailSchema object */ },
      "message": "User created successfully"
    }
    ```
*   **Error Responses:**
    *   `400 Bad Request`: Validation error. Schema: `ErrorResponseSchema`.
    *   `409 Conflict`: Email already exists. Schema: `ErrorResponseSchema`.
    *   `500 Internal Server Error`. Schema: `ErrorResponseSchema`.

**7.1.3. Update User (Admin)**
*   **Method & Path:** `PATCH /admin/users/<int:user_id>`
*   **Description:** Updates an existing user's details.
*   **Permissions Required:** `MANAGE_USERS`
*   **Path Parameters:**
    *   `user_id` (integer): The ID of the user to update.
*   **Request Body Schema:** `UserUpdateRequestSchema`
    ```json
    {
      "name": "Updated Admin User",    // optional
      "email": "updated.admin@example.com", // optional
      "role_ids": [1, 2],              // optional
      "is_active": false,              // optional
      "password": "newStrongPassword"  // optional
    }
    ```
*   **Success Response (200 OK):** `UserDetailSchema` (as part of a message object)
    ```json
    {
      "user": { /* UserDetailSchema object */ },
      "message": "User updated successfully"
    }
    ```
*   **Error Responses:**
    *   `400 Bad Request`: Validation error, invalid role ID. Schema: `ErrorResponseSchema`.
    *   `403 Forbidden`: Attempting to self-deactivate or remove own `MANAGE_USERS` permission. Schema: `ErrorResponseSchema`.
    *   `404 Not Found`: User not found. Schema: `ErrorResponseSchema`.
    *   `409 Conflict`: Email exists for another user. Schema: `ErrorResponseSchema`.
    *   `500 Internal Server Error`. Schema: `ErrorResponseSchema`.

**7.1.4. Delete User (Admin - Soft Deletes/Deactivates)**
*   **Method & Path:** `DELETE /admin/users/<int:user_id>`
*   **Description:** Deactivates a user (sets `is_active = false`).
*   **Permissions Required:** `MANAGE_USERS`
*   **Path Parameters:**
    *   `user_id` (integer): The ID of the user to deactivate.
*   **Success Response (200 OK):**
    ```json
    {
      "message": "User deactivated successfully"
    }
    ```
*   **Error Responses:**
    *   `403 Forbidden`: Attempting to self-deactivate. Schema: `ErrorResponseSchema`.
    *   `404 Not Found`: User not found. Schema: `ErrorResponseSchema`.
    *   `500 Internal Server Error`. Schema: `ErrorResponseSchema`.

**7.1.5. Get User Details (Admin)**
*   **Method & Path:** `GET /admin/users/<int:user_id>`
*   **Current Status:** This route is commented out in `src/routes/admin/user_admin_routes.py`.
*   **Description (Intended):** Retrieves details for a specific user.
*   **Permissions Required (Intended):** `MANAGE_USERS` (or `VIEW_USERS`)
*   **Action:** Uncomment and verify this route if detailed admin view of a single user is needed. The non-admin `GET /api/users/<int:user_id>` already provides this with `VIEW_USERS` permission.

**7.2. Admin - Role Management**

Blueprint: `admin_bp` (defined in `src/routes/admin/role_admin_routes.py`)

**7.2.1. List Roles**
*   **Method & Path:** `GET /admin/roles/` (or `/admin/roles`)
*   **Description:** Retrieves a list of all roles.
*   **Permissions Required:** `MANAGE_ROLES`
*   **Success Response (200 OK):** `RoleListResponseSchema` (nests `RoleSchema`)
    ```json
    {
      "roles": [ /* Array of RoleSchema objects */ ]
    }
    ```
*   **Error Responses:**
    *   `500 Internal Server Error`. Schema: `ErrorResponseSchema`.

**7.2.2. Create Role**
*   **Method & Path:** `POST /admin/roles/` (or `/admin/roles`)
*   **Description:** Creates a new role.
*   **Permissions Required:** `MANAGE_ROLES`
*   **Request Body Schema:** `RoleCreateRequestSchema`
    ```json
    {
      "name": "New Role Name",         // required, string
      "description": "Description of new role" // optional, string
    }
    ```
*   **Success Response (201 Created):** `RoleSchema`
    ```json
    { /* RoleSchema object */ }
    ```
*   **Error Responses:**
    *   `400 Bad Request`: Missing name. Schema: `ErrorResponseSchema`.
    *   `409 Conflict`: Role name already exists. Schema: `ErrorResponseSchema`.
    *   `500 Internal Server Error`. Schema: `ErrorResponseSchema`.

**7.2.3. Get Role Details**
*   **Method & Path:** `GET /admin/roles/<int:role_id>`
*   **Description:** Retrieves details of a specific role, including its permissions.
*   **Permissions Required:** `MANAGE_ROLES`
*   **Path Parameters:**
    *   `role_id` (integer): The ID of the role.
*   **Success Response (200 OK):** `RoleSchema` (The `RoleSchema` should ideally include its permissions. The backend service `get_role_by_id` fetches the role, and the `RoleSchema` should serialize its `permissions` relationship).
    ```json
    { /* RoleSchema object, potentially including a list of assigned PermissionSchema objects */ }
    ```
*   **Error Responses:**
    *   `404 Not Found`: Role not found. Schema: `ErrorResponseSchema`.
    *   `500 Internal Server Error`. Schema: `ErrorResponseSchema`.

**7.2.4. Update Role**
*   **Method & Path:** `PATCH /admin/roles/<int:role_id>`
*   **Description:** Updates an existing role's name or description.
*   **Permissions Required:** `MANAGE_ROLES`
*   **Path Parameters:**
    *   `role_id` (integer): The ID of the role.
*   **Request Body Schema:** `RoleUpdateRequestSchema`
    ```json
    {
      "name": "Updated Role Name",       // optional
      "description": "Updated description" // optional
    }
    ```
*   **Success Response (200 OK):** `RoleSchema`
    ```json
    { /* RoleSchema object */ }
    ```
*   **Error Responses:**
    *   `404 Not Found`: Role not found. Schema: `ErrorResponseSchema`.
    *   `409 Conflict`: Updated name already exists for another role. Schema: `ErrorResponseSchema`.
    *   `500 Internal Server Error`. Schema: `ErrorResponseSchema`.

**7.2.5. Delete Role**
*   **Method & Path:** `DELETE /admin/roles/<int:role_id>`
*   **Description:** Deletes a role. Fails if users are assigned to this role.
*   **Permissions Required:** `MANAGE_ROLES`
*   **Path Parameters:**
    *   `role_id` (integer): The ID of the role.
*   **Success Response (204 No Content):** Empty body.
*   **Error Responses:**
    *   `404 Not Found`: Role not found. Schema: `ErrorResponseSchema`.
    *   `409 Conflict`: Role is assigned to users. Schema: `ErrorResponseSchema`.
    *   `500 Internal Server Error`. Schema: `ErrorResponseSchema`.

**7.2.6. Get Permissions for a Role**
*   **Method & Path:** `GET /admin/roles/<int:role_id>/permissions`
*   **Description:** Retrieves all permissions assigned to a specific role.
*   **Permissions Required:** `MANAGE_ROLES`
*   **Path Parameters:**
    *   `role_id` (integer): The ID of the role.
*   **Success Response (200 OK):** `RoleSchema` (The response is the full Role object, which includes its permissions list).
    ```json
    { /* RoleSchema object, with its 'permissions' field populated */ }
    ```
*   **Error Responses:**
    *   `404 Not Found`: Role not found. Schema: `ErrorResponseSchema`.
    *   `500 Internal Server Error`. Schema: `ErrorResponseSchema`.

**7.2.7. Assign Permission to Role**
*   **Method & Path:** `POST /admin/roles/<int:role_id>/permissions`
*   **Description:** Assigns a permission to a role.
*   **Permissions Required:** `MANAGE_ROLES`
*   **Path Parameters:**
    *   `role_id` (integer): The ID of the role.
*   **Request Body Schema:** `RoleAssignPermissionRequestSchema`
    ```json
    {
      "permission_id": 1 // required, integer
    }
    ```
*   **Success Response (200 OK):**
    ```json
    {
      "message": "Permission assigned successfully" // or "Permission already assigned to role"
    }
    ```
*   **Error Responses:**
    *   `400 Bad Request`: Validation error. Schema: `ErrorResponseSchema`.
    *   `404 Not Found`: Role or Permission not found. Schema: `ErrorResponseSchema`.
    *   `500 Internal Server Error`. Schema: `ErrorResponseSchema`.

**7.2.8. Remove Permission from Role**
*   **Method & Path:** `DELETE /admin/roles/<int:role_id>/permissions/<int:permission_id>`
*   **Description:** Removes a permission from a role.
*   **Permissions Required:** `MANAGE_ROLES`
*   **Path Parameters:**
    *   `role_id` (integer): The ID of the role.
    *   `permission_id` (integer): The ID of the permission to remove.
*   **Success Response (200 OK):**
    ```json
    {
      "message": "Permission removed successfully" // or "Permission not assigned to role"
    }
    ```
*   **Error Responses:**
    *   `404 Not Found`: Role or Permission not found. Schema: `ErrorResponseSchema`.
    *   `500 Internal Server Error`. Schema: `ErrorResponseSchema`.

**7.3. Admin - Permission Management**

Blueprint: `admin_bp` (defined in `src/routes/admin/permission_admin_routes.py`)

**7.3.1. List Permissions**
*   **Method & Path:** `GET /admin/permissions/` (or `/admin/permissions`)
*   **Description:** Retrieves a list of all available system permissions.
*   **Permissions Required:** `MANAGE_ROLES` (Note: `VIEW_PERMISSIONS` might be more appropriate, but `MANAGE_ROLES` is currently used).
*   **Success Response (200 OK):** `PermissionListResponseSchema` (nests `PermissionSchema`)
    ```json
    {
      "permissions": [ /* Array of PermissionSchema objects */ ]
    }
    ```
*   **Error Responses:**
    *   `500 Internal Server Error`. Schema: `ErrorResponseSchema`.

**7.4. Admin - Aircraft Management**

Blueprint: `admin_bp` (defined in `src/routes/admin/aircraft_admin_routes.py`)
These routes largely mirror the non-admin aircraft routes but are under the `/admin` prefix and require `MANAGE_AIRCRAFT`.

**7.4.1. List Aircraft (Admin)**
*   **Method & Path:** `GET /admin/aircraft/` (or `/admin/aircraft`)
*   **Permissions Required:** `MANAGE_AIRCRAFT`
*   **Success Response (200 OK):** `AdminAircraftListResponseSchema` (nests `AdminAircraftSchema`)

**7.4.2. Create Aircraft (Admin)**
*   **Method & Path:** `POST /admin/aircraft/` (or `/admin/aircraft`)
*   **Permissions Required:** `MANAGE_AIRCRAFT`
*   **Request Body Schema:** `AdminAircraftSchema`
*   **Success Response (201 Created):** `AdminAircraftSchema`
*   **Notes/Incompatibilities:** `AdminAircraftSchema` includes `customer_id`, but the backend `Aircraft` model does not. `AircraftService.create_aircraft` requires `fuel_type` which is not in `AdminAircraftSchema`. This needs alignment.

**7.4.3. Get Aircraft (Admin)**
*   **Method & Path:** `GET /admin/aircraft/<string:tail_number>`
*   **Permissions Required:** `MANAGE_AIRCRAFT`
*   **Success Response (200 OK):** `AdminAircraftSchema`

**7.4.4. Update Aircraft (Admin)**
*   **Method & Path:** `PATCH /admin/aircraft/<string:tail_number>`
*   **Permissions Required:** `MANAGE_AIRCRAFT`
*   **Request Body Schema:** `AdminAircraftSchema` (partial updates)
*   **Success Response (200 OK):** `AdminAircraftSchema`
*   **Notes/Incompatibilities:** `AdminAircraftSchema` includes `customer_id`, but the backend `Aircraft` model does not. `AircraftService.update_aircraft` *does* try to set `customer_id`.

**7.4.5. Delete Aircraft (Admin)**
*   **Method & Path:** `DELETE /admin/aircraft/<string:tail_number>`
*   **Permissions Required:** `MANAGE_AIRCRAFT`
*   **Success Response (204 No Content):** Empty body.

**7.5. Admin - Customer Management**

Blueprint: `admin_bp` (defined in `src/routes/admin/customer_admin_routes.py`)
These routes largely mirror the non-admin customer routes but are under the `/admin` prefix and require `MANAGE_CUSTOMERS`.

**7.5.1. List Customers (Admin)**
*   **Method & Path:** `GET /admin/customers/` (or `/admin/customers`)
*   **Permissions Required:** `MANAGE_CUSTOMERS`
*   **Success Response (200 OK):** `AdminCustomerListResponseSchema` (nests `AdminCustomerSchema`)

**7.5.2. Create Customer (Admin)**
*   **Method & Path:** `POST /admin/customers/` (or `/admin/customers`)
*   **Permissions Required:** `MANAGE_CUSTOMERS`
*   **Request Body Schema:** `AdminCustomerSchema`
*   **Success Response (201 Created):** `AdminCustomerSchema`
*   **Notes/Incompatibilities:** `AdminCustomerSchema` only has `id` and `name`. Backend `Customer` model requires `email` and `CustomerService.create_customer` only takes `name`. Needs alignment.

**7.5.3. Get Customer (Admin)**
*   **Method & Path:** `GET /admin/customers/<int:customer_id>`
*   **Permissions Required:** `MANAGE_CUSTOMERS`
*   **Success Response (200 OK):** `AdminCustomerSchema`

**7.5.4. Update Customer (Admin)**
*   **Method & Path:** `PATCH /admin/customers/<int:customer_id>`
*   **Permissions Required:** `MANAGE_CUSTOMERS`
*   **Request Body Schema:** `AdminCustomerSchema` (partial updates)
*   **Success Response (200 OK):** `AdminCustomerSchema`

**7.5.5. Delete Customer (Admin)**
*   **Method & Path:** `DELETE /admin/customers/<int:customer_id>`
*   **Permissions Required:** `MANAGE_CUSTOMERS`
*   **Success Response (204 No Content):** Empty body.

**7.6. Admin - Assignment Settings (Deprecated)**

Blueprint: `admin_bp` (defined in `src/routes/admin/assignment_settings_routes.py`)

**7.6.1. Get Assignment Settings**
*   **Method & Path:** `GET /admin/assignment-settings`
*   **Current Status:** Deprecated. Returns 404.
*   **Description:** Intended to manage global auto-assign settings.
*   **Permissions Required:** `ADMIN` (legacy role check)
*   **Success Response (404 Not Found):**
    ```json
    {
      "error": "This feature has been deprecated. Global auto-assign setting is no longer used.",
      "code": "FEATURE_DEPRECATED"
    }
    ```
*   **Action:** Frontend should remove any calls to this endpoint.

---

## Areas of Incompatibility & Required Decisions / Actions

1.  **User Management Duplication (`/api/users` vs. `/api/admin/users`):**
    *   **Issue:** Both sets of routes offer similar CRUD operations for users. The admin routes use more detailed schemas (`UserDetailSchema`) and seem to be the more current implementation path.
    *   **Choice Needed:**
        1.  Consolidate user management under `/api/admin/users` and deprecate/remove `/api/users`. Ensure all necessary permissions are handled correctly under the admin path.
        2.  Clearly define distinct purposes for each set of routes if both are to be kept (e.g., `/api/users` for self-service by privileged users, `/api/admin/users` for system administrators).
    *   **Recommendation:** Consolidate under `/api/admin/users` for clarity and to avoid confusion. Adjust permissions as needed. The frontend `UserManagementPage.jsx` already seems to target admin functionality.

2.  **Aircraft Model & Schemas:**
    *   **Issue:** The backend `Aircraft` model is very minimal (`tail_number`, `aircraft_type`, `fuel_type`). Frontend components (e.g., `AircraftLookup`) and admin schemas (`AdminAircraftSchema`) expect/include more fields like `customer_id`, `model`, `owner`, etc. `AircraftService.create_aircraft` also has discrepancies with `AircraftCreateSchema` regarding required fields (`fuel_type` missing in schema, `customer_id` in schema but not model/service).
    *   **Action Required (High Priority):**
        1.  **Define a canonical `Aircraft` model:** Decide on all necessary fields for an aircraft (e.g., `tail_number`, `type`, `model`, `owner_name`, `owner_contact`, `home_base`, `fuel_capacity`, `preferred_fuel_type`, `mtow`, `status`, `last_faa_sync_at`, `previous_owner`, `ownership_change_date`, `ownership_change_acknowledged`).
        2.  Update the backend `Aircraft` model in `src/models/aircraft.py`.
        3.  Update all relevant backend schemas (`AircraftCreateSchema`, `AircraftUpdateSchema`, `AircraftResponseSchema`, `AdminAircraftSchema`) to reflect the new model.
        4.  Update `AircraftService` methods (`create_aircraft`, `update_aircraft`) to handle all new fields correctly.
        5.  Ensure frontend services and components align with the new, comprehensive aircraft data structure.

3.  **Customer Model & Schemas:**
    *   **Issue:** `CustomerCreateSchema` only includes `name`, but the `Customer` model requires `email`. `CustomerService.create_customer` only processes `name`. `CustomerUpdateSchema` only allows updating `name`.
    *   **Action Required:**
        1.  Update `CustomerCreateSchema` to include `email` (required) and `phone` (optional).
        2.  Update `CustomerService.create_customer` to handle `email` and `phone`.
        3.  Update `CustomerUpdateSchema` and `CustomerService.update_customer` if `email` and `phone` should be updatable.

4.  **Fuel Order Creation - `location_on_ramp`:**
    *   **Issue:** Backend route validation for `POST /api/fuel-orders` implies `location_on_ramp` is required, but `FuelOrderBaseSchema` marks it optional.
    *   **Choice Needed:** Clarify if `location_on_ramp` is mandatory. Update either the route's direct validation or the schema.
    *   **Recommendation:** Make it optional in both schema and route validation if it's not always known at creation.

5.  **Fuel Order Status Update - `assigned_truck_id`:**
    *   **Issue:** `PATCH /api/fuel-orders/<id>/status` requires `assigned_truck_id` in the payload for all status updates, which might not always be relevant.
    *   **Choice Needed:** Modify backend to make `assigned_truck_id` optional for status updates where it's not changing, or ensure frontend always sends it.
    *   **Recommendation:** Make it optional in the backend.

6.  **Deletion Cascade Checks:**
    *   **Issue:** `DELETE /api/aircraft/<tail_number>`, `DELETE /api/customers/<id>`, `DELETE /api/fuel-trucks/<id>` do not check for existing references (e.g., in `FuelOrder`) before deletion.
    *   **Action Required:** Implement checks in the respective backend services to prevent deletion if the entity is referenced, returning a 409 Conflict.

7.  **Pagination and Advanced Filtering for List Endpoints:**
    *   **Issue:** Most GET list endpoints (e.g., `/users`, `/aircraft`, `/customers`, `/fuel-trucks`, `/admin/aircraft`, `/admin/customers`) lack server-side pagination, comprehensive filtering, and sorting capabilities. The frontend `FuelOrdersPage.tsx` shows an expectation for more advanced filtering.
    *   **Action Required:** Implement robust pagination, filtering (by multiple fields), and sorting for all list endpoints in the backend services and routes. Update corresponding schemas to reflect pagination responses.

8.  **Admin User Management - `GET /admin/users/<id>`:**
    *   **Issue:** This route is currently commented out in the backend.
    *   **Action:** Decide if it's needed. If so, uncomment, test, and document. The non-admin `GET /api/users/<id>` provides similar functionality. Consolidate if possible.

9.  **Permission for Listing vs. Managing:**
    *   **Issue:** Some admin GET list endpoints (e.g., `GET /admin/users`, `GET /admin/permissions`) use `MANAGE_...` permissions.
    *   **Choice Needed:** Evaluate if a `VIEW_...` permission is more appropriate for read-only list operations, reserving `MANAGE_...` for CUD operations.
    *   **Recommendation:** Use `VIEW_...` for GET lists and `MANAGE_...` for CUD, for finer-grained control.

10. **Frontend `CreateFuelOrderRequest` Alignment:**
    *   **Issue:** Mismatch in field names and types between frontend `CreateFuelOrderRequest` and backend expectations.
    *   **Action:** Frontend must be updated to send `tail_number` (string), `assigned_lst_user_id` (int), `assigned_truck_id` (int), and `requested_amount` (number/numeric string) as per backend.

11. **Obsolete Endpoints:**
    *   **Issue:** Frontend may still reference `/api/orders/unassigned`, `/api/orders/{orderId}/accept`.
    *   **Action:** Confirm these are not in the backend (they appear not to be) and remove all calls from the frontend. `/api/admin/assignment-settings` is confirmed deprecated by the backend.

This documentation should provide a solid foundation for connecting the frontend and backend, and for identifying areas requiring further discussion and development.Okay, this is a great starting point for creating comprehensive API documentation. I will now generate the detailed documentation based on the structure and information you've provided in your thought process.

Here is the extensive API documentation for the FBO LaunchPad backend:

---

## FBO LaunchPad Backend API Documentation

**Version:** 1.0
**Last Updated:** July 30, 2024
**Base URL:** `/api`

**Authentication:**
All protected endpoints require a JSON Web Token (JWT) to be included in the `Authorization` header using the `Bearer` scheme.
Example: `Authorization: Bearer <your_jwt_token>`

**Common Schemas:**
*   **`ErrorResponseSchema`**: Standard schema for error responses.
    ```json
    {
      "error": "A descriptive error message",
      "details": { /* Optional: object containing more specific error details */ }
    }
    ```

---

### 1. Authentication Endpoints (`/auth`)
**Blueprint:** `auth_bp`
**File:** `src/routes/auth_routes.py`

**1.1. User Registration**
*   **Method & Path:** `POST /auth/register`
*   **Description:** Registers a new user in the system.
*   **Permissions Required:** None (Public)
*   **Request Body Schema:** `RegisterRequestSchema`
    ```json
    {
      "email": "user@example.com", // required, string, valid email format
      "password": "password123",   // required, string, min 8 characters
      "name": "User Full Name",    // optional, string
      "username": "new_username"   // optional, string (if not provided, derived from email)
    }
    ```
*   **Success Response (201 Created):** `RegisterResponseSchema`
    ```json
    {
      "message": "User registered successfully",
      "user": {
        "id": 1,
        "email": "user@example.com",
        "name": "User Full Name" // Note: 'name' here refers to User.name, not User.username
      }
    }
    ```
*   **Error Responses:**
    *   `400 Bad Request`: Invalid request data (e.g., missing fields, invalid email/password format). Schema: `ErrorResponseSchema`.
    *   `409 Conflict`: Email already registered. Schema: `ErrorResponseSchema`.
*   **Notes/Incompatibilities:**
    *   The backend `AuthService.register_user` currently assigns a default role of `UserRole.LST` (Line Service Technician). However, `test_auth.py` (`test_register_success`) asserts the new user gets "Customer Service Representative". This needs to be reconciled. **Decision Needed:** What should be the default role for self-registered users?
    *   The `RegisterRequestSchema` has `name` and `username` as optional. The backend service uses the `name` field for the `User.name` attribute and derives `User.username` from the email if `username` is not provided in the payload. Frontend should send `name` for the user's display name and `username` if a specific login username is desired.

**1.2. User Login**
*   **Method & Path:** `POST /auth/login`
*   **Description:** Authenticates an existing user and returns a JWT.
*   **Permissions Required:** None (Public)
*   **Rate Limiting:** 5 attempts per 300 seconds (5 minutes) per IP address.
*   **Request Body Schema:** `LoginRequestSchema`
    ```json
    {
      "email": "user@example.com", // required, string, valid email format
      "password": "password123"    // required, string
    }
    ```
*   **Success Response (200 OK):** Actual backend response structure:
    ```json
    {
      "user": { // Matches UserDetailSchema structure
        "id": 1,
        "username": "testuser",
        "email": "user@example.com",
        "name": "Test User", // User.name field
        "roles": ["CSR"],     // List of role names
        "is_active": true,
        "created_at": "iso_timestamp_string"
      },
      "token": "your.jwt.access.token"
    }
    ```
    (Note: `LoginSuccessResponseSchema` in `auth_schemas.py` currently defines `{ "token": "string", "message": "string" }`. This is a mismatch.)
*   **Error Responses:**
    *   `400 Bad Request`: Missing fields or invalid request body. Schema: `ErrorResponseSchema`.
    *   `401 Unauthorized`: Invalid email or password, or user account is inactive. Schema: `ErrorResponseSchema`.
    *   `429 Too Many Requests`: Rate limit exceeded. Schema: `ErrorResponseSchema`.
*   **Notes/Incompatibilities:**
    *   **Response Schema Mismatch:** The actual backend response for login is more detailed (includes user object) than what `LoginSuccessResponseSchema` defines.
        *   **Decision Needed:**
            1.  Update `LoginSuccessResponseSchema` to include the `user` object (matching `UserDetailSchema` or a similar structure).
            2.  Change the backend route to only return `token` and a generic `message`.
        *   **Recommendation:** Option 1 is generally more useful for the frontend to immediately have user details.
    *   The JWT payload includes `sub` (user ID as string), `username`, `roles` (list of role names), `is_active`, `exp`, and `iat`.

**1.3. Get Current User's Permissions**
*   **Method & Path:** `GET /auth/me/permissions`
*   **Description:** Retrieves a list of all effective permission names for the currently authenticated user.
*   **Permissions Required:** Authenticated User (via `@token_required`)
*   **Request Body Schema:** None
*   **Success Response (200 OK):** `UserPermissionsResponseSchema`
    ```json
    {
      "message": "Effective permissions retrieved successfully.",
      "permissions": ["CREATE_ORDER", "VIEW_ALL_ORDERS", "MANAGE_USERS"] // Example list of permission strings
    }
    ```
*   **Error Responses:**
    *   `401 Unauthorized`: Invalid or missing token. Schema: `ErrorResponseSchema`.
    *   `500 Internal Server Error`: If an error occurs while retrieving permissions. Schema: `ErrorResponseSchema`.
*   **Notes/Incompatibilities:** This is a critical endpoint for frontend permission-based UI rendering. The frontend `AuthContext` should fetch and store these permissions.

---

### 2. Fuel Order Endpoints (`/fuel-orders`)
**Blueprint:** `fuel_order_bp`
**File:** `src/routes/fuel_order_routes.py`

**2.1. Create Fuel Order**
*   **Method & Path:** `POST /fuel-orders/` (also accessible via `/fuel-orders`)
*   **Description:** Creates a new fuel order.
    *   If `assigned_lst_user_id` is `-1`, the backend attempts to auto-assign the least busy active LST.
    *   If `assigned_truck_id` is `-1`, the backend attempts to auto-assign an available active fuel truck.
    *   If an `Aircraft` with the given `tail_number` does not exist, it will be auto-created with placeholder details (using `aircraft_type` from payload or "Unknown", and `fuel_type` from the order).
*   **Permissions Required:** `CREATE_ORDER`
*   **Request Body Schema:** `FuelOrderCreateRequestSchema` (Note: The route performs some initial validation before Marshmallow. `location_on_ramp` and `requested_amount` are effectively required by route logic.)
    ```json
    {
      "tail_number": "N123AB",          // required, string
      "fuel_type": "Jet A",             // required, string
      "assigned_lst_user_id": 1,        // required, integer (-1 for auto-assign)
      "assigned_truck_id": 1,         // required, integer (-1 for auto-assign)
      "requested_amount": 100.50,       // required, number (float/decimal)
      "location_on_ramp": "Hangar 1",   // required, string
      "aircraft_type": "Boeing 737",    // optional, string (used if creating a new aircraft record)
      "customer_id": 1,                 // optional, integer
      "additive_requested": false,      // optional, boolean (defaults to false)
      "csr_notes": "Urgent order"       // optional, string
    }
    ```
*   **Success Response (201 Created):** `FuelOrderCreateResponseSchema` (nests `FuelOrderResponseSchema`)
    ```json
    {
      "message": "Fuel order created successfully", // May include info about auto-created aircraft
      "fuel_order": { /* Full FuelOrderResponseSchema structure */ }
    }
    ```
*   **Error Responses:**
    *   `400 Bad Request`: Missing required fields, validation errors (e.g., invalid LST/Truck ID, aircraft not found and auto-creation failed, no LST/Truck available for auto-assign). Schema: `ErrorResponseSchema`.
    *   `500 Internal Server Error`: Database errors. Schema: `ErrorResponseSchema`.
*   **Notes/Incompatibilities:**
    *   **Frontend vs. Backend Field Names/Types:**
        *   Frontend `CreateFuelOrderRequest` (in `frontend/app/services/fuel-order-service.ts`) uses `aircraft_id: number`, `customer_id: number`, `assigned_lst_id: number`, `assigned_truck_id: number`, `quantity: string`.
        *   Backend expects `tail_number` (string), `customer_id` (integer), `assigned_lst_user_id` (integer), `assigned_truck_id` (integer), `requested_amount` (numeric).
        *   **Action Required:** Frontend must send `tail_number` instead of `aircraft_id`. `quantity` should be sent as a number. Field names for LST and truck IDs need to match backend (`assigned_lst_user_id`, `assigned_truck_id`).
    *   **`location_on_ramp` Requirement:** The route's internal validation makes `location_on_ramp` required, while `FuelOrderBaseSchema` marks it optional.
        *   **Decision Needed:** Is `location_on_ramp` mandatory for creating an order? Align schema and route validation.
        *   **Recommendation:** If it can be added later, make it optional. If essential at creation, make it required in the schema.
    *   **Aircraft Auto-Creation:** Frontend should be aware that providing a new `tail_number` will create an `Aircraft` record. It should allow providing `aircraft_type` if the tail number is known to be new.

**2.2. List Fuel Orders**
*   **Method & Path:** `GET /fuel-orders/` (also accessible via `/fuel-orders`)
*   **Description:** Retrieves a paginated list of fuel orders. Data visibility is based on user permissions (users with `VIEW_ALL_ORDERS` see all; others, like LSTs, typically see only orders assigned to them). Supports filtering by `status`.
*   **Permissions Required:** Authenticated User (data scoped by permissions like `VIEW_ALL_ORDERS` or assignment to the order)
*   **Query Parameters:**
    *   `status` (string, e.g., "PENDING", "COMPLETED"): Filter by order status (case-insensitive).
    *   `page` (integer, default: 1): Page number for pagination.
    *   `per_page` (integer, default: 20, min: 1, max: 100): Number of items per page.
*   **Success Response (200 OK):** `FuelOrderListResponseSchema`
    ```json
    {
      "orders": [ /* Array of FuelOrderBriefResponseSchema objects */ ],
      "message": "Orders retrieved successfully",
      "pagination": { /* PaginationSchema object */
        "page": 1,
        "per_page": 20,
        "total": 100, // Total items matching filter
        "pages": 5,   // Total pages
        "has_next": true,
        "has_prev": false
      }
    }
    ```
*   **Error Responses:**
    *   `400 Bad Request`: Invalid filter values (e.g., non-existent status). Schema: `ErrorResponseSchema`.
    *   `500 Internal Server Error`. Schema: `ErrorResponseSchema`.
*   **Notes/Incompatibilities:**
    *   **Filtering Capabilities:** The frontend (`FuelOrdersPage.tsx`) shows UI for filtering by Tail Number, Assigned LST, Assigned Truck, and Date Range. The backend `FuelOrderService.get_fuel_orders` currently only supports filtering by `status`.
        *   **Action Required:** Enhance backend `FuelOrderService.get_fuel_orders` and the route to support these additional filters.

**2.3. Get Fuel Order Details**
*   **Method & Path:** `GET /fuel-orders/<int:order_id>`
*   **Description:** Retrieves detailed information for a specific fuel order. Access is restricted based on user assignment or `VIEW_ALL_ORDERS` permission.
*   **Permissions Required:** Authenticated User (scoped by assignment or `VIEW_ALL_ORDERS`)
*   **Path Parameters:**
    *   `order_id` (integer): The ID of the fuel order.
*   **Success Response (200 OK):** `FuelOrderResponseSchema` (full detail, wrapped in a message object)
    ```json
    {
      "message": "Fuel order retrieved successfully.",
      "fuel_order": { /* Full FuelOrderResponseSchema structure */ }
    }
    ```
*   **Error Responses:**
    *   `403 Forbidden`: User is not authorized to view this specific order. Schema: `ErrorResponseSchema`.
    *   `404 Not Found`: Fuel order with the given ID does not exist. Schema: `ErrorResponseSchema`.
    *   `500 Internal Server Error`. Schema: `ErrorResponseSchema`.

**2.4. Update Fuel Order Status**
*   **Method & Path:** `PATCH /fuel-orders/<int:order_id>/status`
*   **Description:** Updates the status of a fuel order. Primarily intended for LSTs to advance through workflow states (DISPATCHED -> ACKNOWLEDGED -> EN_ROUTE -> FUELING).
*   **Permissions Required:** User must be the assigned LST for the order OR have `UPDATE_OWN_ORDER_STATUS` (or a general `MANAGE_ORDERS` if broader updates are allowed by other roles). Backend service logic enforces specific transitions.
*   **Path Parameters:**
    *   `order_id` (integer): The ID of the fuel order.
*   **Request Body Schema:** `FuelOrderStatusUpdateRequestSchema`
    ```json
    {
      "status": "ACKNOWLEDGED", // required, string, one of FuelOrderStatus enum members (case-insensitive)
      "assigned_truck_id": 1    // required, integer (Current backend route validation requires this for ALL status updates)
    }
    ```
*   **Success Response (200 OK):** `FuelOrderUpdateResponseSchema` (nests `FuelOrderResponseSchema`)
    ```json
    {
      // Actual response is just the updated FuelOrder object, not nested under "fuel_order" or with a "message"
      "id": 1,
      "status": "ACKNOWLEDGED",
      // ... other fields from FuelOrderResponseSchema
      "updated_at": "iso_timestamp_string"
    }
    ```
*   **Error Responses:**
    *   `400 Bad Request`: Invalid status value, invalid transition, or missing `assigned_truck_id`. Schema: `ErrorResponseSchema`.
    *   `403 Forbidden`: User not authorized. Schema: `ErrorResponseSchema`.
    *   `404 Not Found`: Order ID does not exist. Schema: `ErrorResponseSchema`.
*   **Notes/Incompatibilities:**
    *   **`assigned_truck_id` Requirement:** The backend route's direct validation makes `assigned_truck_id` mandatory for all status updates. This is likely an oversight and should only be required if the status update implies a truck assignment/change (e.g., when moving to EN_ROUTE or FUELING if not already set).
        *   **Decision Needed:** Should `assigned_truck_id` be optional for status updates where it's not logically changing?
        *   **Recommendation:** Make `assigned_truck_id` optional in the backend for this specific route if the status change doesn't inherently require it.
    *   **Response Structure:** The actual response is the updated order object directly, not nested as suggested by `FuelOrderUpdateResponseSchema`. Align schema or route.

**2.5. Submit Fuel Data (Complete Order)**
*   **Method & Path:** `PUT /fuel-orders/<int:order_id>/submit-data`
*   **Description:** Allows the assigned LST to submit final meter readings and notes, which transitions the order to "COMPLETED".
*   **Permissions Required:** `COMPLETE_ORDER` (and user must be the assigned LST for the order).
*   **Path Parameters:**
    *   `order_id` (integer): The ID of the fuel order.
*   **Request Body Schema:** `FuelOrderCompleteRequestSchema`
    ```json
    {
      "start_meter_reading": 1000.50, // required, number (float/decimal)
      "end_meter_reading": 1250.75,   // required, number (float/decimal)
      "lst_notes": "Fueling complete."  // optional, string
    }
    ```
*   **Success Response (200 OK):** `FuelOrderUpdateResponseSchema` (nests `FuelOrderResponseSchema`)
    ```json
    {
      "message": "Fuel data submitted successfully",
      "fuel_order": { /* Full FuelOrderResponseSchema structure, status will be COMPLETED */ }
    }
    ```
*   **Error Responses:**
    *   `400 Bad Request`: Invalid meter readings (e.g., end < start, negative values). Schema: `ErrorResponseSchema`.
    *   `403 Forbidden`: User not the assigned LST or lacks `COMPLETE_ORDER` permission. Schema: `ErrorResponseSchema`.
    *   `404 Not Found`: Order ID does not exist. Schema: `ErrorResponseSchema`.
    *   `422 Unprocessable Entity`: Order is not in 'FUELING' status. Schema: `ErrorResponseSchema`.

**2.6. Review Fuel Order**
*   **Method & Path:** `PATCH /fuel-orders/<int:order_id>/review`
*   **Description:** Allows a user with `REVIEW_ORDERS` permission (typically CSR/Admin) to mark a "COMPLETED" order as "REVIEWED".
*   **Permissions Required:** `REVIEW_ORDERS`
*   **Path Parameters:**
    *   `order_id` (integer): The ID of the fuel order.
*   **Request Body Schema:** None.
*   **Success Response (200 OK):** `FuelOrderUpdateResponseSchema` (nests `FuelOrderResponseSchema`)
    ```json
    {
      "message": "Fuel order marked as reviewed.",
      "fuel_order": { /* Relevant fields from FuelOrderResponseSchema, status will be REVIEWED */ }
    }
    ```
*   **Error Responses:**
    *   `400 Bad Request`: Order is not in 'COMPLETED' status. Schema: `ErrorResponseSchema`.
    *   `404 Not Found`: Order ID does not exist. Schema: `ErrorResponseSchema`.

**2.7. Export Fuel Orders to CSV**
*   **Method & Path:** `GET /fuel-orders/export`
*   **Description:** Exports fuel orders to a CSV file. Defaults to "REVIEWED" orders but can be filtered by `status`. Date filtering is planned.
*   **Permissions Required:** `EXPORT_ORDERS_CSV`
*   **Query Parameters:**
    *   `status` (string, e.g., "COMPLETED", "REVIEWED", optional): Filter orders by status for export. If not provided, defaults to "REVIEWED".
    *   `date_from` (string, format YYYY-MM-DD, optional, **TODO**): Filter orders created on or after this date.
    *   `date_to` (string, format YYYY-MM-DD, optional, **TODO**): Filter orders created on or before this date.
*   **Success Response (200 OK):**
    *   **Content-Type:** `text/csv`
    *   **Content-Disposition:** `attachment; filename=fuel_orders_export_YYYYMMDD_HHMMSS.csv`
    *   **Body:** CSV formatted data of fuel orders.
*   **Error Responses:**
    *   `400 Bad Request`: Invalid filter value (e.g., non-existent status). Schema: `ErrorResponseSchema`.
    *   `403 Forbidden`: User lacks `EXPORT_ORDERS_CSV` permission. Schema: `ErrorResponseSchema`.
*   **Notes/Incompatibilities:**
    *   Date filtering (`date_from`, `date_to`) is marked as **TODO** in the backend service. Frontend should be aware of this limitation if implementing UI for date range export.

**2.8. Get Fuel Order Status Counts**
*   **Method & Path:** `GET /fuel-orders/stats/status-counts`
*   **Description:** Retrieves counts of fuel orders grouped by 'pending', 'in_progress', and 'completed' statuses.
*   **Permissions Required:** `VIEW_ORDER_STATS`
*   **Request Body Schema:** None
*   **Success Response (200 OK):** `OrderStatusCountsResponseSchema`
    ```json
    {
      "message": "Status counts retrieved successfully.",
      "counts": { // OrderStatusCountsSchema
        "pending": 5,     // Count of DISPATCHED orders
        "in_progress": 2, // Count of ACKNOWLEDGED, EN_ROUTE, FUELING orders
        "completed": 10   // Count of COMPLETED orders (not REVIEWED)
      }
    }
    ```
*   **Error Responses:**
    *   `500 Internal Server Error`. Schema: `ErrorResponseSchema`.

---

### 3. Fuel Truck Endpoints (`/fuel-trucks`)
**Blueprint:** `truck_bp`
**File:** `src/routes/fuel_truck_routes.py`

**3.1. List Fuel Trucks**
*   **Method & Path:** `GET /fuel-trucks/` (also accessible via `/fuel-trucks`)
*   **Description:** Retrieves a list of fuel trucks. Supports filtering by `is_active` status.
*   **Permissions Required:** `VIEW_TRUCKS`
*   **Query Parameters:**
    *   `is_active` (string, "true" or "false"): Filter trucks by their active status.
*   **Success Response (200 OK):** `FuelTruckListResponseSchema`
    ```json
    {
      "message": "Fuel trucks retrieved successfully",
      "fuel_trucks": [ /* Array of FuelTruckSchema objects */ ]
    }
    ```
*   **Error Responses:**
    *   `400 Bad Request`: If `is_active` filter value is invalid. Schema: `ErrorResponseSchema`.
    *   `500 Internal Server Error`. Schema: `ErrorResponseSchema`.

**3.2. Create Fuel Truck**
*   **Method & Path:** `POST /fuel-trucks/`
*   **Description:** Creates a new fuel truck.
*   **Permissions Required:** `MANAGE_TRUCKS`
*   **Request Body Schema:** `FuelTruckCreateRequestSchema`
    ```json
    {
      "truck_number": "FT001",         // required, string
      "fuel_type": "Jet A",            // required, string
      "capacity": 5000.00,             // required, decimal/number
      "current_meter_reading": 100.00  // optional, decimal/number, defaults to 0
    }
    ```
*   **Success Response (201 Created):** `FuelTruckCreateResponseSchema` (nests `FuelTruckSchema`)
    ```json
    {
      "message": "Fuel truck created successfully",
      "fuel_truck": { /* Full FuelTruckSchema object */ }
    }
    ```
*   **Error Responses:**
    *   `400 Bad Request`: Validation error (e.g., missing fields, invalid data types) or duplicate `truck_number`. Schema: `ErrorResponseSchema`.
    *   `500 Internal Server Error`. Schema: `ErrorResponseSchema`.

**3.3. Get Fuel Truck Details**
*   **Method & Path:** `GET /fuel-trucks/<int:truck_id>`
*   **Description:** Retrieves detailed information for a specific fuel truck.
*   **Permissions Required:** `VIEW_TRUCKS`
*   **Path Parameters:**
    *   `truck_id` (integer): The ID of the fuel truck.
*   **Success Response (200 OK):** Response containing `FuelTruckSchema`
    ```json
    {
      "message": "Fuel truck retrieved successfully",
      "fuel_truck": { /* Full FuelTruckSchema object */ }
    }
    ```
*   **Error Responses:**
    *   `404 Not Found`: Fuel truck with the given ID does not exist. Schema: `ErrorResponseSchema`.
    *   `500 Internal Server Error`. Schema: `ErrorResponseSchema`.

**3.4. Update Fuel Truck**
*   **Method & Path:** `PATCH /fuel-trucks/<int:truck_id>`
*   **Description:** Updates details of an existing fuel truck. Allows partial updates.
*   **Permissions Required:** `MANAGE_TRUCKS`
*   **Path Parameters:**
    *   `truck_id` (integer): The ID of the fuel truck to update.
*   **Request Body Schema:** `FuelTruckCreateRequestSchema` (OpenAPI spec) / `FuelTruckUpdateRequestSchema` (Service layer, more accurate for PATCH)
    ```json
    // Example partial update:
    {
      "current_meter_reading": 150.00, // optional
      "is_active": false               // optional
    }
    ```
*   **Success Response (200 OK):** Response containing `FuelTruckSchema`
    ```json
    {
      "message": "Fuel truck updated successfully",
      "fuel_truck": { /* Full FuelTruckSchema object with updated fields */ }
    }
    ```
*   **Error Responses:**
    *   `400 Bad Request`: Validation error (e.g., invalid data types) or if `truck_number` is changed to one that already exists. Schema: `ErrorResponseSchema`.
    *   `404 Not Found`: Fuel truck with the given ID does not exist. Schema: `ErrorResponseSchema`.
    *   `500 Internal Server Error`. Schema: `ErrorResponseSchema`.
*   **Notes/Incompatibilities:**
    *   The route's OpenAPI spec incorrectly uses `FuelTruckCreateRequestSchema` for PATCH. The service layer correctly handles partial updates as expected for PATCH. Frontend should send only fields to be changed.

**3.5. Delete Fuel Truck**
*   **Method & Path:** `DELETE /fuel-trucks/<int:truck_id>`
*   **Description:** Deletes a fuel truck.
*   **Permissions Required:** `MANAGE_TRUCKS`
*   **Path Parameters:**
    *   `truck_id` (integer): The ID of the fuel truck to delete.
*   **Success Response (200 OK):**
    ```json
    {
      "message": "Fuel truck deleted successfully"
    }
    ```
*   **Error Responses:**
    *   `404 Not Found`: Fuel truck with the given ID does not exist. Schema: `ErrorResponseSchema`.
    *   `500 Internal Server Error`. Schema: `ErrorResponseSchema`.
*   **Notes/Incompatibilities:**
    *   **Missing Cascade Check:** The backend service does not currently check if the truck is assigned to any active/pending fuel orders before deletion. This could lead to orphaned records or operational issues.
        *   **Action Required:** Backend should implement a check. If the truck is in use, return a `409 Conflict` error.

---

### 4. User Endpoints (`/users`) - General (Non-Admin Specific Prefix)
**Blueprint:** `user_bp`
**File:** `src/routes/user_routes.py`
**Note:** There's an overlap in functionality with `/api/admin/users`. This section documents the `/api/users` routes. See Section 7.1 for `/api/admin/users`. **Consolidation is highly recommended.**

**4.1. List Users**
*   **Method & Path:** `GET /users/` (also accessible via `/users`)
*   **Description:** Retrieves a list of users. Supports filtering by `role` (string name) and `is_active` (string "true"/"false").
*   **Permissions Required:** `VIEW_USERS`
*   **Query Parameters:**
    *   `role` (string, e.g., "ADMIN", "CSR", "LST"): Filter users by role name (case-insensitive).
    *   `is_active` (string, "true" or "false"): Filter users by active status.
*   **Success Response (200 OK):** `UserListResponseSchema` (nests `UserBriefSchema`)
    ```json
    {
      "message": "Users retrieved successfully",
      "users": [ /* Array of UserBriefSchema objects */ ]
    }
    ```
*   **Error Responses:**
    *   `400 Bad Request`: Invalid filter value. Schema: `ErrorResponseSchema`.
    *   `500 Internal Server Error`. Schema: `ErrorResponseSchema`.

**4.2. Create User**
*   **Method & Path:** `POST /users/` (also accessible via `/users`)
*   **Description:** Creates a new user.
*   **Permissions Required:** `MANAGE_USERS`
*   **Request Body Schema:** `UserCreateRequestSchema`
    ```json
    {
      "email": "new.user@example.com", // required
      "password": "securePassword123",  // required, min 6 chars
      "role_ids": [1, 2],              // required, list of role IDs
      "name": "New User FullName",     // optional (User.username, defaults to email prefix)
      "is_active": true                // optional, boolean (defaults to true)
    }
    ```
*   **Success Response (201 Created):** `UserResponseSchema` (as part of a message object)
    ```json
    {
      "message": "User created successfully",
      "user": { /* UserResponseSchema structure */ }
    }
    ```
*   **Error Responses:**
    *   `400 Bad Request`: Validation error (e.g., missing fields, invalid `role_ids`). Schema: `ErrorResponseSchema`.
    *   `409 Conflict`: Email already exists. Schema: `ErrorResponseSchema`.
    *   `500 Internal Server Error`. Schema: `ErrorResponseSchema`.

**4.3. Get User Details**
*   **Method & Path:** `GET /users/<int:user_id>`
*   **Description:** Retrieves detailed information for a specific user.
*   **Permissions Required:** `VIEW_USERS`
*   **Path Parameters:**
    *   `user_id` (integer): The ID of the user.
*   **Success Response (200 OK):** `UserResponseSchema` (as part of a message object)
    ```json
    {
      "message": "User retrieved successfully",
      "user": { /* UserResponseSchema structure */ }
    }
    ```
*   **Error Responses:**
    *   `404 Not Found`: User with the given ID does not exist. Schema: `ErrorResponseSchema`.
    *   `500 Internal Server Error`. Schema: `ErrorResponseSchema`.

**4.4. Update User**
*   **Method & Path:** `PATCH /users/<int:user_id>`
*   **Description:** Updates details of an existing user. Allows partial updates.
*   **Permissions Required:** `MANAGE_USERS`
*   **Path Parameters:**
    *   `user_id` (integer): The ID of the user to update.
*   **Request Body Schema:** `UserUpdateRequestSchema`
    ```json
    {
      "name": "Updated User Name",         // optional (updates User.username)
      "email": "updated.user@example.com", // optional
      "role_ids": [3],                     // optional, list of role IDs
      "is_active": false,                  // optional
      "password": "newStrongPassword123"   // optional, min 6 chars
    }
    ```
*   **Success Response (200 OK):** `UserResponseSchema` (as part of a message object)
    ```json
    {
      "message": "User updated successfully",
      "user": { /* UserResponseSchema structure with updated fields */ }
    }
    ```
*   **Error Responses:**
    *   `400 Bad Request`: Validation error (e.g., invalid `role_ids`). Schema: `ErrorResponseSchema`.
    *   `403 Forbidden`: Attempting to self-deactivate or remove own `MANAGE_USERS` permission. Schema: `ErrorResponseSchema`.
    *   `404 Not Found`: User with the given ID does not exist. Schema: `ErrorResponseSchema`.
    *   `409 Conflict`: If `email` is changed to one that already exists for another user. Schema: `ErrorResponseSchema`.
    *   `500 Internal Server Error`. Schema: `ErrorResponseSchema`.

**4.5. Delete User (Soft Delete)**
*   **Method & Path:** `DELETE /users/<int:user_id>`
*   **Description:** Deactivates a user by setting their `is_active` flag to `false`. This is a soft delete.
*   **Permissions Required:** `MANAGE_USERS`
*   **Path Parameters:**
    *   `user_id` (integer): The ID of the user to deactivate.
*   **Success Response (200 OK):**
    ```json
    {
      "message": "User deactivated successfully"
    }
    ```
*   **Error Responses:**
    *   `403 Forbidden`: Attempting to self-deactivate. Schema: `ErrorResponseSchema`.
    *   `404 Not Found`: User with the given ID does not exist. Schema: `ErrorResponseSchema`.
    *   `500 Internal Server Error`. Schema: `ErrorResponseSchema`.

---

### 5. Aircraft Endpoints (`/aircraft`) - General
**Blueprint:** `aircraft_bp`
**File:** `src/routes/aircraft_routes.py`

**5.1. List Aircraft**
*   **Method & Path:** `GET /aircraft/` (also accessible via `/aircraft`)
*   **Description:** Retrieves a list of all aircraft. Supports filtering by `customer_id`.
*   **Permissions Required:** `VIEW_AIRCRAFT`
*   **Query Parameters:**
    *   `customer_id` (integer, optional): Filter aircraft by an associated customer ID. (Note: Backend `Aircraft` model currently lacks `customer_id`).
*   **Success Response (200 OK):** `AircraftListSchema`
    ```json
    {
      "message": "Aircraft list retrieved successfully",
      "aircraft": [ /* Array of AircraftResponseSchema objects */ ]
    }
    ```
*   **Error Responses:**
    *   `500 Internal Server Error`. Schema: `ErrorResponseSchema`.
*   **Notes/Incompatibilities:**
    *   **`customer_id` Filter:** The backend `Aircraft` model does not have a `customer_id` field. The `AircraftService.get_all_aircraft` attempts to filter by it, which will not work as intended. This is a major point of incompatibility.
        *   **Decision Required:** Add `customer_id` (FK to `Customer`) to the `Aircraft` model OR remove `customer_id` filtering.
        *   **Recommendation:** Add `customer_id` to the `Aircraft` model if this association is a business requirement.

**5.2. Create Aircraft**
*   **Method & Path:** `POST /aircraft/` (also accessible via `/aircraft`)
*   **Description:** Creates a new aircraft record.
*   **Permissions Required:** `MANAGE_AIRCRAFT`
*   **Request Body Schema:** `AircraftCreateSchema`
    ```json
    {
      "tail_number": "N789XY",    // required, string
      "aircraft_type": "Jet",     // optional, string (Backend service requires this)
      "customer_id": 1            // optional, integer (Backend model does not have this field)
      // "fuel_type" is missing from schema but required by backend service
    }
    ```
*   **Success Response (201 Created):** `AircraftResponseSchema` (as part of a message object)
    ```json
    {
      "message": "Aircraft created successfully",
      "aircraft": { /* AircraftResponseSchema object */ }
    }
    ```
*   **Error Responses:**
    *   `400 Bad Request`: Missing required fields (backend service requires `tail_number`, `aircraft_type`, `fuel_type`). Schema: `ErrorResponseSchema`.
    *   `409 Conflict`: Aircraft with this `tail_number` already exists. Schema: `ErrorResponseSchema`.
    *   `500 Internal Server Error`. Schema: `ErrorResponseSchema`.
*   **Notes/Incompatibilities:**
    *   **Schema vs. Service Mismatch:**
        *   `AircraftCreateSchema` marks `aircraft_type` as optional, but `AircraftService.create_aircraft` requires it.
        *   `AircraftCreateSchema` is missing `fuel_type`, which is required by `AircraftService.create_aircraft`.
        *   `AircraftCreateSchema` includes `customer_id`, but the backend `Aircraft` model and `create_aircraft` service method do not handle it.
        *   **Action Required:**
            1.  Add `fuel_type` (required) to `AircraftCreateSchema`.
            2.  Make `aircraft_type` required in `AircraftCreateSchema`.
            3.  Address the `customer_id` discrepancy (see 5.1 Notes).
    *   **Minimal Backend Model:** The backend `Aircraft` model (`tail_number`, `aircraft_type`, `fuel_type`) is very basic. The frontend (`AircraftLookup` component) expects more comprehensive fields (`model`, `owner`, `homeBase`, `mtow`, `fuelCapacity`, `lastFaaSyncAt`, etc.).
        *   **Decision Required (High Priority):** Expand the backend `Aircraft` model significantly or simplify frontend expectations.
        *   **Recommendation:** Expand the backend model to store more comprehensive aircraft data.

**5.3. Get Aircraft Details**
*   **Method & Path:** `GET /aircraft/<string:tail_number>`
*   **Description:** Retrieves details for a specific aircraft by its tail number.
*   **Permissions Required:** `VIEW_AIRCRAFT`
*   **Path Parameters:**
    *   `tail_number` (string): The tail number of the aircraft.
*   **Success Response (200 OK):** `AircraftResponseSchema` (as part of a message object)
    ```json
    {
      "message": "Aircraft retrieved successfully",
      "aircraft": { /* AircraftResponseSchema object */ }
    }
    ```
*   **Error Responses:**
    *   `404 Not Found`: Aircraft with the given tail number not found. Schema: `ErrorResponseSchema`.
    *   `500 Internal Server Error`. Schema: `ErrorResponseSchema`.

**5.4. Update Aircraft**
*   **Method & Path:** `PATCH /aircraft/<string:tail_number>`
*   **Description:** Updates details of an existing aircraft. Allows partial updates.
*   **Permissions Required:** `MANAGE_AIRCRAFT`
*   **Path Parameters:**
    *   `tail_number` (string): The tail number of the aircraft to update.
*   **Request Body Schema:** `AircraftUpdateSchema`
    ```json
    {
      "aircraft_type": "Turboprop", // optional
      "customer_id": 2            // optional (Backend model does not have this field, but service attempts to set it)
      // "fuel_type" is missing from schema but is a field in the model.
    }
    ```
*   **Success Response (200 OK):** `AircraftResponseSchema` (as part of a message object)
    ```json
    {
      "message": "Aircraft updated successfully",
      "aircraft": { /* AircraftResponseSchema object with updated fields */ }
    }
    ```
*   **Error Responses:**
    *   `400 Bad Request`: Validation error. Schema: `ErrorResponseSchema`.
    *   `404 Not Found`: Aircraft not found. Schema: `ErrorResponseSchema`.
    *   `500 Internal Server Error`. Schema: `ErrorResponseSchema`.
*   **Notes/Incompatibilities:**
    *   `AircraftUpdateSchema` allows updating `customer_id`. The `AircraftService.update_aircraft` method attempts to set `aircraft.customer_id`. However, the `Aircraft` model itself lacks a `customer_id` field. This will lead to an error.
        *   **Action Required:** Align the model, schema, and service regarding `customer_id`.
    *   `fuel_type` is a field in the `Aircraft` model but not in `AircraftUpdateSchema`.
        *   **Decision Needed:** Should `fuel_type` be updatable? If so, add to schema and service.

**5.5. Delete Aircraft**
*   **Method & Path:** `DELETE /aircraft/<string:tail_number>`
*   **Description:** Deletes an aircraft record.
*   **Permissions Required:** `MANAGE_AIRCRAFT`
*   **Path Parameters:**
    *   `tail_number` (string): The tail number of the aircraft to delete.
*   **Success Response (200 OK):**
    ```json
    {
      "message": "Aircraft deleted successfully"
    }
    ```
*   **Error Responses:**
    *   `404 Not Found`: Aircraft not found. Schema: `ErrorResponseSchema`.
    *   `500 Internal Server Error`. Schema: `ErrorResponseSchema`.
*   **Notes/Incompatibilities:**
    *   **Missing Cascade Check:** The backend service does not check if the aircraft is referenced by any fuel orders before deletion.
        *   **Action Required:** Implement a check in the backend. If referenced, return `409 Conflict`.

---

### 6. Customer Endpoints (`/customers`) - General
**Blueprint:** `customer_bp`
**File:** `src/routes/customer_routes.py`

**6.1. List Customers**
*   **Method & Path:** `GET /customers/` (also accessible via `/customers`)
*   **Description:** Retrieves a list of all customers.
*   **Permissions Required:** `VIEW_CUSTOMERS`
*   **Query Parameters:** None currently supported.
*   **Success Response (200 OK):** `CustomerListSchema`
    ```json
    {
      "message": "Customer list retrieved successfully",
      "customers": [ /* Array of CustomerResponseSchema objects */ ]
    }
    ```
*   **Error Responses:**
    *   `500 Internal Server Error`. Schema: `ErrorResponseSchema`.

**6.2. Create Customer**
*   **Method & Path:** `POST /customers/` (also accessible via `/customers`)
*   **Description:** Creates a new customer.
*   **Permissions Required:** `MANAGE_CUSTOMERS`
*   **Request Body Schema:** `CustomerCreateSchema`
    ```json
    {
      "name": "New Customer Inc." // required, string
      // Note: Backend Customer model also requires 'email' and has an optional 'phone'.
      // CustomerCreateSchema only defines 'name'.
    }
    ```
*   **Success Response (201 Created):** `CustomerResponseSchema` (as part of a message object)
    ```json
    {
      "message": "Customer created successfully",
      "customer": { /* CustomerResponseSchema object */ }
    }
    ```
*   **Error Responses:**
    *   `400 Bad Request`: Missing required fields (backend service currently only processes `name` from this schema but model requires `email`). Schema: `ErrorResponseSchema`.
    *   `409 Conflict`: Customer with this name (or email, if implemented) already exists. Schema: `ErrorResponseSchema`.
    *   `500 Internal Server Error`. Schema: `ErrorResponseSchema`.
*   **Notes/Incompatibilities:**
    *   **Schema vs. Model/Service Mismatch:** `CustomerCreateSchema` only defines `name`. The backend `Customer` model requires `name` and `email`. The `CustomerService.create_customer` method currently only processes `name` from the payload.
        *   **Action Required:**
            1.  Update `CustomerCreateSchema` to include `email` (required) and `phone` (optional).
            2.  Modify `CustomerService.create_customer` to accept and save `email` and `phone`.
            3.  Ensure frontend sends these fields.

**6.3. Get Customer Details**
*   **Method & Path:** `GET /customers/<int:customer_id>`
*   **Description:** Retrieves detailed information for a specific customer.
*   **Permissions Required:** `VIEW_CUSTOMERS`
*   **Path Parameters:**
    *   `customer_id` (integer): The ID of the customer.
*   **Success Response (200 OK):** `CustomerResponseSchema` (as part of a message object)
    ```json
    {
      "message": "Customer retrieved successfully",
      "customer": { /* CustomerResponseSchema object */ }
    }
    ```
*   **Error Responses:**
    *   `404 Not Found`: Customer with the given ID not found. Schema: `ErrorResponseSchema`.
    *   `500 Internal Server Error`. Schema: `ErrorResponseSchema`.

**6.4. Update Customer**
*   **Method & Path:** `PATCH /customers/<int:customer_id>`
*   **Description:** Updates details of an existing customer. Allows partial updates.
*   **Permissions Required:** `MANAGE_CUSTOMERS`
*   **Path Parameters:**
    *   `customer_id` (integer): The ID of the customer to update.
*   **Request Body Schema:** `CustomerUpdateSchema`
    ```json
    {
      "name": "Updated Customer Name" // optional
      // Note: Backend Customer model has 'email' and 'phone'.
      // CustomerUpdateSchema only defines 'name'.
    }
    ```
*   **Success Response (200 OK):** `CustomerResponseSchema` (as part of a message object)
    ```json
    {
      "message": "Customer updated successfully",
      "customer": { /* CustomerResponseSchema object with updated fields */ }
    }
    ```
*   **Error Responses:**
    *   `400 Bad Request`: Validation error (e.g., if `name` is changed to one that already exists). Schema: `ErrorResponseSchema`.
    *   `404 Not Found`: Customer with the given ID not found. Schema: `ErrorResponseSchema`.
    *   `500 Internal Server Error`. Schema: `ErrorResponseSchema`.
*   **Notes/Incompatibilities:**
    *   **Schema vs. Model/Service Mismatch:** `CustomerUpdateSchema` only allows updating `name`. The `CustomerService.update_customer` method only handles `name`.
        *   **Decision Needed:** Should `email` and `phone` be updatable for a customer? If so, update the schema and service method.

**6.5. Delete Customer**
*   **Method & Path:** `DELETE /customers/<int:customer_id>`
*   **Description:** Deletes a customer record.
*   **Permissions Required:** `MANAGE_CUSTOMERS`
*   **Path Parameters:**
    *   `customer_id` (integer): The ID of the customer to delete.
*   **Success Response (200 OK):**
    ```json
    {
      "message": "Customer deleted successfully"
    }
    ```
*   **Error Responses:**
    *   `404 Not Found`: Customer with the given ID not found. Schema: `ErrorResponseSchema`.
    *   `500 Internal Server Error`. Schema: `ErrorResponseSchema`.
*   **Notes/Incompatibilities:**
    *   **Missing Cascade Check:** The backend service does not check if the customer is referenced by any fuel orders before deletion.
        *   **Action Required:** Implement a check in the backend. If referenced, return `409 Conflict`.

---

### 7. Admin Endpoints (`/admin`)
**Blueprint:** `admin_bp`
**File:** `src/routes/admin/routes.py` (and imported sub-route files)

**7.1. Admin - User Management (`/admin/users`)**
**File:** `src/routes/admin/user_admin_routes.py`

**7.1.1. List Users (Admin)**
*   **Method & Path:** `GET /admin/users/` (also accessible via `/admin/users`)
*   **Description:** Retrieves a list of users. Supports filtering by `role_ids` (list of role IDs) and `is_active` (boolean string "true"/"false").
*   **Permissions Required:** `MANAGE_USERS`
*   **Query Parameters:**
    *   `role_ids` (list of integers, e.g., `role_ids=1&role_ids=2`): Filter by user role IDs.
    *   `is_active` (string "true" or "false"): Filter by active status.
*   **Success Response (200 OK):** `UserListResponseSchema` (nests `UserDetailSchema`)
    ```json
    {
      "users": [ /* Array of UserDetailSchema objects */ ],
      "message": "Users retrieved successfully"
    }
    ```
*   **Error Responses:**
    *   `400 Bad Request`: Invalid filter values. Schema: `ErrorResponseSchema`.
    *   `500 Internal Server Error`. Schema: `ErrorResponseSchema`.
*   **Notes:** This endpoint uses `UserDetailSchema` for list items, providing more detail than the non-admin `/api/users` list. The permission `MANAGE_USERS` for a GET list is stricter than `VIEW_USERS`.

**7.1.2. Create User (Admin)**
*   **Method & Path:** `POST /admin/users/`
*   **Description:** Creates a new user.
*   **Permissions Required:** `MANAGE_USERS`
*   **Request Body Schema:** `UserCreateRequestSchema` (from `src/schemas/user_schemas.py`)
    ```json
    {
      "email": "admin.created@example.com", // required
      "password": "securePassword123",      // required, min 6 chars
      "role_ids": [1],                     // required, list of role IDs
      "name": "Admin Created User",        // optional (User.username, defaults to email prefix)
      "is_active": true                    // optional, boolean (defaults to true)
    }
    ```
*   **Success Response (201 Created):** Response containing `UserDetailSchema`
    ```json
    {
      "user": { /* UserDetailSchema object */ },
      "message": "User created successfully"
    }
    ```
*   **Error Responses:**
    *   `400 Bad Request`: Validation error. Schema: `ErrorResponseSchema`.
    *   `409 Conflict`: Email already exists. Schema: `ErrorResponseSchema`.
    *   `500 Internal Server Error`. Schema: `ErrorResponseSchema`.

**7.1.3. Update User (Admin)**
*   **Method & Path:** `PATCH /admin/users/<int:user_id>`
*   **Description:** Updates an existing user's details. Allows partial updates.
*   **Permissions Required:** `MANAGE_USERS`
*   **Path Parameters:**
    *   `user_id` (integer): The ID of the user to update.
*   **Request Body Schema:** `UserUpdateRequestSchema`
    ```json
    {
      "name": "Updated Admin User",         // optional (updates User.username)
      "email": "updated.admin@example.com", // optional
      "role_ids": [1, 2],                   // optional, list of role IDs
      "is_active": false,                   // optional
      "password": "newStrongPassword"       // optional, min 6 chars
    }
    ```
*   **Success Response (200 OK):** Response containing `UserDetailSchema`
    ```json
    {
      "user": { /* UserDetailSchema object with updated fields */ },
      "message": "User updated successfully"
    }
    ```
*   **Error Responses:**
    *   `400 Bad Request`: Validation error, invalid `role_ids`. Schema: `ErrorResponseSchema`.
    *   `403 Forbidden`: Attempting to self-deactivate or remove own `MANAGE_USERS` permission. Schema: `ErrorResponseSchema`.
    *   `404 Not Found`: User not found. Schema: `ErrorResponseSchema`.
    *   `409 Conflict`: If `email` is changed to one that already exists for another user. Schema: `ErrorResponseSchema`.
    *   `500 Internal Server Error`. Schema: `ErrorResponseSchema`.

**7.1.4. Delete User (Admin - Soft Delete)**
*   **Method & Path:** `DELETE /admin/users/<int:user_id>`
*   **Description:** Deactivates a user by setting their `is_active` flag to `false`.
*   **Permissions Required:** `MANAGE_USERS`
*   **Path Parameters:**
    *   `user_id` (integer): The ID of the user to deactivate.
*   **Success Response (200 OK):**
    ```json
    {
      "message": "User deactivated successfully"
    }
    ```
*   **Error Responses:**
    *   `403 Forbidden`: Attempting to self-deactivate. Schema: `ErrorResponseSchema`.
    *   `404 Not Found`: User not found. Schema: `ErrorResponseSchema`.
    *   `500 Internal Server Error`. Schema: `ErrorResponseSchema`.

**7.1.5. Get User Details (Admin)**
*   **Current Status:** This route is **commented out** in `src/routes/admin/user_admin_routes.py`.
*   **Intended Method & Path:** `GET /admin/users/<int:user_id>`
*   **Intended Description:** Retrieves details for a specific user via the admin interface.
*   **Intended Permissions Required:** `MANAGE_USERS` (or `VIEW_USERS`).
*   **Action Required:** Determine if this specific admin endpoint for fetching a single user is necessary, given the existence of `GET /api/users/<int:user_id>`. If needed, uncomment, test, and ensure proper schema usage.

**7.2. Admin - Role Management (`/admin/roles`)**
**File:** `src/routes/admin/role_admin_routes.py`

**7.2.1. List Roles**
*   **Method & Path:** `GET /admin/roles/` (also accessible via `/admin/roles`)
*   **Description:** Retrieves a list of all roles.
*   **Permissions Required:** `MANAGE_ROLES`
*   **Success Response (200 OK):** `RoleListResponseSchema` (nests `RoleSchema`)
    ```json
    {
      "roles": [ /* Array of RoleSchema objects, each potentially including its permissions */ ]
    }
    ```
*   **Error Responses:**
    *   `500 Internal Server Error`. Schema: `ErrorResponseSchema`.

**7.2.2. Create Role**
*   **Method & Path:** `POST /admin/roles/` (also accessible via `/admin/roles`)
*   **Description:** Creates a new role.
*   **Permissions Required:** `MANAGE_ROLES`
*   **Request Body Schema:** `RoleCreateRequestSchema`
    ```json
    {
      "name": "New Role Name",                // required, string
      "description": "Description of new role" // optional, string
    }
    ```
*   **Success Response (201 Created):** `RoleSchema`
    ```json
    { /* RoleSchema object for the newly created role */ }
    ```
*   **Error Responses:**
    *   `400 Bad Request`: Missing `name`. Schema: `ErrorResponseSchema`.
    *   `409 Conflict`: Role `name` already exists. Schema: `ErrorResponseSchema`.
    *   `500 Internal Server Error`. Schema: `ErrorResponseSchema`.

**7.2.3. Get Role Details**
*   **Method & Path:** `GET /admin/roles/<int:role_id>`
*   **Description:** Retrieves details of a specific role, including its assigned permissions.
*   **Permissions Required:** `MANAGE_ROLES`
*   **Path Parameters:**
    *   `role_id` (integer): The ID of the role.
*   **Success Response (200 OK):** `RoleSchema` (The `RoleSchema` should serialize the `permissions` relationship, listing assigned permissions).
    ```json
    {
      "id": 1,
      "name": "Administrator",
      "description": "Full system access",
      "created_at": "iso_timestamp_string",
      "permissions": [ /* Array of PermissionSchema objects assigned to this role */ ]
    }
    ```
*   **Error Responses:**
    *   `404 Not Found`: Role with the given ID not found. Schema: `ErrorResponseSchema`.
    *   `500 Internal Server Error`. Schema: `ErrorResponseSchema`.

**7.2.4. Update Role**
*   **Method & Path:** `PATCH /admin/roles/<int:role_id>`
*   **Description:** Updates an existing role's name or description. Does not manage permissions here.
*   **Permissions Required:** `MANAGE_ROLES`
*   **Path Parameters:**
    *   `role_id` (integer): The ID of the role to update.
*   **Request Body Schema:** `RoleUpdateRequestSchema`
    ```json
    {
      "name": "Updated Role Name",       // optional
      "description": "Updated description" // optional
    }
    ```
*   **Success Response (200 OK):** `RoleSchema`
    ```json
    { /* RoleSchema object with updated fields */ }
    ```
*   **Error Responses:**
    *   `404 Not Found`: Role not found. Schema: `ErrorResponseSchema`.
    *   `409 Conflict`: If `name` is changed to one that already exists for another role. Schema: `ErrorResponseSchema`.
    *   `500 Internal Server Error`. Schema: `ErrorResponseSchema`.

**7.2.5. Delete Role**
*   **Method & Path:** `DELETE /admin/roles/<int:role_id>`
*   **Description:** Deletes a role. Fails if any users are currently assigned to this role.
*   **Permissions Required:** `MANAGE_ROLES`
*   **Path Parameters:**
    *   `role_id` (integer): The ID of the role to delete.
*   **Success Response (204 No Content):** Empty body.
*   **Error Responses:**
    *   `404 Not Found`: Role not found. Schema: `ErrorResponseSchema`.
    *   `409 Conflict`: Role is assigned to users and cannot be deleted. Schema: `ErrorResponseSchema`.
    *   `500 Internal Server Error`. Schema: `ErrorResponseSchema`.

**7.2.6. Get Permissions for a Role**
*   **Method & Path:** `GET /admin/roles/<int:role_id>/permissions`
*   **Description:** Retrieves all permissions currently assigned to a specific role.
*   **Permissions Required:** `MANAGE_ROLES`
*   **Path Parameters:**
    *   `role_id` (integer): The ID of the role.
*   **Success Response (200 OK):** `RoleSchema` (The response is the full Role object, and its `permissions` field will contain the list of assigned permissions).
    ```json
    { /* RoleSchema object, with its 'permissions' field populated with PermissionSchema objects */ }
    ```
*   **Error Responses:**
    *   `404 Not Found`: Role not found. Schema: `ErrorResponseSchema`.
    *   `500 Internal Server Error`. Schema: `ErrorResponseSchema`.

**7.2.7. Assign Permission to Role**
*   **Method & Path:** `POST /admin/roles/<int:role_id>/permissions`
*   **Description:** Assigns a specific permission to a role.
*   **Permissions Required:** `MANAGE_ROLES`
*   **Path Parameters:**
    *   `role_id` (integer): The ID of the role.
*   **Request Body Schema:** `RoleAssignPermissionRequestSchema`
    ```json
    {
      "permission_id": 1 // required, integer, ID of the permission to assign
    }
    ```
*   **Success Response (200 OK):**
    ```json
    {
      "message": "Permission assigned successfully" 
      // Or "Permission already assigned to role" if it was already assigned
    }
    ```
*   **Error Responses:**
    *   `400 Bad Request`: Invalid `permission_id` in payload. Schema: `ErrorResponseSchema`.
    *   `404 Not Found`: Role or Permission with the given ID not found. Schema: `ErrorResponseSchema`.
    *   `500 Internal Server Error`. Schema: `ErrorResponseSchema`.

**7.2.8. Remove Permission from Role**
*   **Method & Path:** `DELETE /admin/roles/<int:role_id>/permissions/<int:permission_id>`
*   **Description:** Removes a specific permission from a role.
*   **Permissions Required:** `MANAGE_ROLES`
*   **Path Parameters:**
    *   `role_id` (integer): The ID of the role.
    *   `permission_id` (integer): The ID of the permission to remove.
*   **Success Response (200 OK):**
    ```json
    {
      "message": "Permission removed successfully"
      // Or "Permission not assigned to role" if it wasn't assigned
    }
    ```
*   **Error Responses:**
    *   `404 Not Found`: Role or Permission not found. Schema: `ErrorResponseSchema`.
    *   `500 Internal Server Error`. Schema: `ErrorResponseSchema`.

**7.3. Admin - Permission Management (`/admin/permissions`)**
**File:** `src/routes/admin/permission_admin_routes.py`

**7.3.1. List All System Permissions**
*   **Method & Path:** `GET /admin/permissions/` (also accessible via `/admin/permissions`)
*   **Description:** Retrieves a list of all available system permissions.
*   **Permissions Required:** `MANAGE_ROLES` (Note: `VIEW_PERMISSIONS` might be more semantically correct if it exists and is assigned appropriately).
*   **Success Response (200 OK):** `PermissionListResponseSchema` (nests `PermissionSchema`)
    ```json
    {
      "permissions": [ /* Array of PermissionSchema objects */ ]
    }
    ```
*   **Error Responses:**
    *   `500 Internal Server Error`. Schema: `ErrorResponseSchema`.

**7.4. Admin - Aircraft Management (`/admin/aircraft`)**
**File:** `src/routes/admin/aircraft_admin_routes.py`
These routes mirror the general `/api/aircraft` routes but are under the `/admin` prefix and uniformly require `MANAGE_AIRCRAFT` permission.

**7.4.1. List Aircraft (Admin)**
*   **Method & Path:** `GET /admin/aircraft/` (also accessible via `/admin/aircraft`)
*   **Permissions Required:** `MANAGE_AIRCRAFT`
*   **Query Parameters:** Supports filtering by `customer_id` (same incompatibility note as general aircraft list applies regarding the model).
*   **Success Response (200 OK):** `AdminAircraftListResponseSchema` (nests `AdminAircraftSchema`)

**7.4.2. Create Aircraft (Admin)**
*   **Method & Path:** `POST /admin/aircraft/` (also accessible via `/admin/aircraft`)
*   **Permissions Required:** `MANAGE_AIRCRAFT`
*   **Request Body Schema:** `AdminAircraftSchema`
    ```json
    {
      "tail_number": "N123ADMIN", // required
      "aircraft_type": "Admin Jet", // optional in schema, but service requires it
      "customer_id": 1            // optional, allow_none=True
      // "fuel_type" is missing from schema but required by backend service.
    }
    ```
*   **Success Response (201 Created):** `AdminAircraftSchema`
*   **Notes/Incompatibilities:**
    *   `AdminAircraftSchema` includes `customer_id`, but the backend `Aircraft` model does not.
    *   `AircraftService.create_aircraft` (which this route calls) requires `fuel_type`, which is missing from `AdminAircraftSchema`.
    *   **Action Required:** Align `AdminAircraftSchema`, `Aircraft` model, and `AircraftService.create_aircraft` regarding `customer_id` and ensure `fuel_type` is part of the creation schema/process.

**7.4.3. Get Aircraft Details (Admin)**
*   **Method & Path:** `GET /admin/aircraft/<string:tail_number>`
*   **Permissions Required:** `MANAGE_AIRCRAFT`
*   **Path Parameters:** `tail_number` (string)
*   **Success Response (200 OK):** `AdminAircraftSchema`

**7.4.4. Update Aircraft (Admin)**
*   **Method & Path:** `PATCH /admin/aircraft/<string:tail_number>`
*   **Permissions Required:** `MANAGE_AIRCRAFT`
*   **Path Parameters:** `tail_number` (string)
*   **Request Body Schema:** `AdminAircraftSchema` (for partial updates)
*   **Success Response (200 OK):** `AdminAircraftSchema`
*   **Notes/Incompatibilities:** `AdminAircraftSchema` includes `customer_id`. `AircraftService.update_aircraft` attempts to set `aircraft.customer_id`. This will fail if the `Aircraft` model is not updated to include `customer_id`.

**7.4.5. Delete Aircraft (Admin)**
*   **Method & Path:** `DELETE /admin/aircraft/<string:tail_number>`
*   **Permissions Required:** `MANAGE_AIRCRAFT`
*   **Path Parameters:** `tail_number` (string)
*   **Success Response (204 No Content):** Empty body.
*   **Notes/Incompatibilities:** Same cascade check concern as general aircraft delete.

**7.5. Admin - Customer Management (`/admin/customers`)**
**File:** `src/routes/admin/customer_admin_routes.py`
These routes mirror the general `/api/customers` routes but are under the `/admin` prefix and uniformly require `MANAGE_CUSTOMERS` permission.

**7.5.1. List Customers (Admin)**
*   **Method & Path:** `GET /admin/customers/` (also accessible via `/admin/customers`)
*   **Permissions Required:** `MANAGE_CUSTOMERS`
*   **Success Response (200 OK):** `AdminCustomerListResponseSchema` (nests `AdminCustomerSchema`)

**7.5.2. Create Customer (Admin)**
*   **Method & Path:** `POST /admin/customers/` (also accessible via `/admin/customers`)
*   **Permissions Required:** `MANAGE_CUSTOMERS`
*   **Request Body Schema:** `AdminCustomerSchema`
    ```json
    {
      "id": 1, // This is problematic for a CREATE schema, ID should be auto-generated.
      "name": "Admin Created Customer" // required
    }
    ```
*   **Success Response (201 Created):** `AdminCustomerSchema`
*   **Notes/Incompatibilities:**
    *   `AdminCustomerSchema` includes `id` as required, which is incorrect for a creation payload where ID is typically database-generated.
    *   Backend `Customer` model requires `email`. `CustomerService.create_customer` only processes `name`.
    *   **Action Required:**
        1.  Create a specific `AdminCustomerCreateSchema` without `id` and including `email` (required) and `phone` (optional).
        2.  Update `CustomerService.create_customer` to use these fields.

**7.5.3. Get Customer Details (Admin)**
*   **Method & Path:** `GET /admin/customers/<int:customer_id>`
*   **Permissions Required:** `MANAGE_CUSTOMERS`
*   **Path Parameters:** `customer_id` (integer)
*   **Success Response (200 OK):** `AdminCustomerSchema`

**7.5.4. Update Customer (Admin)**
*   **Method & Path:** `PATCH /admin/customers/<int:customer_id>`
*   **Permissions Required:** `MANAGE_CUSTOMERS`
*   **Path Parameters:** `customer_id` (integer)
*   **Request Body Schema:** `AdminCustomerSchema` (for partial updates)
*   **Success Response (200 OK):** `AdminCustomerSchema`
*   **Notes/Incompatibilities:** `AdminCustomerSchema` only allows updating `name` (and `id` which shouldn't be updatable). Needs alignment if `email`/`phone` should be updatable.

**7.5.5. Delete Customer (Admin)**
*   **Method & Path:** `DELETE /admin/customers/<int:customer_id>`
*   **Permissions Required:** `MANAGE_CUSTOMERS`
*   **Path Parameters:** `customer_id` (integer)
*   **Success Response (204 No Content):** Empty body.
*   **Notes/Incompatibilities:** Same cascade check concern as general customer delete.

**7.6. Admin - Assignment Settings (`/admin/assignment-settings`)**
**File:** `src/routes/admin/assignment_settings_routes.py`

**7.6.1. Get Assignment Settings**
*   **Method & Path:** `GET /admin/assignment-settings`
*   **Current Status:** **Deprecated**. The route returns a 404 with a deprecation message.
*   **Intended Description:** Was likely intended to manage global settings for auto-assigning LSTs or trucks.
*   **Permissions Required (Legacy):** `ADMIN` (role-based)
*   **Response (404 Not Found):**
    ```json
    {
      "error": "This feature has been deprecated. Global auto-assign setting is no longer used.",
      "code": "FEATURE_DEPRECATED"
    }
    ```
*   **Action Required:** Frontend should remove any UI or service calls related to this endpoint. Auto-assignment is now handled per-order by sending `-1` for LST/Truck IDs.

---

## Summary of Incompatibilities & Required Decisions/Actions

This section summarizes the key areas where the backend API and frontend expectations (or internal backend consistency) need alignment.

1.  **User Management Strategy (`/api/users` vs. `/api/admin/users`):**
    *   **Issue:** Duplicate functionality for user CRUD operations.
    *   **Decision Needed:** Consolidate to one set of endpoints (recommend `/api/admin/users` due to more detailed schemas) or clearly define separate use cases.
    *   **Action:** Refactor routes and frontend services based on the decision.

2.  **`Aircraft` Model and Schemas:**
    *   **Issue:** Backend `Aircraft` model is minimal. Frontend (`AircraftLookup`) and `AdminAircraftSchema` expect/include many more fields (owner, model, home base, MTOW, fuel capacity, FAA sync info, ownership change details). `AircraftCreateSchema` and `AdminAircraftSchema` are inconsistent with `AircraftService.create_aircraft` regarding `fuel_type` and `customer_id`.
    *   **Action (High Priority):**
        1.  **Redefine `Aircraft` Model:** Agree on a comprehensive set of fields for the `Aircraft` model in `src/models/aircraft.py`.
        2.  **Update Schemas:** Modify `AircraftCreateSchema`, `AircraftUpdateSchema`, `AircraftResponseSchema`, and `AdminAircraftSchema` in `src/schemas/aircraft_schemas.py` and `src/schemas/admin_schemas.py` to match the new model.
        3.  **Update Service:** Modify `AircraftService` methods in `src/services/aircraft_service.py` to correctly handle all fields from the new model and schemas.
        4.  **Frontend Alignment:** Update frontend services and components to use the new comprehensive aircraft data structure.

3.  **`Customer` Model and Schemas:**
    *   **Issue:** `CustomerCreateSchema` and `AdminCustomerSchema` (for creation) only define `name` (and `id` for admin, which is wrong for create). The `Customer` model requires `email`. `CustomerService.create_customer` only processes `name`. `CustomerUpdateSchema` only allows `name` updates.
    *   **Action Required:**
        1.  Update `CustomerCreateSchema` (and create `AdminCustomerCreateSchema` without `id`) to include `email` (required) and `phone` (optional).
        2.  Modify `CustomerService.create_customer` to handle `email` and `phone`.
        3.  Decide if `email` and `phone` are updatable; if so, update `CustomerUpdateSchema` (and `AdminCustomerSchema` for PATCH) and `CustomerService.update_customer`.

4.  **Fuel Order Creation - `location_on_ramp`:**
    *   **Issue:** Discrepancy in whether `location_on_ramp` is required.
    *   **Decision Needed:** Is it mandatory at creation?
    *   **Action:** Align schema and route validation.

5.  **Fuel Order Status Update - `assigned_truck_id`:**
    *   **Issue:** `PATCH /api/fuel-orders/<id>/status` requires `assigned_truck_id` in payload, which isn't always logical.
    *   **Decision Needed:** Make `assigned_truck_id` optional if not changing?
    *   **Action:** Modify backend route validation if made optional.

6.  **Deletion Integrity Checks (Cascade Prevention):**
    *   **Issue:** `Aircraft`, `Customer`, `FuelTruck` deletion endpoints do not check for existing references in `FuelOrder`.
    *   **Action Required:** Implement checks in backend services to return `409 Conflict` if entities are in use.

7.  **Pagination, Filtering, Sorting for List Endpoints:**
    *   **Issue:** Most GET list endpoints lack server-side pagination and advanced filtering/sorting.
    *   **Action Required:** Implement these features in backend services and routes for all relevant list endpoints. Update response schemas to include pagination metadata.

8.  **Admin User Detail Endpoint (`GET /admin/users/<id>`):**
    *   **Issue:** Currently commented out in the backend.
    *   **Decision Needed:** Is this specific admin endpoint required?
    *   **Action:** If yes, uncomment, test, document. If no, remove.

9.  **Permissions for List vs. Manage Operations:**
    *   **Issue:** Some admin GET list endpoints use `MANAGE_...` permissions.
    *   **Decision Needed:** Use `VIEW_...` for GET lists and `MANAGE_...` for CUD?
    *   **Action:** Update `@require_permission` decorators if changed.

10. **Frontend `CreateFuelOrderRequest` Field Alignment:**
    *   **Issue:** Mismatched field names/types (`aircraft_id` vs `tail_number`, `quantity` type, LST/Truck ID names).
    *   **Action Required:** Frontend service must send data matching backend schema expectations.

11. **Obsolete/Deprecated Endpoints:**
    *   **`/api/admin/assignment-settings`:** Confirmed deprecated. Frontend should remove calls.
    *   **`/api/orders/unassigned`, `/api/orders/{orderId}/accept`:** Not found in current backend. Frontend should remove calls.

12. **Default Role on User Registration:**
    *   **Issue:** Backend service defaults to `LST`, but tests expect `CSR`.
    *   **Decision Needed:** What is the correct default role for new user registrations via `/auth/register`?
    *   **Action:** Update `AuthService.register_user` and relevant tests.

By addressing these points, the frontend and backend can be more effectively integrated, leading to a more robust and maintainable application.