import { createClient } from "@/lib/supabase/server"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"

/**
 * Verify the current user is an admin (has at least one landlord linked to them).
 * Returns the Supabase user or throws.
 */
async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) throw new Error("Unauthorized")

  const linked = await prisma.landlord.findFirst({
    where: { adminUserId: user.id },
    select: { id: true },
  })
  if (!linked) throw new Error("Unauthorized — not an admin user")

  return user
}

/**
 * For server actions — throws on failure (action returns error).
 * Returns the first Landlord row (all admins share access to all properties).
 * If landlordId is provided, verifies it exists.
 */
export async function getLandlordForAdmin(landlordId?: string) {
  await requireAdmin()

  if (landlordId) {
    const landlord = await prisma.landlord.findFirst({
      where: { id: landlordId },
    })
    if (!landlord) throw new Error("Landlord not found")
    return landlord
  }

  const landlord = await prisma.landlord.findFirst()
  if (!landlord) throw new Error("No landlord found")

  return landlord
}

/**
 * For RSC pages — redirects on failure instead of throwing.
 * Returns all Landlord rows (all admins share access to all properties).
 */
export async function requireLandlordsForAdmin() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) redirect("/login")

  // Verify user is an admin (linked to at least one landlord)
  const linked = await prisma.landlord.findFirst({
    where: { adminUserId: user.id },
    select: { id: true },
  })
  if (!linked) redirect("/login?error=no_landlord")

  const landlords = await prisma.landlord.findMany({
    orderBy: { createdAt: "asc" },
  })

  return landlords
}

/**
 * For RSC property-scoped pages — resolves selected landlord from ?landlord slug.
 * Returns { landlords, selected } where selected falls back to first landlord if slug missing/invalid.
 */
export async function requireLandlordsWithSelected(landlordSlug?: string) {
  const landlords = await requireLandlordsForAdmin()
  const selected = (landlordSlug
    ? landlords.find((l) => l.slug === landlordSlug)
    : null) ?? landlords[0]
  return { landlords, selected }
}

/**
 * For RSC pages — redirects on failure instead of throwing.
 * Returns the first Landlord row.
 * @deprecated Use requireLandlordsForAdmin() for multi-landlord support.
 */
export async function requireLandlordForAdmin() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) redirect("/login")

  // Verify user is an admin
  const linked = await prisma.landlord.findFirst({
    where: { adminUserId: user.id },
    select: { id: true },
  })
  if (!linked) redirect("/login?error=no_landlord")

  const landlord = await prisma.landlord.findFirst()
  if (!landlord) redirect("/login?error=no_landlord")

  return landlord
}

/**
 * For server actions — throws on failure.
 * Returns all landlord IDs (all admins share access). Used for ownership guards.
 */
export async function getLandlordIdsForAdmin(): Promise<string[]> {
  await requireAdmin()

  const landlords = await prisma.landlord.findMany({
    select: { id: true },
  })
  if (landlords.length === 0) throw new Error("No landlords found")

  return landlords.map((l) => l.id)
}

/**
 * For guest-facing pages — returns null if slug doesn't match any landlord.
 * Caller should use notFound() if null.
 */
export async function getLandlordBySlug(slug: string) {
  return prisma.landlord.findUnique({ where: { slug } })
}

/**
 * Returns deduplicated email addresses of all admin landlords.
 * Used to notify all property managers about booking events.
 */
export async function getAllAdminEmails(): Promise<string[]> {
  const landlords = await prisma.landlord.findMany({
    select: { email: true },
  })
  const emails = [...new Set(landlords.map((l) => l.email).filter(Boolean))]
  return emails
}
