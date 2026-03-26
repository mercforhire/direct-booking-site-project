import { edgeAuth } from "@/lib/auth-edge"

export default edgeAuth((req) => {
  const adminPaths = ["/dashboard", "/rooms", "/settings"]
  const isAdminRoute = adminPaths.some((p) =>
    req.nextUrl.pathname.startsWith(p)
  )
  if (!req.auth && isAdminRoute) {
    return Response.redirect(new URL("/login", req.url))
  }
})

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
}
