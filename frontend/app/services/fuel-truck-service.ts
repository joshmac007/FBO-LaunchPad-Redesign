import { API_BASE_URL, getAuthHeaders, handleApiResponse, checkApiHealth } from "./api-config"

export interface FuelTruck {
  id: number
  truck_number: string
  fuel_type: string
  capacity: number
  current_fuel_level: number
  is_active: boolean
}

export interface FuelTrucksResponse {
  message: string
  fuel_trucks: FuelTruck[]
}

// Mock data for fuel trucks when API is unavailable
const mockFuelTrucks: FuelTruck[] = [
  {
    id: 1,
    truck_number: "FT-001",
    fuel_type: "Jet A",
    capacity: 5000,
    current_fuel_level: 3500,
    is_active: true,
  },
  {
    id: 2,
    truck_number: "FT-002",
    fuel_type: "Avgas 100LL",
    capacity: 3000,
    current_fuel_level: 2200,
    is_active: true,
  },
  {
    id: 3,
    truck_number: "FT-003",
    fuel_type: "Jet A-1",
    capacity: 7000,
    current_fuel_level: 6000,
    is_active: true,
  },
  {
    id: 4,
    truck_number: "FT-004",
    fuel_type: "Jet A",
    capacity: 5000,
    current_fuel_level: 4200,
    is_active: true,
  },
]

export async function getActiveFuelTrucks(): Promise<FuelTruck[]> {
  // First check if API is available
  try {
    const isApiAvailable = await checkApiHealth()

    if (!isApiAvailable) {
      console.log("API unavailable or returning non-JSON, using mock fuel truck data")
      return mockFuelTrucks
    }

    const response = await fetch(`${API_BASE_URL}/fuel-trucks?is_active=true`, {
      method: "GET",
      headers: getAuthHeaders(),
    })

    // Check if response is JSON before trying to parse it
    const contentType = response.headers.get("content-type")
    if (!contentType || !contentType.includes("application/json")) {
      console.log("API returned non-JSON response, using mock fuel truck data")
      return mockFuelTrucks
    }

    const data = await handleApiResponse<FuelTrucksResponse>(response)
    return data.fuel_trucks
  } catch (error) {
    console.error("Error fetching fuel trucks:", error)
    console.log("Falling back to mock fuel truck data")
    return mockFuelTrucks
  }
}
