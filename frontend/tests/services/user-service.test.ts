import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import {
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  getActiveLSTs,
  User,
  UserCreateRequest,
  UserUpdateRequest,
  UsersResponse, // Assuming this is { message: string, users: User[] }
  UserResponse,  // Assuming this is { message: string, user: User }
} from '../../app/services/user-service';
import { API_BASE_URL } from '../../app/services/api-config'; // For URL assertion
// getAuthHeaders is implicitly tested as service functions use it to make authed calls

// Mock global fetch
global.fetch = jest.fn() as jest.MockedFunction<typeof fetch>;

// Mock localStorage for getAuthHeaders
let store: Record<string, string> = {};
const localStorageMock = {
  getItem: jest.fn((key: string) => store[key] || null),
  setItem: jest.fn((key: string, value: string) => { store[key] = value; }),
  removeItem: jest.fn((key: string) => { delete store[key]; }),
  clear: jest.fn(() => { store = {}; }),
};
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// Sample User data for mocking - corrected to match User interface
const mockUser1: User = { 
  id: 1, 
  username: 'alice', 
  fullName: 'Alice Smith',
  email: 'alice@example.com', 
  roles: [{ id: 1, name: 'admin' }], 
  is_active: true, 
  created_at: '2023-01-01T00:00:00Z' 
};
const mockUser2: User = { 
  id: 2, 
  username: 'bob', 
  fullName: 'Bob Jones',
  email: 'bob@example.com', 
  roles: [{ id: 2, name: 'user' }], 
  is_active: false, 
  created_at: '2023-01-02T00:00:00Z' 
};

