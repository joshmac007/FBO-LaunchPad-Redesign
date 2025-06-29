import { API_BASE_URL, getAuthHeaders, handleApiResponse } from "./api-config"

// Aircraft Type interface for the types endpoint
// Backend might return base_min_fuel_gallons_for_waiver as string or number
interface BackendAircraftType {
  id: number
  name: string
  base_min_fuel_gallons_for_waiver: number | string
  classification_id: number
  classification_name: string
}

export interface AircraftType {
  id: number
  name: string
  base_min_fuel_gallons_for_waiver: number
  classification_id: number
  classification_name: string
}

// Request payload interfaces for Aircraft Types
export interface AircraftTypeCreateRequest {
  name: string
  base_min_fuel_gallons_for_waiver: number
  classification_id: number
}

export interface AircraftTypeUpdateRequest {
  name?: string
  base_min_fuel_gallons_for_waiver?: number
  classification_id?: number
}

// Frontend Aircraft model - accurately reflecting backend structure
export interface Aircraft {
  id: string  // Use tail_number as the ID
  tailNumber: string
  aircraftType: string  // Corresponds to aircraft_type from backend
  fuelType: string      // Corresponds to fuel_type from backend
  customerId?: number   // Optional customer association
  createdAt: string
  updatedAt: string
}

// Backend API-aligned interfaces
interface BackendAdminAircraft {
  tail_number: string
  aircraft_type: string
  fuel_type: string
  customer_id?: number
  created_at: string
  updated_at: string
}

interface BackendAircraft {
  tail_number: string  // Primary key in backend
  aircraft_type: string
  fuel_type: string
  customer_id?: number
  created_at: string
  updated_at: string
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
    aircraftType: backend.aircraft_type,
    fuelType: backend.fuel_type,
    customerId: backend.customer_id,
    createdAt: backend.created_at,
    updatedAt: backend.updated_at,
  }
}

function mapBackendToFrontendAircraft(backend: BackendAircraft): Aircraft {
  return {
    id: backend.tail_number,
    tailNumber: backend.tail_number,
    aircraftType: backend.aircraft_type,
    fuelType: backend.fuel_type,
    customerId: backend.customer_id,
    createdAt: backend.created_at,
    updatedAt: backend.updated_at,
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
    // Check for aircraft not found error message
    if (error instanceof Error && error.message.includes("not found")) {
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
    // Check for aircraft not found error message
    if (error instanceof Error && error.message.includes("not found")) {
      return null
    }
    throw error
  }
}

// --- Aircraft Types Function ---

export async function getAircraftTypes(): Promise<AircraftType[]> {
  const response = await fetch(`${API_BASE_URL}/aircraft/types`, {
    headers: getAuthHeaders(),
  })
  const data = await handleApiResponse<BackendAircraftType[]>(response)
  // Ensure base_min_fuel_gallons_for_waiver is always a number and classification_name is present
  return data.map((backendType) => ({
    ...backendType,
    base_min_fuel_gallons_for_waiver: Number(
      backendType.base_min_fuel_gallons_for_waiver,
    ),
    classification_name: backendType.classification_name || "Unclassified",
  }))
}

export async function createAircraftType(data: AircraftTypeCreateRequest): Promise<AircraftType> {
  const response = await fetch(`${API_BASE_URL}/aircraft/types`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  })
  const result = await handleApiResponse<{ message: string; aircraft_type: BackendAircraftType }>(response)
  return {
    ...result.aircraft_type,
    base_min_fuel_gallons_for_waiver: Number(result.aircraft_type.base_min_fuel_gallons_for_waiver),
    classification_name: result.aircraft_type.classification_name || "Unclassified",
  }
}

export async function updateAircraftType(typeId: number, data: AircraftTypeUpdateRequest): Promise<AircraftType> {
  const response = await fetch(`${API_BASE_URL}/aircraft/types/${typeId}`, {
    method: "PUT",
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  })
  const result = await handleApiResponse<{ message: string; aircraft_type: BackendAircraftType }>(response)
  return {
    ...result.aircraft_type,
    base_min_fuel_gallons_for_waiver: Number(result.aircraft_type.base_min_fuel_gallons_for_waiver),
    classification_name: result.aircraft_type.classification_name || "Unclassified",
  }
}

export async function deleteAircraftType(typeId: number): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/aircraft/types/${typeId}`, {
    method: "DELETE",
    headers: getAuthHeaders(),
  })
  await handleApiResponse<unknown>(response) // Expecting 204 No Content
}
