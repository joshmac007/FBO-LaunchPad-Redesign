/**
 * Permission Constants
 * 
 * Single source of truth for all permission strings in the application.
 * These match exactly with the permission names defined in backend/src/seeds.py
 * 
 * DO NOT hardcode permission strings elsewhere - import from this file instead.
 */

// Fuel Orders Permissions
export const FUEL_ORDERS = {
  CREATE_FUEL_ORDER: 'create_fuel_order',
  VIEW_ASSIGNED_ORDERS: 'view_assigned_orders',
  VIEW_ALL_ORDERS: 'view_all_orders',
  UPDATE_ORDER_STATUS: 'update_order_status',
  COMPLETE_FUEL_ORDER: 'complete_fuel_order',
  REVIEW_FUEL_ORDER: 'review_fuel_order',
  EXPORT_ORDERS_CSV: 'export_orders_csv',
  VIEW_ORDER_STATISTICS: 'view_order_statistics',
  EDIT_FUEL_ORDER: 'edit_fuel_order',
  ASSIGN_FUEL_ORDER: 'assign_fuel_order',
  DELETE_FUEL_ORDER: 'delete_fuel_order',
  PERFORM_FUELING_TASK: 'perform_fueling_task',
} as const

// Users Permissions
export const USERS = {
  VIEW_USERS: 'view_users',
  MANAGE_USERS: 'manage_users',
} as const

// Fuel Trucks Permissions
export const FUEL_TRUCKS = {
  VIEW_FUEL_TRUCKS: 'view_fuel_trucks',
  MANAGE_FUEL_TRUCKS: 'manage_fuel_trucks',
} as const

// Aircraft Permissions
export const AIRCRAFT = {
  VIEW_AIRCRAFT: 'view_aircraft',
  MANAGE_AIRCRAFT: 'manage_aircraft',
} as const

// Customers Permissions
export const CUSTOMERS = {
  VIEW_CUSTOMERS: 'view_customers',
  MANAGE_CUSTOMERS: 'manage_customers',
} as const

// System Permissions
export const SYSTEM = {
  MANAGE_ROLES: 'manage_roles',
  VIEW_PERMISSIONS: 'view_permissions',
  VIEW_ROLE_PERMISSIONS: 'view_role_permissions',
  VIEW_ROLES: 'view_roles',
  MANAGE_SETTINGS: 'manage_settings',
  ADMIN: 'admin',
  ADMINISTRATIVE_OPERATIONS: 'administrative_operations',
} as const

// Dashboard Access Permissions
export const DASHBOARD_ACCESS = {
  ACCESS_ADMIN_DASHBOARD: 'access_admin_dashboard',
  ACCESS_CSR_DASHBOARD: 'access_csr_dashboard',
  ACCESS_FUELER_DASHBOARD: 'access_fueler_dashboard',
  ACCESS_MEMBER_DASHBOARD: 'access_member_dashboard',
} as const

// Billing/Fees Permissions
export const BILLING = {
  VIEW_BILLING_INFO: 'view_billing_info',
  CALCULATE_FEES: 'calculate_fees',
  MANAGE_FBO_FEE_SCHEDULES: 'manage_fbo_fee_schedules',
} as const

// Fuel Receipt System Permissions
export const RECEIPTS = {
  VIEW_RECEIPTS: 'view_receipts',
  VIEW_ALL_RECEIPTS: 'view_all_receipts',
  VIEW_OWN_RECEIPTS: 'view_own_receipts',
  CREATE_RECEIPT: 'create_receipt',
  UPDATE_RECEIPT: 'update_receipt',
  CALCULATE_RECEIPT_FEES: 'calculate_receipt_fees',
  GENERATE_RECEIPT: 'generate_receipt',
  MARK_RECEIPT_PAID: 'mark_receipt_paid',
  VOID_RECEIPT: 'void_receipt',
  MANAGE_RECEIPTS: 'manage_receipts',
  EXPORT_RECEIPTS_CSV: 'export_receipts_csv',
} as const

// Combined permissions object for easy access
export const PERMISSIONS = {
  ...FUEL_ORDERS,
  ...USERS,
  ...FUEL_TRUCKS,
  ...AIRCRAFT,
  ...CUSTOMERS,
  ...SYSTEM,
  ...DASHBOARD_ACCESS,
  ...BILLING,
  ...RECEIPTS,
} as const

// Common permission groups for convenience
export const PERMISSION_GROUPS = {
  // Admin permissions
  ADMIN: [
    DASHBOARD_ACCESS.ACCESS_ADMIN_DASHBOARD,
    SYSTEM.MANAGE_SETTINGS,
    USERS.MANAGE_USERS,
    SYSTEM.MANAGE_ROLES,
    SYSTEM.ADMINISTRATIVE_OPERATIONS,
  ],
  
  // CSR permissions
  CSR: [
    DASHBOARD_ACCESS.ACCESS_CSR_DASHBOARD,
    FUEL_ORDERS.VIEW_ALL_ORDERS,
    FUEL_ORDERS.CREATE_FUEL_ORDER,
    FUEL_ORDERS.EDIT_FUEL_ORDER,
    FUEL_ORDERS.REVIEW_FUEL_ORDER,
    RECEIPTS.VIEW_ALL_RECEIPTS,
    RECEIPTS.CREATE_RECEIPT,
    RECEIPTS.MANAGE_RECEIPTS,
  ],
  
  // Fueler permissions
  FUELER: [
    DASHBOARD_ACCESS.ACCESS_FUELER_DASHBOARD,
    FUEL_ORDERS.PERFORM_FUELING_TASK,
    FUEL_ORDERS.UPDATE_ORDER_STATUS,
    FUEL_ORDERS.VIEW_ASSIGNED_ORDERS,
    FUEL_ORDERS.COMPLETE_FUEL_ORDER,
  ],
  
  // Member permissions
  MEMBER: [
    DASHBOARD_ACCESS.ACCESS_MEMBER_DASHBOARD,
  ],
} as const

// Type definitions for better TypeScript support
export type FuelOrdersPermission = typeof FUEL_ORDERS[keyof typeof FUEL_ORDERS]
export type UsersPermission = typeof USERS[keyof typeof USERS]
export type FuelTrucksPermission = typeof FUEL_TRUCKS[keyof typeof FUEL_TRUCKS]
export type AircraftPermission = typeof AIRCRAFT[keyof typeof AIRCRAFT]
export type CustomersPermission = typeof CUSTOMERS[keyof typeof CUSTOMERS]
export type SystemPermission = typeof SYSTEM[keyof typeof SYSTEM]
export type DashboardAccessPermission = typeof DASHBOARD_ACCESS[keyof typeof DASHBOARD_ACCESS]
export type BillingPermission = typeof BILLING[keyof typeof BILLING]
export type ReceiptsPermission = typeof RECEIPTS[keyof typeof RECEIPTS]

export type Permission = typeof PERMISSIONS[keyof typeof PERMISSIONS]
export type PermissionGroupName = keyof typeof PERMISSION_GROUPS 