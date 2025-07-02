import { z } from 'zod';

export const userPreferencesSchema = z.object({
  fee_schedule_view_size: z.enum(['default', 'compact']).optional().default('default'),
  fee_schedule_sort_order: z.string().optional().default('classification_name:asc'),
  highlight_overrides: z.boolean().optional().default(true),
});

export type UserPreferences = z.infer<typeof userPreferencesSchema>;