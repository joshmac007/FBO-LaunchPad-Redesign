## Product Requirements Document: CSR Receipt System

**Document Version:** 1.3
**Author/Collaborators:** AI Assistant & User
**Status:** Final Draft for Implementation Planning

---

**1. Introduction & Goals**

*   **1.1. Purpose:**
    To integrate a comprehensive receipt generation and management system within the FBO LaunchPad platform. This system will enable Customer Service Representatives (CSRs) to efficiently create, manage, track, and distribute accurate receipts for completed fuel orders and associated services.
*   **1.2. Primary Goals:**
    *   Consolidate receipt management into the FBO LaunchPad platform, eliminating reliance on disparate or manual systems.
    *   Enhance the platform's value proposition as a "one-stop-shop" for FBO operations.
    *   Improve CSR efficiency and accuracy in generating and processing customer invoices.
    *   Provide clear and professional transaction documentation for customers.
    *   Lay the groundwork for future financial integrations and analytics.
*   **1.3. Success Metrics (SMART):**
    *   Achieve >80% of active FBOs utilizing the receipt system for at least 50% of their eligible transactions within 6 months post-launch.
    *   Reduce the average time for CSRs to generate and finalize a receipt by 25% (compared to current baseline, or a target of < X minutes, e.g., < 5 minutes) within 3 months post-launch.
    *   Maintain a CSR satisfaction score of >4.0/5.0 regarding the receipt system's ease of use and accuracy, measured via quarterly surveys post-launch.
    *   Reduce billing discrepancies related to fuel/service charges attributed to receipt errors by 15% within 6 months post-launch.
*   **1.4. Out of Scope (for MVP v1):**
    *   Direct, automated integration with external accounting software (e.g., QuickBooks).
    *   Advanced analytics and reporting dashboards specifically for receipts (e.g., detailed revenue breakdowns by service, client profitability within the receipt module).
    *   API-driven automatic fetching/enrichment of aircraft information based on live flight data for receipt generation.
    *   Direct payment gateway integration for processing payments within the receipt generation flow (MVP will use a manual "Mark as Paid" checkbox).
    *   Full implementation of aircraft weight-based fuel pricing (the system will be designed with modularity to support this in the future).
    *   Full multi-tenancy refactor of existing core system tables (Users, FuelOrders, etc.) to support `fbo_location_id`. New receipt-related tables will be designed with `fbo_location_id`, but initial MVP operation might simulate a single FBO context.

---

**2. User Roles & Personas**

*   **Customer Service Representative (CSR):**
    *   Primary user of the receipt system.
    *   Responsible for initiating receipt generation from completed fuel orders, verifying/enriching data, applying appropriate fees and waivers, finalizing receipts, and distributing them to customers.
*   **FBO Administrator/Manager:**
    *   Responsible for configuring and managing FBO-specific fee schedules, aircraft type categorizations, waiver rules, CAA parameters, and additional service pricing within the admin interface.
*   **Customer (Indirect):**
    *   The end recipient of the generated receipt. Needs clear, accurate, and professional documentation of services rendered and charges.

---

**3. User Stories**

