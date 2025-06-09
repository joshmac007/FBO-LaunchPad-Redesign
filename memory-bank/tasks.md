
### **3. Implementation Plan (Tasks)**
---
# FBO Launchpad: Fueler System Implementation Plan (v2.0)

This plan prioritizes testing at critical failure points using backend integration tests (`pytest`) and comprehensive end-to-end tests (`Cypress`).

### Testing Strategy

Our testing philosophy is to validate the system at its most important integration points.
1.  **Backend Integration Tests (`pytest`):** Critical automated tests validating the API contract, business logic, race conditions, and data integrity.
2.  **End-to-End Tests (`Cypress`):** Ultimate confirmation of user workflows, including network failure simulations.

---

## Phase 1: Backend Development & Integration Testing (`pytest`)

**Objective:** Build and validate a secure, scalable, and correct backend API.

### 1.1: Core Implementation & Database
- [x] **Infrastructure:** Add `redis` service to `docker-compose.yml` and configure `Dockerfile` to use the `eventlet` worker class.
- [x] **Dependencies:** Add `flask-socketio`, `eventlet`, and `redis` to `requirements.txt`.
- [x] **Database:**
    - [x] Add `change_version: Integer` and `gallons_dispensed: Numeric` to the `FuelOrder` model.
    - [x] Generate and apply a single Alembic migration for both columns.
- [x] **Services & Routes:**
    - [x] Implement all new service methods in `fuel_order_service.py` (`claim_order`, `csr_update_order`, `acknowledge_order_change`, `complete_order_atomic`).
    - [x] Implement all new API routes (`/claim`, `/csr-update`, `/acknowledge-change`, `/submit-data-atomic`) and modify existing ones in `fuel_order_routes.py`.
- [x] **Event Logic:** Implement all WebSocket event emission logic within the service methods.
- [x] **Security:** Implement the custom `@require_permission_socket` decorator.

### 1.2: Critical Backend Test Points **NEXT**
- [X] **Test Point: Atomic Order Claiming (Race Condition)**
    - **Goal:** Verify that two users cannot claim the same order.
    - **Test:** Write a `pytest` integration test using `threading` to have two fuelers simultaneously send a claim request for the same order.
    - **Assert:** One request receives `200 OK`, the other receives `409 Conflict`.
- [X] **Test Point: Order Completion & Truck State Update (Atomicity)**
    - **Goal:** Verify that completing an order correctly updates the order and the fuel truck's meter in a single atomic transaction.
    - **Test:** Write a `pytest` integration test that calls `PUT /submit-data`.
    - **Assert (FuelOrder):** The order's `status`, `gallons_dispensed`, and meter readings are correct in the database.
    - **Assert (FuelTruck):** The truck's `current_meter_reading` is updated to the `end_meter_reading`.
- [X] **Test Point: CSR Update State Machine (Data Integrity)**
    - **Goal:** Verify that an in-progress order cannot be modified by a fueler while a CSR change is pending.
    - **Test:** Write a `pytest` integration test that simulates the full workflow:
        1. Claim an order as a fueler.
        2. As a CSR, send a `PATCH` to `/csr-update`. Assert `change_version` is incremented.
        3. As the fueler, attempt to update the order's status (e.g., to `COMPLETED`). **Assert** this request fails with `409 Conflict`.
        4. As the fueler, `POST` to `/acknowledge-change` with the correct `change_version`.
        5. Re-attempt the status update. **Assert** it now succeeds.
- [X] **Test Point: Server-Side Validation**
    - **Goal:** Verify the API rejects invalid data.
    - **Test:** Write a `pytest` test that sends a request to `PUT /submit-data` where `end_meter_reading` < `start_meter_reading`.
    - **Assert:** The API returns a `400 Bad Request`.

## Phase 2: Frontend Data Layer Development **COMPLETED**

**Objective:** Implement the `useRealtimeOrders` hook to manage all client-side state and resilience.

- [x] **Install Dependency:** Add `socket.io-client` to `frontend/package.json`.
- [x] **Implement Hook:** Create and implement the `useRealtimeOrders.ts` hook.
    - [x] Define the state, including Kanban columns, `connectionStatus`, and `actionQueue: Command[]`.
    - [x] Implement the `useReducer` logic for all actions (initial load, optimistic updates, sync success/failure).
    - [x] Implement the "Queued Actions Model" for handling `disconnect`/`reconnect` events and API failures.

## Phase 3: Frontend UI Development **COMPLETED**

**Objective:** Build all UI components and connect them to the data hook.

- [x] **Instrument UI for Testing:** Add `data-cy` attributes to key interactive elements (`kanban-column-*`, `order-card-*`, `claim-order-button-*`, `connection-status-banner`).
- [x] **Component Implementation:**
    - [x] Build `ConnectionStatusBanner.tsx`.
    - [x] Build `OrderCard.tsx` with visual states for "Queued" and "Sync Failed".
    - [x] Build `CompleteOrderDialog.tsx` with the real-time `gallons_dispensed` calculation.
- [x] **Dashboard Integration:**
    - [x] Refactor `dashboard/page.tsx` to use the `useRealtimeOrders` hook and render the Kanban board.
    - [x] Implement the "pull-to-refresh" gesture on the "Available Orders" column.
    - [x] Implement the high-contrast mode theme.
- [x] **Code Cleanup:**
    - [x] Delete obsolete page directories (`pending-orders/`, etc.).
    - [x] Update the `AppSidebar` navigation.

## Phase 4: Comprehensive End-to-End Testing (`Cypress`) **COMPLETED**

**Objective:** Validate complete user workflows across the entire system.

- [X] **Cypress Test: The "Happy Path" Fueling Workflow** ✅ `fueler-happy-path.cy.ts`
    - **Scenario:** A full order lifecycle.
    - **Assert:** Order cards move smoothly between columns as actions are performed. The completion dialog calculates gallons correctly.
    - **Additional Coverage:** Pull-to-refresh, order details display, high contrast mode toggle
- [X] **Cypress Test: The "Claim Race" Condition** ✅ `fueler-claim-race.cy.ts`
    - **Scenario:** Two fuelers attempt to claim the same order simultaneously.
    - **Assert:** One fueler "wins" and the order moves to their queue. The other fueler "loses," sees a conflict notification, and the order is removed from their available list.
    - **Additional Coverage:** Rapid successive claims, loading states, conflict notifications
- [X] **Cypress Test: The "CSR Update & LST Acknowledgement" Workflow** ✅ `fueler-csr-update-acknowledgement.cy.ts`
    - **Scenario:** A CSR updates an order that is already in progress.
    - **Assert:** The order card is highlighted, buttons are disabled, the "Acknowledge Change" button appears, and functionality is restored after acknowledgement.
    - **Additional Coverage:** Change version validation, updated order details display, WebSocket events
- [X] **Cypress Test: The "Network Interruption & Queued Action" Workflow** ✅ `fueler-network-interruption.cy.ts`
    - **Scenario:** The fueler's client loses connection, performs an action, and then reconnects.
    - **Steps:**
        1. Log in as a fueler.
        2. Use `cy.intercept()` to block API calls, simulating a network disconnect.
        3. Click "En Route" on an order.
        4. **Assert:** The card moves optimistically but displays a "Queued" badge. The `ConnectionStatusBanner` shows "Reconnecting... 1 action queued".
        5. Remove the `cy.intercept()` block to simulate the network returning.
        6. **Assert:** The banner disappears, the "Queued" badge is removed, and the order state is confirmed as "En Route".
    - **Additional Coverage:** Multiple queued actions, sync failures, retry functionality, order completion interruption, WebSocket disconnection, action persistence