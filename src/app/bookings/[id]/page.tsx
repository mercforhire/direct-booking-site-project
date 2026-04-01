import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

/**
 * Legacy /bookings/[id] — finds the booking's landlord slug and redirects
 * to /{slug}/bookings/[id]. Preserves query params for Stripe return URLs.
 */
export default async function LegacyBookingDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const { id } = await params

  // Resolve landlord slug via booking → room → landlord
  const booking = await prisma.booking.findUnique({
    where: { id },
    select: { room: { select: { landlord: { select: { slug: true } } } } },
  })

  const slug =
    booking?.room?.landlord?.slug ??
    (await prisma.landlord.findFirst({ orderBy: { createdAt: "asc" }, select: { slug: true } }))?.slug

  if (!slug) redirect("/")

  // Preserve query params (session_id from Stripe, etc.)
  const sp = await searchParams
  const qs = new URLSearchParams()
  for (const [key, val] of Object.entries(sp)) {
    if (typeof val === "string") qs.set(key, val)
    else if (Array.isArray(val)) val.forEach((v) => qs.append(key, v))
  }
  const query = qs.toString()

  redirect(`/${slug}/bookings/${id}${query ? `?${query}` : ""}`)
}
