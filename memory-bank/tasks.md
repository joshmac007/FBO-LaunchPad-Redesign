### AI Agent Task: Implement Manual Receipt Creation System (Revised)

**Objective:** Implement a complete end-to-end workflow for manually creating a receipt. The process will be initiated by a single button click, which immediately creates a new, empty draft receipt and navigates the user to the editor. The editor must then allow for the entry of all necessary information, including customer selection, before proceeding with fee calculation and generation.

---

### **Phase 1: Backend Implementation**

#### **1. Objective: Ensure a Generic "Walk-in" Customer Exists**

*   **Context:** To create a receipt without user interaction, a default customer must be assigned immediately upon creation. A generic, seeded customer record is the cleanest way to satisfy the `customer_id` `NOT NULL` constraint on the `receipts` table. This work involves `backend/src/seeds.py`.
*   **Reasoning:** This prerequisite avoids a complex schema change (making `customer_id` nullable) and provides a standard placeholder that the frontend can use to identify a receipt that needs a real customer to be assigned.
*   **Expected Output:**
    1.  In `backend/src/seeds.py`, add a new definition to the `default_users` list (or a new list) for a system-level customer named "Walk-in Customer" with a predictable email like `walk-in@fbolaunchpad.com`.
    2.  Modify the seeding logic to ensure this customer is created if it does not already exist. It should be marked with a flag, e.g., `is_placeholder=True`, on the `Customer` model if such a flag exists, or one should be considered.
*   **Success Criteria:** After running the seed command (`flask seed run`), a `Customer` record for "Walk-in Customer" exists in the database and has a known, predictable ID (e.g., by querying for it by its unique email).

#### **2. Objective: Create the Unassigned Manual Draft Receipt Endpoint**

*   **Context:** This step creates a new, simplified API endpoint for generating a manual receipt without any initial data. The work will be centered in `backend/src/routes/receipt_routes.py` and `backend/src/services/receipt_service.py`.
*   **Reasoning:** This dedicated endpoint supports the new "one-click" creation flow from the frontend, removing the need for a customer selection dialog upfront.
*   **Expected Output:**
    1.  A new service method `create_unassigned_draft(self, user_id: int) -> Receipt` in `backend/src/services/receipt_service.py`. This method must:
        *   Query the database to find the ID of the "Walk-in Customer" created in the previous step.
        *   Create a new `Receipt` instance with `status='DRAFT'`, the `user_id` of the creator, and the `customer_id` of the "Walk-in Customer".
    2.  A new API route `POST /api/receipts/manual-draft-unassigned` in `backend/src/routes/receipt_routes.py`. This route must:
        *   Be protected by the `@require_permission_v2('create_receipt')` decorator.
        *   Take no request body.
        *   Call the new `receipt_service.create_unassigned_draft` method.
        *   Return the newly created receipt object with a `201 Created` status on success.
*   **Success Criteria:** Sending an authenticated `POST` request to `/api/receipts/manual-draft-unassigned` successfully creates a `Receipt` record assigned to the "Walk-in Customer".

#### **3. Objective: Enhance the Draft Update Logic for Manual Entry and Data Integrity**

