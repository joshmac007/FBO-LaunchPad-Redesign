import { API_BASE_URL, getAuthHeaders, handleApiResponse, getHeadersForGetRequest } from "./api-config"
import { calculateFees, type FeeCalculationResult } from "./fee-service"

// ===================================================================
// TYPE DEFINITIONS - DUAL MODEL ARCHITECTURE
// ===================================================================

// Frontend Display Interface (optimized for UI interactions)
export interface FuelOrderDisplay {
  id: number
  orderNumber: string
  aircraft_id: string
  aircraft_tail_number: string
  aircraft_registration: string
  quantity: string // String for form handling
  fuel_type: string // Added missing fuel_type field
  customer_name: string
  customer_id: number
  status: FuelOrderStatus
  priority: 'normal' | 'high' | 'urgent'
  csr_notes: string
  lst_notes: string
  notes: string // General notes field for backward compatibility
  additive_requested: boolean
  location_on_ramp: string
  assigned_lst_name: string
  assigned_truck_name: string
  assigned_truck_id: string // Added for backward compatibility
  created_at: string
  estimated_completion: string
  completed_at?: string
  reviewed_at?: string
  review_notes?: string // Notes from CSR review
  fees?: FeeCalculationResult
  // Receipt linking and order locking fields
  receipt_id?: number | null
  is_locked: boolean
  // Nested objects for detailed access
  aircraft?: {
    tail_number: string
    registration?: string
    type?: string
  }
  customer?: {
    id: number
    name: string
  }
  assigned_lst?: {
    id: number
    name: string
  }
}

// Backend Communication Interface (aligned with API contracts)
export interface FuelOrderBackend {
  id?: number
  tail_number: string
  fuel_type?: string // Added missing fuel_type field
  requested_amount: number | string // Can be number or string depending on endpoint
  gallons_requested?: number // From Marshmallow schema transformation
  customer_id: number
  customer_name?: string // Customer name from backend relationship
  status: string
  priority?: string
  csr_notes?: string
  lst_notes?: string
  review_notes?: string // Notes from CSR review
  additive_requested?: boolean
  location_on_ramp?: string
  assigned_lst_user_id?: number // -1 for auto-assign
  assigned_truck_id?: number // -1 for auto-assign
  created_at?: string
  estimated_completion_time?: string
  completed_at?: string
  reviewed_at?: string
  assigned_lst_username?: string;
  assigned_lst_fullName?: string;
  assigned_truck_number?: string;
  // Receipt linking and order locking fields
  receipt_id?: number | null;
  is_locked?: boolean;
}

// Request interfaces for different operations
export interface FuelOrderCreateRequest {
  tail_number: string
  fuel_type: string  // Added missing fuel_type field required by backend
  requested_amount: number
  customer_id: number
  priority?: string
  csr_notes?: string
  additive_requested?: boolean
  location_on_ramp?: string
  assigned_lst_user_id?: number
  assigned_truck_id?: number
}

export interface FuelOrderUpdateStatusRequest {
  status: string
  lst_notes?: string
}

export interface FuelOrderManualStatusUpdateRequest {
  status: string
  start_meter_reading?: number
  end_meter_reading?: number
  reason?: string
}

export interface FuelOrderSubmitDataRequest {
  actual_amount?: number
  lst_notes?: string
  completed_at?: string
}

export interface FuelOrderReviewRequest {
  approved: boolean
  review_notes?: string
}

// Filter options for querying fuel orders
export interface FuelOrderFilters {
  status?: string
  customer_id?: number
  priority?: string
  start_date?: string
  end_date?: string
  assigned_lst_user_id?: number
  assigned_truck_id?: number
  fuel_type?: string
}

// Statistics interface
export interface FuelOrderStats {
  counts: {
    active_count: number
    pending_count: number
    completed_today: number
    total_orders: number
  }
  message: string
}

// Status enumeration (matches backend API response format)
export type FuelOrderStatus = 
  | 'Pending'
  | 'Assigned'
  | 'In Progress'
  | 'Completed'
  | 'Reviewed'
  | 'Cancelled'

// Lookup data interfaces for transformations
export interface Aircraft {
  id: string
  registration: string
  type: string
}

export interface User {
  id: number
  name: string
}

export interface FuelTruck {
  id: number
  name: string
  capacity: number
  status: string
}

// ===================================================================
// DATA TRANSFORMATION UTILITIES
// ===================================================================

// Simple cache for lookup data with TTL
interface CacheEntry<T> {
  data: T
  timestamp: number
  ttl: number
}

const cache = new Map<string, CacheEntry<any>>()

