import { API_BASE_URL, getAuthHeaders, handleApiResponse } from "./api-config"
import { calculateFees, type FeeCalculationResult } from "./fee-service"
import { isOfflineMode } from "./utils"

// Fuel Order model
export interface FuelOrder {
  id: number
  aircraft_id: number
  customer_id: number
  fuel_type: string
  quantity: string
  actual_quantity?: string
  assigned_lst_id: number
  assigned_truck_id: number
  notes?: string
  review_notes?: string
  status: string
  created_at: string
  updated_at: string
  completed_at?: string
  reviewed_at?: string
  fees?: FeeCalculationResult
}

// Create Fuel Order Request
export interface CreateFuelOrderRequest {
  aircraft_id: number
  customer_id: number
  fuel_type: string
  quantity: string
  assigned_lst_id: number
  assigned_truck_id: number
  notes?: string
}

// Get all fuel orders
export async function getFuelOrders(): Promise<FuelOrder[]> {
  if (isOfflineMode()) {
    // Return mock data from localStorage
    const storedOrders = localStorage.getItem("fboFuelOrders")
    if (storedOrders) {
      return JSON.parse(storedOrders)
    }

    // If no data in localStorage, return empty array
    return []
  }

  // Online mode - fetch from API
  const response = await fetch(`${API_BASE_URL}/fuel-orders`, {
    method: "GET",
    headers: getAuthHeaders(),
  })

  return handleApiResponse<FuelOrder[]>(response)
}

// Get fuel order by ID
export async function getFuelOrder(id: number): Promise<FuelOrder> {
  if (isOfflineMode()) {
    // Get from localStorage
    const storedOrders = localStorage.getItem("fboFuelOrders")
    if (!storedOrders) {
      throw new Error("Fuel order not found")
    }

    const orders = JSON.parse(storedOrders) as FuelOrder[]
    const order = orders.find((o) => o.id === id)

    if (!order) {
      throw new Error("Fuel order not found")
    }

    return order
  }

  // Online mode - fetch from API
  const response = await fetch(`${API_BASE_URL}/fuel-orders/${id}`, {
    method: "GET",
    headers: getAuthHeaders(),
  })

  return handleApiResponse<FuelOrder>(response)
}

// Create a new fuel order
export async function createFuelOrder(orderData: CreateFuelOrderRequest): Promise<FuelOrder> {
  if (isOfflineMode()) {
    // Create in localStorage
    const newOrder: FuelOrder = {
      ...orderData,
      id: Date.now(),
      status: "PENDING",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    // Calculate fees
    try {
      const fees = await calculateFees({
        aircraftId: orderData.aircraft_id.toString(),
        customerId: orderData.customer_id.toString(),
        fuelType: orderData.fuel_type,
        quantity: Number.parseFloat(orderData.quantity),
      })

      newOrder.fees = fees
    } catch (error) {
      console.error("Error calculating fees:", error)
      // Continue without fees if calculation fails
    }

    const storedOrders = localStorage.getItem("fboFuelOrders")
    const orders = storedOrders ? (JSON.parse(storedOrders) as FuelOrder[]) : []

    orders.push(newOrder)
    localStorage.setItem("fboFuelOrders", JSON.stringify(orders))

    return newOrder
  }

  // Online mode - create via API
  const response = await fetch(`${API_BASE_URL}/fuel-orders`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(orderData),
  })

  return handleApiResponse<FuelOrder>(response)
}

