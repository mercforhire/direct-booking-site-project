"use client"

import { useSearchParams } from "next/navigation"
import { isRoomAvailable } from "@/lib/availability-filter"
import { RoomListFilter } from "@/components/guest/room-list-filter"
import { RoomTile } from "@/components/guest/room-tile"

interface RoomPhoto {
  url: string
  position: number
}

interface Room {
  id: string
  name: string
  location: string
  baseNightlyRate: number
  cleaningFee: number
  extraGuestFee: number
  baseGuests: number
  maxGuests: number
  bookingWindowMonths: number
  photos: RoomPhoto[]
  blockedDateStrings: string[]
}

interface RoomListProps {
  rooms: Room[]
}

export function RoomList({ rooms }: RoomListProps) {
  const searchParams = useSearchParams()

  const checkin = searchParams.get("checkin") ?? ""
  const checkout = searchParams.get("checkout") ?? ""
  const guests = Number(searchParams.get("guests") ?? "1")

  const datesSet = Boolean(checkin && checkout)

  // Determine availability for each room
  const roomsWithAvailability = rooms.map((room) => ({
    room,
    isAvailable: isRoomAvailable(room, checkin, checkout, guests),
  }))

  // Sort: available first, unavailable second (stable within each group)
  const sorted = [
    ...roomsWithAvailability.filter((r) => r.isAvailable),
    ...roomsWithAvailability.filter((r) => !r.isAvailable),
  ]

  const allUnavailable =
    datesSet && roomsWithAvailability.every((r) => !r.isAvailable)

  const searchParamsStr = searchParams.toString()

  return (
    <div>
      <RoomListFilter />

      {allUnavailable ? (
        <div className="flex flex-col items-center justify-center py-16 text-center gap-4">
          <p className="text-gray-600 text-base">
            No rooms available for those dates. Try different dates or fewer
            guests.
          </p>
          <button
            type="button"
            onClick={() => {
              // Clear filter by navigating without params
              window.location.href = "/rooms"
            }}
            className="text-sm text-blue-600 underline hover:text-blue-800"
          >
            Clear filters
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {sorted.map(({ room, isAvailable }) => (
            <RoomTile
              key={room.id}
              room={room}
              isAvailable={isAvailable}
              searchParams={searchParamsStr}
            />
          ))}
        </div>
      )}
    </div>
  )
}
