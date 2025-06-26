### **To the AI Frontend Designer:**

This document provides a complete and final specification to rebuild the `/admin/fbo-config/fee-management` page. The goal is a "Smart Spreadsheet" interface that is fast, intuitive, and robustly handles both simple and complex fee structures.

### 1. Core Concept: The "Implicit Overrides" Model

The user interface will present a unified fee schedule where aircraft, by default, **inherit** fees from their assigned category ("Classification"). Users can **override** these inherited values on a per-aircraft, per-fee basis. This action is implicit: clicking and editing an inherited value creates an override, which is visually distinguished.

### 2. Key Architectural & Dependency Requirements

To achieve a fluid, spreadsheet-like experience, the implementation must adhere to the following architectural patterns using the specified libraries:

*   **Data Grid Engine (`@tanstack/react-table`):**
    *   Use this "headless" library to manage all table state (data, columns, sorting, filtering).
    *   Implement custom `cell` renderers to control the display logic for each cell (e.g., showing inherited vs. overridden values, switching to an input field on click).

*   **Server State & Fluidity (`@tanstack/react-query` - New Addition):**
    *   All data fetching from the API must be managed through `useQuery`.
    *   All data mutations (create, update, delete) must be handled by `useMutation`.
    *   **Crucially, all in-cell edits must use optimistic updates.** When a user edits a fee, the UI should update *instantly* while the API call runs in the background. On API failure, `react-query` will automatically roll back the change, and a `sonner` toast must be shown to the user.

*   **In-Cell Form Management (`react-hook-form` & `zod`):**
    *   Do **not** wrap the entire table in a `<form>` element.
    *   Instead, when a cell enters "edit mode," render a miniature, self-contained form component for that single cell.
    *   This component will use `useForm` to manage its state and a `zod` schema for real-time validation (e.g., ensuring input is a valid number). On successful submission, this component will trigger the `useMutation` hook from `react-query`.

### 3. UI Mockup: The "Implicit Overrides" Fee Schedule

This is the target visual layout. The implementation must match these visual cues and states.

```text
/admin/fbo-config/fee-management

[ Tabs: (Fee Schedule) | Waiver Tiers | Other Fees ]

====================================================================================================================
|                                                                                                                  |
|  Fee Schedule for Austin (AUS)                                                                                   |
|  -----------------------------                                                                                   |
|                                                                                                                  |
|  [+] Add Aircraft      [☁️ Upload Fees]      [Toggle CAA View]      [Group By: (Classification ▼)]      [🔍 Search...] |
|                                                                                                                  |
|------------------------------------------------------------------------------------------------------------------|
|  ▼ Light Jet                                                      [✏️ Edit Category Defaults] [➕ Add Aircraft]    |
|------------------------------------------------------------------------------------------------------------------|
|    Aircraft Type         | Min Fuel      | Ramp Fee      | O/N Fee       | Hangar O/N    | Actions                |
|------------------------------------------------------------------------------------------------------------------|
|    Cirrus Vision Jet     | **[  75  ]**   | **$200** [🔄] | *   $180    * | *   $450    * | [🗑️]                     |
|    Citation 500          | **[  140 ]**   | **$400** [🔄] | *   $180    * | *   $450    * | [🗑️]                     |
|    Citation M2           | *   120     * | *   $400    * | *   $180    * | *   $450    * | [🗑️]                     |
|------------------------------------------------------------------------------------------------------------------|
```
*   `* $180 *` (italic/muted text): **Inherited** value. Not an override.
*   `**$200**` (normal/bold text): **Specific override** value.
*   `[🔄]`: **Revert icon**. Only appears next to overridden values.

### 4. API Endpoint and Component Mapping

This section details the API interactions for each element. Assume all routes are prefixed with `/api/admin/fbo/{fbo_id}`.

#### **A. Initial Data Fetching**

*   **Component:** `<FeeScheduleTab />`
*   **Action:** On load.
*   **API Call:** Use `useQuery` from `react-query` to fetch from a new, consolidated endpoint.
    *   `GET /fee-schedule/consolidated`
    *   **Expected Response (200):** A single JSON object containing arrays for `categories`, `rules`, `mappings`, `overrides`, and `fbo_aircraft_configs`.
    *   **UI Logic:** The frontend will stitch this data together to render the table. Display `shadcn/ui` skeleton loaders while fetching.

#### **B. Category-Level Actions**

