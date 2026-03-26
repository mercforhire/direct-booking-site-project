import { prisma } from "@/lib/prisma"
import { RoomTable } from "@/components/admin/room-table"

export const dynamic = "force-dynamic"

export default async function RoomsPage() {
  const rooms = await prisma.room.findMany({ orderBy: { createdAt: "desc" } })
  return <RoomTable rooms={rooms} />
}
