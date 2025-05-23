// Simple permission service without external dependencies
export interface Permission {
  id: string
  name: string
  description: string
  category: string
  createdAt: string
}

export interface Role {
  id: string
  name: string
  description: string
  permissions: string[]
  isSystemRole: boolean
  createdAt: string
  updatedAt: string
}

export interface UserPermissions {
  roles: string[]
  permissions: string[]
}

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

// Default system permissions
const DEFAULT_PERMISSIONS: Permission[] = [
  {
    id: "view_fuel_orders",
    name: "View Fuel Orders",
    description: "Can view fuel orders",
    category: PermissionCategory.FUEL_ORDERS,
    createdAt: new Date().toISOString(),
  },
  {
    id: "create_fuel_order",
    name: "Create Fuel Order",
    description: "Can create new fuel orders",
    category: PermissionCategory.FUEL_ORDERS,
    createdAt: new Date().toISOString(),
  },
  {
    id: "update_fuel_order",
    name: "Update Fuel Order",
    description: "Can update existing fuel orders",
    category: PermissionCategory.FUEL_ORDERS,
    createdAt: new Date().toISOString(),
  },
  {
    id: "delete_fuel_order",
    name: "Delete Fuel Order",
    description: "Can delete fuel orders",
    category: PermissionCategory.FUEL_ORDERS,
    createdAt: new Date().toISOString(),
  },
  {
    id: "complete_fuel_order",
    name: "Complete Fuel Order",
    description: "Can mark fuel orders as completed",
    category: PermissionCategory.FUEL_ORDERS,
    createdAt: new Date().toISOString(),
  },
  {
    id: "review_fuel_order",
    name: "Review Fuel Order",
    description: "Can review completed fuel orders",
    category: PermissionCategory.FUEL_ORDERS,
    createdAt: new Date().toISOString(),
  },
  {
    id: "view_aircraft",
    name: "View Aircraft",
    description: "Can view aircraft information",
    category: PermissionCategory.AIRCRAFT,
    createdAt: new Date().toISOString(),
  },
  {
    id: "create_aircraft",
    name: "Create Aircraft",
    description: "Can add new aircraft",
    category: PermissionCategory.AIRCRAFT,
    createdAt: new Date().toISOString(),
  },
  {
    id: "update_aircraft",
    name: "Update Aircraft",
    description: "Can update aircraft information",
    category: PermissionCategory.AIRCRAFT,
    createdAt: new Date().toISOString(),
  },
  {
    id: "delete_aircraft",
    name: "Delete Aircraft",
    description: "Can delete aircraft",
    category: PermissionCategory.AIRCRAFT,
    createdAt: new Date().toISOString(),
  },
  {
    id: "validate_aircraft",
    name: "Validate Aircraft",
    description: "Can validate aircraft ownership and registration",
    category: PermissionCategory.AIRCRAFT,
    createdAt: new Date().toISOString(),
  },
  {
    id: "view_users",
    name: "View Users",
    description: "Can view user accounts",
    category: PermissionCategory.USERS,
    createdAt: new Date().toISOString(),
  },
  {
    id: "create_user",
    name: "Create User",
    description: "Can create new user accounts",
    category: PermissionCategory.USERS,
    createdAt: new Date().toISOString(),
  },
  {
    id: "update_user",
    name: "Update User",
    description: "Can update user accounts",
    category: PermissionCategory.USERS,
    createdAt: new Date().toISOString(),
  },
  {
    id: "delete_user",
    name: "Delete User",
    description: "Can delete user accounts",
    category: PermissionCategory.USERS,
    createdAt: new Date().toISOString(),
  },
  {
    id: "assign_roles",
    name: "Assign Roles",
    description: "Can assign roles to users",
    category: PermissionCategory.USERS,
    createdAt: new Date().toISOString(),
  },
  {
    id: "view_billing",
    name: "View Billing",
    description: "Can view billing information",
    category: PermissionCategory.BILLING,
    createdAt: new Date().toISOString(),
  },
  {
    id: "create_invoice",
    name: "Create Invoice",
    description: "Can create new invoices",
    category: PermissionCategory.BILLING,
    createdAt: new Date().toISOString(),
  },
  {
    id: "update_invoice",
    name: "Update Invoice",
    description: "Can update invoices",
    category: PermissionCategory.BILLING,
    createdAt: new Date().toISOString(),
  },
  {
    id: "delete_invoice",
    name: "Delete Invoice",
    description: "Can delete invoices",
    category: PermissionCategory.BILLING,
    createdAt: new Date().toISOString(),
  },
  {
    id: "process_payment",
    name: "Process Payment",
    description: "Can process payments",
    category: PermissionCategory.BILLING,
    createdAt: new Date().toISOString(),
  },
  {
    id: "view_reports",
    name: "View Reports",
    description: "Can view reports",
    category: PermissionCategory.REPORTS,
    createdAt: new Date().toISOString(),
  },
  {
    id: "export_reports",
    name: "Export Reports",
    description: "Can export reports",
    category: PermissionCategory.REPORTS,
    createdAt: new Date().toISOString(),
  },
  {
    id: "manage_roles",
    name: "Manage Roles",
    description: "Can create, update, and delete roles",
    category: PermissionCategory.SYSTEM,
    createdAt: new Date().toISOString(),
  },
  {
    id: "manage_permissions",
    name: "Manage Permissions",
    description: "Can create, update, and delete permissions",
    category: PermissionCategory.SYSTEM,
    createdAt: new Date().toISOString(),
  },
  {
    id: "view_system_settings",
    name: "View System Settings",
    description: "Can view system settings",
    category: PermissionCategory.SYSTEM,
    createdAt: new Date().toISOString(),
  },
  {
    id: "update_system_settings",
    name: "Update System Settings",
    description: "Can update system settings",
    category: PermissionCategory.SYSTEM,
    createdAt: new Date().toISOString(),
  },
  {
    id: "view_fuel_trucks",
    name: "View Fuel Trucks",
    description: "Can view fuel truck information",
    category: PermissionCategory.FUEL_TRUCKS,
    createdAt: new Date().toISOString(),
  },
  {
    id: "create_fuel_truck",
    name: "Create Fuel Truck",
    description: "Can add new fuel trucks",
    category: PermissionCategory.FUEL_TRUCKS,
    createdAt: new Date().toISOString(),
  },
  {
    id: "update_fuel_truck",
    name: "Update Fuel Truck",
    description: "Can update fuel truck information",
    category: PermissionCategory.FUEL_TRUCKS,
    createdAt: new Date().toISOString(),
  },
  {
    id: "delete_fuel_truck",
    name: "Delete Fuel Truck",
    description: "Can delete fuel trucks",
    category: PermissionCategory.FUEL_TRUCKS,
    createdAt: new Date().toISOString(),
  },
  {
    id: "assign_fuel_truck",
    name: "Assign Fuel Truck",
    description: "Can assign fuel trucks to technicians",
    category: PermissionCategory.FUEL_TRUCKS,
    createdAt: new Date().toISOString(),
  },
  {
    id: "view_lst",
    name: "View LSTs",
    description: "Can view line service technician information",
    category: PermissionCategory.LST,
    createdAt: new Date().toISOString(),
  },
  {
    id: "create_lst",
    name: "Create LST",
    description: "Can add new line service technicians",
    category: PermissionCategory.LST,
    createdAt: new Date().toISOString(),
  },
  {
    id: "update_lst",
    name: "Update LST",
    description: "Can update line service technician information",
    category: PermissionCategory.LST,
    createdAt: new Date().toISOString(),
  },
  {
    id: "delete_lst",
    name: "Delete LST",
    description: "Can delete line service technicians",
    category: PermissionCategory.LST,
    createdAt: new Date().toISOString(),
  },
  {
    id: "manage_lst_certifications",
    name: "Manage LST Certifications",
    description: "Can manage line service technician certifications",
    category: PermissionCategory.LST,
    createdAt: new Date().toISOString(),
  },
]

