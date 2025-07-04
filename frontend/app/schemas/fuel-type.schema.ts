import { z } from "zod";

export const fuelTypeFormSchema = z.object({
  name: z.string().min(3, "Name must be at least 3 characters."),
  code: z.string().regex(/^[A-Z0-9_]+$/, "Code must be uppercase letters, numbers, and underscores only."),
  description: z.string().optional(),
});

export type FuelTypeFormData = z.infer<typeof fuelTypeFormSchema>;