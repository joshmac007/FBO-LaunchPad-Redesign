import { API_BASE_URL, handleApiResponse, getAuthHeaders } from "./api-config"

export interface LoginRequest {
  email: string
  password: string
}

export interface RegistrationRequest {
  email: string
  password: string
  name?: string
  username?: string
}

export interface LoginResponse {
  token: string
  user: {
    id: number
    email: string
    username: string
    name: string
    roles: string[]
    is_active: boolean
    created_at: string
  }
}

export interface RegistrationResponse {
  message: string
  user: {
    id: number
    email: string
    name?: string
  }
}

// Enhanced permission interfaces for the new granular system
export interface EffectivePermission {
  permission: string
  resource_type?: string
  resource_id?: string
  scope?: string
  source: string
  granted_at?: string
  group_id?: number
  role_id?: number
}

export interface PermissionSummary {
  total_permissions: number
  by_source: {
    direct: EffectivePermission[]
    groups: EffectivePermission[]
    roles: EffectivePermission[]
  }
  by_category: Record<string, EffectivePermission[]>
  resource_specific: EffectivePermission[]
}

export interface UserPermissionsResponse {
  user_id: number
  username: string
  permissions: string[]
  effective_permissions: Record<string, EffectivePermission>
  summary: PermissionSummary
  total_permissions: number
}

// Enhanced user interface that includes permission data
export interface EnhancedUser {
  id: number
  email: string
  username: string
  name: string
  roles: string[]
  is_active: boolean
  created_at: string
  access_token: string
  isLoggedIn: boolean
  // New permission fields
  permissions?: string[]
  effective_permissions?: Record<string, EffectivePermission>
  permission_summary?: PermissionSummary
  permissions_loaded_at?: string
}

export async function login(credentials: LoginRequest): Promise<LoginResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(credentials),
    })

    const data: LoginResponse = await handleApiResponse(response)

    // Store user data in localStorage with enhanced structure
    const enhancedUser: EnhancedUser = {
      ...data.user,
      access_token: data.token,
      isLoggedIn: true,
      permissions: [], // Will be loaded separately
      effective_permissions: {},
      permission_summary: {
        total_permissions: 0,
        by_source: { direct: [], groups: [], roles: [] },
        by_category: {},
        resource_specific: []
      }
    }

    localStorage.setItem("fboUser", JSON.stringify(enhancedUser))

    // Immediately fetch permissions after successful login
    try {
      await fetchAndStoreUserPermissions()
    } catch (permError) {
      console.warn("Failed to fetch permissions immediately after login:", permError)
      // Don't fail the login if permission fetching fails
    }

    return data
  } catch (error) {
    console.error("Login error:", error)
    if (error instanceof Error) {
      throw new Error(`Login failed: ${error.message}`)
    }
    throw new Error("Login failed: An unknown error occurred")
  }
}

export function logout() {
  // Check if we're in a browser environment
  if (typeof window === 'undefined') {
    return
  }

  console.log("Logging out, clearing user data from localStorage.")
  localStorage.removeItem("fboUser")
  localStorage.removeItem("token") // Clear any separate token storage if it exists
  // Redirect to login page
  window.location.href = "/login"
}

export function getCurrentUser(): EnhancedUser | null {
  // Check if we're in a browser environment
  if (typeof window === 'undefined') {
    return null
  }

  const userData = localStorage.getItem("fboUser")
  if (!userData) {
    return null
  }

  try {
    return JSON.parse(userData) as EnhancedUser
  } catch (e) {
    console.error("Error parsing user data", e)
    return null
  }
}

export function isAuthenticated(): boolean {
  // Check if we're in a browser environment
  if (typeof window === 'undefined') {
    return false
  }

  const user = getCurrentUser()
  return !!user && user.isLoggedIn
}

export async function register(userData: RegistrationRequest): Promise<RegistrationResponse> {
  const response = await fetch(`${API_BASE_URL}/auth/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(userData),
  });
  return handleApiResponse<RegistrationResponse>(response);
}

// Enhanced permission fetching with comprehensive data
export async function fetchUserPermissions(): Promise<string[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/me/permissions`, {
      method: "GET",
      headers: getAuthHeaders(),
    })

    const data: UserPermissionsResponse = await handleApiResponse(response)
    return data.permissions || []
  } catch (error) {
    console.error("Error fetching user permissions:", error)
    if (error instanceof Error) {
      throw new Error(`Failed to fetch permissions: ${error.message}`)
    }
    throw new Error("Failed to fetch permissions: An unknown error occurred")
  }
}

