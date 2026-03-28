import { describe, it } from "vitest"

// Wave 0 stubs — implementations added in Plan 03

describe("approveExtension", () => {
  it.todo("requires admin auth")
  it.todo("updates extension status PENDING -> APPROVED, sets extensionPrice, returns { success: true }")
  it.todo("returns { error: 'not_pending' } when extension not found with PENDING status (P2025)")
  it.todo("sends guest approval email with extensionPrice (non-fatal)")
  it.todo("revalidates /admin/bookings and /admin/bookings/[bookingId]")
})

describe("declineExtension", () => {
  it.todo("requires admin auth")
  it.todo("updates extension status PENDING -> DECLINED, stores declineReason, returns { success: true }")
  it.todo("returns { error: 'not_pending' } when extension not found with PENDING status (P2025)")
  it.todo("sends guest decline email with optional declineReason (non-fatal)")
  it.todo("revalidates /admin/bookings and /admin/bookings/[bookingId]")
})
