import { requireLandlordsWithSelected } from "@/lib/landlord"
import { RoomForm } from "@/components/forms/room-form"

interface NewRoomPageProps {
  searchParams: Promise<{ landlord?: string }>
}

export default async function NewRoomPage({ searchParams }: NewRoomPageProps) {
  const { landlord: landlordSlug } = await searchParams
  const { selected } = await requireLandlordsWithSelected(landlordSlug)

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-semibold text-gray-900 mb-6">New Room</h1>
      <RoomForm landlordId={selected.id} landlordSlug={selected.slug} />
    </div>
  )
}
