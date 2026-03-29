import { z } from "zod"

export const cancelBookingSchema = z.object({
  refundAmount: z.coerce.number().min(0),
})

export type CancelBookingInput = z.infer<typeof cancelBookingSchema>
