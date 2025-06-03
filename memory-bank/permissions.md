# FBO LaunchPad Permission System Documentation

**Version:** 2.0 (Post-Standardization)  
**Date:** June 3, 2025

## 1. Introduction

This document outlines the permission system for FBO LaunchPad. Access to application features and data is controlled through a system of granular permissions, which are bundled into Permission Groups. Roles are then assigned to these Permission Groups, granting users within those roles the collective permissions of the assigned groups.

The standard naming convention for all permission strings is **`snake_case`**.

## 2. Master List of Granular Permissions

This list represents all defined atomic capabilities within the system.

| Permission Name (snake_case) | Description                                                     | Category           | Resource Type (if specific) | Default Scope (if specific) |
|------------------------------|-----------------------------------------------------------------|--------------------|-----------------------------|-----------------------------|
| `access_admin_dashboard`     | Allows access to the main admin dashboard and administrative UI | dashboard_access   | `global`                    | `any`                       |
| `access_csr_dashboard`       | Allows access to the Customer Service Representative dashboard  | dashboard_access   | `global`                    | `any`                       |
| `access_fueler_dashboard`    | Allows access to the Line Service Technician (Fueler) dashboard | dashboard_access   | `global`                    | `any`                       |
| `access_member_dashboard`    | Allows access to the basic Member dashboard                     | dashboard_access   | `global`                    | `any`                       |
| `admin`                      | General administrative access for specific system functions     | system             | `global`                    | `any`                       |
| `calculate_fees`             | Allows calculating fees and charges for services                | billing            | `fuel_order`                | `any`                       |
| `complete_fuel_order`        | Allows marking a fuel order as completed by an LST              | fuel_orders        | `fuel_order`                | `own`                       |
| `create_fuel_order`          | Allows creating new fuel orders                                 | fuel_orders        | `fuel_order`                | `any`                       |
| `delete_fuel_order`          | Allows deleting fuel orders                                     | fuel_orders        | `fuel_order`                | `any`                       |
| `edit_fuel_order`            | Allows editing details of any fuel order                        | fuel_orders        | `fuel_order`                | `any`                       |
| `export_orders_csv`          | Allows exporting fuel order data to a CSV file                  | fuel_orders        | `fuel_order`                | `any`                       |
| `export_receipts_csv`        | Allows exporting fuel receipt data to a CSV file                | receipts           | `receipt`                   | `any`                       |
| `manage_aircraft`            | Allows creating, updating, and deleting aircraft records        | aircraft           | `aircraft`                  | `any`                       |
| `manage_customers`           | Allows creating, updating, and deleting customer records        | customers          | `customer`                  | `any`                       |
| `manage_fuel_trucks`         | Allows creating, updating, and deleting fuel truck records      | fuel_trucks        | `fuel_truck`                | `any`                       |
| `manage_receipts`            | Allows creating, editing, and managing fuel receipts            | receipts           | `receipt`                   | `any`                       |
| `manage_roles`               | Allows managing user roles and their permission assignments     | system             | `role`                      | `any`                       |
| `manage_settings`            | Allows managing global application settings                     | system             | `setting`                   | `any`                       |
| `manage_users`               | Allows creating, updating, and deactivating user accounts       | users              | `user`                      | `any`                       |
| `perform_fueling_task`       | Allows an LST to perform fueling operations and related tasks   | fuel_orders        | `fuel_order`                | `own`                       |
| `review_orders`              | Allows CSRs/Admins to mark fuel orders as reviewed              | fuel_orders        | `fuel_order`                | `any`                       |
| `update_order_status`        | Allows updating the status of an assigned fuel order            | fuel_orders        | `fuel_order`                | `own`                       |
| `view_aircraft`              | Allows viewing the list and details of aircraft                 | aircraft           | `aircraft`                  | `any`                       |
| `view_all_orders`            | Allows viewing all fuel orders in the system                    | fuel_orders        | `fuel_order`                | `any`                       |
| `view_all_receipts`          | Allows viewing all fuel receipts in the system                  | receipts           | `receipt`                   | `any`                       |
| `view_assigned_orders`       | Allows LSTs to view fuel orders assigned to them                | fuel_orders        | `fuel_order`                | `own`                       |
| `view_billing_info`          | Allows viewing billing information and fee structures           | billing            | `global`                    | `any`                       |
| `view_customers`             | Allows viewing the list and details of customers                | customers          | `customer`                  | `any`                       |
| `view_fuel_trucks`           | Allows viewing the list and details of fuel trucks              | fuel_trucks        | `fuel_truck`                | `any`                       |
| `view_order_statistics`      | Allows viewing statistics and reports related to fuel orders    | fuel_orders        | `fuel_order`                | `any`                       |
| `view_own_receipts`          | Allows viewing own fuel receipts (e.g., LSTs, Members)          | receipts           | `receipt`                   | `own`                       |
| `view_permissions`           | Allows viewing the list of all available system permissions     | system             | `permission`                | `any`                       |
| `view_role_permissions`      | Allows viewing the permissions assigned to any role             | system             | `role_permission`           | `any`                       |
| `view_roles`                 | Allows viewing the list and details of all roles                | system             | `role`                      | `any`                       |
| `view_users`                 | Allows viewing the list and details of users                    | users              | `user`                      | `any`                       |

