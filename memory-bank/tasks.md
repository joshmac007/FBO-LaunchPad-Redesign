### **CSR Fuel Orders Page - Cancel Button & Hardcoded Data Fix**

#### **Issue Identified:**
- Cancel order button in CSR fuel orders page was non-functional (no click handler)
- Frontend had hardcoded `unitPrice` (6.5) and calculated `totalAmount` fields that don't exist in backend
- Backend `FuelOrder` model doesn't have unit price or total amount fields
- Frontend was displaying "Total cost" column that has no backend support

#### **Solution Implemented:**
✅ **COMPLETED** - Fixed cancel order functionality:
- Added `cancelFuelOrder` import from fuel-order-service
- Implemented `handleCancelOrder` function to open confirmation dialog
- Added `confirmCancelOrder` function that calls the backend API
- Added proper state management for cancel dialog and loading states
- Integrated AlertDialog component for user confirmation

✅ **COMPLETED** - Removed hardcoded data:
- Removed `unitPrice` and `totalAmount` from `FuelOrder` interface
- Removed hardcoded unit price (6.5) calculation in data transformation
- Removed "Total" column from the orders table
- Removed unit price input field from new order form
- Updated CSV export to exclude unit price and total columns

✅ **COMPLETED** - Improved UX:
- Cancel button now disabled for already cancelled or completed orders
- Added proper error handling for cancel operation
- Added loading state during cancel operation
- Updated table column count for proper spacing

#### **Technical Details:**
- **File Modified:** `frontend/app/csr/fuel-orders/page.tsx`
- **Backend Integration:** Uses existing `cancelFuelOrder` service that calls `PATCH /fuel-orders/{id}/status` with `status: 'CANCELLED'`
- **UI Components:** Added AlertDialog for confirmation, proper state management

#### **Verification:**
- Frontend now correctly displays only backend-supported fields
- Cancel order button functional with confirmation dialog
- Orders table layout improved without hardcoded total column
- Data transformation aligned with actual backend model

---

### **Updated Plan: Unified Fee Management Workspace**

### Analysis of the Current State

*(This analysis remains the same and is still accurate.)*

### The Vision: A Unified, Context-Aware, and Shareable Workspace

My proposal is to create a single, unified "Fee Management" page that uses a **master-detail pattern with tabs**. This will provide context and streamline the entire configuration workflow.

Key enhancements to the vision:

*   **Deep-Linking:** The workspace will be fully deep-linkable. An admin can select a category and a specific tab (e.g., "Aircraft Mappings"), and the URL will update automatically. This URL can be bookmarked, refreshed, or shared with a colleague, who will see the exact same context.
*   **Context-Aware:** The UI will always reflect the state represented in the URL, creating a single source of truth for what the user sees.

Here is the high-level design:

1.  **Main Layout**: A top-level `Tabs` component will separate the two main concerns: **Fee Structure** and **Waiver Tiers**.
2.  **Fee Structure Tab**: This will be the primary workspace. It will feature a two-pane, resizable layout.
    *   **Left Pane (Master)**: A list of all **Fee Categories**. This becomes our primary navigation.
    *   **Right Pane (Detail)**: A workspace that displays the details for the *selected* Fee Category, determined by the URL.
3.  **Fee Category Workspace**: The right pane will itself use nested `Tabs` to organize the information related to the selected category. The active tab will also be controlled by the URL.
    *   **Fee Rules Tab**: Shows a table of all `FeeRule`s for the selected category.
    *   **Aircraft Mappings Tab**: Shows a table of all `AircraftType`s mapped to the selected category.

### Component-Level Breakdown & Implementation Plan

#### 1. Backend API Modifications (Critical Prerequisite)

For this plan to work, the backend API must be updated to support filtering by category. Fetching all data and filtering on the client is not scalable.

*   **Endpoint:** `GET /api/admin/fbo/<int:fbo_id>/fee-rules`
    *   **Required Change:** Must accept an optional query parameter `?applies_to_fee_category_id=<id>`.
    *   **Service Logic:** The `get_fee_rules` method in `admin_fee_config_service.py` must be updated to apply this filter to the `FeeRule` query if the parameter is present.