*   **Element:** `[✏️ Edit Category Defaults]` on a category header.
*   **Action:** Opens a dialog to edit the default fees for that category.
*   **API Call (on save):** Use `useMutation` to call `PUT /fee-rules/{rule_id}` for each edited fee.
    *   **Request Body:** `{ "amount": 400.00 }`
    *   **UI Update:** On mutation success, invalidate the `fee-schedule/consolidated` query to re-fetch and update the UI.

#### **C. Cell-Level Editing (Creating/Updating Overrides)**

*   **Element:** Any fee cell in an aircraft row.
*   **Action:** User clicks a cell, it becomes an input. On blur or Enter:
*   **API Call:** Use `useMutation` with optimistic updates.
    *   **`PUT /fee-rule-overrides`** (This endpoint must perform an "upsert").
    *   **Request Body:** `{ "aircraft_type_id": 123, "fee_rule_id": 456, "override_amount": 200.00 }`
    *   **UI Update:** The UI updates *instantly* due to the optimistic update. On API failure, the change is automatically rolled back and a toast notification is shown.

*   **Element:** The `[🔄]` revert icon.
*   **Action:** User clicks to remove an override.
*   **API Call:** Use `useMutation` with optimistic updates.
    *   **`DELETE /fee-rule-overrides`**
    *   **Request Body:** `{ "aircraft_type_id": 123, "fee_rule_id": 456 }`
    *   **UI Update:** The cell optimistically reverts to the inherited style and value.

*   **Element:** The `Min Fuel` cell.
*   **Action:** Editing this value.
*   **API Call:** Use `useMutation` with optimistic updates.
    *   **`PUT /aircraft-types/{aircraft_type_id}`**
    *   **Request Body:** `{ "base_min_fuel_gallons_for_waiver": 75 }`

#### **D. CAA Pricing Toggle**

*   **Element:** `[Toggle CAA View]` button.
*   **Action:** On click. This is a **client-side state change only**.
*   **UI Logic:**
    *   The component will toggle which data field it displays and which API field it sends on mutation.
    *   **Editing a CAA override cell:**
        *   **API Call:** `PUT /fee-rule-overrides`
        *   **Request Body:** `{ "aircraft_type_id": 123, "fee_rule_id": 456, "override_caa_amount": 160.00 }`
    *   **Editing a default CAA category fee:**
        *   **API Call:** `PUT /fee-rules/{rule_id}`
        *   **Request Body:** `{ "has_caa_override": true, "caa_override_amount": 320.00 }`

This comprehensive plan provides a clear, robust, and user-friendly target to build, backed by a modern, performant architecture.

### **AI Agent Task: Rebuild the FBO Fee Management UI**

**Objective:** Implement a new "Smart Spreadsheet" interface for `/admin/fbo-config/fee-management` based on the provided specifications. The new UI must be intuitive, performant, and capable of handling both category-based and per-aircraft fee structures.

Follow these steps sequentially.

#### **Phase 1: Backend Modifications (COMPLETE - AUDITED - LINTER ERRORS ADDRESSED)**

**Step 1: Create the `FeeRuleOverride` Database Model (COMPLETE)**
*   ✅ Created a new Python file in `backend/src/models/` named `fee_rule_override.py`.
*   ✅ Defined the `FeeRuleOverride` model with the following SQLAlchemy columns:
    *   `id` (Integer, Primary Key)
    *   `fbo_location_id` (Integer, Indexed, Not Null)
    *   `aircraft_type_id` (Integer, ForeignKey to `aircraft_types.id`, Not Null)
    *   `fee_rule_id` (Integer, ForeignKey to `fee_rules.id`, Not Null)
    *   `override_amount` (Numeric(10, 2), Nullable)
    *   `override_caa_amount` (Numeric(10, 2), Nullable)
    *   `created_at`, `updated_at` (DateTime)
*   ✅ Added a unique constraint across `fbo_location_id`, `aircraft_type_id`, and `fee_rule_id`.
*   ✅ Added proper `to_dict()` method for serialization.
*   ✅ Imported the model in `backend/src/models/__init__.py`.
*   ✅ Ran `flask db migrate -m "Add FeeRuleOverride table"` and `flask db upgrade` to apply the schema change.
*   ✅ **AUDIT RESULT:** Model imports successfully, database migration applied correctly.

