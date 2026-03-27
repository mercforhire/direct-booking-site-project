import { describe, it, expect } from "vitest"
import { isRoomAvailable } from "@/lib/availability-filter"

const baseRoom = {
  blockedDateStrings: [],
  bookingWindowMonths: 12,
  maxGuests: 4,
}

describe("isRoomAvailable", () => {
  it("returns true when no checkin/checkout provided", () => {
    expect(isRoomAvailable(baseRoom, "", "", 2)).toBe(true)
  })

  it("returns false when maxGuests < guests param", () => {
    expect(isRoomAvailable(baseRoom, "2026-06-01", "2026-06-05", 5)).toBe(false)
  })

  it("returns false when a date in the range is in blockedDateStrings", () => {
    const room = { ...baseRoom, blockedDateStrings: ["2026-06-03"] }
    expect(isRoomAvailable(room, "2026-06-01", "2026-06-05", 2)).toBe(false)
  })

  it("returns false when checkout exceeds bookingWindowMonths from today", () => {
    // bookingWindowMonths = 1 means only 1 month out
    const room = { ...baseRoom, bookingWindowMonths: 1 }
    // checkout far in the future (2 years)
    expect(isRoomAvailable(room, "2028-01-01", "2028-01-05", 2)).toBe(false)
  })

  it("returns true for a clean range with no conflicts", () => {
    expect(isRoomAvailable(baseRoom, "2026-06-01", "2026-06-05", 2)).toBe(true)
  })

  it("checks up to but NOT including checkout date (departure day is not a blocked night)", () => {
    // checkout day is June 5, which is blocked — but that's departure day, not a night
    const room = { ...baseRoom, blockedDateStrings: ["2026-06-05"] }
    expect(isRoomAvailable(room, "2026-06-01", "2026-06-05", 2)).toBe(true)
  })
})
