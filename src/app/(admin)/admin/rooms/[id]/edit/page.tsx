import { prisma } from "@/lib/prisma"
import { requireLandlordForAdmin } from "@/lib/landlord"
import { RoomForm } from "@/components/forms/room-form"
import { notFound } from "next/navigation"

export default async function EditRoomPage({ params }: { params: Promise<{ id: string }> }) {
  const landlord = await requireLandlordForAdmin()
  const { id } = await params
  const room = await prisma.room.findUnique({
    where: { id },
    include: { addOns: true, photos: { orderBy: { position: "asc" } } },
  })
  if (!room || room.landlordId !== landlord.id) notFound()
  const roomForClient = {
    ...room,
    baseNightlyRate: Number(room.baseNightlyRate),
    cleaningFee: Number(room.cleaningFee),
    extraGuestFee: Number(room.extraGuestFee),
    addOns: room.addOns.map((a) => ({ ...a, price: Number(a.price) })),
  }
  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-semibold text-gray-900 mb-6">Edit Room</h1>
      <RoomForm room={roomForClient} />
    </div>
  )
}
