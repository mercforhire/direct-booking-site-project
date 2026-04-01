import { z } from "zod"

// For react-hook-form (typed values — do not coerce)
export const bookingSchema = z.object({
  roomId: z.string().min(1, "Room ID required"),
  checkin: z.string().min(1, "Check-in date required"),
  checkout: z.string().min(1, "Check-out date required"),
  numGuests: z.number().int().min(1, "At least 1 guest required"),
  selectedAddOnIds: z.array(z.string()).default([]),
  noteToLandlord: z.string().optional(),
  guestName: z.string().min(1, "Name required"),
  guestEmail: z.string().email("Valid email required"),
  guestPhone: z.string().min(1, "Phone required"),
  estimatedTotal: z.number().nonnegative(),
  createAccount: z.boolean().default(false),
  password: z.string().optional(),
  guestUserId: z.string().optional(),
})

export type BookingFormValues = z.infer<typeof bookingSchema>

// For submitBooking server action (coerce from JSON serialized form values)
export const bookingSchemaCoerced = z.object({
  roomId: z.string().min(1),
  checkin: z.string().min(1),
  checkout: z.string().min(1),
  numGuests: z.coerce.number().int().min(1),
  selectedAddOnIds: z.array(z.string()).default([]),
  noteToLandlord: z.string().optional(),
  guestName: z.string().min(1),
  guestEmail: z.string().email(),
  guestPhone: z.string().min(1),
  estimatedTotal: z.coerce.number().nonnegative(),
  createAccount: z.boolean().default(false),
  password: z.string().optional(),
  guestUserId: z.string().optional(),
})
