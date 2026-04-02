"use server"

import { prisma } from "@/lib/prisma"
import { getLandlordIdsForAdmin } from "@/lib/landlord"
import { revalidatePath } from "next/cache"
import { Resend } from "resend"
import { render } from "@react-email/render"
import {
  approveBookingSchema,
  declineBookingSchema,
} from "@/lib/validations/booking-admin"
import { BookingApprovedEmail } from "@/emails/booking-approved"
import { BookingDeclinedEmail } from "@/emails/booking-declined"
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library"

export async function approveBooking(bookingId: string, data: unknown) {
  const landlordIds = await getLandlordIdsForAdmin()

  // Ownership check
  const check = await prisma.booking.findUnique({
    where: { id: bookingId },
    select: { room: { select: { landlordId: true } } },
  })
  if (!check || !landlordIds.includes(check.room.landlordId)) throw new Error("Booking not found")

  const parsed = approveBookingSchema.safeParse(data)
  if (!parsed.success) return { error: parsed.error.flatten() }
  const { confirmedPrice } = parsed.data

  let booking: { id: string; guestEmail: string; guestName: string; accessToken: string; room: { name: string; landlord: { slug: string } } }
  try {
    booking = await prisma.booking.update({
      where: { id: bookingId, status: "PENDING" },
      data: { status: "APPROVED", confirmedPrice },
      include: { room: { select: { name: true, landlord: { select: { slug: true } } } } },
    })
  } catch (err) {
    if (err instanceof PrismaClientKnownRequestError && err.code === "P2025") {
      return { error: "not_pending" }
    }
    throw err
  }

  try {
    const resend = new Resend(process.env.RESEND_API_KEY)
    const html = await render(
      BookingApprovedEmail({
        bookingId: booking.id,
        guestName: booking.guestName,
        roomName: booking.room.name,
        confirmedPrice,
        accessToken: booking.accessToken,
        landlordSlug: booking.room.landlord.slug,
      })
    )
    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL ?? "noreply@example.com",
      to: booking.guestEmail,
      subject: `Your booking has been approved`,
      html,
    })
  } catch (emailErr) {
    console.error("[approveBooking] email send failed:", emailErr)
  }

  revalidatePath("/admin/bookings")
  revalidatePath(`/admin/bookings/${bookingId}`)

  return { success: true }
}

export async function declineBooking(bookingId: string, data: unknown) {
  const landlordIds = await getLandlordIdsForAdmin()

  // Ownership check
  const check = await prisma.booking.findUnique({
    where: { id: bookingId },
    select: { room: { select: { landlordId: true } } },
  })
  if (!check || !landlordIds.includes(check.room.landlordId)) throw new Error("Booking not found")

  const parsed = declineBookingSchema.safeParse(data)
  if (!parsed.success) return { error: parsed.error.flatten() }
  const { declineReason } = parsed.data

  let booking: { id: string; guestEmail: string; guestName: string; accessToken: string; room: { name: string; landlord: { slug: string } } }
  try {
    booking = await prisma.booking.update({
      where: { id: bookingId, status: "PENDING" },
      data: { status: "DECLINED", declineReason: declineReason ?? null },
      include: { room: { select: { name: true, landlord: { select: { slug: true } } } } },
    })
  } catch (err) {
    if (err instanceof PrismaClientKnownRequestError && err.code === "P2025") {
      return { error: "not_pending" }
    }
    throw err
  }

  try {
    const resend = new Resend(process.env.RESEND_API_KEY)
    const html = await render(
      BookingDeclinedEmail({
        bookingId: booking.id,
        guestName: booking.guestName,
        roomName: booking.room.name,
        accessToken: booking.accessToken,
        declineReason: declineReason ?? null,
        landlordSlug: booking.room.landlord.slug,
      })
    )
    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL ?? "noreply@example.com",
      to: booking.guestEmail,
      subject: `Your booking request has been declined`,
      html,
    })
  } catch (emailErr) {
    console.error("[declineBooking] email send failed:", emailErr)
  }

  revalidatePath("/admin/bookings")
  revalidatePath(`/admin/bookings/${bookingId}`)

  return { success: true }
}
