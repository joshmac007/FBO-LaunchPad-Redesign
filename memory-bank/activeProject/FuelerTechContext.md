### **2. Technical Context (Technical Specification)**
---
## **Technical Specification: Fueler System v2.0**

**Version:** 2.0
**Status:** Approved for Implementation
**Date:** June 9, 2025

### 1. System Architecture

The Fueler System will be implemented using a real-time, event-driven architecture. The server is the single source of truth.

*   **Frontend:** A single-page application (SPA) within the existing Next.js framework. State will be managed by a `useRealtimeOrders` hook leveraging `useReducer`.
*   **Backend:** The Flask backend will be extended with **Flask-SocketIO**. The Gunicorn server **must** be configured to use the `eventlet` asynchronous worker class.
*   **Message Queue:** A **Redis** service will act as the message queue backend for Flask-SocketIO, enabling horizontal scaling.

### 2. Backend Implementation Details

#### 2.1. Database Model Modifications (`FuelOrder`)
*   **File:** `backend/src/models/fuel_order.py`
*   An Alembic migration must be created to add the following columns:
    ```python
    # Stores the version of the last CSR-initiated change.
    change_version = db.Column(db.Integer, nullable=False, default=0, server_default='0')
    # Stores the final authoritative amount of fuel dispensed.
    gallons_dispensed = db.Column(db.Numeric(10, 2), nullable=True)
    ```

#### 2.2. API Endpoint Modifications & Additions
*   **`PATCH /api/fuel-orders/<id>/status` (Claim / Update Status):**
    *   Must perform an **atomic update** when claiming an unassigned order to prevent race conditions (return `409 Conflict` on failure).
    *   Must reject any status update with a `409 Conflict` if the order has a pending, unacknowledged CSR change.
*   **`PATCH /api/fuel-orders/<id>/csr-update` (New Endpoint):**
    *   Protected by `edit_fuel_order` permission.
    *   Increments the `change_version` of the `FuelOrder` record.
    *   Emits a targeted `order_details_updated` WebSocket event.
*   **`POST /api/fuel-orders/<id>/acknowledge-change` (New Endpoint):**
    *   Request body must contain `{"change_version": <int>}`.
    *   Backend validates that the received `change_version` matches the order's current `change_version`. Fails with `409 Conflict` if mismatched.
    *   On success, resets any pending state flags and logs the acknowledgement.
*   **`PUT /api/fuel-orders/<id>/submit-data` (Complete Order):**
    *   The service method **must** wrap the following operations in a **single database transaction**:
        1.  Validate that `end_meter_reading >= start_meter_reading`.
        2.  Calculate `gallons_dispensed`.
        3.  Update the `FuelOrder` record with meter readings, `gallons_dispensed`, and set status to `COMPLETED`.
        4.  Update the `current_meter_reading` on the associated `FuelTruck` record.
    *   If any step fails, the entire transaction must be rolled back.

#### 2.3. WebSocket Infrastructure
*   A custom decorator, `@require_permission_socket('access_fueler_dashboard')`, will secure the `on_connect` event handler.
*   **Event Emission Logic:**
    *   `new_unclaimed_order`: On creation of an unassigned order, broadcast to a randomized subset of connected fuelers to manage load.
    *   All other events (`order_claimed`, `order_update`, etc.) will be targeted to specific rooms (`csr_room`, `user_{id}`) for efficiency.

### 3. Frontend Implementation Details

#### 3.1. State Management (`useRealtimeOrders.ts` Hook)
*   **State Interface:** The `useReducer` state will include:
    ```typescript
    interface OrdersState {
      // ...kanban column arrays...
      connectionStatus: 'CONNECTED' | 'RECONNECTING';
      actionQueue: Command[]; // Queue of actions pending sync
      isLoading: boolean;
    }
    ```
*   **Queued Actions Model:**
    1.  UI components dispatch serializable command objects (e.g., `{ type: 'COMPLETE_ORDER', payload: { orderId: 123, ... } }`).
    2.  The reducer optimistically updates the UI state and adds the command to the `actionQueue`.
    3.  A separate effect attempts to sync commands from the queue with the API.
    4.  On API failure, the command remains in the queue. The UI reflects this with "Queued" badges.
    5.  On reconnection, the sync effect is re-triggered.
    6.  On permanent failure (e.g., `4xx` response), a `SYNC_FAILED` action is dispatched. The reducer reverts the optimistic UI change and adds an error flag to the specific order.

#### 3.2. UI Components
*   **`dashboard/page.tsx`:** Refactored to be a single-page Kanban board driven by the `useRealtimeOrders` hook.
*   **`OrderCard.tsx`:** Will render different visual states based on the order's data, including "Queued" and "Sync Failed" badges.
*   **`CompleteOrderDialog.tsx`:** Will contain a read-only field that re-renders on every keystroke in the meter reading inputs to show the calculated dispensed amount.
*   **`ConnectionStatusBanner.tsx`:** A global banner displaying connection status and the number of items in the `actionQueue`.
*   **UI Controls:**
    *   A **pull-to-refresh** gesture will be implemented on the "Available Orders" list.
    *   A **high-contrast mode** will be implemented via CSS variables or a separate theme file.

***
