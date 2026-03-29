import { notFound, redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { createClient } from "@/lib/supabase/server"
import { BookingStatusView } from "@/components/guest/booking-status-view"
import type { SerializedDateChange } from "@/components/guest/booking-status-view"

export const dynamic = "force-dynamic"

export default async function BookingPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ token?: string; new?: string; paid?: string; extension_paid?: string }>
}) {
  const { id } = await params
  const { token, new: isNew, paid, extension_paid } = await searchParams

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
          blockedDates: { select: { date: true } },
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

  // Load the most recent extension (if any)
  const activeExtension = await prisma.bookingExtension.findFirst({
    where: { bookingId: id },
    orderBy: { createdAt: "desc" },
  })

  // Load active date change request (PENDING or APPROVED)
  const activeDateChangeRecord = await prisma.bookingDateChange.findFirst({
    where: { bookingId: id, status: { in: ["PENDING", "APPROVED"] } },
    orderBy: { createdAt: "desc" },
  })
  const serializedDateChange: SerializedDateChange | null = activeDateChangeRecord
    ? {
        id: activeDateChangeRecord.id,
        bookingId: activeDateChangeRecord.bookingId,
        requestedCheckin: activeDateChangeRecord.requestedCheckin.toISOString(),
        requestedCheckout: activeDateChangeRecord.requestedCheckout.toISOString(),
        newPrice: activeDateChangeRecord.newPrice != null ? Number(activeDateChangeRecord.newPrice) : null,
        status: activeDateChangeRecord.status as "PENDING" | "APPROVED" | "DECLINED",
        declineReason: activeDateChangeRecord.declineReason,
        stripeSessionId: activeDateChangeRecord.stripeSessionId,
        createdAt: activeDateChangeRecord.createdAt.toISOString(),
      }
    : null

  // Serialize extension — coerce Decimal and Date at RSC boundary
  const serializedExtension = activeExtension
    ? {
        ...activeExtension,
        extensionPrice:
          activeExtension.extensionPrice != null
            ? Number(activeExtension.extensionPrice)
            : null,
        requestedCheckout: activeExtension.requestedCheckout.toISOString(),
        createdAt: activeExtension.createdAt.toISOString(),
        updatedAt: activeExtension.updatedAt.toISOString(),
      }
    : null

  // Serialize blocked dates as ISO strings (Date objects cannot cross RSC boundary)
  const blockedDateStrings = booking.room.blockedDates.map((d) =>
    d.date.toISOString()
  )

  // Coerce Decimals at RSC boundary — Prisma Decimal objects cannot be serialized as Client Component props
  const serializedBooking = {
    ...booking,
    estimatedTotal: Number(booking.estimatedTotal),
    confirmedPrice: booking.confirmedPrice != null ? Number(booking.confirmedPrice) : null,
    stripeSessionId: booking.stripeSessionId ?? null,
    refundAmount: booking.refundAmount != null ? Number(booking.refundAmount) : null,
    cancelledAt: booking.cancelledAt ? booking.cancelledAt.toISOString() : null,
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
      showExtensionPaidBanner={extension_paid === "1"}
      etransferEmail={settings?.etransferEmail ?? null}
      activeExtension={serializedExtension}
      activeDateChange={serializedDateChange}
      blockedDates={blockedDateStrings}
    />
  )
}
