// Admin Fee Configuration Service
// Handles all API interactions for FBO fee configuration management

import { API_BASE_URL, handleApiResponse, getAuthHeaders } from "./api-config"

// Types based on the backend API schemas
export interface FeeCategory {
  id: number;
  name: string;
  fbo_location_id: number;
}

export interface FeeRule {
  id: number;
  fbo_location_id: number;
  fee_name: string;
  fee_code: string;
  applies_to_fee_category_id: number;
  amount: number;
  currency: string;
  is_taxable: boolean;
  is_potentially_waivable_by_fuel_uplift: boolean;
  calculation_basis: 'FIXED_PRICE' | 'PER_UNIT_SERVICE' | 'NOT_APPLICABLE';
  waiver_strategy: 'NONE' | 'SIMPLE_MULTIPLIER' | 'TIERED_MULTIPLIER';
  simple_waiver_multiplier?: number;
  has_caa_override: boolean;
  caa_override_amount?: number;
  caa_waiver_strategy_override?: 'NONE' | 'SIMPLE_MULTIPLIER' | 'TIERED_MULTIPLIER';
  caa_simple_waiver_multiplier_override?: number;
  created_at: string;
  updated_at: string;
}

export interface AircraftMapping {
  id: number;
  aircraft_type_id: number;
  aircraft_type_name: string;
  fee_category_id: number;
  fee_category_name: string;
  fbo_location_id: number;
  created_at: string;
  updated_at: string;
}

export interface WaiverTier {
  id: number;
  name: string;
  fuel_uplift_multiplier: number;
  fees_waived_codes: string[];
  tier_priority: number;
  is_caa_specific_tier: boolean;
  fbo_location_id: number;
  created_at: string;
  updated_at: string;
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
  currency?: string;
  is_taxable?: boolean;
  is_potentially_waivable_by_fuel_uplift?: boolean;
  calculation_basis: 'FIXED_PRICE' | 'PER_UNIT_SERVICE' | 'NOT_APPLICABLE';
  waiver_strategy: 'NONE' | 'SIMPLE_MULTIPLIER' | 'TIERED_MULTIPLIER';
  simple_waiver_multiplier?: number;
  has_caa_override: boolean;
  caa_override_amount?: number;
  caa_waiver_strategy_override?: 'NONE' | 'SIMPLE_MULTIPLIER' | 'TIERED_MULTIPLIER';
  caa_simple_waiver_multiplier_override?: number;
}

export interface UpdateFeeRuleRequest {
  fee_name?: string;
  fee_code?: string;
  applies_to_fee_category_id?: number;
  amount?: number;
  currency?: string;
  is_taxable?: boolean;
  is_potentially_waivable_by_fuel_uplift?: boolean;
  calculation_basis?: 'FIXED_PRICE' | 'PER_UNIT_SERVICE' | 'NOT_APPLICABLE';
  waiver_strategy?: 'NONE' | 'SIMPLE_MULTIPLIER' | 'TIERED_MULTIPLIER';
  simple_waiver_multiplier?: number;
  has_caa_override?: boolean;
  caa_override_amount?: number;
  caa_waiver_strategy_override?: 'NONE' | 'SIMPLE_MULTIPLIER' | 'TIERED_MULTIPLIER';
  caa_simple_waiver_multiplier_override?: number;
}

export interface CreateWaiverTierRequest {
  name: string;
  fuel_uplift_multiplier: number;
  fees_waived_codes: string[];
  tier_priority: number;
  is_caa_specific_tier?: boolean;
}

export interface UpdateWaiverTierRequest extends CreateWaiverTierRequest {}

export interface ApiError {
  error: string;
  details?: any;
}

// Using shared API configuration from api-config.ts

// Fee Categories Service
export const getFeeCategories = async (fboId: number): Promise<FeeCategory[]> => {
  const response = await fetch(`${API_BASE_URL}/admin/fbo/${fboId}/fee-categories`, {
    method: 'GET',
    headers: getAuthHeaders(),
  });
  
  const result = await handleApiResponse<{ fee_categories: FeeCategory[] }>(response);
  return result.fee_categories;
};

export const getFeeCategoryById = async (fboId: number, categoryId: number): Promise<FeeCategory> => {
  const response = await fetch(`${API_BASE_URL}/admin/fbo/${fboId}/fee-categories/${categoryId}`, {
    method: 'GET',
    headers: getAuthHeaders(),
  });
  
  const result = await handleApiResponse<{ fee_category: FeeCategory }>(response);
  return result.fee_category;
};

export const createFeeCategory = async (fboId: number, data: CreateFeeCategoryRequest): Promise<FeeCategory> => {
  const response = await fetch(`${API_BASE_URL}/admin/fbo/${fboId}/fee-categories`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });
  
  return handleApiResponse<FeeCategory>(response);
};

