// Admin Fee Configuration Service
// Handles all API interactions for fee configuration management
// All data is now global in single-tenant architecture

import { API_BASE_URL, handleApiResponse, getAuthHeaders } from "./api-config"

// Types based on the backend API schemas
export interface AircraftClassification {
  id: number;
  name: string;
}

export interface FeeRule {
  id: number;
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
  created_at: string;
  updated_at: string;
}

// New interfaces for Phase 2 - Consolidated Fee Schedule
export interface FeeRuleOverride {
  id: number;
  aircraft_type_id: number;
  fee_rule_id: number;
  override_amount?: number;
  override_caa_amount?: number;
  created_at: string;
  updated_at: string;
}

export interface AircraftTypeConfig {
  id: number;
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
  aircraft_config: AircraftTypeConfig[];
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

// ========================================
// API Functions
// ========================================

// Aircraft Classifications (Global)
export const getAircraftClassifications = async (): Promise<AircraftClassification[]> => {
  const response = await fetch(`${API_BASE_URL}/admin/aircraft-classifications`, {
    method: 'GET',
    headers: getAuthHeaders(),
  });

  return handleApiResponse<AircraftClassification[]>(response);
};

export const getFeeCategories = async (): Promise<AircraftClassification[]> => {
  return getAircraftClassifications();
};

export const getAircraftClassificationById = async (classificationId: number): Promise<AircraftClassification> => {
  const response = await fetch(`${API_BASE_URL}/admin/aircraft-classifications/${classificationId}`, {
    method: 'GET',
    headers: getAuthHeaders(),
  });

  return handleApiResponse<AircraftClassification>(response);
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

  await handleApiResponse<void>(response);
};

export const getGeneralAircraftClassification = async (): Promise<AircraftClassification> => {
  const response = await fetch(`${API_BASE_URL}/admin/aircraft-classifications/general`, {
    method: 'GET',
    headers: getAuthHeaders(),
  });

  return handleApiResponse<AircraftClassification>(response);
};

// Aircraft Types
export const getAircraftTypes = async (): Promise<{ id: number; name: string }[]> => {
  const response = await fetch(`${API_BASE_URL}/admin/aircraft-types`, {
    method: 'GET',
    headers: getAuthHeaders(),
  });

  const data = await handleApiResponse<{ aircraft_types: { id: number; name: string }[] }>(response);
  return data.aircraft_types;
};

export const getAircraftConfigurations = async (): Promise<{
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
  const response = await fetch(`${API_BASE_URL}/admin/aircraft-configurations`, {
    method: 'GET',
    headers: getAuthHeaders(),
  });

  const data = await handleApiResponse<{
    aircraft_configurations: {
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
    }[]
  }>(response);

  return data.aircraft_configurations;
};

// Fee Rules (Global)
export const getFeeRules = async (categoryId?: number): Promise<FeeRule[]> => {
  let url = `${API_BASE_URL}/admin/fee-rules`;
  if (categoryId) {
    url += `?category_id=${categoryId}`;
  }

  const response = await fetch(url, {
    method: 'GET',
    headers: getAuthHeaders(),
  });

  const data = await handleApiResponse<{ fee_rules: FeeRule[] }>(response);
  return data.fee_rules;
};

export const createFeeRule = async (data: CreateFeeRuleRequest): Promise<FeeRule> => {
  const response = await fetch(`${API_BASE_URL}/admin/fee-rules`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });

  return handleApiResponse<FeeRule>(response);
};

export const updateFeeRule = async (ruleId: number, data: UpdateFeeRuleRequest): Promise<FeeRule> => {
  const response = await fetch(`${API_BASE_URL}/admin/fee-rules/${ruleId}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });

  return handleApiResponse<FeeRule>(response);
};

export const deleteFeeRule = async (ruleId: number): Promise<void> => {
  const response = await fetch(`${API_BASE_URL}/admin/fee-rules/${ruleId}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });

  await handleApiResponse<void>(response);
};

// Aircraft Mappings (deprecated but kept for compatibility)
export const getAircraftMappings = async (categoryId?: number): Promise<AircraftMapping[]> => {
  let url = `${API_BASE_URL}/admin/aircraft-mappings`;
  if (categoryId) {
    url += `?category_id=${categoryId}`;
  }

  const response = await fetch(url, {
    method: 'GET',
    headers: getAuthHeaders(),
  });

  const data = await handleApiResponse<{ aircraft_mappings: AircraftMapping[] }>(response);
  return data.aircraft_mappings;
};

export const uploadAircraftMappings = async (csvFile: File): Promise<{ created: number; updated: number }> => {
  const formData = new FormData();
  formData.append('file', csvFile);

  const response = await fetch(`${API_BASE_URL}/admin/aircraft-mappings/upload`, {
    method: 'POST',
    headers: {
      ...getAuthHeaders(),
      // Don't set Content-Type for FormData, let browser set it with boundary
    },
    body: formData,
  });

  return handleApiResponse<{ created: number; updated: number }>(response);
};