function getCachedData<T>(key: string, fetcher: () => Promise<T>, ttl: number = 300000): Promise<T> {
  const entry = cache.get(key)
  if (entry && (Date.now() - entry.timestamp) < entry.ttl) {
    return Promise.resolve(entry.data)
  }
  
  return fetcher().then(data => {
    cache.set(key, { data, timestamp: Date.now(), ttl })
    return data
  })
}

// Aircraft lookup function
async function getAircraftData(): Promise<Aircraft[]> {
  return getCachedData('aircraft', async () => {
    const response = await fetch(`${API_BASE_URL}/aircraft/`, {
      method: 'GET',
      headers: getAuthHeaders(),
    })
    const data = await handleApiResponse<{ aircraft: Aircraft[] }>(response)
    return data.aircraft
  })
}

// User lookup function
async function getUserData(): Promise<User[]> {
  return getCachedData('users', async () => {
    const response = await fetch(`${API_BASE_URL}/users?role=Line Service Technician&is_active=true`, {
      method: 'GET',
      headers: getAuthHeaders(),
    })
    const data = await handleApiResponse<{ users: User[] }>(response)
    return data.users
  })
}

// Fuel truck lookup function
async function getFuelTruckData(): Promise<FuelTruck[]> {
  return getCachedData('fuel-trucks', async () => {
    const response = await fetch(`${API_BASE_URL}/fuel-trucks/`, {
      method: 'GET',
      headers: getAuthHeaders(),
    })
    const data = await handleApiResponse<{ fuel_trucks: FuelTruck[] }>(response)
    return data.fuel_trucks
  })
}

// Transform backend data to frontend display format
export async function transformToDisplay(
  backend: FuelOrderBackend,
): Promise<FuelOrderDisplay> {
  // This function no longer needs to fetch or receive lookup tables.
  // It trusts the denormalized data from the backend.
  return {
    id: backend.id!,
    orderNumber: `FO-${String(backend.id).padStart(6, '0')}`,
    aircraft_id: backend.tail_number,
    aircraft_tail_number: backend.tail_number,
    aircraft_registration: backend.tail_number,
    quantity: String(backend.gallons_requested || backend.requested_amount || 0),
    fuel_type: backend.fuel_type || 'Unknown',
    customer_name: backend.customer_name || 'N/A', // Directly use the name from the backend
    customer_id: backend.customer_id,
    status: backend.status as FuelOrderStatus,
    priority: (backend.priority?.toLowerCase() as 'normal' | 'high' | 'urgent') || 'normal',
    csr_notes: backend.csr_notes || '',
    lst_notes: backend.lst_notes || '',
    notes: backend.csr_notes || backend.lst_notes || '',
    additive_requested: backend.additive_requested || false,
    location_on_ramp: backend.location_on_ramp || '',
    assigned_lst_name: backend.assigned_lst_fullName || 'Unassigned', // Directly use the name
    assigned_truck_name: backend.assigned_truck_number || 'Unassigned', // Directly use the number
    assigned_truck_id: String(backend.assigned_truck_id || ''),
    created_at: backend.created_at || new Date().toISOString(),
    estimated_completion: backend.estimated_completion_time || '',
    completed_at: backend.completed_at,
    reviewed_at: backend.reviewed_at,
    review_notes: backend.review_notes,
    receipt_id: backend.receipt_id,
    is_locked: backend.is_locked || false,
    // Nested objects are now populated directly
    aircraft: {
      tail_number: backend.tail_number,
    },
    customer: {
      id: backend.customer_id,
      name: backend.customer_name || 'N/A',
    },
    assigned_lst: {
      id: backend.assigned_lst_user_id!,
      name: backend.assigned_lst_fullName || 'Unassigned',
    },
  };
}

