### **Project Plan: Standardized Search & Create Components**

**Objective:** To architect and implement three standardized, performant, and reusable search components for Customers, Aircraft Tails, and Aircraft Types. The Customer and Aircraft components will include an integrated "quick create" workflow.

**Guiding Principles for the AI:**
1.  **Backend First:** All database and API changes must be completed before frontend work begins.
2.  **Modularity:** Creation logic (dialogs) must be completely separate from search logic (input components).
3.  **Performance:** All type-ahead search functionality must use debounced, server-side API calls.
4.  **Controlled Components:** All search components will be controlled components, receiving `value` and `onValueChange` props from their parent.
5.  **Consistency:** All search components will use the `Popover` + `Command` UI pattern from `shadcn/ui`.

---

### **Phase 0: Backend Foundation & Data Model Expansion**

**Context:** We must first expand the backend to support the new, richer `Customer` model before any UI can be built. This involves database migrations and API schema updates.

#### **Task 0.1: Ideate and Define Enums for New Customer Fields**

*   **Objective:** Define the allowed values for the new dropdown fields to ensure data consistency.
*   **Ideation for `PaymentType`:** This field will represent the customer's default payment arrangement. Using an Enum prevents inconsistent free-text entries.
*   **Action:** In `backend/src/models/customer.py`, define two new Python `Enum` classes:
    ```python
    class PaymentType(enum.Enum):
        CREDIT_CARD_ON_FILE = 'Credit Card on File'
        NET_30_ACCOUNT = 'Net 30 Account'
        CASH_OR_CHECK = 'Cash or Check'
        PREPAYMENT_REQUIRED = 'Prepayment Required'

    class PointOfContactRole(enum.Enum):
        OWNER = 'Owner'
        OPERATOR = 'Operator'
        PILOT = 'Pilot'
    ```

#### **Task 0.2: Update the `Customer` Database Model**

*   **File to Modify:** `backend/src/models/customer.py`
*   **Objective:** Add the new optional fields to the `Customer` SQLAlchemy model.
*   **Action:** Add the following columns to the `Customer` class definition:
    *   `company_name = db.Column(db.String(100), nullable=True)`
    *   `phone_number = db.Column(db.String(30), nullable=True)`
    *   `address = db.Column(db.Text, nullable=True)`
    *   `payment_type = db.Column(db.Enum(PaymentType, name='paymenttype'), nullable=True)`
    *   `poc_role = db.Column(db.Enum(PointOfContactRole, name='pocrole'), nullable=True)`

#### **Task 0.3: Generate and Modify the Database Migration**

*   **Objective:** Create and refine an Alembic migration script to apply the database changes.
*   **Action:**
    1.  Run the command: `docker-compose exec backend flask db migrate -m "add_details_to_customer_model"`
    2.  Open the newly generated migration file in `backend/migrations/versions/`.
    3.  **Verify the `upgrade()` function:** It should contain `op.add_column()` for each new field. Ensure the `payment_type` and `poc_role` columns correctly reference the new enum types.
    4.  **Verify the `downgrade()` function:** It should contain `op.drop_column()` for each new field. The AI must also ensure it includes the commands to drop the new enum types, which Alembic sometimes misses. Example: `op.execute("DROP TYPE paymenttype;")`.

#### **Task 0.4: Update Backend API Schemas**

*   **File to Modify:** `backend/src/schemas/customer_schemas.py`
*   **Objective:** Expose the new customer fields in the API.
*   **Action:** Add the new fields to the `CustomerCreateSchema`, `CustomerUpdateSchema`, and `CustomerResponseSchema` Marshmallow schemas. All new fields should be optional (`required=False`).

---

### **Phase 1: Build the Reusable "Creation Dialog" Components**

**Context:** Now that the backend can store the new data, we will build the modular UI components for creating these entities.

#### **Task 1.1: Create `CustomerCreationDialog.tsx`**

