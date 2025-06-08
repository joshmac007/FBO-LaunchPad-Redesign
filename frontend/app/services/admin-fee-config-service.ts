// Admin Fee Configuration Service
// Handles all API interactions for FBO fee configuration management

// Types based on the backend API schemas
export interface FeeCategory {
  id: number;
  name: string;
  fbo_location_id: number;
}

export interface FeeRule {
  id: number;
  fee_name: string;
  fee_code: string;
  applies_to_fee_category_id: number;
  amount: number;
  calculation_basis: 'PER_GALLON' | 'FIXED_PRICE' | 'PER_UNIT_SERVICE';
  waiver_strategy: 'MINIMUM_FUEL' | 'PERCENTAGE_DISCOUNT' | 'TIERED_DISCOUNT' | 'NO_WAIVER';
  has_caa_override: boolean;
  caa_override_amount?: number;
  caa_override_calculation_basis?: 'PER_GALLON' | 'FIXED_PRICE' | 'PER_UNIT_SERVICE';
  caa_override_waiver_strategy?: 'MINIMUM_FUEL' | 'PERCENTAGE_DISCOUNT' | 'TIERED_DISCOUNT' | 'NO_WAIVER';
  multiplier?: number;
  fbo_location_id: number;
}

export interface AircraftMapping {
  id: number;
  aircraft_type_id: number;
  fee_category_id: number;
  fbo_location_id: number;
}

export interface WaiverTier {
  id: number;
  tier_name: string;
  minimum_fuel_gallons?: number;
  discount_percentage?: number;
  applies_to_fee_rule_ids: number[];
  fbo_location_id: number;
}

export interface CreateFeeCategoryRequest {
  name: string;
}

export interface UpdateFeeCategoryRequest {
  name: string;
}

export interface CreateFeeRuleRequest {
  fee_name: string;
  fee_code: string;
  applies_to_fee_category_id: number;
  amount: number;
  calculation_basis: 'PER_GALLON' | 'FIXED_PRICE' | 'PER_UNIT_SERVICE';
  waiver_strategy: 'MINIMUM_FUEL' | 'PERCENTAGE_DISCOUNT' | 'TIERED_DISCOUNT' | 'NO_WAIVER';
  has_caa_override: boolean;
  caa_override_amount?: number;
  caa_override_calculation_basis?: 'PER_GALLON' | 'FIXED_PRICE' | 'PER_UNIT_SERVICE';
  caa_override_waiver_strategy?: 'MINIMUM_FUEL' | 'PERCENTAGE_DISCOUNT' | 'TIERED_DISCOUNT' | 'NO_WAIVER';
  multiplier?: number;
}

export interface UpdateFeeRuleRequest extends CreateFeeRuleRequest {}

export interface CreateWaiverTierRequest {
  tier_name: string;
  minimum_fuel_gallons?: number;
  discount_percentage?: number;
  applies_to_fee_rule_ids: number[];
}

export interface UpdateWaiverTierRequest extends CreateWaiverTierRequest {}

export interface ApiError {
  error: string;
  details?: any;
}

// Base API configuration
const API_BASE = process.env.NEXT_PUBLIC_API_URL || '';

// Helper function to get auth headers
const getAuthHeaders = () => {
  const token = localStorage.getItem('authToken');
  return {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` })
  };
};

// Helper function to handle API responses
const handleResponse = async <T>(response: Response): Promise<T> => {
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'An error occurred' }));
    throw {
      status: response.status,
      message: errorData.error || `HTTP ${response.status}`,
      details: errorData
    };
  }
  
  if (response.status === 204) {
    return {} as T;
  }
  
  return response.json();
};

// Fee Categories Service
export const getFeeCategories = async (fboId: number): Promise<FeeCategory[]> => {
  const response = await fetch(`${API_BASE}/api/admin/fbo/${fboId}/fee-categories`, {
    method: 'GET',
    headers: getAuthHeaders(),
  });
  
  return handleResponse<FeeCategory[]>(response);
};

export const createFeeCategory = async (fboId: number, data: CreateFeeCategoryRequest): Promise<FeeCategory> => {
  const response = await fetch(`${API_BASE}/api/admin/fbo/${fboId}/fee-categories`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });
  
  return handleResponse<FeeCategory>(response);
};

export const updateFeeCategory = async (fboId: number, categoryId: number, data: UpdateFeeCategoryRequest): Promise<FeeCategory> => {
  const response = await fetch(`${API_BASE}/api/admin/fbo/${fboId}/fee-categories/${categoryId}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });
  
  return handleResponse<FeeCategory>(response);
};

