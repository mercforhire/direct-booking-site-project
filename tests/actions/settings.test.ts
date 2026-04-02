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

import { upsertSettings } from "@/actions/settings"

const mockLandlord = {
  id: "landlord-1",
  slug: "leon",
  name: "Leon's Home",
  ownerName: "Leon",
  address: "9 Highhill Dr",
  email: "test@test.com",
  phone: null,
  bgColor: "#3a392a",
  textColor: "#f0ebe0",
  accentColor: "#d4956a",
  adminUserId: "user-1",
  createdAt: new Date(),
  updatedAt: new Date(),
}

const validSettingsData = {
  serviceFeePercent: 3,
  depositAmount: 100,
}

const mockSettingsRecord = {
  id: "settings-1",
  landlordId: "landlord-1",
  serviceFeePercent: 3,
  depositAmount: 100,
  updatedAt: new Date(),
}

function mockAuthenticatedAdmin() {
  mockGetUser.mockResolvedValue({ data: { user: { id: "user-1", email: "admin@test.com" } }, error: null })
  mockPrisma.landlord.findFirst.mockResolvedValue(mockLandlord as any)
}

describe("settings actions", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe("upsertSettings", () => {
    it("upsertSettings with valid data upserts the Settings row and returns { settings }", async () => {
      mockAuthenticatedAdmin()
      mockPrisma.settings.upsert.mockResolvedValue(mockSettingsRecord as any)

      const result = await upsertSettings(validSettingsData)
      expect(result).toHaveProperty("settings")
      expect(mockPrisma.settings.upsert).toHaveBeenCalledWith({
        where: { landlordId: "landlord-1" },
        create: expect.objectContaining({ landlordId: "landlord-1" }),
        update: expect.any(Object),
      })
    })

    it("upsertSettings with serviceFeePercent=0 succeeds (0% is valid)", async () => {
      mockAuthenticatedAdmin()
      const zeroFeeRecord = { ...mockSettingsRecord, serviceFeePercent: 0 }
      mockPrisma.settings.upsert.mockResolvedValue(zeroFeeRecord as any)

      const result = await upsertSettings({ serviceFeePercent: 0, depositAmount: 100 })
      expect(result).toHaveProperty("settings")
      expect(mockPrisma.settings.upsert).toHaveBeenCalledOnce()
    })

    it("upsertSettings with depositAmount=0 succeeds (no deposit is valid)", async () => {
      mockAuthenticatedAdmin()
      const noDepositRecord = { ...mockSettingsRecord, depositAmount: 0 }
      mockPrisma.settings.upsert.mockResolvedValue(noDepositRecord as any)

      const result = await upsertSettings({ serviceFeePercent: 3, depositAmount: 0 })
      expect(result).toHaveProperty("settings")
      expect(mockPrisma.settings.upsert).toHaveBeenCalledOnce()
    })

    it("upsertSettings with a negative serviceFeePercent returns { error } with field-level message", async () => {
      mockAuthenticatedAdmin()

      const result = await upsertSettings({ serviceFeePercent: -1, depositAmount: 100 })
      expect(result).toHaveProperty("error")
      expect(mockPrisma.settings.upsert).not.toHaveBeenCalled()
    })

    it("upsertSettings with a negative depositAmount returns { error } with field-level message", async () => {
      mockAuthenticatedAdmin()

      const result = await upsertSettings({ serviceFeePercent: 3, depositAmount: -50 })
      expect(result).toHaveProperty("error")
      expect(mockPrisma.settings.upsert).not.toHaveBeenCalled()
    })

    it("upsertSettings called without a session throws Unauthorized", async () => {
      mockGetUser.mockResolvedValue({ data: { user: null }, error: new Error("Not authenticated") })

      await expect(upsertSettings(validSettingsData)).rejects.toThrow("Unauthorized")
    })

    it("when called twice with different values, the second call updates the existing row (upsert not create)", async () => {
      mockAuthenticatedAdmin()
      mockPrisma.settings.upsert.mockResolvedValue(mockSettingsRecord as any)

      // First call
      await upsertSettings({ serviceFeePercent: 3, depositAmount: 100 })
      // Second call with different values
      await upsertSettings({ serviceFeePercent: 5, depositAmount: 200 })

      expect(mockPrisma.settings.upsert).toHaveBeenCalledTimes(2)
      // Both calls use where: { landlordId }
      expect(mockPrisma.settings.upsert).toHaveBeenNthCalledWith(2, {
        where: { landlordId: "landlord-1" },
        create: expect.objectContaining({ landlordId: "landlord-1", serviceFeePercent: 5, depositAmount: 200 }),
        update: expect.objectContaining({ serviceFeePercent: 5, depositAmount: 200 }),
      })
    })
  })
})
