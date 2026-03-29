import { describe, it, expect, vi, beforeEach } from "vitest"
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library"

// --- Prisma mock (shared helper registers vi.mock + exports mockPrisma) ---
import "../../../tests/lib/prisma-mock"
import { mockPrisma } from "../../../tests/lib/prisma-mock"

// --- next/cache mock ---
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))

// --- next/headers mock ---
const { mockHeadersGet } = vi.hoisted(() => ({
  mockHeadersGet: vi.fn().mockReturnValue("https://example.com"),
}))
vi.mock("next/headers", () => ({
  headers: vi.fn().mockResolvedValue({ get: mockHeadersGet }),
}))

// --- next/navigation mock ---
vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
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

// --- Supabase auth mock ---
const { mockGetUser } = vi.hoisted(() => ({
  mockGetUser: vi.fn().mockResolvedValue({ data: { user: { id: "admin-1" } }, error: null }),
}))
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(() => ({
    auth: { getUser: mockGetUser },
  })),
}))

// --- Stripe mock ---
const { mockStripeSessionCreate, mockStripeSessionRetrieve, mockStripeRefundsCreate } = vi.hoisted(() => ({
  mockStripeSessionCreate: vi.fn(),
  mockStripeSessionRetrieve: vi.fn(),
  mockStripeRefundsCreate: vi.fn().mockResolvedValue({ id: "re_1" }),
}))
vi.mock("@/lib/stripe", () => ({
  stripe: {
    checkout: {
      sessions: {
        create: mockStripeSessionCreate,
        retrieve: mockStripeSessionRetrieve,
      },
    },
    refunds: { create: mockStripeRefundsCreate },
  },
}))

import { submitDateChange, cancelDateChange, approveDateChange, declineDateChange, createDateChangeStripeCheckoutSession } from "@/actions/date-change"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

const mockBooking = {
  id: "booking-1",
  status: "APPROVED",
  guestName: "Jane Guest",
  guestEmail: "guest@example.com",
  checkin: new Date("2026-05-01T00:00:00.000Z"),
  checkout: new Date("2026-05-07T00:00:00.000Z"),
  room: { name: "Ocean View Suite" },
}

const validDateChangeData = {
  requestedCheckin: "2026-06-01",
  requestedCheckout: "2026-06-07",
  noteToLandlord: "Can we shift dates?",
}

describe("submitDateChange", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.LANDLORD_EMAIL = "landlord@example.com"
    process.env.RESEND_API_KEY = "re_test_key"
    process.env.RESEND_FROM_EMAIL = "noreply@example.com"
    process.env.NEXT_PUBLIC_SITE_URL = "https://example.com"
    mockPrisma.booking.findUnique.mockResolvedValue(mockBooking as any)
    mockPrisma.bookingDateChange.findFirst.mockResolvedValue(null)
    mockPrisma.bookingDateChange.create.mockResolvedValue({
      id: "dc-1",
      bookingId: "booking-1",
      status: "PENDING",
      requestedCheckin: new Date("2026-06-01T00:00:00.000Z"),
      requestedCheckout: new Date("2026-06-07T00:00:00.000Z"),
    } as any)
  })

  it("returns error for non-existent booking", async () => {
    mockPrisma.booking.findUnique.mockResolvedValue(null)
    const result = await submitDateChange("booking-1", validDateChangeData)
    expect(result).toEqual({ error: "booking_not_found" })
    expect(mockPrisma.bookingDateChange.create).not.toHaveBeenCalled()
  })

  it("returns error for PENDING booking status", async () => {
    mockPrisma.booking.findUnique.mockResolvedValue({ ...mockBooking, status: "PENDING" } as any)
    const result = await submitDateChange("booking-1", validDateChangeData)
    expect(result).toEqual({ error: "invalid_status" })
    expect(mockPrisma.bookingDateChange.create).not.toHaveBeenCalled()
  })

  it("returns error when PENDING date change already exists", async () => {
    mockPrisma.bookingDateChange.findFirst.mockResolvedValue({
      id: "dc-existing",
      bookingId: "booking-1",
      status: "PENDING",
    } as any)
    const result = await submitDateChange("booking-1", validDateChangeData)
    expect(result).toEqual({ error: "already_pending" })
    expect(mockPrisma.bookingDateChange.create).not.toHaveBeenCalled()
  })

  it("creates BookingDateChange with PENDING status", async () => {
    const result = await submitDateChange("booking-1", validDateChangeData)
    expect(mockPrisma.bookingDateChange.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          bookingId: "booking-1",
          requestedCheckin: new Date("2026-06-01T00:00:00.000Z"),
          requestedCheckout: new Date("2026-06-07T00:00:00.000Z"),
          status: "PENDING",
        }),
      })
    )
    expect(result).toEqual({ success: true })
  })

  it("sends landlord email (non-fatal)", async () => {
    mockEmailSend.mockRejectedValue(new Error("Email service down"))
    const result = await submitDateChange("booking-1", validDateChangeData)
    expect(result).toEqual({ success: true })
  })

  it("revalidates /bookings/[bookingId] after creation", async () => {
    await submitDateChange("booking-1", validDateChangeData)
    expect(revalidatePath).toHaveBeenCalledWith("/bookings/booking-1")
  })

  it("accepts PAID booking status as eligible", async () => {
    mockPrisma.booking.findUnique.mockResolvedValue({ ...mockBooking, status: "PAID" } as any)
    const result = await submitDateChange("booking-1", validDateChangeData)
    expect(result).toEqual({ success: true })
  })
})

