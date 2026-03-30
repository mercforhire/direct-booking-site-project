import { describe, it, expect, vi, beforeEach } from "vitest"
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library"

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

import { submitExtension, cancelExtension } from "@/actions/extension"
import { revalidatePath } from "next/cache"

function makePrismaNotFoundError() {
  return new PrismaClientKnownRequestError("Record not found", {
    code: "P2025",
    clientVersion: "6.0.0",
  })
}

const mockBooking = {
  id: "booking-1",
  status: "APPROVED",
  guestName: "Jane Guest",
  guestEmail: "guest@example.com",
  accessToken: "token-abc",
  room: { name: "Ocean View Suite" },
}

describe("submitExtension", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.LANDLORD_EMAIL = "landlord@example.com"
    process.env.RESEND_API_KEY = "re_test_key"
    process.env.RESEND_FROM_EMAIL = "noreply@example.com"
    process.env.NEXT_PUBLIC_SITE_URL = "https://example.com"
    mockPrisma.booking.findUnique.mockResolvedValue(mockBooking as any)
    mockPrisma.bookingExtension.findFirst.mockResolvedValue(null)
    mockPrisma.bookingExtension.create.mockResolvedValue({
      id: "ext-1",
      bookingId: "booking-1",
      status: "PENDING",
      requestedCheckout: new Date("2026-06-10T00:00:00.000Z"),
      noteToLandlord: null,
    } as any)
  })

  it("creates PENDING BookingExtension and returns { success: true }", async () => {
    const result = await submitExtension("booking-1", {
      requestedCheckout: "2026-06-10",
      noteToLandlord: "Please extend if possible",
    })
    expect(mockPrisma.bookingExtension.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          bookingId: "booking-1",
          requestedCheckout: new Date("2026-06-10T12:00:00.000Z"),
          status: "PENDING",
        }),
      })
    )
    expect(result).toEqual({ success: true })
  })

  it("returns { error: 'booking_not_eligible' } when booking status is not APPROVED or PAID", async () => {
    mockPrisma.booking.findUnique.mockResolvedValue({
      ...mockBooking,
      status: "PENDING",
    } as any)
    const result = await submitExtension("booking-1", {
      requestedCheckout: "2026-06-10",
    })
    expect(result).toEqual({ error: "booking_not_eligible" })
    expect(mockPrisma.bookingExtension.create).not.toHaveBeenCalled()
  })

  it("returns { error: 'booking_not_eligible' } when booking is not found", async () => {
    mockPrisma.booking.findUnique.mockResolvedValue(null)
    const result = await submitExtension("booking-1", {
      requestedCheckout: "2026-06-10",
    })
    expect(result).toEqual({ error: "booking_not_eligible" })
    expect(mockPrisma.bookingExtension.create).not.toHaveBeenCalled()
  })

  it("returns { error: 'extension_already_pending' } when a PENDING extension already exists", async () => {
    mockPrisma.bookingExtension.findFirst.mockResolvedValue({
      id: "ext-existing",
      bookingId: "booking-1",
      status: "PENDING",
    } as any)
    const result = await submitExtension("booking-1", {
      requestedCheckout: "2026-06-10",
    })
    expect(result).toEqual({ error: "extension_already_pending" })
    expect(mockPrisma.bookingExtension.create).not.toHaveBeenCalled()
  })

  it("sends landlord notification email (non-fatal — returns success even if email fails)", async () => {
    mockEmailSend.mockRejectedValue(new Error("Email service down"))
    const result = await submitExtension("booking-1", {
      requestedCheckout: "2026-06-10",
    })
    expect(result).toEqual({ success: true })
  })

  it("revalidates /bookings/[bookingId] after creation", async () => {
    await submitExtension("booking-1", {
      requestedCheckout: "2026-06-10",
    })
    expect(revalidatePath).toHaveBeenCalledWith("/bookings/booking-1")
  })

  it("accepts PAID booking status as eligible", async () => {
    mockPrisma.booking.findUnique.mockResolvedValue({
      ...mockBooking,
      status: "PAID",
    } as any)
    const result = await submitExtension("booking-1", {
      requestedCheckout: "2026-06-10",
    })
    expect(result).toEqual({ success: true })
  })
})

describe("cancelExtension", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockPrisma.booking.findUnique.mockResolvedValue({
      id: "booking-1",
      accessToken: "token-abc",
    } as any)
    mockPrisma.bookingExtension.delete.mockResolvedValue({
      id: "ext-1",
      bookingId: "booking-1",
      status: "PENDING",
    } as any)
  })

  it("returns { error: 'unauthorized' } when token is null", async () => {
    const result = await cancelExtension("booking-1", "ext-1", null)
    expect(result).toEqual({ error: "unauthorized" })
    expect(mockPrisma.bookingExtension.delete).not.toHaveBeenCalled()
  })

  it("returns { error: 'unauthorized' } when token does not match booking.accessToken", async () => {
    const result = await cancelExtension("booking-1", "ext-1", "wrong-token")
    expect(result).toEqual({ error: "unauthorized" })
    expect(mockPrisma.bookingExtension.delete).not.toHaveBeenCalled()
  })

  it("returns { error: 'unauthorized' } when booking is not found", async () => {
    mockPrisma.booking.findUnique.mockResolvedValue(null)
    const result = await cancelExtension("booking-1", "ext-1", "token-abc")
    expect(result).toEqual({ error: "unauthorized" })
    expect(mockPrisma.bookingExtension.delete).not.toHaveBeenCalled()
  })

  it("deletes the BookingExtension record when status is PENDING and token matches", async () => {
    const result = await cancelExtension("booking-1", "ext-1", "token-abc")
    expect(mockPrisma.bookingExtension.delete).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: "ext-1",
          status: "PENDING",
        }),
      })
    )
    expect(result).toEqual({ success: true })
  })

  it("returns { error: 'not_pending' } when extension is not in PENDING status (P2025)", async () => {
    mockPrisma.bookingExtension.delete.mockRejectedValue(makePrismaNotFoundError())
    const result = await cancelExtension("booking-1", "ext-1", "token-abc")
    expect(result).toEqual({ error: "not_pending" })
  })

  it("revalidates /bookings/[bookingId] after cancellation", async () => {
    await cancelExtension("booking-1", "ext-1", "token-abc")
    expect(revalidatePath).toHaveBeenCalledWith("/bookings/booking-1")
  })
})
