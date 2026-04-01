import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

/**
 * Legacy /rooms/[id]/book — finds the room's landlord slug and redirects
 * to /{slug}/rooms/[id]/book preserving query params (checkin, checkout, guests).
 */
export default async function LegacyBookPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const { id } = await params

  const room = await prisma.room.findUnique({
    where: { id },
    select: { landlord: { select: { slug: true } } },
  })

  const slug =
    room?.landlord?.slug ??
    (await prisma.landlord.findFirst({ orderBy: { createdAt: "asc" }, select: { slug: true } }))?.slug

  if (!slug) redirect("/")

  const sp = await searchParams
  const qs = new URLSearchParams()
  for (const [key, val] of Object.entries(sp)) {
    if (typeof val === "string") qs.set(key, val)
    else if (Array.isArray(val)) val.forEach((v) => qs.append(key, v))
  }
  const query = qs.toString()

  redirect(`/${slug}/rooms/${id}/book${query ? `?${query}` : ""}`)
}