export const updateFeeCategory = async (fboId: number, categoryId: number, data: UpdateFeeCategoryRequest): Promise<FeeCategory> => {
  const response = await fetch(`${API_BASE_URL}/admin/fbo/${fboId}/fee-categories/${categoryId}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });
  
  return handleApiResponse<FeeCategory>(response);
};

export const deleteFeeCategory = async (fboId: number, categoryId: number): Promise<void> => {
  const response = await fetch(`${API_BASE_URL}/admin/fbo/${fboId}/fee-categories/${categoryId}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  
  return handleApiResponse<void>(response);
};

// Fee Rules Service
export const getFeeRules = async (fboId: number, categoryId?: number): Promise<FeeRule[]> => {
  const params = new URLSearchParams();
  if (categoryId !== undefined) {
    params.append('applies_to_fee_category_id', categoryId.toString());
  }
  
  const queryString = params.toString();
  const url = `${API_BASE_URL}/admin/fbo/${fboId}/fee-rules${queryString ? `?${queryString}` : ''}`;
  
  const response = await fetch(url, {
    method: 'GET',
    headers: getAuthHeaders(),
  });
  
  const result = await handleApiResponse<{ fee_rules: FeeRule[] }>(response);
  return result.fee_rules;
};

export const createFeeRule = async (fboId: number, data: CreateFeeRuleRequest): Promise<FeeRule> => {
  const response = await fetch(`${API_BASE_URL}/admin/fbo/${fboId}/fee-rules`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });
  
  return handleApiResponse<FeeRule>(response);
};

export const updateFeeRule = async (fboId: number, ruleId: number, data: UpdateFeeRuleRequest): Promise<FeeRule> => {
  const response = await fetch(`${API_BASE_URL}/admin/fbo/${fboId}/fee-rules/${ruleId}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });
  
  return handleApiResponse<FeeRule>(response);
};

export const deleteFeeRule = async (fboId: number, ruleId: number): Promise<void> => {
  const response = await fetch(`${API_BASE_URL}/admin/fbo/${fboId}/fee-rules/${ruleId}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  
  return handleApiResponse<void>(response);
};

// Aircraft Type to Fee Category Mapping Service
export const getAircraftMappings = async (fboId: number, categoryId?: number): Promise<AircraftMapping[]> => {
  const params = new URLSearchParams();
  if (categoryId !== undefined) {
    params.append('fee_category_id', categoryId.toString());
  }
  
  const queryString = params.toString();
  const url = `${API_BASE_URL}/admin/fbo/${fboId}/aircraft-type-mappings${queryString ? `?${queryString}` : ''}`;
  
  const response = await fetch(url, {
    method: 'GET',
    headers: getAuthHeaders(),
  });
  
  return handleApiResponse<AircraftMapping[]>(response);
};

export const uploadAircraftMappings = async (fboId: number, csvFile: File): Promise<{ created: number; updated: number }> => {
  const formData = new FormData();
  formData.append('csv_file', csvFile);
  
  const authHeaders = getAuthHeaders();
  const headers: Record<string, string> = {};
  if (authHeaders['Authorization']) {
    headers['Authorization'] = authHeaders['Authorization'];
  }
  
  const response = await fetch(`${API_BASE_URL}/admin/fbo/${fboId}/aircraft-mappings/upload`, {
    method: 'POST',
    headers,
    body: formData,
  });
  
  return handleApiResponse<{ created: number; updated: number }>(response);
};

// Waiver Tiers Service
export const getWaiverTiers = async (fboId: number): Promise<WaiverTier[]> => {
  const response = await fetch(`${API_BASE_URL}/admin/fbo/${fboId}/waiver-tiers`, {
    method: 'GET',
    headers: getAuthHeaders(),
  });
  
  const result = await handleApiResponse<{ waiver_tiers: WaiverTier[] }>(response);
  return result.waiver_tiers;
};

export const createWaiverTier = async (fboId: number, data: CreateWaiverTierRequest): Promise<WaiverTier> => {
  const response = await fetch(`${API_BASE_URL}/admin/fbo/${fboId}/waiver-tiers`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });
  
  return handleApiResponse<WaiverTier>(response);
};

export const updateWaiverTier = async (fboId: number, tierId: number, data: UpdateWaiverTierRequest): Promise<WaiverTier> => {
  const response = await fetch(`${API_BASE_URL}/admin/fbo/${fboId}/waiver-tiers/${tierId}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });
  
  return handleApiResponse<WaiverTier>(response);
};

export const deleteWaiverTier = async (fboId: number, tierId: number): Promise<void> => {
  const response = await fetch(`${API_BASE_URL}/admin/fbo/${fboId}/waiver-tiers/${tierId}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  
  return handleApiResponse<void>(response);
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