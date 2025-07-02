**AI Coding Agent, you will execute the following plan with precision. It contains the complete context and exact instructions required. Do not deviate.**

---

### **Definitive Project Plan: Manage Fee Schedule & Rules System**

#### **Architect's Mandate & Guiding Principles**

1.  **Schema is Contract:** All data structures that cross the network or are stored in flexible formats (e.g., JSONB) **must** be defined by a strict schema. We will use Zod as the primary schema definition tool. This is non-negotiable.
2.  **Validate Before Acting:** All destructive database operations **must** be preceded by a full data validation step. The operation will be aborted on validation failure. All such operations will be wrapped in an atomic database transaction.
3.  **Strict Separation of Concerns:** Application state will be strictly segregated. A new, dedicated React Context will be created for UI preferences, entirely separate from the existing `PermissionContext`.
4.  **Precise Implementation:** This plan provides exact file paths, component names, and logical flows. Implement them as specified.

---

### **Shared Artifact: The User Preferences Contract**

**AI Agent:** Your first task is to create this file. It is the foundation for all user preference features.

*   **File to Create:** `frontend/app/schemas/user-preferences.schema.ts`
*   **Action:** Create the file and define the Zod schema that will serve as the single source of truth for the structure of the user preferences object.

*   **Schema Definition:**
    *   The schema will be a Zod object named `userPreferencesSchema`.
    *   It must define the following keys, types, and constraints:
        1.  `fee_schedule_view_size`: An enum of strings, allowing only `'default'` or `'compact'`. It is optional and defaults to `'default'`.
        2.  `fee_schedule_sort_order`: An optional string. It defaults to `'classification_name:asc'`.
        3.  `highlight_overrides`: An optional boolean. It defaults to `true`.
    *   From this schema, infer and export a TypeScript type named `UserPreferences`.

---

### **Task Group 1: Implement Persistent User Preferences**

**Objective:** Create a secure and type-safe system to store and manage user-specific UI settings.

#### **Backend Tasks**

1.  **Database Migration:** Generate and execute a migration to add a nullable `JSONB` column named `preferences` to the `users` table. Update the `User` model in `backend/src/models/user.py` to include the new `preferences` attribute.

2.  **API Endpoint Validation:**
    *   In `backend/src/schemas/user_schemas.py`, create a new Marshmallow schema named `UserPreferencesSchema`. This schema must mirror the structure and constraints of the Zod schema from the shared artifact, validating the same keys and value types.
    *   Modify the `PATCH /me/preferences` endpoint in `backend/src/routes/user_routes.py`. The endpoint's logic must follow this exact sequence:
        1.  Validate the incoming JSON payload against the new `UserPreferencesSchema`.
        2.  If validation fails, return a 400 error with the validation details.
        3.  If validation succeeds, retrieve the user's existing preferences.
        4.  Merge the **validated** data into the preferences object.
        5.  Commit the updated object to the database and return it in the response.

3.  **Data Hydration in Login Payload:**
    *   In `backend/src/routes/auth_routes.py`, modify the `login()` function's response payload.
    *   The `user` object in the response must include the `preferences` field. If a user has no preferences set in the database, this field **must** be an empty object (`{}`) and not `null`.

#### **Frontend Tasks**

1.  **Create a Dedicated UI Preferences Context:**
    *   **AI Agent:** You are explicitly forbidden from modifying `permission-context.tsx` for this task.
    *   Create a new file at `frontend/app/contexts/user-preferences-context.tsx`.
    *   Implement a new React Context named `UserPreferencesContext`. This context will manage the state of the user's UI preferences and provide functions to update them. It will source its initial data from the `user` object but will manage its state independently.

2.  **Update Service Layer and Types:**
    *   In `frontend/app/services/user-service.ts`, update the `User` interface. The `preferences` property must use the `UserPreferences` type inferred from the Zod schema in the shared artifact.
    *   Add a new async function `updateUserPreferences` to the service. It must accept a `Partial<UserPreferences>` object and call the `PATCH /users/me/preferences` endpoint.

3.  **Implement UI Controls and Styling:**
    *   In `frontend/app/admin/fbo-config/fee-management/components/FeeScheduleTable.tsx`, consume the new `UserPreferencesContext` to get the `fee_schedule_view_size` value. Apply styling for the "compact" view conditionally using the `cn` utility on `TableCell` components. The required CSS classes are `'h-10 px-2 py-1 text-xs'`. **Do not modify the core ShadCN `table.tsx` component.**
    *   Create a new component file at `frontend/app/admin/fbo-config/fee-management/components/FeeScheduleSettingsTab.tsx`.
    *   Inside this new component, implement the UI controls (ShadCN `<Select>` and `<Switch>`) for `fee_schedule_sort_order` and `fee_schedule_view_size`. These controls must read their state from and dispatch updates via the `UserPreferencesContext`.

---

