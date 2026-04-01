"use server"

import { prisma } from "@/lib/prisma"
import { getLandlordForAdmin } from "@/lib/landlord"
import { roomAvailabilitySettingsSchemaCoerced } from "@/lib/validations/availability"
import { revalidatePath } from "next/cache"

async function verifyRoomOwnership(roomId: string, landlordId: string) {
  const room = await prisma.room.findUnique({ where: { id: roomId }, select: { landlordId: true } })
  if (!room || room.landlordId !== landlordId) throw new Error("Room not found")
}

/**
 * Toggle a single date blocked/unblocked for a room.
 * Creates a BlockedDate row if not blocked; deletes it if already blocked.
 */
export async function toggleBlockedDate(
  roomId: string,
  dateStr: string
): Promise<void> {
  const landlord = await getLandlordForAdmin()
  await verifyRoomOwnership(roomId, landlord.id)

  const date = new Date(dateStr + "T12:00:00.000Z")

  const existing = await prisma.blockedDate.findUnique({
    where: { roomId_date: { roomId, date } },
  })

  if (existing) {
    await prisma.blockedDate.delete({
      where: { roomId_date: { roomId, date } },
    })
  } else {
    await prisma.blockedDate.create({
      data: { roomId, date },
    })
  }

  revalidatePath("/availability")
}

/**
 * Block or unblock a range of dates for a room.
 * When block=true: createMany with skipDuplicates.
 * When block=false: deleteMany all dates in range.
 */
export async function saveBlockedRange(
  roomId: string,
  fromStr: string,
  toStr: string,
  block: boolean
): Promise<void> {
  const landlord = await getLandlordForAdmin()
  await verifyRoomOwnership(roomId, landlord.id)

  // Build array of all dates in the range (UTC-safe)
  const dates: Date[] = []
  const current = new Date(fromStr + "T12:00:00.000Z")
  const end = new Date(toStr + "T12:00:00.000Z")

  while (current <= end) {
    dates.push(new Date(current))
    current.setUTCDate(current.getUTCDate() + 1)
  }

  if (block) {
    await prisma.blockedDate.createMany({
      data: dates.map((date) => ({ roomId, date })),
      skipDuplicates: true,
    })
  } else {
    await prisma.blockedDate.deleteMany({
      where: {
        roomId,
        date: { in: dates },
      },
    })
  }

  revalidatePath("/availability")
}

/**
 * Update availability settings for a room.
 * Validates with coerced schema, returns { error } on failure.
 */
export async function updateRoomAvailabilitySettings(
  roomId: string,
  data: unknown
): Promise<{ room: object } | { error: object }> {
  const landlord = await getLandlordForAdmin()
  await verifyRoomOwnership(roomId, landlord.id)

  const parsed = roomAvailabilitySettingsSchemaCoerced.safeParse(data)
  if (!parsed.success) {
    return { error: parsed.error.flatten() }
  }

  const { minStayNights, maxStayNights, bookingWindowMonths } = parsed.data

  const room = await prisma.room.update({
    where: { id: roomId },
    data: { minStayNights, maxStayNights, bookingWindowMonths },
  })

  revalidatePath("/availability")

  return { room }
}
