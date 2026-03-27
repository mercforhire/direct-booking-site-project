import { notFound } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { AvailabilityCalendarReadonly } from "@/components/guest/availability-calendar-readonly"

export const dynamic = "force-dynamic"

export default async function RoomPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const room = await prisma.room.findUnique({
    where: { id, isActive: true },
    select: {
      id: true,
      name: true,
      minStayNights: true,
      maxStayNights: true,
      bookingWindowMonths: true,
    },
  })

  if (!room) notFound()

  const rawBlocked = await prisma.blockedDate.findMany({
    where: { roomId: id },
    select: { date: true },
    orderBy: { date: "asc" },
  })
  const blockedDateStrings = rawBlocked.map((b) =>
    b.date.toISOString().slice(0, 10)
  )

  return (
    <main className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-semibold text-gray-900 mb-2">
        {room.name}
      </h1>
      <p className="text-sm text-gray-500 mb-6">
        Availability — check dates before submitting a booking request.
      </p>
      <AvailabilityCalendarReadonly
        blockedDateStrings={blockedDateStrings}
        bookingWindowMonths={room.bookingWindowMonths}
        minStayNights={room.minStayNights}
      />
      <p className="text-xs text-gray-400 mt-6">
        Maximum stay: {room.maxStayNights} nights
      </p>
    </main>
  )
}
