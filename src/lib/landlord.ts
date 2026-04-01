import { createClient } from "@/lib/supabase/server"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"

/**
 * For server actions — throws on failure (action returns error).
 * Returns the full Landlord row for the currently logged-in admin.
 */
export async function getLandlordForAdmin() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) throw new Error("Unauthorized")

  const landlord = await prisma.landlord.findUnique({
    where: { adminUserId: user.id },
  })
  if (!landlord) throw new Error("No landlord found for this admin user")

  return landlord
}

/**
 * For RSC pages — redirects on failure instead of throwing.
 * Returns the full Landlord row for the currently logged-in admin.
 */
export async function requireLandlordForAdmin() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) redirect("/login")

  const landlord = await prisma.landlord.findUnique({
    where: { adminUserId: user.id },
  })
  if (!landlord) redirect("/login?error=no_landlord")

  return landlord
}

/**
 * For guest-facing pages — returns null if slug doesn't match any landlord.
 * Caller should use notFound() if null.
 */
export async function getLandlordBySlug(slug: string) {
  return prisma.landlord.findUnique({ where: { slug } })
}
