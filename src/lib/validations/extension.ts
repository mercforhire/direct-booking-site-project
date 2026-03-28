import { z } from "zod"

// Guest-facing: submit extension request
export const submitExtensionSchema = z.object({
  requestedCheckout: z.string().min(1, "New checkout date is required"), // "YYYY-MM-DD"
  noteToLandlord: z.string().optional(),
})

// Guest-facing: cancel pending extension request
export const cancelExtensionSchema = z.object({
  extensionId: z.string().min(1),
})

export type SubmitExtensionInput = z.infer<typeof submitExtensionSchema>
export type CancelExtensionInput = z.infer<typeof cancelExtensionSchema>
