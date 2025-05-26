// Base configuration for API calls
// Removed: import { isOfflineMode } from "./utils"

// API base URL - use Next.js proxy to avoid CORS issues
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "/api"

// Helper function to handle API responses
export async function handleApiResponse<T>(response: Response): Promise<T> {
  // Handle authentication errors specially
  if (response.status === 401) {
    const errorText = await response.text()
    throw new Error(`Authentication required: Please log in to access fuel orders`)
  }
  
  if (!response.ok) {
    // Handle other HTTP error statuses
    const errorText = await response.text()
    throw new Error(`API error (${response.status}): ${errorText}`)
  }

  try {
    // Try to parse as JSON, but handle non-JSON responses gracefully
    const contentType = response.headers.get("content-type")
    if (contentType && contentType.includes("application/json")) {
      return await response.json()
    } else {
      throw new Error("API returned non-JSON response")
    }
  } catch (error) {
    console.error("Error parsing API response:", error)
    throw new Error("Failed to parse API response")
  }
}

// Helper to get auth headers
export function getAuthHeaders(): Record<string, string> {
  // Get token from localStorage
  const userData = localStorage.getItem("fboUser")
  if (!userData) {
    return { "Content-Type": "application/json" }
  }

  try {
    const user = JSON.parse(userData)
    if (user.access_token) {
      return {
        Authorization: `Bearer ${user.access_token}`,
        "Content-Type": "application/json",
      }
    }
  } catch (e) {
    console.error("Error parsing user data", e)
  }

  return { "Content-Type": "application/json" }
}

// Add a function to check API health
export async function checkApiHealth(): Promise<boolean> {
  try {
    // Use a simple approach: try to reach the API base URL
    // We'll do a HEAD request to minimize data transfer
    const response = await fetch(`${API_BASE_URL}/fuel-orders`, {
      method: "HEAD",
      signal: AbortSignal.timeout(3000), // 3 second timeout
    })

    // Any response (including 401, 403, 404) indicates the backend is running
    // Only network errors or timeouts indicate the backend is down
    return true
  } catch (error) {
    // Network error, timeout, or backend is down
    console.warn("API health check failed - backend may be down:", error)
    return false
  }
}
