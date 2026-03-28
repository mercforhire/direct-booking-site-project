import { describe, it, expect, vi, beforeEach } from "vitest"
import "../lib/prisma-mock"
import { mockPrisma } from "../lib/prisma-mock"

// Mock next/cache before importing the action
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))

// Mock next/navigation before importing the action
vi.mock("next/navigation", () => ({ redirect: vi.fn() }))

// Mock Resend before importing the action — use vi.hoisted so the reference is available
// in the mock factory (vi.mock calls are hoisted before variable declarations).
// Use a regular function (not arrow) for mockImplementation so `new Resend()` works.
const { mockEmailSend } = vi.hoisted(() => ({
  mockEmailSend: vi.fn().mockResolvedValue({ data: { id: "email-1" }, error: null }),
}))
vi.mock("resend", () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Resend: vi.fn().mockImplementation(function (this: any) {
    this.emails = { send: mockEmailSend }
  }),
}))

// Mock the Supabase JS admin client (used by submitBooking for guest account creation)
const { mockAdminCreateUser, mockAdminListUsers } = vi.hoisted(() => ({
  mockAdminCreateUser: vi.fn(),
  mockAdminListUsers: vi.fn(),
}))
vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => ({
    auth: {
      admin: {
        createUser: mockAdminCreateUser,
        listUsers: mockAdminListUsers,
      },
    },
  })),
}))

import { submitBooking } from "@/actions/booking"
import { redirect } from "next/navigation"

const validBookingData = {
  roomId: "room-1",
  checkin: "2026-04-10",
  checkout: "2026-04-15",
  numGuests: 2,
  selectedAddOnIds: ["addon-1", "addon-2"],
  noteToLandlord: "Please have towels ready",
  guestName: "Jane Doe",
  guestEmail: "jane@example.com",
  guestPhone: "+1 555-0100",
  estimatedTotal: 450,
  createAccount: false,
}

const mockCreatedBooking = {
  id: "booking-123",
  roomId: "room-1",
  guestName: "Jane Doe",
  guestEmail: "jane@example.com",
  guestPhone: "+1 555-0100",
  guestUserId: null,
  checkin: new Date("2026-04-10T00:00:00.000Z"),
  checkout: new Date("2026-04-15T00:00:00.000Z"),
  numGuests: 2,
  selectedAddOnIds: ["addon-1", "addon-2"],
  noteToLandlord: "Please have towels ready",
  estimatedTotal: 450,
  status: "PENDING",
  accessToken: "some-uuid",
  createdAt: new Date(),
  updatedAt: new Date(),
  room: { name: "Room 1" },
}

