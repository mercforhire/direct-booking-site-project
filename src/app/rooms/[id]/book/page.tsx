import { notFound } from "next/navigation"
import Image from "next/image"
import { prisma } from "@/lib/prisma"
import { BookingForm } from "@/components/guest/booking-form"

export const dynamic = "force-dynamic"

export default async function BookPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{
    checkin?: string
    checkout?: string
    guests?: string
  }>
}) {
  const { id } = await params
  const { checkin, checkout, guests } = await searchParams

  const room = await prisma.room.findUnique({
    where: { id, isActive: true },
    select: {
      id: true,
      name: true,
      location: true,
      baseNightlyRate: true,
      cleaningFee: true,
      extraGuestFee: true,
      baseGuests: true,
      maxGuests: true,
      bookingWindowMonths: true,
      minStayNights: true,
      maxStayNights: true,
      photos: {
        select: { url: true, position: true },
        orderBy: { position: "asc" },
      },
      addOns: {
        select: { id: true, name: true, price: true },
      },
      blockedDates: {
        select: { date: true },
      },
    },
  })

  if (!room) notFound()

  const settings = await prisma.settings.findUnique({ where: { id: "global" } })

  if (!settings) notFound()

  // Coerce Decimal fields at RSC boundary — Prisma Decimal is not serializable as props
  const baseNightlyRate = Number(room.baseNightlyRate)
  const cleaningFee = Number(room.cleaningFee)
  const extraGuestFee = Number(room.extraGuestFee)
  const addOns = room.addOns.map((a) => ({ ...a, price: Number(a.price) }))
  const serviceFeePercent = Number(settings.serviceFeePercent)
  const depositAmount = Number(settings.depositAmount)

  // Convert blocked Date objects to YYYY-MM-DD strings via ISO — works for both legacy midnight-UTC and noon-UTC rows
  const blockedDateStrings = room.blockedDates.map((b) =>
    b.date.toISOString().slice(0, 10)
  )

  // Fetch all price overrides for this room (covers any date the guest may select)
  const rawPriceOverrides = await prisma.datePriceOverride.findMany({
    where: { roomId: room.id },
    select: { date: true, price: true },
  })
  const perDayRates: Record<string, number> = {}
  for (const o of rawPriceOverrides) {
    perDayRates[o.date.toISOString().slice(0, 10)] = Number(o.price)
  }

  const coverPhoto = room.photos[0]?.url ?? null

  return (
    <main className="max-w-4xl mx-auto py-8 px-4">
      {/* Compact room summary */}
      <div className="flex items-center gap-4 mb-8">
        {coverPhoto ? (
          <Image
            src={coverPhoto}
            alt={room.name}
            width={80}
            height={80}
            className="rounded-lg object-cover w-20 h-20 flex-shrink-0"
          />
        ) : (
          <div className="w-20 h-20 rounded-lg bg-gray-100 flex-shrink-0" />
        )}
        <div>
          <h1 className="text-xl font-semibold text-gray-900">{room.name}</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            ${baseNightlyRate.toFixed(2)}/night
          </p>
        </div>
      </div>

      <BookingForm
        room={{
          id: room.id,
          name: room.name,
          baseNightlyRate,
          cleaningFee,
          extraGuestFee,
          baseGuests: room.baseGuests,
          maxGuests: room.maxGuests,
          bookingWindowMonths: room.bookingWindowMonths,
          minStayNights: room.minStayNights,
          maxStayNights: room.maxStayNights,
          addOns,
        }}
        settings={{ serviceFeePercent, depositAmount }}
        blockedDateStrings={blockedDateStrings}
        perDayRates={perDayRates}
        defaultCheckin={checkin}
        defaultCheckout={checkout}
        defaultGuests={guests ? parseInt(guests, 10) : 1}
      />
    </main>
  )
}