// Transform frontend display data to backend format
export async function transformToBackend(
  display: Partial<FuelOrderDisplay>,
  aircraftData?: Aircraft[],
  userData?: User[],
  truckData?: FuelTruck[]
): Promise<Partial<FuelOrderBackend>> {
  // Get lookup data if not provided (only for users and trucks)
  const users = userData || await getUserData()
  const trucks = truckData || await getFuelTruckData()

  // Helper functions for reverse lookups
  const getLSTIdByName = (name: string): number => {
    if (name === 'auto-assign') return -1
    const user = users.find(u => u.name === name)
    if (!user) throw new Error(`LST user with name ${name} not found`)
    return user.id
  }

  const getTruckIdByName = (name: string): number => {
    if (name === 'auto-assign') return -1
    const truck = trucks.find(t => t.name === name)
    if (!truck) throw new Error(`Fuel truck with name ${name} not found`)
    return truck.id
  }

  const result: Partial<FuelOrderBackend> = {}

  // Handle aircraft_id - use it directly as tail_number
  if (display.aircraft_id) {
    result.tail_number = display.aircraft_id
  }

  // Transform other fields
  if (display.quantity) {
    const parsed = parseFloat(display.quantity)
    if (isNaN(parsed) || parsed <= 0) {
      throw new Error('Invalid quantity: must be a positive number')
    }
    result.requested_amount = parsed
  }

  if (display.customer_id) result.customer_id = display.customer_id
  if (display.status) result.status = display.status
  if (display.priority) result.priority = display.priority
  if (display.csr_notes) result.csr_notes = display.csr_notes
  if (display.lst_notes) result.lst_notes = display.lst_notes
  if (display.additive_requested !== undefined) result.additive_requested = display.additive_requested
  if (display.location_on_ramp) result.location_on_ramp = display.location_on_ramp

  // Handle assignments
  if (display.assigned_lst_name) {
    result.assigned_lst_user_id = getLSTIdByName(display.assigned_lst_name)
  }
  if (display.assigned_truck_name) {
    result.assigned_truck_id = getTruckIdByName(display.assigned_truck_name)
  }

  return result
}

// ===================================================================
// SPECIALIZED SERVICE FUNCTIONS
// ===================================================================

/**
 * CREATE OPERATIONS
 */

// Create a new fuel order
export async function createFuelOrder(data: FuelOrderCreateRequest): Promise<FuelOrderDisplay> {
  const response = await fetch(`${API_BASE_URL}/fuel-orders`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  })

  const responseData = await handleApiResponse<{ message: string; fuel_order: FuelOrderBackend }>(response)
  const createdOrder = responseData.fuel_order
  const transformedOrder = await transformToDisplay(createdOrder)
  return transformedOrder
}

/**
 * READ OPERATIONS
 */

// Get all fuel orders with optional filtering
export async function getFuelOrders(
  filters?: FuelOrderFilters
): Promise<{ orders: FuelOrderBackend[]; stats: FuelOrderStats; pagination: any }> {
  const queryParams = new URLSearchParams()
  if (filters) {
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        queryParams.append(key, String(value))
      }
    })
  }
  // Ensures we get the stats back with the main order query
  queryParams.append('include_stats', 'true')

  const response = await fetch(`${API_BASE_URL}/fuel-orders?${queryParams.toString()}`, {
    method: 'GET',
    headers: getHeadersForGetRequest(),
  })

  // The backend is expected to return `orders` and `stats` in the same payload
  const data = await handleApiResponse<{
    orders: FuelOrderBackend[]
    stats: FuelOrderStats
    pagination: any
  }>(response)

  return {
    orders: data.orders,
    stats: data.stats,
    pagination: data.pagination,
  }
}

// Get a specific fuel order by ID
export async function getFuelOrderById(id: number): Promise<FuelOrderDisplay> {
  const response = await fetch(`${API_BASE_URL}/fuel-orders/${id}`, {
    method: 'GET',
    headers: getAuthHeaders(),
  })

  const responseData = await handleApiResponse<{ message: string; fuel_order: FuelOrderBackend }>(response)
  return transformToDisplay(responseData.fuel_order)
}

// Backward compatibility alias
export const getFuelOrder = getFuelOrderById

// Get fuel order statistics
export async function getFuelOrderStats(): Promise<FuelOrderStats> {
  const response = await fetch(`${API_BASE_URL}/fuel-orders/stats/status-counts`, {
    method: 'GET',
    headers: getAuthHeaders(),
  })

  return handleApiResponse<FuelOrderStats>(response)
}

/**
 * UPDATE OPERATIONS (mapped to specific endpoints)
 */

// Update fuel order status (LST operations)
export async function updateFuelOrderStatus(id: number, statusData: FuelOrderUpdateStatusRequest): Promise<FuelOrderDisplay> {
  const response = await fetch(`${API_BASE_URL}/fuel-orders/${id}/status`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
    body: JSON.stringify(statusData),
  })

  const backendOrder = await handleApiResponse<FuelOrderBackend>(response)
  return transformToDisplay(backendOrder)
}

// Get all possible fuel order status values
export async function getFuelOrderStatuses(): Promise<string[]> {
  const response = await fetch(`${API_BASE_URL}/fuel-orders/statuses`, {
    method: 'GET',
    headers: getAuthHeaders(),
  })

  const data = await handleApiResponse<{ statuses: string[] }>(response)
  return data.statuses
}

