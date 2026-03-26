import { describe, it, expect, vi, beforeEach } from "vitest"
import "../lib/prisma-mock"
import { mockPrisma } from "../lib/prisma-mock"

// Mock next/cache before importing the action
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))

// Mock auth
vi.mock("@/lib/auth", () => ({ auth: vi.fn() }))

import { upsertSettings } from "@/actions/settings"
import { auth } from "@/lib/auth"

const mockAuth = vi.mocked(auth)

const validSettingsData = {
  serviceFeePercent: 3,
  depositAmount: 100,
}

const mockSettingsRecord = {
  id: "global",
  serviceFeePercent: 3,
  depositAmount: 100,
  updatedAt: new Date(),
}

describe("settings actions", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe("upsertSettings", () => {
    it("upsertSettings with valid data upserts the Settings row and returns { settings }", async () => {
      mockAuth.mockResolvedValue({ user: { id: "user-1", email: "admin@test.com" } } as any)
      mockPrisma.settings.upsert.mockResolvedValue(mockSettingsRecord as any)

      const result = await upsertSettings(validSettingsData)
      expect(result).toHaveProperty("settings")
      expect(mockPrisma.settings.upsert).toHaveBeenCalledWith({
        where: { id: "global" },
        create: expect.objectContaining({ id: "global" }),
        update: expect.any(Object),
      })
    })

    it("upsertSettings with serviceFeePercent=0 succeeds (0% is valid)", async () => {
      mockAuth.mockResolvedValue({ user: { id: "user-1", email: "admin@test.com" } } as any)
      const zeroFeeRecord = { ...mockSettingsRecord, serviceFeePercent: 0 }
      mockPrisma.settings.upsert.mockResolvedValue(zeroFeeRecord as any)

      const result = await upsertSettings({ serviceFeePercent: 0, depositAmount: 100 })
      expect(result).toHaveProperty("settings")
      expect(mockPrisma.settings.upsert).toHaveBeenCalledOnce()
    })

    it("upsertSettings with depositAmount=0 succeeds (no deposit is valid)", async () => {
      mockAuth.mockResolvedValue({ user: { id: "user-1", email: "admin@test.com" } } as any)
      const noDepositRecord = { ...mockSettingsRecord, depositAmount: 0 }
      mockPrisma.settings.upsert.mockResolvedValue(noDepositRecord as any)

      const result = await upsertSettings({ serviceFeePercent: 3, depositAmount: 0 })
      expect(result).toHaveProperty("settings")
      expect(mockPrisma.settings.upsert).toHaveBeenCalledOnce()
    })

    it("upsertSettings with a negative serviceFeePercent returns { error } with field-level message", async () => {
      mockAuth.mockResolvedValue({ user: { id: "user-1", email: "admin@test.com" } } as any)

      const result = await upsertSettings({ serviceFeePercent: -1, depositAmount: 100 })
      expect(result).toHaveProperty("error")
      expect(mockPrisma.settings.upsert).not.toHaveBeenCalled()
    })

    it("upsertSettings with a negative depositAmount returns { error } with field-level message", async () => {
      mockAuth.mockResolvedValue({ user: { id: "user-1", email: "admin@test.com" } } as any)

      const result = await upsertSettings({ serviceFeePercent: 3, depositAmount: -50 })
      expect(result).toHaveProperty("error")
      expect(mockPrisma.settings.upsert).not.toHaveBeenCalled()
    })

    it("upsertSettings called without a session throws Unauthorized", async () => {
      mockAuth.mockResolvedValue(null)

      await expect(upsertSettings(validSettingsData)).rejects.toThrow("Unauthorized")
    })

    it("when called twice with different values, the second call updates the existing row (upsert not create)", async () => {
      mockAuth.mockResolvedValue({ user: { id: "user-1", email: "admin@test.com" } } as any)
      mockPrisma.settings.upsert.mockResolvedValue(mockSettingsRecord as any)

      // First call
      await upsertSettings({ serviceFeePercent: 3, depositAmount: 100 })
      // Second call with different values
      await upsertSettings({ serviceFeePercent: 5, depositAmount: 200 })

      expect(mockPrisma.settings.upsert).toHaveBeenCalledTimes(2)
      // Both calls use where: { id: "global" }
      expect(mockPrisma.settings.upsert).toHaveBeenNthCalledWith(2, {
        where: { id: "global" },
        create: expect.objectContaining({ id: "global", serviceFeePercent: 5, depositAmount: 200 }),
        update: expect.objectContaining({ serviceFeePercent: 5, depositAmount: 200 }),
      })
    })
  })
})
