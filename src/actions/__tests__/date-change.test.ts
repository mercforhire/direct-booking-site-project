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

import { submitDateChange, cancelDateChange } from "@/actions/date-change"
import { revalidatePath } from "next/cache"

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
