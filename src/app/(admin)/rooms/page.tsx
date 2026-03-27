import { prisma } from "@/lib/prisma"
import { RoomTable } from "@/components/admin/room-table"

export const dynamic = "force-dynamic"

export default async function RoomsPage() {
  const rooms = await prisma.room.findMany({ orderBy: { createdAt: "desc" } })
  const roomsForClient = rooms.map((r) => ({
    ...r,
    baseNightlyRate: Number(r.baseNightlyRate),
    cleaningFee: Number(r.cleaningFee),
    extraGuestFee: Number(r.extraGuestFee),
  }))
  return <RoomTable rooms={roomsForClient} />
}
