"use client"

import Link from "next/link"
import Image from "next/image"

type SerializedBooking = {
  id: string
  guestName: string
  checkin: Date | string
  checkout: Date | string
  numGuests: number
  status: string
  confirmedPrice: number | null
  estimatedTotal: number
  room: {
    name: string
    photos: { url: string }[]
  }
}

const statusConfig: Record<string, { label: string; color: string; bg: string; border: string }> = {
  PENDING:   { label: "Pending",   color: "#d4956a", bg: "rgba(212,149,106,0.1)",  border: "rgba(212,149,106,0.3)" },
  APPROVED:  { label: "Approved",  color: "#7ab3d4", bg: "rgba(122,179,212,0.1)",  border: "rgba(122,179,212,0.3)" },
  PAID:      { label: "Paid",      color: "#7abf8e", bg: "rgba(122,191,142,0.1)",  border: "rgba(122,191,142,0.3)" },
  CANCELLED: { label: "Cancelled", color: "rgba(240,235,224,0.35)", bg: "rgba(255,255,255,0.05)", border: "rgba(255,255,255,0.12)" },
  DECLINED:  { label: "Declined",  color: "#d47a7a", bg: "rgba(212,122,122,0.1)",  border: "rgba(212,122,122,0.3)" },
  COMPLETED: { label: "Completed", color: "#7abf8e", bg: "rgba(122,191,142,0.1)",  border: "rgba(122,191,142,0.3)" },
}

function formatDate(date: Date, includeYear: boolean): string {
  return date.toLocaleDateString("en-US", {
    timeZone: "UTC",
    month: "short",
    day: "numeric",
    ...(includeYear ? { year: "numeric" } : {}),
  })
}

function formatDateRange(checkin: Date | string, checkout: Date | string) {
  const ci = new Date(checkin)
  const co = new Date(checkout)
  const ciYear = ci.getUTCFullYear()
  const coYear = co.getUTCFullYear()
  if (ciYear === coYear) {
    return `${formatDate(ci, false)} – ${formatDate(co, true)}`
  }
  return `${formatDate(ci, true)} – ${formatDate(co, true)}`
}

function formatPrice(amount: number) {
  return `$${amount.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
}

function BookingCard({ booking }: { booking: SerializedBooking }) {
  const photo = booking.room.photos[0]?.url
  const price = booking.confirmedPrice ?? booking.estimatedTotal
  const badge = statusConfig[booking.status] ?? {
    label: booking.status,
    color: "rgba(240,235,224,0.35)",
    bg: "rgba(255,255,255,0.05)",
    border: "rgba(255,255,255,0.12)",
  }

  return (
    <Link
      href={`/bookings/${booking.id}`}
      className="booking-card"
      style={{
        display: "flex",
        flexDirection: "column",
        borderRadius: "10px",
        border: "1px solid rgba(255,255,255,0.07)",
        background: "rgba(255,255,255,0.03)",
        textDecoration: "none",
        color: "#f0ebe0",
        overflow: "hidden",
        transition: "border-color 0.2s ease, background 0.2s ease",
      }}
    >
      {/* Cover photo */}
      <div
        style={{
          position: "relative",
          height: "180px",
          background: "#2a2618",
          overflow: "hidden",
          flexShrink: 0,
        }}
      >
        {photo ? (
          <Image
            src={photo}
            alt={booking.room.name}
            fill
            className="booking-card-img"
            style={{ objectFit: "cover", transition: "transform 0.5s ease" }}
            sizes="(max-width: 680px) 100vw, 640px"
          />
        ) : null}
        {/* Status badge overlaid on photo */}
        <span
          style={{
            position: "absolute",
            top: "0.75rem",
            right: "0.75rem",
            display: "inline-block",
            borderRadius: "9999px",
            padding: "0.18rem 0.65rem",
            fontSize: "0.65rem",
            fontWeight: 600,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            color: badge.color,
            background: "rgba(30,28,20,0.75)",
            backdropFilter: "blur(6px)",
            border: `1px solid ${badge.border}`,
          }}
        >
          {badge.label}
        </span>
      </div>

      {/* Info row */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0.9rem 1.1rem",
          gap: "1rem",
        }}
      >
        <div style={{ minWidth: 0 }}>
          <div
            style={{
              fontWeight: 600,
              fontSize: "0.92rem",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
              marginBottom: "0.2rem",
            }}
          >
            {booking.room.name}
          </div>
          <div style={{ fontSize: "0.75rem", opacity: 0.45, lineHeight: 1.5 }}>
            {formatDateRange(booking.checkin, booking.checkout)}
            &ensp;&middot;&ensp;
            {booking.numGuests} {booking.numGuests === 1 ? "guest" : "guests"}
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexShrink: 0 }}>
          <span style={{ fontSize: "0.88rem", fontWeight: 600 }}>
            {formatPrice(price)}
          </span>
          <span
            className="booking-card-arrow"
            style={{
              color: "#d4956a",
              fontSize: "0.85rem",
              opacity: 0.5,
              transition: "transform 0.2s ease, opacity 0.2s ease",
            }}
          >
            →
          </span>
        </div>
      </div>
    </Link>
  )
}

type BookingHistoryListProps = {
  upcoming: SerializedBooking[]
  past: SerializedBooking[]
}

export default function BookingHistoryList({ upcoming, past }: BookingHistoryListProps) {
  if (upcoming.length === 0 && past.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: "3rem 0" }}>
        <p style={{ opacity: 0.4, fontSize: "0.88rem", marginBottom: "1.75rem" }}>
          You don&apos;t have any bookings yet.
        </p>
        <Link
          href="/rooms"
          className="browse-btn"
          style={{
            display: "inline-block",
            background: "#7c3d18",
            color: "#f0ebe0",
            textDecoration: "none",
            borderRadius: "9999px",
            padding: "0.75rem 2rem",
            fontSize: "0.72rem",
            fontWeight: 700,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            transition: "background 0.2s ease",
          }}
        >
          Browse Rooms
        </Link>
      </div>
    )
  }

  return (
    <>
      <style>{`
        .booking-card:hover { border-color: rgba(255,255,255,0.18) !important; background: rgba(255,255,255,0.05) !important; }
        .booking-card:hover .booking-card-img { transform: scale(1.06); }
        .booking-card:hover .booking-card-arrow { transform: translateX(3px); opacity: 1 !important; }
        .browse-btn:hover { background: #6a3214 !important; }
        .section-label {
          font-family: var(--font-bebas);
          font-size: 1.25rem;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          margin: 0 0 1rem;
        }
        .empty-note { font-size: 0.78rem; opacity: 0.35; }
      `}</style>

      <div style={{ display: "flex", flexDirection: "column", gap: "2.5rem" }}>
        {/* Upcoming */}
        <section>
          <h2 className="section-label">Upcoming</h2>
          {upcoming.length > 0 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              {upcoming.map((b) => (
                <BookingCard key={b.id} booking={b} />
              ))}
            </div>
          ) : (
            <p className="empty-note">No upcoming bookings.</p>
          )}
        </section>

        {/* Past */}
        <section>
          <h2 className="section-label">Past</h2>
          {past.length > 0 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              {past.map((b) => (
                <BookingCard key={b.id} booking={b} />
              ))}
            </div>
          ) : (
            <p className="empty-note">No past bookings in the last 12 months.</p>
          )}
        </section>
      </div>
    </>
  )
}
