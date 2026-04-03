import { prisma } from "@/lib/prisma"

/**
 * Get all unavailable date strings for a room.
 * Combines:
 * - BlockedDate rows (manual blocks + iCal sync)
 * - Nights from APPROVED/PAID bookings (checkin inclusive, checkout exclusive)
 *
 * Returns sorted, deduplicated YYYY-MM-DD strings.
 */
export async function getUnavailableDates(roomId: string): Promise<string[]> {
  const [blockedDates, bookings] = await Promise.all([
    prisma.blockedDate.findMany({
      where: { roomId },
      select: { date: true },
    }),
    prisma.booking.findMany({
      where: {
        roomId,
        status: { in: ["APPROVED", "PAID"] },
      },
      select: { checkin: true, checkout: true },
    }),
  ])

  const dateSet = new Set<string>()

  // Add blocked dates
  for (const b of blockedDates) {
    dateSet.add(b.date.toISOString().slice(0, 10))
  }

  // Add booked nights: checkin (inclusive) to checkout (exclusive)
  for (const booking of bookings) {
    const cursor = new Date(booking.checkin)
    const end = new Date(booking.checkout)
    while (cursor < end) {
      dateSet.add(cursor.toISOString().slice(0, 10))
      cursor.setUTCDate(cursor.getUTCDate() + 1)
    }
  }

  return [...dateSet].sort()
}
