"use server"

import { createClient as createSupabaseClient } from "@supabase/supabase-js"
import { prisma } from "@/lib/prisma"
import { bookingSchemaCoerced } from "@/lib/validations/booking"
import { redirect } from "next/navigation"
import { Resend } from "resend"
import { render } from "@react-email/render"
import { BookingConfirmationEmail } from "@/emails/booking-confirmation"

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
    }
    // If signUpError (e.g. duplicate email), guestUserId remains null — booking created anonymously
  }

  const accessToken = crypto.randomUUID()

  const created = await prisma.booking.create({
    data: {
      roomId,
      guestName,
      guestEmail,
      guestPhone,
      guestUserId,
      checkin: new Date(checkin + "T00:00:00.000Z"),
      checkout: new Date(checkout + "T00:00:00.000Z"),
      numGuests,
      selectedAddOnIds,
      noteToLandlord: noteToLandlord ?? null,
      estimatedTotal,
      status: "PENDING",
      accessToken,
    },
  })

  try {
    const resend = new Resend(process.env.RESEND_API_KEY)
    const html = await render(
      BookingConfirmationEmail({ bookingId: created.id, accessToken, guestName })
    )
    await resend.emails.send({
      from: process.env.EMAIL_FROM ?? "bookings@example.com",
      to: guestEmail,
      subject: "Your booking request was received",
      html,
    })
  } catch {
    // Email failure is non-fatal — booking was already created
  }

  redirect(`/bookings/${created.id}?token=${accessToken}&new=1`)
}