describe("submitBooking", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockPrisma.booking.create.mockResolvedValue(mockCreatedBooking as any)
    // Default: no account creation (createAccount=false path doesn't call these)
    mockAdminCreateUser.mockResolvedValue({ data: { user: null }, error: null })
    mockAdminListUsers.mockResolvedValue({ data: { users: [] }, error: null })
  })

  it("returns { error } when input is invalid", async () => {
    const result = await submitBooking({ roomId: "", guestEmail: "not-an-email" })
    expect(result).toHaveProperty("error")
  })

  it("with createAccount=false: calls prisma.booking.create with guestUserId=null", async () => {
    try {
      await submitBooking({ ...validBookingData, createAccount: false })
    } catch {
      // redirect throws in Next.js — that's expected
    }
    expect(mockPrisma.booking.create).toHaveBeenCalledOnce()
    const callArg = mockPrisma.booking.create.mock.calls[0][0]
    expect(callArg.data.guestUserId).toBeNull()
  })

  it("with createAccount=true and valid password: calls adminClient.auth.admin.createUser with email_confirm: true and role=guest", async () => {
    mockAdminCreateUser.mockResolvedValue({
      data: { user: { id: "user-abc" } },
      error: null,
    })
    try {
      await submitBooking({ ...validBookingData, createAccount: true, password: "password123" })
    } catch {
      // redirect throws
    }
    expect(mockAdminCreateUser).toHaveBeenCalledWith({
      email: "jane@example.com",
      password: "password123",
      email_confirm: true,
      user_metadata: { role: "guest" },
    })
  })

  it("with createAccount=true and signUp returning a user: stores user.id as guestUserId", async () => {
    mockAdminCreateUser.mockResolvedValue({
      data: { user: { id: "user-abc" } },
      error: null,
    })
    try {
      await submitBooking({ ...validBookingData, createAccount: true, password: "password123" })
    } catch {
      // redirect throws
    }
    const callArg = mockPrisma.booking.create.mock.calls[0][0]
    expect(callArg.data.guestUserId).toBe("user-abc")
  })

  it("with createAccount=true and signUp returning user=null (duplicate email): stores guestUserId=null", async () => {
    mockAdminCreateUser.mockResolvedValue({
      data: { user: null },
      error: { message: "User already registered" },
    })
    mockAdminListUsers.mockResolvedValue({ data: { users: [] }, error: null })
    try {
      await submitBooking({ ...validBookingData, createAccount: true, password: "password123" })
    } catch {
      // redirect throws
    }
    const callArg = mockPrisma.booking.create.mock.calls[0][0]
    expect(callArg.data.guestUserId).toBeNull()
  })

  it("stores selectedAddOnIds as an array (not a string)", async () => {
    try {
      await submitBooking(validBookingData)
    } catch {
      // redirect throws
    }
    const callArg = mockPrisma.booking.create.mock.calls[0][0]
    expect(Array.isArray(callArg.data.selectedAddOnIds)).toBe(true)
    expect(callArg.data.selectedAddOnIds).toEqual(["addon-1", "addon-2"])
  })

  it("stores noteToLandlord when provided", async () => {
    try {
      await submitBooking(validBookingData)
    } catch {
      // redirect throws
    }
    const callArg = mockPrisma.booking.create.mock.calls[0][0]
    expect(callArg.data.noteToLandlord).toBe("Please have towels ready")
  })

  it("stores noteToLandlord as null when omitted", async () => {
    const dataWithoutNote = { ...validBookingData }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (dataWithoutNote as any).noteToLandlord
    try {
      await submitBooking(dataWithoutNote)
    } catch {
      // redirect throws
    }
    const callArg = mockPrisma.booking.create.mock.calls[0][0]
    expect(callArg.data.noteToLandlord).toBeNull()
  })

  it("generates a UUID accessToken (matches /^[0-9a-f-]{36}$/)", async () => {
    try {
      await submitBooking(validBookingData)
    } catch {
      // redirect throws
    }
    const callArg = mockPrisma.booking.create.mock.calls[0][0]
    expect(callArg.data.accessToken).toMatch(/^[0-9a-f-]{36}$/)
  })

  it("calls resend.emails.send with to=guestEmail and subject containing 'received'", async () => {
    try {
      await submitBooking(validBookingData)
    } catch {
      // redirect throws
    }
    expect(mockEmailSend).toHaveBeenCalled()
    const sendCall = mockEmailSend.mock.calls[0][0]
    expect(sendCall.to).toBe("jane@example.com")
    expect(sendCall.subject).toMatch(/received/i)
  })

  it("calls redirect to /bookings/[id]?new=1 after successful create", async () => {
    try {
      await submitBooking(validBookingData)
    } catch {
      // redirect throws
    }
    expect(vi.mocked(redirect)).toHaveBeenCalledWith(
      expect.stringMatching(/^\/bookings\/booking-123\?token=[0-9a-f-]{36}&new=1$/)
    )
  })

  it("sends landlord notification email to LANDLORD_EMAIL with subject containing 'New booking request'", async () => {
    process.env.LANDLORD_EMAIL = "landlord@example.com"
    try {
      await submitBooking(validBookingData)
    } catch {
      // redirect throws
    }
    delete process.env.LANDLORD_EMAIL
    // Two emails sent: guest confirmation + landlord notification
    expect(mockEmailSend).toHaveBeenCalledTimes(2)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const calls = mockEmailSend.mock.calls.map((c: any[]) => c[0] as { to: string; subject: string })
    const landlordCall = calls.find((c: { to: string }) => c.to === "landlord@example.com")
    expect(landlordCall).toBeDefined()
    expect(landlordCall?.subject).toMatch(/New booking request/i)
  })

  it("calls prisma.booking.create with room include", async () => {
    try {
      await submitBooking(validBookingData)
    } catch {
      // redirect throws
    }
    expect(mockPrisma.booking.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.anything(),
        include: { room: { select: { name: true } } },
      })
    )
  })
})
