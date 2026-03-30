import { describe, it, expect } from "vitest"
import { isRoomAvailable } from "@/lib/availability-filter"

// isRoomAvailable is a pure function — no mocks needed.

const makeRoom = (blockedDateStrings: string[], opts?: { bookingWindowMonths?: number; maxGuests?: number }) => ({
  blockedDateStrings,
  bookingWindowMonths: opts?.bookingWindowMonths ?? 6,
  maxGuests: opts?.maxGuests ?? 4,
})

describe("isRoomAvailable", () => {
  describe("blocked date overlap (core bug)", () => {
    // blockedDateStrings contain dates as produced by noon-UTC fixed code:
    // toISOString().slice(0, 10) of a noon-UTC Date === the correct YYYY-MM-DD
    const room = makeRoom(["2026-05-02"])

    it("returns false when checkin/checkout range spans a blocked date", () => {
      // 2026-05-01 to 2026-05-03 spans night of 2026-05-02 → blocked
      const result = isRoomAvailable(room, "2026-05-01", "2026-05-03", 2)
      expect(result).toBe(false)
    })

    it("returns true when checkin/checkout range does not touch the blocked date", () => {
      // 2026-05-03 to 2026-05-05 does not span 2026-05-02 → available
      const result = isRoomAvailable(room, "2026-05-03", "2026-05-05", 2)
      expect(result).toBe(true)
    })
  })

  describe("date string format consistency", () => {
    it("correctly identifies a blocked date produced by noon-UTC toISOString().slice(0,10)", () => {
      // A noon-UTC Date produces the correct YYYY-MM-DD regardless of server timezone
      const noonUTCDateStr = new Date("2026-06-15T12:00:00.000Z").toISOString().slice(0, 10)
      // Should equal "2026-06-15"
      expect(noonUTCDateStr).toBe("2026-06-15")

      const room = makeRoom([noonUTCDateStr])
      // checkin 2026-06-14, checkout 2026-06-16 spans the blocked night of 2026-06-15
      const result = isRoomAvailable(room, "2026-06-14", "2026-06-16", 1)
      expect(result).toBe(false)
    })
  })

  describe("cursor increment stays in same day (UTC safety)", () => {
    it("returns false when a blocked date falls on DST changeover day (2026-03-08 ET spring-forward)", () => {
      // DST spring-forward in US Eastern: 2026-03-08 (clocks jump 02:00 → 03:00)
      // If cursor uses local midnight T00:00:00 without Z, DST could shift dates.
      // The correct cursor must use UTC so it hits calendar date 2026-03-08.
      const room = makeRoom(["2026-03-08"])
      // checkin 2026-03-07, checkout 2026-03-10 spans three nights: 03-07, 03-08, 03-09
      const result = isRoomAvailable(room, "2026-03-07", "2026-03-10", 2)
      // blocked date 2026-03-08 falls within range → false
      expect(result).toBe(false)
    })
  })

  describe("guest count check", () => {
    it("returns false when guests exceed room maxGuests regardless of dates", () => {
      const room = makeRoom([], { maxGuests: 2 })
      const result = isRoomAvailable(room, "2026-05-01", "2026-05-05", 3)
      expect(result).toBe(false)
    })

    it("returns true when guests equal maxGuests and dates are clear", () => {
      const room = makeRoom([], { maxGuests: 2 })
      const result = isRoomAvailable(room, "2026-05-01", "2026-05-05", 2)
      expect(result).toBe(true)
    })
  })

  describe("empty dates", () => {
    it("returns true when checkin is empty string", () => {
      const room = makeRoom(["2026-05-02"])
      const result = isRoomAvailable(room, "", "2026-05-05", 2)
      expect(result).toBe(true)
    })

    it("returns true when checkout is empty string", () => {
      const room = makeRoom(["2026-05-02"])
      const result = isRoomAvailable(room, "2026-05-01", "", 2)
      expect(result).toBe(true)
    })

    it("returns true when both dates are empty strings", () => {
      const room = makeRoom(["2026-05-02"])
      const result = isRoomAvailable(room, "", "", 2)
      expect(result).toBe(true)
    })
  })
})