// Default system roles
const DEFAULT_ROLES: Role[] = [
  {
    id: "admin",
    name: "Administrator",
    description: "Full system access",
    isSystemRole: true,
    permissions: DEFAULT_PERMISSIONS.map((p) => p.id),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "csr",
    name: "Customer Service Representative",
    description: "Handles customer interactions and fuel order creation",
    isSystemRole: true,
    permissions: [
      "view_fuel_orders",
      "create_fuel_order",
      "update_fuel_order",
      "review_fuel_order",
      "view_aircraft",
      "create_aircraft",
      "update_aircraft",
      "view_users",
      "view_billing",
      "create_invoice",
      "view_reports",
      "export_reports",
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "fueler",
    name: "Fueling Agent",
    description: "Handles aircraft fueling operations",
    isSystemRole: true,
    permissions: ["view_fuel_orders", "update_fuel_order", "complete_fuel_order", "view_aircraft"],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "manager",
    name: "Manager",
    description: "Manages CSRs and Fuelers, has extended permissions",
    isSystemRole: true,
    permissions: [
      "view_fuel_orders",
      "create_fuel_order",
      "update_fuel_order",
      "delete_fuel_order",
      "complete_fuel_order",
      "review_fuel_order",
      "view_aircraft",
      "create_aircraft",
      "update_aircraft",
      "delete_aircraft",
      "validate_aircraft",
      "view_users",
      "create_user",
      "update_user",
      "delete_user",
      "assign_roles",
      "view_billing",
      "create_invoice",
      "update_invoice",
      "delete_invoice",
      "process_payment",
      "view_reports",
      "export_reports",
      "view_system_settings",
      "view_fuel_trucks",
      "update_fuel_truck",
      "assign_fuel_truck",
      "view_lst",
      "update_lst",
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "readonly",
    name: "Read Only",
    description: "Can only view information, no modifications",
    isSystemRole: true,
    permissions: ["view_fuel_orders", "view_aircraft", "view_users", "view_billing", "view_reports"],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
]

// Safe localStorage operations
const safeGetItem = (key: string): string | null => {
  if (typeof window === "undefined") return null
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

const safeSetItem = (key: string, value: string): void => {
  if (typeof window === "undefined") return
  try {
    localStorage.setItem(key, value)
  } catch {
    // Silently fail if localStorage is not available
  }
}

// Initialize permissions
const initializePermissions = () => {
  if (!safeGetItem("fboPermissions")) {
    safeSetItem("fboPermissions", JSON.stringify(DEFAULT_PERMISSIONS))
  }
  if (!safeGetItem("fboRoles")) {
    safeSetItem("fboRoles", JSON.stringify(DEFAULT_ROLES))
  }
}

// Get all permissions
export const getAllPermissions = (): Permission[] => {
  initializePermissions()
  const data = safeGetItem("fboPermissions")
  return data ? JSON.parse(data) : []
}

// Get all roles
export const getAllRoles = (): Role[] => {
  initializePermissions()
  const data = safeGetItem("fboRoles")
  return data ? JSON.parse(data) : []
}

// Get a role by ID
export const getRoleById = (roleId: string): Role | null => {
  const roles = getAllRoles()
  return roles.find((role) => role.id === roleId) || null
}

// Get permissions for a role
export const getPermissionsForRole = (roleId: string): Permission[] => {
  const role = getRoleById(roleId)
  if (!role) return []

  const allPermissions = getAllPermissions()
  return allPermissions.filter((permission) => role.permissions.includes(permission.id))
}

// Get user's roles
export const getUserRoles = (userId: string): Role[] => {
  const userRolesData = safeGetItem(`fboUserRoles_${userId}`)
  if (!userRolesData) return []

  const userRoleIds = JSON.parse(userRolesData) as string[]
  const allRoles = getAllRoles()

  return allRoles.filter((role) => userRoleIds.includes(role.id))
}

// Get user permissions
export const getUserPermissions = (userId: string): UserPermissions => {
  const userRoles = getUserRoles(userId)
  const roleNames = userRoles.map((role) => role.name)

  const permissions = new Set<string>()
  userRoles.forEach((role) => {
    role.permissions.forEach((perm) => permissions.add(perm))
  })

  return {
    roles: roleNames,
    permissions: Array.from(permissions),
  }
}

// Check if user has permission
export const hasPermission = (userId: string, permissionId: string): boolean => {
  const userRoles = getUserRoles(userId)
  return userRoles.some((role) => role.permissions.includes(permissionId))
}

// Assign role to user
export const assignRoleToUser = (userId: string, roleId: string, assignedBy: string): boolean => {
  const role = getRoleById(roleId)
  if (!role) return false

  const userRolesData = safeGetItem(`fboUserRoles_${userId}`)
  const userRoles = userRolesData ? JSON.parse(userRolesData) : []

  if (!userRoles.includes(roleId)) {
    userRoles.push(roleId)
    safeSetItem(`fboUserRoles_${userId}`, JSON.stringify(userRoles))

    // Record the assignment
    const assignments = JSON.parse(safeGetItem("fboUserRoleAssignments") || "[]")
    assignments.push({
      userId,
      roleId,
      assignedAt: new Date().toISOString(),
      assignedBy,
    })
    safeSetItem("fboUserRoleAssignments", JSON.stringify(assignments))
  }

  return true
}

// Remove role from user
export const removeRoleFromUser = (userId: string, roleId: string): boolean => {
  const userRolesData = safeGetItem(`fboUserRoles_${userId}`)
  if (!userRolesData) return false

  const userRoles = JSON.parse(userRolesData) as string[]
  const updatedRoles = userRoles.filter((id) => id !== roleId)

  safeSetItem(`fboUserRoles_${userId}`, JSON.stringify(updatedRoles))
  return true
}

// Create a new custom role
export const createRole = (role: Omit<Role, "id" | "createdAt" | "updatedAt">): Role => {
  const newRole: Role = {
    ...role,
    id: `role_${Date.now()}`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }

  const roles = getAllRoles()
  roles.push(newRole)
  safeSetItem("fboRoles", JSON.stringify(roles))

  return newRole
}

// Update an existing role
export const updateRole = (
  roleId: string,
  updates: Partial<Omit<Role, "id" | "createdAt" | "updatedAt">>,
): Role | null => {
  const roles = getAllRoles()
  const roleIndex = roles.findIndex((r) => r.id === roleId)

  if (roleIndex === -1) return null

  // Don't allow modifying system roles
  if (roles[roleIndex].isSystemRole && (updates.isSystemRole === false || updates.permissions)) {
    throw new Error("Cannot modify system roles")
  }

  const updatedRole = {
    ...roles[roleIndex],
    ...updates,
    updatedAt: new Date().toISOString(),
  }

  roles[roleIndex] = updatedRole
  safeSetItem("fboRoles", JSON.stringify(roles))

  return updatedRole
}

// Delete a role
export const deleteRole = (roleId: string): boolean => {
  const roles = getAllRoles()
  const role = roles.find((r) => r.id === roleId)

  if (!role) return false

  // Don't allow deleting system roles
  if (role.isSystemRole) {
    throw new Error("Cannot delete system roles")
  }

  const updatedRoles = roles.filter((r) => r.id !== roleId)
  safeSetItem("fboRoles", JSON.stringify(updatedRoles))

  return true
}

// Initialize permission system
export const initializePermissionSystem = () => {
  initializePermissions()

  // Assign admin role to default admin user
  const userData = safeGetItem("fboUser")
  if (userData) {
    const user = JSON.parse(userData)
    if (user.email === "fbosaas@gmail.com") {
      assignRoleToUser(user.email, "admin", "system")
    }
  }
}
