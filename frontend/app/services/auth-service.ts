import { assignRoleToUser, initializePermissionSystem } from "./permission-service"

export interface LoginRequest {
  email: string
  password: string
}

export interface LoginResponse {
  access_token: string
  user: {
    id: number
    email: string
    role: string
    is_active: boolean
  }
}

export async function login(credentials: LoginRequest): Promise<LoginResponse> {
  try {
    // Initialize the permission system
    initializePermissionSystem()

    // For the admin user, use the hardcoded credentials
    if (credentials.email === "fbosaas@gmail.com" && credentials.password === "b4H6a4JJT2V*ccUCb_69") {
      // Create a mock response
      const response: LoginResponse = {
        access_token: "mock_token_" + Date.now(),
        user: {
          id: 1,
          email: credentials.email,
          role: "admin",
          is_active: true,
        },
      }

      // Store user data in localStorage
      localStorage.setItem(
        "fboUser",
        JSON.stringify({
          ...response.user,
          access_token: response.access_token,
          isLoggedIn: true,
        }),
      )

      // Assign admin role to the user
      assignRoleToUser(credentials.email, "admin", "system")

      return response
    }

    // For other users, check in localStorage
    const users = JSON.parse(localStorage.getItem("fboUsers") || "[]")
    const user = users.find((u: any) => u.email === credentials.email && u.password === credentials.password)

    if (user) {
      // Create a response
      const response: LoginResponse = {
        access_token: "mock_token_" + Date.now(),
        user: {
          id: Number.parseInt(user.id),
          email: user.email,
          role: user.role,
          is_active: true,
        },
      }

      // Store user data in localStorage
      localStorage.setItem(
        "fboUser",
        JSON.stringify({
          ...response.user,
          access_token: response.access_token,
          isLoggedIn: true,
          name: user.name,
        }),
      )

      // Assign appropriate role based on user.role
      assignRoleToUser(credentials.email, user.role, "system")

      return response
    }

    throw new Error("Invalid email or password")
  } catch (error) {
    console.error("Login error:", error)
    throw error
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
