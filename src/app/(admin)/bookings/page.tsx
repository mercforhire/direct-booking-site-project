import { prisma } from "@/lib/prisma"
import { BookingAdminList } from "@/components/admin/booking-admin-list"

export const dynamic = "force-dynamic"

export default async function BookingsPage() {
  const bookings = await prisma.booking.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      room: { select: { name: true } },
      extensions: {
        select: { id: true, status: true, extensionPrice: true },
      },
    },
  })

  const serialized = bookings.map((b) => ({
    ...b,
    estimatedTotal: Number(b.estimatedTotal),
    confirmedPrice: b.confirmedPrice != null ? Number(b.confirmedPrice) : null,
    stripeSessionId: b.stripeSessionId,
    checkin: b.checkin.toISOString(),
    checkout: b.checkout.toISOString(),
    createdAt: b.createdAt.toISOString(),
    updatedAt: b.updatedAt.toISOString(),
    hasPendingExtension: b.extensions.some((e) => e.status === "PENDING"),
    paidExtensionsTotal: b.extensions
      .filter((e) => e.status === "PAID" && e.extensionPrice != null)
      .reduce((sum, e) => sum + Number(e.extensionPrice), 0),
  }))

  return <BookingAdminList bookings={serialized} />
}