describe("cancelDateChange", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockPrisma.bookingDateChange.findFirst.mockResolvedValue({
      id: "dc-1",
      bookingId: "booking-1",
      status: "PENDING",
    } as any)
    mockPrisma.bookingDateChange.update.mockResolvedValue({
      id: "dc-1",
      status: "DECLINED",
    } as any)
  })

  it("returns error when no PENDING date change found", async () => {
    mockPrisma.bookingDateChange.findFirst.mockResolvedValue(null)
    const result = await cancelDateChange("booking-1")
    expect(result).toEqual({ error: "not_pending" })
    expect(mockPrisma.bookingDateChange.update).not.toHaveBeenCalled()
  })

  it("sets status to DECLINED and revalidates", async () => {
    const result = await cancelDateChange("booking-1")
    expect(mockPrisma.bookingDateChange.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "dc-1" },
        data: { status: "DECLINED" },
      })
    )
    expect(revalidatePath).toHaveBeenCalledWith("/bookings/booking-1")
    expect(result).toEqual({ success: true })
  })
})

// --- approveDateChange ---

const mockDateChangeFull = {
  id: "dc-1",
  bookingId: "booking-1",
  status: "PENDING",
  requestedCheckin: new Date("2026-06-01T00:00:00.000Z"),
  requestedCheckout: new Date("2026-06-07T00:00:00.000Z"),
  booking: {
    id: "booking-1",
    guestName: "Jane Guest",
    guestEmail: "guest@example.com",
    accessToken: "token-abc",
    stripeSessionId: "cs_test_123",
    confirmedPrice: 200,
    checkin: new Date("2026-05-01T00:00:00.000Z"),
    checkout: new Date("2026-05-07T00:00:00.000Z"),
    room: { name: "Ocean View Suite" },
  },
}

function makePrismaNotFoundError() {
  return new PrismaClientKnownRequestError("Record not found", {
    code: "P2025",
    clientVersion: "6.0.0",
  })
}

