"use server"

import { prisma } from "@/lib/prisma"
import { getLandlordIdsForAdmin } from "@/lib/landlord"
import { stripe } from "@/lib/stripe"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { headers } from "next/headers"
import { Resend } from "resend"
import { render } from "@react-email/render"
import { markAsPaidSchema } from "@/lib/validations/payment"
import { BookingPaymentConfirmationEmail } from "@/emails/booking-payment-confirmation"
import { BookingExtensionPaidEmail } from "@/emails/booking-extension-paid"
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library"
import { formatDateET } from "@/lib/format-date-et"

export async function createStripeCheckoutSession(bookingId: string) {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId, status: "APPROVED" },
    include: { room: { select: { name: true, landlord: { select: { slug: true } } } } },
  })

  if (!booking) return { error: "booking_not_found" }

  const landlordSlug = booking.room.landlord.slug
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
    success_url: `${origin}/${landlordSlug}/bookings/${booking.id}?paid=1&token=${booking.accessToken}`,
    cancel_url: `${origin}/${landlordSlug}/bookings/${booking.id}?token=${booking.accessToken}`,
    customer_email: booking.guestEmail,
  })

  await prisma.booking.update({
    where: { id: bookingId },
    data: { stripeSessionId: session.id },
  })

  redirect(session.url!)
}

export async function markBookingAsPaid(bookingId: string) {
  const landlordIds = await getLandlordIdsForAdmin()

  // Ownership check
  const check = await prisma.booking.findUnique({
    where: { id: bookingId },
    select: { room: { select: { landlordId: true } } },
  })
  if (!check || !landlordIds.includes(check.room.landlordId)) throw new Error("Booking not found")

  markAsPaidSchema.parse({ bookingId })

  let booking: {
    id: string
    guestEmail: string
    guestName: string
    accessToken: string
    checkin: Date
    checkout: Date
    confirmedPrice: import("@prisma/client").Prisma.Decimal | null
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
      BookingPaymentConfirmationEmail({
        bookingId: booking.id,
        guestName: booking.guestName,
        roomName: booking.room.name,
        checkin: formatDateET(booking.checkin),
        checkout: formatDateET(booking.checkout),
        amountPaid: Number(booking.confirmedPrice ?? 0),
      })
    )
    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL ?? "noreply@example.com",
      to: booking.guestEmail,
      subject: `Payment received — ${booking.room.name}`,
      html,
    })
  } catch (emailErr) {
    console.error("[markBookingAsPaid] email send failed:", emailErr)
  }

  revalidatePath(`/admin/bookings/${bookingId}`)

  return { success: true }
}

export async function createExtensionStripeCheckoutSession(extensionId: string) {
  const extension = await prisma.bookingExtension.findUnique({
    where: { id: extensionId, status: "APPROVED" },
    include: {
      booking: {
        select: {
          id: true,
          guestEmail: true,
          accessToken: true,
          checkout: true,
          room: { select: { name: true, landlord: { select: { slug: true } } } },
        },
      },
    },
  })

  if (!extension || !extension.extensionPrice) return { error: "extension_not_found" }

  const landlordSlug = extension.booking.room.landlord.slug
  const origin =
    (await headers()).get("origin") ?? process.env.NEXT_PUBLIC_SITE_URL

  const originalCheckout = extension.booking.checkout.toISOString().slice(0, 10)
  const newCheckout = extension.requestedCheckout.toISOString().slice(0, 10)

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    payment_method_types: ["card"],
    currency: "cad",
    line_items: [
      {
        price_data: {
          currency: "cad",
          unit_amount: Math.round(Number(extension.extensionPrice) * 100),
          product_data: {
            name: `${extension.booking.room.name} — extension ${originalCheckout} to ${newCheckout}`,
          },
        },
        quantity: 1,
      },
    ],
    metadata: { type: "extension", extensionId: extension.id },
    success_url: `${origin}/${landlordSlug}/bookings/${extension.booking.id}?extension_paid=1&token=${extension.booking.accessToken}`,
    cancel_url: `${origin}/${landlordSlug}/bookings/${extension.booking.id}?token=${extension.booking.accessToken}`,
    customer_email: extension.booking.guestEmail,
  })

  await prisma.bookingExtension.update({
    where: { id: extensionId },
    data: { stripeSessionId: session.id },
  })

  redirect(session.url!) // Outside try/catch — NEXT_REDIRECT pattern
}

export async function markExtensionAsPaid(extensionId: string) {
  const landlordIds = await getLandlordIdsForAdmin()

  // Ownership check
  const extCheck = await prisma.bookingExtension.findUnique({
    where: { id: extensionId },
    select: { booking: { select: { room: { select: { landlordId: true } } } } },
  })
  if (!extCheck || !landlordIds.includes(extCheck.booking.room.landlordId)) throw new Error("Extension not found")

  let extension: {
    id: string
    bookingId: string
    requestedCheckout: Date
    extensionPrice: import("@prisma/client").Prisma.Decimal | null
    booking: {
      id: string
      guestEmail: string
      guestName: string
      accessToken: string
      checkin: Date
      room: { name: string; landlord: { slug: string } }
    }
  }

  try {
    extension = await prisma.bookingExtension.update({
      where: { id: extensionId, status: "APPROVED" },
      data: { status: "PAID" },
      include: {
        booking: {
          include: { room: { select: { name: true, landlord: { select: { slug: true } } } } },
        },
      },
    })

    // Atomic: update booking.checkout to requestedCheckout
    await prisma.booking.update({
      where: { id: extension.bookingId },
      data: { checkout: extension.requestedCheckout },
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
      BookingExtensionPaidEmail({
        guestName: extension.booking.guestName,
        roomName: extension.booking.room.name,
        checkin: formatDateET(extension.booking.checkin),
        newCheckout: formatDateET(extension.requestedCheckout),
        extensionAmountPaid: Number(extension.extensionPrice ?? 0),
        bookingId: extension.booking.id,
        accessToken: extension.booking.accessToken,
        landlordSlug: extension.booking.room.landlord.slug,
      })
    )
    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL ?? "noreply@example.com",
      to: extension.booking.guestEmail,
      subject: `Extension confirmed — ${extension.booking.room.name}`,
      html,
    })
  } catch (emailErr) {
    console.error("[markExtensionAsPaid] email send failed:", emailErr)
  }

  revalidatePath(`/admin/bookings/${extension.bookingId}`)
  revalidatePath(`/${extension.booking.room.landlord.slug}/bookings/${extension.bookingId}`)

  return { success: true }
}
