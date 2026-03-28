import { notFound, redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { createClient } from "@/lib/supabase/server"
import { BookingStatusView } from "@/components/guest/booking-status-view"

export const dynamic = "force-dynamic"

export default async function BookingPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ token?: string; new?: string; paid?: string }>
}) {
  const { id } = await params
  const { token, new: isNew, paid } = await searchParams

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const booking = await prisma.booking.findUnique({
    where: { id },
    include: {
      room: {
        select: {
          name: true,
          location: true,
          addOns: {
            select: { id: true, name: true, price: true },
          },
        },
      },
    },
  })

  if (!booking) notFound()

  // Primary: session user owns this booking by ID
  // Fallback: session user's email matches guest email (covers bookings where
  // guestUserId was not set due to account creation failing on a duplicate email)
  const hasAuth = !!(
    user &&
    (booking.guestUserId === user.id || booking.guestEmail === user.email)
  )
  const hasToken = !!(token && token === booking.accessToken)

  if (!hasAuth && !hasToken) {
    redirect(`/guest/login?next=/bookings/${id}`)
  }

  // Fetch settings for etransferEmail
  const settings = await prisma.settings.findUnique({ where: { id: "global" } })

  // Coerce Decimals at RSC boundary — Prisma Decimal objects cannot be serialized as Client Component props
  const serializedBooking = {
    ...booking,
    estimatedTotal: Number(booking.estimatedTotal),
    confirmedPrice: booking.confirmedPrice != null ? Number(booking.confirmedPrice) : null,
    stripeSessionId: booking.stripeSessionId ?? null,
    checkin: booking.checkin.toISOString(),
    checkout: booking.checkout.toISOString(),
    createdAt: booking.createdAt.toISOString(),
    updatedAt: booking.updatedAt.toISOString(),
    room: {
      ...booking.room,
      addOns: booking.room.addOns.map((a) => ({
        ...a,
        price: Number(a.price),
      })),
    },
  }

  return (
    <BookingStatusView
      booking={serializedBooking}
      showSuccessBanner={isNew === "1"}
      showPaidBanner={paid === "1"}
      etransferEmail={settings?.etransferEmail ?? null}
    />
  )
}
