### **AI Coder Task: Implement Client-First Draft Receipt Creation**

**Objective:**
Refactor the receipt creation workflow so that no database entry is made for a "Walk-in Customer" receipt until the user makes the first meaningful change. The frontend will manage a "virtual" draft, and the first save action will create the record, assign a number, and set its status to `GENERATED` in a single atomic operation.

---

### **Phase 1: Backend Modifications (API Enhancement)**

#### **Step 1: Create a New "Create and Save" Endpoint**

*   **Objective:** Implement a new, single endpoint that creates a receipt and saves its initial content simultaneously.
*   **Context:** The current `createUnassignedDraftReceipt` endpoint is insufficient as it creates an empty shell. We need a new endpoint, logically a `POST /api/receipts`, that accepts a payload with the initial content (e.g., the first line item, notes). This replaces the old workflow.
*   **Reasoning:** This endpoint is the new entry point for creating a receipt. It ensures that no empty, orphaned records are ever created. The creation is atomic, guaranteeing that a receipt is only saved if it has content.
*   **Expected Output:**
    *   A new route handler in `backend/src/routes/receipt_routes.py` for `POST /api/receipts`.
    *   A new service method in `backend/src/services/receipt_service.py` called `create_receipt_with_initial_data`. This method should:
        1.  Accept a payload containing initial data (e.g., customer, notes, line items).
        2.  Create the `Receipt` record.
        3.  Immediately assign a `receipt_number` using the existing `_generate_receipt_number` helper.
        4.  Set the `status` to `GENERATED`.
        5.  Create any associated `ReceiptLineItem` records from the payload.
        6.  Commit the entire operation as a single transaction.
        7.  Return the complete, newly created `Receipt` object, including its new `id` and `receipt_number`.
*   **Success Criteria:** Making a `POST` request to the new `/api/receipts` endpoint with a valid payload successfully creates a `GENERATED` receipt with a receipt number and all associated data in the database, and returns the new object.

#### **Step 2: Ensure `GENERATED` Receipts are Updatable**

*   **Objective:** Confirm that the backend allows edits to be saved to `GENERATED` receipts.
*   **Context:** This is a small but critical validation step. In our previous discussion, we identified the need to relax the status check in the update method. This step ensures that logic is in place.
*   **Reasoning:** After the first save (Step 1), the receipt's status will be `GENERATED`. All subsequent auto-saves will fail if the backend only allows updates to `DRAFT` receipts.
*   **Expected Output:**
    *   Verify or implement the change in `backend/src/services/receipt_service.py` within the `update_receipt` (or `update_draft`) method.
    *   The validation logic must be: `if receipt.status not in [ReceiptStatus.DRAFT, ReceiptStatus.GENERATED]: raise ValueError(...)`.
*   **Success Criteria:** A `PUT` request to `/api/receipts/<id>/draft` (or a similarly named update route) on a `GENERATED` receipt returns a 200 OK and successfully persists the changes.

---

### **Phase 2: Frontend Refactoring (State Management)**

#### **Step 3: Modify the "New Receipt" User Flow**

*   **Objective:** Change the "New Receipt" button to navigate to a special URL without creating a backend record.
*   **Context:** The "New Receipt" button in `frontend/app/csr/receipts/page.tsx` currently triggers `createUnassignedDraftReceipt` to get an ID. This must be changed.
*   **Reasoning:** This is the first step in moving the "draft" state to be client-side only. The application will now have a dedicated URL for composing a new, unsaved receipt.
*   **Expected Output:**
    *   The `onClick` handler for the "New Receipt" button in `frontend/app/csr/receipts/page.tsx` should be modified.
    *   Instead of calling an API, it should use the Next.js `router` to navigate directly to `/csr/receipts/new`.
*   **Success Criteria:** Clicking the "New Receipt" button changes the browser URL to `/csr/receipts/new` and does **not** make any API calls.

#### **Step 4: Adapt the Receipt Workspace to Handle a "New" State**

