import { API_BASE_URL, getAuthHeaders, handleApiResponse } from "./api-config"
import { getCurrentUserFboId } from "./auth-service"
import { isOfflineMode } from "./utils"

// Receipt model - Updated for Plan 5 requirements
export interface Receipt {
  id: number
  receiptNumber: string
  fuelOrderId: number
  customerId?: number
  tailNumber: string
  customer: string
  fuelType: string
  quantity: number
  amount: number
  paymentMethod: string
  status: 'DRAFT' | 'GENERATED' | 'PAID' | 'VOID' | 'PENDING' | 'REFUNDED'
  createdAt: string
  updatedAt?: string
  generatedAt?: string
  paidAt?: string
  fuelerName: string
  location: string
  notes?: string
  refundAmount?: number
  refundReason?: string
  refundedAt?: string
  
  // New fields for Plan 5
  aircraftTypeAtReceiptTime?: string
  fuelTypeAtReceiptTime?: string
  fuelQuantityGallonsAtReceiptTime?: number
  fuelUnitPriceAtReceiptTime?: number
  fuelSubtotal?: number
  totalFeesAmount?: number
  totalWaiversAmount?: number
  taxAmount?: number
  grandTotalAmount?: number
  isCaaApplied?: boolean
  createdByUserId?: number
  updatedByUserId?: number
}

// Receipt Line Item
export interface ReceiptLineItem {
  id: number
  receiptId: number
  lineItemType: 'FUEL' | 'FEE' | 'WAIVER' | 'TAX' | 'DISCOUNT'
  description: string
  feeCodeApplied?: string
  quantity: number
  unitPrice: number
  amount: number
}

// Create Receipt Request
export interface CreateReceiptRequest {
  fuelOrderId: number
  tailNumber: string
  customer: string
  fuelType: string
  quantity: number
  amount: number
  paymentMethod: string
  fuelerName: string
  location: string
  notes?: string
}

// Draft Update Payload for Plan 5
export interface DraftUpdatePayload {
  customerId?: number
  aircraftType?: string
  notes?: string
  [key: string]: any
}

// Extended Receipt interface for Plan 5 with line items
export interface ExtendedReceipt extends Receipt {
  lineItems: ReceiptLineItem[]
}

