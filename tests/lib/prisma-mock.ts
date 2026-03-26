import { PrismaClient } from "@prisma/client"
import { mockDeep, mockReset, DeepMockProxy } from "vitest-mock-extended"
import { vi, beforeEach } from "vitest"

vi.mock("@/lib/prisma", () => ({ prisma: mockPrisma }))

export const mockPrisma = mockDeep<PrismaClient>()

beforeEach(() => {
  mockReset(mockPrisma)
})
