import { describe, it, expect, vi, beforeEach } from "vitest"

// --- Prisma mock ---
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

// --- Supabase auth mock ---
const { mockGetUser } = vi.hoisted(() => ({
  mockGetUser: vi.fn().mockResolvedValue({ data: { user: { id: "admin-1" } }, error: null }),
}))
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(() => ({
    auth: { getUser: mockGetUser },
  })),
}))

import { submitMessage, sendMessageAsLandlord } from "@/actions/messaging"
import { revalidatePath } from "next/cache"

const mockBooking = {
  id: "booking-1",
  guestName: "Jane Guest",
  guestEmail: "guest@example.com",
  accessToken: "token-abc",
  checkin: new Date("2026-05-01T00:00:00.000Z"),
  checkout: new Date("2026-05-07T00:00:00.000Z"),
  room: { name: "Ocean View Suite" },
}

describe("submitMessage", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.LANDLORD_EMAIL = "landlord@example.com"
    process.env.RESEND_API_KEY = "re_test_key"
    process.env.RESEND_FROM_EMAIL = "noreply@example.com"
    process.env.NEXT_PUBLIC_SITE_URL = "https://example.com"
    mockPrisma.booking.findUnique.mockResolvedValue(mockBooking as any)
    mockPrisma.message.create.mockResolvedValue({
      id: "msg-1",
      bookingId: "booking-1",
      sender: "GUEST",
      senderName: "Jane Guest",
      body: "Hello, is early check-in possible?",
      createdAt: new Date(),
    } as any)
  })

  it("MSG-01: valid token creates Message with sender=GUEST, returns { success: true }", async () => {
    const result = await submitMessage("booking-1", "token-abc", { body: "Hello!" })
    expect(mockPrisma.message.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          bookingId: "booking-1",
          sender: "GUEST",
          senderName: "Jane Guest",
          body: "Hello!",
        }),
      })
    )
    expect(result).toEqual({ success: true })
  })

  it("MSG-01: mismatched token returns { error: 'unauthorized' }", async () => {
    const result = await submitMessage("booking-1", "wrong-token", { body: "Hello!" })
    expect(result).toEqual({ error: "unauthorized" })
    expect(mockPrisma.message.create).not.toHaveBeenCalled()
  })

  it("MSG-01: empty body returns Zod validation error", async () => {
    const result = await submitMessage("booking-1", "token-abc", { body: "" })
    expect(result).toHaveProperty("error")
    expect(mockPrisma.message.create).not.toHaveBeenCalled()
  })

  it("MSG-04: Resend throws — still returns { success: true } (non-fatal)", async () => {
    mockEmailSend.mockRejectedValue(new Error("Email service down"))
    const result = await submitMessage("booking-1", "token-abc", { body: "Hello!" })
    expect(result).toEqual({ success: true })
  })

  it("revalidates /bookings/[id], /admin/bookings/[id], /admin/bookings", async () => {
    await submitMessage("booking-1", "token-abc", { body: "Hello!" })
    expect(revalidatePath).toHaveBeenCalledWith("/bookings/booking-1")
    expect(revalidatePath).toHaveBeenCalledWith("/admin/bookings/booking-1")
    expect(revalidatePath).toHaveBeenCalledWith("/admin/bookings")
  })
})

describe("sendMessageAsLandlord", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.RESEND_API_KEY = "re_test_key"
    process.env.RESEND_FROM_EMAIL = "noreply@example.com"
    process.env.NEXT_PUBLIC_SITE_URL = "https://example.com"
    mockGetUser.mockResolvedValue({ data: { user: { id: "admin-1" } }, error: null })
    mockPrisma.booking.findUnique.mockResolvedValue(mockBooking as any)
    mockPrisma.message.create.mockResolvedValue({
      id: "msg-2",
      bookingId: "booking-1",
      sender: "LANDLORD",
      senderName: "Host",
      body: "Yes, early check-in is available.",
      createdAt: new Date(),
    } as any)
  })

  it("MSG-02: valid admin session creates Message with sender=LANDLORD, senderName='Host', returns { success: true }", async () => {
    const result = await sendMessageAsLandlord("booking-1", { body: "Yes, available." })
    expect(mockPrisma.message.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          bookingId: "booking-1",
          sender: "LANDLORD",
          senderName: "Host",
          body: "Yes, available.",
        }),
      })
    )
    expect(result).toEqual({ success: true })
  })

  it("MSG-02: no session throws Unauthorized", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: new Error("Unauthorized") })
    await expect(sendMessageAsLandlord("booking-1", { body: "Hello" })).rejects.toThrow("Unauthorized")
  })

  it("MSG-05: Resend throws — still returns { success: true } (non-fatal)", async () => {
    mockEmailSend.mockRejectedValue(new Error("Email service down"))
    const result = await sendMessageAsLandlord("booking-1", { body: "Hello!" })
    expect(result).toEqual({ success: true })
  })
})
