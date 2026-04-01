import { Suspense } from "react"
import { notFound } from "next/navigation"
import Link from "next/link"
import { Bebas_Neue, DM_Sans } from "next/font/google"
import { getLandlordBySlug } from "@/lib/landlord"
import { prisma } from "@/lib/prisma"
import { coerceRoomDecimals } from "@/lib/room-formatters"
import { RoomList } from "@/components/guest/room-list"

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

function RoomListSkeleton() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem", marginTop: "2rem" }}>
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          style={{
            height: "280px",
            borderRadius: "12px",
            background: "rgba(255,255,255,0.05)",
            animation: "shimmer 1.8s ease-in-out infinite",
          }}
        />
      ))}
    </div>
  )
}

export default async function LandlordRoomsPage({
  params,
}: {
  params: Promise<{ landlord: string }>
}) {
  const { landlord: slug } = await params
  const landlord = await getLandlordBySlug(slug)
  if (!landlord) notFound()

  const base = `/${slug}`

  const rooms = await prisma.room.findMany({
    where: { landlordId: landlord.id, isActive: true },
    select: {
      id: true,
      name: true,
      description: true,
      location: true,
      baseNightlyRate: true,
      cleaningFee: true,
      extraGuestFee: true,
      baseGuests: true,
      maxGuests: true,
      bookingWindowMonths: true,
      photos: {
        select: { url: true, position: true },
        orderBy: { position: "asc" },
        take: 1,
      },
      blockedDates: {
        select: { date: true },
      },
    },
  })

  const roomsForClient = rooms.map(({ blockedDates, ...rest }) => ({
    ...coerceRoomDecimals(rest),
    blockedDateStrings: blockedDates.map((b) =>
      b.date.toISOString().slice(0, 10)
    ),
  }))

  return (
    <div
      className={`${bebas.variable} ${dm.variable}`}
      style={{
        background: landlord.bgColor,
        minHeight: "100vh",
        color: landlord.textColor,
        fontFamily: "var(--font-dm), sans-serif",
      }}
    >
      <style>{`
        @keyframes shimmer {
          0%, 100% { opacity: 0.4; }
          50%       { opacity: 0.7; }
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .rooms-header { animation: fadeUp 0.8s cubic-bezier(0.16,1,0.3,1) both; }
        .back-link:hover { opacity: 1 !important; }
        .my-bookings-btn:hover { background: rgba(255,255,255,0.06) !important; }
        .room-tile:hover { border-color: rgba(255,255,255,0.18) !important; }
        .room-tile:hover .tile-photo { transform: scale(1.04) !important; }
        .room-tile:hover .tile-cta { background: #6a3214 !important; }
        @media (max-width: 860px) {
          .tile-grid { grid-template-columns: 1fr !important; }
          .tile-photo-wrap { height: 220px !important; }
        }
        @media (max-width: 600px) {
          .rooms-pad { padding: 0 1.5rem 3rem !important; }
          .rooms-header-pad { padding: 2.5rem 1.5rem 1rem !important; }
          .nav-pad { padding: 1.2rem 1.5rem !important; }
        }
      `}</style>

      {/* ── Nav ─────────────────────────────────────────── */}
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
          className="back-link"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.4rem",
            color: landlord.textColor,
            textDecoration: "none",
            fontSize: "0.75rem",
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            opacity: 0.5,
            transition: "opacity 0.2s ease",
          }}
        >
          ← {landlord.name}
        </Link>

        <Link
          href={`/guest/login?next=${base}/my-bookings`}
          className="my-bookings-btn"
          style={{
            border: "1px solid rgba(255,255,255,0.18)",
            color: `${landlord.textColor}99`,
            padding: "0.42rem 1.2rem",
            borderRadius: "9999px",
            fontSize: "0.7rem",
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            textDecoration: "none",
            background: "transparent",
            transition: "background 0.2s ease",
          }}
        >
          My Bookings
        </Link>
      </nav>

      {/* ── Page header ─────────────────────────────────── */}
      <div
        className="rooms-header rooms-header-pad"
        style={{ padding: "3rem 3rem 1.5rem" }}
      >
        <div
          style={{
            fontSize: "0.68rem",
            letterSpacing: "0.22em",
            textTransform: "uppercase",
            opacity: 0.35,
            marginBottom: "0.85rem",
          }}
        >
          {landlord.address}
        </div>
        <h1
          style={{
            fontFamily: "var(--font-bebas)",
            fontSize: "clamp(3.5rem, 8vw, 6rem)",
            lineHeight: 0.9,
            letterSpacing: "0.02em",
            textTransform: "uppercase",
            margin: 0,
          }}
        >
          Available
          <br />
          Rooms
        </h1>
      </div>

      {/* ── Room list ───────────────────────────────────── */}
      <main
        className="rooms-pad"
        style={{ padding: "0 3rem 4rem" }}
      >
        <Suspense fallback={<RoomListSkeleton />}>
          <RoomList rooms={roomsForClient} basePath={base} />
        </Suspense>
      </main>
    </div>
  )
}
