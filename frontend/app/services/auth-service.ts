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

    // Store user data in localStorage
    localStorage.setItem(
      "fboUser",
      JSON.stringify({
        ...data.user,
        access_token: data.token, // Store JWT as access_token
        isLoggedIn: true,
      }),
    )

    return data
  } catch (error) {
    console.error("Login error:", error)
    // Rethrow the error so it can be caught by the calling component
    if (error instanceof Error) {
      throw new Error(`Login failed: ${error.message}`)
    }
    throw new Error("Login failed: An unknown error occurred")
  }
}

export function logout() {
  localStorage.removeItem("fboUser")
  // Redirect to login page can be handled by the component
}

export function getCurrentUser() {
  const userData = localStorage.getItem("fboUser")
  if (!userData) {
    return null
  }

  try {
    return JSON.parse(userData)
  } catch (e) {
    console.error("Error parsing user data", e)
    return null
  }
}

export function isAuthenticated() {
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

export interface UserPermissionsResponse {
  message: string
  permissions: string[]
}

export async function fetchUserPermissions(): Promise<string[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/me/permissions`, {
      method: "GET",
      headers: getAuthHeaders(), // getAuthHeaders from api-config will add Content-Type and Authorization
    })

    // Use handleApiResponse for consistent error handling and response parsing
    const data: UserPermissionsResponse = await handleApiResponse(response)
    return data.permissions
  } catch (error) {
    console.error("Error fetching user permissions:", error)
    // Depending on how strict the error handling should be,
    // we can throw the error or return an empty array.
    // For now, let's rethrow to let the caller decide.
    if (error instanceof Error) {
      throw new Error(`Failed to fetch permissions: ${error.message}`)
    }
    throw new Error("Failed to fetch permissions: An unknown error occurred")
  }
}