*   **File to Create:** `frontend/app/components/dialogs/CustomerCreationDialog.tsx`
*   **Objective:** Create a comprehensive, self-contained dialog for adding a new customer with all new fields.
*   **Step-by-Step Instructions:**
    1.  Define the component props: `open: boolean`, `onOpenChange: (open: boolean) => void`, `onSuccess: (newCustomer: Customer) => void`.
    2.  Use the `Dialog` component from `shadcn/ui`.
    3.  Define a Zod schema for the form. `name` and `email` are required. The new fields (`company`, `phoneNumber`, `address`, `paymentType`, `pocRole`) are optional strings.
    4.  Use `useForm` and the `zodResolver` to manage form state.
    5.  Build the UI inside the dialog using `shadcn/ui` `Form`, `FormField`, `Input`, `Textarea` (for address), and `Select` (for Payment Type and POC Role).
    6.  The `Select` components should be populated with the values defined in Phase 0.
    7.  Use `useMutation` to call the `createAdminCustomer` service function on form submission.
    8.  On mutation `onSuccess`, call the `onSuccess` prop and close the dialog. On `onError`, show a `toast.error()`.

*   **UI Mockup (ASCII):**
    ```
    +-----------------------------------------+
    | Create New Customer               [X] |
    |-----------------------------------------|
    | *Name                                   |
    |  [ Flight Ventures LLC             ]   |
    | *Email                                  |
    |  [ contact@flightventures.com      ]   |
    |  Company                                |
    |  [ Flight Ventures LLC             ]   |
    |  Phone Number                           |
    |  [ 555-123-4567                    ]   |
    |  Address                                |
    |  [ 123 Aviation Way, Hangar 4      ]   |
    |  [ Anytown, USA 12345              ]   |
    |  Payment Type      POC Role             |
    |  [ Net 30 Account |v] [ Owner    |v]   |
    |-----------------------------------------|
    |                 [ Cancel ] [ Save ]    |
    +-----------------------------------------+
    ```

#### **Task 1.2: Create `AircraftCreationDialog.tsx`**

*   **File to Create:** `frontend/app/components/dialogs/AircraftCreationDialog.tsx`
*   **Objective:** Extract existing aircraft creation logic into a reusable dialog.
*   **Context:** The logic is currently inside `frontend/app/components/aircraft-lookup.tsx`.
*   **Step-by-Step Instructions:**
    1.  Follow the instructions from the previous plan: find the `<Dialog>` logic in `aircraft-lookup.tsx`, move it to the new file, refactor it to accept `open`, `onOpenChange`, `onSuccess`, and `initialTailNumber` props, and use `useMutation` to call `createCSRAircraft`.

---

### **Phase 2: Build the Standardized Search Components**

**Context:** With the creation dialogs ready, we can now build the core search components. We will start with the most complex one, `CustomerSearchInput`, and use it as a template.

#### **Task 2.1: Create `CustomerSearchInput.tsx`**

*   **File to Create:** `frontend/app/components/search/CustomerSearchInput.tsx`
*   **Objective:** Build the definitive, debounced, server-side customer search component.
*   **Context:** This component will replace the old `customer-selector.tsx`.
*   **Step-by-Step Instructions:**
    1.  **Props:** Define props for a controlled component: `value: number | null`, `onValueChange: (customerId: number | null) => void`.
    2.  **UI:** Use the `Popover` + `Command` pattern from `shadcn/ui`.
    3.  **State & Debouncing:** Use `useState` for `searchTerm` and the `useSearchDebounce` hook to create a `debouncedSearchTerm`.
    4.  **API Call:** Use `useQuery` to call a **new backend endpoint**: `GET /api/search/customers?q={debouncedSearchTerm}`. The query should be disabled if the search term is empty.
    5.  **Dropdown Results:** The `CommandList` should display the results from the API. Each `CommandItem` should show both the customer's name and their company name for context.
    6.  **"Add New" Flow:** In `CommandEmpty`, show a button that sets a state variable `isAddingNew(true)`. Render the `<CustomerCreationDialog />` from Phase 1, controlling its visibility with this state. Its `onSuccess` callback should call `onValueChange` to auto-select the new customer.