describe('User Service', () => {
  beforeEach(() => {
    (fetch as jest.MockedFunction<typeof fetch>).mockClear();
    localStorageMock.getItem.mockClear();
    localStorageMock.setItem.mockClear();
    localStorageMock.removeItem.mockClear();
    localStorageMock.clear.mockClear();
    // Setup a default mock for localStorage.getItem('fboUser') for getAuthHeaders
    localStorageMock.getItem.mockReturnValue(JSON.stringify({ access_token: 'test-token' }));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // --- getAllUsers ---
  describe('getAllUsers', () => {
    it('should fetch all users successfully', async () => {
      const mockApiResponse: UsersResponse = { message: 'Success', users: [mockUser1, mockUser2] };
      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockApiResponse,
        headers: new Headers({ 'Content-Type': 'application/json' }),
      } as Response);

      const result = await getAllUsers();
      expect(fetch).toHaveBeenCalledWith(`${API_BASE_URL}/users`, expect.any(Object));
      expect(result).toEqual([mockUser1, mockUser2]);
    });

    it('should fetch users with is_active filter', async () => {
      const mockApiResponse: UsersResponse = { message: 'Success', users: [mockUser1] };
      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockApiResponse,
        headers: new Headers({ 'Content-Type': 'application/json' }),
      } as Response);

      const result = await getAllUsers({ is_active: 'true' });
      expect(fetch).toHaveBeenCalledWith(`${API_BASE_URL}/users?is_active=true`, expect.any(Object));
      expect(result).toEqual([mockUser1]);
    });

    it('should fetch users with role_ids filter', async () => {
      const mockApiResponse: UsersResponse = { message: 'Success', users: [mockUser1] };
      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockApiResponse,
        headers: new Headers({ 'Content-Type': 'application/json' }),
      } as Response);

      const result = await getAllUsers({ role_ids: [1, 2] });
      expect(fetch).toHaveBeenCalledWith(`${API_BASE_URL}/users?role_ids=1&role_ids=2`, expect.any(Object));
      expect(result).toEqual([mockUser1]);
    });

    it('should fetch users with role filter', async () => {
      const mockApiResponse: UsersResponse = { message: 'Success', users: [mockUser1] };
      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockApiResponse,
        headers: new Headers({ 'Content-Type': 'application/json' }),
      } as Response);

          const result = await getAllUsers({ role: 'System Administrator' });
    expect(fetch).toHaveBeenCalledWith(`${API_BASE_URL}/users?role=System Administrator`, expect.any(Object));
      expect(result).toEqual([mockUser1]);
    });

    it('should throw an error on API failure', async () => {
      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: false, status: 500, text: async () => "Server Error"
      } as Response);
      await expect(getAllUsers()).rejects.toThrow('API error (500): Server Error');
    });
  });

  // --- getUserById ---
  describe('getUserById', () => {
    it('should fetch a user by ID successfully', async () => {
      const mockApiResponse: UserResponse = { message: 'Success', user: mockUser1 };
      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockApiResponse,
        headers: new Headers({ 'Content-Type': 'application/json' }),
      } as Response);

      const result = await getUserById(1);
      expect(fetch).toHaveBeenCalledWith(`${API_BASE_URL}/users/1`, expect.any(Object));
      expect(result).toEqual(mockUser1);
    });

    it('should throw an error for a 404 Not Found error', async () => {
      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: false, status: 404, text: async () => "Not Found"
      } as Response);
      await expect(getUserById(999)).rejects.toThrow('API error (404): Not Found');
    });

    it('should throw an error on other API failures', async () => {
      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: false, status: 500, text: async () => "Server Error"
      } as Response);
      await expect(getUserById(1)).rejects.toThrow('API error (500): Server Error');
    });
  });

  // --- createUser ---
  describe('createUser', () => {
    const createData: UserCreateRequest = { 
      email: 'new@example.com', 
      password: 'password', 
      role_ids: [1], 
      fullName: 'New User' 
    };
    it('should create a user successfully', async () => {
      const mockApiResponse: UserResponse = { message: 'Created', user: { ...mockUser1, ...createData, id:3 } };
      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockApiResponse,
        headers: new Headers({ 'Content-Type': 'application/json' }),
      } as Response);

      const result = await createUser(createData);
      expect(fetch).toHaveBeenCalledWith(`${API_BASE_URL}/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer test-token' },
        body: JSON.stringify(createData),
      });
      expect(result).toEqual(mockApiResponse.user);
    });

    it('should throw an error on API failure (e.g., 400)', async () => {
      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: false, status: 400, text: async () => "Bad Request"
      } as Response);
      await expect(createUser(createData)).rejects.toThrow('API error (400): Bad Request');
    });
  });

  // --- updateUser ---
  describe('updateUser', () => {
    const updateData: UserUpdateRequest = { fullName: 'Alice Updated' };
    it('should update a user successfully', async () => {
      const updatedUser = { ...mockUser1, ...updateData };
      const mockApiResponse: UserResponse = { message: 'Updated', user: updatedUser };
      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockApiResponse,
        headers: new Headers({ 'Content-Type': 'application/json' }),
      } as Response);

      const result = await updateUser(1, updateData);
      expect(fetch).toHaveBeenCalledWith(`${API_BASE_URL}/users/1`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer test-token' },
        body: JSON.stringify(updateData),
      });
      expect(result).toEqual(updatedUser);
    });

    it('should throw an error on API failure', async () => {
      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: false, status: 500, text: async () => "Server Error"
      } as Response);
      await expect(updateUser(1, updateData)).rejects.toThrow('API error (500): Server Error');
    });
  });

  // --- deleteUser ---
  describe('deleteUser', () => {
    it('should delete a user successfully', async () => {
      // Note: Updated to handle 204 response correctly as per the service implementation
      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        status: 204,
        text: async () => "", 
        headers: new Headers(),
      } as Response);

      const result = await deleteUser(1);
      expect(fetch).toHaveBeenCalledWith(`${API_BASE_URL}/users/1`, {
        method: 'DELETE',
        headers: { 'Authorization': 'Bearer test-token', 'Content-Type': 'application/json' },
      });
      expect(result).toEqual({ message: 'User deleted successfully' });
    });

    it('should throw an error on API failure', async () => {
      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: false, status: 500, text: async () => "Server Error"
      } as Response);
      await expect(deleteUser(1)).rejects.toThrow('API error (500): Server Error');
    });
  });

  // --- getActiveLSTs ---
  describe('getActiveLSTs', () => {
    const mockLST: User = {
      id: 3,
      username: 'lst1',
      fullName: 'LST User',
      email: 'lst@example.com',
      roles: [{ id: 3, name: 'LST' }],
      is_active: true
    };

    it('should fetch active LSTs successfully', async () => {
      // Mock the UserBriefResponse format that getActiveLSTs actually expects
      const mockBriefResponse = { 
        message: 'Success', 
        users: [{ 
          id: 3, 
          username: 'lst1', 
          email: 'lst@example.com', 
          name: 'LST User', 
          role: 'LST', 
          is_active: true 
        }] 
      };
      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockBriefResponse,
        headers: new Headers({ 'Content-Type': 'application/json' }),
      } as Response);

      const result = await getActiveLSTs();
      expect(fetch).toHaveBeenCalledWith(`${API_BASE_URL}/users?role=Line Service Technician&is_active=true`, expect.any(Object));
      
      // Expect the transformed result that getActiveLSTs returns
      expect(result).toEqual([{
        id: 3,
        username: 'lst1',
        fullName: 'LST User',
        email: 'lst@example.com',
        roles: [{ id: 0, name: 'LST' }],
        is_active: true,
        created_at: undefined
      }]);
    });

    it('should throw an error on API failure', async () => {
      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: false, status: 500, text: async () => "Server Error"
      } as Response);
      await expect(getActiveLSTs()).rejects.toThrow('API error (500): Server Error');
    });
  });
});
