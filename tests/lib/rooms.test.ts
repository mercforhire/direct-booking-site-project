import { describe, it, expect } from "vitest"
import { coerceRoomDecimals, coerceAddOnDecimals } from "@/lib/room-formatters"

describe("coerceRoomDecimals", () => {
  it("converts baseNightlyRate, cleaningFee, extraGuestFee from string Decimal representation to number", () => {
    const input = {
      id: "room-1",
      name: "Test Room",
      baseNightlyRate: "150.00",
      cleaningFee: "75.50",
      extraGuestFee: "25.00",
    }
    const result = coerceRoomDecimals(input)
    expect(result.baseNightlyRate).toBe(150)
    expect(result.cleaningFee).toBe(75.5)
    expect(result.extraGuestFee).toBe(25)
  })

  it("preserves other fields unchanged", () => {
    const input = {
      id: "room-1",
      name: "Test Room",
      baseNightlyRate: "150.00",
      cleaningFee: "75.50",
      extraGuestFee: "25.00",
    }
    const result = coerceRoomDecimals(input)
    expect(result.id).toBe("room-1")
    expect(result.name).toBe("Test Room")
  })
})

describe("coerceAddOnDecimals", () => {
  it("converts price from string representation to number", () => {
    const input = {
      id: "addon-1",
      name: "Breakfast",
      price: "20.00",
    }
    const result = coerceAddOnDecimals(input)
    expect(result.price).toBe(20)
  })

  it("coerced values are plain numbers (typeof === 'number'), not Decimal instances", () => {
    const input = {
      id: "room-1",
      name: "Test Room",
      baseNightlyRate: "150.00",
      cleaningFee: "75.50",
      extraGuestFee: "25.00",
    }
    const result = coerceRoomDecimals(input)
    expect(typeof result.baseNightlyRate).toBe("number")
    expect(typeof result.cleaningFee).toBe("number")
    expect(typeof result.extraGuestFee).toBe("number")

    const addonInput = { id: "addon-1", name: "Breakfast", price: "20.00" }
    const addonResult = coerceAddOnDecimals(addonInput)
    expect(typeof addonResult.price).toBe("number")
  })
})
