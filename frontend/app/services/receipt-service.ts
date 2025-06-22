import { API_BASE_URL, getAuthHeaders, handleApiResponse } from "./api-config"
import { getCurrentUserFboId } from "./auth-service"

// Receipt Line Item - Matches backend ReceiptLineItemSchema exactly
export interface ReceiptLineItem {
  id: number
  receipt_id: number
  line_item_type: 'FUEL' | 'FEE' | 'WAIVER' | 'TAX' | 'DISCOUNT'
  description: string
  fee_code_applied?: string | null
  quantity: string  // String to handle Decimal serialization from backend
  unit_price: string  // String to handle Decimal serialization from backend
  amount: string  // String to handle Decimal serialization from backend
  created_at: string
  updated_at: string
}

// Receipt - Matches backend ReceiptSchema exactly
export interface Receipt {
  id: number
  receipt_number?: string | null
  fbo_location_id: number
  fuel_order_id?: number | null
  customer_id: number
  
  // Fuel order reference data
  fuel_order_tail_number?: string | null
  
  // Snapshot data
  aircraft_type_at_receipt_time?: string | null
  fuel_type_at_receipt_time?: string | null
  fuel_quantity_gallons_at_receipt_time?: string | null
  fuel_unit_price_at_receipt_time?: string | null
  
  // Calculated totals
  fuel_subtotal: string
  total_fees_amount: string
  total_waivers_amount: string
  tax_amount: string
  grand_total_amount: string
  
  // Status and metadata
  status: 'DRAFT' | 'GENERATED' | 'PAID' | 'VOID'
  is_caa_applied: boolean
  
  // Timestamps
  generated_at?: string | null
  paid_at?: string | null
  created_at: string
  updated_at: string
  
  // User tracking
  created_by_user_id: number
  updated_by_user_id: number
  
  // Optional nested line items
  line_items?: ReceiptLineItem[]
}

// Create Receipt Request
export interface CreateReceiptRequest {
  fuel_order_id: number
}

// Draft Update Payload
export interface DraftUpdatePayload {
  customer_id?: number
  aircraft_type?: string
  notes?: string
  additional_services?: Array<{
    fee_code: string
    quantity: number
  }>
}

// Extended Receipt interface with guaranteed line items
export interface ExtendedReceipt extends Receipt {
  line_items: ReceiptLineItem[]
}