*   **Objective:** Refactor the main receipt page and its primary hook (`useReceipt`) to manage a "virtual" receipt that doesn't exist in the database yet.
*   **Context:** The component at `frontend/app/csr/receipts/[id]/page.tsx` and the hook in `frontend/app/csr/receipts/hooks/useReceipt.ts` are designed to work with a numeric `receiptId`. They must be updated to handle the special case where the ID is the string `"new"`.
*   **Reasoning:** This is the core of the frontend refactor. The UI needs to present a blank, editable receipt workspace that is initialized entirely on the client.
*   **Expected Output:**
    1.  In `frontend/app/csr/receipts/[id]/page.tsx`, use `useParams` to get the `id`. If `id === 'new'`, do not attempt to fetch data.
    2.  In `frontend/app/csr/receipts/hooks/useReceipt.ts`, modify the hook's initialization logic:
        *   If the `receiptId` is `"new"`, initialize the hook's internal state with a default, client-side `ExtendedReceipt` object. This object should have `id: null`, `status: 'DRAFT'`, default values for a "Walk-in Customer", and an empty `line_items` array.
        *   If the `receiptId` is a number, proceed with the existing `getReceiptById` fetching logic.
    3.  A Mermaid diagram visualizing this new initialization flow:
        ```mermaid
        graph TD
            A[Receipt Page Mounts] --> B{useReceipt(id) hook runs};
            B --> C{Is id === 'new'?};
            C -- Yes --> D[Initialize with default client-side Receipt object];
            C -- No --> E[Fetch receipt from API using getReceiptById(id)];
            D & E --> F[Render ReceiptWorkspace];
        ```
*   **Success Criteria:** Navigating to `/csr/receipts/new` successfully renders the `ReceiptWorkspace` with a blank form, and no initial `GET` request is made to the backend. Navigating to `/csr/receipts/123` still works as before.

#### **Step 5: Implement the New Three-Stage Auto-Save Logic**

*   **Objective:** Rework the auto-save functionality in the `useReceipt` hook to use the new "create and save" endpoint for the first save.
*   **Context:** The auto-save logic in `frontend/app/csr/receipts/hooks/useReceipt.ts` must be rewritten to handle three distinct states: an unsaved new draft, a saved draft, and subsequent updates.
*   **Reasoning:** This final step connects the client-side state management to the new backend API, completing the workflow.
*   **Expected Output:**
    *   The auto-save `useEffect` in `useReceipt.ts` will contain this new conditional logic:
        1.  **If `receipt.id` is `null` (or falsy):** This is the first save. Call the new `POST /api/receipts` endpoint (from Step 1) with the current state of the virtual receipt.
        2.  **On success of the first save:**
            *   Update the hook's internal state with the complete receipt object returned from the backend (which now includes the new `id` and `receipt_number`).
            *   Use the Next.js `router.replace()` method to update the browser's URL from `/csr/receipts/new` to `/csr/receipts/[newId]` without adding to the history stack.
        3.  **If `receipt.id` exists:** This is a subsequent save. Use the existing `updateReceipt` API call (`PUT /api/receipts/<id>/draft`).
*   **Success Criteria:**
    *   Adding the first line item to a new receipt triggers a `POST` request.
    *   The browser URL transparently updates to reflect the new receipt's ID.
    *   Adding a second line item triggers a `PUT` request to the correct ID.
    *   The entire process feels seamless to the user.

---

## Implementation Notes

### Step 1: Create new "Create and Save" endpoint (POST /api/receipts)

**Implementation Details:**
- Added new service method `create_receipt_with_initial_data` in `backend/src/services/receipt_service.py` (lines 791-885)
- Method creates receipt with GENERATED status and assigns receipt number atomically
- Validates customer exists and requires at least one line item
- Includes proper error handling and database rollback
- Added comprehensive tests in `backend/tests/services/test_receipt_service.py` (lines 871-953)
- Created new schema `CreateReceiptWithInitialDataSchema` in `backend/src/schemas/receipt_schemas.py` (lines 57-95)
- Added new route `POST /api/receipts` in `backend/src/routes/receipt_routes.py` (lines 173-246)

**Key Features:**
- Atomic transaction ensures receipt is only created if it has content
- Automatically assigns receipt number using existing `_generate_receipt_number` helper
- Sets status to GENERATED immediately to skip empty draft state
- Comprehensive validation of customer and line items
- Returns complete receipt object with line items

**Issues Encountered:**
- Initial test setup required proper Flask application context
- Fixed test mocking to use `patch.object(Customer, 'query')` instead of string path
- Updated test assertions to match validation order (line items checked before customer)

### Step 2: Ensure GENERATED receipts are updatable

**Implementation Details:**
- Modified `update_draft` method in `backend/src/services/receipt_service.py` (line 272)
- Changed status validation from `receipt.status != ReceiptStatus.DRAFT` to `receipt.status not in [ReceiptStatus.DRAFT, ReceiptStatus.GENERATED]`
- This allows the auto-save functionality to work with receipts that have been generated from the new workflow

**Reasoning:**
- After first save, receipt status becomes GENERATED
- Subsequent auto-saves would fail if only DRAFT status was allowed
- This change maintains data integrity while supporting the new client-first workflow

