import { vi, describe, it, expect, beforeEach, afterEach, Mock } from 'vitest';
import { 
  register, RegistrationRequest, RegistrationResponse,
  login, LoginRequest, LoginResponse,
  fetchUserPermissions, UserPermissionsResponse,
  logout,
  getCurrentUser,
  isAuthenticated
} from '../../app/services/auth-service';
import { API_BASE_URL, getAuthHeaders } from '../../app/services/api-config'; // We need this for the fetch assertion

// Mock global fetch
global.fetch = vi.fn();

// Mock localStorage
let store: Record<string, string> = {};
const localStorageMock = {
  getItem: vi.fn((key: string) => store[key] || null),
  setItem: vi.fn((key: string, value: string) => { store[key] = value; }),
  removeItem: vi.fn((key: string) => { delete store[key]; }),
  clear: vi.fn(() => { store = {}; }),
};
vi.stubGlobal('localStorage', localStorageMock);
// Mock console.error for specific tests
const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});


describe('register', () => {
  beforeEach(() => {
    store = {}; // Clear store
    (fetch as Mock).mockClear();
    localStorageMock.getItem.mockClear();
    localStorageMock.setItem.mockClear();
    localStorageMock.removeItem.mockClear();
    localStorageMock.clear.mockClear();
    consoleErrorSpy.mockClear();
  });

  afterEach(() => {
    vi.clearAllMocks(); // Clear all mocks after each test
  });

  // Test Case 1: Successful Registration
  it('should call fetch with correct parameters and return data on successful registration', async () => {
    const mockRequestData: RegistrationRequest = {
      email: 'test@example.com',
      password: 'password123',
      name: 'Test User',
      username: 'testuser',
    };
    const expectedResponse: RegistrationResponse = {
      message: 'User registered successfully',
      user: { id: 1, email: 'test@example.com', name: 'Test User' },
    };

    (fetch as Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => expectedResponse, // handleApiResponse will call this
      headers: new Headers({ 'Content-Type': 'application/json' }),
    } as Response);

    const result = await register(mockRequestData);

    expect(fetch).toHaveBeenCalledWith(`${API_BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(mockRequestData),
    });
    expect(result).toEqual(expectedResponse);
  });

  // Test Case 2: API Error (e.g., 409 Conflict - Email already exists)
  it('should throw an error if fetch returns an error response (e.g., email exists)', async () => {
    const mockRequestData: RegistrationRequest = {
      email: 'existing@example.com',
      password: 'password123',
    };
    const apiErrorText = "Email already exists";
    
    (fetch as Mock).mockResolvedValueOnce({
      ok: false,
      status: 409,
      statusText: "Conflict", // Often included in Response
      text: async () => apiErrorText, // handleApiResponse uses text() for non-ok
      headers: new Headers({ 'Content-Type': 'application/json' }),
    } as Response);

    // The actual error message will be formatted by handleApiResponse
    // "API error (409): Email already exists"
    await expect(register(mockRequestData)).rejects.toThrow(`API error (409): ${apiErrorText}`);
  });

  // Test Case 3: Validation Error (e.g., 400 Bad Request - Password too weak)
  it('should throw an error for validation failure (e.g., weak password)', async () => {
    const mockRequestData: RegistrationRequest = {
      email: 'test@example.com',
      password: 'weak',
    };
    const validationErrorText = "Password too weak";

    (fetch as Mock).mockResolvedValueOnce({
      ok: false,
      status: 400,
      statusText: "Bad Request",
      text: async () => validationErrorText,
      headers: new Headers({ 'Content-Type': 'application/json' }),
    } as Response);
    
    // The actual error message will be formatted by handleApiResponse
    // "API error (400): Password too weak"
    await expect(register(mockRequestData)).rejects.toThrow(`API error (400): ${validationErrorText}`);
  });

  // Test Case 4: Network or other fetch-related error (not an HTTP error status)
  it('should throw an error if fetch itself fails (e.g., network error)', async () => {
    const mockRequestData: RegistrationRequest = {
      email: 'test@example.com',
      password: 'password123',
    };
    const networkError = new Error("Network request failed");

    (fetch as Mock).mockRejectedValueOnce(networkError);

    // handleApiResponse will catch this and re-throw "Failed to parse API response" 
    // if it can't parse, or the original error if parsing not attempted.
    // Given the structure of handleApiResponse, it would likely throw the networkError directly if fetch fails before response.ok check
    // However, our handleApiResponse has a try/catch around the whole thing, so if fetch fails, it will be caught by
    // the outer catch in handleApiResponse, which then throws "Failed to parse API response".
    // Let's adjust to what the register function itself would see.
    // The error from register will be what handleApiResponse throws.
    // The specific error message depends on the implementation of handleApiResponse.
    // If fetch itself throws (network error), handleApiResponse's try-catch for parsing won't be the primary handler.
    // The primary handler would be the catch (error) in the register function, which calls handleApiResponse.
    // If fetch fails, handleApiResponse is not even called. The error is caught by the try/catch in register.
    // Ah, no, register does: `return handleApiResponse<RegistrationResponse>(response);`
    // So, if fetch fails, the error bubbles up. The `handleApiResponse` is not called.
    // The `try...catch` block in `register` is not present, it's in `login`.
    // The register function is:
    // export async function register(userData: RegistrationRequest): Promise<RegistrationResponse> {
    //   const response = await fetch(`${API_BASE_URL}/auth/register`, { ... });
    //   return handleApiResponse<RegistrationResponse>(response);
    // }
    // So if fetch fails, the error from fetch will propagate.
    // Let's test that.

    await expect(register(mockRequestData)).rejects.toThrow("Network request failed");
  });
});

describe('login', () => {
  beforeEach(() => {
    store = {};
    (fetch as Mock).mockClear();
    localStorageMock.setItem.mockClear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should call fetch with correct parameters, store user data, and return response on successful login', async () => {
    const credentials: LoginRequest = { email: 'user@example.com', password: 'password' };
    const mockUser = { id: 1, email: 'user@example.com', name: 'Test User', roles: ['user'], is_active: true, created_at: new Date().toISOString(), username: 'testuser' };
    const mockToken = 'mock-jwt-token';
    const mockLoginApiResponse: LoginResponse = {
      user: mockUser,
      token: mockToken,
    };

    (fetch as Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockLoginApiResponse,
      headers: new Headers({ 'Content-Type': 'application/json' }),
    } as Response);

    const result = await login(credentials);

    expect(fetch).toHaveBeenCalledWith(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials),
    });

    const expectedStoredData = {
      ...mockUser,
      access_token: mockToken,
      isLoggedIn: true,
    };
    expect(localStorageMock.setItem).toHaveBeenCalledWith('fboUser', JSON.stringify(expectedStoredData));
    expect(result).toEqual(mockLoginApiResponse);
  });

  it('should throw an error and not store data on failed login (e.g., 401)', async () => {
    const credentials: LoginRequest = { email: 'wrong@example.com', password: 'wrongpassword' };
    const apiErrorText = "Invalid credentials";

    (fetch as Mock).mockResolvedValueOnce({
      ok: false,
      status: 401,
      text: async () => apiErrorText,
      headers: new Headers({ 'Content-Type': 'application/json' }),
    } as Response);

    await expect(login(credentials)).rejects.toThrow(`Login failed: API error (401): ${apiErrorText}`);
    expect(localStorageMock.setItem).not.toHaveBeenCalled();
  });
});

describe('fetchUserPermissions', () => {
  beforeEach(() => {
    store = {};
    (fetch as Mock).mockClear();
    localStorageMock.getItem.mockClear();
  });
  
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch user permissions successfully', async () => {
    const mockPermissions = ["view_dashboard", "manage_users"];
    const mockPermissionsResponse: UserPermissionsResponse = {
      message: "Permissions fetched",
      permissions: mockPermissions,
    };
    const mockUserWithToken = { access_token: 'valid-token', id: 1, email: 'test@example.com' };
    localStorageMock.getItem.mockReturnValueOnce(JSON.stringify(mockUserWithToken));


    (fetch as Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockPermissionsResponse,
      headers: new Headers({ 'Content-Type': 'application/json' }),
    } as Response);

    const result = await fetchUserPermissions();

    expect(localStorageMock.getItem).toHaveBeenCalledWith('fboUser');
    expect(fetch).toHaveBeenCalledWith(`${API_BASE_URL}/auth/me/permissions`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${mockUserWithToken.access_token}`,
        'Content-Type': 'application/json',
      },
    });
    expect(result).toEqual(mockPermissions);
  });

  it('should throw an error if fetching permissions fails (e.g., 403)', async () => {
    const apiErrorText = "Forbidden";
    const mockUserWithToken = { access_token: 'valid-token', id: 1, email: 'test@example.com' };
    localStorageMock.getItem.mockReturnValueOnce(JSON.stringify(mockUserWithToken));

    (fetch as Mock).mockResolvedValueOnce({
      ok: false,
      status: 403,
      text: async () => apiErrorText,
      headers: new Headers({ 'Content-Type': 'application/json' }),
    } as Response);

    await expect(fetchUserPermissions()).rejects.toThrow(`Failed to fetch permissions: API error (403): ${apiErrorText}`);
  });
});


