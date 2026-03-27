"use server"

import { createClient } from "@/lib/supabase/server"
import { prisma } from "@/lib/prisma"
import { bookingSchemaCoerced } from "@/lib/validations/booking"
import { redirect } from "next/navigation"
import { Resend } from "resend"
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
    const supabase = await createClient()
    const { data: authData, error: signUpError } = await supabase.auth.signUp({
      email: guestEmail,
      password,
      options: { data: { role: "guest" } },
    })
    if (!signUpError) {
      // authData.user is null if email already registered (Supabase security behavior)
      guestUserId = authData.user?.id ?? null
    }
    // If signUpError, guestUserId remains null — booking created anonymously
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

  const resend = new Resend(process.env.RESEND_API_KEY)

  await resend.emails.send({
    from: process.env.EMAIL_FROM ?? "bookings@example.com",
    to: guestEmail,
    subject: "Your booking request was received",
    react: BookingConfirmationEmail({
      bookingId: created.id,
      accessToken,
      guestName,
    }),
  })

  redirect(`/bookings/${created.id}?new=1`)
}
