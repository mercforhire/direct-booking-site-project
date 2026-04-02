import { z } from "zod"

const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

export const landlordSchema = z.object({
  name: z.string().min(1, "Property name is required"),
  slug: z
    .string()
    .min(2, "Slug must be at least 2 characters")
    .max(50, "Slug must be at most 50 characters")
    .regex(slugRegex, "Slug must be lowercase letters, numbers, and hyphens only"),
  ownerName: z.string().min(1, "Owner name is required"),
  address: z.string().min(1, "Address is required"),
  email: z.string().email("Valid email is required"),
  phone: z.string(),
  bgColor: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Must be a hex color (e.g. #3a392a)"),
  textColor: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Must be a hex color"),
  accentColor: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Must be a hex color"),
})

export type LandlordFormData = z.infer<typeof landlordSchema>
