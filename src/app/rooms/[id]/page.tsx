import { notFound } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { AvailabilityCalendarReadonly } from "@/components/guest/availability-calendar-readonly"
import { RoomPhotoGallery } from "@/components/guest/room-photo-gallery"
import { RoomPricingTable } from "@/components/guest/room-pricing-table"
import { Separator } from "@/components/ui/separator"
import { Button } from "@/components/ui/button"
import Link from "next/link"

export const dynamic = "force-dynamic"

export default async function RoomPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ checkin?: string; checkout?: string; guests?: string }>
}) {
  const { id } = await params
  const { checkin, checkout, guests } = await searchParams

  const room = await prisma.room.findUnique({
    where: { id, isActive: true },
    select: {
      id: true,
      name: true,
      description: true,
      location: true,
      baseNightlyRate: true,
      cleaningFee: true,
      extraGuestFee: true,
      baseGuests: true,
      maxGuests: true,
      minStayNights: true,
      maxStayNights: true,
      bookingWindowMonths: true,
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

  // Coerce Decimals at RSC boundary
  const baseNightlyRate = Number(room.baseNightlyRate)
  const cleaningFee = Number(room.cleaningFee)
  const extraGuestFee = Number(room.extraGuestFee)
  const addOns = room.addOns.map((a) => ({ ...a, price: Number(a.price) }))

  const blockedDateStrings = room.blockedDates.map((b) =>
    b.date.toLocaleDateString("en-CA")
  )

  // Build "Request to Book" href with forwarded URL params
  const bookParams = new URLSearchParams()
  if (checkin) bookParams.set("checkin", checkin)
  if (checkout) bookParams.set("checkout", checkout)
  if (guests) bookParams.set("guests", guests)
  const bookHref = `/rooms/${id}/book${bookParams.toString() ? "?" + bookParams.toString() : ""}`

  return (
    <main className="max-w-3xl mx-auto py-8">
      {/* Photo gallery — edge-to-edge on mobile */}
      <div className="-mx-4 sm:mx-0">
        <RoomPhotoGallery photos={room.photos} />
      </div>

      <div className="px-4 sm:px-0">
        {/* Room name */}
        <h1 className="text-2xl font-semibold text-gray-900 mt-6 mb-1">
          {room.name}
        </h1>

        {/* Location */}
        {room.location && (
          <p className="text-sm text-gray-500 mb-4">
            {"\uD83D\uDCCD"} {room.location}
          </p>
        )}

        {/* Description */}
        {room.description && (
          <p className="whitespace-pre-line text-sm text-gray-700 mt-4 mb-6">
            {room.description}
          </p>
        )}

        <Separator className="my-6" />

        {/* Pricing table */}
        <RoomPricingTable
          baseNightlyRate={baseNightlyRate}
          cleaningFee={cleaningFee}
          extraGuestFee={extraGuestFee}
          baseGuests={room.baseGuests}
          addOns={addOns}
          checkin={checkin}
          checkout={checkout}
        />

        <Separator className="my-6" />

        {/* Availability calendar */}
        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-3">
            Availability
          </h2>
          <AvailabilityCalendarReadonly
            blockedDateStrings={blockedDateStrings}
            bookingWindowMonths={room.bookingWindowMonths}
            minStayNights={room.minStayNights}
          />
          <p className="text-xs text-gray-400 mt-2">
            Maximum stay: {room.maxStayNights} nights
          </p>
        </section>

        {/* Request to Book CTA */}
        <Link href={bookHref} className="block w-full mt-6">
          <Button className="w-full">Request to Book</Button>
        </Link>
      </div>
    </main>
  )
}
