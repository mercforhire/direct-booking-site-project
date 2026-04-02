import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { NextRequest } from "next/server"

// Mock syncAllRooms before importing the route handler
vi.mock("@/actions/ical-sync", () => ({
  syncAllRooms: vi.fn(),
}))

import { GET } from "@/app/api/cron/ical-sync/route"
import { syncAllRooms } from "@/actions/ical-sync"

// ── Helpers ──────────────────────────────────────────────────

function makeRequest(authHeader?: string): NextRequest {
  const headers = new Headers()
  if (authHeader) {
    headers.set("authorization", authHeader)
  }
  return new NextRequest("http://localhost/api/cron/ical-sync", { headers })
}

// ── Tests ────────────────────────────────────────────────────

describe("GET /api/cron/ical-sync", () => {
  const ORIGINAL_ENV = process.env

  beforeEach(() => {
    vi.clearAllMocks()
    // Set up env with CRON_SECRET
    process.env = { ...ORIGINAL_ENV, CRON_SECRET: "test-secret" }
  })

  afterEach(() => {
    process.env = ORIGINAL_ENV
  })

  // ── Auth validation ────────────────────────────────────────

  it("returns 401 when no Authorization header is provided", async () => {
    const res = await GET(makeRequest())
    expect(res.status).toBe(401)
    const body = await res.json()
    expect(body).toEqual({ ok: false, error: "Unauthorized" })
    expect(syncAllRooms).not.toHaveBeenCalled()
  })

  it("returns 401 when Bearer token is wrong", async () => {
    const res = await GET(makeRequest("Bearer wrong-token"))
    expect(res.status).toBe(401)
    const body = await res.json()
    expect(body).toEqual({ ok: false, error: "Unauthorized" })
    expect(syncAllRooms).not.toHaveBeenCalled()
  })

  it("returns 401 when Authorization header format is not Bearer", async () => {
    const res = await GET(makeRequest("Basic dXNlcjpwYXNz"))
    expect(res.status).toBe(401)
    expect(syncAllRooms).not.toHaveBeenCalled()
  })

  // ── Missing CRON_SECRET ────────────────────────────────────

  it("returns 500 when CRON_SECRET env var is not configured", async () => {
    delete process.env.CRON_SECRET
    const res = await GET(makeRequest("Bearer test-secret"))
    expect(res.status).toBe(500)
    const body = await res.json()
    expect(body).toEqual({ ok: false, error: "CRON_SECRET not configured" })
    expect(syncAllRooms).not.toHaveBeenCalled()
  })

  // ── Happy path ─────────────────────────────────────────────

  it("returns 200 and calls syncAllRooms with correct Bearer token", async () => {
    const mockResult = {
      results: [
        { roomId: "room-1", synced: 5, errors: [] },
        { roomId: "room-2", synced: 0, errors: ["[Airbnb] HTTP 500"] },
      ],
    }
    vi.mocked(syncAllRooms).mockResolvedValue(mockResult)

    const res = await GET(makeRequest("Bearer test-secret"))
    expect(res.status).toBe(200)

    const body = await res.json()
    expect(body).toEqual({ ok: true, ...mockResult })
    expect(syncAllRooms).toHaveBeenCalledOnce()
  })

  it("returns empty results when no rooms have iCal sources", async () => {
    vi.mocked(syncAllRooms).mockResolvedValue({ results: [] })

    const res = await GET(makeRequest("Bearer test-secret"))
    expect(res.status).toBe(200)

    const body = await res.json()
    expect(body).toEqual({ ok: true, results: [] })
  })

  // ── Error handling ─────────────────────────────────────────

  it("returns 500 when syncAllRooms throws", async () => {
    vi.mocked(syncAllRooms).mockRejectedValue(new Error("DB connection failed"))

    const res = await GET(makeRequest("Bearer test-secret"))
    expect(res.status).toBe(500)

    const body = await res.json()
    expect(body).toEqual({ ok: false, error: "DB connection failed" })
  })
})