*   **CSR:**
    *   As a CSR, I want to easily initiate receipt generation from a "completed" fuel order.
    *   As a CSR, I want the system to pre-fill receipt details (Tail Number, Aircraft Type, Fuel Quantity in **gallons**, Fuel Type) from the associated fuel order.
    *   As a CSR, I want to be able to add or correct "Aircraft Type" and "Customer" information on the draft receipt if it's missing or incorrect.
    *   As a CSR, if no customer is linked to the fuel order, I want the system to use the Tail Number as a placeholder customer identifier on the receipt, while still allowing me to link or create a proper customer record.
    *   As a CSR, I want to click a "Calculate Fees" button to see an itemized breakdown of all applicable fees, taxes, and potential waivers based on the FBO's fee schedule, the specific aircraft type's base minimum fuel (**gallons**) for waiver, and the actual fuel uplift (**gallons**).
    *   As a CSR, I want the system to automatically apply fee waivers if fuel uplift conditions (based on aircraft type minimums in **gallons** and FBO waiver tiers) are met.
    *   As a CSR, I want the ability to manually apply or remove a fee waiver (if eligible); this capability is part of the general receipt management permission for MVP.
    *   As a CSR, I want to be able to add itemized additional services/fees (e.g., Lav, GPU, Trash) to the receipt from a list of FBO-defined services.
    *   As a CSR, I want the receipt to be automatically saved as a "Draft" as I make changes.
        *   *AI Clarification:* Auto-save should trigger on field blur (when a CSR moves out of an edited input field) or via a debounced mechanism (e.g., 1-2 seconds after the last significant change in a form section).
    *   As a CSR, I want to click "Generate Receipt" to finalize the draft, assign a receipt number, and make it an official, read-only record.
    *   As a CSR, after a receipt is generated, I want to be able to mark it as "Paid" using a checkbox to reflect offline payment.
    *   As a CSR, I want to be able to download the finalized receipt as a PDF.
    *   As a CSR, I want to be able to print the finalized receipt in a standard 8.5x11 format.
    *   As a CSR, I want to be able to email the finalized PDF receipt to the customer using a pre-defined system template.
    *   As a CSR, I want to view a list of all previously generated receipts (Draft, Generated, Paid).
    *   As a CSR, I want to search and filter the list of past receipts by criteria such as Aircraft Tail Number, Date Range, Customer Name, and Receipt Status.
    *   As a CSR, if a customer is a CAA member, I want the system to automatically apply any CAA-specific fee amounts or waiver conditions when calculating fees.
*   **FBO Administrator:**
    *   As an FBO Admin, I want a dedicated interface to define and manage all fee schedules and rules specific to my FBO location.
    *   As an FBO Admin, I want to define standard fees (e.g., Ramp, Overnight, Facility) based on Aircraft Fee Categories (e.g., "Light Jet," "Helicopter").
    *   As an FBO Admin, I want to define a 'Base Minimum Fuel Volume for Waiver' (in **gallons**) for each Aircraft Type for my FBO.
    *   As an FBO Admin, I want to define "Waiver Tiers" that specify multipliers of an aircraft type's base minimum fuel (**gallons**) and list which specific fee codes are waived if that multiplied threshold is met.
    *   As an FBO Admin, I want to define prices for additional billable services (e.g., Lavatory Service, GPU, Trash Disposal).
    *   As an FBO Admin, I want to be able to upload and manage a CSV mapping specific Aircraft Makes/Models to their designated Fee Categories for my FBO.
        *   *AI CSV Sample Structure:* Columns: `AircraftModel` (TEXT, required), `AircraftManufacturer` (TEXT, optional), `FeeCategoryName` (TEXT, required - must match an existing FeeCategory name for the FBO).
    *   As an FBO Admin, for each fee rule, I want to be able to specify override amounts and waiver conditions (strategy, multipliers, or tier links) that apply specifically to CAA members.

---

**4. Process Flow & Features**

*   **4.1. Receipt Initiation:**
    *   A "Create Receipt" button will be accessible from the view of a "Completed" Fuel Order.
    *   Initiating a receipt creates a new `Receipt` record in "Draft" status, linked to the `FuelOrder`.
*   **4.2. Data Pre-fill & Enrichment:**
    *   The Draft Receipt form is pre-filled with data from the `FuelOrder`: Tail Number, Aircraft Type (if available), actual Fuel Quantity dispensed (in **gallons**), Fuel Type. Customer and Line Service Technician (LST) Notes are also carried over if present.
    *   CSRs can edit or add:
        *   **Aircraft Type:** If missing or incorrect.
        *   **Customer:**
            *   If the `FuelOrder` has no linked `customer_id`, the backend service for draft receipt creation will internally create a placeholder `Customer` record (e.g., `name = "N123AB"`, `email = "n123ab@placeholder.invalid"`, `is_placeholder = true`, associated with the FBO). This placeholder `customer_id` is linked to the `Receipt`.
            *   **Frontend Display (Placeholder):** When `Customer.is_placeholder` is true, the UI on the receipt form and final receipt will display the aircraft's Tail Number as the customer identifier (e.g., "Customer Account: N123AB"). The customer selection input should appear as if no customer is selected or allow selection/creation of a new one.
            *   CSRs can select an existing *real* customer or create a new *real* customer. If a real customer is assigned, the `Receipt.customer_id` is updated.
