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
  description: string
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
  basePath?: string
}

export function RoomList({ rooms, basePath = "" }: RoomListProps) {
  const searchParams = useSearchParams()

  const checkin = searchParams.get("checkin") ?? ""
  const checkout = searchParams.get("checkout") ?? ""
  const guests = Number(searchParams.get("guests") ?? "1")

  const datesSet = Boolean(checkin && checkout)

  const roomsWithAvailability = rooms.map((room) => ({
    room,
    isAvailable: isRoomAvailable(room, checkin, checkout, guests),
  }))

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
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "5rem 2rem",
            textAlign: "center",
            gap: "1.25rem",
          }}
        >
          <p style={{ opacity: 0.55, fontSize: "0.95rem", lineHeight: 1.7 }}>
            No rooms available for those dates.
            <br />
            Try different dates or fewer guests.
          </p>
          <button
            type="button"
            onClick={() => { window.location.href = `${basePath}/rooms` }}
            style={{
              border: "1px solid rgba(255,255,255,0.2)",
              color: "rgba(240,235,224,0.65)",
              padding: "0.5rem 1.4rem",
              borderRadius: "9999px",
              fontSize: "0.72rem",
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              background: "transparent",
              cursor: "pointer",
            }}
          >
            Clear Filters
          </button>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          {sorted.map(({ room, isAvailable }) => (
            <RoomTile
              key={room.id}
              room={room}
              isAvailable={isAvailable}
              searchParams={searchParamsStr}
              basePath={basePath}
            />
          ))}
        </div>
      )}
    </div>
  )
}