// Mock receipt data for offline mode
const mockReceipts: Receipt[] = [
  {
    id: 1,
    receiptNumber: "RCP-2024-001",
    fuelOrderId: 1,
    tailNumber: "N123AB",
    customer: "Delta Airlines",
    fuelType: "Jet A",
    quantity: 500,
    amount: 2750.0,
    paymentMethod: "Corporate Account",
    status: "PAID",
    createdAt: "2024-01-15T10:30:00Z",
    updatedAt: "2024-01-15T10:35:00Z",
    fuelerName: "Mike Johnson",
    location: "Gate A1",
    notes: "Standard refueling operation",
  },
  {
    id: 2,
    receiptNumber: "RCP-2024-002",
    fuelOrderId: 2,
    tailNumber: "N456CD",
    customer: "United Airlines",
    fuelType: "Jet A",
    quantity: 750,
    amount: 4125.0,
    paymentMethod: "Credit Card",
    status: "PAID",
    createdAt: "2024-01-15T14:45:00Z",
    updatedAt: "2024-01-15T14:50:00Z",
    fuelerName: "Sarah Wilson",
    location: "Gate B3",
    notes: "Priority refueling",
  },
  {
    id: 3,
    receiptNumber: "RCP-2024-003",
    fuelOrderId: 3,
    tailNumber: "N789EF",
    customer: "American Airlines",
    fuelType: "Jet A",
    quantity: 300,
    amount: 1650.0,
    paymentMethod: "Corporate Account",
    status: "PENDING",
    createdAt: "2024-01-16T09:15:00Z",
    fuelerName: "Tom Davis",
    location: "Gate C2",
  },
  {
    id: 4,
    receiptNumber: "RCP-2024-004",
    fuelOrderId: 4,
    tailNumber: "N321GH",
    customer: "Southwest Airlines",
    fuelType: "Jet A",
    quantity: 450,
    amount: 2475.0,
    paymentMethod: "Credit Card",
    status: "PAID",
    createdAt: "2024-01-16T11:20:00Z",
    updatedAt: "2024-01-16T11:25:00Z",
    fuelerName: "Lisa Chen",
    location: "Gate D1",
    notes: "Quick turnaround required",
  },
  {
    id: 5,
    receiptNumber: "RCP-2024-005",
    fuelOrderId: 5,
    tailNumber: "N654IJ",
    customer: "JetBlue Airways",
    fuelType: "Jet A",
    quantity: 600,
    amount: 3300.0,
    paymentMethod: "Corporate Account",
    status: "REFUNDED",
    createdAt: "2024-01-17T08:30:00Z",
    updatedAt: "2024-01-17T16:45:00Z",
    fuelerName: "Mark Rodriguez",
    location: "Gate E2",
    refundAmount: 3300.0,
    refundReason: "Flight cancelled",
    refundedAt: "2024-01-17T16:45:00Z",
  },
  {
    id: 6,
    receiptNumber: "RCP-2024-006",
    fuelOrderId: 6,
    tailNumber: "N987KL",
    customer: "Alaska Airlines",
    fuelType: "Jet A",
    quantity: 400,
    amount: 2200.0,
    paymentMethod: "Cash",
    status: "PAID",
    createdAt: "2024-01-17T13:15:00Z",
    updatedAt: "2024-01-17T13:20:00Z",
    fuelerName: "Jennifer Park",
    location: "Gate F3",
  },
  {
    id: 7,
    receiptNumber: "RCP-2024-007",
    fuelOrderId: 7,
    tailNumber: "N147MN",
    customer: "Frontier Airlines",
    fuelType: "Jet A",
    quantity: 350,
    amount: 1925.0,
    paymentMethod: "Check",
    status: "PENDING",
    createdAt: "2024-01-18T10:45:00Z",
    fuelerName: "David Kim",
    location: "Gate G1",
    notes: "Waiting for check clearance",
  },
  {
    id: 8,
    receiptNumber: "RCP-2024-008",
    fuelOrderId: 8,
    tailNumber: "N258OP",
    customer: "Spirit Airlines",
    fuelType: "Jet A",
    quantity: 275,
    amount: 1512.5,
    paymentMethod: "Credit Card",
    status: "PAID",
    createdAt: "2024-01-18T15:30:00Z",
    updatedAt: "2024-01-18T15:35:00Z",
    fuelerName: "Amanda Foster",
    location: "Gate H2",
  },
]

// Mock line items for testing
const mockLineItems: ReceiptLineItem[] = [
  {
    id: 1,
    receiptId: 1,
    lineItemType: 'FUEL',
    description: 'Jet A Fuel',
    quantity: 500,
    unitPrice: 5.50,
    amount: 2750.0
  },
  {
    id: 2,
    receiptId: 1,
    lineItemType: 'FEE',
    description: 'Ramp Fee',
    feeCodeApplied: 'RAMP_FEE',
    quantity: 1,
    unitPrice: 100.0,
    amount: 100.0
  }
]