*   **4.3. Fee Calculation & Management:**
    *   An itemized list of fees, waivers, fuel costs, and totals will be displayed on the draft receipt form.
    *   **"Calculate Fees" Button:**
        *   Triggers backend fee calculation.
        *   The system first checks if the linked `Customer` has `is_caa_member = true`.
        *   For each potentially applicable `FeeRule` (based on FBO, Aircraft Fee Category):
            *   If the customer is a CAA member and the `FeeRule` has CAA overrides (`has_caa_override = true`), the CAA-specific amount and waiver logic (strategy, multipliers) are used.
            *   Otherwise, the standard fee amount and waiver logic are used.
        *   Waiver evaluation (for both standard and CAA scenarios):
            *   If `waiver_strategy` is `'SIMPLE_MULTIPLIER'`, the required fuel is `AircraftTypes.base_min_fuel_gallons_for_waiver` * `FeeRules.simple_waiver_multiplier` (or its CAA override). If met, only that specific fee is waived.
            *   If `waiver_strategy` is `'TIERED_MULTIPLIER'`, all relevant `WaiverTiers` for the FBO (and potentially CAA-specific tiers, identified by `WaiverTiers.is_caa_specific_tier`) are evaluated against `AircraftTypes.base_min_fuel_gallons_for_waiver` * `WaiverTiers.fuel_uplift_multiplier`. The highest priority met tier that lists a specific `fee_code` in its `fees_waived_codes` determines if that fee is waived.
    *   **Manual Waiver Override:** CSRs can manually toggle the waived status of any fee marked as `is_potentially_waivable_by_fuel_uplift = true`. This capability is part of the general receipt management permission for MVP.
    *   **Additional Services/Fees:** CSRs can add itemized fees for services (Lav, GPU, etc.) from a list of FBO-defined services during draft editing.
    *   **Draft Persistence:** All changes are auto-saved to the "Draft" receipt (triggered by field blur or debounced input).
*   **4.4. Receipt Finalization:**
    *   **"Generate Receipt" Button:**
        *   Active after fees have been calculated.
        *   Finalizes the draft: assigns a unique `receipt_number`, changes status to **'GENERATED'** (implies "Finalized but Unpaid"), makes the receipt largely read-only. Records `generated_at` timestamp and `created_by_user_id`.
    *   **"Mark as Paid" Checkbox:**
        *   Available for "GENERATED" receipts.
        *   Changes status to "PAID" and records `paid_at` timestamp.
*   **4.5. Receipt Output & Storage:**
    *   **Download PDF:** Generates and downloads a PDF of the finalized receipt.
    *   **Print:** Opens a print-friendly view of the receipt for standard browser printing (8.5x11).
    *   **Email:** Sends the PDF receipt to the customer's email (if available) using a system template.
    *   All receipts (Draft, Generated, Paid, Void-future) are stored in the database.
*   **4.6. Viewing & Managing Receipts (`csr/receipts` page):**
    *   Dedicated page listing receipts for the CSR's FBO.
    *   Default sort: Most recent `generated_at` or `created_at` first.
    *   Filters: Aircraft Tail Number, Date Range (generation/payment), Customer Name/ID, Status (Draft, Generated, Paid).
    *   Displays key info: Receipt #, Date, Tail #, Customer, Total Amount, Status.
    *   Links to a detailed "View Receipt" page for each entry.

---

