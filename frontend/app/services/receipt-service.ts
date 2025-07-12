import { API_BASE_URL, getAuthHeaders, handleApiResponse } from "./api-config"

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
  is_manually_waivable?: boolean  // Whether this line item can be manually waived
  waiver_source?: 'AUTOMATIC' | 'MANUAL' | null  // Source of waiver (only for WAIVER line items)
  created_at: string
  updated_at: string
}

// Receipt - Matches backend ReceiptSchema exactly
export interface Receipt {
  id: number
  receipt_number?: string | null
  fuel_order_id?: number | null
  customer_id: number
  
  // Fuel order reference data
  fuel_order_tail_number?: string | null

  // Customer reference data
  customer_name?: string | null
  
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

  // Notes
  notes?: string | null
  
  // Optional nested line items
  line_items?: ReceiptLineItem[]
}

// Create Receipt Request
export interface CreateReceiptRequest {
  fuel_order_id: number;
}

// Draft Update Payload - Aligned with backend UpdateDraftReceiptSchema
export interface DraftUpdatePayload {
  customer_id?: number;
  aircraft_type_at_receipt_time?: string;
  notes?: string;
  fuel_type_at_receipt_time?: string;
  fuel_quantity_gallons_at_receipt_time?: number;
  fuel_unit_price_at_receipt_time?: number;
  additional_services?: Array<{
    fee_code: string;
    quantity: number;
  }>;
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
    fuel_order_id: 7,
    customer_id: 7,
    fuel_subtotal: "1925.00",
    total_fees_amount: "75.00",
    total_waivers_amount: "0.00",
    tax_amount: "0.00",
    grand_total_amount: "2000.00",
    status: "DRAFT",
    is_caa_applied: false,
    created_at: "2024-01-17T15:45:00Z",
    updated_at: "2024-01-17T15:45:00Z",
    created_by_user_id: 7,
    updated_by_user_id: 7,
  },
  {
    id: 8,
    receipt_number: "RCP-2024-008",
    fuel_order_id: 8,
    customer_id: 8,
    fuel_subtotal: "3850.00",
    total_fees_amount: "175.00",
    total_waivers_amount: "0.00",
    tax_amount: "0.00",
    grand_total_amount: "4025.00",
    status: "PAID",
    is_caa_applied: false,
    created_at: "2024-01-18T09:30:00Z",
    updated_at: "2024-01-18T09:35:00Z",
    created_by_user_id: 8,
    updated_by_user_id: 8,
  },
  {
    id: 9,
    receipt_number: "RCP-2024-009",
    fuel_order_id: 9,
    customer_id: 9,
    fuel_subtotal: "2640.00",
    total_fees_amount: "125.00",
    total_waivers_amount: "0.00",
    tax_amount: "0.00",
    grand_total_amount: "2765.00",
    status: "PAID",
    is_caa_applied: false,
    created_at: "2024-01-18T12:15:00Z",
    updated_at: "2024-01-18T12:20:00Z",
    created_by_user_id: 9,
    updated_by_user_id: 9,
  },
  {
    id: 10,
    receipt_number: "RCP-2024-010",
    fuel_order_id: 10,
    customer_id: 10,
    fuel_subtotal: "1815.00",
    total_fees_amount: "100.00",
    total_waivers_amount: "0.00",
    tax_amount: "0.00",
    grand_total_amount: "1915.00",
    status: "GENERATED",
    is_caa_applied: false,
    created_at: "2024-01-19T08:00:00Z",
    updated_at: "2024-01-19T08:05:00Z",
    generated_at: "2024-01-19T08:05:00Z",
    created_by_user_id: 10,
    updated_by_user_id: 10,
  }
]

function initializeMockData() {
  if (typeof window !== 'undefined' && !localStorage.getItem("fboReceipts")) {
    localStorage.setItem("fboReceipts", JSON.stringify(mockReceipts))
  }
}

export interface ReceiptListFilters {
  status?: string
  customer_id?: number
  date_from?: string
  date_to?: string
  search?: string
  page?: number
  per_page?: number
}

export interface ReceiptListResponse {
  receipts: Receipt[]
  total: number
  page: number
  per_page: number
  total_pages: number
}