// Mock receipt data for offline mode
const mockReceipts: Receipt[] = [
  {
    id: 1,
    receipt_number: "RCP-2024-001",
    fbo_location_id: 1,
    fuel_order_id: 1,
    customer_id: 1,
    fuel_subtotal: "2750.00",
    total_fees_amount: "100.00",
    total_waivers_amount: "0.00",
    tax_amount: "0.00",
    grand_total_amount: "2850.00",
    status: "PAID",
    is_caa_applied: false,
    created_at: "2024-01-15T10:30:00Z",
    updated_at: "2024-01-15T10:35:00Z",
    created_by_user_id: 1,
    updated_by_user_id: 1,
  },
  {
    id: 2,
    receipt_number: "RCP-2024-002",
    fbo_location_id: 1,
    fuel_order_id: 2,
    customer_id: 2,
    fuel_subtotal: "4125.00",
    total_fees_amount: "150.00",
    total_waivers_amount: "0.00",
    tax_amount: "0.00",
    grand_total_amount: "4275.00",
    status: "PAID",
    is_caa_applied: false,
    created_at: "2024-01-15T14:45:00Z",
    updated_at: "2024-01-15T14:50:00Z",
    created_by_user_id: 2,
    updated_by_user_id: 2,
  },
  {
    id: 3,
    receipt_number: "RCP-2024-003",
    fbo_location_id: 1,
    fuel_order_id: 3,
    customer_id: 3,
    fuel_subtotal: "1650.00",
    total_fees_amount: "75.00",
    total_waivers_amount: "0.00",
    tax_amount: "0.00",
    grand_total_amount: "1725.00",
    status: "DRAFT",
    is_caa_applied: false,
    created_at: "2024-01-16T09:15:00Z",
    updated_at: "2024-01-16T09:15:00Z",
    created_by_user_id: 3,
    updated_by_user_id: 3,
  },
  {
    id: 4,
    receipt_number: "RCP-2024-004",
    fbo_location_id: 1,
    fuel_order_id: 4,
    customer_id: 4,
    fuel_subtotal: "2475.00",
    total_fees_amount: "125.00",
    total_waivers_amount: "0.00",
    tax_amount: "0.00",
    grand_total_amount: "2600.00",
    status: "PAID",
    is_caa_applied: false,
    created_at: "2024-01-16T11:20:00Z",
    updated_at: "2024-01-16T11:25:00Z",
    created_by_user_id: 4,
    updated_by_user_id: 4,
  },
  {
    id: 5,
    receipt_number: "RCP-2024-005",
    fbo_location_id: 1,
    fuel_order_id: 5,
    customer_id: 5,
    fuel_subtotal: "3300.00",
    total_fees_amount: "200.00",
    total_waivers_amount: "0.00",
    tax_amount: "0.00",
    grand_total_amount: "3500.00",
    status: "VOID",
    is_caa_applied: false,
    created_at: "2024-01-17T08:30:00Z",
    updated_at: "2024-01-17T16:45:00Z",
    created_by_user_id: 5,
    updated_by_user_id: 5,
  },
  {
    id: 6,
    receipt_number: "RCP-2024-006",
    fbo_location_id: 1,
    fuel_order_id: 6,
    customer_id: 6,
    fuel_subtotal: "2200.00",
    total_fees_amount: "100.00",
    total_waivers_amount: "0.00",
    tax_amount: "0.00",
    grand_total_amount: "2300.00",
    status: "PAID",
    is_caa_applied: false,
    created_at: "2024-01-17T13:15:00Z",
    updated_at: "2024-01-17T13:20:00Z",
    created_by_user_id: 6,
    updated_by_user_id: 6,
  },
  {
    id: 7,
    receipt_number: "RCP-2024-007",
    fbo_location_id: 1,
    fuel_order_id: 7,
    customer_id: 7,
    fuel_subtotal: "1925.00",
    total_fees_amount: "75.00",
    total_waivers_amount: "0.00",
    tax_amount: "0.00",
    grand_total_amount: "2000.00",
    status: "DRAFT",
    is_caa_applied: false,
    created_at: "2024-01-18T10:45:00Z",
    updated_at: "2024-01-18T10:45:00Z",
    created_by_user_id: 7,
    updated_by_user_id: 7,
  },
  {
    id: 8,
    receipt_number: "RCP-2024-008",
    fbo_location_id: 1,
    fuel_order_id: 8,
    customer_id: 8,
    fuel_subtotal: "1512.50",
    total_fees_amount: "50.00",
    total_waivers_amount: "0.00",
    tax_amount: "0.00",
    grand_total_amount: "1562.50",
    status: "PAID",
    is_caa_applied: false,
    created_at: "2024-01-18T15:30:00Z",
    updated_at: "2024-01-18T15:35:00Z",
    created_by_user_id: 8,
    updated_by_user_id: 8,
  },
]

// Mock line items for testing
const mockLineItems: ReceiptLineItem[] = [
  {
    id: 1,
    receipt_id: 1,
    line_item_type: 'FUEL',
    description: 'Jet A Fuel',
    quantity: '500',
    unit_price: '5.50',
    amount: '2750.00',
    created_at: "2024-01-15T10:30:00Z",
    updated_at: "2024-01-15T10:35:00Z",
  },
  {
    id: 2,
    receipt_id: 1,
    line_item_type: 'FEE',
    description: 'Ramp Fee',
    fee_code_applied: 'RAMP_FEE',
    quantity: '1',
    unit_price: '100.00',
    amount: '100.00',
    created_at: "2024-01-15T10:30:00Z",
    updated_at: "2024-01-15T10:35:00Z",
  }
]

// Initialize localStorage with mock data if not present
function initializeMockData() {
  if (!localStorage.getItem("fboReceipts")) {
    localStorage.setItem("fboReceipts", JSON.stringify(mockReceipts))
  }
}

// Receipt list filters interface for API
export interface ReceiptListFilters {
  status?: string
  customer_id?: number
  date_from?: string
  date_to?: string
  page?: number
  per_page?: number
}

// Receipt list response interface matching backend
export interface ReceiptListResponse {
  receipts: Receipt[]
  total: number
  page: number
  per_page: number
  total_pages: number
}