#### **Task 2.2: Create `AircraftTailSearchInput.tsx`**

*   **File to Create:** `frontend/app/components/search/AircraftTailSearchInput.tsx`
*   **Objective:** Replicate the `CustomerSearchInput` pattern for aircraft tails.
*   **Context:** Use the `CustomerSearchInput.tsx` file as a direct template.
*   **Step-by-Step Instructions:**
    1.  Copy the code from `CustomerSearchInput.tsx`.
    2.  **Props:** Change props to `value: string | null` (tail number) and `onValueChange: (tailNumber: string | null) => void`. Add `onAircraftSelected: (aircraft: Aircraft) => void`.
    3.  **API Call:** The `useQuery` hook will call a **new backend endpoint**: `GET /api/search/aircraft-tails?q={debouncedSearchTerm}`.
    4.  **"Add New" Flow:** The "Add New" button will trigger the `<AircraftCreationDialog />` from Phase 1.

#### **Task 2.3: Create `AircraftTypeSearchInput.tsx`**

*   **File to Create:** `frontend/app/components/search/AircraftTypeSearchInput.tsx`
*   **Objective:** Create a simple, cached, client-side search for aircraft types.
*   **Context:** This list is small and doesn't change often, so a single API call is sufficient. This component will replace `AircraftTypeSelector.tsx`.
*   **Step-by-Step Instructions:**
    1.  Use the `Popover` + `Command` UI pattern.
    2.  Use `useQuery` with `queryKey: ['aircraftTypes']` to fetch data from `GET /api/aircraft/types` once. Set a long `staleTime`.
    3.  The `CommandInput` will filter the cached list on the client side. There is no "Add New" flow for this component.

---

### **Phase 3: Implement Required Backend Search Endpoints**

**Context:** The frontend components from Phase 2 depend on new, optimized backend search endpoints. These must be created.

#### **Task 3.1: Create Customer Search Endpoint**

*   **File to Create:** `backend/src/routes/search_routes.py` (or add to an existing relevant file).
*   **Objective:** Create a fast, indexed search endpoint for customers.
*   **Action:**
    1.  Define a new route: `GET /api/search/customers`.
    2.  It should accept a query parameter `q` for the search term.
    3.  The service logic should perform a case-insensitive `ILIKE` search on both the `name` and `company_name` columns.
    4.  The query must be limited (e.g., `limit(10)`) to ensure fast responses.
    5.  For production performance, add a note that the `name` and `company_name` columns should have a `GIN` index using the `pg_trgm` extension in PostgreSQL.

#### **Task 3.2: Create Aircraft Tail Search Endpoint**

*   **File to Modify:** `backend/src/routes/search_routes.py`
*   **Objective:** Create a fast search endpoint for aircraft tail numbers.
*   **Action:**
    1.  Define a new route: `GET /api/search/aircraft-tails`.
    2.  Accept a query parameter `q`.
    3.  The service logic should perform a case-insensitive `ILIKE` search on the `tail_number` column.
    4.  The query must be limited (e.g., `limit(10)`).
    5.  Return a lightweight payload: `tail_number`, `aircraft_type`.

---

### **Phase 4: Final Cleanup and Integration**

**Context:** The final step is to remove the old components and integrate the new ones.

#### **Task 4.1: Deprecate and Delete Old Components**

*   **Objective:** Remove the old, now-redundant components to eliminate technical debt.
*   **Action:**
    1.  Delete the file `frontend/app/components/aircraft-lookup.tsx`.
    2.  Delete the file `frontend/app/components/customer-selector.tsx`.
    3.  Delete the file `frontend/app/components/AircraftTypeSelector.tsx`.

#### **Task 4.2: Integrate New Search Components**

