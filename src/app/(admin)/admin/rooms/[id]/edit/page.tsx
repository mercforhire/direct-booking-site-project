import { prisma } from "@/lib/prisma"
import { getLandlordIdsForAdmin } from "@/lib/landlord"
import { RoomForm } from "@/components/forms/room-form"
import { IcalSourceManager } from "@/components/admin/ical-source-manager"
import { notFound } from "next/navigation"

export default async function EditRoomPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ landlord?: string }> }) {
  const landlordIds = await getLandlordIdsForAdmin()
  const { id } = await params
  const { landlord: landlordSlug } = await searchParams
  const room = await prisma.room.findUnique({
    where: { id },
    include: {
      addOns: true,
      photos: { orderBy: { position: "asc" } },
      landlord: { select: { slug: true } },
      icalSources: { orderBy: { createdAt: "asc" } },
    },
  })
  if (!room || !landlordIds.includes(room.landlordId)) notFound()
  const roomForClient = {
    ...room,
    baseNightlyRate: Number(room.baseNightlyRate),
    cleaningFee: Number(room.cleaningFee),
    extraGuestFee: Number(room.extraGuestFee),
    addOns: room.addOns.map((a) => ({ ...a, price: Number(a.price) })),
  }
  const serializedIcalSources = room.icalSources.map((s) => ({
    id: s.id,
    url: s.url,
    label: s.label,
    roomId: s.roomId,
    lastSync: s.lastSync?.toISOString() ?? null,
    syncError: s.syncError ?? null,
    createdAt: s.createdAt.toISOString(),
    updatedAt: s.updatedAt.toISOString(),
  }))
  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-semibold text-gray-900 mb-6">Edit Room</h1>
      <RoomForm room={roomForClient} landlordSlug={landlordSlug ?? room.landlord.slug} />
      <div className="mt-8 pt-6 border-t border-gray-200">
        <IcalSourceManager roomId={room.id} initialSources={serializedIcalSources} />
      </div>
    </div>
  )
}
