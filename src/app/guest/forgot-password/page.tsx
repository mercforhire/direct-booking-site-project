import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

/**
 * Legacy /guest/forgot-password — redirects to /{slug}/guest/forgot-password.
 */
export default async function LegacyGuestForgotPasswordPage() {
  const landlord = await prisma.landlord.findFirst({
    orderBy: { createdAt: "asc" },
    select: { slug: true },
  })

  redirect(landlord ? `/${landlord.slug}/guest/forgot-password` : "/login")
}