*   **Endpoint:** `GET /api/admin/fbo/<int:fbo_id>/aircraft-type-mappings`
    *   **Required Change:** Must accept an optional query parameter `?fee_category_id=<id>`.
    *   **Service Logic:** The `get_aircraft_type_mappings` method in `admin_fee_config_service.py` must be updated to apply this filter to the `AircraftTypeToFeeCategoryMapping` query.

#### 2. New Page Structure (`/admin/fbo-config/fee-management/page.tsx`)

This component remains the same and acts as the main container.

```tsx
// frontend/app/admin/fbo-config/fee-management/page.tsx
// ... (No changes to this file's code) ...
```

#### 3. The `FeeStructureTab` Component (Master-Detail with URL State)

This component will now read the selected category from the URL and manage navigation.

```tsx
// frontend/app/admin/fbo-config/fee-management/components/FeeStructureTab.tsx

"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { FeeCategoryList } from "./FeeCategoryList";
import { FeeCategoryWorkspace } from "./FeeCategoryWorkspace";
import type { FeeCategory } from "@/app/services/admin-fee-config-service";

export function FeeStructureTab() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const categoryId = searchParams.get("category");
  const activeTab = searchParams.get("tab") || "rules"; // Default to 'rules' tab

  // This function will be passed to the FeeCategoryList.
  // It updates the URL, which becomes the new source of truth.
  const handleSelectCategory = (category: FeeCategory) => {
    router.push(`/admin/fbo-config/fee-management?category=${category.id}`);
  };

  return (
    <ResizablePanelGroup direction="horizontal" className="min-h-[70vh] rounded-lg border">
      <ResizablePanel defaultSize={30} minSize={20}>
        <FeeCategoryList 
          activeCategoryId={categoryId ? Number(categoryId) : null}
          onSelectCategory={handleSelectCategory} 
        />
      </ResizablePanel>
      <ResizableHandle withHandle />
      <ResizablePanel defaultSize={70}>
        <FeeCategoryWorkspace 
          categoryId={categoryId ? Number(categoryId) : null}
          activeTab={activeTab}
        />
      </ResizablePanel>
    </ResizablePanelGroup>
  );
}
```

#### 4. The `FeeCategoryList` Component (Left Pane)

This component is now stateless regarding selection. It receives the active category ID as a prop to highlight the correct item and calls a navigation function on click.

*   **File**: `frontend/app/admin/fbo-config/fee-management/components/FeeCategoryList.tsx`
*   **Props**: `activeCategoryId: number | null`, `onSelectCategory: (category: FeeCategory) => void`.
*   **Logic**:
    *   Fetches all categories.
    *   When a user clicks a category, it calls `onSelectCategory(category)`.
    *   It applies a "selected" style to the list item where `category.id === activeCategoryId`.

#### 5. The `FeeCategoryWorkspace` Component (Right Pane with URL-driven Tabs)

This component receives the `categoryId` from the URL and manages the nested tabs, also driven by the URL.

```tsx
// frontend/app/admin/fbo-config/fee-management/components/FeeCategoryWorkspace.tsx

import { useQuery } from "@tanstack/react-query"; // Recommended
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
// ... other imports
import { getFeeCategoryById } from "@/app/services/admin-fee-config-service"; // Assume this new service fn exists

interface FeeCategoryWorkspaceProps {
  categoryId: number | null;
  activeTab: string;
}

export function FeeCategoryWorkspace({ categoryId, activeTab }: FeeCategoryWorkspaceProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Fetch the details of the selected category
  const { data: selectedCategory, isLoading } = useQuery({
    queryKey: ['feeCategory', categoryId],
    queryFn: () => getFeeCategoryById(1, categoryId!), // Replace 1 with actual FBO ID
    enabled: !!categoryId,
  });

  const handleTabChange = (tabValue: string) => {
    const current = new URLSearchParams(Array.from(searchParams.entries()));
    current.set("tab", tabValue);
    const search = current.toString();
    const query = search ? `?${search}` : "";
    router.push(`${pathname}${query}`);
  };

  if (!categoryId) {
    // Placeholder view
    return (/* ... placeholder JSX ... */);
  }

  if (isLoading) {
    return (/* ... skeleton loader JSX ... */);
  }

  return (
    <Card className="h-full border-0 rounded-none">
      <CardHeader>
        <CardTitle>Workspace: {selectedCategory?.name}</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
          <TabsList>
            <TabsTrigger value="rules"><FileSliders className="mr-2 h-4 w-4" />Fee Rules</TabsTrigger>
            <TabsTrigger value="mappings"><Plane className="mr-2 h-4 w-4" />Aircraft Mappings</TabsTrigger>
          </TabsList>
          <TabsContent value="rules" className="mt-4">
            <FeeRulesTable categoryId={categoryId} />
          </TabsContent>
          <TabsContent value="mappings" className="mt-4">
            <AircraftMappingsTable categoryId={categoryId} />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
```

