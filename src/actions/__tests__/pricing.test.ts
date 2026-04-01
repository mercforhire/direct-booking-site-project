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

// NOTE: These imports will fail until Plan 03 creates src/actions/pricing.ts
// This is intentional RED state — the test stubs establish the contract.
import {
  setDatePriceOverride,
  clearDatePriceOverride,
  setRangePriceOverride,
} from "@/actions/pricing"

const ROOM_ID = "room-1"

describe("setDatePriceOverride", () => {
  beforeEach(() => {
    mockPrisma.landlord.findUnique.mockResolvedValue({ id: "landlord-1", adminUserId: "admin-1" } as any)
    mockPrisma.room.findUnique.mockResolvedValue({ id: "room-1", landlordId: "landlord-1" } as any)
  })

  it("upserts with noon-UTC date key for '2026-05-01'", async () => {
    mockPrisma.datePriceOverride.upsert.mockResolvedValue({
      id: "dpo-1",
      roomId: ROOM_ID,
      date: new Date("2026-05-01T12:00:00.000Z"),
      price: 150,
    } as any)

    await setDatePriceOverride(ROOM_ID, "2026-05-01", 150)

    expect(mockPrisma.datePriceOverride.upsert).toHaveBeenCalledOnce()
    const callArgs = mockPrisma.datePriceOverride.upsert.mock.calls[0][0] as any
    const usedDate: Date = callArgs.where.roomId_date.date
    expect(usedDate.toISOString()).toBe("2026-05-01T12:00:00.000Z")
  })

  it("throws when no user is authenticated (requireAuth guard)", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: null }, error: null })

    await expect(setDatePriceOverride(ROOM_ID, "2026-05-01", 150)).rejects.toThrow()
  })
})

describe("clearDatePriceOverride", () => {
  beforeEach(() => {
    mockPrisma.landlord.findUnique.mockResolvedValue({ id: "landlord-1", adminUserId: "admin-1" } as any)
    mockPrisma.room.findUnique.mockResolvedValue({ id: "room-1", landlordId: "landlord-1" } as any)
  })

  it("calls deleteMany with correct noon-UTC date for '2026-05-01'", async () => {
    mockPrisma.datePriceOverride.deleteMany.mockResolvedValue({ count: 1 })

    await clearDatePriceOverride(ROOM_ID, "2026-05-01")

    expect(mockPrisma.datePriceOverride.deleteMany).toHaveBeenCalledOnce()
    const callArgs = mockPrisma.datePriceOverride.deleteMany.mock.calls[0][0] as any
    const usedDate: Date = callArgs.where.date
    expect(usedDate.toISOString()).toBe("2026-05-01T12:00:00.000Z")
  })

  it("does not throw (no-op) when row is absent (count = 0)", async () => {
    mockPrisma.datePriceOverride.deleteMany.mockResolvedValue({ count: 0 })

    await expect(clearDatePriceOverride(ROOM_ID, "2026-05-01")).resolves.not.toThrow()
  })
})

describe("setRangePriceOverride", () => {
  it("deletes existing range rows then creates 3 rows for '2026-05-01' to '2026-05-03' at price 150", async () => {
    mockPrisma.datePriceOverride.deleteMany.mockResolvedValue({ count: 0 })
    mockPrisma.datePriceOverride.createMany.mockResolvedValue({ count: 3 })

    await setRangePriceOverride(ROOM_ID, "2026-05-01", "2026-05-03", 150)

    const expectedDates = [
      new Date("2026-05-01T12:00:00.000Z"),
      new Date("2026-05-02T12:00:00.000Z"),
      new Date("2026-05-03T12:00:00.000Z"),
    ]

    // deleteMany called with the range dates
    expect(mockPrisma.datePriceOverride.deleteMany).toHaveBeenCalledOnce()
    const deleteManyArgs = mockPrisma.datePriceOverride.deleteMany.mock.calls[0][0] as any
    expect(deleteManyArgs).toMatchObject({
      where: {
        roomId: ROOM_ID,
        date: {
          in: expect.arrayContaining([
            expect.objectContaining({ toISOString: expect.any(Function) }),
          ]),
        },
      },
    })
    const deletedDates: Date[] = deleteManyArgs.where.date.in
    expect(deletedDates).toHaveLength(3)
    expect(deletedDates[0].toISOString()).toBe("2026-05-01T12:00:00.000Z")
    expect(deletedDates[1].toISOString()).toBe("2026-05-02T12:00:00.000Z")
    expect(deletedDates[2].toISOString()).toBe("2026-05-03T12:00:00.000Z")

    // createMany called with 3 rows at price 150
    expect(mockPrisma.datePriceOverride.createMany).toHaveBeenCalledOnce()
    const createManyArgs = mockPrisma.datePriceOverride.createMany.mock.calls[0][0] as any
    const data: Array<{ roomId: string; date: Date; price: number }> = createManyArgs.data
    expect(data).toHaveLength(3)
    expect(data[0].date.toISOString()).toBe("2026-05-01T12:00:00.000Z")
    expect(data[1].date.toISOString()).toBe("2026-05-02T12:00:00.000Z")
    expect(data[2].date.toISOString()).toBe("2026-05-03T12:00:00.000Z")
    expect(data[0].price).toBe(150)
    expect(data[1].price).toBe(150)
    expect(data[2].price).toBe(150)
  })
})
