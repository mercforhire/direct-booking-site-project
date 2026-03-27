import { describe, it, expect } from "vitest"
import {
  roomAvailabilitySettingsSchema,
  roomAvailabilitySettingsSchemaCoerced,
} from "@/lib/validations/availability"

describe("roomAvailabilitySettingsSchema", () => {
  it("accepts valid data with all three fields", () => {
    const result = roomAvailabilitySettingsSchema.safeParse({
      minStayNights: 1,
      maxStayNights: 30,
      bookingWindowMonths: 3,
    })
    expect(result.success).toBe(true)
  })

  it("rejects bookingWindowMonths below 3", () => {
    const result = roomAvailabilitySettingsSchema.safeParse({
      minStayNights: 1,
      maxStayNights: 30,
      bookingWindowMonths: 2,
    })
    expect(result.success).toBe(false)
  })

  it("rejects bookingWindowMonths above 9", () => {
    const result = roomAvailabilitySettingsSchema.safeParse({
      minStayNights: 1,
      maxStayNights: 30,
      bookingWindowMonths: 10,
    })
    expect(result.success).toBe(false)
  })

  it("rejects minStayNights below 1", () => {
    const result = roomAvailabilitySettingsSchema.safeParse({
      minStayNights: 0,
      maxStayNights: 30,
      bookingWindowMonths: 3,
    })
    expect(result.success).toBe(false)
  })
})

describe("roomAvailabilitySettingsSchemaCoerced", () => {
  it("coerces string inputs to numbers", () => {
    const result = roomAvailabilitySettingsSchemaCoerced.safeParse({
      minStayNights: "1",
      maxStayNights: "30",
      bookingWindowMonths: "3",
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.minStayNights).toBe(1)
      expect(result.data.maxStayNights).toBe(30)
      expect(result.data.bookingWindowMonths).toBe(3)
    }
  })

  it("coerces string '5' to number 5 for all fields", () => {
    const result = roomAvailabilitySettingsSchemaCoerced.safeParse({
      minStayNights: "5",
      maxStayNights: "5",
      bookingWindowMonths: "5",
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.bookingWindowMonths).toBe(5)
    }
  })
})
