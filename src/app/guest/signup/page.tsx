import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

/**
 * Legacy /guest/signup — redirects to /{slug}/guest/signup.
 */
export default async function LegacyGuestSignupPage() {
  const landlord = await prisma.landlord.findFirst({
    orderBy: { createdAt: "asc" },
    select: { slug: true },
  })

  redirect(landlord ? `/${landlord.slug}/guest/signup` : "/login")
}
