// Permission model representing individual capabilities in the system
export interface Permission {
  id: string
  name: string
  description: string
  category: PermissionCategory
  createdAt: string
}

// Categories to organize permissions
export enum PermissionCategory {
  FUEL_ORDERS = "fuel_orders",
  AIRCRAFT = "aircraft",
  CUSTOMERS = "customers",
  USERS = "users",
  REPORTS = "reports",
  BILLING = "billing",
  SYSTEM = "system",
  FUEL_TRUCKS = "fuel_trucks",
  LST = "lst",
}

// Role model representing a collection of permissions
export interface Role {
  id: string
  name: string
  description: string
  permissions: string[] // Array of permission IDs
  isSystemRole: boolean // System roles cannot be modified/deleted
  createdAt: string
  updatedAt: string
}

// UserRole mapping users to roles
export interface UserRole {
  userId: string
  roleId: string
  assignedAt: string
  assignedBy: string
}

// User's effective permissions
export interface UserPermissions {
  roles: string[] // Role names assigned to the user
  permissions: string[] // All permission names the user has
}
