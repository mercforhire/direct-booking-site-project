import { prisma } from "@/lib/prisma"
import { notFound } from "next/navigation"
import { BookingAdminDetail } from "@/components/admin/booking-admin-detail"

export const dynamic = "force-dynamic"

export default async function BookingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const booking = await prisma.booking.findUnique({
    where: { id },
    include: { room: { select: { name: true, addOns: true } } },
  })

  if (!booking) notFound()

  const serialized = {
    ...booking,
    estimatedTotal: Number(booking.estimatedTotal),
    confirmedPrice: booking.confirmedPrice != null ? Number(booking.confirmedPrice) : null,
    checkin: booking.checkin.toISOString(),
    checkout: booking.checkout.toISOString(),
    createdAt: booking.createdAt.toISOString(),
    updatedAt: booking.updatedAt.toISOString(),
    room: {
      ...booking.room,
      addOns: booking.room.addOns.map((a) => ({ ...a, price: Number(a.price) })),
    },
  }

  return <BookingAdminDetail booking={serialized} />
}
