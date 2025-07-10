import { z } from 'zod';

// User Preferences Schema
export const userPreferencesSchema = z.object({
  fee_schedule_view_size: z.enum(['compact', 'standard', 'detailed']).default('standard'),
  fee_schedule_sort_order: z.enum(['alphabetical', 'amount_asc', 'amount_desc', 'classification']).default('alphabetical'),
  highlight_overrides: z.boolean().default(true),
  show_classification_defaults: z.boolean().default(true),
  dismissed_tooltips: z.array(z.string()).default([]),
  fee_schedule_column_codes: z.array(z.string()).optional(),
});

export type UserPreferences = z.infer<typeof userPreferencesSchema>;