export async function getReceipts(filters?: ReceiptListFilters): Promise<ReceiptListResponse> {
  const queryParams: Record<string, string> = {}

  if (filters) {
    if (filters.status) queryParams.status = filters.status
    if (filters.customer_id) queryParams.customer_id = String(filters.customer_id)
    if (filters.date_from) queryParams.date_from = filters.date_from
    if (filters.date_to) queryParams.date_to = filters.date_to
    if (filters.search) queryParams.search = filters.search
    if (filters.page) queryParams.page = String(filters.page)
    if (filters.per_page) queryParams.per_page = String(filters.per_page)
  }

  const queryString = new URLSearchParams(queryParams).toString()
  
  try {
    const response = await fetch(`${API_BASE_URL}/receipts?${queryString}`, {
      method: 'GET',
      headers: getAuthHeaders(),
    })
    
    const data = await handleApiResponse<ReceiptListResponse>(response);

    // Ensure we return the expected structure even if the API returns just an array
    if (Array.isArray(data)) {
        return {
            receipts: data,
            total: data.length,
            page: 1,
            per_page: data.length,
            total_pages: 1
        };
    }

    return data;

  } catch (error) {
    console.error('Error fetching receipts:', error)
    // In case of a network or other fetch error, return a default response
    return {
      receipts: [],
      total: 0,
      page: 1,
      per_page: filters?.per_page || 10,
      total_pages: 0,
    }
  }
}

// Get recent receipts for dashboard display (limited to most recent ones)
export async function getRecentReceipts(limit: number = 5): Promise<Receipt[]> {
  const response = await fetch(`${API_BASE_URL}/receipts?per_page=${limit}&page=1`, {
    method: "GET",
    headers: getAuthHeaders(),
  })

  const data = await handleApiResponse<{ receipts: Receipt[], total: number, page: number, per_page: number }>(response)
  
  // Return just the receipts array, already sorted by most recent from backend
  return data.receipts || []
}

// Get receipt by ID (alias for Plan 5 compatibility)
export async function getReceiptById(id: number): Promise<ExtendedReceipt> {
  const response = await fetch(`${API_BASE_URL}/receipts/${id}`, {
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
        receipt.created_by_user_id.toString().includes(searchLower)

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
      endDateTime.setHours(23, 59, 59, 999) // Set to end of day
      if (new Date(receipt.created_at) > endDateTime) {
        return false
      }
    }

    // Filter by status
    if (status && status !== "all" && receipt.status !== status) {
      return false
    }

    return true
  })
}

