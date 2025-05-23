import { API_BASE_URL, getAuthHeaders, handleApiResponse, checkApiHealth } from "./api-config"

export interface User {
  id: number
  name: string
  email: string
  role: string
  is_active: boolean
}

export interface UsersResponse {
  message: string
  users: User[]
}

// Mock data for LSTs when API is unavailable
const mockLSTs: User[] = [
  { id: 1, name: "John Smith", email: "john.smith@fbo.com", role: "LST", is_active: true },
  { id: 2, name: "Sarah Johnson", email: "sarah.johnson@fbo.com", role: "LST", is_active: true },
  { id: 3, name: "Michael Brown", email: "michael.brown@fbo.com", role: "LST", is_active: true },
  { id: 4, name: "Emily Davis", email: "emily.davis@fbo.com", role: "LST", is_active: true },
]

export async function getActiveLSTs(): Promise<User[]> {
  // First check if API is available
  try {
    const isApiAvailable = await checkApiHealth()

    if (!isApiAvailable) {
      console.log("API unavailable or returning non-JSON, using mock LST data")
      return mockLSTs
    }

    const response = await fetch(`${API_BASE_URL}/users?role=LST&is_active=true`, {
      method: "GET",
      headers: getAuthHeaders(),
    })

    // Check if response is JSON before trying to parse it
    const contentType = response.headers.get("content-type")
    if (!contentType || !contentType.includes("application/json")) {
      console.log("API returned non-JSON response, using mock LST data")
      return mockLSTs
    }

    const data = await handleApiResponse<UsersResponse>(response)
    return data.users
  } catch (error) {
    console.error("Error fetching LSTs:", error)
    console.log("Falling back to mock LST data")
    return mockLSTs
  }
}
