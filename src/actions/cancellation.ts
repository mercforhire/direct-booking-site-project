"use server"

import { prisma } from "@/lib/prisma"
import { getLandlordForAdmin } from "@/lib/landlord"
import { stripe } from "@/lib/stripe"
import { revalidatePath } from "next/cache"
import { Resend } from "resend"
import { render } from "@react-email/render"
import { cancelBookingSchema } from "@/lib/validations/cancellation"
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library"
import { BookingCancelledEmail } from "@/emails/booking-cancelled"
import { formatDateET } from "@/lib/format-date-et"

export async function cancelBooking(bookingId: string, data: unknown) {
  const landlord = await getLandlordForAdmin()

  const parsed = cancelBookingSchema.safeParse(data)
  if (!parsed.success) return { error: parsed.error.flatten() }
  const { refundAmount } = parsed.data

  // Fetch booking for payment method detection + email data
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { room: { select: { name: true, landlordId: true, landlord: { select: { slug: true } } } } },
  })
  if (!booking) return { error: "not_found" }
  if (booking.room.landlordId !== landlord.id) throw new Error("Booking not found")

  // Stripe refunds FIRST (hard block if any fail)
  if (booking.status === "PAID") {
    // Refund main booking Stripe payment
    if (booking.stripeSessionId) {
      const session = await stripe.checkout.sessions.retrieve(booking.stripeSessionId)
      if (!session.payment_intent || typeof session.payment_intent !== "string") {
        return { error: "no_payment_intent" }
      }
      try {
        await stripe.refunds.create({
          payment_intent: session.payment_intent,
          amount: Math.round(Number(booking.confirmedPrice ?? 0) * 100),
        })
      } catch (err) {
        return { error: "stripe_refund_failed", message: (err as Error).message }
      }
    }

    // Refund any Stripe-paid extensions
    const paidExtensions = await prisma.bookingExtension.findMany({
      where: { bookingId, status: "PAID", stripeSessionId: { not: null } },
      select: { stripeSessionId: true, extensionPrice: true },
    })
    for (const ext of paidExtensions) {
      const extSession = await stripe.checkout.sessions.retrieve(ext.stripeSessionId!)
      if (!extSession.payment_intent || typeof extSession.payment_intent !== "string") {
        return { error: "no_payment_intent" }
      }
      try {
        await stripe.refunds.create({
          payment_intent: extSession.payment_intent,
          amount: Math.round(Number(ext.extensionPrice ?? 0) * 100),
        })
      } catch (err) {
        return { error: "stripe_refund_failed", message: (err as Error).message }
      }
    }
  }

  // DB update (P2025 guard prevents cancelling non-cancellable bookings)
  try {
    await prisma.$transaction([
      prisma.booking.update({
        where: { id: bookingId, status: { in: ["APPROVED", "PAID"] } },
        data: {
          status: "CANCELLED",
          refundAmount: booking.status === "APPROVED" ? null : refundAmount,
          cancelledAt: new Date(),
        },
      }),
      prisma.bookingExtension.updateMany({
        where: { bookingId, status: { in: ["PENDING", "APPROVED", "PAID"] } },
        data: { status: "DECLINED" },
      }),
    ])
  } catch (err) {
    if (err instanceof PrismaClientKnownRequestError && err.code === "P2025") {
      return { error: "not_cancellable" }
    }
    throw err
  }

  // Determine payment method for email
  const paymentMethod =
    booking.status === "APPROVED"
      ? "none"
      : booking.stripeSessionId
        ? "stripe"
        : "etransfer"

  // Non-fatal email
  try {
    const resend = new Resend(process.env.RESEND_API_KEY)
    const html = await render(
      BookingCancelledEmail({
        guestName: booking.guestName,
        roomName: booking.room.name,
        checkin: formatDateET(booking.checkin),
        checkout: formatDateET(booking.checkout),
        refundAmount: booking.status === "APPROVED" ? null : Number(refundAmount),
        paymentMethod,
        bookingId: booking.id,
        accessToken: booking.accessToken,
        landlordSlug: booking.room.landlord.slug,
      })
    )
    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL ?? "noreply@example.com",
      to: booking.guestEmail,
      subject: `Booking cancelled — ${booking.room.name}`,
      html,
    })
  } catch (emailErr) {
    console.error("[cancelBooking] email send failed:", emailErr)
  }

  revalidatePath("/admin/bookings")
  revalidatePath(`/admin/bookings/${bookingId}`)
  revalidatePath(`/${booking.room.landlord.slug}/bookings/${bookingId}`)
  return { success: true }
}
