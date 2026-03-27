/**
 * Coercion helpers for Prisma Decimal → Number at the RSC boundary.
 *
 * Prisma Decimal objects cannot be serialized as Client Component props.
 * These thin wrappers centralize the Number() conversion pattern.
 */

export function coerceRoomDecimals<
  T extends {
    baseNightlyRate: unknown
    cleaningFee: unknown
    extraGuestFee: unknown
    [key: string]: unknown
  },
>(r: T): Omit<T, "baseNightlyRate" | "cleaningFee" | "extraGuestFee"> & {
  baseNightlyRate: number
  cleaningFee: number
  extraGuestFee: number
} {
  return {
    ...r,
    baseNightlyRate: Number(r.baseNightlyRate),
    cleaningFee: Number(r.cleaningFee),
    extraGuestFee: Number(r.extraGuestFee),
  }
}

export function coerceAddOnDecimals<
  T extends { price: unknown; [key: string]: unknown },
>(a: T): Omit<T, "price"> & { price: number } {
  return {
    ...a,
    price: Number(a.price),
  }
}