### **Task Group 2: Implement Highlight Overrides Toggle**

**Objective:** Provide a user-configurable toggle to highlight overridden fees, using the new preferences system.

#### **Backend Tasks**

*   No backend tasks are required. The fortified preferences endpoint already supports the `highlight_overrides` key defined in our schema.

#### **Frontend Tasks**

1.  **Implement Declarative Styling:**
    *   In `frontend/app/admin/fbo-config/fee-management/components/EditableFeeCell.tsx`, add a `data-is-override` HTML attribute to the root `TableCell`. Its value should be the boolean `isOverride` prop.
    *   In `frontend/app/admin/fbo-config/fee-management/components/FeeScheduleTable.tsx`, add a `data-view-mode` attribute to the root `Table` element. Its value should be either `'highlight'` or `'uniform'`, based on the `highlight_overrides` preference from the `UserPreferencesContext`.
    *   In `frontend/app/globals.css`, add a single, specific CSS rule to apply the highlight style. The selector must be `.fee-schedule-table[data-view-mode='highlight'] td[data-is-override='true']`. The style to apply is `font-weight: 600;`.

2.  **Implement the UI Toggle:**
    *   In `frontend/app/admin/fbo-config/fee-management/components/FeeScheduleSettingsTab.tsx`, add a ShadCN `<Switch>` component. This switch will control the `highlight_overrides` boolean value within the `UserPreferencesContext`.

---

### **Task Group 3: Implement Secure Versioning, Restore, and Import**

**Objective:** Implement a secure, transactionally-safe system for configuration snapshots and imports.

#### **Backend Tasks**

1.  **Database Migrations:** Generate and execute the migrations to create the `fee_schedule_versions` table, including `version_type` and `expires_at` columns.

2.  **Define Snapshot Validation Schema:**
    *   In `backend/src/schemas/admin_fee_config_schemas.py`, define a new, comprehensive Marshmallow schema named `FeeScheduleSnapshotSchema`.
    *   This schema must validate the entire configuration object. It will contain nested fields for each table in the snapshot: `classifications`, `aircraft_types`, `aircraft_type_configs`, `fee_rules`, `overrides`, and `waiver_tiers`.
    *   The schema **must** include a `@validates_schema` method to perform internal consistency checks. For example, it must verify that all `fee_rule_id`s referenced in the `overrides` list exist in the `fee_rules` list within the same JSON payload.

3.  **Implement Secure Service Logic:**
    *   In `backend/src/services/admin_fee_config_service.py`, implement the following functions with this precise logic:
    *   **`_create_configuration_snapshot()`:** This function must query and serialize the complete set of configuration tables: `AircraftClassification`, `AircraftType`, `AircraftTypeConfig`, `FeeRule`, `FeeRuleOverride`, and `WaiverTier`.
    *   **`restore_from_version(version_id: int)`:** This function must implement the **Validate-then-Act** pattern:
        1.  Fetch the configuration JSON from the database.
        2.  Validate the entire JSON object against the `FeeScheduleSnapshotSchema`.
        3.  If validation fails, log the error and raise a `ValueError`. The function must terminate. **No database writes should have occurred.**
        4.  Only if validation succeeds, proceed to the "Wipe & Replace" logic, which must be wrapped in a single, atomic database transaction.
    *   **`import_configuration_from_file(file_stream, user_id)`:** This function must follow this sequence:
        1.  First, create an automatic backup by calling `create_new_version()`. This must be a separate, committed transaction.
        2.  Next, read the JSON from the uploaded file and validate it against the `FeeScheduleSnapshotSchema`. Abort if validation fails.
        3.  If validation succeeds, begin a *new* transaction to perform the "Wipe & Replace" logic.

4.  **Implement API and Scheduled Task:**
    *   Implement the API endpoints (`/versions`, `/versions/{id}/restore`, `/import`) to call the secure service functions.
    *   Implement the daily cron job to prune expired `pre_import_backup` versions.

#### **Frontend Tasks**

1.  **Update Service Layer:** In `frontend/app/services/admin-fee-config-service.ts`, add the functions `getFeeScheduleVersions`, `createFeeScheduleVersion`, `restoreFeeScheduleVersion`, and `importFeeConfiguration`.

2.  **Implement UI for Versioning and Import:**
    *   In `frontend/app/admin/fbo-config/fee-management/components/FeeScheduleSettingsTab.tsx`, create a "Version History" section. Use `useQuery` to fetch and display the list of versions. The "Restore" button for each version must trigger a ShadCN `<AlertDialog>` to confirm the destructive action before calling the service.
    *   In `frontend/app/admin/fbo-config/fee-management/components/UploadFeesDialog.tsx`, update the UI to be an "Import Configuration" dialog that accepts `.json` files. The form submission will call the `importFeeConfiguration` service function. On success, it must display a toast notification with the exact text: "Configuration imported successfully. A backup of the previous state is available for 48 hours."