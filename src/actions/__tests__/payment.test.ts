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
const { mockStripeSessionCreate } = vi.hoisted(() => ({
  mockStripeSessionCreate: vi.fn(),
}))
vi.mock("@/lib/stripe", () => ({
  stripe: {
    checkout: {
      sessions: {
        create: mockStripeSessionCreate,
      },
    },
  },
}))

import { createStripeCheckoutSession, markBookingAsPaid } from "@/actions/payment"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

const mockBooking = {
  id: "booking-1",
  guestEmail: "guest@example.com",
  guestName: "Jane Guest",
  guestPhone: "+1 555-123-4567",
  accessToken: "token-abc",
  status: "APPROVED",
  confirmedPrice: 500,
  checkin: new Date("2026-05-01T00:00:00.000Z"),
  checkout: new Date("2026-05-05T00:00:00.000Z"),
  room: { name: "Ocean View Suite", landlord: { slug: "highhill" } },
}

function makePrismaNotFoundError() {
  return new PrismaClientKnownRequestError("Record not found", {
    code: "P2025",
    clientVersion: "6.0.0",
  })
}

describe("createStripeCheckoutSession", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetUser.mockResolvedValue({ data: { user: { id: "admin-1" } }, error: null })
    mockHeadersGet.mockReturnValue("https://example.com")
    mockPrisma.booking.findUnique.mockResolvedValue(mockBooking as any)
    mockStripeSessionCreate.mockResolvedValue({
      id: "sess_abc",
      url: "https://checkout.stripe.com/pay/sess_abc",
    })
    mockPrisma.booking.update.mockResolvedValue({ ...mockBooking, stripeSessionId: "sess_abc" } as any)
  })

  it("creates Stripe session with unit_amount = Math.round(confirmedPrice * 100) and metadata.bookingId", async () => {
    await createStripeCheckoutSession("booking-1")
    expect(mockStripeSessionCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        mode: "payment",
        currency: "cad",
        line_items: expect.arrayContaining([
          expect.objectContaining({
            price_data: expect.objectContaining({
              unit_amount: 50000, // 500 * 100
              currency: "cad",
            }),
            quantity: 1,
          }),
        ]),
        metadata: { bookingId: "booking-1" },
        customer_email: "guest@example.com",
      })
    )
  })

  it("stores session.id in booking.stripeSessionId after creating session", async () => {
    await createStripeCheckoutSession("booking-1")
    expect(mockPrisma.booking.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "booking-1" },
        data: { stripeSessionId: "sess_abc" },
      })
    )
  })

  it("returns { error: 'booking_not_found' } when booking not found or not APPROVED", async () => {
    mockPrisma.booking.findUnique.mockResolvedValue(null)
    const result = await createStripeCheckoutSession("booking-1")
    expect(result).toEqual({ error: "booking_not_found" })
  })

  it("calls redirect to session.url after successful session creation", async () => {
    await createStripeCheckoutSession("booking-1")
    expect(redirect).toHaveBeenCalledWith("https://checkout.stripe.com/pay/sess_abc")
  })
})

describe("markBookingAsPaid", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockPrisma.landlord.findUnique.mockResolvedValue({ id: "landlord-1", adminUserId: "admin-1" } as any)
    mockPrisma.booking.findUnique.mockResolvedValue({ id: "booking-1", room: { landlordId: "landlord-1", name: "Ocean View" } } as any)
    mockGetUser.mockResolvedValue({ data: { user: { id: "admin-1" } }, error: null })
    mockPrisma.booking.update.mockResolvedValue({ ...mockBooking, status: "PAID" } as any)
  })

  it("updates booking status APPROVED -> PAID and returns { success: true }", async () => {
    const result = await markBookingAsPaid("booking-1")
    expect(mockPrisma.booking.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "booking-1", status: "APPROVED" },
        data: { status: "PAID" },
      })
    )
    expect(result).toEqual({ success: true })
  })

  it("returns { error: 'not_approved' } when booking is already PAID (P2025)", async () => {
    mockPrisma.booking.update.mockRejectedValue(makePrismaNotFoundError())
    const result = await markBookingAsPaid("booking-1")
    expect(result).toEqual({ error: "not_approved" })
  })

  it("calls revalidatePath for the booking page on success", async () => {
    await markBookingAsPaid("booking-1")
    expect(revalidatePath).toHaveBeenCalledWith("/admin/bookings/booking-1")
  })

  it("sends payment confirmation email (non-fatal — action still returns success if email fails)", async () => {
    mockEmailSend.mockRejectedValue(new Error("Email service down"))
    const result = await markBookingAsPaid("booking-1")
    expect(result).toEqual({ success: true })
  })
})
