import { API_BASE_URL, getAuthHeaders, handleApiResponse } from "./api-config"

// --- Core Interfaces ---

export interface FuelTruck {
  id: number
  truck_number: string
  fuel_type: string
  capacity: number
  current_meter_reading: number // Changed from current_fuel_level
  is_active: boolean
  created_at?: string
  updated_at?: string
}

export interface FuelTruckCreateRequest {
  truck_number: string
  fuel_type: string
  capacity: number
  current_meter_reading?: number // Optional, defaults to 0 on backend
}

export interface FuelTruckUpdateRequest {
  truck_number?: string
  fuel_type?: string
  capacity?: number
  current_meter_reading?: number
  is_active?: boolean
}

// Internal helper types for backend responses
interface BackendFuelTruckListResponse {
  message: string
  fuel_trucks: FuelTruck[]
}

interface BackendFuelTruckDetailResponse {
  message: string
  fuel_truck: FuelTruck
}

// --- Fuel Truck CRUD Functions ---

export async function getAllFuelTrucks(filters?: { is_active?: string }): Promise<FuelTruck[]> {
  let url = `${API_BASE_URL}/fuel-trucks/`
  if (filters?.is_active !== undefined) {
    url += `?is_active=${filters.is_active}`
  }
  const response = await fetch(url, {
    method: "GET",
    headers: getAuthHeaders(),
  })
  const data = await handleApiResponse<BackendFuelTruckListResponse>(response)
  return data.fuel_trucks
}

export async function getFuelTruckById(truckId: number): Promise<FuelTruck | null> {
  try {
    const response = await fetch(`${API_BASE_URL}/fuel-trucks/${truckId}`, {
      method: "GET",
      headers: getAuthHeaders(),
    })
    const data = await handleApiResponse<BackendFuelTruckDetailResponse>(response)
    return data.fuel_truck
  } catch (error) {
    if (error instanceof Error && error.message.includes("API error (404)")) {
      return null
    }
    throw error
  }
}

export async function createFuelTruck(truckData: FuelTruckCreateRequest): Promise<FuelTruck> {
  const response = await fetch(`${API_BASE_URL}/fuel-trucks/`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(truckData),
  })
  const data = await handleApiResponse<BackendFuelTruckDetailResponse>(response)
  return data.fuel_truck
}

export async function updateFuelTruck(
  truckId: number,
  truckData: FuelTruckUpdateRequest,
): Promise<FuelTruck> {
  const response = await fetch(`${API_BASE_URL}/fuel-trucks/${truckId}`, {
    method: "PATCH",
    headers: getAuthHeaders(),
    body: JSON.stringify(truckData),
  })
  const data = await handleApiResponse<BackendFuelTruckDetailResponse>(response)
  return data.fuel_truck
}

export async function deleteFuelTruck(truckId: number): Promise<{ message: string }> {
  const response = await fetch(`${API_BASE_URL}/fuel-trucks/${truckId}`, {
    method: "DELETE",
    headers: getAuthHeaders(),
  })
  return handleApiResponse<{ message: string }>(response)
}
