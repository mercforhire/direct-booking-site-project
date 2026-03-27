import { Suspense } from "react"
import { prisma } from "@/lib/prisma"
import { coerceRoomDecimals } from "@/lib/room-formatters"
import { RoomList } from "@/components/guest/room-list"

export const dynamic = "force-dynamic"

function RoomListSkeleton() {
  return (
    <div className="space-y-4 mt-6">
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="h-32 w-full rounded-lg bg-gray-200 animate-pulse"
        />
      ))}
    </div>
  )
}

export default async function RoomsPage() {
  const rooms = await prisma.room.findMany({
    where: { isActive: true },
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
      photos: {
        select: { url: true, position: true },
        orderBy: { position: "asc" },
        take: 1,
      },
      blockedDates: {
        select: { date: true },
      },
    },
  })

  const roomsForClient = rooms.map((room) => ({
    ...coerceRoomDecimals(room),
    blockedDateStrings: room.blockedDates.map((b) =>
      b.date.toLocaleDateString("en-CA")
    ),
  }))

  return (
    <main className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-semibold text-gray-900 mb-6">Rooms</h1>
      <Suspense fallback={<RoomListSkeleton />}>
        <RoomList rooms={roomsForClient} />
      </Suspense>
    </main>
  )
}
