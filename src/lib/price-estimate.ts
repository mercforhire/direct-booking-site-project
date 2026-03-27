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

  // Parse as local midnight to prevent DST / UTC off-by-one issues
  const checkinDate = new Date(checkin + "T00:00:00")
  const checkoutDate = new Date(checkout + "T00:00:00")
  const nights = differenceInDays(checkoutDate, checkinDate)

  if (nights <= 0) return null

  const nightlyTotal = nights * baseNightlyRate
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
