import { describe, it, expect, vi, beforeEach } from "vitest"
import "../lib/prisma-mock"
import { mockPrisma } from "../lib/prisma-mock"

// Mock next/cache before importing the action
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))

// Mock Supabase server client
const mockGetUser = vi.fn()
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(() =>
    Promise.resolve({
      auth: { getUser: mockGetUser },
    })
  ),
}))

import {
  toggleBlockedDate,
  saveBlockedRange,
  updateRoomAvailabilitySettings,
} from "@/actions/availability"

describe("availability actions", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockPrisma.landlord.findUnique.mockResolvedValue({ id: "landlord-1", adminUserId: "admin-1" } as any)
    mockPrisma.room.findUnique.mockResolvedValue({ id: "room-1", landlordId: "landlord-1" } as any)
  })

  describe("toggleBlockedDate", () => {
    it("creates a row when the date is not currently blocked", async () => {
      mockGetUser.mockResolvedValue({
        data: { user: { id: "user-1" } },
        error: null,
      })
      mockPrisma.blockedDate.findUnique.mockResolvedValue(null)
      mockPrisma.blockedDate.create.mockResolvedValue({
        id: "bd-1",
        roomId: "room-1",
        date: new Date("2026-04-01T00:00:00.000Z"),
      })

      await toggleBlockedDate("room-1", "2026-04-01")

      expect(mockPrisma.blockedDate.findUnique).toHaveBeenCalledOnce()
      expect(mockPrisma.blockedDate.create).toHaveBeenCalledOnce()
      expect(mockPrisma.blockedDate.delete).not.toHaveBeenCalled()
    })

    it("deletes the row when the date is already blocked", async () => {
      mockGetUser.mockResolvedValue({
        data: { user: { id: "user-1" } },
        error: null,
      })
      const existing = {
        id: "bd-1",
        roomId: "room-1",
        date: new Date("2026-04-01T00:00:00.000Z"),
      }
      mockPrisma.blockedDate.findUnique.mockResolvedValue(existing)
      mockPrisma.blockedDate.delete.mockResolvedValue(existing)

      await toggleBlockedDate("room-1", "2026-04-01")

      expect(mockPrisma.blockedDate.findUnique).toHaveBeenCalledOnce()
      expect(mockPrisma.blockedDate.delete).toHaveBeenCalledOnce()
      expect(mockPrisma.blockedDate.create).not.toHaveBeenCalled()
    })

    it("throws Unauthorized when getUser returns no user", async () => {
      mockGetUser.mockResolvedValue({
        data: { user: null },
        error: new Error("No user"),
      })

      await expect(toggleBlockedDate("room-1", "2026-04-01")).rejects.toThrow(
        "Unauthorized"
      )
    })
  })

  describe("saveBlockedRange", () => {
    it("calls createMany with all dates in range when block=true", async () => {
      mockGetUser.mockResolvedValue({
        data: { user: { id: "user-1" } },
        error: null,
      })
      mockPrisma.blockedDate.createMany.mockResolvedValue({ count: 3 })

      await saveBlockedRange("room-1", "2026-04-01", "2026-04-03", true)

      expect(mockPrisma.blockedDate.createMany).toHaveBeenCalledOnce()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const callArgs = mockPrisma.blockedDate.createMany.mock.calls[0]![0] as any
      expect(callArgs.data).toHaveLength(3)
      expect(callArgs.skipDuplicates).toBe(true)
    })

    it("calls deleteMany with all dates in range when block=false", async () => {
      mockGetUser.mockResolvedValue({
        data: { user: { id: "user-1" } },
        error: null,
      })
      mockPrisma.blockedDate.deleteMany.mockResolvedValue({ count: 3 })

      await saveBlockedRange("room-1", "2026-04-01", "2026-04-03", false)

      expect(mockPrisma.blockedDate.deleteMany).toHaveBeenCalledOnce()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const callArgs = mockPrisma.blockedDate.deleteMany.mock.calls[0]![0] as any
      expect(callArgs.where.date.in).toHaveLength(3)
    })

    it("creates exactly one date for a single-day range when block=true", async () => {
      mockGetUser.mockResolvedValue({
        data: { user: { id: "user-1" } },
        error: null,
      })
      mockPrisma.blockedDate.createMany.mockResolvedValue({ count: 1 })

      await saveBlockedRange("room-1", "2026-04-01", "2026-04-01", true)

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const callArgs = mockPrisma.blockedDate.createMany.mock.calls[0]![0] as any
      expect(callArgs.data).toHaveLength(1)
    })

    it("deletes exactly one date for a single-day range when block=false", async () => {
      mockGetUser.mockResolvedValue({
        data: { user: { id: "user-1" } },
        error: null,
      })
      mockPrisma.blockedDate.deleteMany.mockResolvedValue({ count: 1 })

      await saveBlockedRange("room-1", "2026-04-01", "2026-04-01", false)

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const callArgs = mockPrisma.blockedDate.deleteMany.mock.calls[0]![0] as any
      expect(callArgs.where.date.in).toHaveLength(1)
    })
  })

  describe("updateRoomAvailabilitySettings", () => {
    it("updates Room with minStayNights, maxStayNights, bookingWindowMonths", async () => {
      mockGetUser.mockResolvedValue({
        data: { user: { id: "user-1" } },
        error: null,
      })
      const mockRoom = {
        id: "room-1",
        minStayNights: 2,
        maxStayNights: 14,
        bookingWindowMonths: 6,
      }
      mockPrisma.room.update.mockResolvedValue(mockRoom as any)

      const result = await updateRoomAvailabilitySettings("room-1", {
        minStayNights: 2,
        maxStayNights: 14,
        bookingWindowMonths: 6,
      })

      expect(result).toHaveProperty("room")
      expect(mockPrisma.room.update).toHaveBeenCalledWith({
        where: { id: "room-1" },
        data: { minStayNights: 2, maxStayNights: 14, bookingWindowMonths: 6 },
      })
    })

    it("returns { error } when given an invalid bookingWindowMonths (e.g. 10)", async () => {
      mockGetUser.mockResolvedValue({
        data: { user: { id: "user-1" } },
        error: null,
      })

      const result = await updateRoomAvailabilitySettings("room-1", {
        minStayNights: 1,
        maxStayNights: 30,
        bookingWindowMonths: 10,
      })

      expect(result).toHaveProperty("error")
      expect(mockPrisma.room.update).not.toHaveBeenCalled()
    })

    it("throws Unauthorized when not authenticated", async () => {
      mockGetUser.mockResolvedValue({
        data: { user: null },
        error: new Error("No user"),
      })

      await expect(
        updateRoomAvailabilitySettings("room-1", {
          minStayNights: 1,
          maxStayNights: 30,
          bookingWindowMonths: 3,
        })
      ).rejects.toThrow("Unauthorized")
    })
  })
})
