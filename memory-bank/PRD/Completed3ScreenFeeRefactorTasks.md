### **AI Agent Task: Final Implementation of the FBO Fee Management UI (Version 2.2 - Authoritative)**

**Version:** 2.2
**Status:** **APPROVED FOR IMPLEMENTATION.** This plan supersedes all previous versions and is now based on the complete specification, including visual mockups.

**Objective:** Implement the final, robust, and efficient version of the `/admin/fbo-config/fee-management` page. This plan provides explicit, context-rich instructions for refactoring the UI, implementing new interactive components, and correcting critical backend flaws. You are expected to generate high-quality, idiomatic code that precisely matches the logic and visual targets described herein.

---

### **Phase 0: Prerequisite Database Schema Corrections**

**(Mandate: These database changes are fundamental for data integrity and must be completed before any application code is modified.)**

**Step 1: Activate the `FeeRuleOverride` Table Migration** ✅ **COMPLETED**
*   **File to Edit:** `backend/migrations/versions/f8606116088a_add_feeruleoverride_table.py`
*   **Directive:** Locate the `upgrade()` and `downgrade()` functions. Uncomment the `op.create_table(...)` and `op.drop_table(...)` blocks to make the migration functional.
*   **Implementation Context:** Successfully uncommented the migration code in both `upgrade()` and `downgrade()` functions. The migration now properly creates the `fee_rule_overrides` table with foreign key constraints to `aircraft_types` and `fee_rules` tables, along with a unique constraint on `(aircraft_type_id, fee_rule_id)`.

**Step 2: Enforce Fee Category Name Uniqueness** ✅ **COMPLETED**
*   **Directive:**
    1.  Generate a new Alembic migration file with the message "Add unique constraint to fee_categories on fbo_location_id and name".
    2.  In the new migration file, implement the `upgrade` function to add a multi-column `UNIQUE` constraint to the `fee_categories` table. This constraint must span the `fbo_location_id` and `name` columns. Name the constraint `uq_fee_categories_fbo_location_id_name`.
    3.  Implement the corresponding `downgrade` function to remove this constraint.
*   **Implementation Context:** Migration file `a525066160e4_add_unique_constraint_to_fee_categories_.py` was already generated and properly implemented. The `upgrade()` function creates the unique constraint `uq_fee_categories_fbo_location_id_name` on the `fee_categories` table spanning `fbo_location_id` and `name` columns. The `downgrade()` function correctly drops this constraint.

---

### **Phase 1: Backend API Correction and Implementation**

**Step 3: Refactor and Implement Backend Logic for Reliability and Atomicity** ✅ **COMPLETED WITH CRITICAL FIXES - AUDITED 2025-01-26**
*   **Implementation Context:**
    *   **Sub-Step 3.1:** The `DELETE /fee-rule-overrides` endpoint in `backend/src/routes/admin/fee_config_routes.py` was already correctly implemented to use query parameters and validate their presence. The corresponding service method `delete_fee_rule_override` in `backend/src/services/admin_fee_config_service.py` was also correct.
    *   **Sub-Step 3.2:** The `get_or_create_general_fee_category` method in `backend/src/services/admin_fee_config_service.py` was updated to use an optimistic-locking-with-fallback pattern to prevent race conditions. The corresponding route `GET /api/admin/fbo/<int:fbo_id>/fee-categories/general` in `backend/src/routes/admin/fee_config_routes.py` was also updated to expose this service method.
    *   **Sub-Step 3.3:** The `reorder_waiver_tiers` method was added to `backend/src/services/admin_fee_config_service.py` to atomically update the `tier_priority` of waiver tiers in a single transaction. The corresponding route `PUT /api/admin/fbo/<int:fbo_id>/waiver-tiers/reorder` was added to `backend/src/routes/admin/fee_config_routes.py` to expose this service method.
    *   **Sub-Step 3.4:** The `create_aircraft_fee_setup` method in `backend/src/services/admin_fee_config_service.py` was modified to optionally accept `initial_ramp_fee_rule_id` and `initial_ramp_fee_amount` to create an initial `FeeRuleOverride` for a new aircraft. The `CreateAircraftFeeSetupSchema` in `backend/src/schemas/admin_fee_config_schemas.py` and the corresponding route in `backend/src/routes/admin/fee_config_routes.py` were updated to support these new optional fields.

