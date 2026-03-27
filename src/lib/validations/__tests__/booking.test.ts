import { describe, it, expect } from "vitest"
import {
  bookingSchema,
  bookingSchemaCoerced,
  type BookingFormValues,
} from "../booking"

const validBookingInput = {
  roomId: "clxabc123",
  checkin: "2026-04-01",
  checkout: "2026-04-05",
  numGuests: 2,
  selectedAddOnIds: ["addon-1"],
  noteToLandlord: "Late check-in please",
  guestName: "Jane Guest",
  guestEmail: "jane@example.com",
  guestPhone: "+1 555-123-4567",
  estimatedTotal: 320.0,
  createAccount: false,
  password: undefined,
}

describe("bookingSchema", () => {
  it("parses a valid booking object", () => {
    const result = bookingSchema.safeParse(validBookingInput)
    expect(result.success).toBe(true)
  })

  it("uses z.number() for numGuests (not coerce)", () => {
    // string input should fail for plain schema
    const result = bookingSchema.safeParse({
      ...validBookingInput,
      numGuests: "2",
    })
    expect(result.success).toBe(false)
  })

  it("uses z.number() for estimatedTotal (not coerce)", () => {
    const result = bookingSchema.safeParse({
      ...validBookingInput,
      estimatedTotal: "320",
    })
    expect(result.success).toBe(false)
  })

  it("defaults selectedAddOnIds to [] when omitted", () => {
    const { selectedAddOnIds, ...rest } = validBookingInput
    const result = bookingSchema.safeParse(rest)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.selectedAddOnIds).toEqual([])
    }
  })

  it("defaults createAccount to false when omitted", () => {
    const { createAccount, ...rest } = validBookingInput
    const result = bookingSchema.safeParse(rest)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.createAccount).toBe(false)
    }
  })

  it("password is optional", () => {
    const result = bookingSchema.safeParse({ ...validBookingInput, password: undefined })
    expect(result.success).toBe(true)
  })

  it("requires valid email format", () => {
    const result = bookingSchema.safeParse({ ...validBookingInput, guestEmail: "not-an-email" })
    expect(result.success).toBe(false)
  })

  it("requires at least 1 guest", () => {
    const result = bookingSchema.safeParse({ ...validBookingInput, numGuests: 0 })
    expect(result.success).toBe(false)
  })

  it("rejects negative estimatedTotal", () => {
    const result = bookingSchema.safeParse({ ...validBookingInput, estimatedTotal: -1 })
    expect(result.success).toBe(false)
  })

  it("exports BookingFormValues type (compile-time check)", () => {
    const values: BookingFormValues = bookingSchema.parse(validBookingInput)
    expect(values.roomId).toBe("clxabc123")
  })
})

describe("bookingSchemaCoerced", () => {
  it("parses a valid booking object", () => {
    const result = bookingSchemaCoerced.safeParse(validBookingInput)
    expect(result.success).toBe(true)
  })

  it("coerces string numGuests to number", () => {
    const result = bookingSchemaCoerced.safeParse({
      ...validBookingInput,
      numGuests: "3",
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.numGuests).toBe(3)
    }
  })

  it("coerces string estimatedTotal to number", () => {
    const result = bookingSchemaCoerced.safeParse({
      ...validBookingInput,
      estimatedTotal: "320.00",
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.estimatedTotal).toBe(320)
    }
  })

  it("defaults selectedAddOnIds to [] when omitted", () => {
    const { selectedAddOnIds, ...rest } = validBookingInput
    const result = bookingSchemaCoerced.safeParse(rest)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.selectedAddOnIds).toEqual([])
    }
  })

  it("defaults createAccount to false when omitted", () => {
    const { createAccount, ...rest } = validBookingInput
    const result = bookingSchemaCoerced.safeParse(rest)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.createAccount).toBe(false)
    }
  })

  it("requires at least 1 guest after coercion", () => {
    const result = bookingSchemaCoerced.safeParse({ ...validBookingInput, numGuests: "0" })
    expect(result.success).toBe(false)
  })

  it("rejects invalid email format", () => {
    const result = bookingSchemaCoerced.safeParse({ ...validBookingInput, guestEmail: "bad" })
    expect(result.success).toBe(false)
  })
})
