import { z } from "zod"

// Plain schema for react-hook-form (inputs are already typed numbers from the form)
export const settingsSchema = z.object({
  serviceFeePercent: z
    .number()
    .min(0, "Service fee must be 0 or greater")
    .max(100, "Service fee cannot exceed 100%"),
  depositAmount: z
    .number()
    .min(0, "Deposit amount must be 0 or greater"),
  priceMultiplier: z
    .number()
    .min(0.5, "Multiplier must be at least 0.5")
    .max(3, "Multiplier cannot exceed 3"),
  etransferEmail: z.string().optional(),
})

// Coerced schema for server actions (handles string inputs from unknown data)
export const settingsSchemaCoerced = z.object({
  serviceFeePercent: z.coerce
    .number()
    .min(0, "Service fee must be 0 or greater")
    .max(100, "Service fee cannot exceed 100%"),
  depositAmount: z.coerce
    .number()
    .min(0, "Deposit amount must be 0 or greater"),
  priceMultiplier: z.coerce
    .number()
    .min(0.5, "Multiplier must be at least 0.5")
    .max(3, "Multiplier cannot exceed 3"),
  etransferEmail: z.string().optional(),
})

export type SettingsFormData = z.infer<typeof settingsSchema>
