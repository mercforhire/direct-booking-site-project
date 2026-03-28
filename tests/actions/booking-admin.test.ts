import { describe, it, vi } from "vitest"
import "../lib/prisma-mock"

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))

const { mockEmailSend } = vi.hoisted(() => ({
  mockEmailSend: vi.fn().mockResolvedValue({ data: { id: "email-1" }, error: null }),
}))
vi.mock("resend", () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Resend: vi.fn().mockImplementation(function (this: any) {
    this.emails = { send: mockEmailSend }
  }),
}))

const { mockGetUser } = vi.hoisted(() => ({
  mockGetUser: vi.fn().mockResolvedValue({ data: { user: { id: "admin-1" } }, error: null }),
}))
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(() => ({
    auth: { getUser: mockGetUser },
  })),
}))

// Stubs — filled in by Plan 02 TDD implementation
describe("approveBooking", () => {
  it.todo("updates booking status to APPROVED and sets confirmedPrice")
  it.todo("sends approval email to guest")
  it.todo("returns error if booking is not PENDING")
  it.todo("returns error if confirmedPrice is invalid")
})

describe("declineBooking", () => {
  it.todo("updates booking status to DECLINED and stores declineReason")
  it.todo("sends decline email to guest")
  it.todo("returns error if booking is not PENDING")
})
