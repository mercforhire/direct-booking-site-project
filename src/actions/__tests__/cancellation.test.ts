import { describe, it, vi } from "vitest"

// --- Prisma mock (shared helper registers vi.mock + exports mockPrisma) ---
import "../../../tests/lib/prisma-mock"
import { mockPrisma } from "../../../tests/lib/prisma-mock"

// --- next/cache mock ---
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))

// --- Supabase auth mock ---
const { mockGetUser } = vi.hoisted(() => ({
  mockGetUser: vi.fn().mockResolvedValue({ data: { user: { id: "admin-1" } }, error: null }),
}))
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(() => ({ auth: { getUser: mockGetUser } })),
}))

// --- Stripe mock ---
const { mockRefundsCreate } = vi.hoisted(() => ({
  mockRefundsCreate: vi.fn().mockResolvedValue({ id: "re_test", status: "succeeded" }),
}))
vi.mock("stripe", () => ({
  default: vi.fn().mockImplementation(function (this: unknown) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(this as any).refunds = { create: mockRefundsCreate }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(this as any).checkout = { sessions: { retrieve: vi.fn() } }
  }),
}))

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

// Suppress unused import warning — mockPrisma will be used in implementation tests
void mockPrisma
void mockEmailSend
void mockRefundsCreate

describe("cancelBooking", () => {
  describe("auth guard", () => {
    it.todo("requireAuth blocks unauthenticated users")
  })

  describe("PAID booking with Stripe session", () => {
    it.todo("retrieves Checkout Session to get payment_intent")
    it.todo("issues Stripe refund in cents (refundAmount * 100)")
    it.todo("updates DB with status CANCELLED, refundAmount, cancelledAt after successful Stripe refund")
    it.todo("returns error and does NOT update DB if Stripe refund fails")
  })

  describe("PAID booking with e-transfer (no stripeSessionId)", () => {
    it.todo("makes no Stripe API call")
    it.todo("updates DB directly with status CANCELLED, refundAmount, cancelledAt")
  })

  describe("APPROVED booking (not paid)", () => {
    it.todo("makes no Stripe refund call")
    it.todo("stores no refundAmount")
    it.todo("updates DB with status CANCELLED, cancelledAt")
  })

  describe("extension auto-cancellation", () => {
    it.todo("auto-cancels PENDING extensions via updateMany with status DECLINED")
    it.todo("auto-cancels APPROVED extensions via updateMany with status DECLINED")
  })

  describe("email notification", () => {
    it.todo("sends BookingCancelledEmail on successful cancellation")
    it.todo("cancellation succeeds even if email sending fails (non-fatal)")
  })

  describe("non-cancellable bookings", () => {
    it.todo("returns { error: 'not_cancellable' } for PENDING status booking")
    it.todo("returns { error: 'not_cancellable' } for DECLINED status booking")
    it.todo("returns { error: 'not_cancellable' } for COMPLETED status booking")
  })
})

describe("cancelBookingSchema", () => {
  it.todo("validates refundAmount as coerced number")
  it.todo("rejects negative refundAmount values")
})
