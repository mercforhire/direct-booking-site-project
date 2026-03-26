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

import { createRoom, updateRoom, deleteRoom } from "@/actions/room"

const validRoomData = {
  name: "Ocean View Suite",
  description: "A beautiful suite with ocean views",
  location: "Block B, Unit 3",
  baseNightlyRate: 150,
  cleaningFee: 25,
  extraGuestFee: 10,
  maxGuests: 4,
  isActive: true,
  addOns: [],
}

const mockRoomRecord = {
  id: "room-1",
  name: "Ocean View Suite",
  description: "A beautiful suite with ocean views",
  location: "Block B, Unit 3",
  baseNightlyRate: 150,
  cleaningFee: 25,
  extraGuestFee: 10,
  maxGuests: 4,
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
  photos: [],
  addOns: [],
}

describe("room actions", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe("createRoom", () => {
    it("createRoom with valid data creates a Room and returns { room }", async () => {
      mockGetUser.mockResolvedValue({ data: { user: { id: "user-1", email: "admin@test.com" } }, error: null })

      const txMock = {
        room: { create: vi.fn().mockResolvedValue(mockRoomRecord) },
        addOn: { createMany: vi.fn().mockResolvedValue({ count: 0 }) },
      }
      mockPrisma.$transaction.mockImplementation(async (fn: any) => fn(txMock))

      const result = await createRoom(validRoomData)
      expect(result).toHaveProperty("room")
      expect(txMock.room.create).toHaveBeenCalledOnce()
    })

    it("createRoom with add-ons creates them in the transaction", async () => {
      mockGetUser.mockResolvedValue({ data: { user: { id: "user-1", email: "admin@test.com" } }, error: null })

      const dataWithAddOns = {
        ...validRoomData,
        addOns: [{ name: "Late checkout", price: 30 }],
      }
      const txMock = {
        room: { create: vi.fn().mockResolvedValue(mockRoomRecord) },
        addOn: { createMany: vi.fn().mockResolvedValue({ count: 1 }) },
      }
      mockPrisma.$transaction.mockImplementation(async (fn: any) => fn(txMock))

      const result = await createRoom(dataWithAddOns)
      expect(result).toHaveProperty("room")
      expect(txMock.addOn.createMany).toHaveBeenCalledWith({
        data: [{ roomId: "room-1", name: "Late checkout", price: 30 }],
      })
    })

    it("createRoom with missing required fields returns { error } with field-level messages", async () => {
      mockGetUser.mockResolvedValue({ data: { user: { id: "user-1", email: "admin@test.com" } }, error: null })

      const result = await createRoom({ name: "", description: "" })
      expect(result).toHaveProperty("error")
    })

    it("createRoom called without a session throws Unauthorized", async () => {
      mockGetUser.mockResolvedValue({ data: { user: null }, error: new Error("Not authenticated") })

      await expect(createRoom(validRoomData)).rejects.toThrow("Unauthorized")
    })
  })

  describe("updateRoom", () => {
    it("updateRoom with valid data updates the Room and returns { room }", async () => {
      mockGetUser.mockResolvedValue({ data: { user: { id: "user-1", email: "admin@test.com" } }, error: null })

      const txMock = {
        room: { update: vi.fn().mockResolvedValue(mockRoomRecord) },
        addOn: {
          deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
          createMany: vi.fn().mockResolvedValue({ count: 0 }),
        },
      }
      mockPrisma.$transaction.mockImplementation(async (fn: any) => fn(txMock))

      const result = await updateRoom("room-1", validRoomData)
      expect(result).toHaveProperty("room")
      expect(txMock.room.update).toHaveBeenCalledWith({
        where: { id: "room-1" },
        data: expect.objectContaining({ name: "Ocean View Suite" }),
      })
    })

    it("updateRoom replaces add-ons via deleteMany + createMany in a transaction", async () => {
      mockGetUser.mockResolvedValue({ data: { user: { id: "user-1", email: "admin@test.com" } }, error: null })

      const dataWithAddOns = {
        ...validRoomData,
        addOns: [{ name: "Early checkin", price: 20 }],
      }
      const txMock = {
        room: { update: vi.fn().mockResolvedValue(mockRoomRecord) },
        addOn: {
          deleteMany: vi.fn().mockResolvedValue({ count: 1 }),
          createMany: vi.fn().mockResolvedValue({ count: 1 }),
        },
      }
      mockPrisma.$transaction.mockImplementation(async (fn: any) => fn(txMock))

      await updateRoom("room-1", dataWithAddOns)

      expect(txMock.addOn.deleteMany).toHaveBeenCalledWith({ where: { roomId: "room-1" } })
      expect(txMock.addOn.createMany).toHaveBeenCalledWith({
        data: [{ roomId: "room-1", name: "Early checkin", price: 20 }],
      })
    })

    it("updateRoom called without a session throws Unauthorized", async () => {
      mockGetUser.mockResolvedValue({ data: { user: null }, error: new Error("Not authenticated") })

      await expect(updateRoom("room-1", validRoomData)).rejects.toThrow("Unauthorized")
    })
  })

  describe("deleteRoom", () => {
    it("deleteRoom removes the Room record and returns { success: true }", async () => {
      mockGetUser.mockResolvedValue({ data: { user: { id: "user-1", email: "admin@test.com" } }, error: null })
      mockPrisma.room.delete.mockResolvedValue(mockRoomRecord as any)

      const result = await deleteRoom("room-1")
      expect(result).toEqual({ success: true })
      expect(mockPrisma.room.delete).toHaveBeenCalledWith({ where: { id: "room-1" } })
    })

    it("deleteRoom called without a session throws Unauthorized", async () => {
      mockGetUser.mockResolvedValue({ data: { user: null }, error: new Error("Not authenticated") })

      await expect(deleteRoom("room-1")).rejects.toThrow("Unauthorized")
    })
  })
})
