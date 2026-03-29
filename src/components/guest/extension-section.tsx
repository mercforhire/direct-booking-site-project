"use client"

import { useState, useTransition } from "react"
import { DayPicker } from "react-day-picker"
import "react-day-picker/style.css"
import { format } from "date-fns"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog"
import { submitExtension, cancelExtension } from "@/actions/extension"
import { createExtensionStripeCheckoutSession } from "@/actions/payment"

export type SerializedExtension = {
  id: string
  bookingId: string
  requestedCheckout: string // ISO string
  noteToLandlord: string | null
  status: "PENDING" | "APPROVED" | "DECLINED" | "PAID"
  extensionPrice: number | null
  declineReason: string | null
  stripeSessionId: string | null
  createdAt: string
  updatedAt: string
}

type Props = {
  booking: {
    id: string
    status: string
    checkout: string
  }
  activeExtension: SerializedExtension | null
  blockedDates: string[]
  etransferEmail: string | null
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

export function ExtensionSection({
  booking,
  activeExtension,
  blockedDates,
  etransferEmail,
}: Props) {
  const [showForm, setShowForm] = useState(false)
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined)
  const [noteToLandlord, setNoteToLandlord] = useState("")
  const [submitted, setSubmitted] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [isStripeLoading, startStripeTransition] = useTransition()

  const canRequestExtension =
    (booking.status === "APPROVED" || booking.status === "PAID") &&
    (activeExtension === null ||
      activeExtension.status === "DECLINED" ||
      activeExtension.status === "PAID")

  // Convert blocked date strings to Date objects for DayPicker
  const blockedDateObjects = blockedDates.map((d) => new Date(d))

  // First selectable date is the day after current checkout
  const minExtensionDate = new Date(booking.checkout)
  minExtensionDate.setDate(minExtensionDate.getDate() + 1)

  function handleSubmit() {
    if (!selectedDate) return
    const requestedCheckout = selectedDate.toISOString().slice(0, 10)
    startTransition(async () => {
      await submitExtension(booking.id, {
        requestedCheckout,
        noteToLandlord: noteToLandlord.trim() || null,
      })
      setSubmitted(true)
      setShowForm(false)
    })
  }

  function handleCancel(extensionId: string) {
    startTransition(async () => {
      await cancelExtension(booking.id, extensionId)
    })
  }

  function handleStripePayment(extensionId: string) {
    startStripeTransition(async () => {
      await createExtensionStripeCheckoutSession(extensionId)
    })
  }

  // Don't render the section at all if booking is not in an eligible state
  // and there's no active extension
  if (
    !canRequestExtension &&
    activeExtension === null &&
    booking.status !== "APPROVED" &&
    booking.status !== "PAID"
  ) {
    return null
  }

  return (
    <div className="mt-6 space-y-4">
      <h2 className="text-lg font-semibold text-gray-900">Extension Request</h2>

      {/* PAID extension state */}
      {activeExtension?.status === "PAID" && (
        <div className="rounded-md bg-green-50 border border-green-200 p-4 text-green-800 text-sm">
          Extension paid — new checkout:{" "}
          <strong>{formatDate(activeExtension.requestedCheckout)}</strong>
        </div>
      )}

      {/* PENDING extension state */}
      {activeExtension?.status === "PENDING" && (
        <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4 space-y-3">
          <p className="text-sm text-yellow-800">
            Extension requested to{" "}
            <strong>{formatDate(activeExtension.requestedCheckout)}</strong> — awaiting review.
          </p>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" size="sm" disabled={isPending}>
                {isPending ? "Cancelling..." : "Cancel Request"}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Cancel extension request?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will remove your pending extension request. You can submit a new one after.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Keep Request</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => handleCancel(activeExtension.id)}
                >
                  Yes, Cancel Request
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      )}

      {/* APPROVED extension state */}
      {activeExtension?.status === "APPROVED" && (
        <div className="space-y-4">
          <div className="rounded-lg border border-gray-200 bg-white p-4 space-y-2">
            <div className="flex items-center gap-2">
              <Badge>Approved</Badge>
              <span className="text-sm text-gray-600">
                Extension to{" "}
                <strong>{formatDate(activeExtension.requestedCheckout)}</strong>
              </span>
            </div>
            {activeExtension.extensionPrice != null && (
              <p className="text-sm text-gray-700">
                Extension price:{" "}
                <strong>{formatCurrency(activeExtension.extensionPrice)}</strong>
              </p>
            )}
          </div>

          {/* Pay by Card */}
          <div className="rounded-lg border border-gray-200 bg-white p-4 space-y-3">
            <h3 className="font-medium text-gray-900">Pay by Card</h3>
            <p className="text-sm text-gray-500">
              Pay securely online using a credit or debit card via Stripe.
            </p>
            <form
              action={() => {
                handleStripePayment(activeExtension.id)
              }}
            >
              <button
                type="submit"
                disabled={isStripeLoading}
                className="inline-flex items-center justify-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
              >
                {isStripeLoading ? "Redirecting to Stripe..." : "Pay by Card"}
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
                  {activeExtension.extensionPrice != null
                    ? formatCurrency(activeExtension.extensionPrice)
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
                  {activeExtension.id}
                </span>
              </div>
            </div>
            <p className="text-xs text-gray-400">
              Use the extension ID as the reference when sending.
            </p>
          </div>
        </div>
      )}

      {/* DECLINED extension state */}
      {activeExtension?.status === "DECLINED" && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 space-y-2">
          <div className="flex items-center gap-2">
            <Badge variant="destructive">Declined</Badge>
            <span className="text-sm text-red-800">Extension request declined</span>
          </div>
          {activeExtension.declineReason && (
            <p className="text-sm text-red-700">
              Reason: {activeExtension.declineReason}
            </p>
          )}
        </div>
      )}

      {/* Request form */}
      {canRequestExtension && (
        <div>
          {submitted ? (
            <div className="rounded-md bg-green-50 border border-green-200 p-4 text-green-800 text-sm">
              Extension request submitted — we&apos;ll email you once it&apos;s reviewed.
            </div>
          ) : !showForm ? (
            <Button
              variant="outline"
              onClick={() => setShowForm(true)}
            >
              Request Extension
            </Button>
          ) : (
            <div className="rounded-lg border border-gray-200 bg-white p-4 space-y-4">
              <h3 className="font-medium text-gray-900">Choose new checkout date</h3>
              <DayPicker
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                disabled={[
                  { before: minExtensionDate },
                  ...blockedDateObjects,
                ]}
              />
              <div>
                <label
                  htmlFor="extension-note"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Note to landlord (optional)
                </label>
                <textarea
                  id="extension-note"
                  rows={3}
                  value={noteToLandlord}
                  onChange={(e) => setNoteToLandlord(e.target.value)}
                  placeholder="Any notes for your extension request..."
                  className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div className="flex gap-3">
                <Button
                  onClick={handleSubmit}
                  disabled={!selectedDate || isPending}
                >
                  {isPending ? "Submitting..." : "Submit Request"}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowForm(false)
                    setSelectedDate(undefined)
                    setNoteToLandlord("")
                  }}
                  disabled={isPending}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
