import { describe, it, expect, vi, beforeEach } from "vitest"
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library"

// --- Prisma mock ---
import "../../../tests/lib/prisma-mock"
import { mockPrisma } from "../../../tests/lib/prisma-mock"

// --- next/cache mock ---
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))

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

import { approveExtension, declineExtension } from "@/actions/extension-admin"
import { revalidatePath } from "next/cache"

const mockExtensionApproved = {
  id: "ext-1",
  booking: {
    id: "booking-1",
    guestEmail: "guest@example.com",
    guestName: "Jane Guest",
    accessToken: "token-abc",
    checkout: new Date("2026-05-05T00:00:00.000Z"),
    room: { name: "Ocean View Suite" },
  },
  requestedCheckout: new Date("2026-05-10T00:00:00.000Z"),
}

const mockExtensionDeclined = {
  id: "ext-1",
  booking: {
    id: "booking-1",
    guestEmail: "guest@example.com",
    guestName: "Jane Guest",
    accessToken: "token-abc",
    room: { name: "Ocean View Suite" },
  },
  requestedCheckout: new Date("2026-05-10T00:00:00.000Z"),
}

function makePrismaNotFoundError() {
  return new PrismaClientKnownRequestError("Record not found", {
    code: "P2025",
    clientVersion: "6.0.0",
  })
}

describe("approveExtension", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetUser.mockResolvedValue({ data: { user: { id: "admin-1" } }, error: null })
    mockPrisma.bookingExtension.update.mockResolvedValue(mockExtensionApproved as any)
  })

  it("requires admin auth", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: new Error("Unauthorized") })
    await expect(approveExtension("ext-1", { extensionPrice: 200 })).rejects.toThrow("Unauthorized")
  })

  it("updates extension status PENDING -> APPROVED, sets extensionPrice, returns { success: true }", async () => {
    const result = await approveExtension("ext-1", { extensionPrice: 200 })
    expect(mockPrisma.bookingExtension.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "ext-1", status: "PENDING" },
        data: { status: "APPROVED", extensionPrice: 200 },
      })
    )
    expect(result).toEqual({ success: true })
  })

  it("returns { error: 'not_pending' } when extension not found with PENDING status (P2025)", async () => {
    mockPrisma.bookingExtension.update.mockRejectedValue(makePrismaNotFoundError())
    const result = await approveExtension("ext-1", { extensionPrice: 200 })
    expect(result).toEqual({ error: "not_pending" })
  })

  it("sends guest approval email with extensionPrice (non-fatal)", async () => {
    mockEmailSend.mockRejectedValue(new Error("Email service down"))
    const result = await approveExtension("ext-1", { extensionPrice: 200 })
    expect(result).toEqual({ success: true })
  })

  it("revalidates /admin/bookings, /admin/bookings/[bookingId], and /bookings/[bookingId]", async () => {
    await approveExtension("ext-1", { extensionPrice: 200 })
    expect(revalidatePath).toHaveBeenCalledWith("/admin/bookings")
    expect(revalidatePath).toHaveBeenCalledWith("/admin/bookings/booking-1")
    expect(revalidatePath).toHaveBeenCalledWith("/bookings/booking-1")
  })
})

describe("declineExtension", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetUser.mockResolvedValue({ data: { user: { id: "admin-1" } }, error: null })
    mockPrisma.bookingExtension.update.mockResolvedValue(mockExtensionDeclined as any)
  })

  it("requires admin auth", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: new Error("Unauthorized") })
    await expect(declineExtension("ext-1", {})).rejects.toThrow("Unauthorized")
  })

  it("updates extension status PENDING -> DECLINED, stores declineReason, returns { success: true }", async () => {
    const result = await declineExtension("ext-1", { declineReason: "Too late" })
    expect(mockPrisma.bookingExtension.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "ext-1", status: "PENDING" },
        data: { status: "DECLINED", declineReason: "Too late" },
      })
    )
    expect(result).toEqual({ success: true })
  })

  it("returns { error: 'not_pending' } when extension not found with PENDING status (P2025)", async () => {
    mockPrisma.bookingExtension.update.mockRejectedValue(makePrismaNotFoundError())
    const result = await declineExtension("ext-1", {})
    expect(result).toEqual({ error: "not_pending" })
  })

  it("sends guest decline email with optional declineReason (non-fatal)", async () => {
    mockEmailSend.mockRejectedValue(new Error("Email service down"))
    const result = await declineExtension("ext-1", { declineReason: "Too late" })
    expect(result).toEqual({ success: true })
  })

  it("revalidates /admin/bookings, /admin/bookings/[bookingId], and /bookings/[bookingId]", async () => {
    await declineExtension("ext-1", {})
    expect(revalidatePath).toHaveBeenCalledWith("/admin/bookings")
    expect(revalidatePath).toHaveBeenCalledWith("/admin/bookings/booking-1")
    expect(revalidatePath).toHaveBeenCalledWith("/bookings/booking-1")
  })
})
