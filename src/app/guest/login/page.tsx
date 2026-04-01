import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

/**
 * Legacy /guest/login — redirects to /{slug}/guest/login preserving query params.
 */
export default async function LegacyGuestLoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const landlord = await prisma.landlord.findFirst({
    orderBy: { createdAt: "asc" },
    select: { slug: true },
  })

  const params = await searchParams
  const qs = new URLSearchParams()
  for (const [key, val] of Object.entries(params)) {
    if (typeof val === "string") qs.set(key, val)
    else if (Array.isArray(val)) val.forEach((v) => qs.append(key, v))
  }
  const query = qs.toString()
  const target = landlord ? `/${landlord.slug}/guest/login${query ? `?${query}` : ""}` : "/login"

  redirect(target)
}
