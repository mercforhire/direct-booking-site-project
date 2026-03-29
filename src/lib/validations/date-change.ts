import { z } from "zod"

export const submitDateChangeSchema = z.object({
  requestedCheckin: z.string().min(1),   // ISO date string "YYYY-MM-DD"
  requestedCheckout: z.string().min(1),  // ISO date string "YYYY-MM-DD"
  noteToLandlord: z.string().optional(),
})

export const approveDateChangeSchema = z.object({
  newPrice: z.coerce.number().positive("New price must be positive"),
})

export const declineDateChangeSchema = z.object({
  declineReason: z.string().optional(),
})

export type SubmitDateChangeInput = z.infer<typeof submitDateChangeSchema>
export type ApproveDateChangeInput = z.infer<typeof approveDateChangeSchema>
export type DeclineDateChangeInput = z.infer<typeof declineDateChangeSchema>
