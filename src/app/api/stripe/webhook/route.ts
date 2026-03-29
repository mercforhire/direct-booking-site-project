import { NextResponse } from "next/server"
import { headers } from "next/headers"
import Stripe from "stripe"
import { stripe } from "@/lib/stripe"
import { prisma } from "@/lib/prisma"
import { Resend } from "resend"
import { BookingPaymentConfirmationEmail } from "@/emails/booking-payment-confirmation"
import { BookingExtensionPaidEmail } from "@/emails/booking-extension-paid"
import { render } from "@react-email/render"

export async function POST(request: Request) {
  const body = await request.text() // MUST be text() — raw body for HMAC verification
  const sig = (await headers()).get("stripe-signature")

  if (!sig) {
    return new NextResponse("No signature", { status: 400 })
  }

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    )
  } catch (err) {
    return new NextResponse(
      `Webhook error: ${(err as Error).message}`,
      { status: 400 }
    )
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session
    const metadataType = session.metadata?.type ?? "booking"

    if (metadataType === "extension") {
      // NEW: extension payment branch
      const extensionId = session.metadata?.extensionId
      if (!extensionId) {
        return new NextResponse("No extensionId in metadata", { status: 400 })
      }

      const extension = await prisma.bookingExtension.findUnique({
        where: { id: extensionId },
      })

      // Idempotent: no-op if already PAID
      if (extension && extension.status !== "PAID") {
        await prisma.$transaction([
          prisma.bookingExtension.update({
            where: { id: extensionId },
            data: { status: "PAID" },
          }),
          prisma.booking.update({
            where: { id: extension.bookingId },
            data: { checkout: extension.requestedCheckout },
          }),
        ])

        // Non-fatal email to guest
        try {
          const fullBooking = await prisma.booking.findUnique({
            where: { id: extension.bookingId },
            include: { room: { select: { name: true } } },
          })
          if (fullBooking) {
            const resend = new Resend(process.env.RESEND_API_KEY)
            const html = await render(
              BookingExtensionPaidEmail({
                guestName: fullBooking.guestName,
                roomName: fullBooking.room.name,
                checkin: fullBooking.checkin.toISOString().slice(0, 10),
                newCheckout: extension.requestedCheckout.toISOString().slice(0, 10),
                extensionAmountPaid: Number(extension.extensionPrice ?? 0),
                bookingId: fullBooking.id,
                accessToken: fullBooking.accessToken,
              })
            )
            await resend.emails.send({
              from: process.env.RESEND_FROM_EMAIL ?? "noreply@example.com",
              to: fullBooking.guestEmail,
              subject: `Extension confirmed — ${fullBooking.room.name}`,
              html,
            })
          }
        } catch {
          // Non-fatal: webhook always returns 200
        }
      }
    } else if (metadataType === "date_change_topup") {
      // Date change top-up payment branch
      const dateChangeId = session.metadata?.dateChangeId
      if (!dateChangeId) {
        return new NextResponse("No dateChangeId in metadata", { status: 400 })
      }

      const dateChange = await prisma.bookingDateChange.findUnique({
        where: { id: dateChangeId },
      })

      if (dateChange && dateChange.status === "APPROVED") {
        // Atomically mark PAID + update booking dates
        await prisma.$transaction([
          prisma.bookingDateChange.update({
            where: { id: dateChangeId },
            data: { status: "PAID" },
          }),
          prisma.booking.update({
            where: { id: dateChange.bookingId },
            data: {
              checkin: dateChange.requestedCheckin,
              checkout: dateChange.requestedCheckout,
              confirmedPrice: dateChange.newPrice,
            },
          }),
        ])
      }
      // Idempotent: skip if status is already PAID or DECLINED
    } else {
      // EXISTING BOOKING LOGIC — unchanged
      const bookingId = session.metadata?.bookingId

      if (!bookingId) {
        return new NextResponse("No bookingId in metadata", { status: 400 })
      }

      // Idempotent update: updateMany with APPROVED guard — no-op if already PAID
      const result = await prisma.booking.updateMany({
        where: { id: bookingId, status: "APPROVED" },
        data: { status: "PAID" },
      })

      // Send confirmation email only if we actually updated (count > 0)
      if (result.count > 0) {
        const booking = await prisma.booking.findUnique({
          where: { id: bookingId },
          include: { room: { select: { name: true } } },
        })

        if (booking) {
          try {
            const resend = new Resend(process.env.RESEND_API_KEY)
            await resend.emails.send({
              from: process.env.RESEND_FROM_EMAIL ?? "noreply@example.com",
              to: booking.guestEmail,
              subject: `Payment received — ${booking.room.name}`,
              react: BookingPaymentConfirmationEmail({
                guestName: booking.guestName,
                roomName: booking.room.name,
                checkin: booking.checkin.toISOString().slice(0, 10),
                checkout: booking.checkout.toISOString().slice(0, 10),
                amountPaid: Number(booking.confirmedPrice),
                bookingId: booking.id,
              }),
            })
          } catch {
            // Non-fatal: email failure does not fail the webhook
          }
        }
      }
    }
  }

  return NextResponse.json({ received: true })
}
