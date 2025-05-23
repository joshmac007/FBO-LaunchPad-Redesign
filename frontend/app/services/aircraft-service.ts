import { API_BASE_URL, getAuthHeaders } from "./api-config"
import { isOfflineMode } from "./utils"

// Aircraft model
export interface Aircraft {
  id: number
  tailNumber: string
  type: string
  model: string
  owner: string
  homeBase: string
  lastMaintenance?: string
  nextMaintenance?: string
  status: "active" | "maintenance" | "inactive"
  fuelCapacity: number
  preferredFuelType: string
  mtow?: number // Maximum Takeoff Weight in pounds
  lastFaaSyncAt?: string // When the aircraft data was last synced with FAA
  previousOwner?: string // Previous owner if changed
  ownershipChangeDate?: string // Date when ownership changed
  ownershipChangeAcknowledged?: boolean // Whether the ownership change has been acknowledged
}

// Aircraft validation result
export interface AircraftValidationResult {
  isValid: boolean
  message: string
  details?: {
    registration?: {
      isValid: boolean
      message: string
    }
    airworthiness?: {
      isValid: boolean
      message: string
      expirationDate?: string
    }
    insurance?: {
      isValid: boolean
      message: string
      expirationDate?: string
    }
  }
}

// Aircraft lookup result
export interface AircraftLookupResult {
  aircraft: Aircraft
  isOwnershipChanged: boolean
  previousOwner?: string
  ownershipChangeDate?: string
  isNew: boolean
}

// Initialize aircraft data in localStorage
export function initializeAircraftData(): void {
  // Check if aircraft data already exists
  const existingData = localStorage.getItem("fboAircraft")
  if (existingData) {
    return // Data already initialized
  }

  // Create sample aircraft data
  const sampleAircraft: Aircraft[] = [
    {
      id: 1,
      tailNumber: "N12345",
      type: "Jet",
      model: "Gulfstream G650",
      owner: "Executive Aviation LLC",
      homeBase: "KJFK",
      lastMaintenance: "2023-01-15",
      nextMaintenance: "2023-07-15",
      status: "active",
      fuelCapacity: 6500,
      preferredFuelType: "Jet A",
      mtow: 99600,
      lastFaaSyncAt: "2023-05-01T12:00:00Z",
    },
    {
      id: 2,
      tailNumber: "N54321",
      type: "Turboprop",
      model: "King Air 350",
      owner: "Charter Solutions Inc.",
      homeBase: "KBOS",
      lastMaintenance: "2023-02-20",
      nextMaintenance: "2023-08-20",
      status: "active",
      fuelCapacity: 1800,
      preferredFuelType: "Jet A",
      mtow: 15000,
      lastFaaSyncAt: "2023-05-02T12:00:00Z",
    },
    {
      id: 3,
      tailNumber: "N98765",
      type: "Piston",
      model: "Cessna 172",
      owner: "Flight School Academy",
      homeBase: "KPHL",
      lastMaintenance: "2023-03-10",
      nextMaintenance: "2023-09-10",
      status: "maintenance",
      fuelCapacity: 56,
      preferredFuelType: "Avgas",
      mtow: 2450,
      lastFaaSyncAt: "2023-05-03T12:00:00Z",
    },
    {
      id: 4,
      tailNumber: "N24680",
      type: "Jet",
      model: "Citation X",
      owner: "Corporate Jets LLC",
      homeBase: "KLAX",
      lastMaintenance: "2023-04-05",
      nextMaintenance: "2023-10-05",
      status: "active",
      fuelCapacity: 1900,
      preferredFuelType: "Jet A+",
      mtow: 36100,
      lastFaaSyncAt: "2023-05-04T12:00:00Z",
    },
    {
      id: 5,
      tailNumber: "N13579",
      type: "Helicopter",
      model: "Bell 407",
      owner: "Helicopter Tours Inc.",
      homeBase: "KLAS",
      lastMaintenance: "2023-05-12",
      nextMaintenance: "2023-11-12",
      status: "inactive",
      fuelCapacity: 110,
      preferredFuelType: "Jet A",
      mtow: 5250,
      lastFaaSyncAt: "2023-05-05T12:00:00Z",
    },
    // Add an aircraft with ownership change for testing
    {
      id: 6,
      tailNumber: "N78901",
      type: "Jet",
      model: "Bombardier Global 6000",
      owner: "New Aviation Holdings LLC",
      previousOwner: "Old Aviation Inc.",
      homeBase: "KDEN",
      lastMaintenance: "2023-04-20",
      nextMaintenance: "2023-10-20",
      status: "active",
      fuelCapacity: 6500,
      preferredFuelType: "Jet A",
      mtow: 94000,
      lastFaaSyncAt: "2023-05-15T12:00:00Z",
      ownershipChangeDate: "2023-05-10T00:00:00Z",
      ownershipChangeAcknowledged: false,
    },
  ]

  // Save to localStorage
  localStorage.setItem("fboAircraft", JSON.stringify(sampleAircraft))
}