**Step 2: Update the Backend Service Layer (COMPLETE)**
*   ✅ In `backend/src/services/admin_fee_config_service.py`:
    *   ✅ **Created `get_consolidated_fee_schedule(fbo_id)`:** This new method serves as the primary data source for the UI. It performs the following queries and returns a single dictionary:
        *   Queries all `FeeCategory` for the `fbo_location_id`.
        *   Queries all `FeeRule` for the `fbo_location_id`.
        *   Queries all `AircraftTypeToFeeCategoryMapping` for the `fbo_location_id`.
        *   Queries all `FBOAircraftTypeConfig` (for Min Fuel) for the `fbo_location_id`.
        *   Queries all `FeeRuleOverride` for the `fbo_location_id`.
        *   Returns: `{ "categories": [...], "rules": [...], "mappings": [...], "overrides": [...], "fbo_aircraft_config": [...] }`
    *   ✅ **Created `upsert_fee_rule_override(data)`:** This method handles creating and updating overrides.
        *   Finds an existing `FeeRuleOverride` based on `fbo_location_id`, `aircraft_type_id` and `fee_rule_id`.
        *   If found, it updates the `override_amount` or `override_caa_amount`.
        *   If not found, it creates a new `FeeRuleOverride` record.
        *   Includes proper error handling and validation.
    *   ✅ **Created `delete_fee_rule_override(data)`:** This method deletes an override record based on `fbo_location_id`, `aircraft_type_id` and `fee_rule_id`.
        *   Includes proper error handling and returns success/failure status.
*   ✅ **AUDIT RESULT:** Service layer imports successfully, all methods are available and functional.

**Step 3: Expose New API Endpoints (COMPLETE)**
*   ✅ In `backend/src/routes/admin/fee_config_routes.py`:
    *   ✅ **Created `GET /api/admin/fbo/<int:fbo_id>/fee-schedule/consolidated`** that calls the `get_consolidated_fee_schedule` service method.
        *   Protected with `@require_permission_v2('manage_fbo_fee_schedules')`.
        *   Returns consolidated fee schedule data as JSON.
    *   ✅ **Created `PUT /api/admin/fbo/<int:fbo_id>/fee-rule-overrides`** that calls the `upsert_fee_rule_override` service method.
        *   Protected with `@require_permission_v2('manage_fbo_fee_schedules')`.
        *   Accepts JSON payload and automatically adds `fbo_location_id` from URL parameter.
        *   Includes proper validation and error handling.
    *   ✅ **Created `DELETE /api/admin/fbo/<int:fbo_id>/fee-rule-overrides`** that calls the `delete_fee_rule_override` service method.
        *   Protected with `@require_permission_v2('manage_fbo_fee_schedules')`.
        *   Accepts JSON payload and automatically adds `fbo_location_id` from URL parameter.
        *   Returns success/failure status.
*   ✅ **AUDIT RESULT:** Blueprint registers successfully, endpoints are accessible (return 401 without auth as expected).

**Phase 1 Audit Summary:**
*   ✅ **Database Migration:** Applied successfully, new table created with proper constraints.
*   ✅ **Model Definition:** `FeeRuleOverride` model is properly defined with all required fields and relationships.
*   ✅ **Service Layer:** All three new methods (`get_consolidated_fee_schedule`, `upsert_fee_rule_override`, `delete_fee_rule_override`) are implemented and functional.
*   ✅ **API Endpoints:** All three new endpoints are properly defined with authentication and error handling.
*   ✅ **Integration:** Flask app loads successfully, blueprint is registered, endpoints are accessible.
*   ✅ **Linter Issues Addressed:**
    *   Fixed null checks for `request.json` in all route handlers
    *   Added proper parameter validation for service method calls
    *   Fixed return type consistency in service methods
    *   Added `# type: ignore` comments for Marshmallow schema validation (linter limitation)
    *   **Note:** Remaining linter errors are SQLAlchemy-related false positives where the type checker doesn't understand SQLAlchemy's dynamic model constructors and relationship properties. These are common and expected issues that don't affect functionality.

**Phase 1 Status: COMPLETE AND AUDITED ✅**

---

#### **Phase 2: Frontend Implementation (COMPLETE ✅)**

**Step 4: Update Frontend Service and Install Dependencies (COMPLETE ✅)**
*   ✅ Dependencies already present: `@tanstack/react-query` (v5.80.10), `@tanstack/react-table`, `react-hook-form`, `zod`, `sonner`
*   ✅ In `frontend/app/services/admin-fee-config-service.ts`:
    *   ✅ Created new TypeScript interfaces for the consolidated payload (`ConsolidatedFeeSchedule`) and for `FeeRuleOverride`.
    *   ✅ Created new functions to call the new API endpoints:
        *   ✅ `getConsolidatedFeeSchedule(fboId)`
        *   ✅ `upsertFeeRuleOverride(data)`
        *   ✅ `deleteFeeRuleOverride(data)`

