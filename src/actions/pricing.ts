"use server"

import { createClient } from "@/lib/supabase/server"
import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"

async function requireAuth() {
  const supabase = await createClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()
  if (error || !user) throw new Error("Unauthorized")
  return user
}

export async function setDatePriceOverride(
  roomId: string,
  dateStr: string,
  price: number
): Promise<void> {
  await requireAuth()
  const date = new Date(dateStr + "T12:00:00.000Z")
  await prisma.datePriceOverride.upsert({
    where: { roomId_date: { roomId, date } },
    update: { price },
    create: { roomId, date, price },
  })
  revalidatePath("/availability")
}

export async function clearDatePriceOverride(
  roomId: string,
  dateStr: string
): Promise<void> {
  await requireAuth()
  const date = new Date(dateStr + "T12:00:00.000Z")
  await prisma.datePriceOverride.deleteMany({
    where: { roomId, date },
  })
  revalidatePath("/availability")
}

export async function setRangePriceOverride(
  roomId: string,
  fromStr: string,
  toStr: string,
  price: number
): Promise<void> {
  await requireAuth()
  const dates: Date[] = []
  const current = new Date(fromStr + "T12:00:00.000Z")
  const end = new Date(toStr + "T12:00:00.000Z")
  while (current <= end) {
    dates.push(new Date(current))
    current.setUTCDate(current.getUTCDate() + 1)
  }
  await prisma.datePriceOverride.deleteMany({ where: { roomId, date: { in: dates } } })
  await prisma.datePriceOverride.createMany({
    data: dates.map((date) => ({ roomId, date, price })),
  })
  revalidatePath("/availability")
}