// Get receipts with server-side filtering and pagination
export async function getReceipts(filters?: ReceiptListFilters): Promise<ReceiptListResponse> {
  const fboId = getCurrentUserFboId();
  
  // Build query string from filters
  const queryParams = new URLSearchParams()
  if (filters?.status && filters.status !== 'all') {
    queryParams.append('status', filters.status)
  }
  if (filters?.customer_id) {
    queryParams.append('customer_id', filters.customer_id.toString())
  }
  if (filters?.date_from) {
    queryParams.append('date_from', filters.date_from)
  }
  if (filters?.date_to) {
    queryParams.append('date_to', filters.date_to)
  }
  if (filters?.page) {
    queryParams.append('page', filters.page.toString())
  }
  if (filters?.per_page) {
    queryParams.append('per_page', filters.per_page.toString())
  }
  
  const url = `${API_BASE_URL}/fbo/${fboId}/receipts${queryParams.toString() ? '?' + queryParams.toString() : ''}`
  const response = await fetch(url, {
    method: "GET",
    headers: getAuthHeaders(),
  })

  const data = await handleApiResponse<ReceiptListResponse>(response)
  return data
}

// Get recent receipts for dashboard display (limited to most recent ones)
export async function getRecentReceipts(limit: number = 5): Promise<Receipt[]> {
  const fboId = getCurrentUserFboId();
  const response = await fetch(`${API_BASE_URL}/fbo/${fboId}/receipts?per_page=${limit}&page=1`, {
    method: "GET",
    headers: getAuthHeaders(),
  })

  const data = await handleApiResponse<{ receipts: Receipt[], total: number, page: number, per_page: number }>(response)
  
  // Return just the receipts array, already sorted by most recent from backend
  return data.receipts || []
}

// Get receipt by ID (alias for Plan 5 compatibility)
export async function getReceiptById(id: number): Promise<ExtendedReceipt> {
  const fboId = getCurrentUserFboId();

  const response = await fetch(`${API_BASE_URL}/fbo/${fboId}/receipts/${id}`, {
    headers: getAuthHeaders(),
  });

  // The backend returns { receipt: {...} }
  const data = await handleApiResponse<{ receipt: ExtendedReceipt }>(response);
  
  return data.receipt;
}

// Get receipt by ID
export async function getReceipt(id: number): Promise<Receipt> {
  initializeMockData()
  const storedReceipts = localStorage.getItem("fboReceipts")
  if (!storedReceipts) {
    throw new Error("Receipt not found")
  }

  const receipts = JSON.parse(storedReceipts) as Receipt[]
  const receipt = receipts.find((r) => r.id === id)

  if (!receipt) {
    throw new Error("Receipt not found")
  }

  return receipt
}

// Create a new receipt
export async function createReceipt(receiptData: CreateReceiptRequest): Promise<Receipt> {
  initializeMockData()
  const newReceipt: Receipt = {
    ...receiptData,
    id: Date.now(),
    receipt_number: `RCP-${new Date().getFullYear()}-${String(Date.now()).slice(-3)}`,
    status: "DRAFT",
    created_at: new Date().toISOString(),
    created_by_user_id: 1,
    updated_by_user_id: 1,
    fbo_location_id: 0,
    customer_id: 0,
    fuel_subtotal: "",
    total_fees_amount: "",
    total_waivers_amount: "",
    tax_amount: "",
    grand_total_amount: "",
    is_caa_applied: false,
    updated_at: ""
  }

  const storedReceipts = localStorage.getItem("fboReceipts")
  const receipts = storedReceipts ? (JSON.parse(storedReceipts) as Receipt[]) : []

  receipts.push(newReceipt)
  localStorage.setItem("fboReceipts", JSON.stringify(receipts))

  return newReceipt
}

// Update a receipt
export async function updateReceipt(id: number, updates: Partial<Receipt>): Promise<Receipt> {
  initializeMockData()
  const storedReceipts = localStorage.getItem("fboReceipts")
  if (!storedReceipts) {
    throw new Error("Receipt not found")
  }

  const receipts = JSON.parse(storedReceipts) as Receipt[]
  const index = receipts.findIndex((r) => r.id === id)

  if (index === -1) {
    throw new Error("Receipt not found")
  }

  const updatedReceipt = {
    ...receipts[index],
    ...updates,
    updated_at: new Date().toISOString(),
  }

  // If status is changing to GENERATED, add generated timestamp
  if (updates.status === "GENERATED" && receipts[index].status !== "GENERATED") {
    updatedReceipt.generated_at = new Date().toISOString()
  }

  receipts[index] = updatedReceipt
  localStorage.setItem("fboReceipts", JSON.stringify(receipts))

  return updatedReceipt
}