// Sort receipts
export function sortReceipts(receipts: Receipt[], sortBy: string, sortOrder: "asc" | "desc"): Receipt[] {
  return [...receipts].sort((a, b) => {
    let aValue: any = a[sortBy as keyof Receipt]
    let bValue: any = b[sortBy as keyof Receipt]

    // Handle different data types
    if (sortBy === "created_at" || sortBy === "updated_at" || sortBy === "generated_at" || sortBy === "paid_at") {
      aValue = new Date(aValue || 0).getTime()
      bValue = new Date(bValue || 0).getTime()
    } else if (typeof aValue === "string") {
      aValue = aValue.toLowerCase()
      bValue = (bValue || "").toLowerCase()
    } else if (typeof aValue === "number") {
      aValue = aValue || 0
      bValue = bValue || 0
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
    return "No receipts to export"
  }

  const headers = [
    "Receipt Number",
    "Status",
    "Customer ID",
    "Fuel Order ID",
    "Aircraft Type",
    "Fuel Type", 
    "Fuel Quantity (Gallons)",
    "Fuel Unit Price",
    "Fuel Subtotal",
    "Total Fees",
    "Total Waivers",
    "Tax Amount",
    "Grand Total",
    "CAA Applied",
    "Created At",
    "Updated At",
    "Generated At",
    "Paid At",
    "Created By User ID",
    "Updated By User ID"
  ]

  const csvContent = [
    headers.join(","),
    ...receipts.map((receipt) =>
      [
        `"${receipt.receipt_number || ""}"`,
        `"${receipt.status}"`,
        receipt.customer_id,
        receipt.fuel_order_id || "",
        `"${receipt.aircraft_type_at_receipt_time || ""}"`,
        `"${receipt.fuel_type_at_receipt_time || ""}"`,
        `"${receipt.fuel_quantity_gallons_at_receipt_time || ""}"`,
        `"${receipt.fuel_unit_price_at_receipt_time || ""}"`,
        `"${receipt.fuel_subtotal}"`,
        `"${receipt.total_fees_amount}"`,
        `"${receipt.total_waivers_amount}"`,
        `"${receipt.tax_amount}"`,
        `"${receipt.grand_total_amount}"`,
        receipt.is_caa_applied,
        `"${receipt.created_at}"`,
        `"${receipt.updated_at}"`,
        `"${receipt.generated_at || ""}"`,
        `"${receipt.paid_at || ""}"`,
        receipt.created_by_user_id,
        receipt.updated_by_user_id
      ].join(",")
    )
  ].join("\n")

  return csvContent
}

// Download CSV file
export function downloadReceiptsCSV(csvContent: string, filename: string): void {
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
  const link = document.createElement("a")
  const url = URL.createObjectURL(blob)
  link.setAttribute("href", url)
  link.setAttribute("download", filename)
  link.style.visibility = "hidden"
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

// Get receipt statistics
export function getReceiptStatistics(receipts: Receipt[]) {
  const totalReceipts = receipts.length
  const totalRevenue = receipts.reduce((sum, receipt) => {
    const amount = parseFloat(receipt.grand_total_amount || "0")
    return sum + amount
  }, 0)

  const statusCounts = receipts.reduce((counts, receipt) => {
    counts[receipt.status] = (counts[receipt.status] || 0) + 1
    return counts
  }, {} as Record<string, number>)

  const averageReceiptValue = totalReceipts > 0 ? totalRevenue / totalReceipts : 0

  return {
    totalReceipts,
    totalRevenue,
    averageReceiptValue,
    statusCounts
  }
}

// Create draft receipt from fuel order
export async function createDraftReceipt(fuel_order_id: number): Promise<ExtendedReceipt> {
  const response = await fetch(`${API_BASE_URL}/receipts/draft`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify({ fuel_order_id })
  })

  const data = await handleApiResponse<{ receipt: ExtendedReceipt }>(response)
  return data.receipt
}

// Create unassigned draft receipt for manual entry
export async function createUnassignedDraftReceipt(): Promise<Receipt> {
  const response = await fetch(`${API_BASE_URL}/receipts/manual-draft-unassigned`, {
    method: "POST",
    headers: getAuthHeaders(),
  })

  const data = await handleApiResponse<{ receipt: Receipt }>(response)
  return data.receipt
}

// Update draft receipt
export async function updateDraftReceipt(receiptId: number, updateData: DraftUpdatePayload): Promise<ExtendedReceipt> {
  const response = await fetch(`${API_BASE_URL}/receipts/${receiptId}/draft`, {
    method: "PUT",
    headers: getAuthHeaders(),
    body: JSON.stringify(updateData)
  })

  const data = await handleApiResponse<{ receipt: ExtendedReceipt }>(response)
  return data.receipt
}

// Calculate fees for receipt
export async function calculateFeesForReceipt(receiptId: number, additionalServices?: Array<{ fee_code: string, quantity: number }>): Promise<ExtendedReceipt> {
  const response = await fetch(`${API_BASE_URL}/receipts/${receiptId}/calculate-fees`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify({ additional_services: additionalServices })
  })

  const data = await handleApiResponse<{ receipt: ExtendedReceipt }>(response)
  return data.receipt
}

// Generate final receipt
export async function generateFinalReceipt(receiptId: number): Promise<ExtendedReceipt> {
  const response = await fetch(`${API_BASE_URL}/receipts/${receiptId}/generate`, {
    method: "POST",
    headers: getAuthHeaders()
  })

  const data = await handleApiResponse<{ receipt: ExtendedReceipt }>(response)
  return data.receipt
}

// Mark receipt as paid
export async function markReceiptAsPaid(receiptId: number): Promise<ExtendedReceipt> {
  const response = await fetch(`${API_BASE_URL}/receipts/${receiptId}/mark-paid`, {
    method: "POST",
    headers: getAuthHeaders()
  })

  const data = await handleApiResponse<{ receipt: ExtendedReceipt }>(response)
  return data.receipt
}

// Void receipt
export async function voidReceipt(receiptId: number, reason?: string): Promise<Receipt> {
  const response = await fetch(`${API_BASE_URL}/receipts/${receiptId}/void`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify({ reason })
  })

  const data = await handleApiResponse<{ receipt: Receipt }>(response)
  return data.receipt
}

// Toggle line item waiver
export async function toggleLineItemWaiver(receiptId: number, lineItemId: number): Promise<ExtendedReceipt> {
  const response = await fetch(`${API_BASE_URL}/receipts/${receiptId}/line-items/${lineItemId}/toggle-waiver`, {
    method: "POST",
    headers: getAuthHeaders()
  })

  const data = await handleApiResponse<{ receipt: ExtendedReceipt }>(response)
  return data.receipt
}