*   **🔧 CRITICAL FIXES APPLIED (2025-01-16):**
    1.  **Fixed Missing Schema Definitions:** Added `FBOAircraftTypeConfigSchema` and `FeeRuleOverrideSchema` to `backend/src/schemas/admin_fee_config_schemas.py` - these were imported but didn't exist, causing ImportError at runtime.
    2.  **Fixed Authentication Import:** Updated `backend/src/routes/admin/fee_config_routes.py` to use `require_permission_v2` from `...utils.enhanced_auth_decorators_v2` instead of non-existent `require_permission` from `...utils.auth`.
    3.  **Fixed Service Import:** Removed incorrect relative import `from ..services import admin_fee_config_service` and used direct service class access `AdminFeeConfigService`.
    4.  **Fixed Type Annotations:** Added proper type casting for schema validation results to prevent subscript access errors in the `create_aircraft_fee_setup` route.
    5.  **Enhanced Service Return Type:** Modified `create_aircraft_fee_setup` service method to return actual model objects (`aircraft_type`, `fbo_aircraft_config`, `fee_rule_override`) along with IDs, enabling proper schema serialization in the route.
    6.  **Fixed Route Response Structure:** Updated route to use proper schema serialization for consistent API responses matching expected frontend interface.

*   **✅ AUDIT RESULTS (2025-01-26):** All backend implementations verified as production-ready. Routes properly handle validation, error cases, and auth decorators. Service layer uses atomic transactions and race-condition-safe patterns. Schema definitions are complete and correctly implemented.

---

### **Phase 2: Frontend Implementation**

**Step 4: Update Frontend Services and Dependencies** ✅ **COMPLETED**
*   **File to Edit:** `frontend/package.json`
*   **Directive:** Add the required `@dnd-kit` packages and run `npm install`.
*   **File to Edit:** `frontend/app/services/admin-fee-config-service.ts`
*   **Directive:**
    1.  Modify the `deleteFeeRuleOverride` function to construct a URL with query parameters.
    2.  Add a new service function `getGeneralFeeCategory` for the `.../general` endpoint.
    3.  Add a new service function `reorderWaiverTiers` for the `.../reorder` endpoint.
    4.  Modify the request type and function for `addAircraftToFeeSchedule` to include the new optional fields for the initial fee override, as defined in Sub-Step 3.4.

*   **✅ IMPLEMENTATION STATUS:**
    1.  **deleteFeeRuleOverride:** ✅ Correctly implemented with URLSearchParams for query parameter construction.
    2.  **getGeneralFeeCategory:** ✅ Correctly implemented targeting the `/fee-categories/general` endpoint.
    3.  **reorderWaiverTiers:** ✅ Correctly implemented with proper request structure `{tier_updates: [{tier_id, new_priority}]}` matching backend expectations.
    4.  **addAircraftToFeeSchedule:** ✅ Enhanced `AddAircraftToFeeScheduleRequest` interface includes optional `initial_ramp_fee_rule_id` and `initial_ramp_fee_amount` fields.
    5.  **Type Definitions:** ✅ All required TypeScript interfaces (`FBOAircraftTypeConfig`, `FeeRuleOverride`, etc.) are properly defined.
    6.  **Dependencies:** ✅ @dnd-kit packages confirmed installed in package.json.
    
*   **🔍 QUALITY ASSESSMENT:** Frontend service layer is production-ready with proper error handling, type safety, and consistent API patterns.

*   **✅ AUDIT RESULTS (2025-01-26):** All frontend service implementations verified as complete and production-ready. All required TypeScript interfaces properly defined. All API functions match backend endpoint signatures exactly.

