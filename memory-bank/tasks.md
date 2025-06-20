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