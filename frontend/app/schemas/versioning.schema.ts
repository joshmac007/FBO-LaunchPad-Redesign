import { z } from 'zod';

// Fee Schedule Version Schema
export const feeScheduleVersionSchema = z.object({
  version_name: z.string().min(1, "Version name is required").max(200, "Version name must be 200 characters or less"),
  description: z.string().max(500, "Description must be 500 characters or less").optional(),
});

export type FeeScheduleVersionFormData = z.infer<typeof feeScheduleVersionSchema>;