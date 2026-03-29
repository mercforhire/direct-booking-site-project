"use server"

import { createClient } from "@/lib/supabase/server"
import { prisma } from "@/lib/prisma"
import { stripe } from "@/lib/stripe"
import { revalidatePath } from "next/cache"
import { Resend } from "resend"
import { render } from "@react-email/render"
import { cancelBookingSchema } from "@/lib/validations/cancellation"
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library"
import { BookingCancelledEmail } from "@/emails/booking-cancelled"

async function requireAuth() {
  const supabase = await createClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()
  if (error || !user) throw new Error("Unauthorized")
  return user
}

export async function cancelBooking(bookingId: string, data: unknown) {
  await requireAuth()

  const parsed = cancelBookingSchema.safeParse(data)
  if (!parsed.success) return { error: parsed.error.flatten() }
  const { refundAmount } = parsed.data

  // Fetch booking for payment method detection + email data
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { room: { select: { name: true } } },
  })
  if (!booking) return { error: "not_found" }

  // Stripe refund FIRST (hard block if fails)
  if (booking.stripeSessionId && booking.status === "PAID") {
    const session = await stripe.checkout.sessions.retrieve(booking.stripeSessionId)
    if (!session.payment_intent || typeof session.payment_intent !== "string") {
      return { error: "no_payment_intent" }
    }
    try {
      await stripe.refunds.create({
        payment_intent: session.payment_intent,
        amount: Math.round(Number(refundAmount) * 100),
      })
    } catch (err) {
      return { error: "stripe_refund_failed", message: (err as Error).message }
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
        where: { bookingId, status: { in: ["PENDING", "APPROVED"] } },
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
        checkin: booking.checkin.toISOString().slice(0, 10),
        checkout: booking.checkout.toISOString().slice(0, 10),
        refundAmount: booking.status === "APPROVED" ? null : Number(refundAmount),
        paymentMethod,
        bookingId: booking.id,
        accessToken: booking.accessToken,
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
  revalidatePath(`/bookings/${bookingId}`)
  return { success: true }
}