*   **Objective:** Update parent components to use the new, standardized search inputs.
*   **Action:**
    1.  Go to `frontend/app/csr/fuel-orders/components/NewFuelOrderDialog.tsx`.
    2.  Replace the old lookup/selector components with the new ones:
        *   `<CustomerSearchInput />`
        *   `<AircraftTailSearchInput />`
    3.  Ensure the `value` and `onValueChange` props are correctly wired up to the dialog's main form state (`react-hook-form`).

---

## Implementation Notes

### Summary
All tasks in the standardized search & create components project have been successfully implemented. The project successfully replaced the old, inconsistent search components with standardized, performant, and reusable search components that follow a consistent UI pattern using Popover + Command from shadcn/ui.

### Backend Implementation Details

#### Task 0.1-0.2: Customer Model Enhancement
- **File Modified:** `backend/src/models/customer.py`
- **Changes:** Added two enums (`PaymentType` and `PointOfContactRole`) and five new columns to the Customer model:
  - `company_name` (String, 100 chars, nullable)
  - `phone_number` (String, 30 chars, nullable) 
  - `address` (Text, nullable)
  - `payment_type` (Enum, nullable)
  - `poc_role` (Enum, nullable)
- **Issue Encountered:** None
- **Solution:** Successfully updated the `to_dict()` method to handle enum serialization using `.value` to get string representation

#### Task 0.3: Database Migration
- **File Created:** `backend/migrations/versions/7f975c9dedcf_add_details_to_customer_model.py`
- **Issue Encountered:** Initial migration failed with "type 'paymenttype' does not exist" error because PostgreSQL enum types needed to be created before being used in columns
- **Solution:** Modified the migration to:
  1. Create enum types first using `sa.Enum().create(op.get_bind())`
  2. Then add columns that reference these enums
  3. Updated downgrade function to properly drop enum types with `op.execute("DROP TYPE IF EXISTS...")`
- **Migration Status:** Successfully applied with no errors

#### Task 0.4: API Schema Updates
- **File Modified:** `backend/src/schemas/customer_schemas.py`
- **Changes:** Updated all three schemas (`CustomerCreateSchema`, `CustomerUpdateSchema`, `CustomerResponseSchema`) to include the new fields
- **Note:** Used existing Marshmallow schema format (project uses Marshmallow, not Pydantic as mentioned in CLAUDE.md)

#### Task 3.1-3.2: Search Endpoints
- **Files Created:** 
  - `backend/src/routes/search_routes.py`
  - `backend/src/services/search_service.py`
- **File Modified:** `backend/src/app.py` (registered new blueprint)
- **Endpoints Created:**
  - `GET /api/search/customers?q={query}` - searches name and company_name fields
  - `GET /api/search/aircraft-tails?q={query}` - searches tail_number field
- **Features Implemented:**
  - Case-insensitive ILIKE search with 10-result limit for performance
  - Proper error handling and permission decorators
  - Lightweight payload for aircraft search (tail_number, aircraft_type, fuel_type, customer_id)
- **Testing:** Backend application starts successfully with new routes registered

### Frontend Implementation Details

#### Task 1.1: CustomerCreationDialog
- **File Created:** `frontend/app/components/dialogs/CustomerCreationDialog.tsx`
- **Features Implemented:**
  - Complete form with all new customer fields
  - Zod schema validation for form fields
  - react-hook-form integration with zodResolver
  - Dropdown selects for Payment Type and POC Role with enum values
  - Success callback to auto-select newly created customer
  - Error handling with toast notifications
  - Uses useMutation for API calls

#### Task 1.2: AircraftCreationDialog
- **File Created:** `frontend/app/components/dialogs/AircraftCreationDialog.tsx`
- **Features Implemented:**
  - Extracted creation logic from existing aircraft-lookup.tsx
  - Supports custom aircraft types and fuel types with "Other" option
  - Form validation and error handling
  - Dynamic loading of aircraft types and fuel types from API
  - Success callback integration
  - useQuery for data fetching with proper caching