// Delete a receipt
export async function deleteReceipt(id: number): Promise<boolean> {
  initializeMockData()
  const storedReceipts = localStorage.getItem("fboReceipts")
  if (!storedReceipts) {
    return false
  }

  const receipts = JSON.parse(storedReceipts) as Receipt[]
  const updatedReceipts = receipts.filter((r) => r.id !== id)

  if (updatedReceipts.length === receipts.length) {
    return false // No receipt was removed
  }

  localStorage.setItem("fboReceipts", JSON.stringify(updatedReceipts))
  return true
}

// Filter receipts
export function filterReceipts(
  receipts: Receipt[],
  searchTerm?: string,
  startDate?: string,
  endDate?: string,
  status?: string,
  paymentMethod?: string,
): Receipt[] {
  return receipts.filter((receipt) => {
    // Search term filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase()
      const matchesSearch =
        receipt.receipt_number?.toLowerCase().includes(searchLower) ||
        receipt.fuel_quantity_gallons_at_receipt_time?.toLowerCase().includes(searchLower) ||
        receipt.fuel_type_at_receipt_time?.toLowerCase().includes(searchLower) ||
        receipt.customer_id.toString().includes(searchLower) ||
        receipt.created_by_user_id.toString().includes(searchLower) ||
        receipt.fbo_location_id.toString().includes(searchLower)

      if (!matchesSearch) {
        return false
      }
    }

    // Filter by start date
    if (startDate && new Date(receipt.created_at) < new Date(startDate)) {
      return false
    }

    // Filter by end date
    if (endDate) {
      const endDateTime = new Date(endDate)
      endDateTime.setHours(23, 59, 59, 999) // End of the day
      if (new Date(receipt.created_at) > endDateTime) {
        return false
      }
    }

    // Filter by status
    if (status && status !== "ALL" && receipt.status !== status) {
      return false
    }

    // Filter by payment method
    if (paymentMethod && paymentMethod !== "ALL" && receipt.fuel_type_at_receipt_time !== paymentMethod) {
      return false
    }

    return true
  })
}

// Sort receipts
export function sortReceipts(receipts: Receipt[], sortBy: string, sortOrder: "asc" | "desc"): Receipt[] {
  return [...receipts].sort((a, b) => {
    let aValue: any
    let bValue: any

    switch (sortBy) {
      case "receipt_number":
        aValue = a.receipt_number
        bValue = b.receipt_number
        break
      case "customer_id":
        aValue = a.customer_id
        bValue = b.customer_id
        break
      case "fuel_quantity_gallons_at_receipt_time":
        aValue = a.fuel_quantity_gallons_at_receipt_time
        bValue = b.fuel_quantity_gallons_at_receipt_time
        break
      case "fuel_type_at_receipt_time":
        aValue = a.fuel_type_at_receipt_time
        bValue = b.fuel_type_at_receipt_time
        break
      case "created_at":
        aValue = new Date(a.created_at)
        bValue = new Date(b.created_at)
        break
      case "fbo_location_id":
        aValue = a.fbo_location_id
        bValue = b.fbo_location_id
        break
      case "status":
        aValue = a.status
        bValue = b.status
        break
      default:
        aValue = a.id
        bValue = b.id
    }

    if (aValue < bValue) {
      return sortOrder === "asc" ? -1 : 1
    }
    if (aValue > bValue) {
      return sortOrder === "asc" ? 1 : -1
    }
    return 0
  })
}

