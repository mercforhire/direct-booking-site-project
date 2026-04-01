import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

/**
 * Legacy /my-bookings — redirects to /{slug}/my-bookings.
 */
export default async function LegacyMyBookingsPage() {
  const landlord = await prisma.landlord.findFirst({
    orderBy: { createdAt: "asc" },
    select: { slug: true },
  })

  redirect(landlord ? `/${landlord.slug}/my-bookings` : "/")
}
