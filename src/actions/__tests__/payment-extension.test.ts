import { describe, it } from "vitest"

// Wave 0 stubs — implementations added in Plan 04

describe("createExtensionStripeCheckoutSession", () => {
  it.todo("creates Stripe session with unit_amount = Math.round(extensionPrice * 100)")
  it.todo("sets metadata { type: 'extension', extensionId } on the session")
  it.todo("stores stripeSessionId on BookingExtension (not on Booking)")
  it.todo("returns { error: 'extension_not_found' } when extension not APPROVED")
  it.todo("redirects to session.url after successful session creation")
})

describe("markExtensionAsPaid", () => {
  it.todo("requires admin auth")
  it.todo("updates extension APPROVED -> PAID and booking.checkout -> requestedCheckout in a transaction")
  it.todo("returns { error: 'not_approved' } when extension is not in APPROVED status (P2025)")
  it.todo("revalidates /admin/bookings/[bookingId] and /bookings/[bookingId]")
  it.todo("sends extension payment confirmation email to guest (non-fatal)")
})