// Get all aircraft
export async function getAircraft(): Promise<Aircraft[]> {
  if (isOfflineMode()) {
    // Return mock data from localStorage
    const storedAircraft = localStorage.getItem("fboAircraft")
    if (storedAircraft) {
      return JSON.parse(storedAircraft)
    }

    // If no data in localStorage, initialize and return
    initializeAircraftData()
    const initialData = localStorage.getItem("fboAircraft")
    return initialData ? JSON.parse(initialData) : []
  }

  // Online mode - fetch from API
  try {
    const response = await fetch(`${API_BASE_URL}/aircraft`, {
      method: "GET",
      headers: getAuthHeaders(),
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch aircraft: ${response.statusText}`)
    }

    const contentType = response.headers.get("content-type")
    if (contentType && contentType.includes("application/json")) {
      return await response.json()
    } else {
      throw new Error("API returned non-JSON response")
    }
  } catch (error) {
    console.error("Error fetching aircraft:", error)
    return []
  }
}

// Get aircraft by ID
export async function getAircraftById(id: number): Promise<Aircraft | null> {
  if (isOfflineMode()) {
    // Get from localStorage
    const storedAircraft = localStorage.getItem("fboAircraft")
    if (!storedAircraft) {
      return null
    }

    const aircraft = JSON.parse(storedAircraft) as Aircraft[]
    return aircraft.find((a) => a.id === id) || null
  }

  // Online mode - fetch from API
  try {
    const response = await fetch(`${API_BASE_URL}/aircraft/${id}`, {
      method: "GET",
      headers: getAuthHeaders(),
    })

    if (!response.ok) {
      if (response.status === 404) {
        return null
      }
      throw new Error(`Failed to fetch aircraft: ${response.statusText}`)
    }

    const contentType = response.headers.get("content-type")
    if (contentType && contentType.includes("application/json")) {
      return await response.json()
    } else {
      throw new Error("API returned non-JSON response")
    }
  } catch (error) {
    console.error("Error fetching aircraft by ID:", error)
    return null
  }
}

// Validate aircraft
export async function validateAircraft(tailNumber: string): Promise<AircraftValidationResult> {
  if (isOfflineMode()) {
    // Simulate validation with mock data
    // For demo purposes, we'll validate based on the last character of the tail number
    const lastChar = tailNumber.charAt(tailNumber.length - 1)
    const lastDigit = Number.parseInt(lastChar)

    if (isNaN(lastDigit)) {
      // If last character is not a number, consider it valid
      return {
        isValid: true,
        message: "Aircraft validation successful",
        details: {
          registration: {
            isValid: true,
            message: "Registration is valid",
          },
          airworthiness: {
            isValid: true,
            message: "Airworthiness certificate is valid",
            expirationDate: "2024-12-31",
          },
          insurance: {
            isValid: true,
            message: "Insurance is valid",
            expirationDate: "2024-06-30",
          },
        },
      }
    } else if (lastDigit % 3 === 0) {
      // If last digit is divisible by 3, consider registration invalid
      return {
        isValid: false,
        message: "Aircraft validation failed: Registration issues",
        details: {
          registration: {
            isValid: false,
            message: "Registration has expired",
          },
          airworthiness: {
            isValid: true,
            message: "Airworthiness certificate is valid",
            expirationDate: "2024-12-31",
          },
          insurance: {
            isValid: true,
            message: "Insurance is valid",
            expirationDate: "2024-06-30",
          },
        },
      }
    } else if (lastDigit % 2 === 0) {
      // If last digit is even, consider airworthiness invalid
      return {
        isValid: false,
        message: "Aircraft validation failed: Airworthiness issues",
        details: {
          registration: {
            isValid: true,
            message: "Registration is valid",
          },
          airworthiness: {
            isValid: false,
            message: "Airworthiness certificate has expired",
            expirationDate: "2023-01-15",
          },
          insurance: {
            isValid: true,
            message: "Insurance is valid",
            expirationDate: "2024-06-30",
          },
        },
      }
    } else {
      // Otherwise, consider insurance invalid
      return {
        isValid: false,
        message: "Aircraft validation failed: Insurance issues",
        details: {
          registration: {
            isValid: true,
            message: "Registration is valid",
          },
          airworthiness: {
            isValid: true,
            message: "Airworthiness certificate is valid",
            expirationDate: "2024-12-31",
          },
          insurance: {
            isValid: false,
            message: "Insurance has expired",
            expirationDate: "2023-03-15",
          },
        },
      }
    }
  }

  // Online mode - validate via API
  try {
    const response = await fetch(`${API_BASE_URL}/aircraft/validate`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify({ tailNumber }),
    })

    if (!response.ok) {
      throw new Error(`Failed to validate aircraft: ${response.statusText}`)
    }

    const contentType = response.headers.get("content-type")
    if (contentType && contentType.includes("application/json")) {
      return await response.json()
    } else {
      throw new Error("API returned non-JSON response")
    }
  } catch (error) {
    console.error("Error validating aircraft:", error)
    return {
      isValid: false,
      message: "Error validating aircraft: " + (error instanceof Error ? error.message : String(error)),
    }
  }
}

// Get aircraft by tail number
export async function getAircraftByTailNumber(tailNumber: string): Promise<Aircraft | null> {
  if (isOfflineMode()) {
    // Get from localStorage
    const storedAircraft = localStorage.getItem("fboAircraft")
    if (!storedAircraft) {
      return null
    }

    const aircraft = JSON.parse(storedAircraft) as Aircraft[]
    return aircraft.find((a) => a.tailNumber.toLowerCase() === tailNumber.toLowerCase()) || null
  }

  // Online mode - fetch from API
  try {
    const response = await fetch(`${API_BASE_URL}/aircraft/tail/${encodeURIComponent(tailNumber)}`, {
      method: "GET",
      headers: getAuthHeaders(),
    })

    if (!response.ok) {
      if (response.status === 404) {
        return null
      }
      throw new Error(`Failed to fetch aircraft: ${response.statusText}`)
    }

    const contentType = response.headers.get("content-type")
    if (contentType && contentType.includes("application/json")) {
      return await response.json()
    } else {
      throw new Error("API returned non-JSON response")
    }
  } catch (error) {
    console.error("Error fetching aircraft by tail number:", error)
    return null
  }
}

// Acknowledge ownership change
export async function acknowledgeOwnershipChange(aircraftId: number): Promise<boolean> {
  if (isOfflineMode()) {
    // Update in localStorage
    const storedAircraft = localStorage.getItem("fboAircraft")
    if (!storedAircraft) {
      return false
    }

    const aircraft = JSON.parse(storedAircraft) as Aircraft[]
    const index = aircraft.findIndex((a) => a.id === aircraftId)

    if (index === -1) {
      return false
    }

    // Update the aircraft
    aircraft[index].ownershipChangeAcknowledged = true

    // Save back to localStorage
    localStorage.setItem("fboAircraft", JSON.stringify(aircraft))

    return true
  }

  // Online mode - acknowledge via API
  try {
    const response = await fetch(`${API_BASE_URL}/aircraft/${aircraftId}/acknowledge-ownership-change`, {
      method: "POST",
      headers: getAuthHeaders(),
    })

    return response.ok
  } catch (error) {
    console.error("Error acknowledging ownership change:", error)
    return false
  }
}

// Get all aircraft with unacknowledged ownership changes
export async function getAircraftWithOwnershipChanges(): Promise<Aircraft[]> {
  console.log("getAircraftWithOwnershipChanges called")

  // Check if we're in offline mode
  const offline = isOfflineMode()
  console.log("Offline mode:", offline)

  if (offline) {
    console.log("Using offline mode for ownership changes")

    try {
      // Initialize data if needed
      initializeAircraftData()
      console.log("Aircraft data initialized")

      // Get from localStorage
      const storedAircraft = localStorage.getItem("fboAircraft")
      if (!storedAircraft) {
        console.log("No aircraft data found in localStorage")
        return []
      }

      try {
        // Parse the JSON data
        const aircraft = JSON.parse(storedAircraft) as Aircraft[]
        console.log(`Found ${aircraft.length} total aircraft in localStorage`)

        // Filter for aircraft with ownership changes
        const filteredAircraft = aircraft.filter((a) => a.previousOwner && a.ownershipChangeAcknowledged === false)
        console.log(`Found ${filteredAircraft.length} aircraft with unacknowledged ownership changes`)

        return filteredAircraft
      } catch (parseError) {
        console.error("Error parsing aircraft data from localStorage:", parseError)
        return []
      }
    } catch (error) {
      console.error("Error in offline mode for ownership changes:", error)
      return []
    }
  }

  // We're in online mode
  console.log("Using online mode for ownership changes")

  try {
    const response = await fetch(`${API_BASE_URL}/aircraft/ownership-changes`, {
      method: "GET",
      headers: getAuthHeaders(),
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch aircraft with ownership changes: ${response.statusText}`)
    }

    const contentType = response.headers.get("content-type")
    if (!contentType || !contentType.includes("application/json")) {
      throw new Error("API returned non-JSON response")
    }

    const data = await response.json()
    console.log(`Retrieved ${data.length} aircraft with ownership changes from API`)
    return data
  } catch (error) {
    console.error("Error fetching aircraft with ownership changes:", error)
    // Return empty array instead of throwing
    return []
  }
}