*   **Context:** The existing `update_draft` logic needs to be extended to handle fields that are manually entered. This involves modifying `backend/src/schemas/receipt_schemas.py` and the `update_draft` method in `backend/src/services/receipt_service.py`.
*   **Reasoning:** This step is critical for allowing users to save their manually entered data, including selecting a real customer and inputting fuel details. It also incorporates a key data integrity check to prevent inconsistencies.
*   **Expected Output:**
    1.  In `backend/src/schemas/receipt_schemas.py`, modify the `UpdateDraftReceiptSchema` to include the following optional fields. Apply strict validation to prevent invalid data.
        *   `customer_id: fields.Integer(allow_none=True)` (This should already exist, ensure it's handled correctly).
        *   `aircraft_type_at_receipt_time: fields.String(allow_none=True)`
        *   `fuel_type_at_receipt_time: fields.String(allow_none=True)`
        *   `fuel_quantity_gallons_at_receipt_time: fields.Decimal(allow_none=True, validate=validate.Range(min=0))`
        *   `fuel_unit_price_at_receipt_time: fields.Decimal(allow_none=True, validate=validate.Range(min=0))`
    2.  In `backend/src/services/receipt_service.py`, modify the `update_draft` method to:
        *   Allow updates to all fields listed above.
        *   **Data Integrity Check:** Before applying updates, check if the receipt has any existing line items (`FEE`, `WAIVER`, `TAX`). If a fee-impacting field (like `fuel_quantity_gallons_at_receipt_time` or `customer_id`, which affects CAA status) is being changed, the method *must* delete all existing non-fuel line items to force a fee recalculation.
*   **Success Criteria:**
    *   A `PUT` request to `/api/receipts/<id>/draft` on a manual draft successfully updates all manually-entered fields, including the `customer_id`.
    *   If a fee-impacting field is updated on a receipt that already has line items, a subsequent `GET` request shows that the non-fuel line items have been removed.

---

### **Phase 2: Frontend Implementation**

#### **4. Objective: Implement the "Add Receipt" One-Click Creation Flow**

*   **Context:** This step implements the user's requested change to the UI. The "Add Receipt" button in `frontend/app/csr/receipts/page.tsx` will now directly create a draft and navigate to the editor.
*   **Reasoning:** This streamlines the user's initial action, making the process feel faster and moving data entry into a single, consistent context.
*   **Expected Output:**
    1.  A new function `createUnassignedDraftReceipt(): Promise<Receipt>` in `frontend/app/services/receipt-service.ts` that sends a `POST` request to the new `/api/receipts/manual-draft-unassigned` endpoint.
    2.  In `frontend/app/csr/receipts/page.tsx`, the "Add Receipt" button's `onClick` handler must be modified to:
        *   Call the `createUnassignedDraftReceipt` service function.
        *   On success, use the `useRouter` hook to navigate to `/csr/receipts/[id]`, using the ID from the API response.
        *   Display a loading indicator on the button while the API call is in progress.
*   **Success Criteria:** Clicking the "Add Receipt" button immediately initiates an API call, and upon success, the user is redirected to the editor page for the newly created draft receipt.

#### **5. Objective: Adapt `ReceiptWorkspace` to Handle Unassigned/Manual Receipts**

*   **Context:** This is the core frontend task. The editor at `frontend/app/csr/receipts/components/ReceiptWorkspace.tsx` and its children (`ReceiptHeader.tsx`, `ReceiptEditor.tsx`) must now support the new manual entry and customer selection workflow.
*   **Reasoning:** The UI must be context-aware to provide an intuitive editing experience, clearly indicating which fields require input and prompting for required data like the customer.
*   **Expected Output:**
    1.  In `ReceiptWorkspace.tsx`, introduce a top-level state or constant to identify the receipt type: `const isManualReceipt = receipt.fuel_order_id === null;`.
    2.  In `ReceiptHeader.tsx`, when `isManualReceipt` is `true`:
        *   Check if the `receipt.customer_id` corresponds to the seeded "Walk-in Customer".
        *   If it does, render the `CustomerSelector` component in place of the static customer name, prompting the user to select a customer.
        *   Once a customer is selected via the `CustomerSelector`, it must trigger the debounced auto-save to update the receipt's `customer_id`.
        *   Render the "Aircraft Type" field as an editable `<Input>` component.
    3.  In `ReceiptEditor.tsx`, when `isManualReceipt` is `true`, the "Fuel Details" card must render editable `<Input>` components for "Fuel Quantity (Gallons)" and "Price per Gallon".
    4.  All changes made in these new inputs must be managed by the `useReducer` state logic in `ReceiptWorkspace.tsx` and trigger the debounced auto-save.

    **Mermaid Flowchart: Frontend Component Interaction**
    ```mermaid
    graph TD
        A[User navigates to /csr/receipts/[id]] --> B{ReceiptWorkspace};
        B --> C{isManualReceipt?};
        C -- Yes --> D[Render editable fields in ReceiptHeader & ReceiptEditor];
        C -- No --> E[Render read-only fields];
        D --> F{Is customer a placeholder?};
        F -- Yes --> G[ReceiptHeader renders CustomerSelector];
        F -- No --> H[ReceiptHeader renders customer name];
        G --> I{User selects a customer};
        I --> J[Workspace state updates, triggers auto-save];
    ```
*   **Success Criteria:** When viewing a manual draft, the user is prompted to select a customer if one isn't already chosen. All manual entry fields are editable. The UI correctly distinguishes between a manual draft and an order-derived receipt.

#### **6. Objective: Refine User Flow for Calculation and Generation**

*   **Context:** This step ensures the workflow within the `ReceiptWorkspace.tsx` is intuitive for a manual receipt, providing clear feedback and preventing user error.
*   **Reasoning:** A guided workflow with clear feedback is essential, especially when certain actions are temporarily unavailable pending user input.
*   **Expected Output:**
    1.  The "Calculate Fees" button in `ReceiptWorkspace.tsx` must be disabled until all required fields for a manual receipt are filled out. This includes:
        *   A real customer (not the "Walk-in" placeholder).
        *   `aircraft_type_at_receipt_time`.
        *   `fuel_quantity_gallons_at_receipt_time`.
        *   `fuel_unit_price_at_receipt_time`.
    2.  Wrap the disabled "Calculate Fees" button in a `Tooltip` component that dynamically explains what information is missing (e.g., "Please select a customer and enter fuel details to calculate fees.").
    3.  The `onClick` handlers for the "Calculate Fees" and "Generate Receipt" buttons must set a loading state, which should render a spinner icon inside the button and disable it to prevent multiple clicks.
*   **Success Criteria:** The "Calculate Fees" button correctly enables/disables based on form completeness. Tooltips provide helpful guidance. Buttons show loading indicators during API calls, preventing duplicate submissions. The user is seamlessly guided from data entry to final receipt generation.

---

## Implementation Notes

### Phase 1: Backend Implementation

#### Task 1: Ensure Generic "Walk-in" Customer Exists
**Completed:** Modified `backend/src/seeds.py` to create a Walk-in Customer placeholder.

**Implementation Details:**
- Added `Customer` import to seeds.py imports
- Created `default_walk_in_customer` data structure with:
  - `name: 'Walk-in Customer'`
  - `email: 'walk-in@fbolaunchpad.com'`
  - `is_placeholder: True`
  - `is_caa_member: False`
- Added seeding logic in `seed_data()` function to create the Walk-in Customer if it doesn't exist
- The customer is created after default users but before fuel trucks

**Issues Encountered:** None. The Customer model already had an `is_placeholder` field which perfectly met the requirements.

#### Task 2: Create Unassigned Manual Draft Receipt Endpoint
**Completed:** Added new service method and API endpoint for creating manual draft receipts.

**Implementation Details:**
- **Service Layer (`backend/src/services/receipt_service.py`):**
  - Added `create_unassigned_draft(self, user_id: int) -> Receipt` method
  - Method queries for Walk-in Customer by email and `is_placeholder=True`
  - Creates Receipt with `fuel_order_id=None` and minimal initial data
  - All monetary fields default to `Decimal('0.00')`
  - Status set to `DRAFT`

- **API Layer (`backend/src/routes/receipt_routes.py`):**
  - Added `POST /api/receipts/manual-draft-unassigned` endpoint
  - Protected by `@require_permission_v2('create_receipt')` decorator
  - Takes no request body
  - Returns newly created receipt with 201 status
  - Proper error handling for authentication and service errors

**Issues Encountered:** None. The existing Receipt model structure supported all required fields.

#### Task 3: Enhance Draft Update Logic for Manual Entry and Data Integrity
**Completed:** Extended schema validation and service logic to handle manual entry fields with data integrity checks.

**Implementation Details:**
- **Schema Updates (`backend/src/schemas/receipt_schemas.py`):**
  - Added new fields to `UpdateDraftReceiptSchema`:
    - `aircraft_type_at_receipt_time: fields.String(allow_none=True)`
    - `fuel_type_at_receipt_time: fields.String(allow_none=True)`
    - `fuel_quantity_gallons_at_receipt_time: fields.Decimal(allow_none=True, validate=validate.Range(min=0))`
    - `fuel_unit_price_at_receipt_time: fields.Decimal(allow_none=True, validate=validate.Range(min=0))`

- **Service Logic (`backend/src/services/receipt_service.py`):**
  - Added data integrity check before applying updates
  - Fee-impacting fields: `customer_id`, `fuel_quantity_gallons_at_receipt_time`
  - When fee-impacting fields change, deletes existing non-fuel line items (FEE, WAIVER, TAX)
  - Added handling for all new manual entry fields
  - Automatic fuel subtotal recalculation when quantity or price changes
  - Creates/updates fuel line items as needed

**Issues Encountered:** None. The existing data model and validation framework handled the new fields well.

### Phase 2: Frontend Implementation

#### Task 4: Frontend Implementation - Add Receipt One-Click Creation Flow
**Completed:** Added "Add Receipt" button with one-click creation and navigation.

**Implementation Details:**
- **Service Layer (`frontend/app/services/receipt-service.ts`):**
  - Added `createUnassignedDraftReceipt(): Promise<Receipt>` function
  - Makes POST request to `/api/receipts/manual-draft-unassigned`
  - Returns Receipt interface type

- **UI Layer (`frontend/app/csr/receipts/page.tsx`):**
  - Added Plus icon import from lucide-react
  - Added `isCreatingReceipt` state for loading indicator
  - Added `handleAddReceipt` callback that:
    - Sets loading state
    - Calls service function
    - Navigates to new receipt editor on success
    - Shows success/error toasts
    - Clears loading state
  - Added "Add Receipt" button with loading indicator and proper styling

**Issues Encountered:** None. The existing UI patterns and service structure made this straightforward.

#### Task 5: Adapt ReceiptWorkspace to Handle Unassigned/Manual Receipts
**Completed:** Modified ReceiptWorkspace, ReceiptHeader, and ReceiptEditor components to support manual receipt creation.

**Implementation Details:**
- **ReceiptWorkspace (`frontend/app/csr/receipts/components/ReceiptWorkspace.tsx`):**
  - Added `isManualReceipt = receipt.fuel_order_id === null` logic
  - Added manual entry field handlers:
    - `handleFuelTypeChange`
    - `handleFuelQuantityChangeManual`
    - `handleFuelPriceChange`
  - Updated component prop passing to include manual receipt context
  - Added Tooltip imports for user guidance

- **ReceiptHeader (`frontend/app/csr/receipts/components/ReceiptHeader.tsx`):**
  - Added `isManualReceipt?: boolean` prop
  - Added Walk-in Customer detection logic
  - Conditionally renders CustomerSelector vs static customer display
  - Reorganized layout to show "Aircraft Information" vs "Fuel Order Information"
  - Made Aircraft Type field editable for manual receipts
  - Hides fuel order specific fields for manual receipts

- **ReceiptEditor (`frontend/app/csr/receipts/components/ReceiptEditor.tsx`):**
  - Added manual entry props:
    - `isManualReceipt?: boolean`
    - `onFuelTypeChange?: (fuelType: string) => void`
    - `onFuelQuantityChangeManual?: (quantity: string) => void`
    - `onFuelPriceChange?: (price: string) => void`
  - Conditional rendering of Fuel Details section:
    - Manual receipts: Show editable quantity, fuel type, price, and calculated subtotal
    - Order-based receipts: Show existing read-only display
  - Added proper input types and placeholders for manual entry

**Issues Encountered:** TypeScript type mismatches needed to be resolved, but the component architecture supported the new functionality well.

#### Task 6: Refine User Flow for Calculation and Generation
**Completed:** Added validation logic and tooltips to guide users through manual receipt completion.

**Implementation Details:**
- **Validation Logic (`frontend/app/csr/receipts/components/ReceiptWorkspace.tsx`):**
  - Added `getMissingRequiredFields()` function that checks:
    - Customer is not Walk-in placeholder
    - Aircraft type is provided
    - Fuel quantity is positive number
    - Fuel price is positive number
  - Updated `canCalculateFees` logic to require all fields for manual receipts
  - Added `missingFields` array to track incomplete requirements

- **User Interface Enhancements:**
  - Wrapped "Calculate Fees" button in TooltipProvider/Tooltip
  - Dynamically shows missing fields in tooltip when button is disabled
  - Added loading state preservation for both Calculate Fees and Generate Receipt buttons
  - Tooltip shows: "Please complete the following fields: customer, aircraft type, fuel quantity, fuel price"

**Issues Encountered:** Had to handle TypeScript type safety around nullable receipt properties and ensure proper null checking throughout the validation logic.

### General Implementation Notes

**Architecture Decisions:**
1. **Walk-in Customer Approach:** Used a seeded placeholder customer rather than making customer_id nullable, maintaining data integrity
2. **Field Naming Consistency:** Used existing `*_at_receipt_time` field naming convention for consistency
3. **Auto-save Integration:** All manual entry fields integrate with existing debounced auto-save mechanism
4. **Data Integrity:** Implemented automatic cleanup of fee line items when fee-impacting fields change

**Testing Considerations:**
- All new API endpoints follow existing authentication and permission patterns
- Frontend components maintain existing data-cy and data-testid attributes for testing
- Service functions include proper error handling and loading states

**Future Enhancements:**
- Customer email field could be added to ExtendedReceipt interface for more reliable Walk-in detection
- Additional validation could be added for fuel type against a predefined list
- Receipt templates could be enhanced to better display manual vs order-based receipts

**Code Quality:**
- Followed existing code patterns and conventions throughout
- Added comprehensive error handling and loading states
- Maintained backward compatibility with existing receipt workflows
- Used TypeScript strictly with proper interface definitions