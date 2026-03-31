import { describe, it, expect, vi, beforeEach } from "vitest"

// --- Prisma mock (shared helper registers vi.mock + exports mockPrisma) ---
import "../../../tests/lib/prisma-mock"
import { mockPrisma } from "../../../tests/lib/prisma-mock"

// --- next/cache mock ---
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))

// --- Supabase auth mock ---
const { mockGetUser } = vi.hoisted(() => ({
  mockGetUser: vi.fn().mockResolvedValue({ data: { user: { id: "admin-1" } }, error: null }),
}))
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(() => ({ auth: { getUser: mockGetUser } })),
}))

const ROOM_ID = "room-1"

describe("toggleBlockedDate", () => {
  beforeEach(() => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "admin-1" } }, error: null })
    vi.clearAllMocks()
    mockGetUser.mockResolvedValue({ data: { user: { id: "admin-1" } }, error: null })
  })

  describe("block path (findUnique returns null)", () => {
    it("calls findUnique with noon-UTC date when given '2026-05-01'", async () => {
      mockPrisma.blockedDate.findUnique.mockResolvedValue(null)
      mockPrisma.blockedDate.create.mockResolvedValue({} as any)

      const { toggleBlockedDate } = await import("@/actions/availability")
      await toggleBlockedDate(ROOM_ID, "2026-05-01")

      expect(mockPrisma.blockedDate.findUnique).toHaveBeenCalledOnce()
      const callArgs = mockPrisma.blockedDate.findUnique.mock.calls[0][0] as any
      const usedDate: Date = callArgs.where.roomId_date.date
      // FAILS against current T00:00:00.000Z code — expects noon UTC
      expect(usedDate.toISOString()).toBe("2026-05-01T12:00:00.000Z")
    })

    it("creates BlockedDate with noon-UTC date when date is unblocked", async () => {
      mockPrisma.blockedDate.findUnique.mockResolvedValue(null)
      mockPrisma.blockedDate.create.mockResolvedValue({} as any)

      const { toggleBlockedDate } = await import("@/actions/availability")
      await toggleBlockedDate(ROOM_ID, "2026-05-01")

      expect(mockPrisma.blockedDate.create).toHaveBeenCalledOnce()
      const createCallArgs = mockPrisma.blockedDate.create.mock.calls[0][0] as any
      const createdDate: Date = createCallArgs.data.date
      // FAILS against current T00:00:00.000Z code — expects noon UTC
      expect(createdDate.toISOString()).toBe("2026-05-01T12:00:00.000Z")
    })
  })

  describe("unblock path (findUnique returns existing record)", () => {
    it("calls delete when findUnique returns an existing record", async () => {
      const existingRecord = { roomId: ROOM_ID, date: new Date("2026-05-01T12:00:00.000Z") }
      mockPrisma.blockedDate.findUnique.mockResolvedValue(existingRecord as any)
      mockPrisma.blockedDate.delete.mockResolvedValue(existingRecord as any)

      const { toggleBlockedDate } = await import("@/actions/availability")
      await toggleBlockedDate(ROOM_ID, "2026-05-01")

      expect(mockPrisma.blockedDate.delete).toHaveBeenCalledOnce()
      expect(mockPrisma.blockedDate.create).not.toHaveBeenCalled()
    })
  })
})

describe("saveBlockedRange", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetUser.mockResolvedValue({ data: { user: { id: "admin-1" } }, error: null })
  })

  describe("block=true (createMany path)", () => {
    it("calls createMany with 3 noon-UTC dates for range '2026-05-01' to '2026-05-03'", async () => {
      mockPrisma.blockedDate.createMany.mockResolvedValue({ count: 3 })

      const { saveBlockedRange } = await import("@/actions/availability")
      await saveBlockedRange(ROOM_ID, "2026-05-01", "2026-05-03", true)

      expect(mockPrisma.blockedDate.createMany).toHaveBeenCalledOnce()
      const createManyArgs = mockPrisma.blockedDate.createMany.mock.calls[0][0] as any
      const data: Array<{ roomId: string; date: Date }> = createManyArgs.data

      expect(data).toHaveLength(3)
      // FAILS against current T00:00:00.000Z code — expects noon UTC
      expect(data[0].date.toISOString()).toBe("2026-05-01T12:00:00.000Z")
      expect(data[1].date.toISOString()).toBe("2026-05-02T12:00:00.000Z")
      expect(data[2].date.toISOString()).toBe("2026-05-03T12:00:00.000Z")
    })

    it("advances cursor by exactly 1 calendar day per step (UTC-safe range increment)", async () => {
      mockPrisma.blockedDate.createMany.mockResolvedValue({ count: 3 })

      const { saveBlockedRange } = await import("@/actions/availability")
      await saveBlockedRange(ROOM_ID, "2026-05-01", "2026-05-03", true)

      const createManyArgs = mockPrisma.blockedDate.createMany.mock.calls[0][0] as any
      const data: Array<{ roomId: string; date: Date }> = createManyArgs.data

      // Each consecutive date should be exactly 86400000ms (1 day) apart
      for (let i = 1; i < data.length; i++) {
        const diff = data[i].date.getTime() - data[i - 1].date.getTime()
        expect(diff).toBe(86400000)
      }
    })
  })

  describe("block=false (deleteMany path)", () => {
    it("calls deleteMany with noon-UTC dates when unblocking '2026-05-01' to '2026-05-03'", async () => {
      mockPrisma.blockedDate.deleteMany.mockResolvedValue({ count: 3 })

      const { saveBlockedRange } = await import("@/actions/availability")
      await saveBlockedRange(ROOM_ID, "2026-05-01", "2026-05-03", false)

      expect(mockPrisma.blockedDate.deleteMany).toHaveBeenCalledOnce()
      const deleteManyArgs = mockPrisma.blockedDate.deleteMany.mock.calls[0][0] as any
      const dates: Date[] = deleteManyArgs.where.date.in

      expect(dates).toHaveLength(3)
      // FAILS against current T00:00:00.000Z code — expects noon UTC
      expect(dates[0].toISOString()).toBe("2026-05-01T12:00:00.000Z")
      expect(dates[1].toISOString()).toBe("2026-05-02T12:00:00.000Z")
      expect(dates[2].toISOString()).toBe("2026-05-03T12:00:00.000Z")
    })
  })
})