describe('logout', () => {
  beforeEach(() => {
    store = {};
    localStorageMock.removeItem.mockClear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should remove "fboUser" from localStorage', () => {
    logout();
    expect(localStorageMock.removeItem).toHaveBeenCalledWith('fboUser');
  });
});

describe('getCurrentUser', () => {
  beforeEach(() => {
    store = {};
    localStorageMock.getItem.mockClear();
    consoleErrorSpy.mockClear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should return parsed user data if "fboUser" exists in localStorage', () => {
    const mockUser = { email: 'test@user.com', id: 1 };
    localStorageMock.getItem.mockReturnValueOnce(JSON.stringify(mockUser));
    expect(getCurrentUser()).toEqual(mockUser);
    expect(localStorageMock.getItem).toHaveBeenCalledWith('fboUser');
  });

  it('should return null if "fboUser" does not exist in localStorage', () => {
    localStorageMock.getItem.mockReturnValueOnce(null);
    expect(getCurrentUser()).toBeNull();
  });

  it('should return null and log an error if "fboUser" data is corrupted JSON', () => {
    localStorageMock.getItem.mockReturnValueOnce('invalid-json-string');
    expect(getCurrentUser()).toBeNull();
    expect(consoleErrorSpy).toHaveBeenCalledWith("Error parsing user data", expect.any(SyntaxError));
  });
});

describe('isAuthenticated', () => {
  beforeEach(() => {
    store = {};
    localStorageMock.getItem.mockClear();
  });
  
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should return true if user data exists and isLoggedIn is true', () => {
    localStorageMock.getItem.mockReturnValueOnce(JSON.stringify({ email: 'test@user.com', isLoggedIn: true }));
    expect(isAuthenticated()).toBe(true);
  });

  it('should return false if user data exists but isLoggedIn is false', () => {
    localStorageMock.getItem.mockReturnValueOnce(JSON.stringify({ email: 'test@user.com', isLoggedIn: false }));
    expect(isAuthenticated()).toBe(false);
  });

  it('should return false if user data exists but isLoggedIn is missing', () => {
    localStorageMock.getItem.mockReturnValueOnce(JSON.stringify({ email: 'test@user.com' }));
    expect(isAuthenticated()).toBe(false);
  });

  it('should return false if no user data exists in localStorage', () => {
    localStorageMock.getItem.mockReturnValueOnce(null);
    expect(isAuthenticated()).toBe(false);
  });
});
