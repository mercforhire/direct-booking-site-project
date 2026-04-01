"use server"

import { prisma } from "@/lib/prisma"
import { getLandlordForAdmin } from "@/lib/landlord"
import { revalidatePath } from "next/cache"
import { Resend } from "resend"
import { render } from "@react-email/render"
import { approveExtensionSchema, declineExtensionSchema } from "@/lib/validations/extension-admin"
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library"
import { BookingExtensionApprovedEmail } from "@/emails/booking-extension-approved"
import { BookingExtensionDeclinedEmail } from "@/emails/booking-extension-declined"

export async function approveExtension(extensionId: string, data: unknown) {
  const landlord = await getLandlordForAdmin()

  // Ownership check
  const extCheck = await prisma.bookingExtension.findUnique({
    where: { id: extensionId },
    select: { booking: { select: { room: { select: { landlordId: true } } } } },
  })
  if (!extCheck || extCheck.booking.room.landlordId !== landlord.id) throw new Error("Extension not found")

  const parsed = approveExtensionSchema.safeParse(data)
  if (!parsed.success) return { error: parsed.error.flatten() }
  const { extensionPrice } = parsed.data

  let extension: {
    id: string
    booking: {
      id: string
      guestEmail: string
      guestName: string
      accessToken: string
      checkout: Date
      room: { name: string; landlord: { slug: string } }
    }
    requestedCheckout: Date
  }

  try {
    extension = await prisma.bookingExtension.update({
      where: { id: extensionId, status: "PENDING" },
      data: { status: "APPROVED", extensionPrice },
      include: {
        booking: {
          include: { room: { select: { name: true, landlord: { select: { slug: true } } } } },
        },
      },
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
      BookingExtensionApprovedEmail({
        guestName: extension.booking.guestName,
        roomName: extension.booking.room.name,
        requestedCheckout: extension.requestedCheckout.toISOString().slice(0, 10),
        extensionPrice,
        bookingId: extension.booking.id,
        accessToken: extension.booking.accessToken,
        landlordSlug: extension.booking.room.landlord.slug,
      })
    )
    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL ?? "noreply@example.com",
      to: extension.booking.guestEmail,
      subject: `Your extension request has been approved`,
      html,
    })
  } catch (emailErr) {
    console.error("[approveExtension] email send failed:", emailErr)
  }

  revalidatePath("/admin/bookings")
  revalidatePath(`/admin/bookings/${extension.booking.id}`)
  revalidatePath(`/${extension.booking.room.landlord.slug}/bookings/${extension.booking.id}`)
  return { success: true }
}

export async function declineExtension(extensionId: string, data: unknown) {
  const landlord = await getLandlordForAdmin()

  // Ownership check
  const extCheck = await prisma.bookingExtension.findUnique({
    where: { id: extensionId },
    select: { booking: { select: { room: { select: { landlordId: true } } } } },
  })
  if (!extCheck || extCheck.booking.room.landlordId !== landlord.id) throw new Error("Extension not found")

  const parsed = declineExtensionSchema.safeParse(data)
  if (!parsed.success) return { error: parsed.error.flatten() }
  const { declineReason } = parsed.data

  let extension: {
    id: string
    booking: {
      id: string
      guestEmail: string
      guestName: string
      accessToken: string
      room: { name: string; landlord: { slug: string } }
    }
    requestedCheckout: Date
  }

  try {
    extension = await prisma.bookingExtension.update({
      where: { id: extensionId, status: "PENDING" },
      data: { status: "DECLINED", declineReason: declineReason ?? null },
      include: {
        booking: {
          include: { room: { select: { name: true, landlord: { select: { slug: true } } } } },
        },
      },
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
      BookingExtensionDeclinedEmail({
        guestName: extension.booking.guestName,
        roomName: extension.booking.room.name,
        requestedCheckout: extension.requestedCheckout.toISOString().slice(0, 10),
        declineReason: declineReason ?? null,
        bookingId: extension.booking.id,
        accessToken: extension.booking.accessToken,
        landlordSlug: extension.booking.room.landlord.slug,
      })
    )
    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL ?? "noreply@example.com",
      to: extension.booking.guestEmail,
      subject: `Your extension request has been declined`,
      html,
    })
  } catch (emailErr) {
    console.error("[declineExtension] email send failed:", emailErr)
  }

  revalidatePath("/admin/bookings")
  revalidatePath(`/admin/bookings/${extension.booking.id}`)
  revalidatePath(`/${extension.booking.room.landlord.slug}/bookings/${extension.booking.id}`)
  return { success: true }
}