**5. Fee Schedule System (Admin Interface - High-Level)**

*   FBO Admins will have a dedicated section to manage configurations for *their specific FBO location*.
*   **Aircraft Type Management:**
    *   View system-wide aircraft types.
    *   Define/Override `base_min_fuel_gallons_for_waiver` (in **gallons**) for each aircraft type *for their FBO*.
    *   Map aircraft types to FBO-specific `FeeCategories` (e.g., via CSV upload or UI).
*   **Fee Category Management:** Define FBO-specific fee categories (e.g., "Light Jet," "Heavy Jet," "Piston Single").
*   **Fee Rule Management:**
    *   Create/edit `FeeRules` applicable to an `FeeCategory`.
    *   Define standard fee `amount`.
    *   Set `is_potentially_waivable_by_fuel_uplift`.
    *   Define `calculation_basis` (e.g., 'FIXED_PRICE', 'PER_UNIT_SERVICE', 'NOT_APPLICABLE').
    *   Select `waiver_strategy` ('NONE', 'SIMPLE_MULTIPLIER', 'TIERED_MULTIPLIER').
    *   If 'SIMPLE_MULTIPLIER', set `simple_waiver_multiplier`.
    *   If 'TIERED_MULTIPLIER', the rule becomes eligible for waiver by `WaiverTiers` that include its `fee_code`.
    *   Configure CAA overrides: `has_caa_override`, `caa_override_amount`, `caa_waiver_strategy_override`, `caa_simple_waiver_multiplier_override`.
*   **Waiver Tier Management:**
    *   Create/edit `WaiverTiers` for the FBO.
    *   Define `name`, `fuel_uplift_multiplier` (acts on `AircraftTypes.base_min_fuel_gallons_for_waiver`), `fees_waived_codes` (list of fee codes waived by this tier), `tier_priority`, and `is_caa_specific_tier`.
*   **Additional Service Fee Management:** Define fixed-price or per-unit additional services (these are `FeeRules` with `calculation_basis` = 'FIXED_PRICE' or 'PER_UNIT_SERVICE').
*   **Fuel Pricing:** (Managed separately but referenced by receipt calculations) Input base prices for Jet A, Avgas (in per **gallon** rate).

---

**6. Receipt Details (Content of Generated Receipt)**

*   **FBO Information:** Name, Logo, Address, Contact Details (configurable per FBO).
*   **Receipt Information:** Unique Receipt Number, Generation Date & Time, associated Fuel Order ID.
*   **Customer Information:** Name, Company (if available). If placeholder customer (`is_placeholder=true`), display "Account: \[TailNumber]".
*   **Aircraft Information:** Tail Number, Aircraft Type (snapshot from receipt generation time).
*   **Fueling Details:** Fuel Type, Quantity Dispensed (**gallons**), Unit Price (per **gallon**), Fuel Sub-total (all snapshotted).
*   **Itemized Line Items:**
    *   Fuel (as above).
    *   Each applied service/fee (e.g., Ramp Fee, Overnight, GPU) with its name and amount.
    *   Each applied waiver shown clearly as a **negative line item** (e.g., "Fuel Uplift Waiver (Ramp Fee): -$50.00").
*   **Summary:** Sub-total before tax, Total Tax, Grand Total Amount.
*   **Payment Information:** Payment Status (e.g., Unpaid, Paid).
*   **Notes:** Any relevant CSR or LST notes.
*   (Optional) Brief "Thank You" message or FBO-specific terms.

---

**7. Technical Considerations**

