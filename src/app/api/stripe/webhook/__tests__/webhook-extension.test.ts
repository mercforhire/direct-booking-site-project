import { describe, it } from "vitest"

// Wave 0 stubs — implementations added in Plan 04

describe("Stripe webhook — extension branch", () => {
  it.todo("routes checkout.session.completed with metadata.type='extension' to extension handler")
  it.todo("updates BookingExtension.status = PAID and Booking.checkout = requestedCheckout in transaction")
  it.todo("is idempotent: no-op if extension is already PAID")
  it.todo("returns 400 if metadata.type='extension' but extensionId is missing")
  it.todo("routes checkout.session.completed with no type (or type='booking') to booking handler unchanged")
})