// Initialize localStorage with mock data if not present
function initializeMockData() {
  if (isOfflineMode() && !localStorage.getItem("fboReceipts")) {
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
  if (isOfflineMode()) {
    initializeMockData()
    const storedReceipts = localStorage.getItem("fboReceipts")
    const allReceipts = storedReceipts ? JSON.parse(storedReceipts) : mockReceipts
    
    // Apply client-side filtering for offline mode
    let filteredReceipts = allReceipts
    
    if (filters?.status && filters.status !== 'all') {
      filteredReceipts = filteredReceipts.filter((r: Receipt) => r.status === filters.status)
    }
    
    if (filters?.date_from) {
      const fromDate = new Date(filters.date_from)
      filteredReceipts = filteredReceipts.filter((r: Receipt) => 
        new Date(r.createdAt) >= fromDate
      )
    }
    
    if (filters?.date_to) {
      const toDate = new Date(filters.date_to)
      filteredReceipts = filteredReceipts.filter((r: Receipt) => 
        new Date(r.createdAt) <= toDate
      )
    }
    
    // Apply pagination for offline mode
    const page = filters?.page || 1
    const perPage = filters?.per_page || 50
    const startIndex = (page - 1) * perPage
    const endIndex = startIndex + perPage
    const paginatedReceipts = filteredReceipts.slice(startIndex, endIndex)
    
    return {
      receipts: paginatedReceipts,
      total: filteredReceipts.length,
      page,
      per_page: perPage,
      total_pages: Math.ceil(filteredReceipts.length / perPage)
    }
  }

  // Online mode - use server-side filtering and pagination
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
  
  // Handle potential data type mismatches (Decimal as string -> number)
  if (data.receipts) {
    data.receipts = data.receipts.map(receipt => ({
      ...receipt,
      amount: typeof receipt.amount === 'string' ? parseFloat(receipt.amount) : receipt.amount,
      grandTotalAmount: typeof receipt.grandTotalAmount === 'string' ? 
        parseFloat(receipt.grandTotalAmount) : receipt.grandTotalAmount,
      fuelSubtotal: typeof receipt.fuelSubtotal === 'string' ? 
        parseFloat(receipt.fuelSubtotal) : receipt.fuelSubtotal,
      totalFeesAmount: typeof receipt.totalFeesAmount === 'string' ? 
        parseFloat(receipt.totalFeesAmount) : receipt.totalFeesAmount,
      totalWaiversAmount: typeof receipt.totalWaiversAmount === 'string' ? 
        parseFloat(receipt.totalWaiversAmount) : receipt.totalWaiversAmount,
      taxAmount: typeof receipt.taxAmount === 'string' ? 
        parseFloat(receipt.taxAmount) : receipt.taxAmount,
    }))
  }
  
  return data
}

// Get recent receipts for dashboard display (limited to most recent ones)
export async function getRecentReceipts(limit: number = 5): Promise<Receipt[]> {
  if (isOfflineMode()) {
    initializeMockData()
    const storedReceipts = localStorage.getItem("fboReceipts")
    const receipts = storedReceipts ? JSON.parse(storedReceipts) : mockReceipts
    
    // Sort by created date descending and limit
    return receipts
      .sort((a: Receipt, b: Receipt) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, limit)
  }

  // Online mode - fetch from API with pagination
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
  if (isOfflineMode()) {
    initializeMockData()
    const storedReceipts = localStorage.getItem("fboReceipts")
    const receipts = storedReceipts ? JSON.parse(storedReceipts) : mockReceipts
    
    const receipt = receipts.find((r: Receipt) => r.id === id)
    if (!receipt) {
      throw new Error("Receipt not found")
    }
    
    // Convert Receipt to ExtendedReceipt by adding mock line items
    const extendedReceipt: ExtendedReceipt = {
      ...receipt,
      lineItems: mockLineItems.filter(item => item.receiptId === id)
    }
    
    return extendedReceipt
  }

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
  if (isOfflineMode()) {
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

  // Online mode - fetch from API
  const response = await fetch(`${API_BASE_URL}/receipts/${id}`, {
    method: "GET",
    headers: getAuthHeaders(),
  })

  return handleApiResponse<Receipt>(response)
}

// Create a new receipt
export async function createReceipt(receiptData: CreateReceiptRequest): Promise<Receipt> {
  if (isOfflineMode()) {
    initializeMockData()
    const newReceipt: Receipt = {
      ...receiptData,
      id: Date.now(),
      receiptNumber: `RCP-${new Date().getFullYear()}-${String(Date.now()).slice(-3)}`,
      status: "PENDING",
      createdAt: new Date().toISOString(),
    }

    const storedReceipts = localStorage.getItem("fboReceipts")
    const receipts = storedReceipts ? (JSON.parse(storedReceipts) as Receipt[]) : []

    receipts.push(newReceipt)
    localStorage.setItem("fboReceipts", JSON.stringify(receipts))

    return newReceipt
  }

  // Online mode - create via API
  const response = await fetch(`${API_BASE_URL}/receipts`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(receiptData),
  })

  return handleApiResponse<Receipt>(response)
}

// Update a receipt
export async function updateReceipt(id: number, updates: Partial<Receipt>): Promise<Receipt> {
  if (isOfflineMode()) {
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
      updatedAt: new Date().toISOString(),
    }

    // If status is changing to REFUNDED, add refunded timestamp
    if (updates.status === "REFUNDED" && receipts[index].status !== "REFUNDED") {
      updatedReceipt.refundedAt = new Date().toISOString()
    }

    receipts[index] = updatedReceipt
    localStorage.setItem("fboReceipts", JSON.stringify(receipts))

    return updatedReceipt
  }

  // Online mode - update via API
  const response = await fetch(`${API_BASE_URL}/receipts/${id}`, {
    method: "PUT",
    headers: getAuthHeaders(),
    body: JSON.stringify(updates),
  })

  return handleApiResponse<Receipt>(response)
}

