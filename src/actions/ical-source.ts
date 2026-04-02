"use server"

import { prisma } from "@/lib/prisma"
import { getLandlordIdsForAdmin } from "@/lib/landlord"
import { syncRoomIcal } from "@/actions/ical-sync"
import { revalidatePath } from "next/cache"

async function verifyRoomOwnership(roomId: string, landlordIds: string[]) {
  const room = await prisma.room.findUnique({
    where: { id: roomId },
    select: { landlordId: true },
  })
  if (!room || !landlordIds.includes(room.landlordId))
    throw new Error("Room not found")
  return room
}

/**
 * Add an iCal source URL to a room.
 * Validates URL format and verifies admin ownership of the room.
 */
export async function addIcalSource(
  roomId: string,
  url: string,
  label?: string
): Promise<{ id: string }> {
  const landlordIds = await getLandlordIdsForAdmin()
  await verifyRoomOwnership(roomId, landlordIds)

  // Validate URL — throws TypeError if malformed
  try {
    new URL(url)
  } catch {
    throw new Error("Invalid URL")
  }

  const source = await prisma.icalSource.create({
    data: { roomId, url, label: label ?? null },
  })

  revalidatePath(`/admin/rooms/${roomId}/edit`)
  revalidatePath("/availability")

  return { id: source.id }
}

/**
 * Remove an iCal source by ID.
 * Verifies admin ownership of the room the source belongs to.
 */
export async function removeIcalSource(
  sourceId: string
): Promise<void> {
  const landlordIds = await getLandlordIdsForAdmin()

  const source = await prisma.icalSource.findUnique({
    where: { id: sourceId },
    include: { room: true },
  })
  if (!source || !landlordIds.includes(source.room.landlordId))
    throw new Error("Source not found")

  await prisma.icalSource.delete({ where: { id: sourceId } })

  revalidatePath(`/admin/rooms/${source.roomId}/edit`)
  revalidatePath("/availability")
}

/**
 * Trigger an immediate iCal sync for a room.
 * Verifies admin ownership, delegates to syncRoomIcal, and revalidates.
 */
export async function triggerRoomSync(
  roomId: string
): Promise<{ synced: number; errors: string[] }> {
  const landlordIds = await getLandlordIdsForAdmin()
  await verifyRoomOwnership(roomId, landlordIds)

  const result = await syncRoomIcal(roomId)

  revalidatePath(`/admin/rooms/${roomId}/edit`)
  revalidatePath("/availability")

  return result
}