## 3. Default Roles

The system is seeded with the following default roles. These roles are assigned to Permission Groups to inherit their capabilities.

*   **System Administrator**: Full system access and control.
*   **Customer Service Representative (CSR)**: Manages customer interactions, fuel orders, and related administrative tasks.
*   **Line Service Technician (LST/Fueler)**: Executes fueling operations and manages assigned tasks.
*   **Member**: Basic user with limited access, typically for viewing their own information or general FBO data.

## 4. Permission Groups

Permission Groups bundle granular permissions. Roles are assigned to these groups. Groups can inherit permissions from a parent group.
(Defined in `backend/src/migration_scripts/permission_groups_schema.py`)

| Group Name (snake_case)        | Display Name                   | Description                                                    | Parent Group                | Direct Permissions (snake_case)                                                                                                                               |
|--------------------------------|--------------------------------|----------------------------------------------------------------|-----------------------------|---------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `fuel_operations_basic`        | Fuel Operations - Basic        | Basic fuel operations permissions for LST staff                | -                           | `create_fuel_order`, `view_assigned_orders`, `update_order_status`                                                                                            |
| `fuel_operations_advanced`     | Fuel Operations - Advanced     | Advanced fuel operations permissions for supervisors           | `fuel_operations_basic`     | `view_all_orders`, `edit_fuel_order`, `delete_fuel_order`, `complete_fuel_order`, `review_orders`, `export_orders_csv`                                        |
| `user_management_basic`        | User Management - Basic        | Basic user management permissions                              | -                           | `view_users`                                                                                                                                                  |
| `user_management_advanced`     | User Management - Advanced     | Advanced user management permissions for administrators        | `user_management_basic`     | `manage_users`                                                                                                                                                |
| `aircraft_management_basic`    | Aircraft Management - Basic    | Basic aircraft management permissions                          | -                           | `view_aircraft`                                                                                                                                               |
| `aircraft_management_advanced` | Aircraft Management - Advanced | Advanced aircraft management permissions                       | `aircraft_management_basic` | `manage_aircraft`                                                                                                                                             |
| `customer_management_basic`    | Customer Management - Basic    | Basic customer management permissions                          | -                           | `view_customers`                                                                                                                                              |
| `customer_management_advanced` | Customer Management - Advanced | Advanced customer management permissions                     | `customer_management_basic` | `manage_customers`                                                                                                                                            |
| `fleet_management_basic`       | Fleet Management - Basic       | Basic fleet and truck management permissions                   | -                           | `view_fuel_trucks`                                                                                                                                            |
| `fleet_management_advanced`    | Fleet Management - Advanced    | Advanced fleet and truck management permissions                | `fleet_management_basic`    | `manage_fuel_trucks`                                                                                                                                          |
| `administrative_operations`  | Administrative Operations    | System administration and configuration permissions            | -                           | `manage_roles`, `view_roles`, `view_permissions`, `view_role_permissions`, `manage_settings`, `admin`, `access_csr_module`, `view_order_statistics`             |
| `dashboard_access_all`       | Dashboard Access - All         | Access to all primary user dashboards                          | -                           | `access_admin_dashboard`, `access_csr_dashboard`, `access_fueler_dashboard`, `access_member_dashboard`                                                        |
| `billing_operations_basic`   | Billing Operations - Basic     | Basic billing and fee viewing permissions                      | -                           | `view_billing_info`                                                                                                                                           |
| `billing_operations_advanced`| Billing Operations - Advanced  | Advanced billing operations including fee calculation          | `billing_operations_basic`  | `calculate_fees`                                                                                                                                              |
| `receipt_management_basic`   | Receipt Management - Basic     | Basic receipt viewing permissions                              | -                           | `view_own_receipts`                                                                                                                                           |
| `receipt_management_advanced`| Receipt Management - Advanced  | Full receipt management capabilities                           | `receipt_management_basic`  | `view_all_receipts`, `manage_receipts`, `export_receipts_csv`                                                                                                 |
| `fueling_tasks_standard`     | Fueling Tasks - Standard       | Standard permissions for LSTs performing fueling tasks           | -                           | `perform_fueling_task` (This permission implies the ability to update status and complete orders assigned to oneself, often checked in service layer logic) |

*(Note: The `administrative_operations` group includes `access_csr_module` and `view_order_statistics` which might also be relevant for CSRs directly. The `dashboard_access_all` group is a utility group to grant broad dashboard access, typically for admins.)*

## 5. Role to Permission Group Assignments

