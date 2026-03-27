import { describe, it, expect, vi, beforeEach } from "vitest"
import "../lib/prisma-mock"
import { mockPrisma } from "../lib/prisma-mock"

// Mock next/cache before importing the action
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))

// Mock next/navigation before importing the action
vi.mock("next/navigation", () => ({ redirect: vi.fn() }))

// Mock Resend before importing the action
vi.mock("resend", () => ({
  Resend: vi.fn().mockImplementation(() => ({
    emails: { send: vi.fn().mockResolvedValue({ data: { id: "email-1" }, error: null }) },
  })),
}))

// Mock Supabase server client
const mockSignUp = vi.fn()
const mockGetUser = vi.fn()
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(() =>
    Promise.resolve({
      auth: { signUp: mockSignUp, getUser: mockGetUser },
    })
  ),
}))

import { submitBooking } from "@/actions/booking"
import { redirect } from "next/navigation"
import { Resend } from "resend"

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
}

describe("submitBooking", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockPrisma.booking.create.mockResolvedValue(mockCreatedBooking as any)
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

  it("with createAccount=true and valid password: calls supabase.auth.signUp with email and role=guest", async () => {
    mockSignUp.mockResolvedValue({
      data: { user: { id: "user-abc" }, session: null },
      error: null,
    })
    try {
      await submitBooking({ ...validBookingData, createAccount: true, password: "password123" })
    } catch {
      // redirect throws
    }
    expect(mockSignUp).toHaveBeenCalledWith({
      email: "jane@example.com",
      password: "password123",
      options: { data: { role: "guest" } },
    })
  })

  it("with createAccount=true and signUp returning a user: stores user.id as guestUserId", async () => {
    mockSignUp.mockResolvedValue({
      data: { user: { id: "user-abc" }, session: null },
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
    mockSignUp.mockResolvedValue({
      data: { user: null, session: null },
      error: null,
    })
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
    const resendInstance = vi.mocked(Resend).mock.results[0].value
    expect(resendInstance.emails.send).toHaveBeenCalledOnce()
    const sendCall = resendInstance.emails.send.mock.calls[0][0]
    expect(sendCall.to).toBe("jane@example.com")
    expect(sendCall.subject).toMatch(/received/i)
  })

  it("calls redirect to /bookings/[id]?new=1 after successful create", async () => {
    try {
      await submitBooking(validBookingData)
    } catch {
      // redirect throws
    }
    expect(vi.mocked(redirect)).toHaveBeenCalledWith("/bookings/booking-123?new=1")
  })
})
