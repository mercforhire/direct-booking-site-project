"use client"

import { format } from "date-fns"
import { Badge } from "@/components/ui/badge"

// All Decimal fields coerced to number at RSC boundary
export type SerializedBooking = {
  id: string
  roomId: string
  guestName: string
  guestEmail: string
  guestPhone: string
  guestUserId: string | null
  checkin: string
  checkout: string
  numGuests: number
  selectedAddOnIds: string[]
  noteToLandlord: string | null
  estimatedTotal: number
  status: string
  accessToken: string
  createdAt: string
  updatedAt: string
  room: {
    name: string
    location: string | null
    addOns: Array<{ id: string; name: string; price: number }>
  }
}

type Props = {
  booking: SerializedBooking
  showSuccessBanner: boolean
}

const STATUS_LABELS: Record<string, string> = {
  PENDING: "Pending",
  APPROVED: "Approved",
  DECLINED: "Declined",
  PAID: "Paid",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
}

function formatDate(iso: string): string {
  return format(new Date(iso), "MMMM d, yyyy")
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: "CAD",
  }).format(amount)
}

export function BookingStatusView({ booking, showSuccessBanner }: Props) {
  const checkinStr = booking.checkin.slice(0, 10) // "YYYY-MM-DD"
  const checkoutStr = booking.checkout.slice(0, 10)

  // Resolve selected add-ons
  const selectedAddOns = booking.room.addOns.filter((a) =>
    booking.selectedAddOnIds.includes(a.id)
  )

  const hasAddOns = selectedAddOns.length > 0

  return (
    <main className="max-w-2xl mx-auto py-8 px-4">
      {/* Success banner */}
      {showSuccessBanner && (
        <div className="mb-6 rounded-md bg-green-50 border border-green-200 p-4 text-green-800 text-sm">
          Your request has been submitted — we&apos;ll email you once it&apos;s reviewed.
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">
            {booking.room.name}
          </h1>
          {booking.room.location && (
            <p className="text-sm text-gray-500 mt-1">
              {"\uD83D\uDCCD"} {booking.room.location}
            </p>
          )}
        </div>
        <Badge variant={booking.status === "PENDING" ? "outline" : "default"}>
          {STATUS_LABELS[booking.status] ?? booking.status}
        </Badge>
      </div>

      {/* Booking details */}
      <div className="rounded-lg border border-gray-200 bg-white divide-y divide-gray-100">
        {/* Dates */}
        <div className="px-4 py-3 grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide">Check-in</p>
            <p className="text-sm font-medium text-gray-900 mt-1">
              {formatDate(checkinStr)}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide">Check-out</p>
            <p className="text-sm font-medium text-gray-900 mt-1">
              {formatDate(checkoutStr)}
            </p>
          </div>
        </div>

        {/* Guests */}
        <div className="px-4 py-3">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Guests</p>
          <p className="text-sm font-medium text-gray-900 mt-1">
            {booking.numGuests} {booking.numGuests === 1 ? "guest" : "guests"}
          </p>
        </div>

        {/* Add-ons */}
        {hasAddOns && (
          <div className="px-4 py-3">
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">Add-ons</p>
            <ul className="space-y-1">
              {selectedAddOns.map((addon) => (
                <li key={addon.id} className="flex justify-between text-sm text-gray-700">
                  <span>{addon.name}</span>
                  <span>{formatCurrency(addon.price)}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Note to landlord */}
        {booking.noteToLandlord && (
          <div className="px-4 py-3">
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Note to landlord</p>
            <p className="text-sm text-gray-700 whitespace-pre-line">
              {booking.noteToLandlord}
            </p>
          </div>
        )}

        {/* Cost estimate */}
        <div className="px-4 py-3">
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">Estimated Total</p>
          <p className="text-lg font-semibold text-gray-900">
            {formatCurrency(booking.estimatedTotal)}
          </p>
          <p className="text-xs text-gray-400 mt-1">
            Final price set by landlord at approval
          </p>
        </div>
      </div>

      {/* Booking reference */}
      <p className="text-xs text-gray-400 mt-4 text-center">
        Booking reference: {booking.id}
      </p>
    </main>
  )
}
