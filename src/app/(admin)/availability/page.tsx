export const dynamic = "force-dynamic"

import { prisma } from "@/lib/prisma"
import { requireLandlordForAdmin } from "@/lib/landlord"
import { AvailabilityDashboard } from "@/components/admin/availability-dashboard"

interface AvailabilityPageProps {
  searchParams: Promise<{ roomId?: string }>
}

export default async function AvailabilityPage({
  searchParams,
}: AvailabilityPageProps) {
  const { roomId } = await searchParams

  const landlord = await requireLandlordForAdmin()
  const rooms = await prisma.room.findMany({
    where: { isActive: true, landlordId: landlord.id },
    orderBy: { name: "asc" },
  })

  const selectedRoom =
    rooms.find((r) => r.id === roomId) ?? rooms[0] ?? null

  const blockedDateStrings: string[] = selectedRoom
    ? (
        await prisma.blockedDate.findMany({
          where: { roomId: selectedRoom.id },
          select: { date: true },
        })
      ).map((b) => b.date.toISOString().slice(0, 10))
    : []

  // Query price overrides for the selected room
  const rawPriceOverrides = selectedRoom
    ? await prisma.datePriceOverride.findMany({
        where: { roomId: selectedRoom.id },
        select: { date: true, price: true },
      })
    : []

  const priceOverrideMap: Record<string, number> = {}
  for (const o of rawPriceOverrides) {
    priceOverrideMap[o.date.toISOString().slice(0, 10)] = Number(o.price)
  }

  // Serialize baseNightlyRate to number (Decimal cannot cross RSC boundary)
  const baseNightlyRate = selectedRoom ? Number(selectedRoom.baseNightlyRate) : 0

  const roomsForClient = rooms.map((r) => ({ id: r.id, name: r.name }))

  const selectedRoomForClient = selectedRoom
    ? {
        id: selectedRoom.id,
        name: selectedRoom.name,
        minStayNights: selectedRoom.minStayNights,
        maxStayNights: selectedRoom.maxStayNights,
        bookingWindowMonths: selectedRoom.bookingWindowMonths,
      }
    : null

  return (
    <div>
      <h1 className="text-2xl font-semibold text-gray-900">Availability</h1>
      <p className="mt-1 text-sm text-gray-500">
        Manage blocked dates and stay requirements per room.
      </p>
      <div className="mt-6">
        <AvailabilityDashboard
          rooms={roomsForClient}
          selectedRoom={selectedRoomForClient}
          blockedDateStrings={blockedDateStrings}
          priceOverrideMap={priceOverrideMap}
          baseNightlyRate={baseNightlyRate}
        />
      </div>
    </div>
  )
}
