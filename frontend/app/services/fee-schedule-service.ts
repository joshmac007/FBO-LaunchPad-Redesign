// Fee Schedule Service - Consolidated API for the "Smart Spreadsheet" interface
// Handles all API interactions for the unified fee schedule management

import { API_BASE_URL, handleApiResponse, getAuthHeaders } from "./api-config"

// Core Types for the Consolidated Fee Schedule
export interface FeeScheduleData {
  categories: FeeCategory[];
  rules: FeeRule[];
  mappings: AircraftMapping[];
  overrides: FeeRuleOverride[];
  fbo_aircraft_configs: FboAircraftConfig[];
}

export interface FeeCategory {
  id: number;
  name: string;
  fbo_location_id: number;
  created_at: string;
  updated_at: string;
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

export interface FeeRuleOverride {
  id: number;
  aircraft_type_id: number;
  fee_rule_id: number;
  override_amount?: number;
  override_caa_amount?: number;
  fbo_location_id: number;
  created_at: string;
  updated_at: string;
}

export interface FboAircraftConfig {
  id: number;
  aircraft_type_id: number;
  aircraft_type_name: string;
  base_min_fuel_gallons_for_waiver: number;
  fbo_location_id: number;
  created_at: string;
  updated_at: string;
}

// Request/Response Types
export interface UpdateFeeRuleRequest {
  amount?: number;
  has_caa_override?: boolean;
  caa_override_amount?: number;
}

export interface UpsertFeeRuleOverrideRequest {
  aircraft_type_id: number;
  fee_rule_id: number;
  override_amount?: number;
  override_caa_amount?: number;
}

export interface DeleteFeeRuleOverrideRequest {
  aircraft_type_id: number;
  fee_rule_id: number;
}

export interface UpdateAircraftMinFuelRequest {
  base_min_fuel_gallons_for_waiver: number;
}

// Processed Types for UI
export interface ProcessedAircraftRow {
  aircraftTypeId: number;
  aircraftTypeName: string;
  categoryId: number;
  categoryName: string;
  minFuel: number;
  fees: ProcessedFeeCell[];
}

export interface ProcessedFeeCell {
  ruleId: number;
  feeName: string;
  feeCode: string;
  inheritedAmount: number;
  overrideAmount?: number;
  inheritedCaaAmount?: number;
  overrideCaaAmount?: number;
  isOverridden: boolean;
  isCaaOverridden: boolean;
}

// API Functions
export const getFeeScheduleConsolidated = async (fboId: number): Promise<FeeScheduleData> => {
  const response = await fetch(`${API_BASE_URL}/admin/fbo/${fboId}/fee-schedule/consolidated`, {
    method: 'GET',
    headers: getAuthHeaders(),
  });
  
  return handleApiResponse<FeeScheduleData>(response);
};

export const updateFeeRule = async (fboId: number, ruleId: number, data: UpdateFeeRuleRequest): Promise<FeeRule> => {
  const response = await fetch(`${API_BASE_URL}/admin/fbo/${fboId}/fee-rules/${ruleId}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });
  
  return handleApiResponse<FeeRule>(response);
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
  const response = await fetch(`${API_BASE_URL}/admin/fbo/${fboId}/fee-rule-overrides`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });
  
  return handleApiResponse<void>(response);
};

export const updateAircraftMinFuel = async (fboId: number, aircraftTypeId: number, data: UpdateAircraftMinFuelRequest): Promise<FboAircraftConfig> => {
  const response = await fetch(`${API_BASE_URL}/admin/fbo/${fboId}/aircraft-types/${aircraftTypeId}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });
  
  return handleApiResponse<FboAircraftConfig>(response);
};

// Data Processing Utilities
export const processFeeScheduleData = (data: FeeScheduleData): ProcessedAircraftRow[] => {
  const { categories, rules, mappings, overrides, fbo_aircraft_configs } = data;
  
  // Group mappings by category
  const mappingsByCategory = mappings.reduce((acc, mapping) => {
    if (!acc[mapping.fee_category_id]) {
      acc[mapping.fee_category_id] = [];
    }
    acc[mapping.fee_category_id].push(mapping);
    return acc;
  }, {} as Record<number, AircraftMapping[]>);
  
  // Create overrides lookup
  const overridesLookup = overrides.reduce((acc, override) => {
    const key = `${override.aircraft_type_id}-${override.fee_rule_id}`;
    acc[key] = override;
    return acc;
  }, {} as Record<string, FeeRuleOverride>);
  
  // Create aircraft configs lookup
  const aircraftConfigsLookup = fbo_aircraft_configs.reduce((acc, config) => {
    acc[config.aircraft_type_id] = config;
    return acc;
  }, {} as Record<number, FboAircraftConfig>);
  
  const processedRows: ProcessedAircraftRow[] = [];
  
  // Process each category
  categories.forEach(category => {
    const categoryMappings = mappingsByCategory[category.id] || [];
    const categoryRules = rules.filter(rule => rule.applies_to_fee_category_id === category.id);
    
    categoryMappings.forEach(mapping => {
      const aircraftConfig = aircraftConfigsLookup[mapping.aircraft_type_id];
      const minFuel = aircraftConfig?.base_min_fuel_gallons_for_waiver || 0;
      
      const fees: ProcessedFeeCell[] = categoryRules.map(rule => {
        const overrideKey = `${mapping.aircraft_type_id}-${rule.id}`;
        const override = overridesLookup[overrideKey];
        
        return {
          ruleId: rule.id,
          feeName: rule.fee_name,
          feeCode: rule.fee_code,
          inheritedAmount: rule.amount,
          overrideAmount: override?.override_amount,
          inheritedCaaAmount: rule.caa_override_amount,
          overrideCaaAmount: override?.override_caa_amount,
          isOverridden: override?.override_amount !== undefined,
          isCaaOverridden: override?.override_caa_amount !== undefined,
        };
      });
      
      processedRows.push({
        aircraftTypeId: mapping.aircraft_type_id,
        aircraftTypeName: mapping.aircraft_type_name,
        categoryId: category.id,
        categoryName: category.name,
        minFuel,
        fees,
      });
    });
  });
  
  return processedRows;
}; 