/**
 * Comprehensive test suite for Receipt Service
 * 
 * Following TDD principles, these tests validate all receipt API interactions,
 * data transformations, and business logic in the frontend service layer.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from '@jest/globals'
import { 
  getReceipts,
  getRecentReceipts,
  getReceiptById,
  getReceipt,
  createReceipt,
  updateReceipt,
  deleteReceipt,
  filterReceipts,
  sortReceipts,
  convertReceiptsToCSV,
  getReceiptStatistics,
  createDraftReceipt,
  updateDraftReceipt,
  calculateFeesForReceipt,
  generateFinalReceipt,
  markReceiptAsPaid,
  voidReceipt,
  toggleLineItemWaiver,
  Receipt,
  ReceiptLineItem,
  ExtendedReceipt,
  CreateReceiptRequest,
  DraftUpdatePayload,
  ReceiptListFilters,
  ReceiptListResponse
} from '../../app/services/receipt-service'

// Mock the API config
vi.mock('../../app/services/api-config', () => ({
  API_BASE_URL: 'http://localhost:5000/api',
  getAuthHeaders: () => ({
    'Content-Type': 'application/json',
    'Authorization': 'Bearer mock-token'
  }),
  handleApiResponse: vi.fn((response) => {
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }
    return response.json()
  })
}))

describe('Receipt Service', () => {
  // Mock data factories following TDD principles - valid data from real schemas
  const createMockReceipt = (overrides?: Partial<Receipt>): Receipt => ({
    id: 1,
    receipt_number: "RCP-2024-001",
    fuel_order_id: 1,
    customer_id: 1,
    fuel_order_tail_number: "N12345",
    aircraft_type_at_receipt_time: "Light Jet",
    fuel_type_at_receipt_time: "JET_A",
    fuel_quantity_gallons_at_receipt_time: "100.00",
    fuel_unit_price_at_receipt_time: "5.75",
    fuel_subtotal: "575.00",
    total_fees_amount: "100.00",
    total_waivers_amount: "0.00",
    tax_amount: "0.00",
    grand_total_amount: "675.00",
    status: "GENERATED",
    is_caa_applied: false,
    generated_at: "2024-01-15T10:35:00Z",
    paid_at: null,
    created_at: "2024-01-15T10:30:00Z",
    updated_at: "2024-01-15T10:35:00Z",
    created_by_user_id: 1,
    updated_by_user_id: 1,
    ...overrides
  })

  const createMockReceiptLineItem = (overrides?: Partial<ReceiptLineItem>): ReceiptLineItem => ({
    id: 1,
    receipt_id: 1,
    line_item_type: "FUEL",
    description: "JET_A Fuel",
    fee_code_applied: null,
    quantity: "100.00",
    unit_price: "5.75",
    amount: "575.00",
    created_at: "2024-01-15T10:30:00Z",
    updated_at: "2024-01-15T10:30:00Z",
    ...overrides
  })

  const createMockExtendedReceipt = (overrides?: Partial<ExtendedReceipt>): ExtendedReceipt => ({
    ...createMockReceipt(),
    line_items: [
      createMockReceiptLineItem(),
      createMockReceiptLineItem({
        id: 2,
        line_item_type: "FEE",
        description: "Ramp Fee",
        fee_code_applied: "RAMP_FEE",
        quantity: "1.00",
        unit_price: "100.00",
        amount: "100.00"
      })
    ],
    ...overrides
  })

  beforeEach(() => {
    // Reset fetch mock before each test
    global.fetch = vi.fn()
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('getReceipts', () => {
    it('should fetch receipts with default parameters', async () => {
      const mockResponse: ReceiptListResponse = {
        receipts: [createMockReceipt()],
        total: 1,
        page: 1,
        per_page: 50,
        total_pages: 1
      }

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockResponse
      })

      const result = await getReceipts()

      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:5000/api/receipts',
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer mock-token'
          }
        }
      )
      expect(result).toEqual(mockResponse)
    })

    it('should fetch receipts with filters', async () => {
      const filters: ReceiptListFilters = {
        status: 'PAID',
        customer_id: 1,
        date_from: '2024-01-01',
        date_to: '2024-01-31',
        search: 'N12345',
        page: 2,
        per_page: 25
      }

      const mockResponse: ReceiptListResponse = {
        receipts: [createMockReceipt({ status: 'PAID' })],
        total: 1,
        page: 2,
        per_page: 25,
        total_pages: 1
      }

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockResponse
      })

      const result = await getReceipts(filters)

      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:5000/api/receipts?status=PAID&customer_id=1&date_from=2024-01-01&date_to=2024-01-31&search=N12345&page=2&per_page=25',
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer mock-token'
          }
        }
      )
      expect(result).toEqual(mockResponse)
    })

    it('should exclude "all" status from query parameters', async () => {
      const filters: ReceiptListFilters = {
        status: 'all'
      }

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ receipts: [], total: 0, page: 1, per_page: 50, total_pages: 0 })
      })

      await getReceipts(filters)

      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:5000/api/receipts',
        expect.any(Object)
      )
    })

    it('should handle API errors', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500
      })

      await expect(getReceipts()).rejects.toThrow('HTTP 500')
    })
  })

  describe('getRecentReceipts', () => {
    it('should fetch recent receipts with default limit', async () => {
      const mockResponse = {
        receipts: [createMockReceipt()],
        total: 1,
        page: 1,
        per_page: 5
      }

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockResponse
      })

      const result = await getRecentReceipts()

      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:5000/api/receipts?per_page=5&page=1',
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer mock-token'
          }
        }
      )
      expect(result).toEqual([createMockReceipt()])
    })

    it('should fetch recent receipts with custom limit', async () => {
      const mockResponse = {
        receipts: [createMockReceipt()],
        total: 1,
        page: 1,
        per_page: 10
      }

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockResponse
      })

      const result = await getRecentReceipts(10)

      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:5000/api/receipts?per_page=10&page=1',
        expect.any(Object)
      )
      expect(result).toEqual([createMockReceipt()])
    })

    it('should return empty array when no receipts', async () => {
      const mockResponse = {
        receipts: null,
        total: 0,
        page: 1,
        per_page: 5
      }

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockResponse
      })

      const result = await getRecentReceipts()

      expect(result).toEqual([])
    })
  })

  describe('getReceiptById', () => {
    it('should fetch receipt by ID', async () => {
      const mockExtendedReceipt = createMockExtendedReceipt()
      const mockResponse = { receipt: mockExtendedReceipt }

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockResponse
      })

      const result = await getReceiptById(1)

      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:5000/api/receipts/1',
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer mock-token'
          }
        }
      )
      expect(result).toEqual(mockExtendedReceipt)
    })

    it('should handle not found error', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 404
      })

      await expect(getReceiptById(999)).rejects.toThrow('HTTP 404')
    })
  })

  describe('createDraftReceipt', () => {
    it('should create draft receipt from fuel order', async () => {
      const mockExtendedReceipt = createMockExtendedReceipt({ status: 'DRAFT' })
      const mockResponse = { receipt: mockExtendedReceipt }

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockResponse
      })

      const result = await createDraftReceipt(1)

      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:5000/api/receipts/draft',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer mock-token'
          },
          body: JSON.stringify({ fuel_order_id: 1 })
        }
      )
      expect(result).toEqual(mockExtendedReceipt)
    })

    it('should handle creation errors', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 400
      })

      await expect(createDraftReceipt(1)).rejects.toThrow('HTTP 400')
    })
  })

  describe('updateDraftReceipt', () => {
    it('should update draft receipt', async () => {
      const updateData: DraftUpdatePayload = {
        customer_id: 2,
        aircraft_type: 'Heavy Jet',
        notes: 'Updated notes',
        additional_services: [
          { fee_code: 'GROUND_POWER', quantity: 1 }
        ]
      }

      const mockExtendedReceipt = createMockExtendedReceipt({
        customer_id: 2,
        aircraft_type_at_receipt_time: 'Heavy Jet'
      })
      const mockResponse = { receipt: mockExtendedReceipt }

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockResponse
      })

      const result = await updateDraftReceipt(1, updateData)

      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:5000/api/receipts/1/draft',
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer mock-token'
          },
          body: JSON.stringify(updateData)
        }
      )
      expect(result).toEqual(mockExtendedReceipt)
    })
  })

  describe('calculateFeesForReceipt', () => {
    it('should calculate fees for receipt', async () => {
      const additionalServices = [
        { fee_code: 'GROUND_POWER', quantity: 1 },
        { fee_code: 'CATERING', quantity: 2 }
      ]

      const mockExtendedReceipt = createMockExtendedReceipt({
        total_fees_amount: '250.00',
        grand_total_amount: '825.00'
      })
      const mockResponse = { receipt: mockExtendedReceipt }

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockResponse
      })

      const result = await calculateFeesForReceipt(1, additionalServices)

      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:5000/api/receipts/1/calculate-fees',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer mock-token'
          },
          body: JSON.stringify({ additional_services: additionalServices })
        }
      )
      expect(result).toEqual(mockExtendedReceipt)
    })

    it('should calculate fees without additional services', async () => {
      const mockExtendedReceipt = createMockExtendedReceipt()
      const mockResponse = { receipt: mockExtendedReceipt }

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockResponse
      })

      const result = await calculateFeesForReceipt(1)

      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:5000/api/receipts/1/calculate-fees',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer mock-token'
          },
          body: JSON.stringify({ additional_services: undefined })
        }
      )
      expect(result).toEqual(mockExtendedReceipt)
    })
  })

  describe('generateFinalReceipt', () => {
    it('should generate final receipt', async () => {
      const mockExtendedReceipt = createMockExtendedReceipt({
        status: 'GENERATED',
        receipt_number: 'R-20240101-0001',
        generated_at: '2024-01-01T10:00:00Z'
      })
      const mockResponse = { receipt: mockExtendedReceipt }

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockResponse
      })

      const result = await generateFinalReceipt(1)

      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:5000/api/receipts/1/generate',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer mock-token'
          }
        }
      )
      expect(result).toEqual(mockExtendedReceipt)
    })
  })

  describe('markReceiptAsPaid', () => {
    it('should mark receipt as paid', async () => {
      const mockExtendedReceipt = createMockExtendedReceipt({
        status: 'PAID',
        paid_at: '2024-01-01T11:00:00Z'
      })
      const mockResponse = { receipt: mockExtendedReceipt }

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockResponse
      })

      const result = await markReceiptAsPaid(1)

      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:5000/api/receipts/1/mark-paid',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer mock-token'
          }
        }
      )
      expect(result).toEqual(mockExtendedReceipt)
    })
  })

  describe('voidReceipt', () => {
    it('should void receipt with reason', async () => {
      const mockReceipt = createMockReceipt({
        status: 'VOID'
      })
      const mockResponse = { receipt: mockReceipt }

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockResponse
      })

      const result = await voidReceipt(1, 'Customer request')

      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:5000/api/receipts/1/void',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer mock-token'
          },
          body: JSON.stringify({ reason: 'Customer request' })
        }
      )
      expect(result).toEqual(mockReceipt)
    })

    it('should void receipt without reason', async () => {
      const mockReceipt = createMockReceipt({
        status: 'VOID'
      })
      const mockResponse = { receipt: mockReceipt }

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockResponse
      })

      const result = await voidReceipt(1)

      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:5000/api/receipts/1/void',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer mock-token'
          },
          body: JSON.stringify({ reason: undefined })
        }
      )
      expect(result).toEqual(mockReceipt)
    })
  })

  describe('toggleLineItemWaiver', () => {
    it('should toggle line item waiver', async () => {
      const mockExtendedReceipt = createMockExtendedReceipt({
        total_waivers_amount: '-100.00',
        grand_total_amount: '575.00'
      })
      const mockResponse = { receipt: mockExtendedReceipt }

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockResponse
      })

      const result = await toggleLineItemWaiver(1, 2)

      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:5000/api/receipts/1/line-items/2/toggle-waiver',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer mock-token'
          }
        }
      )
      expect(result).toEqual(mockExtendedReceipt)
    })
  })

  describe('filterReceipts', () => {
    const sampleReceipts = [
      createMockReceipt({
        id: 1,
        receipt_number: 'RCP-2024-001',
        status: 'PAID',
        created_at: '2024-01-15T10:30:00Z',
        fuel_type_at_receipt_time: 'JET_A'
      }),
      createMockReceipt({
        id: 2,
        receipt_number: 'RCP-2024-002',
        status: 'DRAFT',
        created_at: '2024-01-20T14:00:00Z',
        fuel_type_at_receipt_time: 'AVGAS_100LL'
      }),
      createMockReceipt({
        id: 3,
        receipt_number: 'RCP-2024-003',
        status: 'VOID',
        created_at: '2024-01-25T09:15:00Z',
        fuel_type_at_receipt_time: 'JET_A'
      })
    ]

    it('should filter by search term', () => {
      const result = filterReceipts(sampleReceipts, 'RCP-2024-001')
      expect(result).toHaveLength(1)
      expect(result[0].id).toBe(1)
    })

    it('should filter by status', () => {
      const result = filterReceipts(sampleReceipts, undefined, undefined, undefined, 'PAID')
      expect(result).toHaveLength(1)
      expect(result[0].status).toBe('PAID')
    })

    it('should filter by date range', () => {
      const result = filterReceipts(
        sampleReceipts, 
        undefined, 
        '2024-01-16', 
        '2024-01-24'
      )
      expect(result).toHaveLength(1)
      expect(result[0].id).toBe(2)
    })

    it('should filter by fuel type in search', () => {
      const result = filterReceipts(sampleReceipts, 'AVGAS')
      expect(result).toHaveLength(1)
      expect(result[0].fuel_type_at_receipt_time).toBe('AVGAS_100LL')
    })

    it('should handle "all" status filter', () => {
      const result = filterReceipts(sampleReceipts, undefined, undefined, undefined, 'all')
      expect(result).toHaveLength(3)
    })

    it('should combine multiple filters', () => {
      const result = filterReceipts(
        sampleReceipts, 
        'JET_A', 
        '2024-01-01', 
        '2024-01-20', 
        'PAID'
      )
      expect(result).toHaveLength(1)
      expect(result[0].id).toBe(1)
    })
  })

  describe('sortReceipts', () => {
    const sampleReceipts = [
      createMockReceipt({
        id: 1,
        receipt_number: 'RCP-2024-003',
        created_at: '2024-01-25T09:15:00Z',
        grand_total_amount: '500.00'
      }),
      createMockReceipt({
        id: 2,
        receipt_number: 'RCP-2024-001',
        created_at: '2024-01-15T10:30:00Z',
        grand_total_amount: '750.00'
      }),
      createMockReceipt({
        id: 3,
        receipt_number: 'RCP-2024-002',
        created_at: '2024-01-20T14:00:00Z',
        grand_total_amount: '625.00'
      })
    ]

    it('should sort by date ascending', () => {
      const result = sortReceipts(sampleReceipts, 'created_at', 'asc')
      expect(result.map(r => r.id)).toEqual([2, 3, 1])
    })

    it('should sort by date descending', () => {
      const result = sortReceipts(sampleReceipts, 'created_at', 'desc')
      expect(result.map(r => r.id)).toEqual([1, 3, 2])
    })

    it('should sort by receipt number ascending', () => {
      const result = sortReceipts(sampleReceipts, 'receipt_number', 'asc')
      expect(result.map(r => r.id)).toEqual([2, 3, 1])
    })

    it('should sort by amount descending', () => {
      const result = sortReceipts(sampleReceipts, 'grand_total_amount', 'desc')
      expect(result.map(r => r.grand_total_amount)).toEqual(['750.00', '625.00', '500.00'])
    })

    it('should not mutate original array', () => {
      const originalOrder = sampleReceipts.map(r => r.id)
      sortReceipts(sampleReceipts, 'created_at', 'asc')
      expect(sampleReceipts.map(r => r.id)).toEqual(originalOrder)
    })
  })

  describe('convertReceiptsToCSV', () => {
    it('should convert receipts to CSV format', () => {
      const receipts = [
        createMockReceipt({
          receipt_number: 'RCP-2024-001',
          status: 'PAID',
          customer_id: 1,
          fuel_order_id: 1,
          aircraft_type_at_receipt_time: 'Light Jet',
          fuel_type_at_receipt_time: 'JET_A',
          fuel_quantity_gallons_at_receipt_time: '100.00'
        })
      ]

      const csv = convertReceiptsToCSV(receipts)

      expect(csv).toContain('Receipt Number,Status,Customer ID')
      expect(csv).toContain('"RCP-2024-001","PAID",1')
      expect(csv).toContain('"Light Jet"')
      expect(csv).toContain('"JET_A"')
    })

    it('should handle empty receipts array', () => {
      const csv = convertReceiptsToCSV([])
      expect(csv).toBe('No receipts to export')
    })

    it('should handle null/undefined values', () => {
      const receipts = [
        createMockReceipt({
          receipt_number: null,
          fuel_order_id: null,
          aircraft_type_at_receipt_time: null,
          generated_at: null,
          paid_at: null
        })
      ]

      const csv = convertReceiptsToCSV(receipts)
      expect(csv).toContain('""')  // Empty quoted fields for null values
    })
  })

  describe('getReceiptStatistics', () => {
    it('should calculate receipt statistics', () => {
      const receipts = [
        createMockReceipt({ status: 'PAID', grand_total_amount: '500.00' }),
        createMockReceipt({ status: 'PAID', grand_total_amount: '750.00' }),
        createMockReceipt({ status: 'DRAFT', grand_total_amount: '625.00' }),
        createMockReceipt({ status: 'VOID', grand_total_amount: '400.00' })
      ]

      const stats = getReceiptStatistics(receipts)

      expect(stats.totalReceipts).toBe(4)
      expect(stats.totalRevenue).toBe(2275.00)
      expect(stats.averageReceiptValue).toBe(568.75)
      expect(stats.statusCounts).toEqual({
        'PAID': 2,
        'DRAFT': 1,
        'VOID': 1
      })
    })

    it('should handle empty receipts array', () => {
      const stats = getReceiptStatistics([])

      expect(stats.totalReceipts).toBe(0)
      expect(stats.totalRevenue).toBe(0)
      expect(stats.averageReceiptValue).toBe(0)
      expect(stats.statusCounts).toEqual({})
    })

    it('should handle invalid amounts', () => {
      const receipts = [
        createMockReceipt({ grand_total_amount: '' }),
        createMockReceipt({ grand_total_amount: '100.00' })
      ]

      const stats = getReceiptStatistics(receipts)

      expect(stats.totalRevenue).toBe(100.00)
      expect(stats.averageReceiptValue).toBe(50.00)
    })
  })

  describe('localStorage operations (legacy functions)', () => {
    beforeEach(() => {
      // Mock localStorage
      const mockLocalStorage = {
        getItem: vi.fn(),
        setItem: vi.fn(),
        removeItem: vi.fn(),
        clear: vi.fn()
      }
      Object.defineProperty(window, 'localStorage', {
        value: mockLocalStorage
      })
    })

    describe('getReceipt (localStorage)', () => {
      it('should get receipt from localStorage', async () => {
        const mockReceipts = [createMockReceipt({ id: 1 })]
        window.localStorage.getItem = vi.fn().mockReturnValue(JSON.stringify(mockReceipts))

        const result = await getReceipt(1)

        expect(window.localStorage.getItem).toHaveBeenCalledWith('fboReceipts')
        expect(result).toEqual(mockReceipts[0])
      })

      it('should throw error when receipt not found', async () => {
        window.localStorage.getItem = vi.fn().mockReturnValue(JSON.stringify([]))

        await expect(getReceipt(999)).rejects.toThrow('Receipt not found')
      })

      it('should throw error when localStorage is empty', async () => {
        window.localStorage.getItem = vi.fn().mockReturnValue(null)

        await expect(getReceipt(1)).rejects.toThrow('Receipt not found')
      })
    })

    describe('createReceipt (localStorage)', () => {
      it('should create receipt in localStorage', async () => {
        const createRequest: CreateReceiptRequest = { fuel_order_id: 1 }
        window.localStorage.getItem = vi.fn().mockReturnValue('[]')
        window.localStorage.setItem = vi.fn()

        const result = await createReceipt(createRequest)

        expect(result.fuel_order_id).toBe(1)
        expect(result.status).toBe('DRAFT')
        expect(result.id).toBeDefined()
        expect(window.localStorage.setItem).toHaveBeenCalled()
      })
    })

    describe('updateReceipt (localStorage)', () => {
      it('should update receipt in localStorage', async () => {
        const existingReceipt = createMockReceipt({ id: 1, status: 'DRAFT' })
        window.localStorage.getItem = vi.fn().mockReturnValue(JSON.stringify([existingReceipt]))
        window.localStorage.setItem = vi.fn()

        const updates = { status: 'GENERATED' as const }
        const result = await updateReceipt(1, updates)

        expect(result.status).toBe('GENERATED')
        expect(result.updated_at).toBeDefined()
        expect(window.localStorage.setItem).toHaveBeenCalled()
      })

      it('should add generated timestamp when status changes to GENERATED', async () => {
        const existingReceipt = createMockReceipt({ id: 1, status: 'DRAFT' })
        window.localStorage.getItem = vi.fn().mockReturnValue(JSON.stringify([existingReceipt]))
        window.localStorage.setItem = vi.fn()

        const updates = { status: 'GENERATED' as const }
        const result = await updateReceipt(1, updates)

        expect(result.generated_at).toBeDefined()
      })

      it('should throw error when receipt not found', async () => {
        window.localStorage.getItem = vi.fn().mockReturnValue('[]')

        await expect(updateReceipt(999, {})).rejects.toThrow('Receipt not found')
      })
    })

    describe('deleteReceipt (localStorage)', () => {
      it('should delete receipt from localStorage', async () => {
        const existingReceipts = [
          createMockReceipt({ id: 1 }),
          createMockReceipt({ id: 2 })
        ]
        window.localStorage.getItem = vi.fn().mockReturnValue(JSON.stringify(existingReceipts))
        window.localStorage.setItem = vi.fn()

        const result = await deleteReceipt(1)

        expect(result).toBe(true)
        expect(window.localStorage.setItem).toHaveBeenCalledWith(
          'fboReceipts',
          JSON.stringify([existingReceipts[1]])
        )
      })

      it('should return false when receipt not found', async () => {
        window.localStorage.getItem = vi.fn().mockReturnValue('[]')

        const result = await deleteReceipt(999)

        expect(result).toBe(false)
      })

      it('should return false when localStorage is empty', async () => {
        window.localStorage.getItem = vi.fn().mockReturnValue(null)

        const result = await deleteReceipt(1)

        expect(result).toBe(false)
      })
    })
  })

  describe('Error handling', () => {
    it('should handle network errors', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'))

      await expect(getReceipts()).rejects.toThrow('Network error')
    })

    it('should handle malformed JSON responses', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => { throw new Error('Invalid JSON') }
      })

      await expect(getReceipts()).rejects.toThrow('Invalid JSON')
    })

    it('should handle missing response data', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({})
      })

      const result = await getRecentReceipts()
      expect(result).toEqual([])
    })
  })

  describe('Edge cases', () => {
    it('should handle undefined optional parameters', async () => {
      const mockResponse = { receipt: createMockExtendedReceipt() }

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockResponse
      })

      // Should not throw when additional_services is undefined
      await expect(calculateFeesForReceipt(1, undefined)).resolves.toBeDefined()
    })

    it('should handle empty filter objects', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ receipts: [], total: 0, page: 1, per_page: 50, total_pages: 0 })
      })

      await expect(getReceipts({})).resolves.toBeDefined()
    })

    it('should handle sorting with equal values', () => {
      const receipts = [
        createMockReceipt({ id: 1, grand_total_amount: '500.00' }),
        createMockReceipt({ id: 2, grand_total_amount: '500.00' })
      ]

      const result = sortReceipts(receipts, 'grand_total_amount', 'asc')
      expect(result).toHaveLength(2)
    })
  })
})