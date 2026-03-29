import { prisma } from "@/lib/prisma"
import { notFound } from "next/navigation"
import { BookingAdminDetail } from "@/components/admin/booking-admin-detail"
import type { SerializedDateChange } from "@/components/admin/booking-admin-detail"

export const dynamic = "force-dynamic"

export default async function BookingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const booking = await prisma.booking.findUnique({
    where: { id },
    include: { room: { select: { name: true, addOns: true } } },
  })

  if (!booking) notFound()

  const activeExtension = await prisma.bookingExtension.findFirst({
    where: { bookingId: id },
    orderBy: { createdAt: "desc" },
    take: 1,
  })

  const paidExtensions = await prisma.bookingExtension.findMany({
    where: { bookingId: id, status: "PAID" },
    select: { extensionPrice: true },
  })
  const paidExtensionsTotal = paidExtensions.reduce(
    (sum, ext) => sum + (ext.extensionPrice != null ? Number(ext.extensionPrice) : 0),
    0
  )
  const totalPaid =
    booking.confirmedPrice != null ? Number(booking.confirmedPrice) + paidExtensionsTotal : null

  const serialized = {
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
      addOns: booking.room.addOns.map((a) => ({ ...a, price: Number(a.price) })),
    },
  }

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

  const activeDateChangeRaw = await prisma.bookingDateChange.findFirst({
    where: { bookingId: id, status: { in: ["PENDING", "APPROVED"] } },
    orderBy: { createdAt: "desc" },
  })
  const activeDateChange: SerializedDateChange | null = activeDateChangeRaw
    ? {
        id: activeDateChangeRaw.id,
        bookingId: activeDateChangeRaw.bookingId,
        requestedCheckin: activeDateChangeRaw.requestedCheckin.toISOString(),
        requestedCheckout: activeDateChangeRaw.requestedCheckout.toISOString(),
        newPrice:
          activeDateChangeRaw.newPrice != null ? Number(activeDateChangeRaw.newPrice) : null,
        status: activeDateChangeRaw.status as "PENDING" | "APPROVED" | "DECLINED",
        declineReason: activeDateChangeRaw.declineReason,
        stripeSessionId: activeDateChangeRaw.stripeSessionId,
        createdAt: activeDateChangeRaw.createdAt.toISOString(),
      }
    : null

  const settings = await prisma.settings.findUnique({ where: { id: "global" } })

  return (
    <BookingAdminDetail
      booking={serialized}
      activeExtension={serializedExtension}
      activeDateChange={activeDateChange}
      depositAmount={Number(settings?.depositAmount ?? 0)}
      totalPaid={totalPaid}
    />
  )
}
