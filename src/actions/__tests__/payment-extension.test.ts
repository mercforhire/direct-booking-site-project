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

import { createExtensionStripeCheckoutSession, markExtensionAsPaid } from "@/actions/payment"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

const mockExtension = {
  id: "ext-1",
  bookingId: "booking-1",
  status: "APPROVED",
  requestedCheckout: new Date("2026-05-10T00:00:00.000Z"),
  extensionPrice: 200,
  stripeSessionId: null,
  booking: {
    id: "booking-1",
    guestEmail: "guest@example.com",
    guestName: "Jane Guest",
    accessToken: "token-abc",
    checkin: new Date("2026-04-01T00:00:00.000Z"),
    checkout: new Date("2026-05-05T00:00:00.000Z"),
    room: { name: "Ocean View Suite", landlord: { slug: "highhill" } },
  },
}

function makePrismaNotFoundError() {
  return new PrismaClientKnownRequestError("Record not found", {
    code: "P2025",
    clientVersion: "6.0.0",
  })
}

describe("createExtensionStripeCheckoutSession", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockHeadersGet.mockReturnValue("https://example.com")
    mockPrisma.bookingExtension.findUnique.mockResolvedValue(mockExtension as any)
    mockStripeSessionCreate.mockResolvedValue({
      id: "sess_ext_abc",
      url: "https://checkout.stripe.com/pay/sess_ext_abc",
    })
    mockPrisma.bookingExtension.update.mockResolvedValue({
      ...mockExtension,
      stripeSessionId: "sess_ext_abc",
    } as any)
  })

  it("creates Stripe session with unit_amount = Math.round(extensionPrice * 100)", async () => {
    await createExtensionStripeCheckoutSession("ext-1")
    expect(mockStripeSessionCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        mode: "payment",
        currency: "cad",
        line_items: expect.arrayContaining([
          expect.objectContaining({
            price_data: expect.objectContaining({
              unit_amount: 20000, // 200 * 100
              currency: "cad",
            }),
            quantity: 1,
          }),
        ]),
      })
    )
  })

  it("sets metadata { type: 'extension', extensionId } on the session", async () => {
    await createExtensionStripeCheckoutSession("ext-1")
    expect(mockStripeSessionCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: { type: "extension", extensionId: "ext-1" },
      })
    )
  })

  it("stores stripeSessionId on BookingExtension (not on Booking)", async () => {
    await createExtensionStripeCheckoutSession("ext-1")
    expect(mockPrisma.bookingExtension.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "ext-1" },
        data: { stripeSessionId: "sess_ext_abc" },
      })
    )
    // Booking.update must NOT be called with stripeSessionId
    const bookingUpdateCalls = mockPrisma.booking.update.mock.calls
    for (const call of bookingUpdateCalls) {
      expect(call[0]).not.toMatchObject({ data: { stripeSessionId: expect.anything() } })
    }
  })

  it("returns { error: 'extension_not_found' } when extension not APPROVED", async () => {
    mockPrisma.bookingExtension.findUnique.mockResolvedValue(null)
    const result = await createExtensionStripeCheckoutSession("ext-1")
    expect(result).toEqual({ error: "extension_not_found" })
  })

  it("redirects to session.url after successful session creation", async () => {
    await createExtensionStripeCheckoutSession("ext-1")
    expect(redirect).toHaveBeenCalledWith("https://checkout.stripe.com/pay/sess_ext_abc")
  })
})

describe("markExtensionAsPaid", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockPrisma.landlord.findUnique.mockResolvedValue({ id: "landlord-1", adminUserId: "admin-1" } as any)
    mockPrisma.bookingExtension.findUnique.mockResolvedValue({ id: "ext-1", booking: { room: { landlordId: "landlord-1" } } } as any)
    mockGetUser.mockResolvedValue({ data: { user: { id: "admin-1" } }, error: null })
    mockPrisma.bookingExtension.update.mockResolvedValue({
      ...mockExtension,
      status: "PAID",
    } as any)
    mockPrisma.booking.update.mockResolvedValue({
      id: "booking-1",
      checkout: mockExtension.requestedCheckout,
    } as any)
  })

  it("requires admin auth", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: new Error("Unauthorized") })
    await expect(markExtensionAsPaid("ext-1")).rejects.toThrow("Unauthorized")
  })

  it("updates extension APPROVED -> PAID and booking.checkout -> requestedCheckout, returns { success: true }", async () => {
    const result = await markExtensionAsPaid("ext-1")
    expect(mockPrisma.bookingExtension.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "ext-1", status: "APPROVED" },
        data: { status: "PAID" },
      })
    )
    expect(mockPrisma.booking.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "booking-1" },
        data: { checkout: mockExtension.requestedCheckout },
      })
    )
    expect(result).toEqual({ success: true })
  })

  it("returns { error: 'not_approved' } when extension is not in APPROVED status (P2025)", async () => {
    mockPrisma.bookingExtension.update.mockRejectedValue(makePrismaNotFoundError())
    const result = await markExtensionAsPaid("ext-1")
    expect(result).toEqual({ error: "not_approved" })
  })

  it("revalidates /admin/bookings/[bookingId] and /{slug}/bookings/[bookingId]", async () => {
    await markExtensionAsPaid("ext-1")
    expect(revalidatePath).toHaveBeenCalledWith("/admin/bookings/booking-1")
    expect(revalidatePath).toHaveBeenCalledWith("/highhill/bookings/booking-1")
  })

  it("sends extension payment confirmation email to guest (non-fatal)", async () => {
    mockEmailSend.mockRejectedValue(new Error("Email service down"))
    const result = await markExtensionAsPaid("ext-1")
    expect(result).toEqual({ success: true })
  })
})
