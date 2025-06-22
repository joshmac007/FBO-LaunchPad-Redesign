Of course. Here are the three complete, updated documents based on our finalized architectural plan. They are structured to be clear, unambiguous, and ready for the implementation team.

***

### **1. Product Requirements Document (PRD)**
---
## **Product Requirements Document: FBO Launchpad Fueler System**

**Version:** 2.0
**Status:** Finalized for Implementation
**Date:** June 9, 2025
**Author:** FBO Launchpad Team & AI Collaborator

### 1. Overview

The Fueler System is a mission-critical operational module for FBO Launchpad designed to provide Line Service Technicians (LSTs or "Fuelers") with a real-time, interactive, and resilient interface for managing and executing fuel orders. The system will digitize the fueling workflow, moving from a server-assigned ("push") model to a competitive-claim ("pull") model for unassigned orders.

The primary goals are to increase operational tempo, reduce radio chatter, provide system-wide real-time visibility, and create a closed-loop communication system for post-dispatch updates. The interface will be optimized for tablets (e.g., iPad) and mobile phones, accounting for the reality of potentially unstable network conditions on an airport ramp.

### 2. User Personas

*   **Line Service Technician (LST) / Fueler:** The primary user. They are mobile, working outdoors on the ramp, and need a fast, clear, and reliable mobile interface to view available jobs, claim work, and report progress with minimal data entry.
*   **Customer Service Representative (CSR):** A secondary user. They dispatch orders and need real-time visibility into order status (e.g., who claimed an order, current progress) to manage ramp operations and answer customer inquiries. They also need to be able to communicate changes to an order that is already in progress.

### 3. User Stories / Epics

*   **Epic 1: Real-Time Order Dispatch & Claiming**
    *   As a Fueler, I want to see a queue of all available, unassigned fuel orders so I can pick up new work.
    *   As a Fueler, I want to "Acknowledge" an available order to claim it, which should immediately assign it to me and remove it from the queue for other fuelers.
    *   As a Fueler, if I suspect my list of available orders is out of date, I want to perform a "pull-to-refresh" gesture to immediately fetch the latest list from the server.
    *   As a CSR, when I create an order, I can either manually assign it to a specific fueler or dispatch it to the general queue for any available fueler to claim.

*   **Epic 2: Intuitive & Resilient Fueling Workflow**
    *   As a Fueler, I want to see my claimed orders in a personal queue, separate from the general pool.
    *   As a Fueler, I want to use large, clear buttons to update my order status from "Acknowledged" -> "En Route" -> "Fueling" -> "Completed".
    *   As a Fueler, I want the app to feel instant, even if my connection is weak. If an action is sent but not yet confirmed by the server, I want to see a clear "Queued" indicator on the order.
    *   As a Fueler, if my action fails to sync after an extended period, I want the app to clearly revert the action and show a "Sync Failed" error on the order so I know I need to retry.
    *   As a Fueler, when I am ready to complete the job, I want a simple form to enter the start and end meter readings and any final notes.
    *   As a Fueler, when I enter my start and end meter readings, I want to see the calculated total gallons dispensed in real-time so I can confirm the amount is correct before finalizing the job.

*   **Epic 3: Dynamic Order Modification & Communication**
    *   As a CSR, I need to update the details of a fuel order (like gallon amount or adding notes) *after* it has been claimed by a fueler.
    *   As a Fueler, I want to be immediately and clearly notified on my device when a CSR updates one of my active orders, so I don't perform the wrong service.
    *   As a Fueler, I must explicitly acknowledge the **latest** changes made to my active order, so the CSR knows I have seen the most recent update, even if multiple changes were made.
    *   As a CSR, I want to see confirmation that the Fueler has acknowledged my changes to an order.

*   **Epic 4: System-Wide Visibility & Data Integrity**
    *   As a CSR, I want to see who claimed an unassigned order and watch its status update in real-time on my dashboard without needing to refresh my page.
    *   As a System, once a fuel order is `COMPLETED`, its final `gallons_dispensed` amount should be locked and considered the authoritative value for billing, regardless of the initially requested amount.
    *   As a System, all significant order modifications and acknowledgements must be logged with versioning for a complete audit trail.

### 4. Functional Requirements

#### 4.1. Fueler Dashboard
*   **Layout:** A multi-column Kanban board: "Available Orders", "My Queue", "In-Progress", and "Completed Today".
*   **Order Card:** Displays essential information. It must have distinct visual states for "Queued" (action is pending sync) and "Sync Failed" (action requires user intervention).
*   **Connection Status Banner:** A dedicated UI element must inform the user of their real-time connection status (`Reconnecting...`, `Syncing...`) and the number of queued actions.
*   **Manual Refresh:** The "Available Orders" column must support a "pull-to-refresh" gesture.

#### 4.2. Fueler Workflow & State Management
1.  **Claiming an Order:** Tapping "Acknowledge" on an available order performs an **atomic backend update** to prevent race conditions and provides an optimistic UI update.
2.  **Executing the Order:** A series of single-tap actions update the order status.
3.  **Completion Dialog:**
    *   A dialog appears for entering `start_meter_reading`, `end_meter_reading`, and notes.
    *   The dialog must include a non-editable field that displays the calculated `gallons_dispensed` in real-time as the user types.
    *   Upon submission, the system records the calculated `gallons_dispensed` as the final, authoritative amount for the order.

#### 4.3. CSR Post-Dispatch Updates
*   **CSR Interface:** An authorized CSR can edit active orders.
*   **Backend Logic:** Each update increments a `change_version` integer on the `FuelOrder` record.

#### 4.4. Fueler Change Acknowledgement
*   **UI Notification:** The corresponding order card is visually highlighted, and standard action buttons are disabled. A new **"Acknowledge Change"** button appears.
*   **Acknowledgement Action:** The fueler taps the button, which sends the `change_version` they are acknowledging to the backend. The backend validates this version before clearing the pending state.

### 5. Non-Functional Requirements

*   **Performance:**
    *   New orders must appear on the Fueler Dashboard within **2 seconds** of being dispatched.
    *   UI actions must feel instantaneous via optimistic updates.
*   **Usability:**
    *   The interface must be "thumb-friendly" with large tap targets.
    *   It must have a **high-contrast mode** for clear visibility in bright sunlight.
    *   The workflow must minimize typing.
*   **Reliability (Queued Actions Model):**
    *   The system must handle network interruptions gracefully. Actions performed while disconnected are added to a local queue.
    *   The UI must provide clear, persistent visual feedback for queued (`Syncing...` badge) and failed (`Sync Failed` badge) actions.
    *   Upon reconnection, the client automatically attempts to sync all queued actions.
    *   If an action is rejected by the server or fails after a prolonged period, the UI must revert the change and clearly mark the item as needing attention.
*   **Scalability:**
    *   The architecture must support dozens of concurrent fuelers without performance degradation.

### 6. Out of Scope for V2.0

*   **Full Offline Mode:** The ability to start and complete an entire workflow while persistently offline.
*   **Direct Hardware Integration:** Integration with fuel truck meters.
*   **In-App Chat:** Direct messaging between users.

### 7. Success Metrics

*   **Time to Acknowledge:** Reduction in the average time from `DISPATCHED` to `ACKNOWLEDGED`.
*   **Data Accuracy:** Reduction in errors related to incorrect fuel amounts on receipts.
*   **User Adoption & Feedback:** Positive feedback from LSTs and CSRs on ease of use and efficiency.
*   **Audit Trail Completeness:** 100% of post-dispatch CSR updates and acknowledgements are captured.

***

