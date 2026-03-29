"use server"

import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { Resend } from "resend"
import { render } from "@react-email/render"
import { submitDateChangeSchema } from "@/lib/validations/date-change"
import { BookingDateChangeRequestEmail } from "@/emails/booking-date-change-request"

export async function submitDateChange(bookingId: string, data: unknown) {
  const parsed = submitDateChangeSchema.safeParse(data)
  if (!parsed.success) return { error: parsed.error.flatten() }
  const { requestedCheckin, requestedCheckout, noteToLandlord } = parsed.data

  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { room: { select: { name: true } } },
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
      requestedCheckin: new Date(requestedCheckin + "T00:00:00.000Z"),
      requestedCheckout: new Date(requestedCheckout + "T00:00:00.000Z"),
      noteToLandlord: noteToLandlord ?? null,
      status: "PENDING",
    },
  })

  try {
    if (process.env.LANDLORD_EMAIL) {
      const resend = new Resend(process.env.RESEND_API_KEY)
      const html = await render(
        BookingDateChangeRequestEmail({
          guestName: booking.guestName,
          roomName: booking.room.name,
          originalCheckin: booking.checkin.toISOString().slice(0, 10),
          originalCheckout: booking.checkout.toISOString().slice(0, 10),
          requestedCheckin,
          requestedCheckout,
          noteToLandlord: noteToLandlord ?? null,
          bookingId: booking.id,
        })
      )
      await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL ?? "noreply@example.com",
        to: process.env.LANDLORD_EMAIL,
        subject: `Date change request — ${booking.room.name} — ${booking.guestName}`,
        html,
      })
    }
  } catch (emailErr) {
    console.error("[submitDateChange] email send failed:", emailErr)
  }

  revalidatePath(`/bookings/${bookingId}`)
  return { success: true }
}

export async function cancelDateChange(bookingId: string) {
  const pending = await prisma.bookingDateChange.findFirst({
    where: { bookingId, status: "PENDING" },
  })
  if (!pending) return { error: "not_pending" }

  await prisma.bookingDateChange.update({
    where: { id: pending.id },
    data: { status: "DECLINED" },
  })

  revalidatePath(`/bookings/${bookingId}`)
  return { success: true }
}