This section details how default roles inherit permissions through their assigned groups.
(Defined in `backend/src/migration_scripts/permission_groups_schema.py`)

*   **System Administrator**:
    *   `fuel_operations_advanced`
    *   `user_management_advanced`
    *   `aircraft_management_advanced`
    *   `customer_management_advanced`
    *   `fleet_management_advanced`
    *   `administrative_operations`
    *   `dashboard_access_all` (implicitly covers all dashboard access permissions)
    *   `billing_operations_advanced`
    *   `receipt_management_advanced`
    *   `fueling_tasks_standard` (though admin might not directly perform, they have oversight)

*   **Customer Service Representative (CSR)**:
    *   `fuel_operations_basic` (Note: `permission_groups_schema.py` gives this. `seeds.py` was more granular. This group includes `update_order_status`. CSRs also get `edit_fuel_order` via `fuel_operations_advanced` if that group were assigned, or directly if we revert to direct role-perms. For now, assuming `permission_groups_schema.py` is the guide.)
        *   *Correction based on `permission_groups_schema.py` for CSR*:
            *   `fuel_operations_basic` (`create_fuel_order`, `view_assigned_orders`, `update_order_status`)
            *   `aircraft_management_basic` (`view_aircraft`)
            *   `customer_management_basic` (`view_customers`)
            *   `user_management_basic` (`view_users`)
    *   *Additional permissions a CSR might need (potentially via other groups or direct if groups are refined)*:
        *   `access_csr_dashboard` (from `administrative_operations` or `dashboard_access_all` if admin, or a new CSR-specific dashboard group)
        *   `review_orders`, `export_orders_csv`, `view_order_statistics` (from `fuel_operations_advanced` or `administrative_operations`)
        *   `edit_fuel_order` (from `fuel_operations_advanced`)
        *   `manage_aircraft` (from `aircraft_management_advanced`)
        *   `manage_customers` (from `customer_management_advanced`)
        *   `view_permissions` (from `administrative_operations`)
        *   `view_billing_info` (from `billing_operations_basic`)
        *   `view_all_receipts`, `manage_receipts`, `export_receipts_csv` (from `receipt_management_advanced`)

*   **Line Service Technician (LST/Fueler)**:
    *   `fuel_operations_basic` (`create_fuel_order`, `view_assigned_orders`, `update_order_status`)
    *   `fueling_tasks_standard` (`perform_fueling_task`)
    *   `receipt_management_basic` (`view_own_receipts`)
    *   *Additional permissions an LST might need*:
        *   `access_fueler_dashboard` (from `dashboard_access_all` if admin, or a new Fueler-specific dashboard group)
        *   `complete_fuel_order` (from `fuel_operations_advanced` or directly)
        *   `view_order_statistics` (from `administrative_operations` or a specific stats group)

*   **Member**:
    *   (No specific groups assigned in `permission_groups_schema.py`. This role would need its own group or direct permissions.)
    *   *Permissions a Member might need*:
        *   `access_member_dashboard`
        *   `view_order_statistics` (scoped to own orders)
        *   `view_customers` (scoped to own profile)
        *   `view_aircraft` (scoped to own aircraft)
        *   `view_own_receipts`

**Note on CSR/LST/Member Group Assignments:** The `permission_groups_schema.py` provides a starting point. The assignments above for CSR and LST reflect what's *in that script*. For a fully functional system based on the granular permissions, these roles would likely need assignment to more advanced groups or additional specific groups to cover all their intended functionality as previously defined in `seeds.py`'s direct role-permission mapping. This `permissions.md` aims to reflect the *target state* where groups are the primary mechanism.

## 6. Frontend Permission Usage

*   The frontend primarily uses the `usePermissions` hook (`frontend/hooks/usePermissions.ts`) which consumes data from `PermissionContext`.
*   Helper functions like `can('permission_name')`, `canAny(['perm1', 'perm2'])`, `isAdmin`, `isCSR`, etc., are used for conditional rendering and access control.
*   All permission strings checked in the frontend **MUST** be `snake_case`.
*   The `PermissionContext` is populated by fetching effective permissions from the backend endpoint `/api/auth/me/permissions`.

## 7. Backend Permission Enforcement

*   API routes are protected using the `@require_permission_v2('permission_name', resource_type?, resource_id_param?)` decorator found in `backend/src/utils/enhanced_auth_decorators_v2.py`.
*   All permission strings used in these decorators **MUST** be `snake_case`.
*   The `EnhancedPermissionService` is responsible for resolving a user's effective permissions by checking direct assignments, roles (via their assigned groups), and permission groups (including parent group inheritance).

## 8. Naming Convention

*   **Permissions:** `snake_case` (e.g., `create_fuel_order`)
*   **Permission Groups:** `snake_case` (e.g., `fuel_operations_advanced`)
*   **Roles:** Title Case (e.g., "System Administrator")

This document should be updated whenever permissions, groups, or their assignments change.