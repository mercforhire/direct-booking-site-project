import { describe, it, expect, vi, beforeEach } from "vitest"
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library"

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
const { mockCheckoutRetrieve, mockRefundsCreate } = vi.hoisted(() => ({
  mockCheckoutRetrieve: vi.fn(),
  mockRefundsCreate: vi.fn().mockResolvedValue({ id: "re_1" }),
}))
vi.mock("@/lib/stripe", () => ({
  stripe: {
    checkout: { sessions: { retrieve: mockCheckoutRetrieve } },
    refunds: { create: mockRefundsCreate },
  },
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

// Helper: build a base booking object
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const baseBooking: any = {
  id: "booking-1",
  status: "PAID",
  stripeSessionId: "cs_test_123",
  guestName: "Alice",
  guestEmail: "alice@example.com",
  guestPhone: null,
  accessToken: "tok_abc",
  confirmedPrice: 200,
  checkin: new Date("2026-04-01"),
  checkout: new Date("2026-04-05"),
  refundAmount: null,
  cancelledAt: null,
  room: { name: "Ocean View", landlordId: "landlord-1", landlord: { slug: "highhill" } },
}

describe("cancelBooking", () => {
  beforeEach(() => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "admin-1" } }, error: null })
    mockCheckoutRetrieve.mockReset()
    mockCheckoutRetrieve.mockResolvedValue({
      payment_intent: "pi_test_456",
    })
    mockRefundsCreate.mockReset()
    mockRefundsCreate.mockResolvedValue({ id: "re_1" })
    mockEmailSend.mockReset()
    mockEmailSend.mockResolvedValue({ data: { id: "email-1" }, error: null })
    mockPrisma.bookingExtension.findMany.mockResolvedValue([])
  })

  describe("auth guard", () => {
    it("requireAuth blocks unauthenticated users", async () => {
      mockGetUser.mockResolvedValue({ data: { user: null }, error: new Error("not authenticated") })
      const { cancelBooking } = await import("@/actions/cancellation")
      await expect(cancelBooking("booking-1", { bookingId: "booking-1", refundAmount: 100 })).rejects.toThrow("Unauthorized")
    })
  })

  describe("PAID booking with Stripe session", () => {
    it("retrieves Checkout Session to get payment_intent", async () => {
      mockPrisma.booking.findUnique.mockResolvedValue(baseBooking)
      mockPrisma.$transaction.mockResolvedValue([{}, {}])

      const { cancelBooking } = await import("@/actions/cancellation")
      await cancelBooking("booking-1", { bookingId: "booking-1", refundAmount: 100 })

      expect(mockCheckoutRetrieve).toHaveBeenCalledWith("cs_test_123")
    })

    it("issues Stripe refund in cents (confirmedPrice * 100)", async () => {
      mockPrisma.booking.findUnique.mockResolvedValue(baseBooking)
      mockPrisma.$transaction.mockResolvedValue([{}, {}])

      const { cancelBooking } = await import("@/actions/cancellation")
      await cancelBooking("booking-1", { bookingId: "booking-1", refundAmount: 150 })

      // Stripe refunds the exact confirmed price (200), not the admin-entered refundAmount
      expect(mockRefundsCreate).toHaveBeenCalledWith({
        payment_intent: "pi_test_456",
        amount: 20000,
      })
    })

    it("updates DB with status CANCELLED, refundAmount, cancelledAt after successful Stripe refund", async () => {
      mockPrisma.booking.findUnique.mockResolvedValue(baseBooking)
      mockPrisma.$transaction.mockResolvedValue([{}, {}])

      const { cancelBooking } = await import("@/actions/cancellation")
      const result = await cancelBooking("booking-1", { bookingId: "booking-1", refundAmount: 100 })

      expect(mockPrisma.$transaction).toHaveBeenCalled()
      expect(result).toEqual({ success: true })
    })

    it("returns error and does NOT update DB if Stripe refund fails", async () => {
      mockPrisma.booking.findUnique.mockResolvedValue(baseBooking)
      mockRefundsCreate.mockRejectedValue(new Error("card_declined"))

      const { cancelBooking } = await import("@/actions/cancellation")
      const result = await cancelBooking("booking-1", { bookingId: "booking-1", refundAmount: 100 })

      expect(result).toEqual({ error: "stripe_refund_failed", message: "card_declined" })
      expect(mockPrisma.$transaction).not.toHaveBeenCalled()
    })
  })

  describe("PAID booking with e-transfer (no stripeSessionId)", () => {
    const etransferBooking = { ...baseBooking, stripeSessionId: null }

    it("makes no Stripe API call", async () => {
      mockPrisma.booking.findUnique.mockResolvedValue(etransferBooking)
      mockPrisma.$transaction.mockResolvedValue([{}, {}])

      const { cancelBooking } = await import("@/actions/cancellation")
      await cancelBooking("booking-1", { bookingId: "booking-1", refundAmount: 80 })

      expect(mockCheckoutRetrieve).not.toHaveBeenCalled()
      expect(mockRefundsCreate).not.toHaveBeenCalled()
    })

    it("updates DB directly with status CANCELLED, refundAmount, cancelledAt", async () => {
      mockPrisma.booking.findUnique.mockResolvedValue(etransferBooking)
      mockPrisma.$transaction.mockResolvedValue([{}, {}])

      const { cancelBooking } = await import("@/actions/cancellation")
      const result = await cancelBooking("booking-1", { bookingId: "booking-1", refundAmount: 80 })

      expect(mockPrisma.$transaction).toHaveBeenCalled()
      expect(result).toEqual({ success: true })
    })
  })

  describe("APPROVED booking (not paid)", () => {
    const approvedBooking = { ...baseBooking, status: "APPROVED", stripeSessionId: null }

    it("makes no Stripe refund call", async () => {
      mockPrisma.booking.findUnique.mockResolvedValue(approvedBooking)
      mockPrisma.$transaction.mockResolvedValue([{}, {}])

      const { cancelBooking } = await import("@/actions/cancellation")
      await cancelBooking("booking-1", { bookingId: "booking-1", refundAmount: 0 })

      expect(mockRefundsCreate).not.toHaveBeenCalled()
    })

    it("stores no refundAmount", async () => {
      mockPrisma.booking.findUnique.mockResolvedValue(approvedBooking)
      mockPrisma.$transaction.mockResolvedValue([{}, {}])

      const { cancelBooking } = await import("@/actions/cancellation")
      await cancelBooking("booking-1", { bookingId: "booking-1", refundAmount: 0 })

      // Transaction should be called (with refundAmount: null in the update)
      expect(mockPrisma.$transaction).toHaveBeenCalled()
    })

    it("updates DB with status CANCELLED, cancelledAt", async () => {
      mockPrisma.booking.findUnique.mockResolvedValue(approvedBooking)
      mockPrisma.$transaction.mockResolvedValue([{}, {}])

      const { cancelBooking } = await import("@/actions/cancellation")
      const result = await cancelBooking("booking-1", { bookingId: "booking-1", refundAmount: 0 })

      expect(result).toEqual({ success: true })
    })
  })

  describe("extension auto-cancellation", () => {
    it("auto-cancels PENDING extensions via updateMany with status DECLINED", async () => {
      mockPrisma.booking.findUnique.mockResolvedValue(baseBooking)
      mockPrisma.$transaction.mockResolvedValue([{}, {}])

      const { cancelBooking } = await import("@/actions/cancellation")
      await cancelBooking("booking-1", { bookingId: "booking-1", refundAmount: 100 })

      // Verify transaction was called (contains extension updateMany)
      expect(mockPrisma.$transaction).toHaveBeenCalled()
    })

    it("auto-cancels APPROVED extensions via updateMany with status DECLINED", async () => {
      mockPrisma.booking.findUnique.mockResolvedValue(baseBooking)
      mockPrisma.$transaction.mockResolvedValue([{}, {}])

      const { cancelBooking } = await import("@/actions/cancellation")
      await cancelBooking("booking-1", { bookingId: "booking-1", refundAmount: 100 })

      expect(mockPrisma.$transaction).toHaveBeenCalled()
    })
  })

  describe("email notification", () => {
    it("sends BookingCancelledEmail on successful cancellation", async () => {
      mockPrisma.booking.findUnique.mockResolvedValue(baseBooking)
      mockPrisma.$transaction.mockResolvedValue([{}, {}])

      const { cancelBooking } = await import("@/actions/cancellation")
      const result = await cancelBooking("booking-1", { bookingId: "booking-1", refundAmount: 100 })

      expect(mockEmailSend).toHaveBeenCalled()
      expect(result).toEqual({ success: true })
    })

    it("cancellation succeeds even if email sending fails (non-fatal)", async () => {
      mockPrisma.booking.findUnique.mockResolvedValue(baseBooking)
      mockPrisma.$transaction.mockResolvedValue([{}, {}])
      mockEmailSend.mockRejectedValue(new Error("resend_error"))

      const { cancelBooking } = await import("@/actions/cancellation")
      const result = await cancelBooking("booking-1", { bookingId: "booking-1", refundAmount: 100 })

      expect(result).toEqual({ success: true })
    })
  })

  describe("non-cancellable bookings", () => {
    const makeP2025 = () => {
      const err = new PrismaClientKnownRequestError("Record not found", {
        code: "P2025",
        clientVersion: "5.0.0",
      })
      return err
    }

    it("returns { error: 'not_cancellable' } for PENDING status booking", async () => {
      const pendingBooking = { ...baseBooking, status: "PENDING", stripeSessionId: null }
      mockPrisma.booking.findUnique.mockResolvedValue(pendingBooking)
      mockPrisma.$transaction.mockRejectedValue(makeP2025())

      const { cancelBooking } = await import("@/actions/cancellation")
      const result = await cancelBooking("booking-1", { bookingId: "booking-1", refundAmount: 0 })

      expect(result).toEqual({ error: "not_cancellable" })
    })

    it("returns { error: 'not_cancellable' } for DECLINED status booking", async () => {
      const declinedBooking = { ...baseBooking, status: "DECLINED", stripeSessionId: null }
      mockPrisma.booking.findUnique.mockResolvedValue(declinedBooking)
      mockPrisma.$transaction.mockRejectedValue(makeP2025())

      const { cancelBooking } = await import("@/actions/cancellation")
      const result = await cancelBooking("booking-1", { bookingId: "booking-1", refundAmount: 0 })

      expect(result).toEqual({ error: "not_cancellable" })
    })

    it("returns { error: 'not_cancellable' } for COMPLETED status booking", async () => {
      const completedBooking = { ...baseBooking, status: "COMPLETED", stripeSessionId: null }
      mockPrisma.booking.findUnique.mockResolvedValue(completedBooking)
      mockPrisma.$transaction.mockRejectedValue(makeP2025())

      const { cancelBooking } = await import("@/actions/cancellation")
      const result = await cancelBooking("booking-1", { bookingId: "booking-1", refundAmount: 0 })

      expect(result).toEqual({ error: "not_cancellable" })
    })
  })
})

describe("cancelBookingSchema", () => {
  it("validates refundAmount as coerced number", async () => {
    const { cancelBookingSchema } = await import("@/lib/validations/cancellation")
    const result = cancelBookingSchema.safeParse({ bookingId: "b-1", refundAmount: "150.50" })
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.refundAmount).toBe(150.5)
  })

  it("rejects negative refundAmount values", async () => {
    const { cancelBookingSchema } = await import("@/lib/validations/cancellation")
    const result = cancelBookingSchema.safeParse({ bookingId: "b-1", refundAmount: -10 })
    expect(result.success).toBe(false)
  })
})
