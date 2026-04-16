"use server"

import { createClient } from "@/lib/supabase/server"
import { prisma } from "@/lib/prisma"
import { getLandlordIdsForAdmin, getAllAdminEmails } from "@/lib/landlord"
import { stripe } from "@/lib/stripe"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { headers } from "next/headers"
import { Resend } from "resend"
import { render } from "@react-email/render"
import { submitDateChangeSchema, approveDateChangeSchema, declineDateChangeSchema } from "@/lib/validations/date-change"
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library"
import { BookingDateChangeRequestEmail } from "@/emails/booking-date-change-request"
import { BookingDateChangeApprovedEmail } from "@/emails/booking-date-change-approved"
import { BookingDateChangeDeclinedEmail } from "@/emails/booking-date-change-declined"
import { formatDateET } from "@/lib/format-date-et"


export async function submitDateChange(bookingId: string, data: unknown) {
  const parsed = submitDateChangeSchema.safeParse(data)
  if (!parsed.success) return { error: parsed.error.flatten() }
  const { requestedCheckin, requestedCheckout, noteToLandlord } = parsed.data

  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { room: { select: { name: true, landlord: { select: { slug: true } } } } },
  })
  if (!booking) return { error: "booking_not_found" }
  if (!["APPROVED", "PAID"].includes(booking.status)) return { error: "invalid_status" }

  const existingPending = await prisma.bookingDateChange.findFirst({
    where: { bookingId, status: "PENDING" },
  })
  if (existingPending) return { error: "already_pending" }

  await prisma.bookingDateChange.create({
    data: {
      bookingId,
      requestedCheckin: new Date(requestedCheckin + "T12:00:00.000Z"),
      requestedCheckout: new Date(requestedCheckout + "T12:00:00.000Z"),
      noteToLandlord: noteToLandlord ?? null,
      status: "PENDING",
    },
  })

  try {
    const adminEmails = await getAllAdminEmails()
    if (adminEmails.length > 0) {
      const resend = new Resend(process.env.RESEND_API_KEY)
      const html = await render(
        BookingDateChangeRequestEmail({
          guestName: booking.guestName,
          roomName: booking.room.name,
          originalCheckin: formatDateET(booking.checkin),
          originalCheckout: formatDateET(booking.checkout),
          requestedCheckin: formatDateET(new Date(requestedCheckin + "T12:00:00.000Z")),
          requestedCheckout: formatDateET(new Date(requestedCheckout + "T12:00:00.000Z")),
          noteToLandlord: noteToLandlord ?? null,
          bookingId: booking.id,
        })
      )
      await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL ?? "noreply@example.com",
        to: adminEmails,
        subject: `Date change request — ${booking.room.name} — ${booking.guestName}`,
        html,
      })
    }
  } catch (emailErr) {
    console.error("[submitDateChange] email send failed:", emailErr)
  }

  revalidatePath(`/${booking.room.landlord.slug}/bookings/${bookingId}`)
  return { success: true }
}

export async function cancelDateChange(bookingId: string, token: string | null) {
  // Token auth guard — guest-facing action, no Supabase session required
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    select: { accessToken: true, room: { select: { landlord: { select: { slug: true } } } } },
  })
  if (!booking || !token || token !== booking.accessToken) {
    return { error: "unauthorized" }
  }

  const pending = await prisma.bookingDateChange.findFirst({
    where: { bookingId, status: "PENDING" },
  })
  if (!pending) return { error: "not_pending" }

  await prisma.bookingDateChange.update({
    where: { id: pending.id },
    data: { status: "DECLINED" },
  })

  revalidatePath(`/${booking.room.landlord.slug}/bookings/${bookingId}`)
  return { success: true }
}

