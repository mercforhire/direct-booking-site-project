import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { prisma } from "@/lib/prisma"
import Link from "next/link"
import { Bebas_Neue, DM_Sans } from "next/font/google"
import BookingHistoryList from "@/components/guest/booking-history-list"
import SignOutButton from "@/components/guest/sign-out-button"

const bebas = Bebas_Neue({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-bebas",
})

const dm = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm",
})

export const dynamic = "force-dynamic"

export default async function MyBookingsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/guest/login?next=/my-bookings")

  const bookings = await prisma.booking.findMany({
    where: {
      guestUserId: user.id,
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
    <div
      className={`${bebas.variable} ${dm.variable}`}
      style={{
        background: "#3a392a",
        minHeight: "100vh",
        color: "#f0ebe0",
        fontFamily: "var(--font-dm), sans-serif",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .page-header { animation: fadeUp 0.8s cubic-bezier(0.16,1,0.3,1) both; }
        .page-content { animation: fadeUp 0.8s 0.1s cubic-bezier(0.16,1,0.3,1) both; }
        .back-nav:hover { opacity: 1 !important; }
        @media (max-width: 600px) {
          .nav-pad { padding: 1.2rem 1.5rem !important; }
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
          href="/"
          className="back-nav"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.4rem",
            color: "#f0ebe0",
            textDecoration: "none",
            fontSize: "0.75rem",
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            opacity: 0.45,
            transition: "opacity 0.2s ease",
          }}
        >
          ← Leon&rsquo;s Home
        </Link>

        <SignOutButton />
      </nav>

      {/* ── Content ── */}
      <main
        className="content-pad"
        style={{ padding: "3rem 3rem 5rem", maxWidth: "680px", width: "100%" }}
      >
        {/* Header */}
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
            Leon&rsquo;s Home &middot; Scarborough, ON
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
                <span style={{ color: "#d4956a" }}>Bookings</span>
              </>
            ) : (
              <>
                Your
                <br />
                <span style={{ color: "#d4956a" }}>Bookings</span>
              </>
            )}
          </h1>
        </div>

        {/* Divider */}
        <div
          className="page-header"
          style={{
            width: "100%",
            height: "1px",
            background: "rgba(255,255,255,0.08)",
            marginBottom: "2.5rem",
          }}
        />

        {/* List */}
        <div className="page-content">
          <BookingHistoryList upcoming={upcoming} past={past} />
        </div>
      </main>
    </div>
  )
}
