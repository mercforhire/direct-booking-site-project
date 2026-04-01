import { describe, it, expect, vi, beforeEach } from "vitest"

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
const { mockConstructEvent } = vi.hoisted(() => ({
  mockConstructEvent: vi.fn(),
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

const mockDateChange = {
  id: "dc-1",
  bookingId: "booking-1",
  status: "APPROVED",
  requestedCheckin: new Date("2026-06-01T00:00:00.000Z"),
  requestedCheckout: new Date("2026-06-10T00:00:00.000Z"),
  newPrice: 200,
}

const mockDateChangePaid = { ...mockDateChange, status: "PAID" }

const mockFullBooking = {
  id: "booking-1",
  guestEmail: "guest@example.com",
  guestName: "Jane Guest",
  accessToken: "token-abc",
  checkin: new Date("2026-06-01T00:00:00.000Z"),
  checkout: new Date("2026-06-10T00:00:00.000Z"),
  confirmedPrice: 800,
  room: { name: "Ocean View Suite", landlord: { slug: "highhill" } },
}

describe("Stripe webhook — date_change_topup branch", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockHeadersGet.mockReturnValue("t=123,v1=abc")
    mockPrisma.bookingDateChange.findUnique.mockResolvedValue(mockDateChange as any)
    mockPrisma.$transaction.mockResolvedValue([
      { ...mockDateChange, status: "PAID" },
      { ...mockFullBooking, checkin: mockDateChange.requestedCheckin, checkout: mockDateChange.requestedCheckout },
    ])
    mockPrisma.booking.findUnique.mockResolvedValue(mockFullBooking as any)
  })

  it("routes checkout.session.completed with type='date_change_topup' to date change handler", async () => {
    mockConstructEvent.mockReturnValue(
      makeSessionCompletedEvent({ type: "date_change_topup", dateChangeId: "dc-1" })
    )
    const req = makeMockRequest()
    const response = await POST(req)
    expect(response.status).toBe(200)
    expect(mockPrisma.bookingDateChange.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "dc-1" } })
    )
  })

  it("marks dateChange PAID and updates booking dates in transaction when status=APPROVED", async () => {
    mockConstructEvent.mockReturnValue(
      makeSessionCompletedEvent({ type: "date_change_topup", dateChangeId: "dc-1" })
    )
    const req = makeMockRequest()
    await POST(req)
    expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1)
    const transactionArg = mockPrisma.$transaction.mock.calls[0][0]
    expect(Array.isArray(transactionArg)).toBe(true)
    expect(transactionArg).toHaveLength(2)
  })

  it("is idempotent: skips transaction when dateChange is already PAID", async () => {
    mockConstructEvent.mockReturnValue(
      makeSessionCompletedEvent({ type: "date_change_topup", dateChangeId: "dc-1" })
    )
    mockPrisma.bookingDateChange.findUnique.mockResolvedValue(mockDateChangePaid as any)
    const req = makeMockRequest()
    const response = await POST(req)
    expect(response.status).toBe(200)
    expect(mockPrisma.$transaction).not.toHaveBeenCalled()
  })

  it("returns 400 if dateChangeId missing from metadata", async () => {
    mockConstructEvent.mockReturnValue(
      makeSessionCompletedEvent({ type: "date_change_topup" }) // no dateChangeId
    )
    const req = makeMockRequest()
    const response = await POST(req)
    expect(response.status).toBe(400)
  })

  it("sends BookingDateChangePaidEmail after successful transaction", async () => {
    // THIS WILL FAIL — email send not yet implemented in webhook route
    mockConstructEvent.mockReturnValue(
      makeSessionCompletedEvent({ type: "date_change_topup", dateChangeId: "dc-1" })
    )
    const req = makeMockRequest()
    await POST(req)
    expect(mockEmailSend).toHaveBeenCalledTimes(1)
  })

  it("email send failure does not affect 200 response (non-fatal)", async () => {
    mockConstructEvent.mockReturnValue(
      makeSessionCompletedEvent({ type: "date_change_topup", dateChangeId: "dc-1" })
    )
    mockEmailSend.mockRejectedValue(new Error("Resend API error"))
    const req = makeMockRequest()
    const response = await POST(req)
    expect(response.status).toBe(200)
  })
})
