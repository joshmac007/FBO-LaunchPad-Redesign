import { vi, describe, it, expect, beforeEach, afterEach, Mock } from 'vitest';
import {
  getAllFuelTrucks,
  getFuelTruckById,
  createFuelTruck,
  updateFuelTruck,
  deleteFuelTruck,
  FuelTruck,
  FuelTruckCreateRequest,
  FuelTruckUpdateRequest,
} from '../../app/services/fuel-truck-service';
// Assuming internal response types are not exported from service,
// define simplified versions for mocking if needed.
// For fuel-truck-service, BackendFuelTruckDetailResponse is { message: string, fuel_truck: FuelTruck }
// and BackendFuelTruckListResponse is { message: string, fuel_trucks: FuelTruck[] }

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

// Sample FuelTruck data
const mockFuelTruck1: FuelTruck = { id: 1, truck_number: 'T001', fuel_type: 'Jet A', capacity: 5000, current_meter_reading: 2500, is_active: true, created_at: '2023-01-01T00:00:00Z', updated_at: '2023-01-01T00:00:00Z' };
const mockFuelTruck2: FuelTruck = { id: 2, truck_number: 'T002', fuel_type: 'Avgas', capacity: 3000, current_meter_reading: 1500, is_active: false, created_at: '2023-01-02T00:00:00Z', updated_at: '2023-01-02T00:00:00Z' };

describe('Fuel Truck Service', () => {
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

  // --- getAllFuelTrucks ---
  describe('getAllFuelTrucks', () => {
    it('should fetch all fuel trucks successfully', async () => {
      const mockApiResponse = { fuel_trucks: [mockFuelTruck1, mockFuelTruck2], message: 'Success' };
      (fetch as Mock).mockResolvedValueOnce({
        ok: true, json: async () => mockApiResponse, headers: new Headers({ 'Content-Type': 'application/json' }),
      } as Response);

      const result = await getAllFuelTrucks();
      expect(fetch).toHaveBeenCalledWith(`${API_BASE_URL}/fuel-trucks/`, expect.any(Object));
      expect(result).toEqual([mockFuelTruck1, mockFuelTruck2]);
    });

    it('should fetch fuel trucks with is_active filter', async () => {
      const mockApiResponse = { fuel_trucks: [mockFuelTruck1], message: 'Filtered' };
      (fetch as Mock).mockResolvedValueOnce({
        ok: true, json: async () => mockApiResponse, headers: new Headers({ 'Content-Type': 'application/json' }),
      } as Response);

      const result = await getAllFuelTrucks({ is_active: 'true' });
      expect(fetch).toHaveBeenCalledWith(`${API_BASE_URL}/fuel-trucks/?is_active=true`, expect.any(Object));
      expect(result).toEqual([mockFuelTruck1]);
    });

    it('should throw an error on API failure', async () => {
      (fetch as Mock).mockResolvedValueOnce({ ok: false, status: 500, text: async () => "Server Error" } as Response);
      await expect(getAllFuelTrucks()).rejects.toThrow('API error (500): Server Error');
    });
  });

  // --- getFuelTruckById ---
  describe('getFuelTruckById', () => {
    it('should fetch a fuel truck by ID successfully', async () => {
      const mockApiResponse = { fuel_truck: mockFuelTruck1, message: 'Success' };
      (fetch as Mock).mockResolvedValueOnce({
        ok: true, json: async () => mockApiResponse, headers: new Headers({ 'Content-Type': 'application/json' }),
      } as Response);

      const result = await getFuelTruckById(1);
      expect(fetch).toHaveBeenCalledWith(`${API_BASE_URL}/fuel-trucks/1`, expect.any(Object));
      expect(result).toEqual(mockFuelTruck1);
    });

    it('should return null for a 404 Not Found error', async () => {
      (fetch as Mock).mockResolvedValueOnce({ ok: false, status: 404, text: async () => "Not Found" } as Response);
      const result = await getFuelTruckById(999);
      expect(result).toBeNull();
    });

    it('should throw an error on other API failures', async () => {
      (fetch as Mock).mockResolvedValueOnce({ ok: false, status: 500, text: async () => "Server Error" } as Response);
      await expect(getFuelTruckById(1)).rejects.toThrow('API error (500): Server Error');
    });
  });

  // --- createFuelTruck ---
  describe('createFuelTruck', () => {
    const createData: FuelTruckCreateRequest = { truck_number: 'T003', fuel_type: 'Diesel', capacity: 7000, current_meter_reading: 0 };
    const createdTruck: FuelTruck = { id: 3, ...createData, is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
    
    it('should create a fuel truck successfully', async () => {
      const mockApiResponse = { fuel_truck: createdTruck, message: 'Created' };
      (fetch as Mock).mockResolvedValueOnce({
        ok: true, json: async () => mockApiResponse, headers: new Headers({ 'Content-Type': 'application/json' }),
      } as Response);

      const result = await createFuelTruck(createData);
      expect(fetch).toHaveBeenCalledWith(`${API_BASE_URL}/fuel-trucks/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer test-token' },
        body: JSON.stringify(createData),
      });
      expect(result).toEqual(createdTruck);
    });

    it('should throw an error on API failure (e.g., 400)', async () => {
      (fetch as Mock).mockResolvedValueOnce({ ok: false, status: 400, text: async () => "Bad Request" } as Response);
      await expect(createFuelTruck(createData)).rejects.toThrow('API error (400): Bad Request');
    });
  });

  // --- updateFuelTruck ---
  describe('updateFuelTruck', () => {
    const updateData: FuelTruckUpdateRequest = { capacity: 5500, is_active: false };
    const updatedTruck: FuelTruck = { ...mockFuelTruck1, ...updateData };

    it('should update a fuel truck successfully', async () => {
      const mockApiResponse = { fuel_truck: updatedTruck, message: 'Updated' };
      (fetch as Mock).mockResolvedValueOnce({
        ok: true, json: async () => mockApiResponse, headers: new Headers({ 'Content-Type': 'application/json' }),
      } as Response);

      const result = await updateFuelTruck(1, updateData);
      expect(fetch).toHaveBeenCalledWith(`${API_BASE_URL}/fuel-trucks/1`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer test-token' },
        body: JSON.stringify(updateData),
      });
      expect(result).toEqual(updatedTruck);
    });

    it('should throw an error on API failure', async () => {
      (fetch as Mock).mockResolvedValueOnce({ ok: false, status: 500, text: async () => "Server Error" } as Response);
      await expect(updateFuelTruck(1, updateData)).rejects.toThrow('API error (500): Server Error');
    });
  });

  // --- deleteFuelTruck ---
  describe('deleteFuelTruck', () => {
    it('should delete a fuel truck successfully', async () => {
      const mockSuccessResponse = { message: 'Fuel truck deleted' };
      (fetch as Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockSuccessResponse,
        headers: new Headers({ 'Content-Type': 'application/json' }),
      } as Response);

      const result = await deleteFuelTruck(1);
      expect(fetch).toHaveBeenCalledWith(`${API_BASE_URL}/fuel-trucks/1`, {
        method: 'DELETE',
        headers: { 'Authorization': 'Bearer test-token', 'Content-Type': 'application/json' },
      });
      expect(result).toEqual(mockSuccessResponse);
    });

    it('should throw an error on API failure', async () => {
      (fetch as Mock).mockResolvedValueOnce({ ok: false, status: 409, text: async () => "Conflict" } as Response);
      await expect(deleteFuelTruck(1)).rejects.toThrow('API error (409): Conflict');
    });
  });
});
