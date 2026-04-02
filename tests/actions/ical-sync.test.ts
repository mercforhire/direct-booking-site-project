import { describe, it, expect, vi, beforeEach } from "vitest"
import "../lib/prisma-mock"
import { mockPrisma } from "../lib/prisma-mock"

// Mock next/cache (server action requirement)
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))

// Mock Supabase server client (imported transitively by getLandlordIdsForAdmin)
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(() =>
    Promise.resolve({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: "user-1" } }, error: null }) },
    })
  ),
}))

import { syncRoomIcal, syncAllRooms } from "@/actions/ical-sync"

// ── Helpers ──────────────────────────────────────────────────

const SIMPLE_ICS = `BEGIN:VCALENDAR
BEGIN:VEVENT
DTSTART;VALUE=DATE:20260410
DTEND;VALUE=DATE:20260413
SUMMARY:Reserved
END:VEVENT
END:VCALENDAR`

const SECOND_ICS = `BEGIN:VCALENDAR
BEGIN:VEVENT
DTSTART;VALUE=DATE:20260412
DTEND;VALUE=DATE:20260415
SUMMARY:Not available
END:VEVENT
END:VCALENDAR`

function makeSource(overrides: Partial<{
  id: string; roomId: string; url: string; label: string | null;
  lastSync: Date | null; syncError: string | null; createdAt: Date; updatedAt: Date;
}> = {}) {
  return {
    id: "src-1",
    roomId: "room-1",
    url: "https://airbnb.com/calendar/ical/1.ics",
    label: "Airbnb",
    lastSync: null,
    syncError: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }
}

function mockFetchSuccess(body: string) {
  return vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    text: () => Promise.resolve(body),
  })
}

function mockFetchFailure(status: number) {
  return vi.fn().mockResolvedValue({
    ok: false,
    status,
    text: () => Promise.resolve(""),
  })
}

// ── Tests ────────────────────────────────────────────────────

