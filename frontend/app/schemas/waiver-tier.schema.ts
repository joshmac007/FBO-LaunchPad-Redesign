import { z } from 'zod';

// Waiver Tier Schema
export const waiverTierSchema = z.object({
  name: z.string().min(1, "Tier name is required").max(100, "Tier name must be 100 characters or less"),
  fuel_uplift_multiplier: z.string()
    .min(1, "Fuel uplift multiplier is required")
    .refine((val) => {
      const num = parseFloat(val);
      return !isNaN(num) && num > 0;
    }, "Must be a positive number"),
  fees_waived_codes: z.array(z.string()).min(1, "At least one fee code must be selected"),
  tier_priority: z.number().optional(), // Will be set by the system
  is_caa_specific_tier: z.boolean().default(false),
});

export type WaiverTierFormData = z.infer<typeof waiverTierSchema>;

// Schema for the API request - with fuel_uplift_multiplier as number
export const waiverTierApiSchema = waiverTierSchema.transform((data) => ({
  ...data,
  fuel_uplift_multiplier: parseFloat(data.fuel_uplift_multiplier)
}));

export type WaiverTierApiData = z.infer<typeof waiverTierApiSchema>;