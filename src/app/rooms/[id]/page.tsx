import { notFound } from "next/navigation"
import Link from "next/link"
import { Bebas_Neue, DM_Sans } from "next/font/google"
import { prisma } from "@/lib/prisma"
import { AvailabilityCalendarReadonly } from "@/components/guest/availability-calendar-readonly"
import { RoomPhotoGallery } from "@/components/guest/room-photo-gallery"
import { RoomPricingTable } from "@/components/guest/room-pricing-table"

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

export default async function RoomPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ checkin?: string; checkout?: string; guests?: string }>
}) {
  const { id } = await params
  const { checkin, checkout, guests } = await searchParams

  const room = await prisma.room.findUnique({
    where: { id, isActive: true },
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
      minStayNights: true,
      maxStayNights: true,
      bookingWindowMonths: true,
      photos: {
        select: { url: true, position: true },
        orderBy: { position: "asc" },
      },
      addOns: {
        select: { id: true, name: true, price: true },
      },
      blockedDates: {
        select: { date: true },
      },
    },
  })

  if (!room) notFound()

  const baseNightlyRate = Number(room.baseNightlyRate)
  const cleaningFee = Number(room.cleaningFee)
  const extraGuestFee = Number(room.extraGuestFee)
  const addOns = room.addOns.map((a) => ({ ...a, price: Number(a.price) }))

  const blockedDateStrings = room.blockedDates.map((b) =>
    b.date.toISOString().slice(0, 10)
  )

  const bookParams = new URLSearchParams()
  if (checkin) bookParams.set("checkin", checkin)
  if (checkout) bookParams.set("checkout", checkout)
  if (guests) bookParams.set("guests", guests)
  const bookHref = `/rooms/${id}/book${bookParams.toString() ? "?" + bookParams.toString() : ""}`

  return (
    <div
      className={`${bebas.variable} ${dm.variable} room-dark`}
      style={{
        background: "#3a392a",
        minHeight: "100vh",
        color: "#f0ebe0",
        fontFamily: "var(--font-dm), sans-serif",
      }}
    >
      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .rd-fade   { animation: fadeUp 0.8s cubic-bezier(0.16,1,0.3,1) both; }
        .rd-fade-2 { animation: fadeUp 0.8s 0.12s cubic-bezier(0.16,1,0.3,1) both; }
        .rd-fade-3 { animation: fadeUp 0.8s 0.22s cubic-bezier(0.16,1,0.3,1) both; }
        .back-link:hover    { opacity: 1 !important; }
        .my-bookings-btn:hover { background: rgba(255,255,255,0.06) !important; }
        .book-cta:hover     { background: #6a3214 !important; }
        .thumb-btn:hover img { transform: scale(1.06) !important; }

        /* ── Card sections ───────────────────────────── */
        .rd-card {
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 10px;
          padding: 1.5rem;
        }
        .rd-card h2 {
          font-family: var(--font-bebas) !important;
          font-size: 1.3rem !important;
          letter-spacing: 0.08em !important;
          text-transform: uppercase !important;
          color: #f0ebe0 !important;
          margin: 0 0 1rem !important;
          font-weight: 400 !important;
        }
        .rd-section-label {
          font-size: 0.63rem;
          letter-spacing: 0.22em;
          text-transform: uppercase;
          opacity: 0.35;
          margin-bottom: 0.6rem;
        }

        /* ── DayPicker dark override ─────────────────── */
        .room-dark .rdp-root {
          --rdp-accent-color: #d4956a;
          --rdp-accent-background-color: rgba(212,149,106,0.18);
          --rdp-background-color: rgba(255,255,255,0.07);
          color: #f0ebe0;
          background: transparent;
        }
        .room-dark .rdp-month_caption,
        .room-dark .rdp-caption_label { color: #f0ebe0 !important; }
        .room-dark .rdp-nav button { color: rgba(240,235,224,0.6) !important; }
        .room-dark .rdp-nav button:hover { color: #f0ebe0 !important; background: rgba(255,255,255,0.07) !important; }
        .room-dark .rdp-weekday { color: rgba(240,235,224,0.3) !important; font-size: 0.7rem !important; }
        .room-dark .rdp-day_button { color: #f0ebe0 !important; border-radius: 6px !important; }
        .room-dark .rdp-disabled .rdp-day_button,
        .room-dark .rdp-day.rdp-disabled .rdp-day_button { color: rgba(240,235,224,0.2) !important; }
        .room-dark .rdp-outside .rdp-day_button { opacity: 0.2 !important; }

        /* ── Mobile ──────────────────────────────────── */
        @media (max-width: 860px) {
          .rd-two-col { grid-template-columns: 1fr !important; }
          .rd-sticky-col { position: static !important; }
        }
        @media (max-width: 640px) {
          .rd-content-pad { padding: 1.5rem 1.5rem 3rem !important; }
          .nav-pad { padding: 1.2rem 1.5rem !important; }
        }
      `}</style>

      {/* ── Nav ──────────────────────────────────────────── */}
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
          href="/rooms"
          className="back-link"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.4rem",
            color: "#f0ebe0",
            textDecoration: "none",
            fontSize: "0.75rem",
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            opacity: 0.5,
            transition: "opacity 0.2s ease",
          }}
        >
          ← All Rooms
        </Link>

        <Link
          href="/guest/login?next=/my-bookings"
          className="my-bookings-btn"
          style={{
            border: "1px solid rgba(255,255,255,0.18)",
            color: "rgba(240,235,224,0.6)",
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

      {/* ── Photo gallery — full width ───────────────────── */}
      <div className="rd-fade">
        <RoomPhotoGallery photos={room.photos} />
      </div>

      {/* ── Main content ─────────────────────────────────── */}
      <div
        className="rd-content-pad"
        style={{
          maxWidth: "1000px",
          margin: "0 auto",
          padding: "2.5rem 3rem 5rem",
        }}
      >
        {/* Room title + meta */}
        <div className="rd-fade-2" style={{ marginBottom: "2rem" }}>
          <div
            style={{
              fontSize: "0.63rem",
              letterSpacing: "0.22em",
              textTransform: "uppercase",
              opacity: 0.35,
              marginBottom: "0.5rem",
            }}
          >
            9 Highhill Dr &middot; Scarborough, ON
          </div>
          <h1
            style={{
              fontFamily: "var(--font-bebas)",
              fontSize: "clamp(2.8rem, 6vw, 4.5rem)",
              lineHeight: 0.9,
              letterSpacing: "0.02em",
              textTransform: "uppercase",
              margin: "0 0 0.75rem",
              color: "#f0ebe0",
            }}
          >
            {room.name}
          </h1>

          <div
            style={{
              display: "flex",
              gap: "1.25rem",
              flexWrap: "wrap",
              alignItems: "center",
            }}
          >
            {room.location && (
              <span
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.35rem",
                  fontSize: "0.78rem",
                  opacity: 0.55,
                }}
              >
                <span style={{ fontSize: "0.85rem" }}>📍</span>
                {room.location}
              </span>
            )}
            <span
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.35rem",
                fontSize: "0.78rem",
                opacity: 0.55,
              }}
            >
              <span style={{ fontSize: "0.85rem" }}>👥</span>
              Up to {room.maxGuests} guest{room.maxGuests !== 1 ? "s" : ""}
            </span>
            <span
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.35rem",
                fontSize: "0.78rem",
                opacity: 0.55,
              }}
            >
              <span style={{ fontSize: "0.85rem" }}>🌙</span>
              {room.minStayNights}–{room.maxStayNights} night stay
            </span>
          </div>
        </div>

        {/* Two-column layout */}
        <div
          className="rd-fade-3 rd-two-col"
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 300px",
            gap: "1.5rem",
            alignItems: "start",
          }}
        >
          {/* Left column */}
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>

            {/* Description */}
            {room.description && (
              <div className="rd-card">
                <div className="rd-section-label">About this room</div>
                <p
                  style={{
                    whiteSpace: "pre-line",
                    fontSize: "0.88rem",
                    lineHeight: 1.75,
                    opacity: 0.7,
                    margin: 0,
                  }}
                >
                  {room.description}
                </p>
              </div>
            )}

            {/* Availability calendar */}
            <div className="rd-card">
              <div className="rd-section-label">Availability</div>
              <h2>Check Dates</h2>
              <AvailabilityCalendarReadonly
                blockedDateStrings={blockedDateStrings}
                bookingWindowMonths={room.bookingWindowMonths}
                minStayNights={room.minStayNights}
              />
              <p
                style={{
                  fontSize: "0.7rem",
                  opacity: 0.35,
                  marginTop: "0.75rem",
                  marginBottom: 0,
                }}
              >
                Maximum stay: {room.maxStayNights} night{room.maxStayNights !== 1 ? "s" : ""}
              </p>
            </div>
          </div>

          {/* Right column — sticky pricing + CTA */}
          <div
            className="rd-sticky-col"
            style={{ position: "sticky", top: "2rem" }}
          >
            <RoomPricingTable
              baseNightlyRate={baseNightlyRate}
              cleaningFee={cleaningFee}
              extraGuestFee={extraGuestFee}
              baseGuests={room.baseGuests}
              addOns={addOns}
              checkin={checkin}
              checkout={checkout}
            />

            <Link
              href={bookHref}
              className="book-cta"
              style={{
                display: "block",
                width: "100%",
                marginTop: "0.75rem",
                background: "#7c3d18",
                color: "#f0ebe0",
                borderRadius: "9999px",
                padding: "0.9rem 1.5rem",
                fontSize: "0.82rem",
                fontWeight: 700,
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                textDecoration: "none",
                textAlign: "center",
                transition: "background 0.2s ease",
              }}
            >
              Request to Book
            </Link>

            <p
              style={{
                textAlign: "center",
                fontSize: "0.68rem",
                opacity: 0.3,
                marginTop: "0.65rem",
                lineHeight: 1.5,
              }}
            >
              No charge yet &mdash; Leon reviews &amp; confirms
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