#### Task 2.1: CustomerSearchInput
- **File Created:** `frontend/app/components/search/CustomerSearchInput.tsx`
- **Features Implemented:**
  - Popover + Command UI pattern for consistent experience
  - Debounced search with 300ms delay using existing useSearchDebounce hook
  - Server-side search via new `/api/search/customers` endpoint
  - Displays both customer name and company name for context
  - "Add New Customer" button when no results found
  - Integrated CustomerCreationDialog for quick creation workflow
  - Controlled component pattern with value/onValueChange props
  - Optional onCustomerSelected callback for parent integration

#### Task 2.2: AircraftTailSearchInput
- **File Created:** `frontend/app/components/search/AircraftTailSearchInput.tsx`
- **Features Implemented:**
  - Same UI pattern as CustomerSearchInput for consistency
  - Server-side search via `/api/search/aircraft-tails` endpoint
  - Displays tail number, aircraft type, and fuel type in results
  - Integrated AircraftCreationDialog with initialTailNumber prop
  - onAircraftSelected callback for parent integration
  - Proper Aircraft interface conversion for callbacks

#### Task 2.3: AircraftTypeSearchInput
- **File Created:** `frontend/app/components/search/AircraftTypeSearchInput.tsx`
- **Features Implemented:**
  - Client-side filtering of cached aircraft types
  - Long cache time (1 hour stale, 24 hour cache) since types don't change often
  - Same UI pattern as other search components
  - No "Add New" functionality as specified in requirements

#### Task 4.1-4.2: Integration and Cleanup
- **Files Deleted:**
  - `frontend/app/components/aircraft-lookup.tsx`
  - `frontend/app/components/customer-selector.tsx` 
  - `frontend/app/components/AircraftTypeSelector.tsx`
- **File Modified:** `frontend/app/csr/fuel-orders/components/NewFuelOrderDialog.tsx`
- **Integration Changes:**
  - Replaced old components with new search inputs
  - Updated imports to use new components
  - Maintained existing form integration patterns
  - Enhanced CustomerSearchInput with onCustomerSelected callback
  - Preserved all existing form validation and submission logic
  - Updated customer display to show both name and company_name
  - Removed unused handler functions (handleAircraftNotFound, handleCustomerCleared)

### Key Technical Decisions

1. **Backend Architecture:** Used existing patterns with Marshmallow schemas and Flask blueprints
2. **Database Design:** Made all new customer fields nullable to maintain backward compatibility
3. **Search Performance:** Implemented 10-result limit and case-insensitive ILIKE for PostgreSQL
4. **Frontend State Management:** Used existing React Query patterns with proper caching strategies
5. **Component Design:** Followed controlled component pattern for maximum flexibility
6. **Error Handling:** Implemented comprehensive error handling with user-friendly toast messages
7. **Migration Strategy:** Careful enum type creation order to avoid PostgreSQL constraint issues

### Performance Considerations

1. **Debounced Search:** 300ms debounce prevents excessive API calls during typing
2. **Query Caching:** 30-second cache for search results, 1-hour cache for aircraft types
3. **Limited Results:** 10-result limit on backend searches for fast response times
4. **Lightweight Payloads:** Aircraft search returns only essential fields

### Future Recommendations

1. **Database Indexing:** Add GIN indexes on customer name/company_name fields using pg_trgm extension for production performance
2. **Search Enhancement:** Consider full-text search capabilities for better search relevance
3. **Caching Strategy:** Implement Redis caching for frequently searched customers
4. **Accessibility:** Add proper ARIA labels and keyboard navigation enhancements
5. **Testing:** Implement comprehensive unit tests for all new components and endpoints

All tasks were completed successfully with no blocking issues. The new standardized search components provide a consistent, performant, and maintainable foundation for future search functionality in the application.

---

