Excellent. These are crucial business rules that will make the system much more robust and align it with real-world operational needs. Locking the `FuelOrder` after receipt creation prevents data integrity issues, and the void-and-recreate flow for receipts is a standard accounting practice.

Here is the rewritten plan incorporating these new requirements.

---

### **Plan 8: Linking Receipts, Locking Orders, and Handling Voids**

*   **Objective:** Establish a clear, flexible link between a `FuelOrder` and its `Receipt`(s). Update the Fuel Order UI to dynamically show "Create Receipt" or "View Receipt" buttons. Implement logic to lock a `FuelOrder` from modification once an active receipt exists and provide a workflow for voiding receipts.
*   **Relevant PRD Sections:** This enhances PRD Section 4.1 (Receipt Initiation) and introduces new business rules for data integrity and operational flexibility.

---

### **Phase 8.1: Backend - Data Model, API, and Business Logic** ✅ **COMPLETED**

*   **Goal:** Implement the backend changes to support the one-to-many relationship, expose the "active" receipt, lock the fuel order, and handle receipt voiding.

*   **Sub-Phase 8.1.1: Test Creation (Backend)** ✅ **COMPLETED**
    *   **AI Agent - Test Creation Steps:**
        1.  ✅ **Modified `test_fuel_order_api.py`:** Added `TestFuelOrderReceiptLinking` with 3 test cases:
            *   **Test Case 1 (Order with Active Receipt):** Verifies `receipt_id` and `is_locked=true` fields
            *   **Test Case 2 (Order with Voided Receipt):** Verifies `receipt_id=null` and `is_locked=false`
            *   **Test Case 3 (Modify Locked Order Fails):** Verifies 400 error when modifying locked order
        2.  ✅ **Created `test_receipt_api.py`:** Added `TestReceiptVoidAPI` with comprehensive void functionality tests

*   **Sub-Phase 8.1.2: Backend Implementation** ✅ **COMPLETED**
    *   **AI Agent - Backend Implementation Steps:**
        1.  ✅ **Confirmed `FuelOrder` to `Receipt` Relationship:** Verified one-to-many relationship structure
        2.  ✅ **Modified `FuelOrderResponseSchema`:** Added `receipt_id` and `is_locked` Method fields with logic:
            ```python
            receipt_id = fields.Method("get_active_receipt_id", allow_none=True)
            is_locked = fields.Method("get_is_locked", dump_only=True)

            def get_active_receipt_id(self, obj):
                for receipt in obj.receipts:
                    if receipt.status != ReceiptStatus.VOID:
                        return receipt.id
                return None

            def get_is_locked(self, obj):
                return any(r.status != ReceiptStatus.VOID for r in obj.receipts)
            ```
        3.  ✅ **Implemented Order Locking in `FuelOrderService`:** Added check in `manual_update_order_status`:
            ```python
            active_receipt_exists = any(r.status != ReceiptStatus.VOID for r in order.receipts)
            if active_receipt_exists:
                raise ValueError("Cannot modify a Fuel Order that has an active receipt.")
            ```
        4.  ✅ **Implemented Receipt Voiding (`ReceiptService`):** Added `void_receipt()` method with proper validation and audit logging
        5.  ✅ **Created Void Receipt API Route:** Added `POST /api/fbo/<int:fbo_id>/receipts/<int:receipt_id>/void` with `void_receipt` permission
        6.  ✅ **Added Permission:** Added 'void_receipt' permission to seeds.py

---

### **Phase 8.2: Frontend - UI and User Flow** ✅ **COMPLETED**

*   **Goal:** Update the UI to reflect the locked state of fuel orders and provide a clear, intuitive path for creating or viewing receipts.

*   **Sub-Phase 8.2.1: Frontend Service Updates** ✅ **COMPLETED**
    *   **AI Agent - Frontend Service Steps:**
        1.  ✅ **Updated `FuelOrderDisplay` Interface:** Added `receipt_id?: number | null` and `is_locked: boolean` fields
        2.  ✅ **Updated `FuelOrderBackend` Interface:** Added corresponding backend fields
        3.  ✅ **Enhanced `transformToDisplay` Function:** Added mapping for new fields
        4.  ✅ **Added `voidReceipt` Function:** Implemented in receipt-service.ts with proper API integration

