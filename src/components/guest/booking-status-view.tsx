"use client"

import { useTransition } from "react"
import { format } from "date-fns"
import { Badge } from "@/components/ui/badge"
import { createStripeCheckoutSession } from "@/actions/payment"
import { ExtensionSection, type SerializedExtension } from "./extension-section"
import { DateChangeSection } from "./date-change-section"
import { MessageSection, type SerializedMessage } from "./message-section"

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
  confirmedPrice: number | null
  stripeSessionId: string | null
  refundAmount: number | null
  cancelledAt: string | null
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

export type SerializedDateChange = {
  id: string
  bookingId: string
  requestedCheckin: string
  requestedCheckout: string
  newPrice: number | null
  status: "PENDING" | "APPROVED" | "DECLINED" | "PAID"
  declineReason: string | null
  stripeSessionId: string | null
  createdAt: string
}

type Props = {
  booking: SerializedBooking
  showSuccessBanner: boolean
  showPaidBanner: boolean
  showExtensionPaidBanner?: boolean
  showDateChangePaidBanner?: boolean
  etransferEmail: string | null
  activeExtension?: SerializedExtension | null
  activeDateChange?: SerializedDateChange | null
  blockedDates?: string[]
  messages: SerializedMessage[]
  token: string | null
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
  return format(new Date(iso.slice(0, 10) + "T00:00:00"), "MMMM d, yyyy")
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: "CAD",
  }).format(amount)
}

function CancellationNotice({ booking }: { booking: SerializedBooking }) {
  const isStripe = !!booking.stripeSessionId
  const hasPayment = booking.refundAmount !== null

  return (
    <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 space-y-2">
      <h3 className="font-semibold text-destructive">Booking Cancelled</h3>
      {!hasPayment && (
        <p className="text-sm text-muted-foreground">This booking was cancelled. No payment was taken.</p>
      )}
      {hasPayment && isStripe && (
        <p className="text-sm">
          Refund of {formatCurrency(booking.refundAmount!)} will be returned to your card within 5–10 business days.
        </p>
      )}
      {hasPayment && !isStripe && (
        <p className="text-sm">
          Refund of {formatCurrency(booking.refundAmount!)} will be sent via e-transfer.
        </p>
      )}
    </div>
  )
}

function PaymentSection({
  booking,
  etransferEmail,
}: {
  booking: SerializedBooking
  etransferEmail: string | null
}) {
  const [isPending, startTransition] = useTransition()

  if (booking.status === "PAID") {
    return (
      <div className="mt-6 rounded-md bg-green-50 border border-green-200 p-4 text-green-800 text-sm">
        Your payment has been received. We&apos;ll be in touch with check-in details.
      </div>
    )
  }

  if (booking.status !== "APPROVED") return null

  return (
    <div className="mt-6 space-y-4">
      <h2 className="text-lg font-semibold text-gray-900">Complete Payment</h2>

      {/* Pay by Card */}
      <div className="rounded-lg border border-gray-200 bg-white p-4 space-y-3">
        <h3 className="font-medium text-gray-900">Pay by Card</h3>
        <p className="text-sm text-gray-500">
          Pay securely online using a credit or debit card via Stripe.
        </p>
        <form
          action={() => {
            startTransition(async () => {
              await createStripeCheckoutSession(booking.id)
            })
          }}
        >
          <button
            type="submit"
            disabled={isPending}
            className="inline-flex items-center justify-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
          >
            {isPending ? "Redirecting to Stripe..." : "Pay by Card"}
          </button>
        </form>
      </div>

      {/* Pay by E-Transfer */}
      <div className="rounded-lg border border-gray-200 bg-white p-4 space-y-3">
        <h3 className="font-medium text-gray-900">Pay by E-Transfer</h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-500">Amount</span>
            <span className="font-medium text-gray-900">
              {booking.confirmedPrice != null
                ? formatCurrency(booking.confirmedPrice)
                : "—"}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Send to</span>
            <span className="font-medium text-gray-900">
              {etransferEmail ?? "Contact landlord for e-transfer details"}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Reference</span>
            <span className="font-mono text-xs text-gray-800 break-all">
              {booking.id}
            </span>
          </div>
        </div>
        <p className="text-xs text-gray-400">
          Use your booking ID as the reference when sending.
        </p>
      </div>
    </div>
  )
}

export function BookingStatusView({
  booking,
  showSuccessBanner,
  showPaidBanner,
  showExtensionPaidBanner,
  showDateChangePaidBanner,
  etransferEmail,
  activeExtension,
  activeDateChange,
  blockedDates = [],
  messages,
  token,
}: Props) {
  const checkinStr = booking.checkin.slice(0, 10) // "YYYY-MM-DD"
  const checkoutStr = booking.checkout.slice(0, 10)

  // Resolve selected add-ons
  const selectedAddOns = booking.room.addOns.filter((a) =>
    booking.selectedAddOnIds.includes(a.id)
  )

  const hasAddOns = selectedAddOns.length > 0

  return (
    <main className="max-w-2xl mx-auto py-8 px-4">
      {/* Success banner — new booking submitted */}
      {showSuccessBanner && (
        <div className="mb-6 rounded-md bg-green-50 border border-green-200 p-4 text-green-800 text-sm">
          Your request has been submitted — we&apos;ll email you once it&apos;s reviewed.
        </div>
      )}

      {/* Paid banner — redirected back from Stripe with ?paid=1 */}
      {showPaidBanner && (
        <div className="mb-6 rounded-md bg-green-50 border border-green-200 p-4 text-green-800 text-sm font-medium">
          Payment successful — your booking is now confirmed.
        </div>
      )}

      {/* Extension paid banner — disabled for v1.0 */}

      {/* Date change paid banner — redirected back from Stripe with ?date_change_paid=1 */}
      {showDateChangePaidBanner && (
        <div className="mb-4 rounded-md bg-green-50 border border-green-200 p-4 text-green-800">
          Date change confirmed — your new dates are now active.
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

      {/* Cancellation notice */}
      {booking.status === "CANCELLED" && <CancellationNotice booking={booking} />}

      {/* Payment section */}
      <PaymentSection booking={booking} etransferEmail={etransferEmail} />

      {/* Extension section — disabled for v1.0 */}

      {/* Date change section */}
      {booking.status !== "CANCELLED" && booking.status !== "DECLINED" && booking.status !== "COMPLETED" && (
        <DateChangeSection
          booking={{ id: booking.id, status: booking.status, checkin: booking.checkin, checkout: booking.checkout }}
          activeDateChange={activeDateChange ?? null}
        />
      )}

      {/* Messages section */}
      <MessageSection bookingId={booking.id} token={token} messages={messages} />

      {/* Booking reference */}
      <p className="text-xs text-gray-400 mt-4 text-center">
        Booking reference: {booking.id}
      </p>
    </main>
  )
}
