"use server"

import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { Resend } from "resend"
import { render } from "@react-email/render"
import { submitExtensionSchema, cancelExtensionSchema } from "@/lib/validations/extension"
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library"
import { BookingExtensionRequestEmail } from "@/emails/booking-extension-request"

export async function submitExtension(bookingId: string, data: unknown) {
  const parsed = submitExtensionSchema.safeParse(data)
  if (!parsed.success) return { error: parsed.error.flatten() }

  // Verify booking exists and is eligible (APPROVED or PAID)
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    select: {
      id: true,
      status: true,
      guestName: true,
      guestEmail: true,
      accessToken: true,
      room: { select: { name: true } },
    },
  })
  if (!booking || !["APPROVED", "PAID"].includes(booking.status)) {
    return { error: "booking_not_eligible" }
  }

  // Enforce one active extension at a time
  const existing = await prisma.bookingExtension.findFirst({
    where: { bookingId, status: "PENDING" },
  })
  if (existing) return { error: "extension_already_pending" }

  await prisma.bookingExtension.create({
    data: {
      bookingId,
      requestedCheckout: new Date(parsed.data.requestedCheckout + "T12:00:00.000Z"),
      noteToLandlord: parsed.data.noteToLandlord ?? null,
      status: "PENDING",
    },
  })

  // Non-fatal landlord notification email
  try {
    if (process.env.LANDLORD_EMAIL) {
      const resend = new Resend(process.env.RESEND_API_KEY)
      const html = await render(
        BookingExtensionRequestEmail({
          guestName: booking.guestName,
          roomName: booking.room.name,
          requestedCheckout: parsed.data.requestedCheckout,
          noteToLandlord: parsed.data.noteToLandlord ?? null,
          bookingId,
        })
      )
      await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL ?? "noreply@example.com",
        to: process.env.LANDLORD_EMAIL,
        subject: `Extension request — ${booking.room.name}`,
        html,
      })
    }
  } catch (emailErr) {
    console.error("[submitExtension] email send failed:", emailErr)
  }

  revalidatePath(`/bookings/${bookingId}`)
  return { success: true }
}

export async function cancelExtension(bookingId: string, extensionId: string, token: string | null) {
  const parsed = cancelExtensionSchema.safeParse({ extensionId })
  if (!parsed.success) return { error: parsed.error.flatten() }

  // Token auth guard — guest-facing action, no Supabase session required
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    select: { accessToken: true },
  })
  if (!booking || !token || token !== booking.accessToken) {
    return { error: "unauthorized" }
  }

  try {
    await prisma.bookingExtension.delete({
      where: { id: extensionId, status: "PENDING" },
    })
  } catch (err) {
    if (err instanceof PrismaClientKnownRequestError && err.code === "P2025") {
      return { error: "not_pending" }
    }
    throw err
  }

  revalidatePath(`/bookings/${bookingId}`)
  return { success: true }
}
