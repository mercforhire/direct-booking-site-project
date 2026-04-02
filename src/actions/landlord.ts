"use server"

import { prisma } from "@/lib/prisma"
import { getLandlordIdsForAdmin } from "@/lib/landlord"
import { landlordSchema } from "@/lib/validations/landlord"
import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"

export async function createLandlord(data: unknown) {
  // Verify admin is authenticated
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) throw new Error("Unauthorized")

  const parsed = landlordSchema.safeParse(data)
  if (!parsed.success) return { error: parsed.error.flatten() }

  // Check slug uniqueness
  const existing = await prisma.landlord.findUnique({
    where: { slug: parsed.data.slug },
    select: { id: true },
  })
  if (existing) {
    return {
      error: {
        fieldErrors: { slug: ["This slug is already taken"] },
        formErrors: [],
      },
    }
  }

  // Create landlord + default settings in a transaction
  const landlord = await prisma.$transaction(async (tx) => {
    const created = await tx.landlord.create({
      data: {
        name: parsed.data.name,
        slug: parsed.data.slug,
        ownerName: parsed.data.ownerName,
        address: parsed.data.address,
        email: parsed.data.email,
        phone: parsed.data.phone || null,
        bgColor: parsed.data.bgColor,
        textColor: parsed.data.textColor,
        accentColor: parsed.data.accentColor,
        adminUserId: user.id,
      },
    })

    // Create default settings for the new landlord
    await tx.settings.create({
      data: {
        landlordId: created.id,
        serviceFeePercent: 0,
        depositAmount: 0,
      },
    })

    return created
  })

  revalidatePath("/dashboard")
  revalidatePath("/admin/rooms")
  revalidatePath("/settings")
  return { landlord }
}
