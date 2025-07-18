// Base configuration for API calls
// Removed: import { isOfflineMode } from "./utils"

// API base URL - use Next.js proxy to avoid CORS issues
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "/api"

// Helper function to handle API responses
export async function handleApiResponse<T>(response: Response): Promise<T> {
  // Handle authentication errors specially
  if (response.status === 401) {
    const errorText = await response.text()
    
    // Try to parse JSON error response
    try {
      const errorJson = JSON.parse(errorText)
      const userMessage = errorJson.error || errorJson.message || 'Authentication required'
      
      // Log the authentication failure for debugging
      console.warn("Authentication failed:", userMessage)
      
      // Redirect to login if authentication fails
      if (typeof window !== 'undefined') {
        localStorage.removeItem("fboUser")
        window.location.href = '/login'
      }
      
      throw new Error(`Authentication required: ${userMessage}`)
    } catch (parseError) {
      // Fallback to raw text if JSON parsing fails
      if (typeof window !== 'undefined') {
        localStorage.removeItem("fboUser")
        window.location.href = '/login'
      }
      throw new Error(`Authentication required: Please log in to access this resource`)
    }
  }
  
  if (!response.ok) {
    // Handle other HTTP error statuses
    const errorText = await response.text()
    let message = errorText

    try {
      // Attempt to parse the error response as JSON
      const errorJson = JSON.parse(errorText)
      // Use the specific error message from the backend if available
      message = errorJson.error || errorJson.message || errorJson.details || message
    } catch (e) {
      // If parsing fails, 'message' will remain the raw errorText, which is fine.
    }

    // Throw an error with the cleaned-up message.
    // The UI component that catches this can then display it.
    throw new Error(message)
  }

  try {
    // Handle DELETE requests that return empty responses
    if (response.status === 204) {
      return undefined as T
    }
    
    // Try to parse as JSON, but handle non-JSON responses gracefully
    const contentType = response.headers.get("content-type")
    if (contentType && contentType.includes("application/json")) {
      return await response.json()
    } else {
      // For non-JSON responses, return empty object for successful requests
      return {} as T
    }
  } catch (error) {
    console.error("Error parsing API response:", error)
    throw new Error("Failed to parse API response")
  }
}

// Helper to get auth headers with improved error handling
export function getAuthHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  try {
    // Get user object string from localStorage
    const userStr = localStorage.getItem("fboUser");
    if (userStr) {
      // Parse the user object
      const user = JSON.parse(userStr);
      // Extract the access token
      if (user && user.access_token) {
        headers["Authorization"] = `Bearer ${user.access_token}`;
      } else {
        console.warn("User object found but no access_token available");
      }
    } else {
      console.warn("No user object found in localStorage");
    }
  } catch (error) {
    console.error("Failed to parse user from localStorage or get token:", error);
    // Clear invalid user data
    localStorage.removeItem("fboUser");
  }

  return headers;
}

// Function to get headers for GET requests (omits Content-Type)
export function getHeadersForGetRequest(): Record<string, string> {
  const headers: Record<string, string> = {};

  try {
    const userStr = localStorage.getItem("fboUser");
    if (userStr) {
      const user = JSON.parse(userStr);
      if (user && user.access_token) {
        headers["Authorization"] = `Bearer ${user.access_token}`;
      }
    }
  } catch (error) {
    console.error("Failed to parse user from localStorage or get token:", error);
  }

  return headers;
}

// Add a function to check if user is authenticated
export function isAuthenticated(): boolean {
  try {
    const userStr = localStorage.getItem("fboUser");
    if (userStr) {
      const user = JSON.parse(userStr);
      return !!(user && user.access_token);
    }
    return false;
  } catch (error) {
    console.error("Error checking authentication status:", error);
    localStorage.removeItem("fboUser");
    return false;
  }
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
