import { describe, it, expect, vi, beforeEach } from "vitest"
import { NextResponse } from "next/server"

// --- Prisma mock ---
import "../../../../../../tests/lib/prisma-mock"
import { mockPrisma } from "../../../../../../tests/lib/prisma-mock"

// --- next/headers mock ---
const { mockHeadersGet } = vi.hoisted(() => ({
  mockHeadersGet: vi.fn().mockReturnValue("whsec_test"),
}))
vi.mock("next/headers", () => ({
  headers: vi.fn().mockResolvedValue({ get: mockHeadersGet }),
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

// --- Stripe mock ---
const { mockConstructEvent, mockTransaction } = vi.hoisted(() => ({
  mockConstructEvent: vi.fn(),
  mockTransaction: vi.fn(),
}))
vi.mock("@/lib/stripe", () => ({
  stripe: {
    webhooks: {
      constructEvent: mockConstructEvent,
    },
  },
}))

import { POST } from "@/app/api/stripe/webhook/route"

// Helper: make a mock Request with a valid-looking signature
function makeMockRequest(body: string = "{}") {
  return new Request("https://example.com/api/stripe/webhook", {
    method: "POST",
    headers: {
      "stripe-signature": "t=123,v1=abc",
      "content-type": "application/json",
    },
    body,
  })
}

// Helper: build a checkout.session.completed event
function makeSessionCompletedEvent(metadata: Record<string, string>) {
  return {
    type: "checkout.session.completed",
    data: {
      object: {
        id: "sess_test",
        metadata,
      },
    },
  }
}

const mockExtension = {
  id: "ext-1",
  bookingId: "booking-1",
  status: "APPROVED",
  requestedCheckout: new Date("2026-05-10T00:00:00.000Z"),
}

const mockExtensionPaid = {
  ...mockExtension,
  status: "PAID",
}

const mockFullBooking = {
  id: "booking-1",
  guestEmail: "guest@example.com",
  guestName: "Jane Guest",
  checkin: new Date("2026-05-01T00:00:00.000Z"),
  checkout: new Date("2026-05-05T00:00:00.000Z"),
  confirmedPrice: 500,
  room: { name: "Ocean View Suite" },
}

describe("Stripe webhook — extension branch", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockHeadersGet.mockReturnValue("t=123,v1=abc")
    mockPrisma.bookingExtension.findUnique.mockResolvedValue(mockExtension as any)
    mockPrisma.$transaction.mockResolvedValue([
      { ...mockExtension, status: "PAID" },
      { ...mockFullBooking, checkout: mockExtension.requestedCheckout },
    ])
    mockPrisma.booking.findUnique.mockResolvedValue(mockFullBooking as any)
  })

  it("routes checkout.session.completed with metadata.type='extension' to extension handler", async () => {
    mockConstructEvent.mockReturnValue(
      makeSessionCompletedEvent({ type: "extension", extensionId: "ext-1" })
    )
    const req = makeMockRequest()
    const response = await POST(req)
    expect(response.status).toBe(200)
    // Extension findUnique should be called
    expect(mockPrisma.bookingExtension.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "ext-1" } })
    )
  })

  it("updates BookingExtension.status = PAID and Booking.checkout = requestedCheckout in transaction", async () => {
    mockConstructEvent.mockReturnValue(
      makeSessionCompletedEvent({ type: "extension", extensionId: "ext-1" })
    )
    mockPrisma.bookingExtension.update.mockResolvedValue({ ...mockExtension, status: "PAID" } as any)
    mockPrisma.booking.update.mockResolvedValue({
      id: "booking-1",
      checkout: mockExtension.requestedCheckout,
    } as any)
    const req = makeMockRequest()
    await POST(req)
    expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1)
    // Verify the individual update calls are wired (transaction received an array)
    const transactionArg = mockPrisma.$transaction.mock.calls[0][0]
    expect(Array.isArray(transactionArg)).toBe(true)
    expect(transactionArg).toHaveLength(2)
  })

  it("is idempotent: no-op if extension is already PAID", async () => {
    mockConstructEvent.mockReturnValue(
      makeSessionCompletedEvent({ type: "extension", extensionId: "ext-1" })
    )
    mockPrisma.bookingExtension.findUnique.mockResolvedValue(mockExtensionPaid as any)
    const req = makeMockRequest()
    const response = await POST(req)
    expect(response.status).toBe(200)
    expect(mockPrisma.$transaction).not.toHaveBeenCalled()
  })

  it("returns 400 if metadata.type='extension' but extensionId is missing", async () => {
    mockConstructEvent.mockReturnValue(
      makeSessionCompletedEvent({ type: "extension" }) // no extensionId
    )
    const req = makeMockRequest()
    const response = await POST(req)
    expect(response.status).toBe(400)
  })

  it("routes checkout.session.completed with no type (or type='booking') to booking handler unchanged", async () => {
    mockConstructEvent.mockReturnValue(
      makeSessionCompletedEvent({ bookingId: "booking-1" }) // no type — defaults to booking
    )
    mockPrisma.booking.updateMany.mockResolvedValue({ count: 1 } as any)
    const req = makeMockRequest()
    const response = await POST(req)
    expect(response.status).toBe(200)
    // Booking updateMany should be called (existing behavior)
    expect(mockPrisma.booking.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "booking-1", status: "APPROVED" },
        data: { status: "PAID" },
      })
    )
    // Extension findUnique should NOT be called
    expect(mockPrisma.bookingExtension.findUnique).not.toHaveBeenCalled()
  })
})
