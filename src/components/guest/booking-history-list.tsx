"use client"

import Link from "next/link"
import Image from "next/image"
import { format } from "date-fns"

type SerializedBooking = {
  id: string
  guestName: string
  checkin: Date | string
  checkout: Date | string
  numGuests: number
  status: string
  confirmedPrice: number | null
  estimatedTotal: number
  room: {
    name: string
    photos: { url: string }[]
  }
}

const statusConfig: Record<string, { label: string; className: string }> = {
  PENDING: { label: "Pending", className: "bg-orange-100 text-orange-700" },
  APPROVED: { label: "Approved", className: "bg-blue-100 text-blue-700" },
  PAID: { label: "Paid", className: "bg-green-100 text-green-700" },
  CANCELLED: { label: "Cancelled", className: "bg-gray-100 text-gray-700" },
  DECLINED: { label: "Declined", className: "bg-red-100 text-red-700" },
  COMPLETED: { label: "Completed", className: "bg-green-100 text-green-700" },
}

function formatDateRange(checkin: Date | string, checkout: Date | string) {
  const ci = new Date(checkin)
  const co = new Date(checkout)
  if (ci.getFullYear() === co.getFullYear()) {
    return `${format(ci, "MMM d")} – ${format(co, "MMM d, yyyy")}`
  }
  return `${format(ci, "MMM d, yyyy")} – ${format(co, "MMM d, yyyy")}`
}

function formatPrice(amount: number) {
  return `$${amount.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
}

function BookingCard({ booking }: { booking: SerializedBooking }) {
  const photo = booking.room.photos[0]?.url
  const price = booking.confirmedPrice ?? booking.estimatedTotal
  const badge = statusConfig[booking.status] ?? {
    label: booking.status,
    className: "bg-gray-100 text-gray-700",
  }

  return (
    <Link
      href={`/bookings/${booking.id}`}
      className="flex gap-3 rounded-lg border bg-white p-4 hover:bg-gray-50 transition-colors"
    >
      {photo ? (
        <Image
          src={photo}
          alt={booking.room.name}
          width={64}
          height={64}
          className="rounded object-cover shrink-0 w-16 h-16"
        />
      ) : (
        <div className="w-16 h-16 rounded bg-gray-200 shrink-0" />
      )}
      <div className="flex-1 min-w-0 space-y-1">
        <p className="font-medium truncate">{booking.room.name}</p>
        <p className="text-sm text-gray-500">
          {formatDateRange(booking.checkin, booking.checkout)}
        </p>
        <p className="text-sm text-gray-500">
          {booking.numGuests} {booking.numGuests === 1 ? "guest" : "guests"}
        </p>
        <div className="flex items-center justify-between">
          <span
            className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${badge.className}`}
          >
            {badge.label}
          </span>
          <span className="text-sm font-medium">{formatPrice(price)}</span>
        </div>
      </div>
    </Link>
  )
}

type BookingHistoryListProps = {
  upcoming: SerializedBooking[]
  past: SerializedBooking[]
}

export default function BookingHistoryList({
  upcoming,
  past,
}: BookingHistoryListProps) {
  if (upcoming.length === 0 && past.length === 0) {
    return (
      <div className="text-center py-12 space-y-4">
        <p className="text-gray-500">
          You don&apos;t have any bookings yet.
        </p>
        <Link
          href="/rooms"
          className="inline-block rounded-md bg-black px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
        >
          Browse rooms
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Upcoming</h2>
        {upcoming.length > 0 ? (
          <div className="space-y-3">
            {upcoming.map((b) => (
              <BookingCard key={b.id} booking={b} />
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-400">No upcoming bookings.</p>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Past Bookings</h2>
        {past.length > 0 ? (
          <div className="space-y-3">
            {past.map((b) => (
              <BookingCard key={b.id} booking={b} />
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-400">
            No past bookings in the last 12 months.
          </p>
        )}
      </section>
    </div>
  )
}
