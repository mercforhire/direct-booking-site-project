/**
 * Determines if a room is available for the given date range and guest count.
 *
 * Rules:
 * - If checkin or checkout is empty string → no filter applied, return true
 * - If maxGuests < guests → room cannot accommodate, return false
 * - If checkout exceeds the booking window → too far out, return false
 * - If any night in [checkin, checkout) is in blockedDateStrings → return false
 * - Otherwise → return true
 */
export function isRoomAvailable(
  room: {
    blockedDateStrings: string[]
    bookingWindowMonths: number
    maxGuests: number
  },
  checkin: string,
  checkout: string,
  guests: number
): boolean {
  // No filter applied if dates are missing
  if (!checkin || !checkout) return true

  // Guest count check
  if (room.maxGuests < guests) return false

  // Booking window check: compute windowEnd from today
  const windowEnd = new Date()
  windowEnd.setMonth(windowEnd.getMonth() + room.bookingWindowMonths)
  const checkoutDate = new Date(checkout + "T00:00:00")
  if (checkoutDate > windowEnd) return false

  // Blocked date overlap: iterate nights from checkin (inclusive) to checkout (exclusive)
  const blockedSet = new Set(room.blockedDateStrings)
  const cursor = new Date(checkin + "T00:00:00")
  const end = new Date(checkout + "T00:00:00")

  while (cursor < end) {
    const dateStr = cursor.toLocaleDateString("en-CA")
    if (blockedSet.has(dateStr)) return false
    cursor.setDate(cursor.getDate() + 1)
  }

  return true
}