export const deleteAircraftMapping = async (mappingId: number): Promise<void> => {
  const response = await fetch(`${API_BASE_URL}/admin/aircraft-mappings/${mappingId}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });

  await handleApiResponse<void>(response);
};

export const updateAircraftTypeClassification = async (
  aircraftTypeId: number,
  classificationId: number
): Promise<UpdateAircraftClassificationMappingResponse> => {
  const response = await fetch(`${API_BASE_URL}/admin/aircraft-types/${aircraftTypeId}/classification`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify({
      classification_id: classificationId,
    }),
  });

  return handleApiResponse<UpdateAircraftClassificationMappingResponse>(response);
};

export const updateAircraftClassificationMapping = async (
  aircraftTypeId: number, 
  data: UpdateAircraftClassificationMappingRequest
): Promise<UpdateAircraftClassificationMappingResponse> => {
  const response = await fetch(`${API_BASE_URL}/admin/aircraft-types/${aircraftTypeId}/classification`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });

  return handleApiResponse<UpdateAircraftClassificationMappingResponse>(response);
};

// Waiver Tiers
export const getWaiverTiers = async (): Promise<WaiverTier[]> => {
  const response = await fetch(`${API_BASE_URL}/admin/waiver-tiers`, {
    method: 'GET',
    headers: getAuthHeaders(),
  });

  const data = await handleApiResponse<{ waiver_tiers: WaiverTier[] }>(response);
  return data.waiver_tiers;
};

export const createWaiverTier = async (data: CreateWaiverTierRequest): Promise<WaiverTier> => {
  const response = await fetch(`${API_BASE_URL}/admin/waiver-tiers`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });

  return handleApiResponse<WaiverTier>(response);
};

export const updateWaiverTier = async (tierId: number, data: UpdateWaiverTierRequest): Promise<WaiverTier> => {
  const response = await fetch(`${API_BASE_URL}/admin/waiver-tiers/${tierId}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });

  return handleApiResponse<WaiverTier>(response);
};

export const deleteWaiverTier = async (tierId: number): Promise<void> => {
  const response = await fetch(`${API_BASE_URL}/admin/waiver-tiers/${tierId}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });

  await handleApiResponse<void>(response);
};

export const reorderWaiverTiers = async (tierUpdates: { tier_id: number; new_priority: number }[]): Promise<any> => {
  const response = await fetch(`${API_BASE_URL}/admin/waiver-tiers/reorder`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify({ tier_updates: tierUpdates }),
  });

  return handleApiResponse<any>(response);
};

// Fee Schedules
export const getConsolidatedFeeSchedule = async (): Promise<ConsolidatedFeeSchedule> => {
  const response = await fetch(`${API_BASE_URL}/admin/fee-schedule/consolidated`, {
    method: 'GET',
    headers: getAuthHeaders(),
  });

  return handleApiResponse<ConsolidatedFeeSchedule>(response);
};

export const getGlobalFeeSchedule = async (): Promise<GlobalFeeSchedule> => {
  const response = await fetch(`${API_BASE_URL}/admin/fee-schedule/global`, {
    method: 'GET',
    headers: getAuthHeaders(),
  });

  return handleApiResponse<GlobalFeeSchedule>(response);
};

// Fee Rule Overrides
export const upsertFeeRuleOverride = async (data: UpsertFeeRuleOverrideRequest): Promise<FeeRuleOverride> => {
  const response = await fetch(`${API_BASE_URL}/admin/fee-rule-overrides`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });

  return handleApiResponse<FeeRuleOverride>(response);
};

export const deleteFeeRuleOverride = async (data: DeleteFeeRuleOverrideRequest): Promise<void> => {
  const response = await fetch(`${API_BASE_URL}/admin/fee-rule-overrides`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });

  await handleApiResponse<void>(response);
};

// Aircraft Configuration
export const updateMinFuelForAircraft = async (
  aircraftTypeId: number,
  data: UpdateMinFuelRequest
): Promise<any> => {
  const response = await fetch(`${API_BASE_URL}/admin/aircraft-types/${aircraftTypeId}/min-fuel`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });

  return handleApiResponse<any>(response);
};

export const uploadFeeOverridesCSV = async (file: File): Promise<any> => {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(`${API_BASE_URL}/admin/fee-rule-overrides/upload`, {
    method: 'POST',
    headers: {
      ...getAuthHeaders(),
      // Don't set Content-Type for FormData, let browser set it with boundary
    },
    body: formData,
  });

  return handleApiResponse<any>(response);
};

export const addAircraftToFeeSchedule = async (data: AddAircraftToFeeScheduleRequest): Promise<any> => {
  const response = await fetch(`${API_BASE_URL}/admin/aircraft-types`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });

  return handleApiResponse<any>(response);
};

// Fuel Management
export const getFuelTypes = async (): Promise<FuelTypesResponse> => {
  const response = await fetch(`${API_BASE_URL}/admin/fuel-types`, {
    method: 'GET',
    headers: getAuthHeaders(),
  });

  return handleApiResponse<FuelTypesResponse>(response);
};

export const getFuelPrices = async (): Promise<FuelPricesResponse> => {
  const response = await fetch(`${API_BASE_URL}/admin/fuel-prices`, {
    method: 'GET',
    headers: getAuthHeaders(),
  });

  return handleApiResponse<FuelPricesResponse>(response);
};

export const setFuelPrices = async (data: SetFuelPricesRequest): Promise<{ success: boolean; updated_count: number; message: string }> => {
  const response = await fetch(`${API_BASE_URL}/admin/fuel-prices`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });

  return handleApiResponse<{ success: boolean; updated_count: number; message: string }>(response);
};

export default {
  // Aircraft Classifications
  getAircraftClassifications,
  getFeeCategories,
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