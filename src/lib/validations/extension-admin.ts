import { z } from "zod"

// Admin: approve extension and set price
export const approveExtensionSchema = z.object({
  extensionPrice: z.coerce.number().positive("Extension price must be positive"),
})

// Admin: decline extension with optional reason
export const declineExtensionSchema = z.object({
  declineReason: z.string().optional(),
})

// Admin: manually mark extension as paid (e-transfer)
export const markExtensionPaidSchema = z.object({
  extensionId: z.string().min(1),
})

export type ApproveExtensionInput = z.infer<typeof approveExtensionSchema>
export type DeclineExtensionInput = z.infer<typeof declineExtensionSchema>
export type MarkExtensionPaidInput = z.infer<typeof markExtensionPaidSchema>
