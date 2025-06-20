import { vi, describe, it, expect, beforeEach, afterEach, Mock } from 'vitest';
import {
  getAllAdminAircraft,
  getAdminAircraftByTailNumber,
  createAdminAircraft,
  updateAdminAircraft,
  deleteAdminAircraft,
  getAircraftList,
  getAircraftByTailNumber as getPublicAircraftByTailNumber, // Alias to distinguish from admin version
  Aircraft,
  AdminAircraftCreateRequest,
  AdminAircraftUpdateRequest,
} from '../../app/services/aircraft-service';
// Import internal types for mocking backend responses, if they were exported (they are not, so define them here)
interface BackendAdminAircraft {
  id: number;
  tail_number: string;
  aircraft_type: string;
  fuel_type: string;
  customer_id?: number;
}
interface BackendAircraft {
  id: number;
  tail_number: string;
  aircraft_type: string;
  fuel_type: string;
}
interface AdminAircraftListResponse { // As defined in service
  aircraft: BackendAdminAircraft[];
  message: string;
}
interface AircraftListResponse { // As defined in service
  aircraft: BackendAircraft[];
  message: string;
}


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

// Mock data
const mockBackendAdminAircraft: BackendAdminAircraft = { id: 1, tail_number: 'N123', aircraft_type: 'Jet', fuel_type: 'Jet A', customer_id: 1 };
const mockBackendAircraft: BackendAircraft = { id: 2, tail_number: 'N456', aircraft_type: 'Piston', fuel_type: 'Avgas' };

const expectedMappedAdminAircraft: Aircraft = {
  id: 1,
  tailNumber: 'N123',
  type: 'Jet',
  model: 'N/A',
  owner: 'Customer ID: 1',
  homeBase: 'N/A',
  status: 'active',
  fuelCapacity: 0,
  preferredFuelType: 'Jet A',
  customer_id: 1,
  lastMaintenance: undefined,
  nextMaintenance: undefined,
  mtow: undefined,
  lastFaaSyncAt: undefined,
  previousOwner: undefined,
  ownershipChangeDate: undefined,
  ownershipChangeAcknowledged: undefined,
};

const expectedMappedPublicAircraft: Aircraft = {
  id: 2,
  tailNumber: 'N456',
  type: 'Piston',
  model: 'N/A',
  owner: 'N/A',
  homeBase: 'N/A',
  status: 'active',
  fuelCapacity: 0,
  preferredFuelType: 'Avgas',
  lastMaintenance: undefined,
  nextMaintenance: undefined,
  mtow: undefined,
  lastFaaSyncAt: undefined,
  previousOwner: undefined,
  ownershipChangeDate: undefined,
  ownershipChangeAcknowledged: undefined,
};


