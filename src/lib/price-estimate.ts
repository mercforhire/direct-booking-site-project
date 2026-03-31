import { differenceInDays } from "date-fns"

export type PriceInput = {
  checkin: string | undefined
  checkout: string | undefined
  numGuests: number
  selectedAddOnIds: string[]
  addOns: Array<{ id: string; name: string; price: number }>
  baseNightlyRate: number
  cleaningFee: number
  extraGuestFee: number
  baseGuests: number
  serviceFeePercent: number
  depositAmount: number
  perDayRates?: Record<string, number>
}

export type PriceEstimate = {
  nights: number
  nightlyTotal: number
  cleaningFee: number
  extraGuestTotal: number
  addOnTotal: number
  depositAmount: number
  serviceFee: number
  serviceFeePercent: number
  total: number
}

export function calculatePriceEstimate(input: PriceInput): PriceEstimate | null {
  const {
    checkin,
    checkout,
    numGuests,
    selectedAddOnIds,
    addOns,
    baseNightlyRate,
    cleaningFee,
    extraGuestFee,
    baseGuests,
    serviceFeePercent,
    depositAmount,
  } = input

  if (!checkin || !checkout) return null

  // Parse as noon UTC — both dates shift by the same 12h so differenceInDays is unaffected
  const checkinDate = new Date(checkin + "T12:00:00.000Z")
  const checkoutDate = new Date(checkout + "T12:00:00.000Z")
  const nights = differenceInDays(checkoutDate, checkinDate)

  if (nights <= 0) return null

  let nightlyTotal: number
  if (input.perDayRates) {
    nightlyTotal = 0
    const cursor = new Date(checkinDate)
    while (cursor < checkoutDate) {
      const key = cursor.toISOString().slice(0, 10)
      nightlyTotal += input.perDayRates[key] ?? baseNightlyRate
      cursor.setUTCDate(cursor.getUTCDate() + 1)
    }
  } else {
    nightlyTotal = nights * baseNightlyRate
  }
  const extraGuestTotal = Math.max(0, numGuests - baseGuests) * extraGuestFee * nights

  const addOnTotal = addOns
    .filter((a) => selectedAddOnIds.includes(a.id))
    .reduce((sum, a) => sum + a.price, 0)

  const subtotal = nightlyTotal + cleaningFee + extraGuestTotal + addOnTotal + depositAmount
  const serviceFee = subtotal * (serviceFeePercent / 100)
  const total = subtotal + serviceFee

  return {
    nights,
    nightlyTotal,
    cleaningFee,
    extraGuestTotal,
    addOnTotal,
    depositAmount,
    serviceFee,
    serviceFeePercent,
    total,
  }
}
