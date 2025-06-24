import { API_BASE_URL, getAuthHeaders, handleApiResponse } from "./api-config"
import { isOfflineMode } from "./utils"

// Available service interface for receipt additional services
export interface AvailableService {
  code: string
  description: string
  price: number
  id: number
  fee_name: string
  is_taxable: boolean
  currency: string
  is_potentially_waivable_by_fuel_uplift: boolean
}

// Fee calculation request
export interface FeeCalculationRequest {
  aircraftId: string
  customerId: string
  fuelType: string
  quantity: number
}

// Fee calculation result
export interface FeeCalculationResult {
  subtotal: number
  taxRate: number
  taxAmount: number
  total: number
  breakdown: {
    baseFuelPrice: number
    aircraftFactor: number
    customerDiscount: number
    volumeDiscount: number
  }
}

// Calculate fees for a fuel order
export async function calculateFees(request: FeeCalculationRequest): Promise<FeeCalculationResult> {
  if (isOfflineMode()) {
    // Calculate fees locally
    return calculateFeesLocally(request)
  }

  // Online mode - calculate via API
  const response = await fetch(`${API_BASE_URL}/fees/calculate`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(request),
  })

  return handleApiResponse<FeeCalculationResult>(response)
}

// Get available services (fee rules) for a specific FBO
export async function getAvailableServices(fboId: number): Promise<AvailableService[]> {
  if (isOfflineMode()) {
    // Return mock data for offline mode
    return getMockAvailableServices()
  }

  // Online mode - fetch from API using CSR-accessible endpoint
  const response = await fetch(`${API_BASE_URL}/fbo/${fboId}/receipts/available-services`, {
    method: "GET",
    headers: getAuthHeaders(),
  })

  const result = await handleApiResponse<{ available_services: AvailableService[] }>(response)
  
  return result.available_services
}

// Mock available services for offline mode
function getMockAvailableServices(): AvailableService[] {
  return [
    { id: 1, code: 'GPU_SERVICE', description: 'GPU Service', price: 50.00, fee_name: 'GPU Service', is_taxable: true, currency: 'USD', is_potentially_waivable_by_fuel_uplift: true },
    { id: 2, code: 'LAVATORY_SERVICE', description: 'Lavatory Service', price: 75.00, fee_name: 'Lavatory Service', is_taxable: true, currency: 'USD', is_potentially_waivable_by_fuel_uplift: true },
    { id: 3, code: 'WATER_SERVICE', description: 'Water Service', price: 25.00, fee_name: 'Water Service', is_taxable: true, currency: 'USD', is_potentially_waivable_by_fuel_uplift: false },
    { id: 4, code: 'CATERING_COORDINATION', description: 'Catering Coordination', price: 100.00, fee_name: 'Catering Coordination', is_taxable: true, currency: 'USD', is_potentially_waivable_by_fuel_uplift: false },
    { id: 5, code: 'HANGAR_OVERNIGHT', description: 'Hangar Overnight', price: 200.00, fee_name: 'Hangar Overnight', is_taxable: true, currency: 'USD', is_potentially_waivable_by_fuel_uplift: true },
    { id: 6, code: 'TIE_DOWN', description: 'Tie Down', price: 50.00, fee_name: 'Tie Down', is_taxable: true, currency: 'USD', is_potentially_waivable_by_fuel_uplift: true },
    { id: 7, code: 'CUSTOMS_HANDLING', description: 'Customs Handling', price: 150.00, fee_name: 'Customs Handling', is_taxable: true, currency: 'USD', is_potentially_waivable_by_fuel_uplift: false },
    { id: 8, code: 'CREW_CAR', description: 'Crew Car', price: 75.00, fee_name: 'Crew Car', is_taxable: true, currency: 'USD', is_potentially_waivable_by_fuel_uplift: true },
  ]
}

// Local fee calculation
function calculateFeesLocally(request: FeeCalculationRequest): FeeCalculationResult {
  // Base fuel prices per gallon
  const basePrices = {
    "Jet A": 5.25,
    "Jet A+": 5.75,
    Avgas: 6.5,
    "Sustainable Aviation Fuel": 7.25,
  }

  // Get base price for fuel type
  const baseFuelPrice = basePrices[request.fuelType as keyof typeof basePrices] || 5.25

  // Aircraft factor (would normally be looked up from a database)
  // For demo purposes, we'll use the last digit of the aircraft ID
  const aircraftId = Number.parseInt(request.aircraftId)
  const aircraftFactor = (aircraftId % 10) * 0.01 // 0% to 9% adjustment

  // Customer discount (would normally be looked up from a database)
  // For demo purposes, we'll use the last digit of the customer ID
  const customerId = Number.parseInt(request.customerId)
  const customerDiscount = (customerId % 10) * 0.01 // 0% to 9% discount

  // Volume discount
  let volumeDiscount = 0
  if (request.quantity >= 1000) {
    volumeDiscount = 0.1 // 10% discount for 1000+ gallons
  } else if (request.quantity >= 500) {
    volumeDiscount = 0.05 // 5% discount for 500+ gallons
  } else if (request.quantity >= 250) {
    volumeDiscount = 0.025 // 2.5% discount for 250+ gallons
  }

  // Calculate adjusted price per gallon
  const adjustedPrice = baseFuelPrice * (1 + aircraftFactor) * (1 - customerDiscount) * (1 - volumeDiscount)

  // Calculate subtotal
  const subtotal = adjustedPrice * request.quantity

  // Apply tax
  const taxRate = 0.0725 // 7.25% tax rate
  const taxAmount = subtotal * taxRate

  // Calculate total
  const total = subtotal + taxAmount

  // Return fee calculation result
  return {
    subtotal: Number.parseFloat(subtotal.toFixed(2)),
    taxRate: taxRate,
    taxAmount: Number.parseFloat(taxAmount.toFixed(2)),
    total: Number.parseFloat(total.toFixed(2)),
    breakdown: {
      baseFuelPrice: baseFuelPrice,
      aircraftFactor: aircraftFactor,
      customerDiscount: customerDiscount,
      volumeDiscount: volumeDiscount,
    },
  }
}
