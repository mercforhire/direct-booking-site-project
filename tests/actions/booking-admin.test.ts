import { describe, it, expect, vi, beforeEach } from "vitest"
import "../lib/prisma-mock"
import { mockPrisma } from "../lib/prisma-mock"
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library"

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))

vi.mock("@react-email/render", () => ({
  render: vi.fn().mockResolvedValue("<html>email</html>"),
}))

const { mockEmailSend } = vi.hoisted(() => ({
  mockEmailSend: vi.fn().mockResolvedValue({ data: { id: "email-1" }, error: null }),
}))
vi.mock("resend", () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Resend: vi.fn().mockImplementation(function (this: any) {
    this.emails = { send: mockEmailSend }
  }),
}))

const { mockGetUser } = vi.hoisted(() => ({
  mockGetUser: vi.fn().mockResolvedValue({ data: { user: { id: "admin-1" } }, error: null }),
}))
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(() => ({
    auth: { getUser: mockGetUser },
  })),
}))

import { approveBooking, declineBooking } from "@/actions/booking-admin"
import { revalidatePath } from "next/cache"

const mockBooking = {
  id: "booking-1",
  guestEmail: "guest@example.com",
  guestName: "Jane Guest",
  status: "APPROVED",
  confirmedPrice: 500,
  room: { name: "Ocean View Suite", landlord: { slug: "leon" } },
}

const mockDeclinedBooking = {
  id: "booking-1",
  guestEmail: "guest@example.com",
  guestName: "Jane Guest",
  status: "DECLINED",
  declineReason: "Not available",
  room: { name: "Ocean View Suite", landlord: { slug: "leon" } },
}

function makePrismaNotFoundError() {
  return new PrismaClientKnownRequestError("Record not found", {
    code: "P2025",
    clientVersion: "6.0.0",
  })
}

describe("approveBooking", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetUser.mockResolvedValue({ data: { user: { id: "admin-1" } }, error: null })
    mockPrisma.landlord.findFirst.mockResolvedValue({ id: "landlord-1", adminUserId: "admin-1" } as any)
    mockPrisma.booking.findUnique.mockResolvedValue({ id: "booking-1", room: { landlordId: "landlord-1" } } as any)
    mockPrisma.booking.update.mockResolvedValue(mockBooking as any)
  })

  it("throws Unauthorized if getUser returns error", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: new Error("No session") })
    await expect(approveBooking("booking-1", { confirmedPrice: 500 })).rejects.toThrow("Unauthorized")
  })

  it("returns { error } if confirmedPrice is missing or non-positive", async () => {
    const result1 = await approveBooking("booking-1", {})
    expect(result1).toHaveProperty("error")

    const result2 = await approveBooking("booking-1", { confirmedPrice: -100 })
    expect(result2).toHaveProperty("error")

    const result3 = await approveBooking("booking-1", { confirmedPrice: 0 })
    expect(result3).toHaveProperty("error")
  })

  it("calls prisma.booking.update with status APPROVED and confirmedPrice", async () => {
    await approveBooking("booking-1", { confirmedPrice: 500 })
    expect(mockPrisma.booking.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "booking-1", status: "PENDING" },
        data: expect.objectContaining({ status: "APPROVED", confirmedPrice: 500 }),
      })
    )
  })

  it("calls resend.emails.send with to=guestEmail and subject containing 'approved'", async () => {
    await approveBooking("booking-1", { confirmedPrice: 500 })
    expect(mockEmailSend).toHaveBeenCalledOnce()
    const sendCall = mockEmailSend.mock.calls[0][0]
    expect(sendCall.to).toBe("guest@example.com")
    expect(sendCall.subject).toMatch(/approved/i)
  })

  it("calls revalidatePath('/admin/bookings')", async () => {
    await approveBooking("booking-1", { confirmedPrice: 500 })
    expect(revalidatePath).toHaveBeenCalledWith("/admin/bookings")
  })

  it("returns { success: true } on happy path", async () => {
    const result = await approveBooking("booking-1", { confirmedPrice: 500 })
    expect(result).toEqual({ success: true })
  })

  it("returns { error: 'not_pending' } when booking is not PENDING", async () => {
    mockPrisma.booking.update.mockRejectedValue(makePrismaNotFoundError())
    const result = await approveBooking("booking-1", { confirmedPrice: 500 })
    expect(result).toEqual({ error: "not_pending" })
  })

  it("still returns { success: true } when email send throws (email is non-fatal)", async () => {
    mockEmailSend.mockRejectedValue(new Error("Email service down"))
    const result = await approveBooking("booking-1", { confirmedPrice: 500 })
    expect(result).toEqual({ success: true })
  })
})

describe("declineBooking", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetUser.mockResolvedValue({ data: { user: { id: "admin-1" } }, error: null })
    mockPrisma.landlord.findFirst.mockResolvedValue({ id: "landlord-1", adminUserId: "admin-1" } as any)
    mockPrisma.booking.findUnique.mockResolvedValue({ id: "booking-1", room: { landlordId: "landlord-1" } } as any)
    mockPrisma.booking.update.mockResolvedValue(mockDeclinedBooking as any)
  })

  it("throws Unauthorized if getUser returns error", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: new Error("No session") })
    await expect(declineBooking("booking-1", {})).rejects.toThrow("Unauthorized")
  })

  it("calls prisma.booking.update with status DECLINED and declineReason", async () => {
    await declineBooking("booking-1", { declineReason: "Not available" })
    expect(mockPrisma.booking.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "booking-1", status: "PENDING" },
        data: expect.objectContaining({ status: "DECLINED", declineReason: "Not available" }),
      })
    )
  })

  it("accepts undefined declineReason — stores as null", async () => {
    await declineBooking("booking-1", {})
    expect(mockPrisma.booking.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "booking-1", status: "PENDING" },
        data: expect.objectContaining({ status: "DECLINED", declineReason: null }),
      })
    )
  })

  it("calls resend.emails.send with to=guestEmail and subject containing 'declined'", async () => {
    await declineBooking("booking-1", { declineReason: "Not available" })
    expect(mockEmailSend).toHaveBeenCalledOnce()
    const sendCall = mockEmailSend.mock.calls[0][0]
    expect(sendCall.to).toBe("guest@example.com")
    expect(sendCall.subject).toMatch(/declined/i)
  })

  it("calls revalidatePath('/admin/bookings')", async () => {
    await declineBooking("booking-1", { declineReason: "Not available" })
    expect(revalidatePath).toHaveBeenCalledWith("/admin/bookings")
  })

  it("returns { success: true } on happy path", async () => {
    const result = await declineBooking("booking-1", { declineReason: "Not available" })
    expect(result).toEqual({ success: true })
  })

  it("returns { error: 'not_pending' } when booking is not PENDING", async () => {
    mockPrisma.booking.update.mockRejectedValue(makePrismaNotFoundError())
    const result = await declineBooking("booking-1", {})
    expect(result).toEqual({ error: "not_pending" })
  })

  it("still returns { success: true } when email send throws (email is non-fatal)", async () => {
    mockEmailSend.mockRejectedValue(new Error("Email service down"))
    const result = await declineBooking("booking-1", {})
    expect(result).toEqual({ success: true })
  })
})
