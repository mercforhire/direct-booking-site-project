import { z } from "zod"

export const roomAvailabilitySettingsSchema = z.object({
  minStayNights: z.number().int().min(1, "Minimum 1 night"),
  maxStayNights: z.number().int().min(1, "Minimum 1 night"),
  bookingWindowMonths: z
    .number()
    .int()
    .min(3, "Minimum 3 months")
    .max(9, "Maximum 9 months"),
})

export const roomAvailabilitySettingsSchemaCoerced = z.object({
  minStayNights: z.coerce.number().int().min(1, "Minimum 1 night"),
  maxStayNights: z.coerce.number().int().min(1, "Minimum 1 night"),
  bookingWindowMonths: z.coerce
    .number()
    .int()
    .min(3, "Minimum 3 months")
    .max(9, "Maximum 9 months"),
})

export type RoomAvailabilitySettingsFormData = z.infer<
  typeof roomAvailabilitySettingsSchema
>
