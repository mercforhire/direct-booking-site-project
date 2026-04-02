import { describe, it, expect, vi, beforeEach } from "vitest"
import "../lib/prisma-mock"
import { mockPrisma } from "../lib/prisma-mock"

// Mock next/cache (server action requirement)
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))

// Mock Supabase server client (imported transitively by getLandlordIdsForAdmin)
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(() =>
    Promise.resolve({
      auth: {
        getUser: vi
          .fn()
          .mockResolvedValue({ data: { user: { id: "user-1" } }, error: null }),
      },
    })
  ),
}))

// Mock syncRoomIcal so triggerRoomSync tests don't hit real sync logic
vi.mock("@/actions/ical-sync", () => ({
  syncRoomIcal: vi.fn().mockResolvedValue({ synced: 3, errors: [] }),
}))

import { addIcalSource, removeIcalSource, triggerRoomSync } from "@/actions/ical-source"
import { syncRoomIcal } from "@/actions/ical-sync"
import { revalidatePath } from "next/cache"

// ── Tests ────────────────────────────────────────────────────

describe("ical-source actions", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Re-apply defaults that prisma-mock's beforeEach sets (cleared above)
    mockPrisma.landlord.findMany.mockResolvedValue([
      { id: "landlord-1", adminUserId: "admin-1" },
    ] as any)
    mockPrisma.room.findUnique.mockResolvedValue({
      id: "room-1",
      landlordId: "landlord-1",
    } as any)
  })

  // ── addIcalSource ──────────────────────────────────────────

  describe("addIcalSource", () => {
    it("creates record for owned room with valid URL", async () => {
      mockPrisma.icalSource.create.mockResolvedValue({
        id: "src-new",
        roomId: "room-1",
        url: "https://airbnb.com/calendar/ical/123.ics",
        label: "Airbnb",
      } as any)

      const result = await addIcalSource(
        "room-1",
        "https://airbnb.com/calendar/ical/123.ics",
        "Airbnb"
      )

      expect(result).toEqual({ id: "src-new" })
      expect(mockPrisma.icalSource.create).toHaveBeenCalledWith({
        data: {
          roomId: "room-1",
          url: "https://airbnb.com/calendar/ical/123.ics",
          label: "Airbnb",
        },
      })
      expect(revalidatePath).toHaveBeenCalledWith("/admin/rooms/room-1/edit")
      expect(revalidatePath).toHaveBeenCalledWith("/availability")
    })

    it("sets label to null when not provided", async () => {
      mockPrisma.icalSource.create.mockResolvedValue({
        id: "src-new",
      } as any)

      await addIcalSource("room-1", "https://example.com/cal.ics")

      expect(mockPrisma.icalSource.create).toHaveBeenCalledWith({
        data: {
          roomId: "room-1",
          url: "https://example.com/cal.ics",
          label: null,
        },
      })
    })

    it("rejects invalid URL", async () => {
      await expect(
        addIcalSource("room-1", "not-a-valid-url")
      ).rejects.toThrow("Invalid URL")

      expect(mockPrisma.icalSource.create).not.toHaveBeenCalled()
    })

    it("rejects empty string URL", async () => {
      await expect(addIcalSource("room-1", "")).rejects.toThrow("Invalid URL")

      expect(mockPrisma.icalSource.create).not.toHaveBeenCalled()
    })

    it("rejects if room not owned by admin", async () => {
      mockPrisma.room.findUnique.mockResolvedValue({
        id: "room-1",
        landlordId: "other-landlord",
      } as any)

      await expect(
        addIcalSource("room-1", "https://example.com/cal.ics")
      ).rejects.toThrow("Room not found")

      expect(mockPrisma.icalSource.create).not.toHaveBeenCalled()
    })

    it("rejects if room does not exist", async () => {
      mockPrisma.room.findUnique.mockResolvedValue(null)

      await expect(
        addIcalSource("room-1", "https://example.com/cal.ics")
      ).rejects.toThrow("Room not found")
    })
  })

  // ── removeIcalSource ───────────────────────────────────────

  describe("removeIcalSource", () => {
    it("deletes record for owned room", async () => {
      mockPrisma.icalSource.findUnique.mockResolvedValue({
        id: "src-1",
        roomId: "room-1",
        room: { landlordId: "landlord-1" },
      } as any)
      mockPrisma.icalSource.delete.mockResolvedValue({} as any)

      await removeIcalSource("src-1")

      expect(mockPrisma.icalSource.delete).toHaveBeenCalledWith({
        where: { id: "src-1" },
      })
      expect(revalidatePath).toHaveBeenCalledWith("/admin/rooms/room-1/edit")
      expect(revalidatePath).toHaveBeenCalledWith("/availability")
    })

    it("rejects if source's room not owned by admin", async () => {
      mockPrisma.icalSource.findUnique.mockResolvedValue({
        id: "src-1",
        roomId: "room-1",
        room: { landlordId: "other-landlord" },
      } as any)

      await expect(removeIcalSource("src-1")).rejects.toThrow(
        "Source not found"
      )

      expect(mockPrisma.icalSource.delete).not.toHaveBeenCalled()
    })

    it("rejects if source does not exist", async () => {
      mockPrisma.icalSource.findUnique.mockResolvedValue(null)

      await expect(removeIcalSource("src-nonexistent")).rejects.toThrow(
        "Source not found"
      )
    })
  })

  // ── triggerRoomSync ────────────────────────────────────────

  describe("triggerRoomSync", () => {
    it("calls syncRoomIcal and revalidates paths", async () => {
      const result = await triggerRoomSync("room-1")

      expect(syncRoomIcal).toHaveBeenCalledWith("room-1")
      expect(result).toEqual({ synced: 3, errors: [] })
      expect(revalidatePath).toHaveBeenCalledWith("/admin/rooms/room-1/edit")
      expect(revalidatePath).toHaveBeenCalledWith("/availability")
    })

    it("rejects if room not owned by admin", async () => {
      mockPrisma.room.findUnique.mockResolvedValue({
        id: "room-1",
        landlordId: "other-landlord",
      } as any)

      await expect(triggerRoomSync("room-1")).rejects.toThrow(
        "Room not found"
      )

      expect(syncRoomIcal).not.toHaveBeenCalled()
    })

    it("propagates sync errors from syncRoomIcal", async () => {
      vi.mocked(syncRoomIcal).mockResolvedValueOnce({
        synced: 0,
        errors: ["[Airbnb] HTTP 500"],
      })

      const result = await triggerRoomSync("room-1")

      expect(result).toEqual({ synced: 0, errors: ["[Airbnb] HTTP 500"] })
    })
  })
})