*   **Sub-Phase 8.2.2: Frontend UI Implementation** ✅ **COMPLETED**
    *   **AI Agent - Frontend UI Steps:**
        1.  ✅ **Updated Fuel Order Detail Page (`/csr/fuel-orders/[id]/page.tsx`):**
            *   **Locking Logic:** "Update Status" button disabled if `fuelOrder.is_locked` with tooltip explanation
            *   **Dynamic Receipt Button Logic:** Three-state implementation:
                ```jsx
                {fuelOrder.receipt_id ? (
                  <Link href={`/csr/receipts/${fuelOrder.receipt_id}`}>
                    <Button>View Receipt</Button>
                  </Link>
                ) : (
                  <CSRActionButton
                    requiredPermission="create_receipt"
                    onClick={handleCreateReceipt}
                    disabled={!canCreateReceipt}
                    title={!canCreateReceipt ? "Order must be completed or reviewed to create a receipt." : "Create Receipt"}
                  >
                    Create Receipt
                  </CSRActionButton>
                )}
                ```
        2.  ✅ **Enhanced Receipt Detail Page (`/csr/receipts/[id]/page.tsx`):**
            *   **VOID Banner:** Large "VOID" watermark overlay when `receipt.status === 'VOID'`
            *   **Void Receipt Button:** Available for GENERATED/PAID receipts with `void_receipt` permission
            *   **Void Confirmation Dialog:** Requires reason, shows confirmation before voiding
            *   **Action Button Management:** Disables other action buttons for VOID receipts

---

### **Phase 8.3: Testing & Verification** 🔄 **IN PROGRESS**

**Backend Environment Status:** ✅ **READY**
- ✅ Database seeded with all permissions including 'void_receipt'
- ✅ Permission groups configured and role assignments complete
- ✅ Backend containers running (backend-backend-1, backend-db-1)
- ✅ Enhanced permission system activated

**Manual Verification Steps:** 📋 **PENDING USER TESTING**

To complete Plan 8 verification, perform these manual tests in the running application:

1. **Test Case 1: Create Receipt for Completed Order**
   - Navigate to a `COMPLETED` fuel order → "Create Receipt" button should be **enabled**
   - Create a receipt → Verify successful creation

2. **Test Case 2: Order Locking Verification**  
   - Go back to the fuel order from Test Case 1 → "View Receipt" button should be shown
   - Verify "Update Status" button is **disabled** with tooltip: "Order is locked because a receipt has been generated."

3. **Test Case 3: Disabled Create Receipt**
   - Navigate to an `EN_ROUTE` fuel order → "Create Receipt" button should be **disabled**
   - Tooltip should show: "Order must be completed or reviewed to create a receipt."

4. **Test Case 4: Void Receipt Workflow**
   - Go to the receipt created in Test Case 1 → Click "Void Receipt" button
   - Enter a reason and confirm → Verify receipt page shows "VOID" watermark
   - Verify other action buttons are disabled

5. **Test Case 5: Void-and-Recreate Flow**
   - Go back to the fuel order → "Create Receipt" should be **enabled** again
   - "Update Status" should also be **enabled** again
   - This confirms the complete void-and-recreate workflow

**Frontend Testing Prerequisites:**
- Ensure frontend dev server is running: `npm run dev` (should be on http://localhost:3000)
- Login with CSR credentials: `csr@fbolaunchpad.com / CSR123!`
- Ensure backend is accessible at http://localhost:5001

**Plan 8 Objective Achievement:**
✅ **IMPLEMENTATION COMPLETE** - Receipt linking, order locking, and void handling are fully implemented with robust business logic, comprehensive UI integration, and proper security controls. The system now prevents data integrity issues and supports standard accounting practices for receipt management.

**Next Steps for Completion:**
1. Start frontend dev server if not running
2. Perform manual verification tests 1-5 above
3. Document any issues found during testing
4. Mark Plan 8 as fully complete once all tests pass