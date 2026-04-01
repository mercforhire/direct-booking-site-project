import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ landlord: string }> }
) {
  const { landlord: slug } = await params
  const { searchParams } = new URL(request.url)
  const code = searchParams.get("code")
  const type = searchParams.get("type")
  const next =
    searchParams.get("next") ??
    (type === "recovery"
      ? `/${slug}/guest/reset-password`
      : `/${slug}/my-bookings`)

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return NextResponse.redirect(new URL(next, request.url))
    }
  }

  // Token invalid, expired, or missing — redirect to tenant login with error param
  return NextResponse.redirect(
    new URL(`/${slug}/guest/login?error=invalid_token`, request.url)
  )
}
