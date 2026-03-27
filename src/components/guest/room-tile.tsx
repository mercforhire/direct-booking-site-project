"use client"

import Link from "next/link"
import Image from "next/image"
import { Home } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

interface RoomTilePhoto {
  url: string
  position: number
}

interface RoomTileRoom {
  id: string
  name: string
  location: string
  baseNightlyRate: number
  maxGuests: number
  photos: RoomTilePhoto[]
  blockedDateStrings: string[]
}

interface RoomTileProps {
  room: RoomTileRoom
  isAvailable: boolean
  searchParams: string
}

export function RoomTile({ room, isAvailable, searchParams }: RoomTileProps) {
  const href = `/rooms/${room.id}${searchParams ? `?${searchParams}` : ""}`
  const coverPhoto = room.photos[0]

  return (
    <Link href={href}>
      <Card
        className={`flex flex-row overflow-hidden hover:shadow-md transition-shadow cursor-pointer${
          !isAvailable ? " opacity-50" : ""
        }`}
      >
        {/* Photo / Placeholder */}
        <div className="relative w-48 h-32 flex-shrink-0 bg-gray-100">
          {coverPhoto ? (
            <Image
              src={coverPhoto.url}
              alt={room.name}
              fill
              className="object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-400">
              <Home className="w-10 h-10" />
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex flex-col justify-center px-4 py-3 gap-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-gray-900 text-base">
              {room.name}
            </span>
            {!isAvailable && (
              <Badge variant="secondary" className="text-xs">
                Unavailable for these dates
              </Badge>
            )}
          </div>
          <p className="text-sm text-gray-600">
            ${room.baseNightlyRate.toFixed(2)} / night
          </p>
          <p className="text-sm text-gray-500">Up to {room.maxGuests} guests</p>
          {room.location && (
            <p className="text-xs text-gray-400">{room.location}</p>
          )}
        </div>
      </Card>
    </Link>
  )
}
