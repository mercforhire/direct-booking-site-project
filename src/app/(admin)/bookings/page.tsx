import { prisma } from "@/lib/prisma"
import { BookingAdminList } from "@/components/admin/booking-admin-list"

export const dynamic = "force-dynamic"

export default async function BookingsPage() {
  const bookings = await prisma.booking.findMany({
    orderBy: { createdAt: "desc" },
    include: { room: { select: { name: true } } },
  })

  const serialized = bookings.map((b) => ({
    ...b,
    estimatedTotal: Number(b.estimatedTotal),
    confirmedPrice: b.confirmedPrice != null ? Number(b.confirmedPrice) : null,
    checkin: b.checkin.toISOString(),
    checkout: b.checkout.toISOString(),
    createdAt: b.createdAt.toISOString(),
    updatedAt: b.updatedAt.toISOString(),
  }))

  return <BookingAdminList bookings={serialized} />
}
