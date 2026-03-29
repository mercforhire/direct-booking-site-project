import { describe, it, expect, vi, beforeEach } from "vitest"

// --- Prisma mock (shared helper registers vi.mock + exports mockPrisma) ---
import "../../../tests/lib/prisma-mock"
import { mockPrisma } from "../../../tests/lib/prisma-mock"

// --- next/cache mock ---
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))

// --- @react-email/render mock ---
vi.mock("@react-email/render", () => ({
  render: vi.fn().mockResolvedValue("<html>email</html>"),
}))

// --- Resend mock ---
const { mockEmailSend } = vi.hoisted(() => ({
  mockEmailSend: vi.fn().mockResolvedValue({ data: { id: "email-1" }, error: null }),
}))
vi.mock("resend", () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Resend: vi.fn().mockImplementation(function (this: any) {
    this.emails = { send: mockEmailSend }
  }),
}))

describe("submitDateChange", () => {
  it.todo("returns error for non-existent booking")
  it.todo("returns error for PENDING booking status")
  it.todo("returns error when PENDING date change already exists")
  it.todo("creates BookingDateChange with PENDING status")
  it.todo("sends landlord email (non-fatal)")
})

describe("cancelDateChange", () => {
  it.todo("returns error when no PENDING date change found")
  it.todo("sets status to DECLINED and revalidates")
})
