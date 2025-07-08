import { z } from 'zod';

// User Preferences Schema
export const userPreferencesSchema = z.object({
  fee_schedule_view_size: z.enum(['compact', 'standard', 'detailed']).default('standard'),
  fee_schedule_sort_order: z.enum(['alphabetical', 'amount_asc', 'amount_desc', 'classification']).default('alphabetical'),
  highlight_overrides: z.boolean().default(true),
});

export type UserPreferences = z.infer<typeof userPreferencesSchema>;