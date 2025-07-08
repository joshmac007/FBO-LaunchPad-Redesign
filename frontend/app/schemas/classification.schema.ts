import { z } from 'zod';

// Aircraft Classification Schema
export const classificationSchema = z.object({
  name: z.string().min(1, "Classification name is required").max(100, "Classification name must be 100 characters or less"),
});

export type ClassificationFormData = z.infer<typeof classificationSchema>;