*   **General Guiding Principles for AI Agent:**
    *   **Unit Standardization (Fuel Volume):** The standard internal unit for storing and calculating all fuel quantities and fuel-based waiver thresholds will be **gallons**. All database fields, calculations, and internal logic must consistently use gallons. If any admin input allows for pounds, the system must immediately convert it to gallons for storage using a standard, configurable conversion factor.
    *   **Configuration Loading:** Design for efficient loading of FBO-specific configurations (fee rules, waiver tiers, aircraft type mappings, fuel prices), potentially with caching, for the active FBO context.
    *   **Service-Oriented Design:** Structure complex logic, particularly fee and waiver calculations, into dedicated backend services/modules (e.g., a `FeeCalculationService`).
    *   **Use of Enums/Constants:** Utilize enumerations or constants for predefined sets of values (e.g., receipt statuses, waiver strategies, fee calculation bases) in the codebase, mirroring ENUM types in the database schema.
    *   **MVP Context for `fbo_location_id`:** New tables for the receipt system **must** include an `fbo_location_id` column. For initial MVP development, the AI can assume a single, hardcoded default `fbo_location_id = 1` for all operations if full user/FBO context switching is not yet implemented. Core logic must be written to use `fbo_location_id` in queries and record creation.
*   **7.1. Database Schema for FBO-Specific Data:**
    *   **Decision:** New receipt-related tables will include an `fbo_location_id`.
    *   **Phased Multi-Tenancy:** Full `fbo_location_id` integration into existing core tables is a larger, subsequent effort.
    *   **`Customers.is_caa_member` & `Customers.caa_member_id`:** For MVP, CAA membership is a global attribute of the `Customer`. `caa_member_id` should be globally unique (or unique within the CAA organization).
*   **7.2. Detailed Table Structures (Units in GALLONS for fuel volume):**
    *   **`Customers` Table (Relevant Additions/Modifications):**
        *   `is_placeholder` (BOOLEAN, default: false)
        *   `is_caa_member` (BOOLEAN, default: false)
        *   `caa_member_id` (STRING, nullable, globally unique)
    *   **`AircraftTypes` Table:**
        *   `id` (PK), `name` (String), `base_min_fuel_gallons_for_waiver` (DECIMAL, **gallons**), `default_fee_category_id` (FK, nullable), `default_max_gross_weight_lbs` (DECIMAL, nullable).
    *   **`FeeCategories` Table:**
        *   `id` (PK), `fbo_location_id` (FK), `name` (String).
    *   **`AircraftTypeToFeeCategoryMapping` Table:**
        *   `id` (PK), `fbo_location_id` (FK), `aircraft_type_id` (FK), `fee_category_id` (FK).
    *   **`FeeRules` Table:**
        *   `id` (PK), `fbo_location_id` (FK), `fee_name` (String), `fee_code` (String, unique per FBO), `applies_to_fee_category_id` (FK to `FeeCategories`), `amount` (DECIMAL), `currency` (String), `is_taxable` (BOOLEAN), `is_potentially_waivable_by_fuel_uplift` (BOOLEAN).
        *   `calculation_basis` (ENUM: 'FIXED_PRICE', 'PER_UNIT_SERVICE', 'NOT_APPLICABLE' - default for category-based fees like ramp/overnight where amount is direct).
        *   `waiver_strategy` (ENUM: 'NONE', 'SIMPLE_MULTIPLIER', 'TIERED_MULTIPLIER').
        *   `simple_waiver_multiplier` (DECIMAL, nullable, default: 1.0).
        *   **CAA Overrides:** `has_caa_override` (BOOLEAN), `caa_override_amount` (DECIMAL, nullable), `caa_waiver_strategy_override` (ENUM: 'NONE', 'SIMPLE_MULTIPLIER', 'TIERED_MULTIPLIER', 'AS_STANDARD', nullable), `caa_simple_waiver_multiplier_override` (DECIMAL, nullable).
    *   **`WaiverTiers` Table:**
        *   `id` (PK), `fbo_location_id` (FK), `name` (String), `fuel_uplift_multiplier` (DECIMAL), `fees_waived_codes` (JSON array of `fee_code` strings), `tier_priority` (INTEGER - higher number = higher priority), `is_caa_specific_tier` (BOOLEAN).
    *   **`Receipts` Table:**
        *   `id` (PK), `receipt_number` (String, unique per FBO), `fbo_location_id` (FK), `fuel_order_id` (FK), `customer_id` (FK), `aircraft_type_at_receipt_time` (String), `fuel_type_at_receipt_time` (String), `fuel_quantity_gallons_at_receipt_time` (DECIMAL, **gallons**), `fuel_unit_price_at_receipt_time` (DECIMAL), `fuel_subtotal` (DECIMAL), `total_fees_amount` (DECIMAL), `total_waivers_amount` (DECIMAL), `tax_amount` (DECIMAL), `grand_total_amount` (DECIMAL), `status` (ENUM: 'DRAFT', 'GENERATED', 'PAID', 'VOID'), `is_caa_applied` (BOOLEAN), `generated_at` (Timestamp), `paid_at` (Timestamp, nullable), `created_by_user_id` (FK), `updated_by_user_id` (FK), `created_at` (Timestamp), `updated_at` (Timestamp).
    *   **`ReceiptLineItems` Table:**
        *   `id` (PK), `receipt_id` (FK), `line_item_type` (ENUM: 'FUEL', 'FEE', 'WAIVER', 'TAX', 'DISCOUNT'), `description` (String), `fee_code_applied` (String, nullable, FK to `FeeRules.fee_code`), `quantity` (DECIMAL - meaning depends on `FeeRules.calculation_basis` or 1 for fuel/tax), `unit_price` (DECIMAL), `amount` (DECIMAL - negative for WAIVER/DISCOUNT).