// Convert receipts to CSV
export function convertReceiptsToCSV(receipts: Receipt[]): string {
  if (receipts.length === 0) {
    return ""
  }

  // Define CSV headers
  const headers = [
    "Receipt ID",
    "Receipt Number",
    "Fuel Order ID",
    "Fuel Quantity (Gallons)",
    "Fuel Type",
    "Customer ID",
    "FBO Location ID",
    "Created At",
    "Updated At",
  ]

  // Create CSV content
  const csvContent = [
    headers.join(","),
    ...receipts.map((receipt) =>
      [
        receipt.id,
        receipt.receipt_number,
        receipt.fuel_order_id,
        receipt.fuel_quantity_gallons_at_receipt_time,
        receipt.fuel_type_at_receipt_time,
        receipt.customer_id,
        receipt.fbo_location_id,
        receipt.created_at,
        receipt.updated_at || "",
      ].join(","),
    ),
  ].join("\n")

  return csvContent
}

// Download CSV
export function downloadReceiptsCSV(csvContent: string, filename: string): void {
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

// Get receipt statistics
export function getReceiptStatistics(receipts: Receipt[]) {
  const stats: {
    total: number;
    paid: number;
    draft: number;
    generated: number;
    void: number;
    totalAmount: number;
  } = {
    total: receipts.length,
    paid: receipts.filter((r) => r.status === "PAID").length,
    draft: receipts.filter((r) => r.status === "DRAFT").length,
    generated: receipts.filter((r) => r.status === "GENERATED").length,
    void: receipts.filter((r) => r.status === "VOID").length,
    totalAmount: receipts.reduce((sum, r) => sum + parseFloat(r.grand_total_amount), 0),
    // No "REFUNDED" status exists, so remove refunded/totalRefunded
  };

  return stats;
}

// Plan 5: New functions for receipt generation and editing workflow

// Create draft receipt from fuel order
export async function createDraftReceipt(fuel_order_id: number): Promise<ExtendedReceipt> {
  const fboId = getCurrentUserFboId();

  const response = await fetch(`${API_BASE_URL}/fbo/${fboId}/receipts/draft`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ fuel_order_id }),
  });

  const data = await handleApiResponse<{ receipt: ExtendedReceipt }>(response);
  return data.receipt;
}

// Update draft receipt
export async function updateDraftReceipt(receiptId: number, updateData: DraftUpdatePayload): Promise<ExtendedReceipt> {
  const fboId = getCurrentUserFboId();

  const response = await fetch(`${API_BASE_URL}/fbo/${fboId}/receipts/${receiptId}/draft`, {
    method: "PUT",
    headers: getAuthHeaders(),
    body: JSON.stringify(updateData),
  })

  const data = await handleApiResponse<{ receipt: ExtendedReceipt }>(response)
  return data.receipt
}

// Calculate fees for receipt
export async function calculateFeesForReceipt(receiptId: number, additionalServices?: Array<{ fee_code: string, quantity: number }>): Promise<ExtendedReceipt> {
  const fboId = getCurrentUserFboId();

  const response = await fetch(`${API_BASE_URL}/fbo/${fboId}/receipts/${receiptId}/calculate-fees`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify({ additional_services: additionalServices || [] }),
  })

  const data = await handleApiResponse<{ receipt: ExtendedReceipt }>(response)
  return data.receipt
}

// Generate final receipt
export async function generateFinalReceipt(receiptId: number): Promise<ExtendedReceipt> {
  const fboId = getCurrentUserFboId();

  const response = await fetch(`${API_BASE_URL}/fbo/${fboId}/receipts/${receiptId}/generate`, {
    method: "POST",
    headers: getAuthHeaders(),
  })

  const data = await handleApiResponse<{ receipt: ExtendedReceipt }>(response)
  return data.receipt
}

// Mark receipt as paid
export async function markReceiptAsPaid(receiptId: number): Promise<ExtendedReceipt> {
  const fboId = getCurrentUserFboId();

  const response = await fetch(`${API_BASE_URL}/fbo/${fboId}/receipts/${receiptId}/mark-paid`, {
    method: "POST",
    headers: getAuthHeaders(),
  })

  const data = await handleApiResponse<{ receipt: ExtendedReceipt }>(response)
  return data.receipt
}

// Void receipt
export async function voidReceipt(receiptId: number, reason?: string): Promise<Receipt> {
  const fboId = getCurrentUserFboId();
  const response = await fetch(`${API_BASE_URL}/fbo/${fboId}/receipts/${receiptId}/void`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ reason }),
  })

  const data = await handleApiResponse<{ receipt: Receipt }>(response)
  return data.receipt
}
