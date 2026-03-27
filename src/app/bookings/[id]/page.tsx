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
  searchParams: Promise<{ token?: string; new?: string }>
}) {
  const { id } = await params
  const { token, new: isNew } = await searchParams

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

  const hasAuth = !!(user && booking.guestUserId === user.id)
  const hasToken = !!(token && token === booking.accessToken)

  if (!hasAuth && !hasToken) {
    redirect(`/guest/login?next=/bookings/${id}`)
  }

  // Coerce Decimals at RSC boundary — Prisma Decimal objects cannot be serialized as Client Component props
  const serializedBooking = {
    ...booking,
    estimatedTotal: Number(booking.estimatedTotal),
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
    />
  )
}
