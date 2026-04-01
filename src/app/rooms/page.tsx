import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

/**
 * Legacy /rooms — redirects to /{slug}/rooms.
 */
export default async function LegacyRoomsPage() {
  const landlord = await prisma.landlord.findFirst({
    orderBy: { createdAt: "asc" },
    select: { slug: true },
  })

  redirect(landlord ? `/${landlord.slug}/rooms` : "/")
}
