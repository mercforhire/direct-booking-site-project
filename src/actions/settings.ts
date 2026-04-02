"use server"

import { prisma } from "@/lib/prisma"
import { getLandlordForAdmin } from "@/lib/landlord"
import { settingsSchemaCoerced } from "@/lib/validations/settings"
import { revalidatePath } from "next/cache"

export async function upsertSettings(data: unknown, landlordId?: string) {
  const landlord = await getLandlordForAdmin(landlordId)

  const parsed = settingsSchemaCoerced.safeParse(data)
  if (!parsed.success) return { error: parsed.error.flatten() }

  const settings = await prisma.settings.upsert({
    where: { landlordId: landlord.id },
    create: {
      landlordId: landlord.id,
      serviceFeePercent: parsed.data.serviceFeePercent,
      depositAmount: parsed.data.depositAmount,
      etransferEmail: parsed.data.etransferEmail || null,
    },
    update: {
      serviceFeePercent: parsed.data.serviceFeePercent,
      depositAmount: parsed.data.depositAmount,
      etransferEmail: parsed.data.etransferEmail || null,
    },
  })

  revalidatePath("/settings")
  return { settings }
}