describe("ical-sync actions", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Re-apply defaults that prisma-mock's beforeEach sets (cleared above)
    mockPrisma.landlord.findFirst.mockResolvedValue({ id: "landlord-1", adminUserId: "admin-1" } as any)
    mockPrisma.room.findUnique.mockResolvedValue({ id: "room-1", landlordId: "landlord-1" } as any)
    vi.restoreAllMocks()
  })

  describe("syncRoomIcal", () => {
    it("returns { synced: 0 } when room has no iCal sources", async () => {
      mockPrisma.icalSource.findMany.mockResolvedValue([])

      const result = await syncRoomIcal("room-1")

      expect(result).toEqual({ synced: 0, errors: [] })
      expect(mockPrisma.blockedDate.deleteMany).not.toHaveBeenCalled()
    })

    it("fetches URL, parses dates, replaces AIRBNB_ICAL rows", async () => {
      mockPrisma.icalSource.findMany.mockResolvedValue([makeSource()] as any)
      mockPrisma.icalSource.update.mockResolvedValue({} as any)
      mockPrisma.blockedDate.deleteMany.mockResolvedValue({ count: 0 })
      mockPrisma.blockedDate.createMany.mockResolvedValue({ count: 3 })

      // Mock global fetch
      const origFetch = globalThis.fetch
      globalThis.fetch = mockFetchSuccess(SIMPLE_ICS)
      try {
        const result = await syncRoomIcal("room-1")

        // Should have fetched the URL
        expect(globalThis.fetch).toHaveBeenCalledWith(
          "https://airbnb.com/calendar/ical/1.ics",
          expect.objectContaining({ signal: expect.any(AbortSignal) })
        )

        // Should delete existing AIRBNB_ICAL rows
        expect(mockPrisma.blockedDate.deleteMany).toHaveBeenCalledWith({
          where: { roomId: "room-1", source: "AIRBNB_ICAL" },
        })

        // Should create 3 dates (Apr 10, 11, 12)
        expect(mockPrisma.blockedDate.createMany).toHaveBeenCalledOnce()
        const createCall = mockPrisma.blockedDate.createMany.mock.calls[0]![0] as any
        expect(createCall.data).toHaveLength(3)
        expect(createCall.skipDuplicates).toBe(true)

        // Each date should use noon-UTC convention
        for (const row of createCall.data) {
          expect(row.source).toBe("AIRBNB_ICAL")
          expect(row.roomId).toBe("room-1")
          expect(row.date.toISOString()).toMatch(/T12:00:00\.000Z$/)
        }

        // Should clear syncError on the source
        expect(mockPrisma.icalSource.update).toHaveBeenCalledWith(
          expect.objectContaining({
            where: { id: "src-1" },
            data: expect.objectContaining({ syncError: null }),
          })
        )

        expect(result).toEqual({ synced: 3, errors: [] })
      } finally {
        globalThis.fetch = origFetch
      }
    })

    it("merges dates from multiple sources and deduplicates", async () => {
      mockPrisma.icalSource.findMany.mockResolvedValue([
        makeSource({ id: "src-1", url: "https://airbnb.com/cal/1.ics" }),
        makeSource({ id: "src-2", url: "https://airbnb.com/cal/2.ics" }),
      ] as any)
      mockPrisma.icalSource.update.mockResolvedValue({} as any)
      mockPrisma.blockedDate.deleteMany.mockResolvedValue({ count: 0 })
      mockPrisma.blockedDate.createMany.mockResolvedValue({ count: 5 })

      // First source: Apr 10-12, Second source: Apr 12-14 → merged = Apr 10-14 (5 days)
      const origFetch = globalThis.fetch
      let callCount = 0
      globalThis.fetch = vi.fn().mockImplementation(() => {
        callCount++
        const body = callCount === 1 ? SIMPLE_ICS : SECOND_ICS
        return Promise.resolve({ ok: true, status: 200, text: () => Promise.resolve(body) })
      })

      try {
        const result = await syncRoomIcal("room-1")

        const createCall = mockPrisma.blockedDate.createMany.mock.calls[0]![0] as any
        // Apr 10, 11, 12, 13, 14 = 5 unique dates
        expect(createCall.data).toHaveLength(5)
        expect(result.synced).toBe(5)
        expect(result.errors).toEqual([])
      } finally {
        globalThis.fetch = origFetch
      }
    })

    it("records HTTP errors per source but continues syncing others", async () => {
      mockPrisma.icalSource.findMany.mockResolvedValue([
        makeSource({ id: "src-1", url: "https://fail.com/bad.ics", label: "Bad" }),
        makeSource({ id: "src-2", url: "https://good.com/ok.ics", label: "Good" }),
      ] as any)
      mockPrisma.icalSource.update.mockResolvedValue({} as any)
      mockPrisma.blockedDate.deleteMany.mockResolvedValue({ count: 0 })
      mockPrisma.blockedDate.createMany.mockResolvedValue({ count: 3 })

      const origFetch = globalThis.fetch
      let callCount = 0
      globalThis.fetch = vi.fn().mockImplementation((url: string) => {
        callCount++
        if (url.includes("fail.com")) {
          return Promise.resolve({ ok: false, status: 404, text: () => Promise.resolve("") })
        }
        return Promise.resolve({ ok: true, status: 200, text: () => Promise.resolve(SIMPLE_ICS) })
      })

      try {
        const result = await syncRoomIcal("room-1")

        expect(result.errors).toHaveLength(1)
        expect(result.errors[0]).toContain("[Bad]")
        expect(result.errors[0]).toContain("404")
        // Still synced dates from the working source
        expect(result.synced).toBe(3)

        // syncError should be set on the failed source
        const failUpdate = mockPrisma.icalSource.update.mock.calls.find(
          (c) => (c[0] as any).where.id === "src-1"
        )
        expect((failUpdate![0] as any).data.syncError).toContain("404")
      } finally {
        globalThis.fetch = origFetch
      }
    })

    it("handles fetch network errors gracefully", async () => {
      mockPrisma.icalSource.findMany.mockResolvedValue([makeSource()] as any)
      mockPrisma.icalSource.update.mockResolvedValue({} as any)
      mockPrisma.blockedDate.deleteMany.mockResolvedValue({ count: 0 })

      const origFetch = globalThis.fetch
      globalThis.fetch = vi.fn().mockRejectedValue(new Error("DNS resolution failed"))

      try {
        const result = await syncRoomIcal("room-1")

        expect(result.synced).toBe(0)
        expect(result.errors).toHaveLength(1)
        expect(result.errors[0]).toContain("DNS resolution failed")

        // Should set syncError on the source
        expect(mockPrisma.icalSource.update).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.objectContaining({ syncError: expect.stringContaining("DNS resolution failed") }),
          })
        )
      } finally {
        globalThis.fetch = origFetch
      }
    })

    it("deletes old AIRBNB_ICAL rows even when new parsed dates are empty", async () => {
      const EMPTY_ICS = `BEGIN:VCALENDAR\nEND:VCALENDAR`
      mockPrisma.icalSource.findMany.mockResolvedValue([makeSource()] as any)
      mockPrisma.icalSource.update.mockResolvedValue({} as any)
      mockPrisma.blockedDate.deleteMany.mockResolvedValue({ count: 5 })

      const origFetch = globalThis.fetch
      globalThis.fetch = mockFetchSuccess(EMPTY_ICS)

      try {
        const result = await syncRoomIcal("room-1")

        expect(mockPrisma.blockedDate.deleteMany).toHaveBeenCalledWith({
          where: { roomId: "room-1", source: "AIRBNB_ICAL" },
        })
        // No createMany since no dates to insert
        expect(mockPrisma.blockedDate.createMany).not.toHaveBeenCalled()
        expect(result.synced).toBe(0)
      } finally {
        globalThis.fetch = origFetch
      }
    })
  })

  describe("syncAllRooms", () => {
    it("syncs each room that has iCal sources", async () => {
      // distinct roomIds
      mockPrisma.icalSource.findMany
        .mockResolvedValueOnce([{ roomId: "room-1" }, { roomId: "room-2" }] as any)
        // syncRoomIcal calls for room-1
        .mockResolvedValueOnce([makeSource({ roomId: "room-1" })] as any)
        // syncRoomIcal calls for room-2
        .mockResolvedValueOnce([makeSource({ id: "src-2", roomId: "room-2" })] as any)

      mockPrisma.icalSource.update.mockResolvedValue({} as any)
      mockPrisma.blockedDate.deleteMany.mockResolvedValue({ count: 0 })
      mockPrisma.blockedDate.createMany.mockResolvedValue({ count: 3 })

      const origFetch = globalThis.fetch
      globalThis.fetch = mockFetchSuccess(SIMPLE_ICS)

      try {
        const { results } = await syncAllRooms()

        expect(results).toHaveLength(2)
        expect(results[0]!.roomId).toBe("room-1")
        expect(results[0]!.synced).toBe(3)
        expect(results[1]!.roomId).toBe("room-2")
        expect(results[1]!.synced).toBe(3)
      } finally {
        globalThis.fetch = origFetch
      }
    })

    it("returns empty results when no rooms have iCal sources", async () => {
      mockPrisma.icalSource.findMany.mockResolvedValue([])

      const { results } = await syncAllRooms()

      expect(results).toEqual([])
    })
  })

  describe("past date cleanup", () => {
    it("deletes past blocked dates (all sources) after syncing", async () => {
      mockPrisma.icalSource.findMany.mockResolvedValue([makeSource()] as any)
      mockPrisma.icalSource.update.mockResolvedValue({} as any)
      mockPrisma.blockedDate.deleteMany.mockResolvedValue({ count: 0 })
      mockPrisma.blockedDate.createMany.mockResolvedValue({ count: 3 })

      const origFetch = globalThis.fetch
      globalThis.fetch = mockFetchSuccess(SIMPLE_ICS)

      try {
        await syncRoomIcal("room-1")

        // First deleteMany: AIRBNB_ICAL source-scoped
        // Second deleteMany: past dates cleanup (all sources, date < today)
        const deleteCalls = mockPrisma.blockedDate.deleteMany.mock.calls
        expect(deleteCalls).toHaveLength(2)

        // Second call should filter by date < today (noon UTC)
        const cleanupCall = deleteCalls[1]![0] as any
        expect(cleanupCall.where.roomId).toBe("room-1")
        expect(cleanupCall.where.date).toHaveProperty("lt")
        // Should NOT have a source filter — cleans up both MANUAL and AIRBNB_ICAL
        expect(cleanupCall.where).not.toHaveProperty("source")
      } finally {
        globalThis.fetch = origFetch
      }
    })
  })
})
