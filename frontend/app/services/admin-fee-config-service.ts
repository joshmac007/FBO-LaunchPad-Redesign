// Admin Fee Configuration Service
// Handles all API interactions for fee configuration management
// Aircraft Classifications are global; Fee Rules are FBO-specific

import { API_BASE_URL, handleApiResponse, getAuthHeaders } from "./api-config"

// Types based on the backend API schemas
export interface AircraftClassification {
  id: number;
  name: string;
}

export interface FeeRule {
  id: number;
  fbo_location_id: number;
  fee_name: string;
  fee_code: string;
  applies_to_aircraft_classification_id: number;
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

// @deprecated - Aircraft mapping table has been removed. Aircraft types now have direct classification_id relationships.
export interface AircraftMapping {
  id: number;
  aircraft_type_id: number;
  aircraft_type_name: string;
  aircraft_classification_id: number;
  aircraft_classification_name: string;
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

// @deprecated - Use GlobalFeeSchedule instead. ConsolidatedFeeSchedule is being phased out in favor of the global architecture.
export interface ConsolidatedFeeSchedule {
  categories: AircraftClassification[];
  rules: FeeRule[];
  mappings: AircraftMapping[];
  overrides: FeeRuleOverride[];
  fbo_aircraft_config: FBOAircraftTypeConfig[];
}

// New global types for the simplified architecture
export interface GlobalAircraftClassification {
  id: number;
  name: string;
  aircraft_types: GlobalAircraftType[];
  created_at: string;
  updated_at: string;
}

export interface GlobalAircraftType {
  id: number;
  name: string;
  classification_id: number;
  base_min_fuel_gallons_for_waiver: string | number;
  default_max_gross_weight_lbs?: string | number;
  created_at: string;
  updated_at: string;
}

export interface GlobalFeeRule {
  id: number;
  fbo_location_id: number;
  fee_name: string;
  fee_code: string;
  applies_to_classification_id: number;
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

export interface GlobalFeeRuleOverride {
  id: number;
  fbo_location_id: number;
  aircraft_type_id: number;
  fee_rule_id: number;
  override_amount?: number;
  override_caa_amount?: number;
  created_at: string;
  updated_at: string;
}

export interface GlobalFeeSchedule {
  schedule: GlobalAircraftClassification[];
  fee_rules: GlobalFeeRule[];
  overrides: GlobalFeeRuleOverride[];
}

export interface UpsertFeeRuleOverrideRequest {
  aircraft_type_id: number;
  fee_rule_id: number;
  override_amount?: number;
  override_caa_amount?: number;
}

export interface AddAircraftToFeeScheduleRequest {
  aircraft_type_name: string;
  aircraft_classification_id: number;
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

export interface CreateAircraftClassificationRequest {
  name: string;
}

export interface UpdateAircraftClassificationRequest {
  name: string;
}

export interface CreateFeeRuleRequest {
  fee_name: string;
  fee_code: string;
  applies_to_aircraft_classification_id: number;
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
  applies_to_aircraft_classification_id?: number;
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

export interface UpdateAircraftClassificationMappingRequest {
  classification_id: number;
}

export interface UpdateAircraftClassificationMappingResponse {
  aircraft_type_id: number;
  aircraft_type_name: string;
  classification_id: number;
  classification_name: string;
  updated_at: string;
}

// Using shared API configuration from api-config.ts

// Aircraft Classifications Service (Global)
export const getAircraftClassifications = async (): Promise<AircraftClassification[]> => {
  const response = await fetch(`${API_BASE_URL}/admin/aircraft-classifications`, {
    method: 'GET',
    headers: getAuthHeaders(),
  });
  
  const result = await handleApiResponse<{ aircraft_classifications: AircraftClassification[] }>(response);
  return result.aircraft_classifications;
};

// @deprecated - Use getAircraftClassifications() instead
export const getFeeCategories = async (fboId: number): Promise<AircraftClassification[]> => {
  console.warn('getFeeCategories is deprecated. Use getAircraftClassifications() instead.');
  return getAircraftClassifications();
};

export const getAircraftClassificationById = async (classificationId: number): Promise<AircraftClassification> => {
  const response = await fetch(`${API_BASE_URL}/admin/aircraft-classifications/${classificationId}`, {
    method: 'GET',
    headers: getAuthHeaders(),
  });
  
  const result = await handleApiResponse<{ aircraft_classification: AircraftClassification }>(response);
  return result.aircraft_classification;
};

export const createAircraftClassification = async (data: CreateAircraftClassificationRequest): Promise<AircraftClassification> => {
  const response = await fetch(`${API_BASE_URL}/admin/aircraft-classifications`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });
  
