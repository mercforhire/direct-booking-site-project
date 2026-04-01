import { redirect, notFound } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { getLandlordBySlug } from "@/lib/landlord"
import { prisma } from "@/lib/prisma"
import Link from "next/link"
import BookingHistoryList from "@/components/guest/booking-history-list"
import SignOutButton from "@/components/guest/sign-out-button"

export const dynamic = "force-dynamic"

export default async function LandlordMyBookingsPage({
  params,
}: {
  params: Promise<{ landlord: string }>
}) {
  const { landlord: slug } = await params
  const landlord = await getLandlordBySlug(slug)
  if (!landlord) notFound()

  const base = `/${slug}`

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(`/guest/login?next=${base}/my-bookings`)

  const bookings = await prisma.booking.findMany({
    where: {
      guestUserId: user.id,
      room: { landlordId: landlord.id },
    },
    include: {
      room: {
        select: { name: true, photos: { orderBy: { position: "asc" }, take: 1, select: { url: true } } },
      },
    },
    orderBy: { checkin: "desc" },
  })

  const serialized = bookings.map((b) => ({
    id: b.id,
    guestName: b.guestName,
    checkin: b.checkin,
    checkout: b.checkout,
    numGuests: b.numGuests,
    status: b.status,
    confirmedPrice: b.confirmedPrice !== null ? Number(b.confirmedPrice) : null,
    estimatedTotal: Number(b.estimatedTotal),
    room: b.room,
  }))

  const firstName = serialized[0]?.guestName?.split(" ")[0] ?? null

  const now = new Date()
  const todayUTC = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  const twelveMonthsAgoUTC = Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 12, now.getUTCDate())

  const upcoming = serialized
    .filter((b) => new Date(b.checkin).getTime() >= todayUTC)
    .sort((a, b) => new Date(a.checkin).getTime() - new Date(b.checkin).getTime())

  const past = serialized
    .filter((b) => {
      const t = new Date(b.checkin).getTime()
      return t < todayUTC && t >= twelveMonthsAgoUTC
    })
    .sort((a, b) => new Date(b.checkin).getTime() - new Date(a.checkin).getTime())

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
      <style>{`
        .page-header { animation: fadeUp 0.8s cubic-bezier(0.16,1,0.3,1) both; }
        .page-content { animation: fadeUp 0.8s 0.1s cubic-bezier(0.16,1,0.3,1) both; }
        .back-nav:hover { opacity: 1 !important; }
        @media (max-width: 600px) {
          .content-pad { padding: 2rem 1.5rem 4rem !important; }
        }
      `}</style>

      {/* ── Nav ── */}
      <nav
        className="nav-pad"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "1.4rem 3rem",
          borderBottom: "1px solid rgba(255,255,255,0.08)",
        }}
      >
        <Link
          href={base}
          className="back-nav"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.4rem",
            color: landlord.textColor,
            textDecoration: "none",
            fontSize: "0.75rem",
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            opacity: 0.45,
            transition: "opacity 0.2s ease",
          }}
        >
          ← {landlord.name}
        </Link>

        <SignOutButton />
      </nav>

      {/* ── Content ── */}
      <main
        className="content-pad"
        style={{ padding: "3rem 3rem 5rem", maxWidth: "680px", width: "100%" }}
      >
        <div className="page-header" style={{ marginBottom: "2.5rem" }}>
          <div
            style={{
              fontSize: "0.68rem",
              letterSpacing: "0.22em",
              textTransform: "uppercase",
              opacity: 0.35,
              marginBottom: "0.85rem",
            }}
          >
            {landlord.name} &middot; {landlord.address}
          </div>
          <h1
            style={{
              fontFamily: "var(--font-bebas)",
              fontSize: "clamp(3rem, 7vw, 5rem)",
              lineHeight: 0.9,
              letterSpacing: "0.02em",
              textTransform: "uppercase",
              margin: 0,
            }}
          >
            {firstName ? (
              <>
                {firstName}&rsquo;s
                <br />
                <span style={{ color: landlord.accentColor }}>Bookings</span>
              </>
            ) : (
              <>
                Your
                <br />
                <span style={{ color: landlord.accentColor }}>Bookings</span>
              </>
            )}
          </h1>
        </div>

        <div
          className="page-header"
          style={{
            width: "100%",
            height: "1px",
            background: "rgba(255,255,255,0.08)",
            marginBottom: "2.5rem",
          }}
        />

        <div className="page-content">
          <BookingHistoryList upcoming={upcoming} past={past} basePath={base} />
        </div>
      </main>
    </div>
  )
}
