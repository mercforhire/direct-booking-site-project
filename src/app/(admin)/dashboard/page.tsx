import Link from "next/link"
import { prisma } from "@/lib/prisma"
import { requireLandlordsForAdmin } from "@/lib/landlord"
import { Badge } from "@/components/ui/badge"
import { format, isToday, isTomorrow } from "date-fns"
import type { Booking, Room, Landlord } from "@prisma/client"

export const dynamic = "force-dynamic"

type BookingWithRoom = Booking & { room: { name: true } extends infer _ ? { name: string; landlordId: string } : never }

function dateLabel(date: Date) {
  if (isToday(date)) return "Today"
  if (isTomorrow(date)) return "Tomorrow"
  return format(date, "MMM d")
}

/** Group bookings by landlordId, return in same order as landlords array */
function groupByLandlord(
  bookings: BookingWithRoom[],
  landlords: Landlord[],
): { landlord: Landlord; bookings: BookingWithRoom[] }[] {
  const map = new Map<string, BookingWithRoom[]>()
  for (const b of bookings) {
    const list = map.get(b.room.landlordId) ?? []
    list.push(b)
    map.set(b.room.landlordId, list)
  }
  return landlords.map((l) => ({ landlord: l, bookings: map.get(l.id) ?? [] }))
}