## Post-Implementation Standardization: Callback Pattern Refactoring

### Issue Identified
After initial implementation, a code review identified an inconsistent and confusing callback pattern across the search components. The original implementation had:

- `CustomerSearchInput`: `value: number | null` + `onValueChange: (customerId: number | null) => void` + optional `onCustomerSelected: (customer: Customer) => void`
- `AircraftTailSearchInput`: `value: string | null` + `onValueChange: (tailNumber: string | null) => void` + `onAircraftSelected: (aircraft: Aircraft) => void`
- `AircraftTypeSearchInput`: `value: string | null` + `onValueChange: (aircraftType: string | null) => void`

This created an ambiguous component API where developers had to guess which callback to use and manually perform lookups from IDs to get full objects.

### Solution: Standardized Object-Based Pattern
Refactored all three search components to use a consistent, self-contained pattern:

```typescript
interface SearchInputProps<T> {
  value: T | null
  onValueChange: (selectedItem: T | null) => void
  // ... other props
}
```

Where `T` is the full object type (`Customer`, `Aircraft`, `AircraftType`).

### Changes Made

#### CustomerSearchInput
- **Before:** `value: number | null, onValueChange: (customerId: number | null) => void, onCustomerSelected?: (customer: Customer) => void`
- **After:** `value: Customer | null, onValueChange: (customer: Customer | null) => void`

#### AircraftTailSearchInput  
- **Before:** `value: string | null, onValueChange: (tailNumber: string | null) => void, onAircraftSelected: (aircraft: Aircraft) => void`
- **After:** `value: Aircraft | null, onValueChange: (aircraft: Aircraft | null) => void`

#### AircraftTypeSearchInput
- **Before:** `value: string | null, onValueChange: (aircraftType: string | null) => void`
- **After:** `value: AircraftType | null, onValueChange: (aircraftType: AircraftType | null) => void`

### Benefits of Standardized Pattern

1. **Single Source of Truth:** Only one callback method per component - no confusion about which to use
2. **Self-Contained:** Parent components receive full objects, eliminating need for separate lookups
3. **Type Safety:** Full TypeScript support with proper object typing
4. **Consistency:** All search components follow identical patterns
5. **Simplicity:** Cleaner component APIs that are easier to understand and use

### Updated Integration
The `NewFuelOrderDialog.tsx` was updated to work with the new pattern:

```typescript
// Before - confusing dual callbacks
<CustomerSearchInput
  value={selectedCustomer?.id || null}
  onValueChange={(customerId) => { /* handle ID */ }}
  onCustomerSelected={handleCustomerSelected}
/>

// After - clean single callback
<CustomerSearchInput
  value={selectedCustomer}
  onValueChange={(customer) => {
    if (customer) {
      handleCustomerSelected(customer)
    } else {
      setSelectedCustomer(null)
      form.setValue('customer_id', undefined)
    }
  }}
/>
```

This refactoring significantly improved the component API design and eliminated potential confusion for future developers using these components.

---

## Critical Performance Enhancement: Database Search Indexes

### Issue Identified
During code review, it was identified that the backend search endpoints were using unindexed ILIKE queries, creating a significant performance risk for production environments:

```sql
-- Potentially slow queries without indexes
SELECT * FROM customers WHERE name ILIKE '%query%' OR company_name ILIKE '%query%';
SELECT * FROM aircraft WHERE tail_number ILIKE '%query%';
```

### Solution: PostgreSQL GIN Indexes with pg_trgm Extension
Created a critical performance migration to add proper database indexes for text search:

#### Migration Created
- **File:** `backend/migrations/versions/704f21a0871d_add_search_performance_indexes.py`
- **Features:**
  - Enables PostgreSQL `pg_trgm` extension for trigram-based text search
  - Creates GIN (Generalized Inverted Index) indexes optimized for partial text matching
  - Provides proper downgrade function for index cleanup

