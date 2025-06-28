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
  is_primary_fee: boolean;
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

// New interfaces for Phase 2 - Consolidated Fee Schedule
export interface FeeRuleOverride {
  id: number;
  fbo_location_id: number;
  aircraft_type_id: number;
  fee_rule_id: number;
  override_amount?: number;
  override_caa_amount?: number;
  created_at: string;
  updated_at: string;
}

export interface FBOAircraftTypeConfig {
  id: number;
  fbo_location_id: number;
  aircraft_type_id: number;
  aircraft_type_name: string;
  base_min_fuel_gallons_for_waiver: string | number;
  created_at: string;
  updated_at: string;
}

export interface ConsolidatedFeeSchedule {
  categories: FeeCategory[];
  rules: FeeRule[];
  mappings: AircraftMapping[];
  overrides: FeeRuleOverride[];
  fbo_aircraft_config: FBOAircraftTypeConfig[];
}

export interface UpsertFeeRuleOverrideRequest {
  aircraft_type_id: number;
  fee_rule_id: number;
  override_amount?: number;
  override_caa_amount?: number;
}

export interface AddAircraftToFeeScheduleRequest {
  aircraft_type_name: string;
  fee_category_id: number;
  min_fuel_gallons: number;
  initial_ramp_fee_rule_id?: number;
  initial_ramp_fee_amount?: number;
}

// Fuel Type interface for new dynamic system
export interface FuelType {
  id: number;
  name: string;
  code: string;
  description?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Updated Fuel Price interface for new system
export interface FuelPrice {
  fuel_type_id: number;
  fuel_type_name: string;
  fuel_type_code: string;
  price: number | null;
  currency: string;
  effective_date: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface FuelPricesResponse {
  fuel_prices: FuelPrice[];
}

export interface SetFuelPricesRequest {
  fuel_prices: Array<{
    fuel_type_id: number;
    price: number;
  }>;
}

export interface FuelTypesResponse {
  fuel_types: FuelType[];
}

export interface DeleteFeeRuleOverrideRequest {
  aircraft_type_id: number;
  fee_rule_id: number;
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
  is_primary_fee?: boolean;
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
  is_primary_fee?: boolean;
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

export interface UpdateMinFuelRequest {
  base_min_fuel_gallons_for_waiver: number;
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

export const getGeneralFeeCategory = async (fboId: number): Promise<FeeCategory> => {
  const response = await fetch(`${API_BASE_URL}/admin/fbo/${fboId}/fee-categories/general`, {
    method: 'GET',
    headers: getAuthHeaders(),
  });
  const result = await handleApiResponse<{ fee_category: FeeCategory }>(response);
  return result.fee_category;
};

// Get all aircraft types (for autocomplete in Add Aircraft dialog)
export const getAircraftTypes = async (fboId: number): Promise<{ id: number; name: string }[]> => {
  const response = await fetch(`${API_BASE_URL}/admin/fbo/${fboId}/aircraft-types`, {
    method: 'GET',
    headers: getAuthHeaders(),
  });
  const result = await handleApiResponse<{ aircraft_types: any[] }>(response);
  return result.aircraft_types.map(type => ({ id: type.id, name: type.name }));
};

// Get aircraft configurations for copying fees
export const getAircraftConfigurations = async (fboId: number): Promise<{
  id: number;
  aircraft_type_name: string;
  fee_category_id: number;
  fee_category_name: string;
  min_fuel_gallons: number;
  fee_overrides: Array<{
    fee_rule_id: number;
    fee_name: string;
    override_amount?: number;
    override_caa_amount?: number;
  }>;
}[]> => {
  const response = await fetch(`${API_BASE_URL}/admin/fbo/${fboId}/aircraft-configurations`, {
    method: 'GET',
    headers: getAuthHeaders(),
  });
  const result = await handleApiResponse<{ aircraft_configurations: any[] }>(response);
  return result.aircraft_configurations;
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

export const reorderWaiverTiers = async (fboId: number, tierUpdates: { tier_id: number; new_priority: number }[]): Promise<any> => {
  const response = await fetch(`${API_BASE_URL}/admin/fbo/${fboId}/waiver-tiers/reorder`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify({ tier_updates: tierUpdates }),
  });
  return handleApiResponse(response);
};

// New API functions for Phase 2
export const getConsolidatedFeeSchedule = async (fboId: number): Promise<ConsolidatedFeeSchedule> => {
  const response = await fetch(`${API_BASE_URL}/admin/fbo/${fboId}/fee-schedule/consolidated`, {
    method: 'GET',
    headers: getAuthHeaders(),
  });
  
  return handleApiResponse<ConsolidatedFeeSchedule>(response);
};

export const upsertFeeRuleOverride = async (fboId: number, data: UpsertFeeRuleOverrideRequest): Promise<FeeRuleOverride> => {
  const response = await fetch(`${API_BASE_URL}/admin/fbo/${fboId}/fee-rule-overrides`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });
  
