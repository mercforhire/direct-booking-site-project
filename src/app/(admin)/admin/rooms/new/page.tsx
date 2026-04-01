import { requireLandlordForAdmin } from "@/lib/landlord"
import { RoomForm } from "@/components/forms/room-form"

export default async function NewRoomPage() {
  await requireLandlordForAdmin()

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-semibold text-gray-900 mb-6">New Room</h1>
      <RoomForm />
    </div>
  )
}
