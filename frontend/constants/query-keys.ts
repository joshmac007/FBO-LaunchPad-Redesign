/**
 * Centralized Query Keys for React Query
 * 
 * This file defines all query keys used throughout the application to ensure
 * consistency and prevent typos. Each key is structured as a factory function
 * that returns a readonly array, providing type safety and flexibility.
 * 
 * Naming Convention: Use camelCase for consistency
 */

// Base query key types
export const queryKeys = {
  // Fuel related queries
  fuel: {
    types: (includeInactive = false) => 
      ['fuelTypes', { includeInactive }] as const,
    prices: () => ['fuelPrices'] as const,
    orders: (filters?: Record<string, any>) => 
      ['fuelOrders', filters ?? {}] as const,
  },

  // Aircraft related queries
  aircraft: {
    types: () => ['aircraftTypes'] as const,
    classifications: () => ['aircraftClassifications'] as const,
    configurations: () => ['aircraftConfigurations'] as const,
    instances: (filters?: Record<string, any>) => 
      ['aircraftInstances', filters ?? {}] as const,
  },

  // Fee management queries
  fees: {
    globalSchedule: () => ['globalFeeSchedule'] as const,
    rules: (filters?: Record<string, any>) => 
      ['feeRules', filters ?? {}] as const,
    scheduleVersions: () => ['feeScheduleVersions'] as const,
    generalCategory: () => ['generalFeeCategory'] as const,
    generalRules: (categoryId?: number) => 
      ['generalFeeRules', categoryId] as const,
  },

  // Waiver related queries
  waivers: {
    tiers: () => ['waiverTiers'] as const,
  },

  // User and permissions
  user: {
    permissions: (userId?: number) => 
      ['user', 'permissions', userId] as const,
  },

  // Receipts
  receipts: (filters?: Record<string, any>) => 
    ['receipts', filters ?? {}] as const,
} as const

// Helper function to get all keys for invalidation
export const getAllFuelKeys = () => [
  queryKeys.fuel.types(),
  queryKeys.fuel.prices(),
  queryKeys.fuel.orders(),
]

export const getAllFeeKeys = () => [
  queryKeys.fees.globalSchedule(),
  queryKeys.fees.rules(),
  queryKeys.fees.scheduleVersions(),
  queryKeys.fees.generalCategory(),
  queryKeys.fees.generalRules(),
]

export const getAllAircraftKeys = () => [
  queryKeys.aircraft.types(),
  queryKeys.aircraft.classifications(),
  queryKeys.aircraft.configurations(),
  queryKeys.aircraft.instances(),
]

// Legacy key mappings for gradual migration
export const legacyKeyMappings = {
  'fuel-types': queryKeys.fuel.types(),
  'fuel-prices': queryKeys.fuel.prices(),
  'fuelOrders': queryKeys.fuel.orders(),
  'aircraftTypes': queryKeys.aircraft.types(),
  'aircraftClassifications': queryKeys.aircraft.classifications(),
  'aircraft-classifications': queryKeys.aircraft.classifications(),
  'aircraft-configurations': queryKeys.aircraft.configurations(),
  'global-fee-schedule': queryKeys.fees.globalSchedule(),
  'fee-rules': queryKeys.fees.rules(),
  'fee-schedule-versions': queryKeys.fees.scheduleVersions(),
  'general-fee-category': queryKeys.fees.generalCategory(),
  'waiver-tiers': queryKeys.waivers.tiers(),
} as const 