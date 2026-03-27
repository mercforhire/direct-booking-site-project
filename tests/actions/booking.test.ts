import { describe, it, vi } from "vitest"
import "../lib/prisma-mock"
import { mockPrisma } from "../lib/prisma-mock"

// Mock next/cache before importing the action
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))

// Mock next/navigation before importing the action
vi.mock("next/navigation", () => ({ redirect: vi.fn() }))

// Mock Supabase server client
const mockSignUp = vi.fn()
const mockGetUser = vi.fn()
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(() =>
    Promise.resolve({
      auth: { signUp: mockSignUp, getUser: mockGetUser },
    })
  ),
}))

import { submitBooking } from "@/actions/booking"

// Suppress unused import warning — mockPrisma will be used in Wave 2 tests
void mockPrisma

describe("submitBooking", () => {
  it.todo("creates a Booking row with correct fields")
})
