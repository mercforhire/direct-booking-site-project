import { prisma } from "@/lib/prisma"
import { getUnavailableDates } from "@/lib/unavailable-dates"

/**
 * Compute the lowest available nightly price for a room in the next 30 days.
 * Only considers dates that are NOT blocked and NOT booked.
 * Falls back to baseNightlyRate if no price overrides exist for available dates.
 */
export async function getFromPrice(
  roomId: string,
  baseNightlyRate: number
): Promise<number> {
  const today = new Date()
  const thirtyDaysOut = new Date(today)
  thirtyDaysOut.setDate(thirtyDaysOut.getDate() + 30)

  // Get all unavailable dates (blocked + booked)
  const unavailable = new Set(await getUnavailableDates(roomId))

  // Get all price overrides in the next 30 days
  const overrides = await prisma.datePriceOverride.findMany({
    where: { roomId, date: { gte: today, lte: thirtyDaysOut } },
    select: { date: true, price: true },
    orderBy: { price: "asc" },
  })

  // Find the lowest price on an available date
  for (const o of overrides) {
    const dateStr = o.date.toISOString().slice(0, 10)
    if (!unavailable.has(dateStr)) {
      return Number(o.price)
    }
  }

  // No available overrides — fall back to base rate
  return baseNightlyRate
}
