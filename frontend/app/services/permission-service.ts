// API-integrated permission service - replacing localStorage mock implementation
import { API_BASE_URL, getAuthHeaders, handleApiResponse } from "./api-config"

// TypeScript interfaces for API responses
export interface Permission {
  id: number
  name: string
  description: string
  category: string
  createdAt: string
}

export interface Role {
  id: number
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

// API Functions for Permissions
export const getAllPermissions = async (): Promise<Permission[]> => {
  try {
    const response = await fetch(`${API_BASE_URL}/admin/permissions`, {
      method: "GET",
      headers: getAuthHeaders(),
    })

    const data = await handleApiResponse<{permissions: Permission[]}>(response)
    console.log("Permissions API response:", data)
    return data.permissions
  } catch (error) {
    console.error("Error fetching permissions:", error)
    throw new Error("Failed to fetch permissions")
  }
}

// API Functions for Roles
export const getAllRoles = async (): Promise<Role[]> => {
  try {
    const response = await fetch(`${API_BASE_URL}/admin/roles`, {
      method: "GET",
      headers: getAuthHeaders(),
    })

    const data = await handleApiResponse<{roles: Role[]}>(response)
    console.log("Roles API response:", data)
    
    // Roles now include permissions directly from the backend schema
    return data.roles.map(role => ({
      ...role,
      permissions: role.permissions || [] // Use permissions from backend or fallback to empty array
    }))
  } catch (error) {
    console.error("Error fetching roles:", error)
    throw new Error("Failed to fetch roles")
  }
}

export const getRoleById = async (roleId: number): Promise<Role | null> => {
  try {
    const response = await fetch(`${API_BASE_URL}/admin/roles/${roleId}`, {
      method: "GET",
      headers: getAuthHeaders(),
    })

    if (response.status === 404) {
      return null
    }

    return await handleApiResponse<Role>(response)
  } catch (error) {
    console.error("Error fetching role:", error)
    throw new Error("Failed to fetch role")
  }
}

export const createRole = async (roleData: Omit<Role, "id" | "createdAt" | "updatedAt">): Promise<Role> => {
  try {
    // First, create the role without permissions
    const roleCreateData = {
      name: roleData.name,
      description: roleData.description
    }
    
    const response = await fetch(`${API_BASE_URL}/admin/roles`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify(roleCreateData),
    })

    const createdRole = await handleApiResponse<Role>(response)
    console.log("Role created:", createdRole)
    
    // Then assign permissions individually if any were provided
    if (roleData.permissions && roleData.permissions.length > 0) {
      console.log("Assigning permissions to role:", roleData.permissions)
      
      for (const permissionId of roleData.permissions) {
        try {
          const permissionResponse = await fetch(`${API_BASE_URL}/admin/roles/${createdRole.id}/permissions`, {
            method: "POST",
            headers: getAuthHeaders(),
            body: JSON.stringify({ permission_id: permissionId }),
          })
          
          await handleApiResponse<void>(permissionResponse)
          console.log(`Permission ${permissionId} assigned to role ${createdRole.id}`)
        } catch (error) {
          console.error(`Error assigning permission ${permissionId} to role:`, error)
          // Continue with other permissions even if one fails
        }
      }
    }
    
    // Return the role with the permissions that were supposed to be assigned
    return {
      ...createdRole,
      permissions: roleData.permissions || []
    }
  } catch (error) {
    console.error("Error creating role:", error)
    throw new Error("Failed to create role")
  }
}

export const updateRole = async (
  roleId: number,
  updates: Partial<Omit<Role, "id" | "createdAt" | "updatedAt">>
): Promise<Role> => {
  try {
    const response = await fetch(`${API_BASE_URL}/admin/roles/${roleId}`, {
      method: "PATCH",
      headers: getAuthHeaders(),
      body: JSON.stringify(updates),
    })

    return await handleApiResponse<Role>(response)
  } catch (error) {
    console.error("Error updating role:", error)
    throw new Error("Failed to update role")
  }
}

export const deleteRole = async (roleId: number): Promise<boolean> => {
  try {
    const response = await fetch(`${API_BASE_URL}/admin/roles/${roleId}`, {
      method: "DELETE",
      headers: getAuthHeaders(),
    })

    if (response.status === 404) {
      return false
    }

    await handleApiResponse<void>(response)
    return true
  } catch (error) {
    console.error("Error deleting role:", error)
    throw new Error("Failed to delete role")
  }
}

// Role Permission Management Functions
export const getRolePermissions = async (roleId: number): Promise<Permission[]> => {
  try {
    const response = await fetch(`${API_BASE_URL}/admin/roles/${roleId}/permissions`, {
      method: "GET",
      headers: getAuthHeaders(),
    })

    return await handleApiResponse<Permission[]>(response)
  } catch (error) {
    console.error("Error fetching role permissions:", error)
    throw new Error("Failed to fetch role permissions")
  }
}

export const addPermissionToRole = async (roleId: number, permissionId: number): Promise<void> => {
  try {
    const response = await fetch(`${API_BASE_URL}/admin/roles/${roleId}/permissions`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify({ permission_id: permissionId }),
    })

    await handleApiResponse<void>(response)
  } catch (error) {
    console.error("Error adding permission to role:", error)
    throw new Error("Failed to add permission to role")
  }
}

export const removePermissionFromRole = async (roleId: number, permissionId: number): Promise<void> => {
  try {
    const response = await fetch(`${API_BASE_URL}/admin/roles/${roleId}/permissions/${permissionId}`, {
      method: "DELETE",
      headers: getAuthHeaders(),
    })

    await handleApiResponse<void>(response)
  } catch (error) {
    console.error("Error removing permission from role:", error)
    throw new Error("Failed to remove permission from role")
  }
}

// Helper Functions for UI Components
export const getPermissionsForRole = async (roleId: number): Promise<Permission[]> => {
  return await getRolePermissions(roleId)
}

// Legacy compatibility functions (these might be used by existing UI)
export const hasPermission = (userPermissions: string[], permissionId: string): boolean => {
  return userPermissions.includes(permissionId)
}

// Initialize permission system (no-op for API version)
export const initializePermissionSystem = (): void => {
  // No initialization needed for API-based service
  // This function exists for compatibility with the old localStorage version
}