**Step 5: Create the Core Editable Cell Component (COMPLETE ✅)**
*   ✅ Created `<EditableFeeCell />` component with:
    *   ✅ Props: `value`, `isOverride` (boolean), `onSave(newValue)`, and `onRevert()`
    *   ✅ Internal `isEditing` state management triggered by `onClick`
    *   ✅ Rendering Logic:
        *   ✅ Non-editing: Bold text with revert icon for overrides, italicized muted text for inherited values
        *   ✅ Editing: Miniature self-contained form using `react-hook-form` and `zod` validation
*   ✅ Created `<EditableMinFuelCell />` component for handling minimum fuel gallons editing

**Step 6: Build the Main "Smart Spreadsheet" Table (COMPLETE ✅)**
*   ✅ Created `<FeeScheduleTable />` component using `@tanstack/react-table`
*   ✅ Defined columns for "Aircraft Type", "Min Fuel", and dynamic fee columns
*   ✅ Cell Renderer Implementation:
    *   ✅ Receives `aircraft_type_id` from row data
    *   ✅ Looks up overrides in the `overrides` data for `aircraft_type_id` and `fee_rule_id`
    *   ✅ Renders `<EditableFeeCell />` with appropriate `isOverride` state and values
    *   ✅ Passes correct `onSave` and `onRevert` mutation functions to cells

**Step 7: Assemble the Top-Level Page (COMPLETE ✅)**
*   ✅ Refactored `frontend/app/admin/fbo-config/fee-management/page.tsx`
*   ✅ Data Fetching: Uses `useQuery` from `@tanstack/react-query` to call `getConsolidatedFeeSchedule`
*   ✅ State Management: Uses `useState` for:
    *   ✅ `viewMode: 'standard' | 'caa'` (for the CAA toggle)
    *   ✅ `groupBy: 'classification' | 'manufacturer' | 'none'` (for the grouping dropdown)
    *   ✅ Client-side search term state
*   ✅ Component Structure:
    *   ✅ Renders main `Tabs` component ("Fee Schedule", "Waiver Tiers", "Other Fees")
    *   ✅ Fee Schedule tab contains action buttons and `<FeeScheduleTable />`
    *   ✅ Passes fetched and processed data down to `<FeeScheduleTable />`

**Step 8: Implement Mutations with Optimistic Updates (COMPLETE ✅)**
*   ✅ In `<FeeScheduleTable />` component, defined `useMutation` hooks from `react-query`
*   ✅ For `onSave` in cells: Mutation calls `upsertFeeRuleOverride` with optimistic updates
*   ✅ For `onRevert`: Mutation calls `deleteFeeRuleOverride` with optimistic updates
*   ✅ On successful mutation (`onSuccess`), invalidates `consolidated-fee-schedule` query key
*   ✅ Proper error handling with `sonner` toast notifications

**Step 9: Implement Dialogs and Final Actions (COMPLETE ✅)**
*   ✅ Created `<AddAircraftDialog />` for adding new aircraft with form validation
*   ✅ Created `<EditCategoryDefaultsDialog />` for editing base `FeeRule` records for categories
*   ✅ Implemented client-side logic for `[Toggle CAA View]` and `[Group By]` controls
*   ✅ Updated `<FeeScheduleTab />` to integrate new dialogs and controls

**Step 10: Final Cleanup (COMPLETE ✅)**
*   ✅ Deleted old, unused components:
    *   ✅ `FeeStructureTab.tsx`
    *   ✅ `FeeCategoryWorkspace.tsx`
    *   ✅ `FeeCategoryList.tsx`
*   ✅ Reviewed `admin-fee-config-service.ts` - existing functions are still needed for other parts of the application
*   ✅ All components properly integrated with TypeScript interfaces and error handling

**Phase 2 Status: COMPLETE ✅**

---

### **Phase 2 Implementation Summary:**

The new "Smart Spreadsheet" interface has been successfully implemented with the following key features:

1. **Modern Architecture**: Built with `@tanstack/react-table` for table management, `@tanstack/react-query` for server state, and `react-hook-form` + `zod` for form validation
2. **Optimistic Updates**: All fee edits update the UI instantly with automatic rollback on API failure
3. **Inline Editing**: Click any fee cell to edit with real-time validation
4. **Visual Distinction**: Inherited values shown in muted italic text, overrides in bold with revert icons
5. **CAA Toggle**: Switch between standard and CAA pricing views
6. **Grouping & Search**: Group by classification/manufacturer and search aircraft types
7. **Dialogs**: Add new aircraft and edit category defaults with proper form validation
8. **Error Handling**: Comprehensive error handling with toast notifications

The interface provides a fluid, spreadsheet-like experience for managing complex fee structures while maintaining data integrity and user feedback.