// New function to fetch and store comprehensive permission data
export async function fetchAndStoreUserPermissions(): Promise<UserPermissionsResponse> {
  const headers = getAuthHeaders()
  if (!headers.Authorization) {
    // If there's no token, there's no need to make an API call.
    throw new Error("401 - No authorization token found")
  }

  const response = await fetch(`${API_BASE_URL}/auth/me/permissions`, { 
    method: "GET",
    headers 
  })
  
  // handleApiResponse will throw an error for non-2xx responses, which will be caught
  // by the calling function in PermissionProvider.
  const data = await handleApiResponse<UserPermissionsResponse>(response)

  // Update the stored user data with permission information
  const currentUser = getCurrentUser()
  if (currentUser) {
    const updatedUser: EnhancedUser = {
      ...currentUser,
      permissions: data.permissions || [],
      effective_permissions: data.effective_permissions || {},
      permission_summary: data.summary || {
        total_permissions: 0,
        by_source: { direct: [], groups: [], roles: [] },
        by_category: {},
        resource_specific: []
      },
      permissions_loaded_at: new Date().toISOString()
    }
    
    localStorage.setItem("fboUser", JSON.stringify(updatedUser))
  }
  
  return data
}

// New utility functions for permission checking
export function hasPermission(permissionName: string, user?: EnhancedUser | null): boolean {
  const currentUser = user || getCurrentUser()
  if (!currentUser || !currentUser.permissions) {
    return false
  }
  
  return currentUser.permissions.includes(permissionName)
}

export function hasAnyPermission(permissionNames: string[], user?: EnhancedUser | null): boolean {
  const currentUser = user || getCurrentUser()
  if (!currentUser || !currentUser.permissions) {
    return false
  }
  
  return permissionNames.some(permission => currentUser.permissions!.includes(permission))
}

export function hasAllPermissions(permissionNames: string[], user?: EnhancedUser | null): boolean {
  const currentUser = user || getCurrentUser()
  if (!currentUser || !currentUser.permissions) {
    return false
  }
  
  return permissionNames.every(permission => currentUser.permissions!.includes(permission))
}

export function hasResourcePermission(
  permissionName: string, 
  resourceType?: string, 
  resourceId?: string,
  user?: EnhancedUser | null
): boolean {
  const currentUser = user || getCurrentUser()
  if (!currentUser || !currentUser.effective_permissions) {
    return false
  }
  
  // Check for exact permission match
  if (currentUser.permissions?.includes(permissionName)) {
    return true
  }
  
  // Check for resource-specific permissions
  if (resourceType && resourceId) {
    const resourceKey = `${permissionName}:${resourceType}:${resourceId}`
    const wildcardKey = `${permissionName}:${resourceType}:any`
    
    return !!(currentUser.effective_permissions[resourceKey] || 
             currentUser.effective_permissions[wildcardKey])
  }
  
  return false
}

export function getPermissionSource(permissionName: string, user?: EnhancedUser | null): string | null {
  const currentUser = user || getCurrentUser()
  if (!currentUser?.effective_permissions) {
    return null
  }
  
  const permissionData = currentUser.effective_permissions[permissionName]
  return permissionData?.source || null
}

export function isPermissionFromGroup(permissionName: string, user?: EnhancedUser | null): boolean {
  const source = getPermissionSource(permissionName, user)
  return source ? source.startsWith('group:') : false
}

export function isPermissionFromRole(permissionName: string, user?: EnhancedUser | null): boolean {
  const source = getPermissionSource(permissionName, user)
  return source ? source.startsWith('role:') : false
}

export function isDirectPermission(permissionName: string, user?: EnhancedUser | null): boolean {
  const source = getPermissionSource(permissionName, user)
  return source === 'direct'
}

// Function to refresh permissions (useful for real-time updates)
export async function refreshUserPermissions(): Promise<boolean> {
  try {
    await fetchAndStoreUserPermissions()
    return true
  } catch (error) {
    console.error("Failed to refresh permissions:", error)
    return false
  }
}
