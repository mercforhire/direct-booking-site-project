import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { prisma } from "@/lib/prisma"

/**
 * Legacy /auth/confirm — exchanges the code then redirects to the
 * tenant-scoped destination. Kept for backward compatibility with
 * confirmation emails sent before multi-tenant migration.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get("code")
  const type = searchParams.get("type")

  // Resolve default landlord slug for tenant-scoped redirects
  const landlord = await prisma.landlord.findFirst({
    orderBy: { createdAt: "asc" },
    select: { slug: true },
  })
  const slug = landlord?.slug ?? "highhill"

  const explicitNext = searchParams.get("next")

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      // If caller specified a destination, use it
      if (explicitNext) {
        return NextResponse.redirect(new URL(explicitNext, request.url))
      }

      // Otherwise detect admin vs guest and redirect appropriately
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (user) {
        const isAdmin = await prisma.landlord.findFirst({
          where: { adminUserId: user.id },
          select: { id: true },
        })
        if (isAdmin) {
          return NextResponse.redirect(new URL("/dashboard", request.url))
        }
      }

      // Guest fallback
      const guestNext =
        type === "recovery"
          ? `/${slug}/guest/reset-password`
          : `/${slug}/my-bookings`
      return NextResponse.redirect(new URL(guestNext, request.url))
    }
  }

  return NextResponse.redirect(
    new URL(`/${slug}/guest/login?error=invalid_token`, request.url)
  )
}
