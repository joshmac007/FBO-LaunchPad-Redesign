import { API_BASE_URL, getAuthHeaders, handleApiResponse } from "./api-config" // Removed checkApiHealth
import { UserPreferences } from "@/app/schemas/user-preferences.schema"

// Updated User Interface
export interface User {
  id: number
  username: string // Login username
  fullName?: string // User's full/display name
  email: string
  roles: Array<{ id: number; name: string }> // Standardized to match backend RoleBriefSchema
  is_active: boolean
  created_at?: string // Optional: ISO timestamp
  preferences: UserPreferences
}

// Role Interface
export interface Role {
  id: number
  name: string
  description?: string
}

// Response type for roles endpoint
export interface RolesResponse {
  message?: string
  roles: Role[]
}

// Response type for endpoints returning a list of users (like /admin/users and /users)
export interface UsersResponse {
  message: string
  users: User[] // This will be UserDetailSchema[] or UserBriefSchema[] from backend
}

// Response type for endpoints returning a single user (like /admin/users/{id} or /users/{id})
export interface UserResponse {
  message: string
  user: User // This will be UserDetailSchema or UserResponseSchema from backend
}

// Request Payload Types
export interface UserCreateRequest {
  email: string
  password: string
  role_ids: number[] // IDs of roles to assign
  username?: string // Login username
  fullName?: string // User's full name
  is_active?: boolean // Defaults to true on backend
}

export interface UserUpdateRequest {
  username?: string // Login username
  fullName?: string // User's full name
  email?: string
  role_ids?: number[]
  is_active?: boolean
  password?: string // For password changes
}

// Interface for the brief user schema returned by /users?role=Line Service Technician
interface UserBriefSchema {
  id: number
  username?: string
  email: string
  name?: string
  role: string // Single role string
  is_active: boolean
}

interface UserBriefResponse {
  message: string
  users: UserBriefSchema[]
}

export async function getActiveLSTs(): Promise<User[]> {
  try {
    // Use the non-admin users endpoint with role filter
    // This only requires view_users permission instead of manage_roles
    const response = await fetch(`${API_BASE_URL}/users?role=Line Service Technician&is_active=true`, {
      method: "GET",
      headers: getAuthHeaders(),
    })

    const data = await handleApiResponse<UserBriefResponse>(response)

    // Transform the brief user response to match the User interface
    const users: User[] = data.users.map(briefUser => ({
      id: briefUser.id,
      username: briefUser.username || briefUser.email,
      fullName: briefUser.name,
      email: briefUser.email,
      roles: [{ id: 0, name: briefUser.role }], // Brief response only has role string
      is_active: briefUser.is_active,
      created_at: undefined, // Not included in brief response
      preferences: { // Default preferences for brief user response
        fee_schedule_view_size: 'standard',
        fee_schedule_sort_order: 'alphabetical',
        highlight_overrides: true,
        show_classification_defaults: true,
        dismissed_tooltips: [],
        fee_schedule_column_codes: []
      }
    }))

    return users
  } catch (error) {
    console.error("Error fetching LSTs:", error) 
    throw error
  }
}

// Admin User CRUD Functions

export async function getAllUsers(filters?: { 
  role_ids?: number[]; 
  role?: string; 
  is_active?: string 
}): Promise<User[]> {
  let url = `${API_BASE_URL}/users`
  const queryParams = new URLSearchParams()

  if (filters?.is_active !== undefined) {
    queryParams.append("is_active", filters.is_active)
  }
  
  if (filters?.role_ids && filters.role_ids.length > 0) {
    filters.role_ids.forEach((id) => queryParams.append("role_ids", id.toString()))
  }
  
  if (filters?.role) {
    queryParams.append("role", filters.role)
  }

  if (queryParams.toString()) {
    url += `?${queryParams.toString()}`
  }

  const response = await fetch(url, {
    method: "GET",
    headers: getAuthHeaders(),
  })
  const data = await handleApiResponse<UsersResponse>(response) // Assuming UsersResponse has {users: User[]}
  return data.users
}

export async function createUser(userData: UserCreateRequest): Promise<User> {
  const response = await fetch(`${API_BASE_URL}/users`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(userData),
  })
  const data = await handleApiResponse<UserResponse>(response) // Assuming UserResponse has {user: User}
  return data.user
}

export async function updateUser(userId: number, userData: UserUpdateRequest): Promise<User> {
  const response = await fetch(`${API_BASE_URL}/users/${userId}`, {
    method: "PATCH",
    headers: getAuthHeaders(),
    body: JSON.stringify(userData),
  })
  const data = await handleApiResponse<UserResponse>(response)
  return data.user
}

export async function deleteUser(userId: number): Promise<{ message: string }> {
  const response = await fetch(`${API_BASE_URL}/users/${userId}`, {
    method: "DELETE",
    headers: getAuthHeaders(),
  })
  // Note: /api/users DELETE returns 204 No Content, not a JSON message
  if (response.status === 204) {
    return { message: "User deleted successfully" }
  }
  return handleApiResponse<{ message: string }>(response)
}

export async function getUserById(userId: number): Promise<User> {
  const response = await fetch(`${API_BASE_URL}/users/${userId}`, {
    method: "GET",
    headers: getAuthHeaders(),
  })
  const data = await handleApiResponse<UserResponse>(response)
  return data.user
}

// Role Management Functions

export async function getRoles(): Promise<Role[]> {
  const response = await fetch(`${API_BASE_URL}/admin/roles`, {
    method: "GET",
    headers: getAuthHeaders(),
  })
  const data = await handleApiResponse<RolesResponse>(response)
  return data.roles
}

export async function getAdminUserById(userId: number): Promise<User> {
  const response = await fetch(`${API_BASE_URL}/users/${userId}`, {
    method: "GET",
    headers: getAuthHeaders(),
  })
  const data = await handleApiResponse<UserResponse>(response)
  return data.user
}

// User Preferences Functions

export interface UserPreferencesResponse {
  message: string
  preferences: UserPreferences
}

export async function updateUserPreferences(preferences: Partial<UserPreferences>): Promise<UserPreferencesResponse> {
  const response = await fetch(`${API_BASE_URL}/users/me/preferences`, {
    method: "PATCH",
    headers: getAuthHeaders(),
    body: JSON.stringify(preferences),
  })
  const data = await handleApiResponse<UserPreferencesResponse>(response)
  
  // Update the user object in localStorage with the new preferences
  // so they persist across page refreshes
  const userData = localStorage.getItem("fboUser")
  if (userData) {
    try {
      const user = JSON.parse(userData)
      user.preferences = data.preferences
      localStorage.setItem("fboUser", JSON.stringify(user))
    } catch (error) {
      console.error("Failed to update user preferences in localStorage:", error)
    }
  }
  
  return data
}
