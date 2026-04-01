"use server"

import { prisma } from "@/lib/prisma"
import { getLandlordForAdmin } from "@/lib/landlord"
import { revalidatePath } from "next/cache"
import { Resend } from "resend"
import { render } from "@react-email/render"
import { messageSchemaCoerced } from "@/lib/validations/messaging"
import { NewMessageLandlordEmail } from "@/emails/new-message-landlord"
import { NewMessageGuestEmail } from "@/emails/new-message-guest"

function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10)
}

export async function submitMessage(bookingId: string, token: string, data: unknown) {
  const parsed = messageSchemaCoerced.safeParse(data)
  if (!parsed.success) return { error: parsed.error.flatten() }
  const { body } = parsed.data

  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { room: { select: { name: true } } },
  })
  if (!booking) return { error: "booking_not_found" }
  if (token !== booking.accessToken) return { error: "unauthorized" }

  await prisma.message.create({
    data: {
      bookingId,
      sender: "GUEST",
      senderName: booking.guestName,
      body,
    },
  })

  try {
    if (process.env.LANDLORD_EMAIL) {
      const resend = new Resend(process.env.RESEND_API_KEY)
      const subject = `New message from ${booking.guestName} — ${booking.room.name}, ${formatDate(booking.checkin)}–${formatDate(booking.checkout)}`
      const html = await render(
        NewMessageLandlordEmail({
          guestName: booking.guestName,
          roomName: booking.room.name,
          checkin: formatDate(booking.checkin),
          checkout: formatDate(booking.checkout),
          body,
          bookingId,
        })
      )
      await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL ?? "noreply@example.com",
        to: process.env.LANDLORD_EMAIL,
        subject,
        html,
      })
    }
  } catch (err) {
    console.error("Failed to send landlord notification email:", err)
  }

  revalidatePath(`/bookings/${bookingId}`)
  revalidatePath(`/admin/bookings/${bookingId}`)
  revalidatePath("/admin/bookings")

  return { success: true }
}

export async function sendMessageAsLandlord(bookingId: string, data: unknown) {
  const landlord = await getLandlordForAdmin()

  const parsed = messageSchemaCoerced.safeParse(data)
  if (!parsed.success) return { error: parsed.error.flatten() }
  const { body } = parsed.data

  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { room: { select: { name: true, landlordId: true } } },
  })
  if (!booking) return { error: "booking_not_found" }
  if (booking.room.landlordId !== landlord.id) throw new Error("Booking not found")

  await prisma.message.create({
    data: {
      bookingId,
      sender: "LANDLORD",
      senderName: landlord.ownerName,
      body,
    },
  })

  try {
    const resend = new Resend(process.env.RESEND_API_KEY)
    const subject = `New message from ${landlord.ownerName} — ${booking.room.name}, ${formatDate(booking.checkin)}–${formatDate(booking.checkout)}`
    const html = await render(
      NewMessageGuestEmail({
        guestName: booking.guestName,
        roomName: booking.room.name,
        checkin: formatDate(booking.checkin),
        checkout: formatDate(booking.checkout),
        body,
        bookingId,
        accessToken: booking.accessToken,
      })
    )
    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL ?? "noreply@example.com",
      to: booking.guestEmail,
      subject,
      html,
    })
  } catch (err) {
    console.error("Failed to send guest notification email:", err)
  }

  revalidatePath(`/bookings/${bookingId}`)
  revalidatePath(`/admin/bookings/${bookingId}`)
  revalidatePath("/admin/bookings")

  return { success: true }
}
