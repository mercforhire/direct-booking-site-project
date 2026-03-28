import { describe, it, expect } from "vitest"
import { markAsPaidSchema } from "../payment"

describe("markAsPaidSchema", () => {
  it("accepts a valid bookingId", () => {
    const result = markAsPaidSchema.parse({ bookingId: "cm9abc" })
    expect(result).toEqual({ bookingId: "cm9abc" })
  })

  it("rejects empty bookingId", () => {
    const result = markAsPaidSchema.safeParse({ bookingId: "" })
    expect(result.success).toBe(false)
  })
})
