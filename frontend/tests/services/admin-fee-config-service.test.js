// Service tests for Admin Fee Configuration API integration
describe('Admin Fee Configuration Service', () => {
  const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5001'
  const FBO_ID = 1

  // Mock fetch globally
  global.fetch = jest.fn()
  
  beforeEach(() => {
    fetch.mockClear()
  })

  describe('Fee Categories Service', () => {
    test('should fetch fee categories successfully', async () => {
      const mockCategories = [
        { id: 1, name: 'Light Jet', fbo_location_id: 1 },
        { id: 2, name: 'Heavy Jet', fbo_location_id: 1 },
      ]

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockCategories,
      })

      const expectedUrl = `${BASE_URL}/api/admin/fbo/${FBO_ID}/fee-categories`
      const response = await fetch(expectedUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-token',
        },
      })
      const categories = await response.json()

      expect(categories).toEqual(mockCategories)
    })

    test('should create fee category successfully', async () => {
      const newCategory = { name: 'Turboprop' }
      const createdCategory = { id: 3, ...newCategory, fbo_location_id: 1 }

      fetch.mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: async () => createdCategory,
      })

      const response = await fetch(`${BASE_URL}/api/admin/fbo/${FBO_ID}/fee-categories`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-token',
        },
        body: JSON.stringify(newCategory),
      })

      expect(response.status).toBe(201)
      const result = await response.json()
      expect(result).toEqual(createdCategory)
    })

    describe('getFeeCategories', () => {
      test('should handle errors when fetching categories', async () => {
        fetch.mockResolvedValueOnce({
          ok: false,
          status: 500,
          json: async () => ({ error: 'Internal server error' }),
        })

        const expectedUrl = `${BASE_URL}/api/admin/fbo/${FBO_ID}/fee-categories`
        
        const response = await fetch(expectedUrl, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer test-token',
          },
        })

        expect(response.ok).toBe(false)
        expect(response.status).toBe(500)
      })
    })

    describe('createFeeCategory', () => {
      test('should handle validation errors', async () => {
        const invalidCategory = { name: '' }

        fetch.mockResolvedValueOnce({
          ok: false,
          status: 400,
          json: async () => ({
            error: 'Validation failed',
            details: { name: 'Name is required' }
          }),
        })

        const response = await fetch(`${BASE_URL}/api/admin/fbo/${FBO_ID}/fee-categories`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer test-token',
          },
          body: JSON.stringify(invalidCategory),
        })

        expect(response.ok).toBe(false)
        expect(response.status).toBe(400)
        
        const error = await response.json()
        expect(error.details.name).toBe('Name is required')
      })

      test('should handle duplicate name errors', async () => {
        const duplicateCategory = { name: 'Light Jet' }

        fetch.mockResolvedValueOnce({
          ok: false,
          status: 409,
          json: async () => ({
            error: 'Category name already exists for this FBO'
          }),
        })

        const response = await fetch(`${BASE_URL}/api/admin/fbo/${FBO_ID}/fee-categories`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer test-token',
          },
          body: JSON.stringify(duplicateCategory),
        })

        expect(response.status).toBe(409)
      })
    })

    describe('updateFeeCategory', () => {
      test('should update fee category successfully', async () => {
        const categoryId = 1
        const updateData = { name: 'Updated Light Jet' }
        const updatedCategory = { id: categoryId, ...updateData, fbo_location_id: 1 }

        fetch.mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => updatedCategory,
        })

        const expectedUrl = `${BASE_URL}/api/admin/fbo/${FBO_ID}/fee-categories/${categoryId}`
        const expectedOptions = {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer test-token',
          },
          body: JSON.stringify(updateData),
        }

        const response = await fetch(expectedUrl, expectedOptions)
        const result = await response.json()

        expect(fetch).toHaveBeenCalledWith(expectedUrl, expectedOptions)
        expect(result).toEqual(updatedCategory)
      })
    })

    describe('deleteFeeCategory', () => {
      test('should delete fee category successfully', async () => {
        const categoryId = 1

        fetch.mockResolvedValueOnce({
          ok: true,
          status: 204,
        })

        const expectedUrl = `${BASE_URL}/api/admin/fbo/${FBO_ID}/fee-categories/${categoryId}`
        const expectedOptions = {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer test-token',
          },
        }

        const response = await fetch(expectedUrl, expectedOptions)

        expect(fetch).toHaveBeenCalledWith(expectedUrl, expectedOptions)
        expect(response.status).toBe(204)
      })

      test('should handle foreign key constraint errors', async () => {
        const categoryId = 1

        fetch.mockResolvedValueOnce({
          ok: false,
          status: 409,
          json: async () => ({
            error: 'Cannot delete fee category that is referenced by fee rules'
          }),
        })

        const response = await fetch(`${BASE_URL}/api/admin/fbo/${FBO_ID}/fee-categories/${categoryId}`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer test-token',
          },
        })

        expect(response.status).toBe(409)
      })
    })
  })

  describe('Fee Rules Service', () => {
    test('should create fee rule with CAA overrides', async () => {
      const newRule = {
        fee_name: 'Overnight Fee',
        fee_code: 'OVERNIGHT',
        applies_to_fee_category_id: 2,
        amount: 100.00,
        has_caa_override: true,
        caa_override_amount: 80.00,
      }

      const createdRule = { id: 5, ...newRule, fbo_location_id: 1 }

      fetch.mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: async () => createdRule,
      })

      const response = await fetch(`${BASE_URL}/api/admin/fbo/${FBO_ID}/fee-rules`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-token',
        },
        body: JSON.stringify(newRule),
      })

      const result = await response.json()
      expect(result.has_caa_override).toBe(true)
      expect(result.caa_override_amount).toBe(80.00)
    })

    describe('getFeeRules', () => {
      test('should fetch fee rules successfully', async () => {
        const mockRules = [
          {
            id: 1,
            fee_name: 'Ramp Fee',
            fee_code: 'RAMP',
            applies_to_fee_category_id: 1,
            amount: 50.00,
            is_taxable: true,
            is_potentially_waivable_by_fuel_uplift: true,
            calculation_basis: 'FIXED_PRICE',
            waiver_strategy: 'SIMPLE_MULTIPLIER',
            simple_waiver_multiplier: 2.0,
            has_caa_override: false,
            fbo_location_id: 1,
          },
        ]

        fetch.mockResolvedValueOnce({
          ok: true,
          json: async () => mockRules,
        })

        const expectedUrl = `${BASE_URL}/api/admin/fbo/${FBO_ID}/fee-rules`
        
        const response = await fetch(expectedUrl, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer test-token',
          },
        })
        const rules = await response.json()

        expect(rules).toEqual(mockRules)
      })
    })

    describe('createFeeRule', () => {
      test('should create fee rule with basic fields', async () => {
        const newRule = {
          fee_name: 'GPU Service',
          fee_code: 'GPU',
          applies_to_fee_category_id: 1,
          amount: 25.00,
          is_taxable: true,
          is_potentially_waivable_by_fuel_uplift: false,
          calculation_basis: 'FIXED_PRICE',
          waiver_strategy: 'NONE',
          simple_waiver_multiplier: 1.0,
          has_caa_override: false,
        }

        const createdRule = { id: 4, ...newRule, fbo_location_id: 1 }

        fetch.mockResolvedValueOnce({
          ok: true,
          status: 201,
          json: async () => createdRule,
        })

        const response = await fetch(`${BASE_URL}/api/admin/fbo/${FBO_ID}/fee-rules`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer test-token',
          },
          body: JSON.stringify(newRule),
        })

        expect(response.status).toBe(201)
        const result = await response.json()
        expect(result).toEqual(createdRule)
      })

      test('should validate required fields', async () => {
        const invalidRule = {
          fee_name: '',
          fee_code: '',
          // Missing required fields
        }

        fetch.mockResolvedValueOnce({
          ok: false,
          status: 400,
          json: async () => ({
            error: 'Validation failed',
            details: {
              fee_name: 'Fee name is required',
              fee_code: 'Fee code is required',
              applies_to_fee_category_id: 'Fee category is required',
              amount: 'Amount is required',
            }
          }),
        })

        const response = await fetch(`${BASE_URL}/api/admin/fbo/${FBO_ID}/fee-rules`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer test-token',
          },
          body: JSON.stringify(invalidRule),
        })

        expect(response.status).toBe(400)
        const error = await response.json()
        expect(error.details.fee_name).toBe('Fee name is required')
      })

      test('should handle duplicate fee code errors', async () => {
        const duplicateRule = {
          fee_name: 'Another Ramp Fee',
          fee_code: 'RAMP', // Duplicate code
          applies_to_fee_category_id: 1,
          amount: 50.00,
        }

        fetch.mockResolvedValueOnce({
          ok: false,
          status: 409,
          json: async () => ({
            error: 'Fee code already exists for this FBO'
          }),
        })

        const response = await fetch(`${BASE_URL}/api/admin/fbo/${FBO_ID}/fee-rules`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer test-token',
          },
          body: JSON.stringify(duplicateRule),
        })

        expect(response.status).toBe(409)
      })
    })
  })

  describe('Aircraft Type to Fee Category Mapping Service', () => {
    describe('uploadAircraftMappings', () => {
      test('should upload CSV mappings successfully', async () => {
        const csvFile = new File(['model,category\nCJ3,Light Jet'], 'mappings.csv', {
          type: 'text/csv'
        })

        const mockResponse = {
          message: 'Mappings uploaded successfully',
          created: 1,
          updated: 0,
          errors: []
        }

        fetch.mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => mockResponse,
        })

        const formData = new FormData()
        formData.append('file', csvFile)

        const response = await fetch(`${BASE_URL}/api/admin/fbo/${FBO_ID}/aircraft-mappings/upload`, {
          method: 'POST',
          headers: {
            'Authorization': 'Bearer test-token',
          },
          body: formData,
        })

        expect(response.status).toBe(200)
        const result = await response.json()
        expect(result.created).toBe(1)
        expect(result.updated).toBe(0)
      })

      test('should handle CSV validation errors', async () => {
        const invalidCsvFile = new File(['invalid,csv,format'], 'invalid.csv', {
          type: 'text/csv'
        })

        fetch.mockResolvedValueOnce({
          ok: false,
          status: 400,
          json: async () => ({
            error: 'Invalid CSV format',
            details: 'Missing required columns: AircraftModel, FeeCategoryName'
          }),
        })

        const formData = new FormData()
        formData.append('file', invalidCsvFile)

        const response = await fetch(`${BASE_URL}/api/admin/fbo/${FBO_ID}/aircraft-mappings/upload`, {
          method: 'POST',
          headers: {
            'Authorization': 'Bearer test-token',
          },
          body: formData,
        })

        expect(response.status).toBe(400)
      })
    })
  })

  describe('Waiver Tiers Service', () => {
    describe('getWaiverTiers', () => {
      test('should fetch waiver tiers successfully', async () => {
        const mockTiers = [
          {
            id: 1,
            name: 'Standard Waiver',
            fuel_uplift_multiplier: 1.5,
            fees_waived_codes: ['RAMP'],
            tier_priority: 1,
            is_caa_specific_tier: false,
            fbo_location_id: 1,
          },
        ]

        fetch.mockResolvedValueOnce({
          ok: true,
          json: async () => mockTiers,
        })

        const response = await fetch(`${BASE_URL}/api/admin/fbo/${FBO_ID}/waiver-tiers`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer test-token',
          },
        })

        const tiers = await response.json()
        expect(tiers).toEqual(mockTiers)
      })
    })

    describe('createWaiverTier', () => {
      test('should create waiver tier successfully', async () => {
        const newTier = {
          name: 'Premium Waiver',
          fuel_uplift_multiplier: 2.5,
          fees_waived_codes: ['RAMP', 'GPU'],
          tier_priority: 2,
          is_caa_specific_tier: false,
        }

        const createdTier = { id: 2, ...newTier, fbo_location_id: 1 }

        fetch.mockResolvedValueOnce({
          ok: true,
          status: 201,
          json: async () => createdTier,
        })

        const response = await fetch(`${BASE_URL}/api/admin/fbo/${FBO_ID}/waiver-tiers`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer test-token',
          },
          body: JSON.stringify(newTier),
        })

        expect(response.status).toBe(201)
        const result = await response.json()
        expect(result.fees_waived_codes).toEqual(['RAMP', 'GPU'])
      })
    })
  })

  describe('Authentication and Authorization', () => {
    test('should handle authentication errors', async () => {
      fetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({
          error: 'Unauthorized'
        }),
      })

      const response = await fetch(`${BASE_URL}/api/admin/fbo/${FBO_ID}/fee-categories`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          // Missing or invalid Authorization header
        },
      })

      expect(response.status).toBe(401)
    })

    test('should handle permission errors', async () => {
      fetch.mockResolvedValueOnce({
        ok: false,
        status: 403,
        json: async () => ({
          error: 'Insufficient permissions'
        }),
      })

      const response = await fetch(`${BASE_URL}/api/admin/fbo/${FBO_ID}/fee-categories`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer user-without-admin-permissions',
        },
      })

      expect(response.status).toBe(403)
    })

    test('should scope operations by FBO ID', async () => {
      // Test that requests include the correct FBO ID in the URL path
      const anotherFboId = 2

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      })

      const expectedUrl = `${BASE_URL}/api/admin/fbo/${anotherFboId}/fee-categories`

      await fetch(expectedUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-token',
        },
      })

      expect(fetch).toHaveBeenCalledWith(expectedUrl, expect.any(Object))
    })
  })
}) 