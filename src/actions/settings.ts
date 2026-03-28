"use server"

import { createClient } from "@/lib/supabase/server"
import { prisma } from "@/lib/prisma"
import { settingsSchemaCoerced } from "@/lib/validations/settings"
import { revalidatePath } from "next/cache"

export async function upsertSettings(data: unknown) {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) throw new Error("Unauthorized")

  const parsed = settingsSchemaCoerced.safeParse(data)
  if (!parsed.success) return { error: parsed.error.flatten() }

  const settings = await prisma.settings.upsert({
    where: { id: "global" },
    create: {
      id: "global",
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
