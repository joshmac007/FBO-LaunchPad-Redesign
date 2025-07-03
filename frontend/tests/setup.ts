/**
 * Test setup configuration for Receipt System tests
 * 
 * This file configures the testing environment for comprehensive receipt system testing,
 * including mocks, test utilities, and global setup following TDD principles.
 */

import { beforeAll, afterEach, vi } from 'vitest'
import { cleanup } from '@testing-library/react'
import '@testing-library/jest-dom'

// Global test setup
beforeAll(() => {
  // Mock window.localStorage
  const localStorageMock = {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
  }
  
  Object.defineProperty(window, 'localStorage', {
    value: localStorageMock
  })

  // Mock window.location
  Object.defineProperty(window, 'location', {
    value: {
      href: 'http://localhost:3000',
      origin: 'http://localhost:3000',
      pathname: '/',
      search: '',
      hash: ''
    },
    writable: true
  })

  // Mock Date.now for consistent timestamps in tests
  const mockDateNow = vi.fn(() => 1640995200000) // 2022-01-01T00:00:00.000Z
  vi.stubGlobal('Date', {
    ...Date,
    now: mockDateNow
  })

  // Mock console methods to reduce test noise
  vi.stubGlobal('console', {
    ...console,
    warn: vi.fn(),
    error: vi.fn()
  })
})

// Cleanup after each test
afterEach(() => {
  cleanup()
  vi.clearAllMocks()
  localStorage.clear()
})

// Global test utilities
export const createMockResponse = (data: any, ok = true, status = 200) => ({
  ok,
  status,
  json: async () => data,
  text: async () => JSON.stringify(data)
})

export const createMockFetch = (response: any) => {
  return vi.fn().mockResolvedValue(createMockResponse(response))
}

// Mock fetch globally
global.fetch = vi.fn()

// Test data factories for consistent test data creation
export const createTestUser = (overrides = {}) => ({
  id: 1,
  email: 'test@example.com',
  first_name: 'Test',
  last_name: 'User',
  role: 'CSR',
  ...overrides
})

export const createTestCustomer = (overrides = {}) => ({
  id: 1,
  name: 'Test Customer',
  email: 'customer@example.com',
  is_placeholder: false,
  is_caa_member: false,
  ...overrides
})

export const createTestFuelOrder = (overrides = {}) => ({
  id: 1,
  tail_number: 'N12345',
  fuel_type: 'JET_A',
  requested_amount: '100.00',
  gallons_dispensed: '100.00',
  status: 'COMPLETED',
  customer_id: 1,
  ...overrides
})

// Error simulation utilities
export const simulateNetworkError = () => {
  return vi.fn().mockRejectedValue(new Error('Network error'))
}

export const simulateApiError = (status = 500, message = 'Internal Server Error') => {
  return vi.fn().mockResolvedValue({
    ok: false,
    status,
    json: async () => ({ error: message })
  })
}

// DOM testing utilities
export const findByTextContent = (text: string) => {
  return (content: string, element: Element | null) => {
    return element?.textContent === text
  }
}

export const hasClass = (className: string) => {
  return (element: Element) => {
    return element.classList.contains(className)
  }
}

// Date utilities for testing
export const mockDateNow = (timestamp: number) => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date(timestamp))
}

export const restoreRealTimers = () => {
  vi.useRealTimers()
}

// Async testing utilities
export const waitForNextTick = () => new Promise(resolve => setTimeout(resolve, 0))

export const waitForCondition = async (
  condition: () => boolean,
  timeout = 1000,
  interval = 10
) => {
  const start = Date.now()
  while (!condition()) {
    if (Date.now() - start > timeout) {
      throw new Error('Condition not met within timeout')
    }
    await new Promise(resolve => setTimeout(resolve, interval))
  }
}