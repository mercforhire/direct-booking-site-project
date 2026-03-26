"use server"

import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { settingsSchema } from "@/lib/validations/settings"
import { revalidatePath } from "next/cache"

export async function upsertSettings(data: unknown) {
  const session = await auth()
  if (!session?.user) throw new Error("Unauthorized")

  const parsed = settingsSchema.safeParse(data)
  if (!parsed.success) return { error: parsed.error.flatten() }

  const settings = await prisma.settings.upsert({
    where: { id: "global" },
    create: {
      id: "global",
      serviceFeePercent: parsed.data.serviceFeePercent,
      depositAmount: parsed.data.depositAmount,
    },
    update: {
      serviceFeePercent: parsed.data.serviceFeePercent,
      depositAmount: parsed.data.depositAmount,
    },
  })

  revalidatePath("/settings")
  return { settings }
}
