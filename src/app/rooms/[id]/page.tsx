import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

/**
 * Legacy /rooms/[id] — finds the room's landlord slug and redirects to /{slug}/rooms/[id].
 */
export default async function LegacyRoomDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  // Try to find the room's landlord for a precise redirect
  const room = await prisma.room.findUnique({
    where: { id },
    select: { landlord: { select: { slug: true } } },
  })

  if (room?.landlord) {
    redirect(`/${room.landlord.slug}/rooms/${id}`)
  }

  // Fallback: default landlord
  const landlord = await prisma.landlord.findFirst({
    orderBy: { createdAt: "asc" },
    select: { slug: true },
  })

  redirect(landlord ? `/${landlord.slug}/rooms/${id}` : "/")
}
