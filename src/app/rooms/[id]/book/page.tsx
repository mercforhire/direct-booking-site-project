import { notFound } from "next/navigation"
import Image from "next/image"
import Link from "next/link"
import { Bebas_Neue, DM_Sans } from "next/font/google"
import { prisma } from "@/lib/prisma"
import { BookingForm } from "@/components/guest/booking-form"
import { createClient } from "@/lib/supabase/server"

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

export default async function BookPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{
    checkin?: string
    checkout?: string
    guests?: string
  }>
}) {
  const { id } = await params
  const { checkin, checkout, guests } = await searchParams

  const room = await prisma.room.findUnique({
    where: { id, isActive: true },
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
    <div
      className={`${bebas.variable} ${dm.variable} booking-dark`}
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
        .bk-fade { animation: fadeUp 0.8s cubic-bezier(0.16,1,0.3,1) both; }
        .bk-fade-2 { animation: fadeUp 0.8s 0.1s cubic-bezier(0.16,1,0.3,1) both; }
        .back-link:hover { opacity: 1 !important; }
        .my-bookings-btn:hover { background: rgba(255,255,255,0.06) !important; }

        /* ── Section card styling ──────────────────────── */
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
          color: #f0ebe0 !important;
          margin: 0 0 1rem !important;
          font-weight: 400 !important;
        }

        /* ── Dark form inputs ──────────────────────────── */
        .booking-dark input[type="text"],
        .booking-dark input[type="email"],
        .booking-dark input[type="tel"],
        .booking-dark input[type="number"],
        .booking-dark input[type="password"],
        .booking-dark textarea {
          background: rgba(255,255,255,0.05) !important;
          border: 1px solid rgba(255,255,255,0.12) !important;
          color: #f0ebe0 !important;
          border-radius: 8px !important;
          transition: border-color 0.2s ease, box-shadow 0.2s ease !important;
        }
        .booking-dark input::placeholder,
        .booking-dark textarea::placeholder { color: rgba(240,235,224,0.25) !important; }
        .booking-dark input:focus,
        .booking-dark textarea:focus {
          border-color: rgba(212,149,106,0.6) !important;
          box-shadow: 0 0 0 3px rgba(212,149,106,0.12) !important;
          outline: none !important;
        }
        .booking-dark input::-webkit-outer-spin-button,
        .booking-dark input::-webkit-inner-spin-button { opacity: 0.3; }

        /* ── Labels ────────────────────────────────────── */
        .booking-dark label {
          color: rgba(240,235,224,0.65) !important;
          font-size: 0.78rem !important;
          letter-spacing: 0.04em !important;
        }

        /* ── Checkbox ──────────────────────────────────── */
        .booking-dark [role="checkbox"] {
          border: 1px solid rgba(255,255,255,0.25) !important;
          background: rgba(255,255,255,0.05) !important;
          border-radius: 4px !important;
          width: 16px !important;
          height: 16px !important;
          transition: all 0.15s ease !important;
        }
        .booking-dark [data-state="checked"] {
          background: #d4956a !important;
          border-color: #d4956a !important;
        }

        /* ── Price summary card ────────────────────────── */
        .price-card {
          background: rgba(255,255,255,0.04) !important;
          border: 1px solid rgba(255,255,255,0.08) !important;
          border-radius: 10px !important;
        }
        .price-card .text-gray-500 { color: rgba(240,235,224,0.45) !important; }
        .price-card .text-gray-400 { color: rgba(240,235,224,0.35) !important; }
        .price-card .text-gray-800 { color: #f0ebe0 !important; }
        .price-card .text-sm { color: rgba(240,235,224,0.8) !important; }
        .price-card .font-semibold { color: #f0ebe0 !important; }
        .price-card [role="separator"],
        .price-card hr,
        .price-card .shrink-0 { background: rgba(255,255,255,0.1) !important; }

        /* ── Error box ─────────────────────────────────── */
        .booking-dark .bg-red-50 {
          background: rgba(248,113,113,0.08) !important;
          border-color: rgba(248,113,113,0.3) !important;
        }
        .booking-dark .text-red-700 { color: #f87171 !important; }
        .booking-dark .text-red-500 { color: #f87171 !important; }

        /* ── DayPicker dark override ───────────────────── */
        .booking-dark .rdp-root {
          --rdp-accent-color: #d4956a;
          --rdp-accent-background-color: rgba(212,149,106,0.18);
          --rdp-background-color: rgba(255,255,255,0.07);
          color: #f0ebe0;
          background: transparent;
        }
        .booking-dark .rdp-month_caption,
        .booking-dark .rdp-caption_label { color: #f0ebe0 !important; }
        .booking-dark .rdp-nav button { color: rgba(240,235,224,0.6) !important; }
        .booking-dark .rdp-nav button:hover { color: #f0ebe0 !important; background: rgba(255,255,255,0.07) !important; }
        .booking-dark .rdp-weekday { color: rgba(240,235,224,0.3) !important; font-size: 0.7rem !important; }
        .booking-dark .rdp-day_button { color: #f0ebe0 !important; border-radius: 6px !important; }
        .booking-dark .rdp-disabled .rdp-day_button,
        .booking-dark .rdp-day.rdp-disabled .rdp-day_button { color: rgba(240,235,224,0.2) !important; }
        .booking-dark .rdp-selected .rdp-day_button,
        .booking-dark .rdp-range_start .rdp-day_button,
        .booking-dark .rdp-range_end .rdp-day_button {
          background: #d4956a !important;
          color: #2a1608 !important;
          font-weight: 700 !important;
        }
        .booking-dark .rdp-range_middle .rdp-day_button {
          background: rgba(212,149,106,0.15) !important;
          color: #f0ebe0 !important;
        }
        .booking-dark .rdp-outside .rdp-day_button { opacity: 0.2 !important; }

        /* ── Submit button ─────────────────────────────── */
        .bk-submit-btn {
          background: #7c3d18 !important;
          color: #f0ebe0 !important;
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
        .bk-submit-btn:disabled {
          opacity: 0.4 !important;
          cursor: not-allowed !important;
        }

        /* ── Mobile ────────────────────────────────────── */
        @media (max-width: 640px) {
          .book-pad { padding: 0 1.5rem 3rem !important; }
          .book-hdr { padding: 2rem 1.5rem 1rem !important; }
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
          href={`/rooms/${id}`}
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
          ← {room.name}
        </Link>

        {isLoggedIn ? (
          <Link
            href="/my-bookings"
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
        ) : (
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <Link
              href="/guest/login"
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
              Sign In
            </Link>
            <Link
              href="/guest/signup"
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
              Sign Up
            </Link>
          </div>
        )}
      </nav>

      {/* ── Page header ─────────────────────────────────── */}
      <div
        className="bk-fade book-hdr"
        style={{ padding: "2.5rem 3rem 1.5rem" }}
      >
        <div
          style={{
            fontSize: "0.65rem",
            letterSpacing: "0.22em",
            textTransform: "uppercase",
            opacity: 0.35,
            marginBottom: "0.6rem",
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
            margin: "0 0 1.1rem",
            color: "#f0ebe0",
          }}
        >
          Request to{" "}
          <span style={{ color: "#d4956a" }}>Book</span>
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
                color: "#d4956a",
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
      <main
        className="bk-fade-2 book-pad"
        style={{ padding: "0.5rem 3rem 5rem" }}
      >
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