describe("approveDateChange", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.RESEND_API_KEY = "re_test_key"
    process.env.RESEND_FROM_EMAIL = "noreply@example.com"
    process.env.NEXT_PUBLIC_SITE_URL = "https://example.com"
    mockGetUser.mockResolvedValue({ data: { user: { id: "admin-1" } }, error: null })
    mockPrisma.bookingDateChange.update.mockResolvedValue({
      ...mockDateChangeFull,
      status: "APPROVED",
      newPrice: 250,
    } as any)
    mockPrisma.booking.update.mockResolvedValue({} as any)
    mockStripeSessionCreate.mockResolvedValue({
      id: "sess_topup_123",
      url: "https://checkout.stripe.com/pay/sess_topup_123",
    })
    mockStripeSessionRetrieve.mockResolvedValue({
      payment_intent: "pi_test_456",
    })
    mockStripeRefundsCreate.mockResolvedValue({ id: "re_1" })
  })

  it("requires admin auth", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: new Error("Unauthorized") })
    await expect(approveDateChange("dc-1", { newPrice: 250 })).rejects.toThrow("Unauthorized")
  })

  it("returns { error: 'not_pending' } when P2025 thrown", async () => {
    mockPrisma.bookingDateChange.update.mockRejectedValue(makePrismaNotFoundError())
    const result = await approveDateChange("dc-1", { newPrice: 250 })
    expect(result).toEqual({ error: "not_pending" })
  })

  it("creates Stripe top-up session when priceDiff > 0 and booking has stripeSessionId", async () => {
    // priceDiff = 250 - 200 = 50 > 0, Stripe booking
    const result = await approveDateChange("dc-1", { newPrice: 250 })
    expect(mockStripeSessionCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: expect.objectContaining({
          type: "date_change_topup",
          dateChangeId: "dc-1",
        }),
      })
    )
    expect(result).toEqual({ success: true, checkoutUrl: "https://checkout.stripe.com/pay/sess_topup_123" })
  })

  it("does NOT update booking dates immediately for Stripe top-up (webhook handles it)", async () => {
    await approveDateChange("dc-1", { newPrice: 250 })
    // booking.update should not be called for Stripe top-up (dates updated by webhook on payment)
    expect(mockPrisma.booking.update).not.toHaveBeenCalled()
  })

  it("issues partial Stripe refund when priceDiff < 0 and booking has stripeSessionId", async () => {
    // priceDiff = 150 - 200 = -50 < 0, Stripe booking
    mockPrisma.bookingDateChange.update.mockResolvedValue({
      ...mockDateChangeFull,
      status: "APPROVED",
      newPrice: 150,
    } as any)
    await approveDateChange("dc-1", { newPrice: 150 })
    expect(mockStripeSessionRetrieve).toHaveBeenCalledWith("cs_test_123")
    expect(mockStripeRefundsCreate).toHaveBeenCalledWith({
      payment_intent: "pi_test_456",
      amount: 5000, // Math.round(50 * 100)
    })
  })

  it("updates booking dates after Stripe refund when priceDiff < 0", async () => {
    mockPrisma.bookingDateChange.update.mockResolvedValue({
      ...mockDateChangeFull,
      status: "APPROVED",
      newPrice: 150,
    } as any)
    await approveDateChange("dc-1", { newPrice: 150 })
    expect(mockPrisma.booking.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          checkin: new Date("2026-06-01T00:00:00.000Z"),
          checkout: new Date("2026-06-07T00:00:00.000Z"),
          confirmedPrice: 150,
        }),
      })
    )
  })

  it("updates booking dates when priceDiff === 0, no Stripe call", async () => {
    mockPrisma.bookingDateChange.update.mockResolvedValue({
      ...mockDateChangeFull,
      status: "APPROVED",
      newPrice: 200,
    } as any)
    await approveDateChange("dc-1", { newPrice: 200 })
    expect(mockStripeSessionCreate).not.toHaveBeenCalled()
    expect(mockStripeRefundsCreate).not.toHaveBeenCalled()
    expect(mockPrisma.booking.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          checkin: new Date("2026-06-01T00:00:00.000Z"),
          checkout: new Date("2026-06-07T00:00:00.000Z"),
        }),
      })
    )
  })

  it("updates booking dates immediately when e-transfer and priceDiff > 0", async () => {
    mockPrisma.bookingDateChange.update.mockResolvedValue({
      ...mockDateChangeFull,
      status: "APPROVED",
      newPrice: 250,
      booking: { ...mockDateChangeFull.booking, stripeSessionId: null }, // e-transfer booking
    } as any)
    await approveDateChange("dc-1", { newPrice: 250 })
    expect(mockStripeSessionCreate).not.toHaveBeenCalled()
    expect(mockPrisma.booking.update).toHaveBeenCalled()
  })

  it("email failure does not prevent success", async () => {
    mockEmailSend.mockRejectedValue(new Error("Email service down"))
    const result = await approveDateChange("dc-1", { newPrice: 200 })
    expect(result).toEqual({ success: true })
  })

  it("revalidates /admin/bookings, /admin/bookings/[id], and /bookings/[id]", async () => {
    mockPrisma.bookingDateChange.update.mockResolvedValue({
      ...mockDateChangeFull,
      status: "APPROVED",
      newPrice: 200,
    } as any)
    await approveDateChange("dc-1", { newPrice: 200 })
    expect(revalidatePath).toHaveBeenCalledWith("/admin/bookings")
    expect(revalidatePath).toHaveBeenCalledWith("/admin/bookings/booking-1")
    expect(revalidatePath).toHaveBeenCalledWith("/bookings/booking-1")
  })
})

// --- declineDateChange ---

