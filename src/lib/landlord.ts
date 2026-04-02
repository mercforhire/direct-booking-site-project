import { createClient } from "@/lib/supabase/server"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"

/**
 * For server actions — throws on failure (action returns error).
 * Returns the first Landlord row for the currently logged-in admin.
 * If landlordId is provided, verifies the admin owns that landlord.
 */
export async function getLandlordForAdmin(landlordId?: string) {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) throw new Error("Unauthorized")

  if (landlordId) {
    const landlord = await prisma.landlord.findFirst({
      where: { id: landlordId, adminUserId: user.id },
    })
    if (!landlord) throw new Error("Landlord not found or not owned by this admin")
    return landlord
  }

  const landlord = await prisma.landlord.findFirst({
    where: { adminUserId: user.id },
  })
  if (!landlord) throw new Error("No landlord found for this admin user")

  return landlord
}

/**
 * For RSC pages — redirects on failure instead of throwing.
 * Returns all Landlord rows for the currently logged-in admin.
 */
export async function requireLandlordsForAdmin() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) redirect("/login")

  const landlords = await prisma.landlord.findMany({
    where: { adminUserId: user.id },
    orderBy: { createdAt: "asc" },
  })
  if (landlords.length === 0) redirect("/login?error=no_landlord")

  return landlords
}

/**
 * For RSC pages — redirects on failure instead of throwing.
 * Returns the first Landlord row for the currently logged-in admin.
 * @deprecated Use requireLandlordsForAdmin() for multi-landlord support.
 */
export async function requireLandlordForAdmin() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) redirect("/login")

  const landlord = await prisma.landlord.findFirst({
    where: { adminUserId: user.id },
  })
  if (!landlord) redirect("/login?error=no_landlord")

  return landlord
}

/**
 * For server actions — throws on failure.
 * Returns all landlord IDs for the admin. Used for ownership guards.
 */
export async function getLandlordIdsForAdmin(): Promise<string[]> {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) throw new Error("Unauthorized")

  const landlords = await prisma.landlord.findMany({
    where: { adminUserId: user.id },
    select: { id: true },
  })
  if (landlords.length === 0) throw new Error("No landlords found for this admin user")

  return landlords.map((l) => l.id)
}

/**
 * For guest-facing pages — returns null if slug doesn't match any landlord.
 * Caller should use notFound() if null.
 */
export async function getLandlordBySlug(slug: string) {
  return prisma.landlord.findUnique({ where: { slug } })
}
