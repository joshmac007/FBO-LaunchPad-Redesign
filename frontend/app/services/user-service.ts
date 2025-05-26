import { API_BASE_URL, getAuthHeaders, handleApiResponse } from "./api-config" // Removed checkApiHealth

// Updated User Interface
export interface User {
  id: number
  name?: string // Optional: User's full name
  username?: string // Optional: User's login username
  email: string
  roles: string[] // Changed from role: string
  is_active: boolean
  created_at?: string // Optional: ISO timestamp
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
  name?: string // User's full name
  is_active?: boolean // Defaults to true on backend
}

export interface UserUpdateRequest {
  name?: string
  email?: string
  role_ids?: number[]
  is_active?: boolean
  password?: string // For password changes
}

// Interface for the brief user schema returned by /users?role=LST
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
  // Removed checkApiHealth and mockLSTs fallback
  try {
    const response = await fetch(`${API_BASE_URL}/users?role=LST&is_active=true`, {
      method: "GET",
      headers: getAuthHeaders(),
    })

    const data = await handleApiResponse<UserBriefResponse>(response)

    // Map UserBriefSchema[] to User[]
    return data.users.map((userBrief) => ({
      ...userBrief,
      roles: [userBrief.role], // Convert single role string to array
    }))
  } catch (error) {
    // Log and re-throw the error, or handle it as per application's error handling strategy
    console.error("Error fetching LSTs:", error) 
    throw error // Propagate the error
  }
}

// Admin User CRUD Functions

export async function getAllUsers(filters?: { role_ids?: number[]; is_active?: string }): Promise<User[]> {
  let url = `${API_BASE_URL}/admin/users`
  const queryParams = new URLSearchParams()

  if (filters?.is_active !== undefined) {
    queryParams.append("is_active", filters.is_active)
  }
  if (filters?.role_ids && filters.role_ids.length > 0) {
    filters.role_ids.forEach((id) => queryParams.append("role_ids", id.toString()))
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
  const response = await fetch(`${API_BASE_URL}/admin/users`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(userData),
  })
  const data = await handleApiResponse<UserResponse>(response) // Assuming UserResponse has {user: User}
  return data.user
}

export async function updateUser(userId: number, userData: UserUpdateRequest): Promise<User> {
  const response = await fetch(`${API_BASE_URL}/admin/users/${userId}`, {
    method: "PATCH",
    headers: getAuthHeaders(),
    body: JSON.stringify(userData),
  })
  const data = await handleApiResponse<UserResponse>(response)
  return data.user
}

export async function deleteUser(userId: number): Promise<{ message: string }> {
  const response = await fetch(`${API_BASE_URL}/admin/users/${userId}`, {
    method: "DELETE",
    headers: getAuthHeaders(),
  })
  // Assuming the response for delete is just { message: string } and not wrapped in "user"
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
  const response = await fetch(`${API_BASE_URL}/admin/users/${userId}`, {
    method: "GET",
    headers: getAuthHeaders(),
  })
  const data = await handleApiResponse<UserResponse>(response)
  return data.user
}
