import { vi, describe, it, expect, beforeEach, afterEach, Mock } from 'vitest';
import {
  createFuelOrder,
  getFuelOrders,
  updateFuelOrderStatus,
  FuelOrder,
  FuelOrderCreateRequest,
  FuelOrderStatusUpdateRequest,
  // Assuming response types based on typical service structure and API docs
  // FuelOrderCreateResponseSchema is likely { message: string, fuel_order: FuelOrder }
  // FuelOrderListResponseSchema is likely { orders: FuelOrder[], message: string, pagination?: any }
  // For updateFuelOrderStatus, the API Doc 2.4 says it returns the updated FuelOrder directly.
} from '../../app/services/fuel-order-service';
import { API_BASE_URL } from '../../app/services/api-config';

// Mock global fetch
global.fetch = vi.fn();

// Mock localStorage for getAuthHeaders
let store: Record<string, string> = {};
const localStorageMock = {
  getItem: vi.fn((key: string) => store[key] || null),
  setItem: vi.fn((key: string, value: string) => { store[key] = value; }),
  removeItem: vi.fn((key: string) => { delete store[key]; }),
  clear: vi.fn(() => { store = {}; }),
};
vi.stubGlobal('localStorage', localStorageMock);

// Sample FuelOrder data
const mockFuelOrder1: FuelOrder = {
  id: 1,
  aircraft_id: 101,
  fuel_type: 'Jet A',
  quantity: 1000,
  unit: 'gallons',
  status: 'PENDING',
  priority: 'HIGH',
  notes: 'Urgent refuel',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  user_id: 1,
  tail_number: 'N123AA',
  customer_name: 'Test Customer Inc.',
};

const mockFuelOrder2: FuelOrder = {
  id: 2,
  aircraft_id: 102,
  fuel_type: 'Avgas 100LL',
  quantity: 100,
  unit: 'gallons',
  status: 'ACKNOWLEDGED',
  priority: 'MEDIUM',
  notes: '',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  user_id: 2,
  tail_number: 'N456BB',
  customer_name: 'Another Customer LLC',
  assigned_truck_id: 5,
};


describe('Fuel Order Service', () => {
  beforeEach(() => {
    (fetch as Mock).mockClear();
    localStorageMock.clear();
    localStorageMock.getItem.mockClear();
    localStorageMock.setItem.mockClear();
    localStorageMock.removeItem.mockClear();
    // Setup a default mock for localStorage.getItem('fboUser') for getAuthHeaders
    localStorageMock.getItem.mockReturnValue(JSON.stringify({ access_token: 'test-token' }));
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // --- createFuelOrder ---
  describe('createFuelOrder', () => {
    const orderData: FuelOrderCreateRequest = {
      aircraft_id: 101,
      fuel_type: 'Jet A',
      quantity: 1000,
      unit: 'gallons',
      priority: 'HIGH',
      notes: 'Urgent refuel',
    };
    const mockApiResponse = { message: 'Fuel order created', fuel_order: mockFuelOrder1 };

    it('should create a fuel order successfully', async () => {
      (fetch as Mock).mockResolvedValueOnce({
        ok: true, json: async () => mockApiResponse, headers: new Headers({ 'Content-Type': 'application/json' }),
      } as Response);

      const result = await createFuelOrder(orderData);
      expect(fetch).toHaveBeenCalledWith(`${API_BASE_URL}/fuel-orders/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer test-token' },
        body: JSON.stringify(orderData),
      });
      expect(result).toEqual(mockFuelOrder1); // Service returns fuel_order directly
    });

    it('should throw an error on API failure (e.g., 400 validation error)', async () => {
      (fetch as Mock).mockResolvedValueOnce({ ok: false, status: 400, text: async () => "Validation Error" } as Response);
      await expect(createFuelOrder(orderData)).rejects.toThrow('API error (400): Validation Error');
    });
  });

  // --- getFuelOrders ---
  describe('getFuelOrders', () => {
    const mockListResponse = { orders: [mockFuelOrder1, mockFuelOrder2], message: 'Success', pagination: { total: 2, page: 1, per_page: 10, total_pages: 1 } };

    it('should fetch fuel orders successfully with no filters', async () => {
      (fetch as Mock).mockResolvedValueOnce({
        ok: true, json: async () => mockListResponse, headers: new Headers({ 'Content-Type': 'application/json' }),
      } as Response);

      const result = await getFuelOrders();
      expect(fetch).toHaveBeenCalledWith(`${API_BASE_URL}/fuel-orders/`, expect.any(Object));
      expect(result).toEqual(mockListResponse); // Service returns the whole response object
    });

    it('should fetch fuel orders with status, page, and per_page filters', async () => {
      (fetch as Mock).mockResolvedValueOnce({
        ok: true, json: async () => ({ ...mockListResponse, orders: [mockFuelOrder1] }), headers: new Headers({ 'Content-Type': 'application/json' }),
      } as Response);

      const filters = { status: 'PENDING', page: 1, per_page: 10 };
      await getFuelOrders(filters);
      expect(fetch).toHaveBeenCalledWith(`${API_BASE_URL}/fuel-orders/?status=PENDING&page=1&per_page=10`, expect.any(Object));
    });
    
    it('should fetch fuel orders with only status filter', async () => {
      (fetch as Mock).mockResolvedValueOnce({
        ok: true, json: async () => ({ ...mockListResponse, orders: [mockFuelOrder1] }), headers: new Headers({ 'Content-Type': 'application/json' }),
      } as Response);
      const filters = { status: 'PENDING' };
      await getFuelOrders(filters);
      expect(fetch).toHaveBeenCalledWith(`${API_BASE_URL}/fuel-orders/?status=PENDING`, expect.any(Object));
    });


    it('should throw an error on API failure', async () => {
      (fetch as Mock).mockResolvedValueOnce({ ok: false, status: 500, text: async () => "Server Error" } as Response);
      await expect(getFuelOrders()).rejects.toThrow('API error (500): Server Error');
    });
  });

  // --- updateFuelOrderStatus ---
  describe('updateFuelOrderStatus', () => {
    const orderId = 1;
    const statusUpdateData: FuelOrderStatusUpdateRequest = { status: 'ACKNOWLEDGED', assigned_truck_id: 5 };
    // API Doc 2.4 says it returns the updated FuelOrder directly
    const mockUpdatedOrder: FuelOrder = { ...mockFuelOrder1, status: 'ACKNOWLEDGED', assigned_truck_id: 5 };

    it('should update fuel order status successfully', async () => {
      (fetch as Mock).mockResolvedValueOnce({
        ok: true, json: async () => mockUpdatedOrder, headers: new Headers({ 'Content-Type': 'application/json' }),
      } as Response);

      const result = await updateFuelOrderStatus(orderId, statusUpdateData);
      expect(fetch).toHaveBeenCalledWith(`${API_BASE_URL}/fuel-orders/${orderId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer test-token' },
        body: JSON.stringify(statusUpdateData),
      });
      expect(result).toEqual(mockUpdatedOrder);
    });

    it('should throw an error on API failure (e.g., 400 invalid transition)', async () => {
      (fetch as Mock).mockResolvedValueOnce({ ok: false, status: 400, text: async () => "Invalid status transition" } as Response);
      await expect(updateFuelOrderStatus(orderId, statusUpdateData)).rejects.toThrow('API error (400): Invalid status transition');
    });
  });
});
