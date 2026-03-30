"use server"

import { createClient as createSupabaseClient } from "@supabase/supabase-js"
import { prisma } from "@/lib/prisma"
import { bookingSchemaCoerced } from "@/lib/validations/booking"
import { redirect } from "next/navigation"
import { Resend } from "resend"
import { render } from "@react-email/render"
import { BookingConfirmationEmail } from "@/emails/booking-confirmation"
import { BookingNotificationEmail } from "@/emails/booking-notification"

export async function submitBooking(data: unknown) {
  const parsed = bookingSchemaCoerced.safeParse(data)
  if (!parsed.success) return { error: parsed.error.flatten() }

  const {
    createAccount,
    password,
    guestName,
    guestEmail,
    guestPhone,
    roomId,
    checkin,
    checkout,
    numGuests,
    selectedAddOnIds,
    noteToLandlord,
    estimatedTotal,
  } = parsed.data

  let guestUserId: string | null = null

  if (createAccount && password) {
    // Use admin client so the guest account is auto-confirmed — no email verification
    // required before sign-in, which would block guests from accessing their booking.
    const adminClient = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    const { data: authData, error: signUpError } = await adminClient.auth.admin.createUser({
      email: guestEmail,
      password,
      email_confirm: true,
      user_metadata: { role: "guest" },
    })
    if (!signUpError) {
      guestUserId = authData.user?.id ?? null
    } else {
      // Duplicate email — look up the existing user and reuse their ID so the
      // booking is linked to their account and accessible after sign-in.
      const { data: listData } = await adminClient.auth.admin.listUsers()
      const existing = listData?.users.find((u) => u.email === guestEmail)
      if (existing) guestUserId = existing.id
    }
  }

  const accessToken = crypto.randomUUID()

  const created = await prisma.booking.create({
    data: {
      roomId,
      guestName,
      guestEmail,
      guestPhone,
      guestUserId,
      checkin: new Date(checkin + "T12:00:00.000Z"),
      checkout: new Date(checkout + "T12:00:00.000Z"),
      numGuests,
      selectedAddOnIds,
      noteToLandlord: noteToLandlord ?? null,
      estimatedTotal,
      status: "PENDING",
      accessToken,
    },
    include: { room: { select: { name: true } } },
  })

  const resend = new Resend(process.env.RESEND_API_KEY)
  const fromEmail = process.env.RESEND_FROM_EMAIL ?? "noreply@example.com"

  try {
    const html = await render(
      BookingConfirmationEmail({ bookingId: created.id, accessToken, guestName })
    )
    await resend.emails.send({
      from: fromEmail,
      to: guestEmail,
      subject: "Your booking request was received",
      html,
    })
  } catch (err) {
    console.error("[submitBooking] guest confirmation email failed:", err)
  }

  if (process.env.LANDLORD_EMAIL) {
    try {
      const landlordHtml = await render(
        BookingNotificationEmail({
          guestName,
          bookingId: created.id,
          roomName: created.room.name,
          checkin,
          checkout,
          numGuests,
          estimatedTotal: Number(estimatedTotal),
        })
      )
      await resend.emails.send({
        from: fromEmail,
        to: process.env.LANDLORD_EMAIL,
        subject: `New booking request from ${guestName}`,
        html: landlordHtml,
      })
    } catch (err) {
      console.error("[submitBooking] landlord notification email failed:", err)
    }
  }

  redirect(`/bookings/${created.id}?token=${accessToken}&new=1`)
}
