import { prisma } from "@/lib/prisma"
import { requireLandlordsWithSelected } from "@/lib/landlord"
import { BookingAdminList } from "@/components/admin/booking-admin-list"

export const dynamic = "force-dynamic"

interface BookingsPageProps {
  searchParams: Promise<{ landlord?: string }>
}

export default async function BookingsPage({ searchParams }: BookingsPageProps) {
  const { landlord: landlordSlug } = await searchParams
  const { landlords, selected } = await requireLandlordsWithSelected(landlordSlug)

  const bookings = await prisma.booking.findMany({
    where: { room: { landlordId: selected.id } },
    orderBy: { createdAt: "desc" },
    include: {
      room: { select: { name: true, landlordId: true } },
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
    landlordName: selected.name,
  }))

  const todayET = new Date().toLocaleDateString("en-CA", { timeZone: "America/New_York" })

  return (
    <BookingAdminList
      bookings={serialized}
      todayET={todayET}
      showPropertyColumn={landlords.length > 1}
    />
  )
}
