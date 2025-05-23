// Base configuration for API calls
import { isOfflineMode } from "./utils"

// API base URL - we'll use an environment variable
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5001/api"

// Helper function to handle API responses
export async function handleApiResponse<T>(response: Response): Promise<T> {
  // If we're in offline mode, don't try to parse the response
  if (isOfflineMode()) {
    throw new Error("Cannot parse API response in offline mode")
  }

  if (!response.ok) {
    // Handle HTTP error status
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
export function getAuthHeaders() {
  // Get token from localStorage
  const userData = localStorage.getItem("fboUser")
  if (!userData) {
    return {}
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
    const response = await fetch(`${API_BASE_URL}/health`, {
      method: "GET",
      signal: AbortSignal.timeout(5000), // 5 second timeout
    })

    // Check if response is JSON
    const contentType = response.headers.get("content-type")
    if (!contentType || !contentType.includes("application/json")) {
      return false
    }

    return response.ok
  } catch (error) {
    console.warn("API health check failed:", error)
    return false
  }
}