**Step 5: Implement Main Page Layout and Toolbar** ✅ **COMPLETED**
*   **File to Edit:** `frontend/app/admin/fbo-config/fee-management/page.tsx`
*   **Directive:** Refactor the page to match the single-page layout shown below. Remove the `<Tabs>` component. The `[⚙️ Manage Schedule Rules]` button will be the trigger to open the `WaiverRuleBuilder` modal.
*   **Implementation Context:** Successfully refactored the main page to remove tabs and implement the single-page layout with action toolbar. Added proper state management for search, CAA view toggle, and WaiverRuleBuilder modal. Updated FeeScheduleTable to fetch its own data and handle loading/error states.
*   **Visual Target:**
    ```text
    ====================================================================================================================
    |                                                                                                                  |
    |  FBO Configuration                                                                                               |
    |  Manage fees, waivers, and aircraft configurations for Austin (AUS)                                              |
    |  -----------------------------------------------------------------------------------------------------------------|
    |                                                                                                                  |
    |  [+] Add Aircraft      [☁️ Upload Fees]      [Toggle CAA View]      [⚙️ Manage Schedule Rules]      [🔍 Search...]   |
    |                                                                                                                  |
    |  Aircraft Fee Schedule                                                                                           |
    |------------------------------------------------------------------------------------------------------------------|
    |  (Render <FeeScheduleTable /> component here)                                                                    |
    |                                                                                                                  |
    |  General Service Fees                                                                      [+] Add Service Fee   |
    |------------------------------------------------------------------------------------------------------------------|
    |  (Render <GeneralFeesTable /> component here)                                                                    |
    |                                                                                                                  |
    ====================================================================================================================
    ```

**Step 6: Implement the `[+ Add Aircraft]` Wizard
*   **File to Create:** `frontend/app/admin/fbo-config/fee-management/components/AddAircraftDialog.tsx`
*   **Directive:** Build the modal form precisely as shown in the mockup.
    *   **Endpoint Correction:** The mockup mentions `POST /aircraft-fee-structure`. This is incorrect. The existing, verified, and now-enhanced endpoint is `POST /api/admin/fbo/{fboId}/aircraft-fee-setup`. Your implementation **must** target the correct endpoint.
    *   **Logic:** Use `react-hook-form` and `zod` for form management and validation. On submission, the `useMutation` hook must call the `addAircraftToFeeSchedule` service function, passing all data from the form, including the optional initial fee fields.
*   **Implementation Context:** Successfully implemented the Add Aircraft dialog with proper form validation using react-hook-form and Zod. Includes all required fields (Aircraft Type, Classification, Min Fuel, Ramp Fee) with proper data fetching for categories and fee rules. Correctly targets the `/aircraft-fee-setup` endpoint with optional initial fee fields.
*   **Visual Target:**
    ```text
    ┌──────────────────────────────────────────────────────────┐
    |  Add Aircraft to Fee Schedule                         [X] |
    |  ------------------------------------------------------- |
    |                                                          |
    |  **Aircraft Type***                                      |
    |  [ Gulfstream 500                         | Search ▼ ]   |
    |                                                          |
    |  **Classification***                                     |
    |  [ Heavy Jet                            | Create New ▼ ] |
    |                                                          |
    |  **Initial Fees**                                        |
    |  [+] Copy fees from another aircraft...                  |
    |  ┌───────────────────────────────────────────────────┐   |
    |  |  Min Fuel:  [ 1130 ] gal                          |   |
    |  |  Ramp Fee:  [ $1500 ]                            |   |
    |  └───────────────────────────────────────────────────┘   |
    |                                                          |
    |                                       [ Cancel ] [ Add ] |
    └──────────────────────────────────────────────────────────┘
    ```

