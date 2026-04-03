import { notFound } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { getLandlordBySlug } from "@/lib/landlord"
import { prisma } from "@/lib/prisma"
import { stripe } from "@/lib/stripe"
import { createClient } from "@/lib/supabase/server"
import { Resend } from "resend"
import { render } from "@react-email/render"
import { BookingPaymentConfirmationEmail } from "@/emails/booking-payment-confirmation"
import { BookingExtensionPaidEmail } from "@/emails/booking-extension-paid"
import { BookingDateChangePaidEmail } from "@/emails/booking-date-change-paid"
import { BookingStatusView } from "@/components/guest/booking-status-view"
import type { SerializedDateChange } from "@/components/guest/booking-status-view"

export const dynamic = "force-dynamic"

export default async function LandlordBookingPage({
  params,
  searchParams,
}: {
  params: Promise<{ landlord: string; id: string }>
  searchParams: Promise<{ token?: string; new?: string; paid?: string; extension_paid?: string; date_change_paid?: string }>
}) {
  const { landlord: slug, id } = await params
  const landlord = await getLandlordBySlug(slug)
  if (!landlord) notFound()

  const base = `/${slug}`
  const { token, new: isNew, paid, extension_paid, date_change_paid } = await searchParams

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const booking = await prisma.booking.findUnique({
    where: { id },
    include: {
      room: {
        select: {
          name: true,
          location: true,
          landlordId: true,
          addOns: { select: { id: true, name: true, price: true } },
          blockedDates: { select: { date: true } },
          photos: { orderBy: { position: "asc" }, take: 1, select: { url: true } },
        },
      },
    },
  })

  if (!booking) notFound()

  // Verify the booking belongs to this landlord
  if (booking.room.landlordId !== landlord.id) notFound()

  const hasAuth = !!(
    user &&
    (booking.guestUserId === user.id || booking.guestEmail === user.email)
  )
  const hasToken = !!(token && token === booking.accessToken)

  if (!hasAuth && !hasToken) notFound()

  // Webhook fallback: if guest returns from Stripe (?paid=1) and booking is still APPROVED
  if (paid === "1" && booking.status === "APPROVED" && booking.stripeSessionId) {
    try {
      const session = await stripe.checkout.sessions.retrieve(booking.stripeSessionId)
      if (session.payment_status === "paid") {
        const updated = await prisma.booking.updateMany({
          where: { id, status: "APPROVED" },
          data: { status: "PAID" },
        })
        if (updated.count > 0) {
          const freshBooking = await prisma.booking.findUnique({
            where: { id },
            include: { room: { select: { name: true } } },
          })
          if (freshBooking) {
            booking.status = "PAID"
            try {
              const resend = new Resend(process.env.RESEND_API_KEY)
              const html = await render(
                BookingPaymentConfirmationEmail({
                  guestName: freshBooking.guestName,
                  roomName: freshBooking.room.name,
                  checkin: freshBooking.checkin.toISOString().slice(0, 10),
                  checkout: freshBooking.checkout.toISOString().slice(0, 10),
                  amountPaid: Number(freshBooking.confirmedPrice),
                  bookingId: freshBooking.id,
                })
              )
              await resend.emails.send({
                from: process.env.RESEND_FROM_EMAIL ?? "noreply@example.com",
                to: freshBooking.guestEmail,
                subject: `Booking confirmed — ${freshBooking.room.name}`,
                html,
              })
            } catch { /* Non-fatal */ }
          }
        }
      }
    } catch { /* Non-fatal */ }
  }

  const settings = await prisma.settings.findUnique({ where: { landlordId: landlord.id } })

  let activeExtension = await prisma.bookingExtension.findFirst({
    where: { bookingId: id },
    orderBy: { createdAt: "desc" },
  })

  // Webhook fallback: extension payment
  if (extension_paid === "1" && activeExtension?.status === "APPROVED" && activeExtension.stripeSessionId) {
    try {
      const extSession = await stripe.checkout.sessions.retrieve(activeExtension.stripeSessionId)
      if (extSession.payment_status === "paid") {
        const updated = await prisma.bookingExtension.updateMany({
          where: { id: activeExtension.id, status: "APPROVED" },
          data: { status: "PAID" },
        })
        if (updated.count > 0) {
          const freshBooking = await prisma.booking.update({
            where: { id },
            data: { checkout: activeExtension.requestedCheckout },
            include: { room: { select: { name: true } } },
          })
          activeExtension = { ...activeExtension, status: "PAID" }
          booking.checkout = activeExtension.requestedCheckout
          try {
            const resend = new Resend(process.env.RESEND_API_KEY)
            const html = await render(
              BookingExtensionPaidEmail({
                guestName: freshBooking.guestName,
                roomName: freshBooking.room.name,
                checkin: freshBooking.checkin.toISOString().slice(0, 10),
                newCheckout: activeExtension.requestedCheckout.toISOString().slice(0, 10),
                extensionAmountPaid: Number(activeExtension.extensionPrice ?? 0),
                bookingId: freshBooking.id,
                accessToken: freshBooking.accessToken,
                landlordSlug: slug,
              })
            )
            await resend.emails.send({
              from: process.env.RESEND_FROM_EMAIL ?? "noreply@example.com",
              to: freshBooking.guestEmail,
              subject: `Extension confirmed — ${freshBooking.room.name}`,
              html,
            })
          } catch { /* Non-fatal */ }
        }
      }
    } catch { /* Non-fatal */ }
  }

  let activeDateChangeRecord = await prisma.bookingDateChange.findFirst({
    where: { bookingId: id, status: { in: ["PENDING", "APPROVED", "PAID"] } },
    orderBy: { createdAt: "desc" },
  })

  // Webhook fallback: date change payment
  if (date_change_paid === "1" && activeDateChangeRecord?.status === "APPROVED" && activeDateChangeRecord.stripeSessionId) {
    try {
      const dcSession = await stripe.checkout.sessions.retrieve(activeDateChangeRecord.stripeSessionId)
      if (dcSession.payment_status === "paid") {
        await prisma.$transaction([
          prisma.bookingDateChange.update({
            where: { id: activeDateChangeRecord.id, status: "APPROVED" },
            data: { status: "PAID" },
          }),
          prisma.booking.update({
            where: { id },
            data: {
              checkin: new Date(activeDateChangeRecord.requestedCheckin),
              checkout: new Date(activeDateChangeRecord.requestedCheckout),
              confirmedPrice: activeDateChangeRecord.newPrice,
            },
          }),
        ])
        activeDateChangeRecord = { ...activeDateChangeRecord, status: "PAID" }
        booking.checkin = new Date(activeDateChangeRecord.requestedCheckin)
        booking.checkout = new Date(activeDateChangeRecord.requestedCheckout)
        try {
          const freshBooking = await prisma.booking.findUnique({
            where: { id },
            include: { room: { select: { name: true } } },
          })
          if (freshBooking) {
            const resend = new Resend(process.env.RESEND_API_KEY)
            const html = await render(
              BookingDateChangePaidEmail({
                guestName: freshBooking.guestName,
                roomName: freshBooking.room.name,
                newCheckin: freshBooking.checkin.toISOString().slice(0, 10),
                newCheckout: freshBooking.checkout.toISOString().slice(0, 10),
                amountPaid: Number(activeDateChangeRecord.newPrice ?? 0),
                bookingId: freshBooking.id,
                accessToken: freshBooking.accessToken,
                landlordSlug: slug,
              })
            )
            await resend.emails.send({
              from: process.env.RESEND_FROM_EMAIL ?? "noreply@example.com",
              to: freshBooking.guestEmail,
              subject: `Date change confirmed — ${freshBooking.room.name}`,
              html,
            })
          }
        } catch { /* Non-fatal */ }
      }
    } catch { /* Non-fatal */ }
  }

  const messages = await prisma.message.findMany({
    where: { bookingId: booking.id },
    orderBy: { createdAt: "asc" },
  })
  const serializedMessages = messages.map((m) => ({
    id: m.id,
    sender: m.sender as "GUEST" | "LANDLORD",
    senderName: m.senderName,
    body: m.body,
    createdAt: m.createdAt.toISOString(),
  }))

  const serializedDateChange: SerializedDateChange | null = activeDateChangeRecord
    ? {
        id: activeDateChangeRecord.id,
        bookingId: activeDateChangeRecord.bookingId,
        requestedCheckin: activeDateChangeRecord.requestedCheckin.toISOString(),
        requestedCheckout: activeDateChangeRecord.requestedCheckout.toISOString(),
        newPrice: activeDateChangeRecord.newPrice != null ? Number(activeDateChangeRecord.newPrice) : null,
        status: activeDateChangeRecord.status as "PENDING" | "APPROVED" | "DECLINED" | "PAID",
        declineReason: activeDateChangeRecord.declineReason,
        stripeSessionId: activeDateChangeRecord.stripeSessionId,
        createdAt: activeDateChangeRecord.createdAt.toISOString(),
      }
    : null

  const serializedExtension = activeExtension
    ? {
        ...activeExtension,
        extensionPrice:
          activeExtension.extensionPrice != null
            ? Number(activeExtension.extensionPrice)
            : null,
        requestedCheckout: activeExtension.requestedCheckout.toISOString(),
        createdAt: activeExtension.createdAt.toISOString(),
        updatedAt: activeExtension.updatedAt.toISOString(),
      }
    : null

  const blockedDateStrings = booking.room.blockedDates.map((d) =>
    d.date.toISOString()
  )

  const serializedBooking = {
    ...booking,
    estimatedTotal: Number(booking.estimatedTotal),
    confirmedPrice: booking.confirmedPrice != null ? Number(booking.confirmedPrice) : null,
    stripeSessionId: booking.stripeSessionId ?? null,
    refundAmount: booking.refundAmount != null ? Number(booking.refundAmount) : null,
    cancelledAt: booking.cancelledAt ? booking.cancelledAt.toISOString() : null,
    checkin: booking.checkin.toISOString(),
    checkout: booking.checkout.toISOString(),
    createdAt: booking.createdAt.toISOString(),
    updatedAt: booking.updatedAt.toISOString(),
    room: {
      ...booking.room,
      addOns: booking.room.addOns.map((a) => ({
        ...a,
        price: Number(a.price),
      })),
      coverPhoto: booking.room.photos[0]?.url ?? null,
    },
  }

  return (
    <div className="bk-status">
      <style>{`
        .bs-fade { animation: fadeUp 0.8s cubic-bezier(0.16,1,0.3,1) both; }
        .bs-card {
          background: color-mix(in srgb, var(--ll-text) 3%, transparent);
          border: 1px solid color-mix(in srgb, var(--ll-text) 7%, transparent);
          border-radius: 10px;
          overflow: hidden;
        }
        .bs-row { padding: 0.85rem 1.25rem; border-bottom: 1px solid color-mix(in srgb, var(--ll-text) 5%, transparent); }
        .bs-row:last-child { border-bottom: none; }
        .bs-label { font-size: 0.62rem; letter-spacing: 0.2em; text-transform: uppercase; opacity: 0.35; margin-bottom: 0.3rem; }
        .bs-value { font-size: 0.88rem; color: var(--ll-text); }
        .bs-banner-success { background: rgba(52,211,153,0.08); border: 1px solid rgba(52,211,153,0.25); border-radius: 10px; padding: 1rem 1.25rem; color: #6ee7b7; font-size: 0.85rem; display: flex; align-items: center; gap: 0.65rem; }
        .bs-banner-info { background: ${landlord.accentColor}14; border: 1px solid ${landlord.accentColor}40; border-radius: 10px; padding: 1rem 1.25rem; color: ${landlord.accentColor}; font-size: 0.85rem; display: flex; align-items: center; gap: 0.65rem; }
        .bk-status h2 { font-family: var(--font-bebas) !important; font-size: 1.3rem !important; letter-spacing: 0.08em !important; text-transform: uppercase !important; color: var(--ll-text) !important; font-weight: 400 !important; margin: 0 0 1rem !important; }
        .bk-status .bg-white { background: color-mix(in srgb, var(--ll-text) 3%, transparent) !important; }
        .bk-status .border-gray-200 { border-color: color-mix(in srgb, var(--ll-text) 8%, transparent) !important; }
        .bk-status .divide-y > * + * { border-top: 1px solid color-mix(in srgb, var(--ll-text) 6%, transparent) !important; }
        .bk-status .divide-gray-100 > * + * { border-top-color: color-mix(in srgb, var(--ll-text) 6%, transparent) !important; }
        .bk-status .text-gray-900 { color: var(--ll-text) !important; }
        .bk-status .text-gray-700 { color: var(--ll-text)B8 !important; }
        .bk-status .text-gray-600 { color: var(--ll-text)99 !important; }
        .bk-status .text-gray-500 { color: var(--ll-text)73 !important; }
        .bk-status .text-gray-400 { color: var(--ll-text)59 !important; }
        .bk-status .text-muted-foreground { color: var(--ll-text)66 !important; }
        .bk-status .border-t { border-color: color-mix(in srgb, var(--ll-text) 7%, transparent) !important; }
        .bk-status .border-t.border-gray-100 { border-top-color: color-mix(in srgb, var(--ll-text) 7%, transparent) !important; }
        .bk-status .bg-green-50 { background: rgba(52,211,153,0.07) !important; }
        .bk-status .border-green-200 { border-color: rgba(52,211,153,0.25) !important; }
        .bk-status .text-green-800 { color: #6ee7b7 !important; }
        .bk-status .bg-red-50 { background: rgba(248,113,113,0.07) !important; }
        .bk-status .border-red-200 { border-color: rgba(248,113,113,0.25) !important; }
        .bk-status .text-red-700, .bk-status .text-red-800 { color: #f87171 !important; }
        .bk-status .border-destructive\\/30 { border-color: rgba(248,113,113,0.25) !important; }
        .bk-status .bg-destructive\\/5 { background: rgba(248,113,113,0.07) !important; }
        .bk-status .text-destructive { color: #f87171 !important; }
        .bk-status .bg-yellow-50 { background: rgba(251,191,36,0.07) !important; }
        .bk-status .border-yellow-200 { border-color: rgba(251,191,36,0.25) !important; }
        .bk-status .text-yellow-800 { color: #fcd34d !important; }
        .bk-status .bg-blue-50 { background: rgba(96,165,250,0.07) !important; }
        .bk-status .border-blue-200 { border-color: rgba(96,165,250,0.25) !important; }
        .bk-status .text-blue-800 { color: #93c5fd !important; }
        .bk-status input[type="date"],
        .bk-status textarea { background: color-mix(in srgb, var(--ll-text) 5%, transparent) !important; border: 1px solid color-mix(in srgb, var(--ll-text) 12%, transparent) !important; color: var(--ll-text) !important; border-radius: 8px !important; }
        .bk-status input[type="date"]:focus,
        .bk-status textarea:focus { border-color: ${landlord.accentColor}80 !important; box-shadow: 0 0 0 3px ${landlord.accentColor}1A !important; outline: none !important; }
        .bk-status input::placeholder,
        .bk-status textarea::placeholder { color: var(--ll-text)40 !important; }
        .bk-status .bg-blue-600 { background: var(--ll-accent) !important; border-radius: 9999px !important; letter-spacing: 0.1em !important; }
        .bk-status .bg-blue-600:hover { background: #6a3214 !important; }
        .bk-status .hover\\:bg-blue-700:hover { background: #6a3214 !important; }
        .bk-status button[class*="bg-primary"],
        .bk-status .inline-flex.bg-primary { background: var(--ll-accent) !important; color: var(--ll-text) !important; border-radius: 9999px !important; }
        .bk-status button[class*="border"][class*="bg-background"],
        .bk-status .inline-flex.border.bg-background { background: transparent !important; border-color: color-mix(in srgb, var(--ll-text) 20%, transparent) !important; color: var(--ll-text)A6 !important; border-radius: 9999px !important; }
        .bk-status .font-mono { color: var(--ll-text)8C !important; }
        @media (max-width: 640px) {
          .bs-content { padding: 1.5rem 1.5rem 4rem !important; }
        }
      `}</style>

      {/* ── Nav ────────────────────────────────────────────── */}
      <nav
        className="nav-pad"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "1.4rem 3rem",
          borderBottom: "1px solid color-mix(in srgb, var(--ll-text) 8%, transparent)",
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
          href={`${base}/guest/login?next=${base}/my-bookings`}
          className="my-bookings-btn"
          style={{
            border: "1px solid color-mix(in srgb, var(--ll-text) 18%, transparent)",
            color: `var(--ll-text)99`,
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

      {/* ── Cover photo ─────────────────────────────────────── */}
      {serializedBooking.room.coverPhoto && (
        <div
          style={{
            position: "relative",
            height: "280px",
            overflow: "hidden",
            background: "#2a2618",
          }}
        >
          <Image
            src={serializedBooking.room.coverPhoto}
            alt={serializedBooking.room.name}
            fill
            style={{ objectFit: "cover" }}
            priority
            sizes="100vw"
          />
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: `linear-gradient(to bottom, transparent 40%, ${landlord.bgColor} 100%)`,
            }}
          />
          <div
            style={{
              position: "absolute",
              bottom: "1.5rem",
              left: "50%",
              transform: "translateX(-50%)",
              maxWidth: "680px",
              width: "100%",
              padding: "0 3rem",
              boxSizing: "border-box",
            }}
          >
            <div
              style={{
                fontFamily: "var(--font-bebas)",
                fontSize: "clamp(2rem, 5vw, 3rem)",
                letterSpacing: "0.04em",
                textTransform: "uppercase",
                lineHeight: 1,
                color: landlord.textColor,
                textShadow: "0 2px 12px rgba(0,0,0,0.4)",
              }}
            >
              {serializedBooking.room.name}
            </div>
          </div>
        </div>
      )}

      {/* ── Content ─────────────────────────────────────────── */}
      <div
        className="bs-fade bs-content"
        style={{
          maxWidth: "680px",
          margin: "0 auto",
          padding: serializedBooking.room.coverPhoto ? "1.5rem 3rem 5rem" : "2.5rem 3rem 5rem",
        }}
      >
        <BookingStatusView
          booking={serializedBooking}
          showSuccessBanner={isNew === "1"}
          showPaidBanner={paid === "1"}
          showExtensionPaidBanner={extension_paid === "1"}
          showDateChangePaidBanner={date_change_paid === "1"}
          etransferEmail={settings?.etransferEmail ?? null}
          activeExtension={serializedExtension}
          activeDateChange={serializedDateChange}
          blockedDates={blockedDateStrings}
          messages={serializedMessages}
          token={token ?? null}
        />
      </div>
    </div>
  )
}