// Manual status update (CSR operations with meter readings and reason)
export async function updateOrderStatus(orderId: number, payload: FuelOrderManualStatusUpdateRequest): Promise<FuelOrderDisplay> {
  const response = await fetch(`${API_BASE_URL}/fuel-orders/${orderId}/status`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  })

  const responseData = await handleApiResponse<{ message: string; fuel_order: FuelOrderBackend }>(response)
  return transformToDisplay(responseData.fuel_order)
}

// Submit fuel order completion data (LST completion)
export async function submitFuelOrderData(id: number, completionData: FuelOrderSubmitDataRequest): Promise<FuelOrderDisplay> {
  const response = await fetch(`${API_BASE_URL}/fuel-orders/${id}/submit-data`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(completionData),
  })

  const responseData = await handleApiResponse<{ message: string; fuel_order: FuelOrderBackend }>(response)
  return transformToDisplay(responseData.fuel_order)
}

// Review fuel order (CSR review)
export async function reviewFuelOrder(id: number, reviewData: FuelOrderReviewRequest): Promise<FuelOrderDisplay> {
  const response = await fetch(`${API_BASE_URL}/fuel-orders/${id}/review`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
    body: JSON.stringify(reviewData),
  })

  const responseData = await handleApiResponse<{ message: string; fuel_order: FuelOrderBackend }>(response)
  return transformToDisplay(responseData.fuel_order)
}

/**
 * CANCEL OPERATION (replaces delete)
 */

// Cancel a fuel order (status-based cancellation)
export async function cancelFuelOrder(id: number): Promise<FuelOrderDisplay> {
  return updateFuelOrderStatus(id, { status: 'CANCELLED' })
}

// ===================================================================
// UTILITY FUNCTIONS
// ===================================================================

// Filter fuel orders (client-side filtering for already fetched data)
export function filterFuelOrders(
  orders: FuelOrderDisplay[],
  startDate?: string,
  endDate?: string,
  status?: string,
): FuelOrderDisplay[] {
  return orders.filter((order) => {
    // Filter by start date
    if (startDate && new Date(order.created_at) < new Date(startDate)) {
      return false
    }

    // Filter by end date
    if (endDate) {
      const endDateTime = new Date(endDate)
      endDateTime.setHours(23, 59, 59, 999) // End of the day
      if (new Date(order.created_at) > endDateTime) {
        return false
      }
    }

    // Filter by status
    if (status && status !== "ALL" && order.status !== status) {
      return false
    }

    return true
  })
}

// Convert fuel orders to CSV
export function convertFuelOrdersToCSV(orders: FuelOrderDisplay[]): string {
  if (orders.length === 0) {
    return ""
  }

  // Define CSV headers
  const headers = [
    "ID",
    "Aircraft Registration", 
    "Customer",
    "Quantity (Gallons)",
    "Status",
    "Priority",
    "Additive Requested",
    "Location on Ramp",
    "Assigned LST",
    "Assigned Truck",
    "Created At",
    "Completed At",
    "CSR Notes",
    "LST Notes",
  ]

  // Create CSV content
  const csvContent = [
    headers.join(","),
    ...orders.map((order) =>
      [
        order.id,
        order.aircraft_registration,
        order.customer_name,
        order.quantity,
        order.status,
        order.priority,
        order.additive_requested ? 'Yes' : 'No',
        order.location_on_ramp ? `"${order.location_on_ramp.replace(/"/g, '""')}"` : '',
        order.assigned_lst_name,
        order.assigned_truck_name,
        order.created_at,
        order.completed_at || "",
        order.csr_notes ? `"${order.csr_notes.replace(/"/g, '""')}"` : "",
        order.lst_notes ? `"${order.lst_notes.replace(/"/g, '""')}"` : "",
      ].join(","),
    ),
  ].join("\n")

  return csvContent
}

// Download CSV
export function downloadCSV(csvContent: string, filename: string): void {
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
  const link = document.createElement("a")

  // Create a URL for the blob
  const url = URL.createObjectURL(blob)

  // Set link properties
  link.setAttribute("href", url)
  link.setAttribute("download", filename)
  link.style.visibility = "hidden"

  // Append to the document, click, and remove
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

// Get export URL for server-side CSV generation
export function exportFuelOrdersUrl(startDate?: string, endDate?: string, status?: string): string {
  let url = `${API_BASE_URL}/fuel-orders/export`
  const params = new URLSearchParams()

  if (startDate) {
    params.append("startDate", startDate)
  }

  if (endDate) {
    params.append("endDate", endDate)
  }

  if (status && status !== "ALL") {
    params.append("status", status)
  }

  if (params.toString()) {
    url += `?${params.toString()}`
  }

  return url
}

// Clear cached lookup data (useful for refreshing data)
export function clearFuelOrderCache(): void {
  cache.clear()
}