  return handleApiResponse<FeeRuleOverride>(response);
};

export const deleteFeeRuleOverride = async (fboId: number, data: DeleteFeeRuleOverrideRequest): Promise<void> => {
  const params = new URLSearchParams();
  params.append('aircraft_type_id', data.aircraft_type_id.toString());
  params.append('fee_rule_id', data.fee_rule_id.toString());

  const response = await fetch(`${API_BASE_URL}/admin/fbo/${fboId}/fee-rule-overrides?${params.toString()}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });

  return handleApiResponse<void>(response);
};

export const updateMinFuelForAircraft = async (
  fboId: number,
  aircraftTypeId: number,
  data: UpdateMinFuelRequest
): Promise<any> => { // The response might be minimal, so `any` is fine for now.
  const response = await fetch(
    `${API_BASE_URL}/admin/fbo/${fboId}/aircraft-types/${aircraftTypeId}`,
    {
      method: "PUT",
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    }
  );
  return handleApiResponse(response);
};

export const uploadFeeOverridesCSV = async (fboId: number, file: File): Promise<any> => {
  const formData = new FormData();
  formData.append("file", file);

  const authHeaders = getAuthHeaders();
  // When using FormData, the browser automatically sets the Content-Type with the correct boundary.
  // We need to remove it from our headers if it's present.
  if (authHeaders instanceof Headers) {
    authHeaders.delete('Content-Type');
  } else if (authHeaders) {
    delete authHeaders['Content-Type'];
  }

  const response = await fetch(
    `${API_BASE_URL}/admin/fbo/${fboId}/fee-rule-overrides/upload-csv`,
    {
      method: "POST",
      headers: authHeaders,
      body: formData,
    }
  );
  return handleApiResponse(response);
};

export const deleteAircraftMapping = async (fboId: number, mappingId: number): Promise<void> => {
  const response = await fetch(`${API_BASE_URL}/admin/fbo/${fboId}/aircraft-type-mappings/${mappingId}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  
  return handleApiResponse<void>(response);
};

export const addAircraftToFeeSchedule = async (fboId: number, data: AddAircraftToFeeScheduleRequest): Promise<any> => {
  const response = await fetch(
    `${API_BASE_URL}/admin/fbo/${fboId}/aircraft-fee-setup`,
    {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    }
  );
  return handleApiResponse(response);
}

// Fuel Type Management
export const getFuelTypes = async (fboId: number): Promise<FuelTypesResponse> => {
  const response = await fetch(`${API_BASE_URL}/admin/fbo/${fboId}/fuel-types`, {
    method: 'GET',
    headers: getAuthHeaders(),
  });
  
  return handleApiResponse<FuelTypesResponse>(response);
};

// Fuel Price Management
export const getFuelPrices = async (fboId: number): Promise<FuelPricesResponse> => {
  const response = await fetch(`${API_BASE_URL}/admin/fbo/${fboId}/fuel-prices`, {
    method: 'GET',
    headers: getAuthHeaders(),
  });
  
  return handleApiResponse<FuelPricesResponse>(response);
};

export const setFuelPrices = async (fboId: number, data: SetFuelPricesRequest): Promise<{ success: boolean; updated_count: number; message: string }> => {
  const response = await fetch(`${API_BASE_URL}/admin/fbo/${fboId}/fuel-prices`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });
  
  return handleApiResponse<{ success: boolean; updated_count: number; message: string }>(response);
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
  deleteAircraftMapping,
  
  // Waiver Tiers
  getWaiverTiers,
  createWaiverTier,
  updateWaiverTier,
  deleteWaiverTier,
  
  // Consolidated Fee Schedule
  getConsolidatedFeeSchedule,
  upsertFeeRuleOverride,
  deleteFeeRuleOverride,
  
  // Min Fuel
  updateMinFuelForAircraft,
  
  // Fee Overrides CSV
  uploadFeeOverridesCSV,
  
  // New API functions for Phase 2
  addAircraftToFeeSchedule,
  
  // Fuel Type Management
  getFuelTypes,
  
  // Fuel Price Management
  getFuelPrices,
  setFuelPrices,
};

export default AdminFeeConfigService; 