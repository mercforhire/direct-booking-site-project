import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          // Must update both request.cookies (for Server Components in this request)
          // AND supabaseResponse.cookies (for the browser to receive the updated cookie)
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // IMPORTANT: Use getUser() NOT getSession()
  // getUser() validates the JWT with the Supabase Auth server on every call
  // getSession() only reads local cookie state and cannot be trusted for protection
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl

  // Admin routes — require authenticated admin user
  const adminPaths = ["/dashboard", "/settings", "/availability", "/admin/rooms", "/admin/bookings"]
  const isAdminRoute = adminPaths.some((p) => pathname.startsWith(p))

  if (!user && isAdminRoute) {
    const url = request.nextUrl.clone()
    url.pathname = "/login"
    return NextResponse.redirect(url)
  }

  // Tenant-scoped guest-authenticated routes: /{slug}/my-bookings, /{slug}/my-booking, /{slug}/bookings/*
  // Pattern: first segment is the landlord slug, second is the protected path
  const segments = pathname.split("/").filter(Boolean)
  if (!user && segments.length >= 2) {
    const guestPath = "/" + segments.slice(1).join("/")
    const protectedGuestPaths = ["/my-bookings", "/my-booking", "/bookings/"]
    const isProtectedGuestRoute = protectedGuestPaths.some((p) => guestPath.startsWith(p))

    if (isProtectedGuestRoute) {
      const slug = segments[0]
      const url = request.nextUrl.clone()
      url.pathname = `/${slug}/guest/login`
      url.searchParams.set("next", pathname)
      return NextResponse.redirect(url)
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
}