export async function approveDateChange(dateChangeId: string, data: unknown) {
  const landlordIds = await getLandlordIdsForAdmin()

  // Ownership check
  const dcCheck = await prisma.bookingDateChange.findUnique({
    where: { id: dateChangeId },
    select: { booking: { select: { room: { select: { landlordId: true } } } } },
  })
  if (!dcCheck || !landlordIds.includes(dcCheck.booking.room.landlordId)) throw new Error("Date change not found")

  const parsed = approveDateChangeSchema.safeParse(data)
  if (!parsed.success) return { error: parsed.error.flatten() }
  const { newPrice } = parsed.data

  type DateChangeWithBooking = {
    id: string
    bookingId: string
    requestedCheckin: Date
    requestedCheckout: Date
    status: string
    booking: {
      id: string
      guestName: string
      guestEmail: string
      accessToken: string
      stripeSessionId: string | null
      confirmedPrice: import("@prisma/client").Prisma.Decimal | null
      checkin: Date
      checkout: Date
      room: { name: string; landlord: { slug: string } }
    }
  }

  let dateChange: DateChangeWithBooking

  try {
    dateChange = await prisma.bookingDateChange.update({
      where: { id: dateChangeId, status: "PENDING" },
      data: { status: "APPROVED", newPrice },
      include: {
        booking: {
          select: {
            id: true,
            guestName: true,
            guestEmail: true,
            accessToken: true,
            stripeSessionId: true,
            confirmedPrice: true,
            checkin: true,
            checkout: true,
            room: { select: { name: true, landlord: { select: { slug: true } } } },
          },
        },
      },
    }) as DateChangeWithBooking
  } catch (err) {
    if (err instanceof PrismaClientKnownRequestError && err.code === "P2025") {
      return { error: "not_pending" }
    }
    throw err
  }

  const booking = dateChange.booking
  const landlordSlug = booking.room.landlord.slug
  const priceDiff = newPrice - Number(booking.confirmedPrice ?? 0)
  const isStripe = !!booking.stripeSessionId

  let checkoutUrl: string | undefined
  // Determine payment action for email
  type PaymentAction = "topup_stripe" | "topup_etransfer" | "refund_stripe" | "refund_etransfer" | "none"
  let paymentAction: PaymentAction = "none"

  if (priceDiff > 0) {
    if (isStripe) {
      paymentAction = "topup_stripe"
      // Create top-up Stripe session — do NOT update dates here; webhook does it after payment
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
              unit_amount: Math.round(priceDiff * 100),
              product_data: {
                name: `Date change top-up — ${booking.room.name}`,
              },
            },
            quantity: 1,
          },
        ],
        metadata: { type: "date_change_topup", dateChangeId },
        success_url: `${origin}/${landlordSlug}/bookings/${booking.id}?date_change_paid=1&token=${booking.accessToken}`,
        cancel_url: `${origin}/${landlordSlug}/bookings/${booking.id}?token=${booking.accessToken}`,
        customer_email: booking.guestEmail,
      })
      await prisma.bookingDateChange.update({
        where: { id: dateChangeId },
        data: { stripeSessionId: session.id },
      })
      checkoutUrl = session.url ?? undefined
    } else {
      paymentAction = "topup_etransfer"
      // E-transfer: update dates immediately
      await prisma.booking.update({
        where: { id: booking.id },
        data: {
          checkin: dateChange.requestedCheckin,
          checkout: dateChange.requestedCheckout,
          confirmedPrice: newPrice,
        },
      })
    }
  } else if (priceDiff < 0) {
    if (isStripe) {
      paymentAction = "refund_stripe"
      // Issue partial refund
      const session = await stripe.checkout.sessions.retrieve(booking.stripeSessionId!)
      if (session.payment_intent && typeof session.payment_intent === "string") {
        await stripe.refunds.create({
          payment_intent: session.payment_intent,
          amount: Math.round(Math.abs(priceDiff) * 100),
        })
      }
    } else {
      paymentAction = "refund_etransfer"
    }
    // Update dates for both Stripe and e-transfer
    await prisma.booking.update({
      where: { id: booking.id },
      data: {
        checkin: dateChange.requestedCheckin,
        checkout: dateChange.requestedCheckout,
        confirmedPrice: newPrice,
      },
    })
  } else {
    // No price change: update dates
    await prisma.booking.update({
      where: { id: booking.id },
      data: {
        checkin: dateChange.requestedCheckin,
        checkout: dateChange.requestedCheckout,
      },
    })
  }

  // Non-fatal email to guest
  try {
    const resend = new Resend(process.env.RESEND_API_KEY)
    const html = await render(
      BookingDateChangeApprovedEmail({
        guestName: booking.guestName,
        roomName: booking.room.name,
        newCheckin: formatDateET(dateChange.requestedCheckin),
        newCheckout: formatDateET(dateChange.requestedCheckout),
        newPrice,
        paymentAction,
        refundAmount: priceDiff < 0 ? Math.abs(priceDiff) : undefined,
        checkoutUrl,
        bookingId: booking.id,
        accessToken: booking.accessToken,
        landlordSlug,
      })
    )
    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL ?? "noreply@example.com",
      to: booking.guestEmail,
      subject: `Date change approved — ${booking.room.name}`,
      html,
    })
  } catch (emailErr) {
    console.error("[approveDateChange] email send failed:", emailErr)
  }

  revalidatePath("/admin/bookings")
  revalidatePath(`/admin/bookings/${booking.id}`)
  revalidatePath(`/${landlordSlug}/bookings/${booking.id}`)

  return { success: true, ...(checkoutUrl ? { checkoutUrl } : {}) }
}

