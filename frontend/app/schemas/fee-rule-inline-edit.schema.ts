import { z } from 'zod'

// Inline editing schemas for Fee Rules
export const feeNameEditSchema = z.object({
  value: z.string()
    .min(1, "Fee name is required")
    .max(100, "Fee name must be 100 characters or less")
})

export const feeCodeEditSchema = z.object({
  value: z.string()
    .min(1, "Fee code is required")
    .max(50, "Fee code must be 50 characters or less")
    .regex(/^[A-Z0-9_]+$/, "Fee code must contain only uppercase letters, numbers, and underscores")
})

export const feeAmountEditSchema = z.object({
  value: z.string()
    .min(1, "Amount is required")
    .refine((val) => {
      const num = Number(val)
      return !isNaN(num) && num >= 0
    }, {
      message: "Amount must be a valid number greater than or equal to 0"
    })
})

export type FeeNameEdit = z.infer<typeof feeNameEditSchema>
export type FeeCodeEdit = z.infer<typeof feeCodeEditSchema>
export type FeeAmountEdit = z.infer<typeof feeAmountEditSchema>