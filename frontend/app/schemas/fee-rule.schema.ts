import { z } from 'zod';

// Fee Rule Schema
export const feeRuleSchema = z.object({
  fee_name: z.string().min(1, "Fee name is required").max(100, "Fee name must be 100 characters or less"),
  fee_code: z.string().min(1, "Fee code is required").max(50, "Fee code must be 50 characters or less"),
  applies_to_aircraft_classification_id: z.number({
    required_error: "Aircraft classification is required",
    invalid_type_error: "Invalid aircraft classification",
  }),
  amount: z.number().min(0, "Amount must be 0 or greater"),
  currency: z.string().length(3, "Currency must be 3 characters").default("USD"),
  is_taxable: z.boolean().default(false),
  is_potentially_waivable_by_fuel_uplift: z.boolean().default(false),
  calculation_basis: z.enum(['FIXED_PRICE', 'PER_UNIT_SERVICE', 'NOT_APPLICABLE'], {
    required_error: "Calculation basis is required",
  }),
  waiver_strategy: z.enum(['NONE', 'SIMPLE_MULTIPLIER', 'TIERED_MULTIPLIER'], {
    required_error: "Waiver strategy is required",
  }),
  simple_waiver_multiplier: z.number().min(0).optional(),
  has_caa_override: z.boolean().default(false),
  caa_override_amount: z.number().min(0).optional(),
  caa_waiver_strategy_override: z.enum(['NONE', 'SIMPLE_MULTIPLIER', 'TIERED_MULTIPLIER']).optional(),
  caa_simple_waiver_multiplier_override: z.number().min(0).optional(),
  is_primary_fee: z.boolean().default(false),
});

export type FeeRuleFormData = z.infer<typeof feeRuleSchema>;