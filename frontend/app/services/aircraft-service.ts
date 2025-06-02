import { API_BASE_URL, getAuthHeaders, handleApiResponse } from "./api-config"

// Frontend Aircraft model (updated to use tail_number as id)
export interface Aircraft {
  id: string  // Use tail_number as the ID
  tailNumber: string
  type: string // Corresponds to aircraft_type from backend
  model: string // Will be 'N/A' or derived if not directly from backend
  owner: string // Will be 'N/A' or derived if not directly from backend, potentially customer_id
  homeBase: string // Will be 'N/A' or derived
  lastMaintenance?: string
  nextMaintenance?: string
  status: "active" | "maintenance" | "inactive" // Default to 'active' or derived
  fuelCapacity: number // Default or derived
  preferredFuelType: string // Corresponds to fuel_type from backend
  mtow?: number
  lastFaaSyncAt?: string
  // Potentially add customer_id if needed on frontend representation
  customer_id?: number
}

// Backend API-aligned interfaces
interface BackendAdminAircraft {
  id: number
  tail_number: string
  aircraft_type: string
  fuel_type: string
  customer_id?: number
  // Add other fields if the backend AdminAircraftSchema provides more that are useful for mapping
}

interface BackendAircraft {
  tail_number: string  // Primary key in backend
  aircraft_type: string
  fuel_type: string
  // Add other fields if the backend AircraftResponseSchema provides more that are useful for mapping
}

// Request payload interfaces
export interface AdminAircraftCreateRequest {
  tail_number: string
  aircraft_type: string
  fuel_type: string
  customer_id?: number
}

export interface AdminAircraftUpdateRequest {
  aircraft_type?: string
  fuel_type?: string
  customer_id?: number
}

// CSR Aircraft Creation Request (limited fields)
export interface CSRAircraftCreateRequest {
  tail_number: string
  aircraft_type: string
  fuel_type: string
}

// Response type for list endpoints
interface AdminAircraftListResponse {
  aircraft: BackendAdminAircraft[]
  message: string
}

interface AircraftListResponse {
  aircraft: BackendAircraft[]
  message: string
}

// --- Data Mapping Helper Functions ---

function mapBackendAdminToFrontendAircraft(backend: BackendAdminAircraft): Aircraft {
  return {
    id: backend.tail_number,
    tailNumber: backend.tail_number,
    type: backend.aircraft_type,
    model: "N/A", // Or derive if possible from aircraft_type or other data
    owner: backend.customer_id ? `Customer ID: ${backend.customer_id}` : "N/A", // Example mapping
    homeBase: "N/A",
    status: "active", // Default status
    fuelCapacity: 0, // Default, consider if backend can provide this
    preferredFuelType: backend.fuel_type,
    customer_id: backend.customer_id,
    // Initialize other optional fields from Aircraft interface as undefined or default
    lastMaintenance: undefined,
    nextMaintenance: undefined,
    mtow: undefined,
    lastFaaSyncAt: undefined,
  }
}

function mapBackendToFrontendAircraft(backend: BackendAircraft): Aircraft {
  return {
    id: backend.tail_number,
    tailNumber: backend.tail_number,
    type: backend.aircraft_type,
    model: "N/A",
    owner: "N/A", // General endpoint might not have customer info
    homeBase: "N/A",
    status: "active",
    fuelCapacity: 0,
    preferredFuelType: backend.fuel_type,
    // Initialize other optional fields
    lastMaintenance: undefined,
    nextMaintenance: undefined,
    mtow: undefined,
    lastFaaSyncAt: undefined,
  }
}

// --- Admin Aircraft CRUD Functions ---

export async function getAllAdminAircraft(filters?: { customer_id?: number }): Promise<Aircraft[]> {
  let url = `${API_BASE_URL}/admin/aircraft/`
  if (filters?.customer_id) {
    url += `?customer_id=${filters.customer_id}`
  }
  const response = await fetch(url, {
    method: "GET",
    headers: getAuthHeaders(),
  })
  const data = await handleApiResponse<AdminAircraftListResponse>(response)
  return data.aircraft.map(mapBackendAdminToFrontendAircraft)
}

