import { z } from "zod"

export const addOnSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "Add-on name is required"),
  price: z.coerce.number().min(0, "Price must be 0 or greater"),
})

export const roomSchema = z.object({
  name: z.string().min(1, "Room name is required"),
  description: z.string().min(1, "Description is required"),
  location: z.string().min(1, "Location is required"),
  baseNightlyRate: z.coerce.number().positive("Base rate must be positive"),
  cleaningFee: z.coerce.number().min(0, "Cleaning fee must be 0 or greater"),
  extraGuestFee: z.coerce.number().min(0, "Extra guest fee must be 0 or greater"),
  maxGuests: z.coerce.number().int().min(1, "At least 1 guest required"),
  isActive: z.boolean().default(true),
  addOns: z.array(addOnSchema).default([]),
})

export type RoomFormData = z.infer<typeof roomSchema>
export type AddOnFormData = z.infer<typeof addOnSchema>
