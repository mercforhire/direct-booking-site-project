import { PrismaClient } from "@prisma/client"
import { mockDeep, mockReset, DeepMockProxy } from "vitest-mock-extended"
import { vi, beforeEach } from "vitest"

vi.mock("@/lib/prisma", () => ({ prisma: mockPrisma }))

export const mockPrisma = mockDeep<PrismaClient>()

// Default landlord mock — most admin action tests need this after
// the v1.1 multi-tenant migration replaced requireAuth with getLandlordForAdmin
const defaultMockLandlord = {
  id: "landlord-1",
  slug: "highhill",
  name: "Leon's Home",
  ownerName: "Leon",
  address: "9 Highhill Dr",
  email: "test@test.com",
  phone: null,
  bgColor: "#3a392a",
  textColor: "#f0ebe0",
  accentColor: "#d4956a",
  adminUserId: "admin-1",
  createdAt: new Date(),
  updatedAt: new Date(),
}

beforeEach(() => {
  mockReset(mockPrisma)
  // Re-apply default landlord mock after reset — admin action tests need this
  mockPrisma.landlord.findUnique.mockResolvedValue(defaultMockLandlord as any)
  // Default room ownership check — verifyRoomOwnership in admin actions checks this.
  // Tests that need specific room data from findUnique should override this.
  mockPrisma.room.findUnique.mockResolvedValue({ id: "room-1", landlordId: "landlord-1" } as any)
})