export async function getAdminAircraftByTailNumber(tailNumber: string): Promise<Aircraft | null> {
  try {
    const response = await fetch(`${API_BASE_URL}/admin/aircraft/${encodeURIComponent(tailNumber)}`, {
      method: "GET",
      headers: getAuthHeaders(),
    })
    // handleApiResponse will throw for non-ok status, including 404
    const backendAircraft = await handleApiResponse<BackendAdminAircraft>(response)
    return mapBackendAdminToFrontendAircraft(backendAircraft)
  } catch (error) {
    // Check if the error message indicates a 404 Not Found
    if (error instanceof Error && error.message.includes("API error (404)")) {
      return null // Return null for 404s as per requirement
    }
    // Re-throw other errors
    throw error
  }
}

// Functions to be removed as per subtask description:
// - getAircraftById(id: number)
// - validateAircraft(tailNumber: string)
// These functions were part of the original file but are not included in the refactored version below this comment block.
// Their removal will be completed by not re-defining them.

export async function createAdminAircraft(aircraftData: AdminAircraftCreateRequest): Promise<Aircraft> {
  const response = await fetch(`${API_BASE_URL}/admin/aircraft/`, {
    method: "POST",
    headers: getAuthHeaders(), // Ensure Content-Type: application/json is set by getAuthHeaders
    body: JSON.stringify(aircraftData),
  })
  const backendAircraft = await handleApiResponse<BackendAdminAircraft>(response)
  return mapBackendAdminToFrontendAircraft(backendAircraft)
}

// CSR Aircraft Creation Function (using existing permissions)
export async function createCSRAircraft(aircraftData: CSRAircraftCreateRequest): Promise<Aircraft> {
  const response = await fetch(`${API_BASE_URL}/aircraft/quick-create`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(aircraftData),
  })
  const data = await handleApiResponse<{ message: string; aircraft: BackendAircraft }>(response)
  return mapBackendToFrontendAircraft(data.aircraft)
}

export async function updateAdminAircraft(
  tailNumber: string,
  aircraftData: AdminAircraftUpdateRequest,
): Promise<Aircraft> {
  const response = await fetch(`${API_BASE_URL}/admin/aircraft/${encodeURIComponent(tailNumber)}`, {
    method: "PATCH",
    headers: getAuthHeaders(),
    body: JSON.stringify(aircraftData),
  })
  const backendAircraft = await handleApiResponse<BackendAdminAircraft>(response)
  return mapBackendAdminToFrontendAircraft(backendAircraft)
}

export async function deleteAdminAircraft(tailNumber: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/admin/aircraft/${encodeURIComponent(tailNumber)}`, {
    method: "DELETE",
    headers: getAuthHeaders(),
  })
  // handleApiResponse will throw if response is not ok (e.g. 204 is ok)
  // For DELETE 204, response.json() would fail, so we might need a custom check or rely on handleApiResponse
  // Assuming handleApiResponse correctly handles 204 No Content or similar success statuses for DELETE
  // If handleApiResponse expects JSON, and DELETE returns no body, this might need adjustment in handleApiResponse
  // For now, let's assume handleApiResponse can deal with it or throws an error for non-204/non-200.
  await handleApiResponse<unknown>(response) // Expecting no content, so unknown is fine.
}

// --- General Aircraft Functions ---

export async function getAircraftList(): Promise<Aircraft[]> {
  const response = await fetch(`${API_BASE_URL}/aircraft/`, {
    method: "GET",
    headers: getAuthHeaders(),
  })
  const data = await handleApiResponse<AircraftListResponse>(response)
  return data.aircraft.map(mapBackendToFrontendAircraft)
}

export async function getAircraftByTailNumber(tailNumber: string): Promise<Aircraft | null> {
  try {
    const response = await fetch(`${API_BASE_URL}/aircraft/${encodeURIComponent(tailNumber)}`, {
      method: "GET",
      headers: getAuthHeaders(),
    })
    const data = await handleApiResponse<{ message: string; aircraft: BackendAircraft }>(response)
    
    // Validate that the backend aircraft has required fields
    if (!data.aircraft) {
      console.error('Backend response missing aircraft object:', data)
      throw new Error('Invalid response: missing aircraft data')
    }
    
    if (!data.aircraft.tail_number) {
      console.error('Backend aircraft missing tail_number field:', data.aircraft)
      throw new Error('Invalid aircraft data: missing tail number')
    }
    
    const mappedAircraft = mapBackendToFrontendAircraft(data.aircraft)
    
    return mappedAircraft
  } catch (error) {
    if (error instanceof Error && error.message.includes("API error (404)")) {
      return null
    }
    throw error
  }
}