// Delete a receipt
export async function deleteReceipt(id: number): Promise<boolean> {
  if (isOfflineMode()) {
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

  // Online mode - delete via API
  const response = await fetch(`${API_BASE_URL}/receipts/${id}`, {
    method: "DELETE",
    headers: getAuthHeaders(),
  })

  return response.ok
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
        receipt.receiptNumber.toLowerCase().includes(searchLower) ||
        receipt.tailNumber.toLowerCase().includes(searchLower) ||
        receipt.customer.toLowerCase().includes(searchLower) ||
        receipt.fuelerName.toLowerCase().includes(searchLower) ||
        receipt.location.toLowerCase().includes(searchLower)

      if (!matchesSearch) {
        return false
      }
    }

    // Filter by start date
    if (startDate && new Date(receipt.createdAt) < new Date(startDate)) {
      return false
    }

    // Filter by end date
    if (endDate) {
      const endDateTime = new Date(endDate)
      endDateTime.setHours(23, 59, 59, 999) // End of the day
      if (new Date(receipt.createdAt) > endDateTime) {
        return false
      }
    }

    // Filter by status
    if (status && status !== "ALL" && receipt.status !== status) {
      return false
    }

    // Filter by payment method
    if (paymentMethod && paymentMethod !== "ALL" && receipt.paymentMethod !== paymentMethod) {
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
      case "receiptNumber":
        aValue = a.receiptNumber
        bValue = b.receiptNumber
        break
      case "customer":
        aValue = a.customer
        bValue = b.customer
        break
      case "amount":
        aValue = a.amount
        bValue = b.amount
        break
      case "createdAt":
        aValue = new Date(a.createdAt)
        bValue = new Date(b.createdAt)
        break
      case "tailNumber":
        aValue = a.tailNumber
        bValue = b.tailNumber
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
    "Tail Number",
    "Customer",
    "Fuel Type",
    "Quantity (Gallons)",
    "Amount",
    "Payment Method",
    "Status",
    "Created At",
    "Updated At",
    "Fueler Name",
    "Location",
    "Notes",
    "Refund Amount",
    "Refund Reason",
    "Refunded At",
  ]

  // Create CSV content
  const csvContent = [
    headers.join(","),
    ...receipts.map((receipt) =>
      [
        receipt.id,
        receipt.receiptNumber,
        receipt.fuelOrderId,
        receipt.tailNumber,
        receipt.customer,
        receipt.fuelType,
        receipt.quantity,
        receipt.amount,
        receipt.paymentMethod,
        receipt.status,
        receipt.createdAt,
        receipt.updatedAt || "",
        receipt.fuelerName,
        receipt.location,
        receipt.notes ? `"${receipt.notes.replace(/"/g, '""')}"` : "",
        receipt.refundAmount || "",
        receipt.refundReason ? `"${receipt.refundReason.replace(/"/g, '""')}"` : "",
        receipt.refundedAt || "",
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
  const stats = {
    total: receipts.length,
    paid: receipts.filter((r) => r.status === "PAID").length,
    pending: receipts.filter((r) => r.status === "PENDING").length,
    refunded: receipts.filter((r) => r.status === "REFUNDED").length,
    totalAmount: receipts.reduce((sum, r) => sum + r.amount, 0),
    totalRefunded: receipts.filter((r) => r.status === "REFUNDED").reduce((sum, r) => sum + (r.refundAmount || 0), 0),
  }

  return stats
}

// Plan 5: New functions for receipt generation and editing workflow

// Create draft receipt from fuel order
export async function createDraftReceipt(fuelOrderId: number): Promise<ExtendedReceipt> {
  const fboId = getCurrentUserFboId();

  const response = await fetch(`${API_BASE_URL}/fbo/${fboId}/receipts/draft`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ fuel_order_id: fuelOrderId }),
  });

  // The backend returns { message: "...", receipt: {...} }
  // handleApiResponse will parse this and give us the inner object.
  const data = await handleApiResponse<{ receipt: ExtendedReceipt }>(response);
  
  // Return the actual receipt object from the backend, which includes the real database ID.
  return data.receipt;
}

