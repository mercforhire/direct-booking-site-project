"use client"

import Link from "next/link"
import Image from "next/image"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

interface RoomRow {
  id: string
  name: string
  location: string
  baseNightlyRate: number
  isActive: boolean
  coverPhoto: string | null
}

interface RoomTableProps {
  rooms: RoomRow[]
}

export function RoomTable({ rooms }: RoomTableProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900">Rooms</h1>
        <Button asChild>
          <Link href="/admin/rooms/new">New Room</Link>
        </Button>
      </div>
      <div className="rounded-md border bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[64px]"></TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Base Rate</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[80px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rooms.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                  No rooms yet. Create your first room.
                </TableCell>
              </TableRow>
            )}
            {rooms.map((room) => (
              <TableRow key={room.id}>
                <TableCell className="p-2">
                  {room.coverPhoto ? (
                    <Image
                      src={room.coverPhoto}
                      alt={room.name}
                      width={56}
                      height={48}
                      className="rounded object-cover w-14 h-12"
                    />
                  ) : (
                    <div className="w-14 h-12 rounded bg-gray-100 flex items-center justify-center text-gray-300 text-xs">
                      No photo
                    </div>
                  )}
                </TableCell>
                <TableCell className="font-medium">{room.name}</TableCell>
                <TableCell>{room.location}</TableCell>
                <TableCell>${Number(room.baseNightlyRate).toFixed(2)}/night</TableCell>
                <TableCell>
                  <Badge variant={room.isActive ? "default" : "secondary"}>
                    {room.isActive ? "Active" : "Inactive"}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Button variant="ghost" size="sm" asChild>
                    <Link href={`/admin/rooms/${room.id}/edit`}>Edit</Link>
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