export default async function DashboardPage() {
  const landlords = await requireLandlordsForAdmin()
  const landlordIds = landlords.map((l) => l.id)

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const dayAfterTomorrow = new Date(today)
  dayAfterTomorrow.setDate(today.getDate() + 2)

  const roomFilter = { room: { landlordId: { in: landlordIds } } }
  const roomInclude = { room: { select: { name: true, landlordId: true } } } as const

  const [pendingApprovals, pendingEtransfer, currentlyStaying, checkIns, checkOuts] = await Promise.all([
    prisma.booking.findMany({
      where: { status: "PENDING", ...roomFilter },
      include: roomInclude,
      orderBy: { createdAt: "asc" },
    }),
    prisma.booking.findMany({
      where: { status: "APPROVED", stripeSessionId: null, ...roomFilter },
      include: roomInclude,
      orderBy: { createdAt: "asc" },
    }),
    prisma.booking.findMany({
      where: {
        status: { in: ["APPROVED", "PAID"] },
        checkin: { lte: today },
        checkout: { gt: today },
        ...roomFilter,
      },
      include: roomInclude,
      orderBy: { checkin: "asc" },
    }),
    prisma.booking.findMany({
      where: {
        status: { in: ["APPROVED", "PAID"] },
        checkin: { gte: today, lt: dayAfterTomorrow },
        ...roomFilter,
      },
      include: roomInclude,
      orderBy: { checkin: "asc" },
    }),
    prisma.booking.findMany({
      where: {
        status: { in: ["APPROVED", "PAID"] },
        checkout: { gte: today, lt: dayAfterTomorrow },
        ...roomFilter,
      },
      include: roomInclude,
      orderBy: { checkout: "asc" },
    }),
  ])

  const multiProperty = landlords.length > 1

  const pendingGroups = groupByLandlord(pendingApprovals as BookingWithRoom[], landlords)
  const etransferGroups = groupByLandlord(pendingEtransfer as BookingWithRoom[], landlords)
  const stayingGroups = groupByLandlord(currentlyStaying as BookingWithRoom[], landlords)
  const checkinGroups = groupByLandlord(checkIns as BookingWithRoom[], landlords)
  const checkoutGroups = groupByLandlord(checkOuts as BookingWithRoom[], landlords)

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>

      {/* Action Items */}
      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Action Required</h2>
        <div className="grid gap-4 sm:grid-cols-2">

          {/* Pending Approvals */}
          <div className="rounded-lg border bg-white p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-medium">Awaiting Approval</span>
              {pendingApprovals.length > 0 && (
                <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-orange-100 text-orange-700 text-xs font-bold">
                  {pendingApprovals.length}
                </span>
              )}
            </div>
            {pendingApprovals.length === 0 ? (
              <p className="text-sm text-gray-400">No pending requests</p>
            ) : (
              <div className="space-y-3">
                {pendingGroups.map(({ landlord, bookings }) =>
                  bookings.length === 0 ? null : (
                    <div key={landlord.id}>
                      {multiProperty && (
                        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">{landlord.name}</p>
                      )}
                      <ul className="space-y-2">
                        {bookings.map((b) => (
                          <li key={b.id}>
                            <Link
                              href={`/admin/bookings/${b.id}`}
                              className="flex items-start justify-between gap-2 text-sm hover:bg-gray-50 -mx-2 px-2 py-1.5 rounded"
                            >
                              <div>
                                <span className="font-medium">{b.guestName}</span>
                                <span className="text-gray-400 mx-1">·</span>
                                <span className="text-gray-600">{b.room.name}</span>
                                <div className="text-xs text-gray-400 mt-0.5">
                                  {format(b.checkin, "MMM d")} – {format(b.checkout, "MMM d, yyyy")}
                                </div>
                              </div>
                              <Badge variant="secondary" className="shrink-0 mt-0.5">Pending</Badge>
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ),
                )}
              </div>
            )}
          </div>

          {/* Pending E-transfer */}
          <div className="rounded-lg border bg-white p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-medium">Awaiting E-Transfer</span>
              {pendingEtransfer.length > 0 && (
                <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-yellow-100 text-yellow-700 text-xs font-bold">
                  {pendingEtransfer.length}
                </span>
              )}
            </div>
            {pendingEtransfer.length === 0 ? (
              <p className="text-sm text-gray-400">No pending e-transfers</p>
            ) : (
              <div className="space-y-3">
                {etransferGroups.map(({ landlord, bookings }) =>
                  bookings.length === 0 ? null : (
                    <div key={landlord.id}>
                      {multiProperty && (
                        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">{landlord.name}</p>
                      )}
                      <ul className="space-y-2">
                        {bookings.map((b) => (
                          <li key={b.id}>
                            <Link
                              href={`/admin/bookings/${b.id}`}
                              className="flex items-start justify-between gap-2 text-sm hover:bg-gray-50 -mx-2 px-2 py-1.5 rounded"
                            >
                              <div>
                                <span className="font-medium">{b.guestName}</span>
                                <span className="text-gray-400 mx-1">·</span>
                                <span className="text-gray-600">{b.room.name}</span>
                                <div className="text-xs text-gray-400 mt-0.5">
                                  {format(b.checkin, "MMM d")} – {format(b.checkout, "MMM d, yyyy")}
                                </div>
                              </div>
                              <Badge variant="secondary" className="shrink-0 mt-0.5 bg-yellow-50 text-yellow-700">Approved</Badge>
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ),
                )}
              </div>
            )}
          </div>

        </div>
      </section>

      {/* Currently Staying */}
      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Currently Staying</h2>
        <div className="rounded-lg border bg-white p-4 space-y-3">
          {currentlyStaying.length === 0 ? (
            <p className="text-sm text-gray-400">No guests currently staying</p>
          ) : (
            <div className="space-y-3">
              {stayingGroups.map(({ landlord, bookings }) =>
                bookings.length === 0 ? null : (
                  <div key={landlord.id}>
                    {multiProperty && (
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">{landlord.name}</p>
                    )}
                    <ul className="space-y-2">
                      {bookings.map((b) => (
                        <li key={b.id}>
                          <Link
                            href={`/admin/bookings/${b.id}`}
                            className="flex items-center justify-between gap-2 text-sm hover:bg-gray-50 -mx-2 px-2 py-1.5 rounded"
                          >
                            <div>
                              <span className="font-medium">{b.guestName}</span>
                              <span className="text-gray-400 mx-1">·</span>
                              <span className="text-gray-600">{b.room.name}</span>
                              <div className="text-xs text-gray-400 mt-0.5">
                                {format(b.checkin, "MMM d")} – {format(b.checkout, "MMM d, yyyy")}
                              </div>
                            </div>
                            <span className="text-xs font-medium text-green-600 shrink-0">
                              Checkout {dateLabel(b.checkout)}
                            </span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                ),
              )}
            </div>
          )}
        </div>
      </section>

      {/* Upcoming Activity */}
      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Upcoming — Today &amp; Tomorrow</h2>
        <div className="grid gap-4 sm:grid-cols-2">

          {/* Check-ins */}
          <div className="rounded-lg border bg-white p-4 space-y-3">
            <span className="font-medium">Check-ins</span>
            {checkIns.length === 0 ? (
              <p className="text-sm text-gray-400">No check-ins today or tomorrow</p>
            ) : (
              <div className="space-y-3">
                {checkinGroups.map(({ landlord, bookings }) =>
                  bookings.length === 0 ? null : (
                    <div key={landlord.id}>
                      {multiProperty && (
                        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">{landlord.name}</p>
                      )}
                      <ul className="space-y-2">
                        {bookings.map((b) => (
                          <li key={b.id}>
                            <Link
                              href={`/admin/bookings/${b.id}`}
                              className="flex items-center justify-between gap-2 text-sm hover:bg-gray-50 -mx-2 px-2 py-1.5 rounded"
                            >
                              <div>
                                <span className="font-medium">{b.guestName}</span>
                                <span className="text-gray-400 mx-1">·</span>
                                <span className="text-gray-600">{b.room.name}</span>
                              </div>
                              <span className="text-xs font-medium text-blue-600 shrink-0">
                                {dateLabel(b.checkin)}
                              </span>
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ),
                )}
              </div>
            )}
          </div>

          {/* Check-outs */}
          <div className="rounded-lg border bg-white p-4 space-y-3">
            <span className="font-medium">Check-outs</span>
            {checkOuts.length === 0 ? (
              <p className="text-sm text-gray-400">No check-outs today or tomorrow</p>
            ) : (
              <div className="space-y-3">
                {checkoutGroups.map(({ landlord, bookings }) =>
                  bookings.length === 0 ? null : (
                    <div key={landlord.id}>
                      {multiProperty && (
                        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">{landlord.name}</p>
                      )}
                      <ul className="space-y-2">
                        {bookings.map((b) => (
                          <li key={b.id}>
                            <Link
                              href={`/admin/bookings/${b.id}`}
                              className="flex items-center justify-between gap-2 text-sm hover:bg-gray-50 -mx-2 px-2 py-1.5 rounded"
                            >
                              <div>
                                <span className="font-medium">{b.guestName}</span>
                                <span className="text-gray-400 mx-1">·</span>
                                <span className="text-gray-600">{b.room.name}</span>
                              </div>
                              <span className="text-xs font-medium text-gray-500 shrink-0">
                                {dateLabel(b.checkout)}
                              </span>
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ),
                )}
              </div>
            )}
          </div>

        </div>
      </section>
    </div>
  )
}
