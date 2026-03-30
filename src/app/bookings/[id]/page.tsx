import { notFound, redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { stripe } from "@/lib/stripe"
import { createClient } from "@/lib/supabase/server"
import { Resend } from "resend"
import { render } from "@react-email/render"
import { BookingPaymentConfirmationEmail } from "@/emails/booking-payment-confirmation"
import { BookingExtensionPaidEmail } from "@/emails/booking-extension-paid"
import { BookingStatusView } from "@/components/guest/booking-status-view"
import type { SerializedDateChange } from "@/components/guest/booking-status-view"

export const dynamic = "force-dynamic"

export default async function BookingPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ token?: string; new?: string; paid?: string; extension_paid?: string }>
}) {
  const { id } = await params
  const { token, new: isNew, paid, extension_paid } = await searchParams

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const booking = await prisma.booking.findUnique({
    where: { id },
    include: {
      room: {
        select: {
          name: true,
          location: true,
          addOns: {
            select: { id: true, name: true, price: true },
          },
          blockedDates: { select: { date: true } },
        },
      },
    },
  })

  if (!booking) notFound()

  // Primary: session user owns this booking by ID
  // Fallback: session user's email matches guest email (covers bookings where
  // guestUserId was not set due to account creation failing on a duplicate email)
  const hasAuth = !!(
    user &&
    (booking.guestUserId === user.id || booking.guestEmail === user.email)
  )
  const hasToken = !!(token && token === booking.accessToken)

  if (!hasAuth && !hasToken) {
    redirect(`/guest/login?next=/bookings/${id}`)
  }

  // Webhook fallback: if guest returns from Stripe (?paid=1) and booking is still APPROVED,
  // verify payment directly and mark PAID + send confirmation email.
  // The webhook may not have fired yet (local dev, race condition, etc).
  if (paid === "1" && booking.status === "APPROVED" && booking.stripeSessionId) {
    try {
      const session = await stripe.checkout.sessions.retrieve(booking.stripeSessionId)
      if (session.payment_status === "paid") {
        const updated = await prisma.booking.updateMany({
          where: { id, status: "APPROVED" },
          data: { status: "PAID" },
        })
        if (updated.count > 0) {
          // Re-fetch booking with room for email
          const freshBooking = await prisma.booking.findUnique({
            where: { id },
            include: { room: { select: { name: true } } },
          })
          if (freshBooking) {
            // Update local reference so the page renders PAID status
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
            } catch {
              // Non-fatal: page still renders correctly
            }
          }
        }
      }
    } catch {
      // Non-fatal: if Stripe check fails, render page as-is
    }
  }

  // Fetch settings for etransferEmail
  const settings = await prisma.settings.findUnique({ where: { id: "global" } })

  // Load the most recent extension (if any)
  let activeExtension = await prisma.bookingExtension.findFirst({
    where: { bookingId: id },
    orderBy: { createdAt: "desc" },
  })

  // Webhook fallback: if guest returns from Stripe (?extension_paid=1) and extension is still APPROVED,
  // verify payment directly and mark PAID + update booking checkout date.
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
              })
            )
            await resend.emails.send({
              from: process.env.RESEND_FROM_EMAIL ?? "noreply@example.com",
              to: freshBooking.guestEmail,
              subject: `Extension confirmed — ${freshBooking.room.name}`,
              html,
            })
          } catch {
            // Non-fatal
          }
        }
      }
    } catch {
      // Non-fatal: page still renders correctly
    }
  }

  // Load messages ordered oldest-first
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

  // Load active date change request (PENDING or APPROVED)
  const activeDateChangeRecord = await prisma.bookingDateChange.findFirst({
    where: { bookingId: id, status: { in: ["PENDING", "APPROVED"] } },
    orderBy: { createdAt: "desc" },
  })
  const serializedDateChange: SerializedDateChange | null = activeDateChangeRecord
    ? {
        id: activeDateChangeRecord.id,
        bookingId: activeDateChangeRecord.bookingId,
        requestedCheckin: activeDateChangeRecord.requestedCheckin.toISOString(),
        requestedCheckout: activeDateChangeRecord.requestedCheckout.toISOString(),
        newPrice: activeDateChangeRecord.newPrice != null ? Number(activeDateChangeRecord.newPrice) : null,
        status: activeDateChangeRecord.status as "PENDING" | "APPROVED" | "DECLINED",
        declineReason: activeDateChangeRecord.declineReason,
        stripeSessionId: activeDateChangeRecord.stripeSessionId,
        createdAt: activeDateChangeRecord.createdAt.toISOString(),
      }
    : null

  // Serialize extension — coerce Decimal and Date at RSC boundary
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

  // Serialize blocked dates as ISO strings (Date objects cannot cross RSC boundary)
  const blockedDateStrings = booking.room.blockedDates.map((d) =>
    d.date.toISOString()
  )

  // Coerce Decimals at RSC boundary — Prisma Decimal objects cannot be serialized as Client Component props
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
    },
  }

  return (
    <BookingStatusView
      booking={serializedBooking}
      showSuccessBanner={isNew === "1"}
      showPaidBanner={paid === "1"}
      showExtensionPaidBanner={extension_paid === "1"}
      etransferEmail={settings?.etransferEmail ?? null}
      activeExtension={serializedExtension}
      activeDateChange={serializedDateChange}
      blockedDates={blockedDateStrings}
      messages={serializedMessages}
      token={token ?? null}
    />
  )
}
