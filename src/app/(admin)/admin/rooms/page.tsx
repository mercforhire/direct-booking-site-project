import { prisma } from "@/lib/prisma"
import { RoomTable } from "@/components/admin/room-table"

export const dynamic = "force-dynamic"

export default async function RoomsPage() {
  const rooms = await prisma.room.findMany({
    orderBy: { createdAt: "desc" },
    include: { photos: { orderBy: { position: "asc" }, take: 1 } },
  })
  const roomsForClient = rooms.map((r) => ({
    ...r,
    baseNightlyRate: Number(r.baseNightlyRate),
    cleaningFee: Number(r.cleaningFee),
    extraGuestFee: Number(r.extraGuestFee),
    coverPhoto: r.photos[0]?.url ?? null,
  }))
  return <RoomTable rooms={roomsForClient} />
}
