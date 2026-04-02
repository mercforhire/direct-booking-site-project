import { prisma } from "@/lib/prisma"
import { requireLandlordsWithSelected } from "@/lib/landlord"
import { RoomTable } from "@/components/admin/room-table"

export const dynamic = "force-dynamic"

interface RoomsPageProps {
  searchParams: Promise<{ landlord?: string }>
}

export default async function RoomsPage({ searchParams }: RoomsPageProps) {
  const { landlord: landlordSlug } = await searchParams
  const { landlords, selected } = await requireLandlordsWithSelected(landlordSlug)

  const rooms = await prisma.room.findMany({
    where: { landlordId: selected.id },
    orderBy: { createdAt: "desc" },
    include: { photos: { orderBy: { position: "asc" }, take: 1 } },
  })

  const roomsForClient = rooms.map((r) => ({
    ...r,
    baseNightlyRate: Number(r.baseNightlyRate),
    cleaningFee: Number(r.cleaningFee),
    extraGuestFee: Number(r.extraGuestFee),
    coverPhoto: r.photos[0]?.url ?? null,
    landlordName: selected.name,
  }))

  return (
    <RoomTable
      rooms={roomsForClient}
      selectedLandlordSlug={selected.slug}
      showPropertyColumn={landlords.length > 1}
    />
  )
}