*   **7.3. Modularity for Weight-Based Pricing:** `AircraftTypes` stores `default_max_gross_weight_lbs`. `FeeRules` can have (currently unused for MVP) `applies_to_min_weight_lbs` and `applies_to_max_weight_lbs` fields. The `calculation_basis` on `FeeRules` will direct logic in the future.
*   **7.4. Handling Additional Fees (GPU, Lav, etc.):** For MVP, CSRs add these during draft receipt generation. These services are defined as `FeeRules` with `calculation_basis` = 'FIXED_PRICE' or 'PER_UNIT_SERVICE'.
*   **7.5. Receipt ID Generation:**
    *   Format: `[FBO_CODE]-[SEQUENCE]`.
    *   `FBO_CODE` is sourced from a configuration or an `FBO_Locations` table. The `SEQUENCE` part should be unique per FBO. For database simplicity, a global sequence for the numeric part is often easier, with the FBO code prepended by the application when generating the `receipt_number` string for storage and display.
*   **7.6. Placeholder Customer Logic:** Backend creates a `Customer` record with `is_placeholder=true` if no customer is linked to the fuel order when a receipt draft is initiated. Frontend UI displays the tail number as the customer identifier.

---

**8. Non-Functional Requirements**

*   **Performance:** Receipt generation (including all fee and waiver calculations) should complete within 3-5 seconds under normal load. Listing and filtering receipts should be responsive.
*   **Accuracy:** Fee and tax calculations must be precise according to the configured FBO schedules and rules.
*   **Usability:** Interfaces for CSRs (receipt generation) and FBO Admins (fee schedule management) must be intuitive, minimizing errors and operational friction.
*   **Security:** Access to fee schedule management must be strictly limited to users with FBO Administrator roles for their respective FBO. CSRs can only manage receipts for their assigned FBO.
*   **Data Integrity:** Referential integrity between Receipts, Fuel Orders, Customers, Fee Rules, etc., must be maintained. Storing detailed `ReceiptLineItems` is considered sufficient for MVP auditability.

---

**9. Future Considerations (Post-MVP)**

*   Direct payment gateway integration.
*   Advanced analytics and reporting on receipt data.
*   QuickBooks / Xero / other accounting software integration.
*   Full implementation of aircraft weight-based pricing.
*   Workflow for amending or voiding finalized receipts.
*   Automated emailing of receipts based on customer preferences or triggers.
*   Customer portal for viewing historical receipts.
*   Batch receipt generation capabilities.
*   More sophisticated tax calculation engine (e.g., location-based taxes).