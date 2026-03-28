import { z } from "zod"

export const approveBookingSchema = z.object({
  confirmedPrice: z.coerce.number().positive("Confirmed price must be positive"),
})

export const declineBookingSchema = z.object({
  declineReason: z.string().optional(),
})

export type ApproveBookingInput = z.infer<typeof approveBookingSchema>
export type DeclineBookingInput = z.infer<typeof declineBookingSchema>