### Step 3: Modify "New Receipt" button to navigate without API call

**Implementation Details:**
- Updated `handleAddReceipt` function in `frontend/app/csr/receipts/page.tsx` (lines 167-169)
- Removed `createUnassignedDraftReceipt` API call
- Simplified to direct navigation: `router.push('/csr/receipts/new')`
- Removed `isCreatingReceipt` state and loading UI
- Updated button to remove loading states and disabled condition

**Benefits:**
- Eliminates empty database records
- Faster user experience (no API call delay)
- Cleaner state management

### Step 4: Adapt Receipt Workspace to handle "new" state

**Implementation Details:**
- Modified receipt page `frontend/app/csr/receipts/[id]/page.tsx` (lines 30-59)
- Added special case handling for `id === 'new'`
- Creates default client-side receipt object with `id: null`
- Updated `useReceipt` hook in `frontend/app/csr/receipts/hooks/useReceipt.ts`:
  - Changed parameter type from `number` to `number | null` (line 107)
  - Added default receipt creation logic (lines 119-146)
  - Set default customer to Walk-in Customer (ID 100)
- Updated `ReceiptWorkspace` component to accept `number | null` (line 18)

**Default Receipt Structure:**
- `id: null` indicates unsaved state
- `status: 'DRAFT'` for editing
- `customer_id: 100` defaults to Walk-in Customer
- All monetary fields initialized to '0.00'
- Empty line_items array

### Step 5: Implement three-stage auto-save logic

**Implementation Details:**
- Completely rewrote auto-save effect in `useReceipt` hook (lines 185-254)
- Added new `createReceiptWithInitialData` function to receipt service (lines 657-682)

**Three-Stage Logic:**
1. **First Save (receipt.id === null):**
   - Calls new `POST /api/receipts` endpoint
   - Creates dummy line item if none exist to satisfy backend requirement
   - Updates browser URL using `window.history.replaceState()`
   - Sets receipt status to GENERATED with assigned number

2. **Subsequent Saves (receipt.id exists):**
   - Uses existing `updateDraftReceipt` function
   - Updates GENERATED receipts (enabled by Step 2)

3. **URL Management:**
   - Seamlessly transitions from `/csr/receipts/new` to `/csr/receipts/{id}`
   - User experience feels continuous

**Function Updates:**
- Updated all handler functions to check for `receiptId === null`
- Functions like `handleToggleWaiver`, `handleGenerateReceipt`, etc. now return early if no receipt ID
- Maintains proper functionality for both new and existing receipts

**Backend Integration:**
- Added `createReceiptWithInitialData` function to frontend receipt service
- Function calls new `POST /api/receipts` endpoint
- Properly typed interface for initial data payload
- Returns ExtendedReceipt type for consistency

**Error Handling:**
- Maintains existing error handling patterns
- Auto-save errors properly dispatched to reducer
- Graceful fallback if URL update fails

### Overall Architecture Changes

**Client-First Philosophy:**
- Receipts now start as virtual client-side objects
- No database persistence until meaningful content is added
- Eliminates orphaned empty records

**State Management:**
- useReceipt hook handles both new and existing receipt states
- Proper type safety with `number | null` for receipt IDs
- Maintains existing optimistic update patterns

**URL Management:**
- Clean transition from `/new` to `/{id}` route
- Browser history properly managed
- No additional navigation or page reloads

**Testing Coverage:**
- Added comprehensive tests for new service method
- Tests cover success cases, validation errors, and edge cases
- Proper mocking of database operations and auth context

**Backward Compatibility:**
- Existing receipt editing functionality unchanged
- All existing API endpoints remain functional
- Progressive enhancement approach

### Updated Implementation (Flexibility Enhancement)

**Backend Changes:**
- Modified `create_receipt_with_initial_data` to accept any meaningful data, not require line items
- Line items are now optional in schema and service method
- Meaningful data includes: notes, aircraft type, fuel type, fuel quantity, fuel price, or line items
- Updated validation logic to check for any of these fields rather than requiring line items
- Added comprehensive test coverage for different meaningful data scenarios

**Frontend Changes:**
- Removed dummy line item creation logic from `useReceipt.ts`
- Updated service interface to make `line_items` optional
- Auto-save now triggers on any meaningful change, not just line item addition
- Maintains same three-stage workflow but with more flexible triggering

**Benefits:**
- More natural user experience - any field change can trigger first save
- No artificial line item requirements
- Flexible receipt creation based on actual user input
- Maintains data integrity while being more permissive