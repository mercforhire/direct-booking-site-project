import { describe, it, expect } from "vitest"
import { calculatePriceEstimate, PriceInput } from "@/lib/price-estimate"

const baseInput: PriceInput = {
  checkin: "2025-06-01",
  checkout: "2025-06-04",
  numGuests: 2,
  selectedAddOnIds: [],
  addOns: [
    { id: "addon-1", name: "Late checkout", price: 20 },
    { id: "addon-2", name: "Early checkin", price: 15 },
  ],
  baseNightlyRate: 120,
  cleaningFee: 50,
  extraGuestFee: 10,
  baseGuests: 2,
  serviceFeePercent: 10,
  depositAmount: 100,
}

describe("calculatePriceEstimate", () => {
  it("returns null when checkin is undefined", () => {
    const input = { ...baseInput, checkin: undefined }
    expect(calculatePriceEstimate(input)).toBeNull()
  })

  it("returns null when checkout is undefined", () => {
    const input = { ...baseInput, checkout: undefined }
    expect(calculatePriceEstimate(input)).toBeNull()
  })

  it("returns null when checkout is the same day as checkin (nights = 0)", () => {
    const input = { ...baseInput, checkin: "2025-06-01", checkout: "2025-06-01" }
    expect(calculatePriceEstimate(input)).toBeNull()
  })

  it("returns correct night count for 3-night stay", () => {
    const result = calculatePriceEstimate(baseInput)
    expect(result).not.toBeNull()
    expect(result!.nights).toBe(3)
  })

  it("3 nights @ $120/night — nightlyTotal = $360", () => {
    const result = calculatePriceEstimate(baseInput)
    expect(result!.nightlyTotal).toBe(360)
  })

  it("2 guests, baseGuests=2 — extraGuestTotal = $0", () => {
    const result = calculatePriceEstimate(baseInput)
    expect(result!.extraGuestTotal).toBe(0)
  })

  it("4 guests, baseGuests=2, extraGuestFee=$10, 3 nights — extraGuestTotal = $60", () => {
    const input = { ...baseInput, numGuests: 4 }
    const result = calculatePriceEstimate(input)
    expect(result!.extraGuestTotal).toBe(60)
  })

  it("cleaning fee $50 always included regardless of guest count", () => {
    const result = calculatePriceEstimate(baseInput)
    expect(result!.cleaningFee).toBe(50)
  })

  it("2 add-ons selected ($20 + $15) — addOnTotal = $35", () => {
    const input = { ...baseInput, selectedAddOnIds: ["addon-1", "addon-2"] }
    const result = calculatePriceEstimate(input)
    expect(result!.addOnTotal).toBe(35)
  })

  it("only selected add-on IDs contribute to addOnTotal — unselected are excluded", () => {
    const input = { ...baseInput, selectedAddOnIds: ["addon-1"] }
    const result = calculatePriceEstimate(input)
    expect(result!.addOnTotal).toBe(20)
  })

  it("no add-ons selected — addOnTotal = $0", () => {
    const result = calculatePriceEstimate(baseInput)
    expect(result!.addOnTotal).toBe(0)
  })

  it("deposit $100 passed through to result", () => {
    const result = calculatePriceEstimate(baseInput)
    expect(result!.depositAmount).toBe(100)
  })

  it("service fee 10% on subtotal (nightlyTotal + cleaningFee + extraGuestTotal + addOnTotal + depositAmount)", () => {
    // subtotal = 360 + 50 + 0 + 0 + 100 = 510
    // serviceFee = 510 * 0.10 = 51
    const result = calculatePriceEstimate(baseInput)
    expect(result!.serviceFee).toBe(51)
  })

  it("total = subtotal + serviceFee", () => {
    // subtotal = 510, serviceFee = 51, total = 561
    const result = calculatePriceEstimate(baseInput)
    expect(result!.total).toBe(561)
  })

  it("serviceFeePercent passed through for display", () => {
    const result = calculatePriceEstimate(baseInput)
    expect(result!.serviceFeePercent).toBe(10)
  })

  it("service fee 10% on subtotal of $420 when extraGuestFee adds $10 deposit — serviceFee=$42, total=$462 (from plan spec)", () => {
    // plan spec example: subtotal of $420 ($360 + $50 + $10 deposit) → serviceFee=$42, total=$462
    // Note: plan says "$10 deposit" suggesting a $10 deposit variant
    const input: PriceInput = {
      ...baseInput,
      depositAmount: 10,
      numGuests: 2, // no extra guest fees
      selectedAddOnIds: [],
    }
    // subtotal = 360 + 50 + 0 + 0 + 10 = 420
    // serviceFee = 420 * 0.10 = 42
    // total = 420 + 42 = 462
    const result = calculatePriceEstimate(input)
    expect(result!.serviceFee).toBe(42)
    expect(result!.total).toBe(462)
  })
})
