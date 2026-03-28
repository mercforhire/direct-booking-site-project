"use server"

import { createClient } from "@/lib/supabase/server"
import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { Resend } from "resend"
import { approveExtensionSchema, declineExtensionSchema } from "@/lib/validations/extension-admin"
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

export async function approveExtension(extensionId: string, data: unknown) {
  await requireAuth()

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
      room: { name: string }
    }
    requestedCheckout: Date
  }

  try {
    extension = await prisma.bookingExtension.update({
      where: { id: extensionId, status: "PENDING" },
      data: { status: "APPROVED", extensionPrice },
      include: {
        booking: {
          include: { room: { select: { name: true } } },
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
    // React email template wired in Plan 07 when template file exists
    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL ?? "noreply@example.com",
      to: extension.booking.guestEmail,
      subject: `Your extension request has been approved`,
      html: `<p>Hi ${extension.booking.guestName}, your extension to ${extension.requestedCheckout.toISOString().slice(0, 10)} has been approved. Extension price: $${extensionPrice}. <a href="${process.env.NEXT_PUBLIC_SITE_URL}/bookings/${extension.booking.id}?token=${extension.booking.accessToken}">Pay now</a></p>`,
    })
  } catch (emailErr) {
    console.error("[approveExtension] email send failed:", emailErr)
  }

  revalidatePath("/admin/bookings")
  revalidatePath(`/admin/bookings/${extension.booking.id}`)
  revalidatePath(`/bookings/${extension.booking.id}`)
  return { success: true }
}

export async function declineExtension(extensionId: string, data: unknown) {
  await requireAuth()

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
      room: { name: string }
    }
    requestedCheckout: Date
  }

  try {
    extension = await prisma.bookingExtension.update({
      where: { id: extensionId, status: "PENDING" },
      data: { status: "DECLINED", declineReason: declineReason ?? null },
      include: {
        booking: {
          include: { room: { select: { name: true } } },
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
    // React email template wired in Plan 07 when template file exists
    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL ?? "noreply@example.com",
      to: extension.booking.guestEmail,
      subject: `Your extension request has been declined`,
      html: `<p>Hi ${extension.booking.guestName}, your extension request has been declined.${declineReason ? ` Reason: ${declineReason}` : ""}</p>`,
    })
  } catch (emailErr) {
    console.error("[declineExtension] email send failed:", emailErr)
  }

  revalidatePath("/admin/bookings")
  revalidatePath(`/admin/bookings/${extension.booking.id}`)
  revalidatePath(`/bookings/${extension.booking.id}`)
  return { success: true }
}