export const deleteFeeCategory = async (fboId: number, categoryId: number): Promise<void> => {
  const response = await fetch(`${API_BASE}/api/admin/fbo/${fboId}/fee-categories/${categoryId}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  
  return handleResponse<void>(response);
};

// Fee Rules Service
export const getFeeRules = async (fboId: number): Promise<FeeRule[]> => {
  const response = await fetch(`${API_BASE}/api/admin/fbo/${fboId}/fee-rules`, {
    method: 'GET',
    headers: getAuthHeaders(),
  });
  
  return handleResponse<FeeRule[]>(response);
};

export const createFeeRule = async (fboId: number, data: CreateFeeRuleRequest): Promise<FeeRule> => {
  const response = await fetch(`${API_BASE}/api/admin/fbo/${fboId}/fee-rules`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });
  
  return handleResponse<FeeRule>(response);
};

export const updateFeeRule = async (fboId: number, ruleId: number, data: UpdateFeeRuleRequest): Promise<FeeRule> => {
  const response = await fetch(`${API_BASE}/api/admin/fbo/${fboId}/fee-rules/${ruleId}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });
  
  return handleResponse<FeeRule>(response);
};

export const deleteFeeRule = async (fboId: number, ruleId: number): Promise<void> => {
  const response = await fetch(`${API_BASE}/api/admin/fbo/${fboId}/fee-rules/${ruleId}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  
  return handleResponse<void>(response);
};

// Aircraft Type to Fee Category Mapping Service
export const getAircraftMappings = async (fboId: number): Promise<AircraftMapping[]> => {
  const response = await fetch(`${API_BASE}/api/admin/fbo/${fboId}/aircraft-mappings`, {
    method: 'GET',
    headers: getAuthHeaders(),
  });
  
  return handleResponse<AircraftMapping[]>(response);
};

export const uploadAircraftMappings = async (fboId: number, csvFile: File): Promise<{ created: number; updated: number }> => {
  const formData = new FormData();
  formData.append('csv_file', csvFile);
  
  const token = localStorage.getItem('authToken');
  const headers: Record<string, string> = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  const response = await fetch(`${API_BASE}/api/admin/fbo/${fboId}/aircraft-mappings/upload`, {
    method: 'POST',
    headers,
    body: formData,
  });
  
  return handleResponse<{ created: number; updated: number }>(response);
};

// Waiver Tiers Service
export const getWaiverTiers = async (fboId: number): Promise<WaiverTier[]> => {
  const response = await fetch(`${API_BASE}/api/admin/fbo/${fboId}/waiver-tiers`, {
    method: 'GET',
    headers: getAuthHeaders(),
  });
  
  return handleResponse<WaiverTier[]>(response);
};

export const createWaiverTier = async (fboId: number, data: CreateWaiverTierRequest): Promise<WaiverTier> => {
  const response = await fetch(`${API_BASE}/api/admin/fbo/${fboId}/waiver-tiers`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });
  
  return handleResponse<WaiverTier>(response);
};

export const updateWaiverTier = async (fboId: number, tierId: number, data: UpdateWaiverTierRequest): Promise<WaiverTier> => {
  const response = await fetch(`${API_BASE}/api/admin/fbo/${fboId}/waiver-tiers/${tierId}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });
  
  return handleResponse<WaiverTier>(response);
};

export const deleteWaiverTier = async (fboId: number, tierId: number): Promise<void> => {
  const response = await fetch(`${API_BASE}/api/admin/fbo/${fboId}/waiver-tiers/${tierId}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  
  return handleResponse<void>(response);
};

// Export all functions for easy importing
export const AdminFeeConfigService = {
  // Fee Categories
  getFeeCategories,
  createFeeCategory,
  updateFeeCategory,
  deleteFeeCategory,
  
  // Fee Rules
  getFeeRules,
  createFeeRule,
  updateFeeRule,
  deleteFeeRule,
  
  // Aircraft Mappings
  getAircraftMappings,
  uploadAircraftMappings,
  
  // Waiver Tiers
  getWaiverTiers,
  createWaiverTier,
  updateWaiverTier,
  deleteWaiverTier,
};

export default AdminFeeConfigService; 