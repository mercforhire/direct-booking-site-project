import { describe, it } from "vitest"

// Wave 0 stubs — implementations added in Plan 02
// Mock setup mirrors src/actions/__tests__/payment.test.ts pattern

describe("submitExtension", () => {
  it.todo("creates PENDING BookingExtension and returns { success: true }")
  it.todo("returns { error: 'booking_not_eligible' } when booking status is not APPROVED or PAID")
  it.todo("returns { error: 'extension_already_pending' } when a PENDING extension already exists")
  it.todo("sends landlord notification email (non-fatal — returns success even if email fails)")
  it.todo("revalidates /bookings/[bookingId] after creation")
})

describe("cancelExtension", () => {
  it.todo("deletes the BookingExtension record when status is PENDING and returns { success: true }")
  it.todo("returns { error: 'not_pending' } when extension is not in PENDING status (P2025)")
  it.todo("revalidates /bookings/[bookingId] after cancellation")
})
