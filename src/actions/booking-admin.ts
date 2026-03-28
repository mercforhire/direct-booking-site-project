"use server"

import { createClient } from "@/lib/supabase/server"
import { prisma } from "@/lib/prisma"
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

async function requireAuth() {
  const supabase = await createClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()
  if (error || !user) throw new Error("Unauthorized")
  return user
}

export async function approveBooking(bookingId: string, data: unknown) {
  await requireAuth()

  const parsed = approveBookingSchema.safeParse(data)
  if (!parsed.success) return { error: parsed.error.flatten() }
  const { confirmedPrice } = parsed.data

  let booking: { id: string; guestEmail: string; guestName: string; room: { name: string } }
  try {
    booking = await prisma.booking.update({
      where: { id: bookingId, status: "PENDING" },
      data: { status: "APPROVED", confirmedPrice },
      include: { room: { select: { name: true } } },
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
        accessToken: "",
      })
    )
    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL ?? "noreply@example.com",
      to: booking.guestEmail,
      subject: `Your booking has been approved`,
      html,
    })
  } catch {
    // Email failure is non-fatal — booking is already approved
  }

  revalidatePath("/bookings")
  revalidatePath(`/bookings/${bookingId}`)

  return { success: true }
}

export async function declineBooking(bookingId: string, data: unknown) {
  await requireAuth()

  const parsed = declineBookingSchema.safeParse(data)
  if (!parsed.success) return { error: parsed.error.flatten() }
  const { declineReason } = parsed.data

  let booking: { id: string; guestEmail: string; guestName: string; room: { name: string } }
  try {
    booking = await prisma.booking.update({
      where: { id: bookingId, status: "PENDING" },
      data: { status: "DECLINED", declineReason: declineReason ?? null },
      include: { room: { select: { name: true } } },
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
        declineReason,
      })
    )
    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL ?? "noreply@example.com",
      to: booking.guestEmail,
      subject: `Your booking request has been declined`,
      html,
    })
  } catch {
    // Email failure is non-fatal — booking is already declined
  }

  revalidatePath("/bookings")
  revalidatePath(`/bookings/${bookingId}`)

  return { success: true }
}
