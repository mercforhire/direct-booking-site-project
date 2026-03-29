import { describe, it, expect } from "vitest"
import { cancelBookingSchema } from "../cancellation"

describe("cancelBookingSchema", () => {
  it("accepts valid input with numeric refundAmount", () => {
    const result = cancelBookingSchema.safeParse({ bookingId: "bk_1", refundAmount: 150 })
    expect(result.success).toBe(true)
  })
  it("coerces string refundAmount to number", () => {
    const result = cancelBookingSchema.safeParse({ bookingId: "bk_1", refundAmount: "99.50" })
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.refundAmount).toBe(99.5)
  })
  it("rejects negative refundAmount", () => {
    const result = cancelBookingSchema.safeParse({ bookingId: "bk_1", refundAmount: -10 })
    expect(result.success).toBe(false)
  })
  it("rejects missing bookingId", () => {
    const result = cancelBookingSchema.safeParse({ refundAmount: 0 })
    expect(result.success).toBe(false)
  })
})
