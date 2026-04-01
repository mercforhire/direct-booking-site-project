import { notFound } from "next/navigation"
import Image from "next/image"
import Link from "next/link"
import { getLandlordBySlug } from "@/lib/landlord"
import { prisma } from "@/lib/prisma"
import { BookingForm } from "@/components/guest/booking-form"
import { createClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"

export default async function LandlordBookPage({
  params,
  searchParams,
}: {
  params: Promise<{ landlord: string; id: string }>
  searchParams: Promise<{
    checkin?: string
    checkout?: string
    guests?: string
  }>
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
      location: true,
      baseNightlyRate: true,
      cleaningFee: true,
      extraGuestFee: true,
      baseGuests: true,
      maxGuests: true,
      bookingWindowMonths: true,
      minStayNights: true,
      maxStayNights: true,
      landlordId: true,
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

  const settings = await prisma.settings.findUnique({ where: { landlordId: room.landlordId } })
  if (!settings) notFound()

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const isLoggedIn = !!user
  const guestUserId = user?.id ?? undefined
  const prefillData = isLoggedIn
    ? {
        name: (user!.user_metadata?.name as string) ?? "",
        email: user!.email ?? "",
        phone: (user!.user_metadata?.phone as string) ?? "",
      }
    : undefined

  const baseNightlyRate = Number(room.baseNightlyRate)
  const cleaningFee = Number(room.cleaningFee)
  const extraGuestFee = Number(room.extraGuestFee)
  const addOns = room.addOns.map((a) => ({ ...a, price: Number(a.price) }))
  const serviceFeePercent = Number(settings.serviceFeePercent)
  const depositAmount = Number(settings.depositAmount)

  const blockedDateStrings = room.blockedDates.map((b) =>
    b.date.toISOString().slice(0, 10)
  )

  const rawPriceOverrides = await prisma.datePriceOverride.findMany({
    where: { roomId: room.id },
    select: { date: true, price: true },
  })
  const perDayRates: Record<string, number> = {}
  for (const o of rawPriceOverrides) {
    perDayRates[o.date.toISOString().slice(0, 10)] = Number(o.price)
  }

  const coverPhoto = room.photos[0]?.url ?? null

  return (
    <div className="booking-dark">
      <style>{`
        .bk-fade { animation: fadeUp 0.8s cubic-bezier(0.16,1,0.3,1) both; }
        .bk-fade-2 { animation: fadeUp 0.8s 0.1s cubic-bezier(0.16,1,0.3,1) both; }
        .bk-section {
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 10px;
          padding: 1.5rem;
        }
        .bk-section-label {
          font-size: 0.65rem;
          letter-spacing: 0.22em;
          text-transform: uppercase;
          opacity: 0.4;
          margin-bottom: 0.75rem;
        }
        .bk-section h2 {
          font-family: var(--font-bebas) !important;
          font-size: 1.3rem !important;
          letter-spacing: 0.08em !important;
          text-transform: uppercase !important;
          color: ${landlord.textColor} !important;
          margin: 0 0 1rem !important;
          font-weight: 400 !important;
        }
        .booking-dark input[type="text"],
        .booking-dark input[type="email"],
        .booking-dark input[type="tel"],
        .booking-dark input[type="number"],
        .booking-dark input[type="password"],
        .booking-dark textarea {
          background: rgba(255,255,255,0.05) !important;
          border: 1px solid rgba(255,255,255,0.12) !important;
          color: ${landlord.textColor} !important;
          border-radius: 8px !important;
          transition: border-color 0.2s ease, box-shadow 0.2s ease !important;
        }
        .booking-dark input::placeholder,
        .booking-dark textarea::placeholder { color: ${landlord.textColor}40 !important; }
        .booking-dark input:focus,
        .booking-dark textarea:focus {
          border-color: ${landlord.accentColor}99 !important;
          box-shadow: 0 0 0 3px ${landlord.accentColor}1F !important;
          outline: none !important;
        }
        .booking-dark input::-webkit-outer-spin-button,
        .booking-dark input::-webkit-inner-spin-button { opacity: 0.3; }
        .booking-dark label {
          color: ${landlord.textColor}A6 !important;
          font-size: 0.78rem !important;
          letter-spacing: 0.04em !important;
        }
        .booking-dark [role="checkbox"] {
          border: 1px solid rgba(255,255,255,0.25) !important;
          background: rgba(255,255,255,0.05) !important;
          border-radius: 4px !important;
          width: 16px !important;
          height: 16px !important;
          transition: all 0.15s ease !important;
        }
        .booking-dark [data-state="checked"] {
          background: ${landlord.accentColor} !important;
          border-color: ${landlord.accentColor} !important;
        }
        .price-card {
          background: rgba(255,255,255,0.04) !important;
          border: 1px solid rgba(255,255,255,0.08) !important;
          border-radius: 10px !important;
        }
        .price-card .text-gray-500 { color: ${landlord.textColor}73 !important; }
        .price-card .text-gray-400 { color: ${landlord.textColor}59 !important; }
        .price-card .text-gray-800 { color: ${landlord.textColor} !important; }
        .price-card .text-sm { color: ${landlord.textColor}CC !important; }
        .price-card .font-semibold { color: ${landlord.textColor} !important; }
        .price-card [role="separator"],
        .price-card hr,
        .price-card .shrink-0 { background: rgba(255,255,255,0.1) !important; }
        .booking-dark .bg-red-50 {
          background: rgba(248,113,113,0.08) !important;
          border-color: rgba(248,113,113,0.3) !important;
        }
        .booking-dark .text-red-700 { color: #f87171 !important; }
        .booking-dark .text-red-500 { color: #f87171 !important; }
        .booking-dark .rdp-root {
          --rdp-accent-color: ${landlord.accentColor};
          --rdp-accent-background-color: ${landlord.accentColor}2E;
          --rdp-background-color: rgba(255,255,255,0.07);
          color: ${landlord.textColor};
          background: transparent;
        }
        .booking-dark .rdp-month_caption,
        .booking-dark .rdp-caption_label { color: ${landlord.textColor} !important; }
        .booking-dark .rdp-nav button { color: ${landlord.textColor}99 !important; }
        .booking-dark .rdp-nav button:hover { color: ${landlord.textColor} !important; background: rgba(255,255,255,0.07) !important; }
        .booking-dark .rdp-weekday { color: ${landlord.textColor}4D !important; font-size: 0.7rem !important; }
        .booking-dark .rdp-day_button { color: ${landlord.textColor} !important; border-radius: 6px !important; }
        .booking-dark .rdp-disabled .rdp-day_button,
        .booking-dark .rdp-day.rdp-disabled .rdp-day_button { color: ${landlord.textColor}33 !important; }
        .booking-dark .rdp-selected .rdp-day_button,
        .booking-dark .rdp-range_start .rdp-day_button,
        .booking-dark .rdp-range_end .rdp-day_button {
          background: ${landlord.accentColor} !important;
          color: #2a1608 !important;
          font-weight: 700 !important;
        }
        .booking-dark .rdp-range_middle .rdp-day_button {
          background: ${landlord.accentColor}26 !important;
          color: ${landlord.textColor} !important;
        }
        .booking-dark .rdp-outside .rdp-day_button { opacity: 0.2 !important; }
        .bk-submit-btn {
          background: #7c3d18 !important;
          color: ${landlord.textColor} !important;
          border: none !important;
          border-radius: 9999px !important;
          padding: 0.9rem 2rem !important;
          font-size: 0.82rem !important;
          font-weight: 700 !important;
          letter-spacing: 0.18em !important;
          text-transform: uppercase !important;
          transition: background 0.2s ease !important;
          width: 100% !important;
          cursor: pointer !important;
        }
        .bk-submit-btn:hover:not(:disabled) { background: #6a3214 !important; }
        .bk-submit-btn:disabled { opacity: 0.4 !important; cursor: not-allowed !important; }
        @media (max-width: 640px) {
          .book-pad { padding: 0 1.5rem 3rem !important; }
          .book-hdr { padding: 2rem 1.5rem 1rem !important; }
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
          href={`${base}/rooms/${id}`}
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
          ← {room.name}
        </Link>

        {isLoggedIn ? (
          <Link
            href={`${base}/my-bookings`}
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
        ) : (
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <Link
              href={`${base}/guest/login`}
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
              Sign In
            </Link>
            <Link
              href={`${base}/guest/signup`}
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
              Sign Up
            </Link>
          </div>
        )}
      </nav>

      {/* ── Page header ─────────────────────────────────── */}
      <div className="bk-fade book-hdr" style={{ padding: "2.5rem 3rem 1.5rem" }}>
        <div
          style={{
            fontSize: "0.65rem",
            letterSpacing: "0.22em",
            textTransform: "uppercase",
            opacity: 0.35,
            marginBottom: "0.6rem",
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
            margin: "0 0 1.1rem",
            color: landlord.textColor,
          }}
        >
          Request to{" "}
          <span style={{ color: landlord.accentColor }}>Book</span>
        </h1>

        {/* Room pill */}
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.65rem",
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.09)",
            borderRadius: "9999px",
            padding: "0.4rem 0.9rem 0.4rem 0.4rem",
          }}
        >
          {coverPhoto && (
            <div
              style={{
                width: "2rem",
                height: "2rem",
                borderRadius: "9999px",
                overflow: "hidden",
                flexShrink: 0,
                position: "relative",
              }}
            >
              <Image
                src={coverPhoto}
                alt={room.name}
                fill
                style={{ objectFit: "cover" }}
                sizes="32px"
              />
            </div>
          )}
          <div>
            <div
              style={{
                fontSize: "0.82rem",
                fontWeight: 600,
                color: landlord.accentColor,
                lineHeight: 1.2,
              }}
            >
              {room.name}
            </div>
            <div style={{ fontSize: "0.68rem", opacity: 0.45, lineHeight: 1.2 }}>
              ${baseNightlyRate.toFixed(2)}/night &middot; up to {room.maxGuests} guest
              {room.maxGuests !== 1 ? "s" : ""}
            </div>
          </div>
        </div>
      </div>

      {/* ── Form ────────────────────────────────────────── */}
      <main className="bk-fade-2 book-pad" style={{ padding: "0.5rem 3rem 5rem" }}>
        <BookingForm
          room={{
            id: room.id,
            name: room.name,
            baseNightlyRate,
            cleaningFee,
            extraGuestFee,
            baseGuests: room.baseGuests,
            maxGuests: room.maxGuests,
            bookingWindowMonths: room.bookingWindowMonths,
            minStayNights: room.minStayNights,
            maxStayNights: room.maxStayNights,
            addOns,
          }}
          settings={{ serviceFeePercent, depositAmount }}
          blockedDateStrings={blockedDateStrings}
          perDayRates={perDayRates}
          defaultCheckin={checkin}
          defaultCheckout={checkout}
          defaultGuests={guests ? parseInt(guests, 10) : 1}
          isLoggedIn={isLoggedIn}
          prefillData={prefillData}
          guestUserId={guestUserId}
        />
      </main>
    </div>
  )
}