// Update draft receipt
export async function updateDraftReceipt(receiptId: number, updateData: DraftUpdatePayload): Promise<ExtendedReceipt> {
  if (isOfflineMode()) {
    // Mock implementation
    const storedReceipts = localStorage.getItem("fboReceipts")
    if (!storedReceipts) {
      throw new Error("Receipt not found")
    }

    const receipts = JSON.parse(storedReceipts) as Receipt[]
    const index = receipts.findIndex((r) => r.id === receiptId)

    if (index === -1) {
      throw new Error("Receipt not found")
    }

    const updatedReceipt = {
      ...receipts[index],
      updatedAt: new Date().toISOString(),
    }
    
    // Map frontend fields to receipt fields for offline mode
    if (updateData.customerId !== undefined) {
      updatedReceipt.customerId = updateData.customerId
    }
    
    if (updateData.aircraftType !== undefined) {
      updatedReceipt.aircraftTypeAtReceiptTime = updateData.aircraftType
    }
    
    if (updateData.notes !== undefined) {
      updatedReceipt.notes = updateData.notes
    }

    receipts[index] = updatedReceipt
    localStorage.setItem("fboReceipts", JSON.stringify(receipts))

    return {
      ...updatedReceipt,
      lineItems: mockLineItems.filter(item => item.receiptId === receiptId)
    }
  }

  // Online mode - update via API
  const fboId = getCurrentUserFboId();
  
  // Transform frontend field names to backend field names
  const backendPayload: any = {}
  
  if (updateData.customerId !== undefined) {
    backendPayload.customer_id = updateData.customerId
  }
  
  if (updateData.aircraftType !== undefined) {
    backendPayload.aircraft_type = updateData.aircraftType
  }
  
  if (updateData.notes !== undefined) {
    backendPayload.notes = updateData.notes
  }
  
  // Copy any additional fields
  Object.keys(updateData).forEach(key => {
    if (!['customerId', 'aircraftType', 'notes'].includes(key)) {
      backendPayload[key] = updateData[key]
    }
  })

  const response = await fetch(`${API_BASE_URL}/fbo/${fboId}/receipts/${receiptId}/draft`, {
    method: "PUT",
    headers: getAuthHeaders(),
    body: JSON.stringify(backendPayload),
  })

  const data = await handleApiResponse<{ receipt: ExtendedReceipt }>(response)
  return data.receipt
}

// Calculate fees for receipt
export async function calculateFeesForReceipt(receiptId: number): Promise<ExtendedReceipt> {
  if (isOfflineMode()) {
    // Mock implementation with calculated fees
    const receipt = await getReceipt(receiptId)
    
    const calculatedReceipt: Receipt = {
      ...receipt,
      totalFeesAmount: 150.00,
      totalWaiversAmount: -50.00,
      taxAmount: 60.00,
      grandTotalAmount: 660.00,
      updatedAt: new Date().toISOString()
    }

    const calculatedLineItems: ReceiptLineItem[] = [
      {
        id: 1,
        receiptId,
        lineItemType: 'FUEL',
        description: 'Jet A Fuel',
        quantity: 100,
        unitPrice: 5.00,
        amount: 500.00
      },
      {
        id: 2,
        receiptId,
        lineItemType: 'FEE',
        description: 'Ramp Fee',
        feeCodeApplied: 'RAMP_FEE',
        quantity: 1,
        unitPrice: 100.00,
        amount: 100.00
      },
      {
        id: 3,
        receiptId,
        lineItemType: 'FEE',
        description: 'GPU Service',
        feeCodeApplied: 'GPU_SERVICE',
        quantity: 1,
        unitPrice: 50.00,
        amount: 50.00
      },
      {
        id: 4,
        receiptId,
        lineItemType: 'WAIVER',
        description: 'Fuel Uplift Waiver (Ramp Fee)',
        feeCodeApplied: 'RAMP_FEE_WAIVER',
        quantity: 1,
        unitPrice: -50.00,
        amount: -50.00
      },
      {
        id: 5,
        receiptId,
        lineItemType: 'TAX',
        description: 'Tax',
        quantity: 1,
        unitPrice: 60.00,
        amount: 60.00
      }
    ]

    // Update stored receipt
    const storedReceipts = localStorage.getItem("fboReceipts")
    if (storedReceipts) {
      const receipts = JSON.parse(storedReceipts) as Receipt[]
      const index = receipts.findIndex((r) => r.id === receiptId)
      if (index !== -1) {
        receipts[index] = calculatedReceipt
        localStorage.setItem("fboReceipts", JSON.stringify(receipts))
      }
    }

    return {
      ...calculatedReceipt,
      lineItems: calculatedLineItems
    }
  }

  // Online mode - calculate via API
  const response = await fetch(`${API_BASE_URL}/receipts/${receiptId}/calculate-fees`, {
    method: "POST",
    headers: getAuthHeaders(),
  })

  return handleApiResponse<ExtendedReceipt>(response)
}

