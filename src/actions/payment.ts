"use server"

import { createClient } from "@/lib/supabase/server"
import { prisma } from "@/lib/prisma"
import { stripe } from "@/lib/stripe"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { headers } from "next/headers"
import { Resend } from "resend"
import { render } from "@react-email/render"
import { markAsPaidSchema } from "@/lib/validations/payment"
import { BookingPaidEmail } from "@/emails/booking-paid"
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library"

async function requireAuth() {
  const supabase = await createClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()
  if (error || !user) throw new Error("Unauthorized")
  return user
}

export async function createStripeCheckoutSession(bookingId: string) {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId, status: "APPROVED" },
    include: { room: { select: { name: true } } },
  })

  if (!booking) return { error: "booking_not_found" }

  const origin =
    (await headers()).get("origin") ?? process.env.NEXT_PUBLIC_SITE_URL

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    payment_method_types: ["card"],
    currency: "cad",
    line_items: [
      {
        price_data: {
          currency: "cad",
          unit_amount: Math.round(Number(booking.confirmedPrice) * 100),
          product_data: {
            name: `${booking.room.name} — ${booking.checkin.toISOString().slice(0, 10)} to ${booking.checkout.toISOString().slice(0, 10)}`,
          },
        },
        quantity: 1,
      },
    ],
    metadata: { bookingId: booking.id },
    success_url: `${origin}/bookings/${booking.id}?paid=1`,
    cancel_url: `${origin}/bookings/${booking.id}`,
    customer_email: booking.guestEmail,
  })

  await prisma.booking.update({
    where: { id: bookingId },
    data: { stripeSessionId: session.id },
  })

  redirect(session.url!)
}

export async function markBookingAsPaid(bookingId: string) {
  await requireAuth()

  markAsPaidSchema.parse({ bookingId })

  let booking: {
    id: string
    guestEmail: string
    guestName: string
    accessToken: string
    room: { name: string }
  }

  try {
    booking = await prisma.booking.update({
      where: { id: bookingId, status: "APPROVED" },
      data: { status: "PAID" },
      include: { room: { select: { name: true } } },
    })
  } catch (err) {
    if (err instanceof PrismaClientKnownRequestError && err.code === "P2025") {
      return { error: "not_approved" }
    }
    throw err
  }

  try {
    const resend = new Resend(process.env.RESEND_API_KEY)
    const html = await render(
      BookingPaidEmail({
        bookingId: booking.id,
        guestName: booking.guestName,
        roomName: booking.room.name,
        accessToken: booking.accessToken,
      })
    )
    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL ?? "noreply@example.com",
      to: booking.guestEmail,
      subject: `Payment received — your booking is confirmed`,
      html,
    })
  } catch (emailErr) {
    console.error("[markBookingAsPaid] email send failed:", emailErr)
  }

  revalidatePath(`/admin/bookings/${bookingId}`)

  return { success: true }
}