  return handleApiResponse<AircraftClassification>(response);
};

export const updateAircraftClassification = async (classificationId: number, data: UpdateAircraftClassificationRequest): Promise<AircraftClassification> => {
  const response = await fetch(`${API_BASE_URL}/admin/aircraft-classifications/${classificationId}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });
  
  return handleApiResponse<AircraftClassification>(response);
};

export const deleteAircraftClassification = async (classificationId: number): Promise<void> => {
  const response = await fetch(`${API_BASE_URL}/admin/aircraft-classifications/${classificationId}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  
  return handleApiResponse<void>(response);
};

export const getGeneralAircraftClassification = async (): Promise<AircraftClassification> => {
  const response = await fetch(`${API_BASE_URL}/admin/aircraft-classifications/general`, {
    method: 'GET',
    headers: getAuthHeaders(),
  });
  const result = await handleApiResponse<{ aircraft_classification: AircraftClassification }>(response);
  return result.aircraft_classification;
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
  aircraft_classification_id: number;
  aircraft_classification_name: string;
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
    params.append('applies_to_aircraft_classification_id', categoryId.toString());
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
// @deprecated - Aircraft mapping table has been removed. Use getGlobalFeeSchedule() instead.
export const getAircraftMappings = async (fboId: number, categoryId?: number): Promise<AircraftMapping[]> => {
  console.warn('getAircraftMappings is deprecated. The aircraft mapping table has been removed. Use getGlobalFeeSchedule() instead.');
  const params = new URLSearchParams();
  if (categoryId !== undefined) {
    params.append('aircraft_classification_id', categoryId.toString());
  }
  
  const queryString = params.toString();
  const url = `${API_BASE_URL}/admin/fbo/${fboId}/aircraft-type-mappings${queryString ? `?${queryString}` : ''}`;
  
  const response = await fetch(url, {
    method: 'GET',
    headers: getAuthHeaders(),
  });
  
  return handleApiResponse<AircraftMapping[]>(response);
};

// @deprecated - Aircraft mapping uploads are no longer supported. Aircraft types are now directly assigned to classifications.
export const uploadAircraftMappings = async (fboId: number, csvFile: File): Promise<{ created: number; updated: number }> => {
  console.warn('uploadAircraftMappings is deprecated. Aircraft mapping table has been removed.');
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

// @deprecated - Aircraft classification mappings are no longer used. Aircraft types have direct classification_id relationships.
export const deleteAircraftMapping = async (fboId: number, mappingId: number): Promise<void> => {
  const response = await fetch(`${API_BASE_URL}/admin/fbo/${fboId}/aircraft-type-mappings/${mappingId}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  return handleApiResponse(response);
}

export const updateAircraftTypeClassification = async (
  aircraftTypeId: number,
  classificationId: number
): Promise<UpdateAircraftClassificationMappingResponse> => {
  const response = await fetch(
    `${API_BASE_URL}/admin/aircraft-types/${aircraftTypeId}/classification`,
    {
      method: "PUT",
      headers: getAuthHeaders(),
      body: JSON.stringify({ classification_id: classificationId }),
    }
  );
  return handleApiResponse(response);
};

/**
 * @deprecated - Use updateAircraftTypeClassification instead. This function uses a legacy route.
 */
export const updateAircraftClassificationMapping = async (
  fboId: number, 
  aircraftTypeId: number, 
  data: UpdateAircraftClassificationMappingRequest
): Promise<UpdateAircraftClassificationMappingResponse> => {
  console.warn('updateAircraftClassificationMapping is deprecated. Use updateAircraftTypeClassification instead.');
  const response = await fetch(`${API_BASE_URL}/admin/fbo/${fboId}/aircraft-classification-mappings/by-type/${aircraftTypeId}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });
  
  // The legacy endpoint returns the object nested under a 'mapping' key
  const result = await handleApiResponse<{ mapping: UpdateAircraftClassificationMappingResponse }>(response);
  return result.mapping;
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

// @deprecated - Use getGlobalFeeSchedule() instead. The consolidated endpoint is being phased out in favor of the global architecture.
export const getConsolidatedFeeSchedule = async (fboId: number): Promise<ConsolidatedFeeSchedule> => {
  console.warn('getConsolidatedFeeSchedule is deprecated. Use getGlobalFeeSchedule() instead for the new global architecture.');
  const response = await fetch(`${API_BASE_URL}/admin/fbo/${fboId}/fee-schedule/consolidated`, {
    method: 'GET',
    headers: getAuthHeaders(),
  });
  
  return handleApiResponse<ConsolidatedFeeSchedule>(response);
};

// New global fee schedule function (no FBO scope needed)
export const getGlobalFeeSchedule = async (): Promise<GlobalFeeSchedule> => {
  const response = await fetch(`${API_BASE_URL}/admin/fee-schedule/global`, {
    method: 'GET',
    headers: getAuthHeaders(),
  });
  
  return handleApiResponse<GlobalFeeSchedule>(response);
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

// @deprecated - Aircraft mapping table has been removed. Aircraft types are now directly assigned to classifications.
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
  // Aircraft Classifications
  getAircraftClassifications,
  getFeeCategories, // @deprecated
  getAircraftClassificationById,
  createAircraftClassification,
  updateAircraftClassification,
  deleteAircraftClassification,
  
  // Fee Rules
  getFeeRules,
  createFeeRule,
  updateFeeRule,
  deleteFeeRule,
  
  // Aircraft Mappings - DEPRECATED
  // @deprecated - These functions are deprecated due to removal of aircraft mapping table
  getAircraftMappings,
  uploadAircraftMappings,
  deleteAircraftMapping,
  updateAircraftTypeClassification,
  
  // Waiver Tiers
  getWaiverTiers,
  createWaiverTier,
  updateWaiverTier,
  deleteWaiverTier,
  
  // Fee Schedule
  getGlobalFeeSchedule, // ✅ Current global endpoint
  getConsolidatedFeeSchedule, // @deprecated - Use getGlobalFeeSchedule instead
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