// Generate final receipt
export async function generateFinalReceipt(receiptId: number): Promise<ExtendedReceipt> {
  if (isOfflineMode()) {
    // Mock implementation
    const receipt = await getReceipt(receiptId)
    
    const generatedReceipt: Receipt = {
      ...receipt,
      receiptNumber: `RCP-${new Date().getFullYear()}-${String(receiptId).padStart(4, '0')}`,
      status: 'GENERATED',
      generatedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    // Update stored receipt
    const storedReceipts = localStorage.getItem("fboReceipts")
    if (storedReceipts) {
      const receipts = JSON.parse(storedReceipts) as Receipt[]
      const index = receipts.findIndex((r) => r.id === receiptId)
      if (index !== -1) {
        receipts[index] = generatedReceipt
        localStorage.setItem("fboReceipts", JSON.stringify(receipts))
      }
    }

    return {
      ...generatedReceipt,
      lineItems: mockLineItems.filter(item => item.receiptId === receiptId)
    }
  }

  // Online mode - generate via API
  const response = await fetch(`${API_BASE_URL}/receipts/${receiptId}/generate`, {
    method: "POST",
    headers: getAuthHeaders(),
  })

  return handleApiResponse<ExtendedReceipt>(response)
}

// Mark receipt as paid
export async function markReceiptAsPaid(receiptId: number): Promise<ExtendedReceipt> {
  if (isOfflineMode()) {
    // Mock implementation
    const receipt = await getReceipt(receiptId)
    
    const paidReceipt: Receipt = {
      ...receipt,
      status: 'PAID',
      paidAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    // Update stored receipt
    const storedReceipts = localStorage.getItem("fboReceipts")
    if (storedReceipts) {
      const receipts = JSON.parse(storedReceipts) as Receipt[]
      const index = receipts.findIndex((r) => r.id === receiptId)
      if (index !== -1) {
        receipts[index] = paidReceipt
        localStorage.setItem("fboReceipts", JSON.stringify(receipts))
      }
    }

    return {
      ...paidReceipt,
      lineItems: mockLineItems.filter(item => item.receiptId === receiptId)
    }
  }

  // Online mode - mark as paid via API
  const response = await fetch(`${API_BASE_URL}/receipts/${receiptId}/mark-paid`, {
    method: "POST",
    headers: getAuthHeaders(),
  })

  return handleApiResponse<ExtendedReceipt>(response)
}

/**
 * Void a receipt - Plan 8 implementation
 */
export async function voidReceipt(receiptId: number, reason?: string): Promise<Receipt> {
  if (isOfflineMode()) {
    // Mock implementation for offline mode
    const receipt = await getReceipt(receiptId)
    
    if (receipt.status !== 'GENERATED' && receipt.status !== 'PAID') {
      throw new Error(`Cannot void receipt with status ${receipt.status}`)
    }
    
    const voidedReceipt: Receipt = {
      ...receipt,
      status: 'VOID',
      updatedAt: new Date().toISOString(),
      notes: reason ? `${receipt.notes || ''}\nVOIDED: ${reason}` : `${receipt.notes || ''}\nVOIDED`
    }

    // Update stored receipt
    const storedReceipts = localStorage.getItem("fboReceipts")
    if (storedReceipts) {
      const receipts = JSON.parse(storedReceipts) as Receipt[]
      const index = receipts.findIndex((r) => r.id === receiptId)
      if (index !== -1) {
        receipts[index] = voidedReceipt
        localStorage.setItem("fboReceipts", JSON.stringify(receipts))
      }
    }
    
    return voidedReceipt
  }

  const fboId = getCurrentUserFboId();
  const response = await fetch(`${API_BASE_URL}/fbo/${fboId}/receipts/${receiptId}/void`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ reason }),
  })

  const data = await handleApiResponse<{ receipt: Receipt }>(response)
  return data.receipt
}
