import { z } from "zod"

export const settingsSchema = z.object({
  serviceFeePercent: z.coerce
    .number()
    .min(0, "Service fee must be 0 or greater")
    .max(100, "Service fee cannot exceed 100%"),
  depositAmount: z.coerce
    .number()
    .min(0, "Deposit amount must be 0 or greater"),
})

export type SettingsFormData = z.infer<typeof settingsSchema>
