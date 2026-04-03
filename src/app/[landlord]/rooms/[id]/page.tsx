import { notFound } from "next/navigation"
import Link from "next/link"
import { getLandlordBySlug } from "@/lib/landlord"
import { prisma } from "@/lib/prisma"
import { getUnavailableDates } from "@/lib/unavailable-dates"
import { AvailabilityCalendarReadonly } from "@/components/guest/availability-calendar-readonly"
import { RoomPhotoGallery } from "@/components/guest/room-photo-gallery"
import { RoomPricingTable } from "@/components/guest/room-pricing-table"

export const dynamic = "force-dynamic"

export default async function LandlordRoomPage({
  params,
  searchParams,
}: {
  params: Promise<{ landlord: string; id: string }>
  searchParams: Promise<{ checkin?: string; checkout?: string; guests?: string }>
}) {
  const { landlord: slug, id } = await params
  const landlord = await getLandlordBySlug(slug)
  if (!landlord) notFound()

  const { checkin, checkout, guests } = await searchParams
  const base = `/${slug}`

  const room = await prisma.room.findUnique({
    where: { id, isActive: true, landlordId: landlord.id },
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
    },
  })

  if (!room) notFound()

  // Compute "from" price: lowest override in next 30 days, or base rate
  const today = new Date()
  const thirtyDaysOut = new Date(today)
  thirtyDaysOut.setDate(thirtyDaysOut.getDate() + 30)
  const lowestOverride = await prisma.datePriceOverride.findFirst({
    where: { roomId: id, date: { gte: today, lte: thirtyDaysOut } },
    orderBy: { price: "asc" },
    select: { price: true },
  })

  const baseNightlyRate = Number(room.baseNightlyRate)
  const fromPrice = lowestOverride ? Number(lowestOverride.price) : baseNightlyRate
  const cleaningFee = Number(room.cleaningFee)
  const extraGuestFee = Number(room.extraGuestFee)
  const addOns = room.addOns.map((a) => ({ ...a, price: Number(a.price) }))

  const blockedDateStrings = await getUnavailableDates(id)

  const bookParams = new URLSearchParams()
  if (checkin) bookParams.set("checkin", checkin)
  if (checkout) bookParams.set("checkout", checkout)
  if (guests) bookParams.set("guests", guests)
  const bookHref = `${base}/rooms/${id}/book${bookParams.toString() ? "?" + bookParams.toString() : ""}`

  return (
    <div className="room-dark">
      <style>{`
        .rd-fade   { animation: fadeUp 0.8s cubic-bezier(0.16,1,0.3,1) both; }
        .rd-fade-2 { animation: fadeUp 0.8s 0.12s cubic-bezier(0.16,1,0.3,1) both; }
        .rd-fade-3 { animation: fadeUp 0.8s 0.22s cubic-bezier(0.16,1,0.3,1) both; }
        .book-cta:hover     { background: #6a3214 !important; }
        .thumb-btn:hover img { transform: scale(1.06) !important; }
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
          color: ${landlord.textColor} !important;
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
        .room-dark .rdp-root {
          --rdp-accent-color: ${landlord.accentColor};
          --rdp-accent-background-color: ${landlord.accentColor}2E;
          --rdp-background-color: rgba(255,255,255,0.07);
          color: ${landlord.textColor};
          background: transparent;
        }
        .room-dark .rdp-month_caption,
        .room-dark .rdp-caption_label { color: ${landlord.textColor} !important; }
        .room-dark .rdp-nav button { color: ${landlord.textColor}99 !important; }
        .room-dark .rdp-nav button:hover { color: ${landlord.textColor} !important; background: rgba(255,255,255,0.07) !important; }
        .room-dark .rdp-weekday { color: ${landlord.textColor}4D !important; font-size: 0.7rem !important; }
        .room-dark .rdp-day_button { color: ${landlord.textColor} !important; border-radius: 6px !important; }
        .room-dark .rdp-disabled .rdp-day_button,
        .room-dark .rdp-day.rdp-disabled .rdp-day_button { color: ${landlord.textColor}33 !important; }
        .room-dark .rdp-outside .rdp-day_button { opacity: 0.2 !important; }
        @media (max-width: 860px) {
          .rd-two-col { grid-template-columns: 1fr !important; }
          .rd-sticky-col { position: static !important; }
        }
        @media (max-width: 640px) {
          .rd-content-pad { padding: 1.5rem 1.5rem 3rem !important; }
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
          href={`${base}/rooms`}
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
          ← All Rooms
        </Link>

        <Link
          href={`${base}/guest/login?next=${base}/my-bookings`}
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
            {landlord.address}
          </div>
          <h1
            style={{
              fontFamily: "var(--font-bebas)",
              fontSize: "clamp(2.8rem, 6vw, 4.5rem)",
              lineHeight: 0.9,
              letterSpacing: "0.02em",
              textTransform: "uppercase",
              margin: "0 0 0.75rem",
              color: landlord.textColor,
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
              <span style={{ display: "flex", alignItems: "center", gap: "0.35rem", fontSize: "0.78rem", opacity: 0.55 }}>
                <span style={{ fontSize: "0.85rem" }}>📍</span>
                {room.location}
              </span>
            )}
            <span style={{ display: "flex", alignItems: "center", gap: "0.35rem", fontSize: "0.78rem", opacity: 0.55 }}>
              <span style={{ fontSize: "0.85rem" }}>👥</span>
              Up to {room.maxGuests} guest{room.maxGuests !== 1 ? "s" : ""}
            </span>
            <span style={{ display: "flex", alignItems: "center", gap: "0.35rem", fontSize: "0.78rem", opacity: 0.55 }}>
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
              fromPrice={fromPrice}
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
                color: landlord.textColor,
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
              No charge yet &mdash; {landlord.ownerName} reviews &amp; confirms
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
