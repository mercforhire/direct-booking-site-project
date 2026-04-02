"use server"

import { prisma } from "@/lib/prisma"
import { getLandlordIdsForAdmin } from "@/lib/landlord"
import { revalidatePath } from "next/cache"

async function verifyRoomOwnership(roomId: string, landlordIds: string[]) {
  const room = await prisma.room.findUnique({ where: { id: roomId }, select: { landlordId: true } })
  if (!room || !landlordIds.includes(room.landlordId)) throw new Error("Room not found")
}

export async function setDatePriceOverride(
  roomId: string,
  dateStr: string,
  price: number
): Promise<void> {
  const landlordIds = await getLandlordIdsForAdmin()
  await verifyRoomOwnership(roomId, landlordIds)
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
  const landlordIds = await getLandlordIdsForAdmin()
  await verifyRoomOwnership(roomId, landlordIds)
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
  const landlordIds = await getLandlordIdsForAdmin()
  await verifyRoomOwnership(roomId, landlordIds)
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

export async function clearRangePriceOverride(
  roomId: string,
  fromStr: string,
  toStr: string
): Promise<void> {
  const landlordIds = await getLandlordIdsForAdmin()
  await verifyRoomOwnership(roomId, landlordIds)
  const dates: Date[] = []
  const current = new Date(fromStr + "T12:00:00.000Z")
  const end = new Date(toStr + "T12:00:00.000Z")
  while (current <= end) {
    dates.push(new Date(current))
    current.setUTCDate(current.getUTCDate() + 1)
  }
  await prisma.datePriceOverride.deleteMany({ where: { roomId, date: { in: dates } } })
  revalidatePath("/availability")
}