// Update a fuel order
export async function updateFuelOrder(id: number, updates: Partial<FuelOrder>): Promise<FuelOrder> {
  if (isOfflineMode()) {
    // Update in localStorage
    const storedOrders = localStorage.getItem("fboFuelOrders")
    if (!storedOrders) {
      throw new Error("Fuel order not found")
    }

    const orders = JSON.parse(storedOrders) as FuelOrder[]
    const index = orders.findIndex((o) => o.id === id)

    if (index === -1) {
      throw new Error("Fuel order not found")
    }

    const updatedOrder = {
      ...orders[index],
      ...updates,
      updated_at: new Date().toISOString(),
    }

    // If status is changing to COMPLETED, add completed_at timestamp
    if (updates.status === "COMPLETED" && orders[index].status !== "COMPLETED") {
      updatedOrder.completed_at = new Date().toISOString()

      // Recalculate fees if actual_quantity is provided
      if (updates.actual_quantity && updates.actual_quantity !== orders[index].quantity) {
        try {
          const fees = await calculateFees({
            aircraftId: updatedOrder.aircraft_id.toString(),
            customerId: updatedOrder.customer_id.toString(),
            fuelType: updatedOrder.fuel_type,
            quantity: Number.parseFloat(updates.actual_quantity),
          })

          updatedOrder.fees = fees
        } catch (error) {
          console.error("Error recalculating fees:", error)
          // Continue without updating fees if calculation fails
        }
      }
    }

    // If status is changing to REVIEWED, add reviewed_at timestamp
    if (updates.status === "REVIEWED" && orders[index].status !== "REVIEWED") {
      updatedOrder.reviewed_at = new Date().toISOString()
    }

    orders[index] = updatedOrder
    localStorage.setItem("fboFuelOrders", JSON.stringify(orders))

    return updatedOrder
  }

  // Online mode - update via API
  const response = await fetch(`${API_BASE_URL}/fuel-orders/${id}`, {
    method: "PUT",
    headers: getAuthHeaders(),
    body: JSON.stringify(updates),
  })

  return handleApiResponse<FuelOrder>(response)
}

// Review a fuel order
export async function reviewFuelOrder(id: number, reviewNotes: string): Promise<FuelOrder> {
  return updateFuelOrder(id, {
    status: "REVIEWED",
    review_notes: reviewNotes,
  })
}

// Delete a fuel order
export async function deleteFuelOrder(id: number): Promise<boolean> {
  if (isOfflineMode()) {
    // Delete from localStorage
    const storedOrders = localStorage.getItem("fboFuelOrders")
    if (!storedOrders) {
      return false
    }

    const orders = JSON.parse(storedOrders) as FuelOrder[]
    const updatedOrders = orders.filter((o) => o.id !== id)

    if (updatedOrders.length === orders.length) {
      return false // No order was removed
    }

    localStorage.setItem("fboFuelOrders", JSON.stringify(updatedOrders))
    return true
  }

  // Online mode - delete via API
  const response = await fetch(`${API_BASE_URL}/fuel-orders/${id}`, {
    method: "DELETE",
    headers: getAuthHeaders(),
  })

  return response.ok
}

// Filter fuel orders
export function filterFuelOrders(
  orders: FuelOrder[],
  startDate?: string,
  endDate?: string,
  status?: string,
): FuelOrder[] {
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
export function convertFuelOrdersToCSV(orders: FuelOrder[]): string {
  if (orders.length === 0) {
    return ""
  }

  // Define CSV headers
  const headers = [
    "ID",
    "Aircraft ID",
    "Customer ID",
    "Fuel Type",
    "Requested Quantity",
    "Actual Quantity",
    "Status",
    "Created At",
    "Completed At",
    "Reviewed At",
    "Notes",
    "Review Notes",
    "Subtotal",
    "Tax",
    "Total",
  ]

  // Create CSV content
  const csvContent = [
    headers.join(","),
    ...orders.map((order) =>
      [
        order.id,
        order.aircraft_id,
        order.customer_id,
        order.fuel_type,
        order.quantity,
        order.actual_quantity || "",
        order.status,
        order.created_at,
        order.completed_at || "",
        order.reviewed_at || "",
        order.notes ? `"${order.notes.replace(/"/g, '""')}"` : "",
        order.review_notes ? `"${order.review_notes.replace(/"/g, '""')}"` : "",
        order.fees?.subtotal || "",
        order.fees?.taxAmount || "",
        order.fees?.total || "",
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

// Get export URL
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