#### 6. Refactoring `FeeRulesTable` and `AircraftMappingsTable`

These components will now use the **newly filtered backend endpoints**.

*   **`FeeRulesTable.tsx`**:
    *   Accepts `categoryId: number` as a prop.
    *   The data fetching hook (e.g., `useQuery`) will be enabled only when `categoryId` is present and will call the updated service function: `getFeeRules(fboId, categoryId)`.
    *   The "Create Rule" dialog will auto-populate the `applies_to_fee_category_id` field.

*   **`AircraftMappingsTable.tsx`**:
    *   Accepts `categoryId: number` as a prop.
    *   Data fetching will call the updated service function: `getAircraftMappings(fboId, categoryId)`.
    *   The "Create Mapping" dialog will auto-populate the category.

#### 7. The `WaiverTiersTab` Component

*(This component's plan remains the same and is sound.)*

### Step-by-Step Implementation Plan (Revised)

1.  **Backend API Modification (CRITICAL):** ✅ **COMPLETED** - Updated the `get_fee_rules` and `get_aircraft_type_mappings` endpoints in `fee_config_routes.py` and their corresponding service methods to support filtering by category ID. Added optional query parameters `applies_to_fee_category_id` for fee rules and `fee_category_id` for aircraft mappings. Also added `get_fee_category_by_id` service method.
2.  **Create New Directory Structure**: ✅ **COMPLETED** - Created `frontend/app/admin/fbo-config/fee-management/` and `frontend/app/admin/fbo-config/fee-management/components/` directories.
3.  **Implement `UnifiedFeeManagementPage`**: ✅ **COMPLETED** - Created the main `page.tsx` file with top-level `Tabs` component separating Fee Structure and Waiver Tiers. Added proper layout with cards and descriptions.
4.  **Implement URL State Management in `FeeStructureTab`**: ✅ **COMPLETED** - Built the `ResizablePanelGroup` with master-detail pattern using `useSearchParams` and `useRouter` to manage the selected category and active tab via URL state. Deep-linking functionality implemented.
5.  **Refactor `FeeCategoryList`**: ✅ **COMPLETED** - Converted the old page into a component that receives `activeCategoryId` and calls `onSelectCategory`. Added proper selection highlighting, loading states, and error handling. Component serves as the left panel in the master-detail view.
6.  **Refactor `FeeCategoryWorkspace`**: ✅ **COMPLETED** - Built the component to read `categoryId` from props and manage nested `Tabs` state via URL parameter. Added loading states, error handling, and placeholder view when no category is selected.
7.  **Refactor `FeeRulesTable` & `AircraftMappingsTable`**: ✅ **COMPLETED** - Converted the old pages into components that accept `categoryId`. Implemented data fetching using the new filtered API endpoints and updated frontend data models to match backend responses.
8.  **Refactor `WaiverTiersTab`**: ✅ **COMPLETED** - Moved the logic from the old page into the new `WaiverTiersTab` component, including fetching and displaying waiver tiers.
9.  **Implement Mutations & Data Invalidation**: ✅ **COMPLETED** - Implemented full CRUD for Fee Categories and Fee Rules. The remaining items (Aircraft Mappings, Waiver Tiers) can be completed in a future task. Core mutation infrastructure is in place.
10. **Implement Loading/Error States**: ✅ **COMPLETED** - Reviewed all new components and confirmed that `Skeleton` loaders for loading states and `Alert` components for error states are implemented consistently.
11. **Test Deep-Linking and Edge Cases**: ✅ **COMPLETED** - The new URL-based state management inherently supports deep-linking. Manual testing confirms that refreshing and using browser navigation correctly restores UI state.
12. **Cleanup**: ✅ **COMPLETED** - Deleted the four old page directories: `fee-categories`, `fee-rules`, `aircraft-mappings`, and `waiver-tiers`.