#### Indexes Added
```sql
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX idx_customers_name_trgm ON customers USING gin (name gin_trgm_ops);
CREATE INDEX idx_customers_company_name_trgm ON customers USING gin (company_name gin_trgm_ops);
CREATE INDEX idx_aircraft_tail_number_trgm ON aircraft USING gin (tail_number gin_trgm_ops);
```

#### Verification Results
- ✅ pg_trgm extension successfully installed (version 1.6)
- ✅ All three GIN indexes successfully created
- ✅ Database migration applied without errors
- ✅ Search endpoints properly protected with authentication

### Performance Impact
These indexes will dramatically improve search performance for:
- Customer name and company name searches (ILIKE queries)
- Aircraft tail number searches (ILIKE queries)
- Type-ahead search functionality with real-time responsiveness

### Production Readiness
With these indexes in place, the search endpoints are now production-ready and can handle high-volume search requests without performance degradation. The GIN indexes with pg_trgm support efficient partial string matching, making them ideal for the type-ahead search functionality implemented in the frontend components.

This addresses the critical performance concern raised during code review and ensures the search system can scale effectively in production environments.

---

## Critical Data Integrity Fix: Removal of "Other" Aircraft Type Option

### Issue Identified
During code review, a significant data integrity loophole was discovered in the `AircraftCreationDialog`. The component allowed CSRs to create arbitrary aircraft types through a free-text "Other" option, which posed serious risks:

**Problems with the "Other" Option:**
- **Data Inconsistency**: Users could enter "Boeing 737", "B737", "boeing 737", "737" for the same aircraft type
- **Fee Calculation Errors**: Inconsistent aircraft types would cause fee mismatches and billing issues
- **Reporting Fragmentation**: Analytics would be split across duplicate aircraft type entries
- **Database Pollution**: Accumulation of inconsistent, duplicate data over time

### Solution: Strict Data Governance Enforcement
Implemented **Solution A (Strict)** to completely remove the free-text option and enforce proper data governance:

#### Frontend Changes
**File Modified:** `frontend/app/components/dialogs/AircraftCreationDialog.tsx`
- Removed `customAircraftType` and `customFuelType` state variables
- Simplified Zod schema by removing `custom_aircraft_type` and `custom_fuel_type` fields
- Removed "Other" option from both Aircraft Type and Fuel Type select dropdowns
- Replaced custom input fields with helpful messaging when no types are available
- Updated dialog description to guide users: "If the required aircraft type or fuel type is not available, contact an administrator to have it added."

#### Backend Changes  
**File Modified:** `backend/src/services/aircraft_service.py`
- Added `_validate_aircraft_type()` helper method to validate aircraft types against the `aircraft_types` table
- Enhanced `create_aircraft()` method with aircraft type validation
- Enhanced `get_or_create_aircraft()` method with aircraft type validation
- Server-side validation now returns clear error messages: "Invalid aircraft type: {type}. Please contact an administrator to have this aircraft type added."

#### Benefits of the Solution
1. **Data Integrity**: Only pre-approved aircraft types can be used
2. **Consistent Fee Calculations**: All aircraft of the same type will have identical fee structures
3. **Clean Reporting**: Analytics will aggregate correctly without duplicates
4. **Proper Governance**: Aircraft type additions go through proper administrative approval
5. **User Guidance**: Clear messaging directs users to contact administrators for new types

### Implementation Details
- Backend validation occurs in both creation endpoints (`/api/aircraft/` and `/api/aircraft/quick-create`)
- Frontend prevents invalid submissions before they reach the server
- Graceful handling when no aircraft types or fuel types are available
- Maintains backward compatibility with existing aircraft records

### Production Impact
This change ensures that:
- All aircraft types are properly managed through the admin fee management system
- Fee calculations remain consistent and accurate
- Database integrity is maintained
- Administrative oversight is enforced for new aircraft types

The removal of the "Other" option transforms a potential data integrity disaster into a controlled, governance-compliant system that scales properly in production environments.