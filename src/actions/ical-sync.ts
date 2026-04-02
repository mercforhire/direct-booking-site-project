"use server"

import { prisma } from "@/lib/prisma"
import { parseIcalDates } from "@/lib/ical-parser"

const ICAL_SOURCE_TAG = "AIRBNB_ICAL"

/**
 * Sync a single room's iCal sources: fetch all URLs, parse blocked dates,
 * replace AIRBNB_ICAL rows with the merged result.
 *
 * Manual blocks (source=MANUAL) are never touched.
 */
export async function syncRoomIcal(
  roomId: string
): Promise<{ synced: number; errors: string[] }> {
  const sources = await prisma.icalSource.findMany({
    where: { roomId },
  })

  if (sources.length === 0) {
    return { synced: 0, errors: [] }
  }

  const allDates = new Set<string>()
  const errors: string[] = []

  for (const source of sources) {
    try {
      const response = await fetch(source.url, {
        signal: AbortSignal.timeout(15_000),
      })

      if (!response.ok) {
        const msg = `[${source.label ?? source.url}] HTTP ${response.status}`
        errors.push(msg)
        await prisma.icalSource.update({
          where: { id: source.id },
          data: { syncError: msg, lastSync: new Date() },
        })
        continue
      }

      const icsContent = await response.text()
      const dates = parseIcalDates(icsContent)

      for (const d of dates) {
        allDates.add(d)
      }

      await prisma.icalSource.update({
        where: { id: source.id },
        data: { syncError: null, lastSync: new Date() },
      })
    } catch (err) {
      const msg = `[${source.label ?? source.url}] ${err instanceof Error ? err.message : String(err)}`
      errors.push(msg)
      await prisma.icalSource.update({
        where: { id: source.id },
        data: { syncError: msg, lastSync: new Date() },
      })
    }
  }

  // Replace all AIRBNB_ICAL blocked dates for this room with the merged set
  await prisma.blockedDate.deleteMany({
    where: { roomId, source: ICAL_SOURCE_TAG },
  })

  if (allDates.size > 0) {
    const dateRows = [...allDates].map((dateStr) => ({
      roomId,
      date: new Date(dateStr + "T12:00:00.000Z"),
      source: ICAL_SOURCE_TAG,
    }))

    await prisma.blockedDate.createMany({
      data: dateRows,
      skipDuplicates: true, // manual blocks on the same date won't conflict
    })
  }

  // Clean up all past blocked dates (both MANUAL and AIRBNB_ICAL) to save space.
  // Any date before today is historical and no longer relevant for availability.
  const todayNoon = new Date()
  todayNoon.setUTCHours(12, 0, 0, 0)
  await prisma.blockedDate.deleteMany({
    where: { roomId, date: { lt: todayNoon } },
  })

  return { synced: allDates.size, errors }
}

/**
 * Sync all rooms that have at least one iCal source.
 * Returns per-room results.
 */
export async function syncAllRooms(): Promise<{
  results: { roomId: string; synced: number; errors: string[] }[]
}> {
  // Find distinct roomIds that have at least one IcalSource
  const sources = await prisma.icalSource.findMany({
    select: { roomId: true },
    distinct: ["roomId"],
  })

  const results: { roomId: string; synced: number; errors: string[] }[] = []

  for (const { roomId } of sources) {
    const result = await syncRoomIcal(roomId)
    results.push({ roomId, ...result })
  }

  return { results }
}