describe("declineDateChange", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.RESEND_API_KEY = "re_test_key"
    process.env.RESEND_FROM_EMAIL = "noreply@example.com"
    process.env.NEXT_PUBLIC_SITE_URL = "https://example.com"
    mockGetUser.mockResolvedValue({ data: { user: { id: "admin-1" } }, error: null })
    mockPrisma.bookingDateChange.update.mockResolvedValue({
      ...mockDateChangeFull,
      status: "DECLINED",
      declineReason: "Dates not available",
    } as any)
  })

  it("requires admin auth", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: new Error("Unauthorized") })
    await expect(declineDateChange("dc-1", {})).rejects.toThrow("Unauthorized")
  })

  it("returns { error: 'not_pending' } when P2025 thrown", async () => {
    mockPrisma.bookingDateChange.update.mockRejectedValue(makePrismaNotFoundError())
    const result = await declineDateChange("dc-1", {})
    expect(result).toEqual({ error: "not_pending" })
  })

  it("sets status DECLINED, stores declineReason, returns { success: true }", async () => {
    const result = await declineDateChange("dc-1", { declineReason: "Dates not available" })
    expect(mockPrisma.bookingDateChange.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "dc-1", status: "PENDING" },
        data: expect.objectContaining({
          status: "DECLINED",
          declineReason: "Dates not available",
        }),
      })
    )
    expect(result).toEqual({ success: true })
  })

  it("stores null declineReason when not provided", async () => {
    await declineDateChange("dc-1", {})
    expect(mockPrisma.bookingDateChange.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          declineReason: null,
        }),
      })
    )
  })

  it("sends guest email (non-fatal)", async () => {
    mockEmailSend.mockRejectedValue(new Error("Email service down"))
    const result = await declineDateChange("dc-1", { declineReason: "Too late" })
    expect(result).toEqual({ success: true })
  })

  it("revalidates /admin/bookings, /admin/bookings/[id], and /bookings/[id]", async () => {
    await declineDateChange("dc-1", {})
    expect(revalidatePath).toHaveBeenCalledWith("/admin/bookings")
    expect(revalidatePath).toHaveBeenCalledWith("/admin/bookings/booking-1")
    expect(revalidatePath).toHaveBeenCalledWith("/bookings/booking-1")
  })
})

// --- createDateChangeStripeCheckoutSession ---

const mockDateChangeApproved = {
  id: "dc-1",
  bookingId: "booking-1",
  status: "APPROVED",
  newPrice: 50,
  requestedCheckin: new Date("2026-06-01T00:00:00.000Z"),
  requestedCheckout: new Date("2026-06-07T00:00:00.000Z"),
  booking: {
    id: "booking-1",
    guestEmail: "guest@example.com",
    room: { name: "Ocean View Suite" },
  },
}

describe("createDateChangeStripeCheckoutSession", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockHeadersGet.mockReturnValue("https://example.com")
    process.env.NEXT_PUBLIC_SITE_URL = "https://example.com"
    mockPrisma.bookingDateChange.findUnique.mockResolvedValue(mockDateChangeApproved as any)
    mockStripeSessionCreate.mockResolvedValue({
      id: "sess_topup_abc",
      url: "https://checkout.stripe.com/pay/sess_topup_abc",
    })
    mockPrisma.bookingDateChange.update.mockResolvedValue({
      ...mockDateChangeApproved,
      stripeSessionId: "sess_topup_abc",
    } as any)
  })

  it("returns { error: 'date_change_not_found' } when date change not found", async () => {
    mockPrisma.bookingDateChange.findUnique.mockResolvedValue(null)
    const result = await createDateChangeStripeCheckoutSession("dc-1")
    expect(result).toEqual({ error: "date_change_not_found" })
  })

  it("creates Stripe session with date_change_topup metadata and dateChangeId", async () => {
    await createDateChangeStripeCheckoutSession("dc-1")
    expect(mockStripeSessionCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: { type: "date_change_topup", dateChangeId: "dc-1" },
      })
    )
  })

  it("uses unit_amount = Math.round(newPrice * 100)", async () => {
    await createDateChangeStripeCheckoutSession("dc-1")
    expect(mockStripeSessionCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        line_items: expect.arrayContaining([
          expect.objectContaining({
            price_data: expect.objectContaining({ unit_amount: 5000 }),
          }),
        ]),
      })
    )
  })

  it("stores stripeSessionId on BookingDateChange", async () => {
    await createDateChangeStripeCheckoutSession("dc-1")
    expect(mockPrisma.bookingDateChange.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "dc-1" },
        data: { stripeSessionId: "sess_topup_abc" },
      })
    )
  })

  it("redirects to session.url after session creation", async () => {
    await createDateChangeStripeCheckoutSession("dc-1")
    expect(redirect).toHaveBeenCalledWith("https://checkout.stripe.com/pay/sess_topup_abc")
  })
})