**Step 7: Implement the `General Service Fees` Table
*   **File to Create:** `frontend/app/admin/fbo-config/fee-management/components/GeneralFeesTable.tsx`
*   **Directive:** Build this as an editable table using `@tanstack/react-table`.
    *   On mount, fetch the "General" category ID using the `getGeneralFeeCategory` service function.
    *   The `[+] Add Service` action should add a new, editable row to the table. On save, this will trigger a `POST /fee-rules` mutation, using the stored "General" category ID.
    *   In-place edits to existing rows must trigger `PUT /fee-rules/{id}` mutations.
*   **Implementation Context:** Successfully implemented the editable General Service Fees table with full CRUD functionality. Uses @tanstack/react-table for table management, fetches the General category automatically, supports in-line editing for all fields (Service Name, Fee Code, Amount, Taxable), and includes proper add/edit/delete operations with optimistic updates and error handling.
*   **Visual Target:**
    ```text
    ┌───────────────────────────────────────────────┐
    |  Service Name      | Fee Code | Amount | Taxable |
    |  ---------------------------------------------  |
    |  [ GPU           ] | [ GPU  ] | [ $100 ] | [ ☑ ]   |
    |  [ Lav Service   ] | [ LAV  ] | [ $75  ] | [ ☑ ]   |
    |  [+] Add Service                              |
    └───────────────────────────────────────────────┘
    ```

**Step 8: Implement the `WaiverRuleBuilder` Panel** ✅ **COMPLETED**
*   **File to Create:** `frontend/app/admin/fbo-config/fee-management/components/WaiverRuleBuilder.tsx`
*   **Directive:** Build this UI inside a dialog that is triggered by the `[⚙️ Manage Schedule Rules]` button from the main page toolbar.
    *   **Reordering Logic:** This is critical. Use `dnd-kit`. The `onDragEnd` event handler must **not** fire individual update mutations. It must calculate the new, complete array of all tiers, map them to the `[{id, tier_priority}, ...]` format, and trigger a **single `useMutation` hook** that calls the `reorderWaiverTiers` service function.
*   **Implementation Context:** Successfully implemented the WaiverRuleBuilder dialog with full drag-and-drop functionality using @dnd-kit. Includes proper atomic reordering that calculates all tier priorities and sends a single API call to `reorderWaiverTiers`. Features add/delete functionality for waiver tiers, multi-select for fees to waive, and proper form validation with react-hook-form and Zod.
*   **Visual Target:**
    ```text
    ┌───────────────────────────────────────────────┐
    |  Manage Waiver Tiers                       [X]  |
    |  -------------------------------------------  |
    |  **Active Tiers** (drag to re-order priority)   |
    |  -------------------------------------------  |
    |  [☰] When fuel uplift is [ 1.0 ]x Min Fuel,    |
    |      waive [ Ramp Fee ▼ ].             [Delete] |
    |  -------------------------------------------  |
    |  [☰] When fuel uplift is [ 2.0 ]x Min Fuel,    |
    |      waive [ Ramp Fee ▼ ] and [ O/N Fee ▼ ]. [Delete] |
    |  -------------------------------------------  |
    |  [+] Add New Waiver Tier                      |
    └───────────────────────────────────────────────┘
    ```

---

### **Phase 3: Final Integration and Cleanup**

**Step 9: Cleanup and E2E Testing** ✅ **COMPLETED**
*   **Directive:** Delete the now-obsolete `FeeScheduleTab.tsx` and `WaiverTiersTab.tsx` files and remove all dead `import` statements. Conduct a full E2E test, paying special attention to verifying the atomic reordering network call, the corrected `DELETE` method, and the full functionality of the `Add Aircraft` wizard, including the creation of the initial fee override.
*   **Implementation Context:** Successfully completed cleanup by removing obsolete `FeeScheduleTab.tsx` and `WaiverTiersTab.tsx` files, fixed all linting issues, resolved TypeScript errors, and verified build success. All components are production-ready with proper error handling, type safety, and consistent API patterns. The atomic reordering, DELETE methods, and Add Aircraft wizard functionality have been implemented and tested.