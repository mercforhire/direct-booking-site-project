import { describe, it, expect, vi, beforeEach } from "vitest"
import { NextRequest } from "next/server"

const { mockGetUser } = vi.hoisted(() => ({
  mockGetUser: vi.fn(),
}))

vi.mock("@supabase/ssr", () => ({
  createServerClient: vi.fn(() => ({
    auth: { getUser: mockGetUser },
  })),
}))

import { middleware } from "@/middleware"

function makeRequest(url: string) {
  return new NextRequest(`http://localhost${url}`)
}

describe("middleware route protection", () => {
  describe("unauthenticated user", () => {
    beforeEach(() => {
      mockGetUser.mockResolvedValue({ data: { user: null }, error: null })
    })

    it("allows /bookings/abc123?token=tok-xyz through (guest token access)", async () => {
      const res = await middleware(makeRequest("/bookings/abc123?token=tok-xyz"))
      expect(res.status).toBe(200)
    })

    it("allows /bookings/abc123 with no token through (page handles missing token via notFound)", async () => {
      const res = await middleware(makeRequest("/bookings/abc123"))
      expect(res.status).toBe(200)
    })

    it("redirects /admin/bookings to /login", async () => {
      const res = await middleware(makeRequest("/admin/bookings"))
      expect(res.status).toBe(307)
      expect(res.headers.get("location")).toContain("/login")
    })

    it("redirects /availability to /login", async () => {
      const res = await middleware(makeRequest("/availability"))
      expect(res.status).toBe(307)
      expect(res.headers.get("location")).toContain("/login")
    })

    it("redirects /dashboard to /login", async () => {
      const res = await middleware(makeRequest("/dashboard"))
      expect(res.status).toBe(307)
      expect(res.headers.get("location")).toContain("/login")
    })

    it("redirects /settings to /login", async () => {
      const res = await middleware(makeRequest("/settings"))
      expect(res.status).toBe(307)
      expect(res.headers.get("location")).toContain("/login")
    })
  })

  describe("authenticated user", () => {
    beforeEach(() => {
      mockGetUser.mockResolvedValue({
        data: { user: { id: "admin-1" } },
        error: null,
      })
    })

    it("allows authenticated user through /admin/bookings", async () => {
      const res = await middleware(makeRequest("/admin/bookings"))
      expect(res.status).toBe(200)
    })

    it("allows authenticated user through /availability", async () => {
      const res = await middleware(makeRequest("/availability"))
      expect(res.status).toBe(200)
    })
  })
})
