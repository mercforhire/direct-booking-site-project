import { z } from "zod"

export const markAsPaidSchema = z.object({
  bookingId: z.string().min(1),
})
