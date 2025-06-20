import { API_BASE_URL, getAuthHeaders, handleApiResponse } from "./api-config"

// LST Interface matching the frontend data structure
export interface LST {
  id: string
  name: string
  email: string
  employeeId: string
  status: "active" | "inactive" | "on_leave"
  shift: "day" | "night" | "swing"
  certifications: string[]
  performanceRating: number
  ordersCompleted: number
  averageTime: number // in minutes
  lastActive: string
  hireDate: string
}

// Response types for LST endpoints
export interface LSTResponse {
  message: string
  lst: LST
}

export interface LSTsResponse {
  message: string
  lsts: LST[]
}

export interface LSTStatsResponse {
  message: string
  stats: {
    total_lsts: number
    active_lsts: number
    average_performance: number
    average_completion_time: number
  }
}

// Request payload types
export interface LSTCreateRequest {
  name: string
  email: string
  employee_id: string
  shift: "day" | "night" | "swing"
  certifications?: string[]
  password?: string // Optional, backend can generate default password
}

export interface LSTUpdateRequest {
  name?: string
  email?: string
  employee_id?: string
  status?: "active" | "inactive" | "on_leave"
  shift?: "day" | "night" | "swing"
  certifications?: string[]
  performance_rating?: number
}

// LST CRUD Functions

export async function getAllLSTs(filters?: { 
  status?: "active" | "inactive" | "on_leave", 
  shift?: "day" | "night" | "swing" 
}): Promise<LST[]> {
  let url = `${API_BASE_URL}/admin/lsts`
  const queryParams = new URLSearchParams()

  if (filters?.status) {
    queryParams.append("status", filters.status)
  }
  if (filters?.shift) {
    queryParams.append("shift", filters.shift)
  }

  if (queryParams.toString()) {
    url += `?${queryParams.toString()}`
  }

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: getAuthHeaders(),
    })
    const data = await handleApiResponse<LSTsResponse>(response)
    return data.lsts
  } catch (error) {
    console.error("Error fetching LSTs:", error)
    throw error
  }
}

export async function createLST(lstData: LSTCreateRequest): Promise<LST> {
  try {
    const response = await fetch(`${API_BASE_URL}/admin/lsts`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify(lstData),
    })
    const data = await handleApiResponse<LSTResponse>(response)
    return data.lst
  } catch (error) {
    console.error("Error creating LST:", error)
    throw error
  }
}

export async function getLSTById(lstId: string): Promise<LST> {
  try {
    const response = await fetch(`${API_BASE_URL}/admin/lsts/${lstId}`, {
      method: "GET",
      headers: getAuthHeaders(),
    })
    const data = await handleApiResponse<LSTResponse>(response)
    return data.lst
  } catch (error) {
    console.error("Error fetching LST:", error)
    throw error
  }
}

export async function updateLST(lstId: string, lstData: LSTUpdateRequest): Promise<LST> {
  try {
    const response = await fetch(`${API_BASE_URL}/admin/lsts/${lstId}`, {
      method: "PATCH",
      headers: getAuthHeaders(),
      body: JSON.stringify(lstData),
    })
    const data = await handleApiResponse<LSTResponse>(response)
    return data.lst
  } catch (error) {
    console.error("Error updating LST:", error)
    throw error
  }
}

export async function deleteLST(lstId: string): Promise<{ message: string }> {
  try {
    const response = await fetch(`${API_BASE_URL}/admin/lsts/${lstId}`, {
      method: "DELETE",
      headers: getAuthHeaders(),
    })
    return handleApiResponse<{ message: string }>(response)
  } catch (error) {
    console.error("Error deleting LST:", error)
    throw error
  }
}

export async function getLSTStats(): Promise<LSTStatsResponse['stats']> {
  try {
    const response = await fetch(`${API_BASE_URL}/admin/lsts/stats`, {
      method: "GET",
      headers: getAuthHeaders(),
    })
    const data = await handleApiResponse<LSTStatsResponse>(response)
    return data.stats
  } catch (error) {
    console.error("Error fetching LST stats:", error)
    throw error
  }
}

// Helper function to convert backend LST data to frontend format if needed
export function transformBackendLST(backendLST: any): LST {
  return {
    id: backendLST.id?.toString() || backendLST.user_id?.toString(),
    name: backendLST.name || '',
    email: backendLST.email || '',
    employeeId: backendLST.employee_id || `LST${backendLST.id}`,
    status: mapBackendStatus(backendLST.status || backendLST.is_active),
    shift: backendLST.shift || 'day',
    certifications: backendLST.certifications || [],
    performanceRating: backendLST.performance_rating || 0,
    ordersCompleted: backendLST.orders_completed || 0,
    averageTime: backendLST.average_time || 0,
    lastActive: backendLST.last_active || new Date().toISOString(),
    hireDate: backendLST.hire_date || backendLST.created_at || new Date().toISOString(),
  }
}

// Helper function to map backend status to frontend status
function mapBackendStatus(backendStatus: any): "active" | "inactive" | "on_leave" {
  if (typeof backendStatus === 'boolean') {
    return backendStatus ? 'active' : 'inactive'
  }
  if (typeof backendStatus === 'string') {
    const lowerStatus = backendStatus.toLowerCase()
    if (lowerStatus === 'active' || lowerStatus === 'inactive' || lowerStatus === 'on_leave') {
      return lowerStatus as "active" | "inactive" | "on_leave"
    }
  }
  return 'active' // default fallback
} 