describe('Aircraft Service', () => {
  beforeEach(() => {
    (fetch as Mock).mockClear();
    localStorageMock.clear(); // Clears the store object
    localStorageMock.getItem.mockClear(); // Clears the mock function's call history etc.
    localStorageMock.setItem.mockClear();
    localStorageMock.removeItem.mockClear();
    // Setup a default mock for localStorage.getItem('fboUser') for getAuthHeaders
    localStorageMock.getItem.mockReturnValue(JSON.stringify({ access_token: 'test-token' }));
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // --- getAllAdminAircraft ---
  describe('getAllAdminAircraft', () => {
    it('should fetch and map admin aircraft successfully', async () => {
      const mockApiResponse: AdminAircraftListResponse = { aircraft: [mockBackendAdminAircraft], message: 'Success' };
      (fetch as Mock).mockResolvedValueOnce({
        ok: true, json: async () => mockApiResponse, headers: new Headers({ 'Content-Type': 'application/json' }),
      } as Response);
      const result = await getAllAdminAircraft();
      expect(fetch).toHaveBeenCalledWith(`${API_BASE_URL}/admin/aircraft/`, expect.any(Object));
      expect(result).toEqual([expectedMappedAdminAircraft]);
    });

    it('should fetch admin aircraft with customer_id filter', async () => {
      const mockApiResponse: AdminAircraftListResponse = { aircraft: [mockBackendAdminAircraft], message: 'Filtered' };
      (fetch as Mock).mockResolvedValueOnce({
        ok: true, json: async () => mockApiResponse, headers: new Headers({ 'Content-Type': 'application/json' }),
      } as Response);
      await getAllAdminAircraft({ customer_id: 1 });
      expect(fetch).toHaveBeenCalledWith(`${API_BASE_URL}/admin/aircraft/?customer_id=1`, expect.any(Object));
    });

    it('should throw an error on API failure', async () => {
      (fetch as Mock).mockResolvedValueOnce({ ok: false, status: 500, text: async () => "Server Error" } as Response);
      await expect(getAllAdminAircraft()).rejects.toThrow('API error (500): Server Error');
    });
  });

  // --- getAdminAircraftByTailNumber ---
  describe('getAdminAircraftByTailNumber', () => {
    it('should fetch and map a single admin aircraft successfully', async () => {
      (fetch as Mock).mockResolvedValueOnce({
        ok: true, json: async () => mockBackendAdminAircraft, headers: new Headers({ 'Content-Type': 'application/json' }),
      } as Response);
      const result = await getAdminAircraftByTailNumber('N123');
      expect(fetch).toHaveBeenCalledWith(`${API_BASE_URL}/admin/aircraft/N123`, expect.any(Object));
      expect(result).toEqual(expectedMappedAdminAircraft);
    });

    it('should return null for a 404 Not Found', async () => {
      (fetch as Mock).mockResolvedValueOnce({ ok: false, status: 404, text: async () => "Not Found" } as Response);
      const result = await getAdminAircraftByTailNumber('N000');
      expect(result).toBeNull();
    });
  });

  // --- createAdminAircraft ---
  describe('createAdminAircraft', () => {
    const createData: AdminAircraftCreateRequest = { tail_number: 'N789', aircraft_type: 'Heli', fuel_type: 'Jet B', customer_id: 2 };
    const backendResponse: BackendAdminAircraft = { ...createData, id: 3 };
    const mappedResponse: Aircraft = {
        id: 3, tailNumber: 'N789', type: 'Heli', model: 'N/A', owner: 'Customer ID: 2', homeBase: 'N/A',
        status: 'active', fuelCapacity: 0, preferredFuelType: 'Jet B', customer_id: 2,
        lastMaintenance: undefined, nextMaintenance: undefined, mtow: undefined, lastFaaSyncAt: undefined,
        previousOwner: undefined, ownershipChangeDate: undefined, ownershipChangeAcknowledged: undefined,
    };

    it('should create an admin aircraft and map the response', async () => {
      (fetch as Mock).mockResolvedValueOnce({
        ok: true, json: async () => backendResponse, headers: new Headers({ 'Content-Type': 'application/json' }),
      } as Response);
      const result = await createAdminAircraft(createData);
      expect(fetch).toHaveBeenCalledWith(`${API_BASE_URL}/admin/aircraft/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer test-token' },
        body: JSON.stringify(createData),
      });
      expect(result).toEqual(mappedResponse);
    });
  });

  // --- updateAdminAircraft ---
  describe('updateAdminAircraft', () => {
    const updateData: AdminAircraftUpdateRequest = { aircraft_type: 'SuperJet' };
    const backendResponse: BackendAdminAircraft = { ...mockBackendAdminAircraft, aircraft_type: 'SuperJet' };
     const mappedResponse: Aircraft = { ...expectedMappedAdminAircraft, type: 'SuperJet' };


    it('should update an admin aircraft and map the response', async () => {
      (fetch as Mock).mockResolvedValueOnce({
        ok: true, json: async () => backendResponse, headers: new Headers({ 'Content-Type': 'application/json' }),
      } as Response);
      const result = await updateAdminAircraft('N123', updateData);
      expect(fetch).toHaveBeenCalledWith(`${API_BASE_URL}/admin/aircraft/N123`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer test-token' },
        body: JSON.stringify(updateData),
      });
      expect(result).toEqual(mappedResponse);
    });
  });

  // --- deleteAdminAircraft ---
  describe('deleteAdminAircraft', () => {
    it('should send a delete request successfully (204 No Content)', async () => {
      (fetch as Mock).mockResolvedValueOnce({ ok: true, status: 204, text: async () => "" } as Response); // text for handleApiResponse
      await expect(deleteAdminAircraft('N123')).resolves.toBeUndefined(); // Or specific value if handleApiResponse is changed for 204
      expect(fetch).toHaveBeenCalledWith(`${API_BASE_URL}/admin/aircraft/N123`, {
        method: 'DELETE',
        headers: { 'Authorization': 'Bearer test-token', 'Content-Type': 'application/json' },
      });
    });
  });

  // --- getAircraftList ---
  describe('getAircraftList', () => {
    it('should fetch and map public aircraft list successfully', async () => {
      const mockApiResponse: AircraftListResponse = { aircraft: [mockBackendAircraft], message: 'Success' };
      (fetch as Mock).mockResolvedValueOnce({
        ok: true, json: async () => mockApiResponse, headers: new Headers({ 'Content-Type': 'application/json' }),
      } as Response);
      const result = await getAircraftList();
      expect(fetch).toHaveBeenCalledWith(`${API_BASE_URL}/aircraft/`, expect.any(Object));
      expect(result).toEqual([expectedMappedPublicAircraft]);
    });
  });

  // --- getPublicAircraftByTailNumber (aliased) ---
  describe('getPublicAircraftByTailNumber', () => {
    it('should fetch and map a single public aircraft successfully', async () => {
      (fetch as Mock).mockResolvedValueOnce({
        ok: true, json: async () => mockBackendAircraft, headers: new Headers({ 'Content-Type': 'application/json' }),
      } as Response);
      const result = await getPublicAircraftByTailNumber('N456');
      expect(fetch).toHaveBeenCalledWith(`${API_BASE_URL}/aircraft/N456`, expect.any(Object));
      expect(result).toEqual(expectedMappedPublicAircraft);
    });
     it('should return null for a 404 Not Found on public endpoint', async () => {
      (fetch as Mock).mockResolvedValueOnce({ ok: false, status: 404, text: async () => "Not Found" } as Response);
      const result = await getPublicAircraftByTailNumber('N000');
      expect(result).toBeNull();
    });
  });
});