export async function declineDateChange(dateChangeId: string, data: unknown) {
  const landlordIds = await getLandlordIdsForAdmin()

  // Ownership check
  const dcCheck = await prisma.bookingDateChange.findUnique({
    where: { id: dateChangeId },
    select: { booking: { select: { room: { select: { landlordId: true } } } } },
  })
  if (!dcCheck || !landlordIds.includes(dcCheck.booking.room.landlordId)) throw new Error("Date change not found")

  const parsed = declineDateChangeSchema.safeParse(data)
  if (!parsed.success) return { error: parsed.error.flatten() }
  const { declineReason } = parsed.data

  type DateChangeWithBooking = {
    id: string
    bookingId: string
    requestedCheckin: Date
    requestedCheckout: Date
    booking: {
      id: string
      guestName: string
      guestEmail: string
      accessToken: string
      room: { name: string; landlord: { slug: string } }
    }
  }

  let dateChange: DateChangeWithBooking

  try {
    dateChange = await prisma.bookingDateChange.update({
      where: { id: dateChangeId, status: "PENDING" },
      data: { status: "DECLINED", declineReason: declineReason ?? null },
      include: {
        booking: {
          select: {
            id: true,
            guestName: true,
            guestEmail: true,
            accessToken: true,
            room: { select: { name: true, landlord: { select: { slug: true } } } },
          },
        },
      },
    }) as DateChangeWithBooking
  } catch (err) {
    if (err instanceof PrismaClientKnownRequestError && err.code === "P2025") {
      return { error: "not_pending" }
    }
    throw err
  }

  const booking = dateChange.booking
  const landlordSlug = booking.room.landlord.slug

  // Non-fatal email to guest
  try {
    const resend = new Resend(process.env.RESEND_API_KEY)
    const html = await render(
      BookingDateChangeDeclinedEmail({
        guestName: booking.guestName,
        roomName: booking.room.name,
        requestedCheckin: formatDateET(dateChange.requestedCheckin),
        requestedCheckout: formatDateET(dateChange.requestedCheckout),
        declineReason: declineReason ?? null,
        bookingId: booking.id,
        accessToken: booking.accessToken,
        landlordSlug,
      })
    )
    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL ?? "noreply@example.com",
      to: booking.guestEmail,
      subject: `Date change declined — ${booking.room.name}`,
      html,
    })
  } catch (emailErr) {
    console.error("[declineDateChange] email send failed:", emailErr)
  }

  revalidatePath("/admin/bookings")
  revalidatePath(`/admin/bookings/${booking.id}`)
  revalidatePath(`/${landlordSlug}/bookings/${booking.id}`)

  return { success: true }
}

export async function createDateChangeStripeCheckoutSession(dateChangeId: string) {
  const dateChange = await prisma.bookingDateChange.findUnique({
    where: { id: dateChangeId, status: "APPROVED" },
    include: {
      booking: {
        select: {
          id: true,
          guestEmail: true,
          accessToken: true,
          room: { select: { name: true, landlord: { select: { slug: true } } } },
        },
      },
    },
  })

  if (!dateChange || !dateChange.newPrice) return { error: "date_change_not_found" }

  const landlordSlug = dateChange.booking.room.landlord.slug
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
          unit_amount: Math.round(Number(dateChange.newPrice) * 100),
          product_data: {
            name: `Date change top-up — ${dateChange.booking.room.name}`,
          },
        },
        quantity: 1,
      },
    ],
    metadata: { type: "date_change_topup", dateChangeId },
    success_url: `${origin}/${landlordSlug}/bookings/${dateChange.booking.id}?date_change_paid=1&token=${dateChange.booking.accessToken}`,
    cancel_url: `${origin}/${landlordSlug}/bookings/${dateChange.booking.id}?token=${dateChange.booking.accessToken}`,
    customer_email: dateChange.booking.guestEmail,
  })

  await prisma.bookingDateChange.update({
    where: { id: dateChangeId },
    data: { stripeSessionId: session.id },
  })

  redirect(session.url!) // Outside try/catch — NEXT_REDIRECT pattern
}
